import type { Express, Response } from "express";
import { db } from "./db";
import {
  securityIncidents,
  INCIDENT_SEVERITY,
  INCIDENT_TYPE,
  INCIDENT_STATUS,
  type TimelineEntry
} from "@shared/super-admin-schema";
import { users } from "@shared/schema";
import { eq, desc, and, sql, aliasedTable } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

// Constants for validation
const MIN_TITLE_LENGTH = 3;
const MIN_ACTION_LENGTH = 3;
const MIN_RESOLUTION_LENGTH = 10;
const TIMELINE_TRUNCATE_LENGTH = 200;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Valid enum values for validation
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const VALID_TYPES = ['unauthorized_access', 'data_breach', 'suspicious_activity', 'policy_violation'] as const;
const VALID_STATUSES = ['open', 'investigating', 'contained', 'resolved', 'closed'] as const;

// Type guards for validation
function isValidSeverity(value: string): value is typeof VALID_SEVERITIES[number] {
  return VALID_SEVERITIES.includes(value as any);
}

function isValidType(value: string): value is typeof VALID_TYPES[number] {
  return VALID_TYPES.includes(value as any);
}

function isValidStatus(value: string): value is typeof VALID_STATUSES[number] {
  return VALID_STATUSES.includes(value as any);
}

/**
 * Generate incident number in format INC-YYYY-####
 * Uses retry mechanism to handle race conditions
 * @returns formatted incident number
 */
async function generateIncidentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(securityIncidents);
    const count = Number(countResult[0]?.count || 0) + 1 + attempt;
    const paddedNumber = String(count).padStart(4, '0');
    const incidentNumber = `INC-${year}-${paddedNumber}`;

    // Check if this number already exists
    const existing = await db.select({ id: securityIncidents.id })
      .from(securityIncidents)
      .where(eq(securityIncidents.incidentNumber, incidentNumber))
      .limit(1);

    if (existing.length === 0) {
      return incidentNumber;
    }
  }

  // Fallback: use timestamp-based number
  return `INC-${year}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Create a timeline entry
 */
function createTimelineEntry(action: string, actor: string, notes?: string): TimelineEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    actor,
    notes,
  };
}

/**
 * Get actor name from request user
 */
function getActorName(user?: AuthenticatedRequest['user']): string {
  if (!user) return 'System';
  return user.username || user.email || `User #${user.id}`;
}

export function registerSecurityIncidentsRoutes(app: Express) {
  // ============================================================================
  // SECURITY INCIDENTS ENDPOINTS
  // ============================================================================

  /**
   * GET /api/super-admin/security/incidents
   * List security incidents with filtering and pagination
   * Query params: status, severity, type, page, limit
   */
  app.get(
    "/api/super-admin/security/incidents",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { status, severity, type, page = '1', limit = '20' } = req.query;

        // Validate and parse pagination
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.max(1, Math.min(parseInt(limit as string) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
        const offset = (pageNum - 1) * limitNum;

        // Validate filter values
        if (status && !isValidStatus(status as string)) {
          return res.status(400).json({ error: "Invalid status value. Must be one of: open, investigating, contained, resolved, closed" });
        }
        if (severity && !isValidSeverity(severity as string)) {
          return res.status(400).json({ error: "Invalid severity value. Must be one of: low, medium, high, critical" });
        }
        if (type && !isValidType(type as string)) {
          return res.status(400).json({ error: "Invalid type value. Must be one of: unauthorized_access, data_breach, suspicious_activity, policy_violation" });
        }

        // Build query conditions
        const conditions = [];

        if (status) {
          conditions.push(eq(securityIncidents.status, status as string));
        }
        if (severity) {
          conditions.push(eq(securityIncidents.severity, severity as string));
        }
        if (type) {
          conditions.push(eq(securityIncidents.type, type as string));
        }

        // Create aliases for reporter and assignee
        const reporter = users;

        // Query incidents with reporter and assignee names
        const incidents = await db
          .select({
            id: securityIncidents.id,
            incidentNumber: securityIncidents.incidentNumber,
            severity: securityIncidents.severity,
            type: securityIncidents.type,
            status: securityIncidents.status,
            title: securityIncidents.title,
            description: securityIncidents.description,
            affectedUsers: securityIncidents.affectedUsers,
            affectedTenants: securityIncidents.affectedTenants,
            timeline: securityIncidents.timeline,
            investigation: securityIncidents.investigation,
            rootCause: securityIncidents.rootCause,
            resolution: securityIncidents.resolution,
            lessonsLearned: securityIncidents.lessonsLearned,
            reportedBy: securityIncidents.reportedBy,
            assignedTo: securityIncidents.assignedTo,
            createdAt: securityIncidents.createdAt,
            updatedAt: securityIncidents.updatedAt,
            resolvedAt: securityIncidents.resolvedAt,
            closedAt: securityIncidents.closedAt,
            reporterName: reporter.fullName,
            reporterEmail: reporter.email,
          })
          .from(securityIncidents)
          .leftJoin(reporter, eq(securityIncidents.reportedBy, reporter.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(securityIncidents.createdAt))
          .limit(limitNum)
          .offset(offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(securityIncidents)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = Number(countResult[0]?.count || 0);

        res.json({
          incidents,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
        });
      } catch (error: any) {
        console.error('Failed to fetch security incidents:', error);
        res.status(500).json({ error: "Failed to fetch security incidents" });
      }
    }
  );

  /**
   * POST /api/super-admin/security/incidents
   * Create a new security incident
   * Body: { title, description, severity, type, affectedUsers, affectedTenants }
   */
  app.post(
    "/api/super-admin/security/incidents",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          title,
          description,
          severity,
          type,
          affectedUsers,
          affectedTenants,
        } = req.body;

        // Validate required fields
        if (!title || typeof title !== 'string' || title.trim().length < MIN_TITLE_LENGTH) {
          return res.status(400).json({ error: `Title is required and must be at least ${MIN_TITLE_LENGTH} characters` });
        }

        if (!severity) {
          return res.status(400).json({ error: "Severity is required" });
        }
        if (!isValidSeverity(severity)) {
          return res.status(400).json({ error: "Invalid severity value. Must be one of: low, medium, high, critical" });
        }

        if (!type) {
          return res.status(400).json({ error: "Type is required" });
        }
        if (!isValidType(type)) {
          return res.status(400).json({ error: "Invalid type value. Must be one of: unauthorized_access, data_breach, suspicious_activity, policy_violation" });
        }

        // Generate incident number
        const incidentNumber = await generateIncidentNumber();

        // Create initial timeline entry
        const actorName = getActorName(req.user);
        const initialTimeline: TimelineEntry[] = [
          createTimelineEntry('Incident created', actorName, `Incident reported with severity: ${severity}`)
        ];

        // Create incident
        const [created] = await db
          .insert(securityIncidents)
          .values({
            incidentNumber,
            title: title.trim(),
            description: description || null,
            severity,
            type,
            status: INCIDENT_STATUS.OPEN,
            affectedUsers: affectedUsers || null,
            affectedTenants: affectedTenants || null,
            timeline: initialTimeline,
            reportedBy: req.user?.id || null,
          })
          .returning();

        res.status(201).json(created);
      } catch (error: any) {
        console.error('Failed to create security incident:', error);
        res.status(500).json({ error: "Failed to create security incident" });
      }
    }
  );

  /**
   * GET /api/super-admin/security/incidents/:id
   * Get a single security incident with reporter and assignee names
   */
  app.get(
    "/api/super-admin/security/incidents/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);

        if (isNaN(incidentId)) {
          return res.status(400).json({ error: "Invalid incident ID" });
        }

        // Create aliases for reporter and assignee to allow two LEFT JOINs on the same table
        const reporter = aliasedTable(users, 'reporter');
        const assignee = aliasedTable(users, 'assignee');

        // Query incident with reporter and assignee names using LEFT JOINs
        const [incident] = await db
          .select({
            id: securityIncidents.id,
            incidentNumber: securityIncidents.incidentNumber,
            severity: securityIncidents.severity,
            type: securityIncidents.type,
            status: securityIncidents.status,
            title: securityIncidents.title,
            description: securityIncidents.description,
            affectedUsers: securityIncidents.affectedUsers,
            affectedTenants: securityIncidents.affectedTenants,
            timeline: securityIncidents.timeline,
            investigation: securityIncidents.investigation,
            rootCause: securityIncidents.rootCause,
            resolution: securityIncidents.resolution,
            lessonsLearned: securityIncidents.lessonsLearned,
            reportedBy: securityIncidents.reportedBy,
            assignedTo: securityIncidents.assignedTo,
            createdAt: securityIncidents.createdAt,
            updatedAt: securityIncidents.updatedAt,
            resolvedAt: securityIncidents.resolvedAt,
            closedAt: securityIncidents.closedAt,
            reporterName: reporter.fullName,
            reporterEmail: reporter.email,
            assigneeName: assignee.fullName,
            assigneeEmail: assignee.email,
          })
          .from(securityIncidents)
          .leftJoin(reporter, eq(securityIncidents.reportedBy, reporter.id))
          .leftJoin(assignee, eq(securityIncidents.assignedTo, assignee.id))
          .where(eq(securityIncidents.id, incidentId))
          .limit(1);

        if (!incident) {
          return res.status(404).json({ error: "Security incident not found" });
        }

        // Format the response with computed name fields
        res.json({
          ...incident,
          reporterName: incident.reporterName || incident.reporterEmail || null,
          assigneeName: incident.assigneeName || incident.assigneeEmail || null,
        });
      } catch (error: any) {
        console.error('Failed to fetch security incident:', error);
        res.status(500).json({ error: "Failed to fetch security incident" });
      }
    }
  );

  /**
   * PUT /api/super-admin/security/incidents/:id
   * Update a security incident
   */
  app.put(
    "/api/super-admin/security/incidents/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);

        if (isNaN(incidentId)) {
          return res.status(400).json({ error: "Invalid incident ID" });
        }

        const {
          title,
          description,
          severity,
          type,
          status,
          affectedUsers,
          affectedTenants,
          investigation,
          rootCause,
          resolution,
          lessonsLearned,
        } = req.body;

        // Check if incident exists
        const [existing] = await db
          .select()
          .from(securityIncidents)
          .where(eq(securityIncidents.id, incidentId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Security incident not found" });
        }

        // Validate enum values if provided
        if (severity !== undefined && !isValidSeverity(severity)) {
          return res.status(400).json({ error: "Invalid severity value. Must be one of: low, medium, high, critical" });
        }
        if (type !== undefined && !isValidType(type)) {
          return res.status(400).json({ error: "Invalid type value. Must be one of: unauthorized_access, data_breach, suspicious_activity, policy_violation" });
        }
        if (status !== undefined && !isValidStatus(status)) {
          return res.status(400).json({ error: "Invalid status value. Must be one of: open, investigating, contained, resolved, closed" });
        }

        // Build update object
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (title !== undefined && typeof title === 'string') updateData.title = title.trim();
        if (description !== undefined && typeof description === 'string') updateData.description = description.trim();
        if (severity !== undefined) updateData.severity = severity;
        if (type !== undefined) updateData.type = type;
        if (status !== undefined) updateData.status = status;
        if (affectedUsers !== undefined) updateData.affectedUsers = affectedUsers;
        if (affectedTenants !== undefined) updateData.affectedTenants = affectedTenants;
        if (investigation !== undefined && typeof investigation === 'string') updateData.investigation = investigation.trim();
        if (rootCause !== undefined && typeof rootCause === 'string') updateData.rootCause = rootCause.trim();
        if (resolution !== undefined && typeof resolution === 'string') updateData.resolution = resolution.trim();
        if (lessonsLearned !== undefined && typeof lessonsLearned === 'string') updateData.lessonsLearned = lessonsLearned.trim();

        // Handle status-specific timestamps
        if (status === INCIDENT_STATUS.RESOLVED && existing.status !== INCIDENT_STATUS.RESOLVED) {
          updateData.resolvedAt = new Date();
        }
        if (status === INCIDENT_STATUS.CLOSED && existing.status !== INCIDENT_STATUS.CLOSED) {
          updateData.closedAt = new Date();
        }

        const [updated] = await db
          .update(securityIncidents)
          .set(updateData)
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error('Failed to update security incident:', error);
        res.status(500).json({ error: "Failed to update security incident" });
      }
    }
  );

  /**
   * POST /api/super-admin/security/incidents/:id/assign
   * Assign incident to a user and add timeline entry
   * Body: { userId, notes? }
   */
  app.post(
    "/api/super-admin/security/incidents/:id/assign",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);

        if (isNaN(incidentId)) {
          return res.status(400).json({ error: "Invalid incident ID" });
        }

        const { userId, notes } = req.body;

        if (!userId) {
          return res.status(400).json({ error: "userId is required" });
        }

        const assigneeId = parseInt(userId);
        if (isNaN(assigneeId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        // Check if incident exists
        const [existing] = await db
          .select()
          .from(securityIncidents)
          .where(eq(securityIncidents.id, incidentId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Security incident not found" });
        }

        // Verify assignee exists
        const [assignee] = await db
          .select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users)
          .where(eq(users.id, assigneeId))
          .limit(1);

        if (!assignee) {
          return res.status(404).json({ error: "User not found" });
        }

        // Create timeline entry for assignment
        const actorName = getActorName(req.user);
        const assigneeName = assignee.fullName || assignee.email || `User #${assignee.id}`;
        const timelineEntry = createTimelineEntry(
          'Incident assigned',
          actorName,
          notes || `Assigned to ${assigneeName}`
        );

        // Append to existing timeline
        const existingTimeline: TimelineEntry[] = (existing.timeline as TimelineEntry[]) || [];
        const updatedTimeline = [...existingTimeline, timelineEntry];

        // Update status to investigating if currently open
        const newStatus = existing.status === INCIDENT_STATUS.OPEN
          ? INCIDENT_STATUS.INVESTIGATING
          : existing.status;

        const [updated] = await db
          .update(securityIncidents)
          .set({
            assignedTo: assigneeId,
            status: newStatus,
            timeline: updatedTimeline,
            updatedAt: new Date(),
          })
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json({
          ...updated,
          assigneeName,
        });
      } catch (error: any) {
        console.error('Failed to assign security incident:', error);
        res.status(500).json({ error: "Failed to assign security incident" });
      }
    }
  );

  /**
   * POST /api/super-admin/security/incidents/:id/resolve
   * Resolve incident with resolution details
   * Body: { resolution, rootCause?, lessonsLearned? }
   */
  app.post(
    "/api/super-admin/security/incidents/:id/resolve",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);

        if (isNaN(incidentId)) {
          return res.status(400).json({ error: "Invalid incident ID" });
        }

        const { resolution, rootCause, lessonsLearned } = req.body;

        if (!resolution || typeof resolution !== 'string' || resolution.trim().length < MIN_RESOLUTION_LENGTH) {
          return res.status(400).json({ error: `Resolution is required and must be at least ${MIN_RESOLUTION_LENGTH} characters` });
        }

        // Check if incident exists
        const [existing] = await db
          .select()
          .from(securityIncidents)
          .where(eq(securityIncidents.id, incidentId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Security incident not found" });
        }

        // Check if already resolved or closed
        if (existing.status === INCIDENT_STATUS.RESOLVED || existing.status === INCIDENT_STATUS.CLOSED) {
          return res.status(400).json({ error: `Incident is already ${existing.status}` });
        }

        // Create timeline entry for resolution
        const actorName = getActorName(req.user);
        const truncated = resolution.trim().substring(0, TIMELINE_TRUNCATE_LENGTH);
        const notes = `Resolution: ${truncated}${resolution.trim().length > TIMELINE_TRUNCATE_LENGTH ? '...' : ''}`;
        const timelineEntry = createTimelineEntry(
          'Incident resolved',
          actorName,
          notes
        );

        // Append to existing timeline
        const existingTimeline: TimelineEntry[] = (existing.timeline as TimelineEntry[]) || [];
        const updatedTimeline = [...existingTimeline, timelineEntry];

        const [updated] = await db
          .update(securityIncidents)
          .set({
            status: INCIDENT_STATUS.RESOLVED,
            resolution: resolution.trim(),
            rootCause: rootCause || null,
            lessonsLearned: lessonsLearned || null,
            timeline: updatedTimeline,
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error('Failed to resolve security incident:', error);
        res.status(500).json({ error: "Failed to resolve security incident" });
      }
    }
  );

  /**
   * POST /api/super-admin/security/incidents/:id/timeline
   * Add a timeline entry to an incident
   * Body: { action, notes? }
   */
  app.post(
    "/api/super-admin/security/incidents/:id/timeline",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);

        if (isNaN(incidentId)) {
          return res.status(400).json({ error: "Invalid incident ID" });
        }

        const { action, notes } = req.body;

        if (!action || typeof action !== 'string' || action.trim().length < MIN_ACTION_LENGTH) {
          return res.status(400).json({ error: `Action is required and must be at least ${MIN_ACTION_LENGTH} characters` });
        }

        // Check if incident exists
        const [existing] = await db
          .select()
          .from(securityIncidents)
          .where(eq(securityIncidents.id, incidentId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Security incident not found" });
        }

        // Create timeline entry
        const actorName = getActorName(req.user);
        const timelineEntry = createTimelineEntry(action.trim(), actorName, notes);

        // Append to existing timeline
        const existingTimeline: TimelineEntry[] = (existing.timeline as TimelineEntry[]) || [];
        const updatedTimeline = [...existingTimeline, timelineEntry];

        const [updated] = await db
          .update(securityIncidents)
          .set({
            timeline: updatedTimeline,
            updatedAt: new Date(),
          })
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json({
          incident: updated,
          addedEntry: timelineEntry,
        });
      } catch (error: any) {
        console.error('Failed to add timeline entry:', error);
        res.status(500).json({ error: "Failed to add timeline entry" });
      }
    }
  );

  console.log('✅ Security incidents routes registered');
}
