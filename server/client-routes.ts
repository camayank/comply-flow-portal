import type { Express, Response } from "express";
import { db } from './db';
import {
  serviceRequests,
  businessEntities,
  complianceTracking,
  complianceAlerts,
  complianceRules,
  messages,
  users
} from '@shared/schema';
import { eq, desc, and, gte, lte, or, asc } from 'drizzle-orm';
import { COMPLIANCE_KNOWLEDGE_BASE, getComplianceByCode } from './compliance-knowledge-base';
import { mapComplianceCategory } from './compliance-taxonomy';
import {
  sessionAuthMiddleware,
  requireRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';

// Middleware chain for client-only access
const clientAuth = [sessionAuthMiddleware, requireRole(USER_ROLES.CLIENT)] as const;

// Helper to get user's business entity ID
async function getUserEntityId(userId: number): Promise<number | null> {
  try {
    // Get entity where ownerId matches the authenticated user
    const [entity] = await db
      .select()
      .from(businessEntities)
      .where(and(
        eq(businessEntities.ownerId, userId),
        eq(businessEntities.isActive, true)
      ));

    return entity?.id || null;
  } catch (error) {
    console.error('Error getting user entity ID:', error);
    return null;
  }
}

export function registerClientRoutes(app: Express) {

  // Get business entities for authenticated client (only their own)
  app.get('/api/client/entities', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get only entities owned by this user
      // Uses ownerId column which stores the user ID that owns this entity
      const entities = await db
        .select()
        .from(businessEntities)
        .where(and(
          eq(businessEntities.isActive, true),
          eq(businessEntities.ownerId, userId)
        ))
        .orderBy(desc(businessEntities.createdAt));

      res.json(entities);
    } catch (error) {
      console.error('Error fetching entities:', error);
      res.status(500).json({ error: 'Failed to fetch entities' });
    }
  });

  // Get service requests for authenticated client (only their own entities)
  app.get('/api/client/service-requests', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { entityId } = req.query;

      // Get user's entity ID to verify ownership
      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.json([]); // No entity associated with user
      }

      // If entityId provided, verify it belongs to the user
      if (entityId) {
        const requestedEntityId = parseInt(entityId as string);
        if (requestedEntityId !== userEntityId) {
          return res.status(403).json({ error: 'Access denied to this entity' });
        }
      }

      // Fetch service requests only for user's entity
      const requests = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.businessEntityId, userEntityId))
        .orderBy(desc(serviceRequests.createdAt));

      res.json(requests);
    } catch (error) {
      console.error('Error fetching service requests:', error);
      res.status(500).json({ error: 'Failed to fetch service requests' });
    }
  });

  // Get service request details (only if belongs to user's entity)
  app.get('/api/client/service-requests/:id', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const requestId = parseInt(req.params.id);

      // Get user's entity ID
      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.status(403).json({ error: 'No entity associated with user' });
      }

      // Fetch request and verify ownership
      const [request] = await db
        .select()
        .from(serviceRequests)
        .where(and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.businessEntityId, userEntityId)
        ));

      if (!request) {
        return res.status(404).json({ error: 'Service request not found or access denied' });
      }

      res.json(request);
    } catch (error) {
      console.error('Error fetching service request:', error);
      res.status(500).json({ error: 'Failed to fetch service request' });
    }
  });

  // Update service request status (client actions - only their own requests)
  app.patch('/api/client/service-requests/:id', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const requestId = parseInt(req.params.id);
      const { status, clientNotes } = req.body;

      // Get user's entity ID
      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.status(403).json({ error: 'No entity associated with user' });
      }

      // Verify ownership before update
      const [existingRequest] = await db
        .select()
        .from(serviceRequests)
        .where(and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.businessEntityId, userEntityId)
        ));

      if (!existingRequest) {
        return res.status(404).json({ error: 'Service request not found or access denied' });
      }

      // Only allow certain status transitions for clients
      const allowedClientStatuses = ['cancelled', 'pending_documents'];
      if (status && !allowedClientStatuses.includes(status)) {
        return res.status(403).json({
          error: 'Clients can only cancel requests or mark as pending documents',
          allowedStatuses: allowedClientStatuses
        });
      }

      const [updated] = await db
        .update(serviceRequests)
        .set({
          ...(status && { status }),
          ...(clientNotes && { clientNotes }),
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, requestId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating service request:', error);
      res.status(500).json({ error: 'Failed to update service request' });
    }
  });

  // Get compliance tracking items for authenticated client (only their own)
  app.get('/api/client/compliance-tracking', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUserId = req.user?.id;
      if (!authUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { startDate, endDate, status } = req.query;

      // Build the query with filters - ALWAYS filter by authenticated user
      let conditions = [eq(complianceTracking.userId, authUserId)];

      if (startDate) {
        conditions.push(gte(complianceTracking.dueDate, new Date(startDate as string)));
      }

      if (endDate) {
        conditions.push(lte(complianceTracking.dueDate, new Date(endDate as string)));
      }

      if (status) {
        conditions.push(eq(complianceTracking.status, status as string));
      }

      // Query compliance tracking data - filtered to authenticated user only
      const complianceItems = await db
        .select()
        .from(complianceTracking)
        .where(and(...conditions))
        .orderBy(complianceTracking.dueDate);

      // Enrich with compliance knowledge base data
      const transformedItems = complianceItems.map(item => {
        // Try to find matching rule in knowledge base by serviceId
        const knowledgeRule = getComplianceByCode(item.serviceId);
        
        return {
          id: item.id,
          serviceType: item.serviceType || item.complianceType,
          entityName: item.entityName,
          dueDate: item.dueDate?.toISOString() || new Date().toISOString(),
          status: item.status,
          priority: item.priority,
          complianceType: item.complianceType,
          healthScore: item.healthScore || 100,
          penaltyRisk: item.penaltyRisk || false,
          estimatedPenalty: item.estimatedPenalty || 0,
          serviceId: item.serviceId,
          complianceRuleId: item.complianceRuleId || null,
          lastCompleted: item.lastCompleted ? item.lastCompleted.toISOString() : null,
          // Enhanced regulatory knowledge from knowledge base
          regulatoryInfo: knowledgeRule ? {
            formNumber: knowledgeRule.formNumber,
            regulationCategory: knowledgeRule.regulationCategory,
            description: knowledgeRule.description,
            dueDateInfo: knowledgeRule.dueDateInfo,
            penaltyInfo: knowledgeRule.penaltyInfo,
            requiredDocuments: knowledgeRule.requiredDocuments,
            priorityLevel: knowledgeRule.priorityLevel,
            penaltyRiskLevel: knowledgeRule.penaltyRiskLevel
          } : null
        };
      });

      res.json(transformedItems);
    } catch (error) {
      console.error('Error fetching compliance tracking:', error);
      res.status(500).json({ error: 'Failed to fetch compliance tracking data' });
    }
  });

  // Get compliance summary/stats for authenticated client dashboard (only their own)
  app.get('/api/client/compliance-summary', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUserId = req.user?.id;
      if (!authUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Always filter to authenticated user only
      const allItems = await db
        .select()
        .from(complianceTracking)
        .where(eq(complianceTracking.userId, authUserId));

      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const summary = {
        totalCompliance: allItems.length,
        overdue: allItems.filter(item => item.dueDate && item.dueDate < today && item.status !== 'completed').length,
        dueThisWeek: allItems.filter(item => item.dueDate && item.dueDate >= today && item.dueDate <= sevenDaysFromNow && item.status !== 'completed').length,
        upcoming: allItems.filter(item => item.dueDate && item.dueDate > sevenDaysFromNow && item.status !== 'completed').length,
        completed: allItems.filter(item => item.status === 'completed').length,
        averageHealthScore: allItems.length > 0 
          ? Math.round(allItems.reduce((sum, item) => sum + (item.healthScore || 100), 0) / allItems.length)
          : 100,
        highPriorityPending: allItems.filter(item => item.priority === 'high' || item.priority === 'critical').length
      };

      res.json(summary);
    } catch (error) {
      console.error('Error fetching compliance summary:', error);
      res.status(500).json({ error: 'Failed to fetch compliance summary' });
    }
  });

  // ==========================================================================
  // COMPLIANCE CALENDAR - Calendar view of compliance deadlines
  // ==========================================================================
  app.get('/api/client/compliance-calendar', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUserId = req.user?.id;
      if (!authUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { month, year, category } = req.query;

      // Get user's entity ID for entity name
      const userEntityId = await getUserEntityId(authUserId);

      // Get entity name if available
      let entityName = 'My Business';
      if (userEntityId) {
        const [entity] = await db
          .select({ name: businessEntities.name })
          .from(businessEntities)
          .where(eq(businessEntities.id, userEntityId));
        if (entity?.name) {
          entityName = entity.name;
        }
      }

      // Build date filters if month/year provided
      let conditions = [eq(complianceTracking.userId, authUserId)];

      if (month && year) {
        const startOfMonth = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
        const endOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
        conditions.push(gte(complianceTracking.dueDate, startOfMonth));
        conditions.push(lte(complianceTracking.dueDate, endOfMonth));
      }

      // Query compliance items
      const complianceItems = await db
        .select()
        .from(complianceTracking)
        .where(and(...conditions))
        .orderBy(complianceTracking.dueDate);

      // Map category based on compliance type
      const getCategoryFromType = (complianceType: string, serviceId: string): string => {
        const typeUpper = (complianceType || '').toUpperCase();
        const serviceUpper = (serviceId || '').toUpperCase();

        if (serviceUpper.includes('GST') || serviceUpper.includes('GSTR')) return 'GST';
        if (serviceUpper.includes('TDS') || serviceUpper.includes('ITR') || serviceUpper.includes('26Q') || serviceUpper.includes('24Q')) return 'Income Tax';
        if (serviceUpper.includes('PF') || serviceUpper.includes('ESI') || serviceUpper.includes('PAYROLL')) return 'Payroll';
        if (serviceUpper.includes('ROC') || serviceUpper.includes('AOC') || serviceUpper.includes('MGT') || serviceUpper.includes('DIR')) return 'Corporate';
        if (serviceUpper.includes('LICENSE') || serviceUpper.includes('REGISTRATION')) return 'Licenses';

        // Fallback based on compliance type
        if (typeUpper.includes('MONTHLY')) return 'GST';
        if (typeUpper.includes('QUARTERLY')) return 'Income Tax';
        if (typeUpper.includes('ANNUAL')) return 'Corporate';

        return 'Other';
      };

      // Transform to calendar format expected by frontend
      const calendarItems = complianceItems.map(item => {
        const knowledgeRule = getComplianceByCode(item.serviceId);
        const itemCategory = getCategoryFromType(item.complianceType, item.serviceId);

        // Generate title from service type or knowledge base
        let title = item.serviceType || item.serviceId;
        if (knowledgeRule) {
          title = knowledgeRule.complianceName || `${knowledgeRule.formNumber} Filing`;
        }

        // Map status
        let status: 'pending' | 'in_progress' | 'completed' = 'pending';
        if (item.status === 'completed') {
          status = 'completed';
        } else if (item.status === 'in_progress' || item.status === 'processing') {
          status = 'in_progress';
        }

        // Map priority
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (item.priority === 'critical') priority = 'critical';
        else if (item.priority === 'high') priority = 'high';
        else if (item.priority === 'low') priority = 'low';

        // Check if overdue - escalate priority
        const dueDate = item.dueDate ? new Date(item.dueDate) : new Date();
        const today = new Date();
        if (dueDate < today && status !== 'completed') {
          priority = 'critical';
        }

        return {
          id: item.id,
          title,
          dueDate: item.dueDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          category: itemCategory,
          priority,
          status,
          entityName: item.entityName || entityName,
          description: knowledgeRule?.description || `${item.complianceType} compliance item`
        };
      });

      // Filter by category if specified
      let filteredItems = calendarItems;
      if (category && category !== 'all') {
        filteredItems = calendarItems.filter(item => item.category === category);
      }

      res.json(filteredItems);
    } catch (error) {
      console.error('Error fetching compliance calendar:', error);
      res.status(500).json({ error: 'Failed to fetch compliance calendar data' });
    }
  });

  // V1 backward compatibility route for compliance calendar
  app.get('/api/v1/client/compliance-calendar', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    // Redirect to the main handler by calling the same logic
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Forward to main endpoint
    res.redirect(307, `/api/client/compliance-calendar?${new URLSearchParams(req.query as any).toString()}`);
  });

  // ==========================================================================
  // SERVICE REQUEST COMMENTS - Communication thread for service requests
  // ==========================================================================

  // Get comments/messages for a service request
  app.get('/api/client/service-requests/:id/comments', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const requestId = parseInt(req.params.id);

      // Verify the service request belongs to this user's entity
      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.status(403).json({ error: 'No entity associated with user' });
      }

      const [request] = await db
        .select()
        .from(serviceRequests)
        .where(and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.businessEntityId, userEntityId)
        ));

      if (!request) {
        return res.status(404).json({ error: 'Service request not found or access denied' });
      }

      // Get all non-internal messages for this service request
      const requestMessages = await db
        .select({
          id: messages.id,
          threadId: messages.threadId,
          senderId: messages.senderId,
          content: messages.content,
          messageType: messages.messageType,
          attachments: messages.attachments,
          isSystemMessage: messages.isSystemMessage,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.serviceRequestId, requestId))
        .orderBy(asc(messages.createdAt));

      // Enrich with sender names
      const enrichedMessages = await Promise.all(
        requestMessages.map(async (msg) => {
          let senderName = 'System';
          let isOwnMessage = false;

          if (!msg.isSystemMessage && msg.senderId) {
            if (msg.senderId === userId) {
              senderName = 'You';
              isOwnMessage = true;
            } else {
              const [sender] = await db
                .select({ fullName: users.fullName, role: users.role })
                .from(users)
                .where(eq(users.id, msg.senderId))
                .limit(1);
              senderName = sender?.fullName || 'Support Team';
            }
          }

          return {
            ...msg,
            senderName,
            isOwnMessage,
          };
        })
      );

      res.json(enrichedMessages);
    } catch (error) {
      console.error('Error fetching service request comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // Add a comment/message to a service request
  app.post('/api/client/service-requests/:id/comments', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const requestId = parseInt(req.params.id);
      const { content, attachments } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Verify the service request belongs to this user's entity
      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.status(403).json({ error: 'No entity associated with user' });
      }

      const [request] = await db
        .select()
        .from(serviceRequests)
        .where(and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.businessEntityId, userEntityId)
        ));

      if (!request) {
        return res.status(404).json({ error: 'Service request not found or access denied' });
      }

      // Create a thread ID if this is the first message
      const threadId = `SR-${requestId}`;

      // Insert the message
      const [newMessage] = await db
        .insert(messages)
        .values({
          threadId,
          serviceRequestId: requestId,
          senderId: userId,
          content: content.trim(),
          messageType: 'text',
          attachments: attachments || null,
          isSystemMessage: false,
        })
        .returning();

      // Update the service request's updatedAt timestamp
      await db
        .update(serviceRequests)
        .set({ updatedAt: new Date() })
        .where(eq(serviceRequests.id, requestId));

      res.status(201).json({
        ...newMessage,
        senderName: 'You',
        isOwnMessage: true,
      });
    } catch (error) {
      console.error('Error adding comment to service request:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // ============ COMPLIANCE ALERT PREFERENCES ============

  /**
   * GET /api/client/compliance-alerts/preferences
   * Get client's compliance alert notification preferences
   * Requires: Client role
   */
  app.get('/api/client/compliance-alerts/preferences', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user's entity
      const userEntityId = await getUserEntityId(userId);

      // Mock preferences - In production, fetch from database
      const preferences = {
        entityId: userEntityId,
        userId,

        // General notification settings
        notificationsEnabled: true,

        // Channel preferences
        channels: {
          email: {
            enabled: true,
            primaryEmail: req.user?.email || 'user@example.com',
            secondaryEmail: null,
            digestMode: 'immediate', // immediate, daily_digest, weekly_digest
          },
          sms: {
            enabled: true,
            phoneNumber: '+91-98765-43210',
            onlyCritical: true, // Only send SMS for critical alerts
          },
          whatsapp: {
            enabled: true,
            phoneNumber: '+91-98765-43210',
            includeDocuments: true,
          },
          inApp: {
            enabled: true,
            showBadge: true,
            playSound: false,
          },
          push: {
            enabled: false,
            deviceTokens: [],
          },
        },

        // Compliance type preferences
        complianceTypes: {
          gst: {
            enabled: true,
            reminderDays: [30, 15, 7, 3, 1], // Days before deadline
            includeGSTR1: true,
            includeGSTR3B: true,
            includeAnnualReturn: true,
          },
          income_tax: {
            enabled: true,
            reminderDays: [60, 30, 15, 7, 3],
            includeTDS: true,
            includeAdvanceTax: true,
            includeITR: true,
          },
          roc: {
            enabled: true,
            reminderDays: [30, 15, 7],
            includeAOC4: true,
            includeMGT7: true,
            includeDIR3KYC: true,
          },
          pf_esi: {
            enabled: true,
            reminderDays: [7, 3, 1],
            includeMonthlyFiling: true,
            includeAnnualReturn: true,
          },
          other: {
            enabled: true,
            reminderDays: [15, 7, 3],
          },
        },

        // Alert severity preferences
        severityPreferences: {
          critical: {
            enabled: true,
            channels: ['email', 'sms', 'whatsapp', 'inApp'],
            sendImmediately: true,
          },
          warning: {
            enabled: true,
            channels: ['email', 'whatsapp', 'inApp'],
            sendImmediately: false,
          },
          info: {
            enabled: true,
            channels: ['email', 'inApp'],
            sendImmediately: false,
          },
        },

        // Alert type preferences
        alertTypes: {
          upcoming_deadline: {
            enabled: true,
            description: 'Upcoming compliance deadlines',
          },
          overdue: {
            enabled: true,
            description: 'Overdue compliance items',
          },
          penalty_risk: {
            enabled: true,
            description: 'Potential penalty notifications',
          },
          document_expiry: {
            enabled: true,
            description: 'Document expiration warnings',
          },
          license_renewal: {
            enabled: true,
            description: 'License renewal reminders',
          },
          regulatory_updates: {
            enabled: true,
            description: 'New regulatory changes affecting your business',
          },
          service_status: {
            enabled: true,
            description: 'Status updates on active services',
          },
        },

        // Quiet hours
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'Asia/Kolkata',
          exceptCritical: true, // Still send critical alerts during quiet hours
        },

        // Escalation preferences
        escalation: {
          enabled: true,
          escalateAfterHours: 24, // Escalate if not acknowledged within 24 hours
          escalateTo: null, // Additional email for escalation
        },

        lastUpdated: new Date(),
      };

      res.json(preferences);
    } catch (error) {
      console.error('Error fetching alert preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  /**
   * PUT /api/client/compliance-alerts/preferences
   * Update client's compliance alert notification preferences
   * Requires: Client role
   */
  app.put('/api/client/compliance-alerts/preferences', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { channels, complianceTypes, severityPreferences, alertTypes, quietHours, escalation, notificationsEnabled } = req.body;

      // Validate required structure
      if (typeof notificationsEnabled !== 'boolean') {
        return res.status(400).json({ error: 'notificationsEnabled must be a boolean' });
      }

      // Mock update - In production, save to database
      const updatedPreferences = {
        userId,
        notificationsEnabled,
        channels: channels || {},
        complianceTypes: complianceTypes || {},
        severityPreferences: severityPreferences || {},
        alertTypes: alertTypes || {},
        quietHours: quietHours || {},
        escalation: escalation || {},
        lastUpdated: new Date(),
      };

      res.json({
        message: 'Preferences updated successfully',
        preferences: updatedPreferences,
      });
    } catch (error) {
      console.error('Error updating alert preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  /**
   * PATCH /api/client/compliance-alerts/preferences/channel/:channel
   * Update a specific channel's preferences
   * Requires: Client role
   */
  app.patch('/api/client/compliance-alerts/preferences/channel/:channel', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { channel } = req.params;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validChannels = ['email', 'sms', 'whatsapp', 'inApp', 'push'];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
      }

      // Mock update - In production, update specific channel in database
      res.json({
        message: `${channel} preferences updated successfully`,
        channel,
        settings: updates,
      });
    } catch (error) {
      console.error('Error updating channel preferences:', error);
      res.status(500).json({ error: 'Failed to update channel preferences' });
    }
  });

  /**
   * GET /api/client/compliance-alerts
   * Get active compliance alerts for the client
   * Requires: Client role
   */
  app.get('/api/client/compliance-alerts', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { severity, type, acknowledged, limit = 50 } = req.query;

      // Get user's entity
      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.json({ alerts: [], total: 0, summary: { total: 0, critical: 0, warning: 0, info: 0, acknowledged: 0 } });
      }

      const whereConditions = [
        eq(complianceAlerts.entityId, userEntityId),
        eq(complianceAlerts.isActive, true),
      ];

      if (severity && severity !== 'all') {
        whereConditions.push(eq(complianceAlerts.severity, String(severity).toUpperCase()));
      }
      if (type && type !== 'all') {
        whereConditions.push(eq(complianceAlerts.alertType, String(type).toUpperCase()));
      }
      if (acknowledged !== undefined) {
        const isAck = acknowledged === 'true';
        whereConditions.push(eq(complianceAlerts.isAcknowledged, isAck));
      }

      const alerts = await db
        .select({
          id: complianceAlerts.id,
          entityId: complianceAlerts.entityId,
          alertType: complianceAlerts.alertType,
          severity: complianceAlerts.severity,
          title: complianceAlerts.title,
          message: complianceAlerts.message,
          actionRequired: complianceAlerts.actionRequired,
          isActive: complianceAlerts.isActive,
          isAcknowledged: complianceAlerts.isAcknowledged,
          acknowledgedAt: complianceAlerts.acknowledgedAt,
          triggeredAt: complianceAlerts.triggeredAt,
          expiresAt: complianceAlerts.expiresAt,
          metadata: complianceAlerts.metadata,
          ruleId: complianceAlerts.ruleId,
          complianceName: complianceRules.complianceName,
          regulationCategory: complianceRules.regulationCategory,
        })
        .from(complianceAlerts)
        .leftJoin(complianceRules, eq(complianceAlerts.ruleId, complianceRules.ruleCode))
        .where(and(...whereConditions))
        .orderBy(desc(complianceAlerts.triggeredAt));

      const normalizedAlerts = alerts.map(alert => {
        const severityValue = (alert.severity || 'INFO').toLowerCase();
        const alertTypeValue = (alert.alertType || 'INFO').toLowerCase();
        const status = !alert.isActive ? 'resolved' : alert.isAcknowledged ? 'acknowledged' : 'pending';
        const deadline =
          (alert.metadata as any)?.deadline ||
          (alert.metadata as any)?.dueDate ||
          (alert.metadata as any)?.due_date ||
          alert.expiresAt ||
          null;
        const category = mapComplianceCategory(alert.regulationCategory || alert.alertType);

        return {
          id: alert.id,
          entityId: alert.entityId,
          alertType: alertTypeValue,
          severity: severityValue,
          title: alert.title,
          message: alert.message,
          actionRequired: alert.actionRequired,
          complianceType: alert.regulationCategory || undefined,
          category,
          complianceName: alert.complianceName || undefined,
          deadline,
          isActive: alert.isActive,
          isAcknowledged: alert.isAcknowledged,
          acknowledgedAt: alert.acknowledgedAt,
          triggeredAt: alert.triggeredAt,
          metadata: alert.metadata,
          status,
        };
      });

      // Sort by severity and date
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      normalizedAlerts.sort((a, b) => {
        const sevDiff = severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder];
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
      });

      res.json({
        alerts: normalizedAlerts.slice(0, parseInt(limit as string, 10)),
        total: normalizedAlerts.length,
        summary: {
          total: normalizedAlerts.length,
          critical: normalizedAlerts.filter(a => a.severity === 'critical' && !a.isAcknowledged).length,
          warning: normalizedAlerts.filter(a => a.severity === 'warning' && !a.isAcknowledged).length,
          info: normalizedAlerts.filter(a => a.severity === 'info' && !a.isAcknowledged).length,
          acknowledged: normalizedAlerts.filter(a => a.isAcknowledged).length,
        },
      });
    } catch (error) {
      console.error('Error fetching compliance alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  /**
   * PATCH /api/client/compliance-alerts/:id/acknowledge
   * Acknowledge a compliance alert
   * Requires: Client role
   */
  app.patch('/api/client/compliance-alerts/:id/acknowledge', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { notes } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.status(404).json({ error: 'No entity associated with user' });
      }

      const [existing] = await db
        .select({ metadata: complianceAlerts.metadata })
        .from(complianceAlerts)
        .where(and(
          eq(complianceAlerts.id, parseInt(id)),
          eq(complianceAlerts.entityId, userEntityId)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      const [updated] = await db
        .update(complianceAlerts)
        .set({
          isAcknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
          metadata: {
            ...(existing?.metadata || {}),
            acknowledgeNotes: notes,
          },
        })
        .where(eq(complianceAlerts.id, parseInt(id)))
        .returning();

      res.json({
        message: 'Alert acknowledged successfully',
        alert: updated,
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });

  /**
   * POST /api/client/compliance-alerts/test
   * Send a test notification to verify alert channels
   * Requires: Client role
   */
  app.post('/api/client/compliance-alerts/test', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { channel } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validChannels = ['email', 'sms', 'whatsapp'];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
      }

      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.status(404).json({ error: 'No entity associated with user' });
      }

      const [alert] = await db.insert(complianceAlerts).values({
        entityId: userEntityId,
        ruleId: 'TEST_NOTIFICATION',
        alertType: 'TEST',
        severity: 'INFO',
        title: `Test ${channel.toUpperCase()} Notification`,
        message: `Test notification sent to ${channel}. Please confirm receipt.`,
        actionRequired: 'Confirm receipt',
        triggeredAt: new Date(),
        metadata: {
          channel,
          initiatedBy: userId,
        },
      }).returning();

      res.json({
        message: `Test notification sent to ${channel}`,
        channel,
        sentAt: new Date(),
        status: 'sent',
        alert,
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  /**
   * GET /api/client/compliance-alerts/upcoming-deadlines
   * Get summary of upcoming compliance deadlines for dashboard widget
   * Requires: Client role
   */
  app.get('/api/client/compliance-alerts/upcoming-deadlines', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { days = 30 } = req.query;

      const userEntityId = await getUserEntityId(userId);
      if (!userEntityId) {
        return res.json({
          deadlines: [],
          summary: {
            total: 0,
            critical: 0,
            thisWeek: 0,
            thisMonth: 0,
            totalEstimatedPenalty: 0,
          },
        });
      }

      const maxDays = parseInt(days as string, 10) || 30;
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000);

      const items = await db
        .select({
          id: complianceTracking.id,
          complianceType: complianceTracking.complianceType,
          dueDate: complianceTracking.dueDate,
          status: complianceTracking.status,
          priority: complianceTracking.priority,
          estimatedPenalty: complianceTracking.estimatedPenalty,
          serviceType: complianceTracking.serviceType,
          serviceId: complianceTracking.serviceId,
          complianceName: complianceRules.complianceName,
          regulationCategory: complianceRules.regulationCategory,
        })
        .from(complianceTracking)
        .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
        .where(and(
          eq(complianceTracking.businessEntityId, userEntityId),
          gte(complianceTracking.dueDate, startDate),
          lte(complianceTracking.dueDate, endDate),
          or(
            eq(complianceTracking.status, 'pending'),
            eq(complianceTracking.status, 'overdue'),
            eq(complianceTracking.status, 'in_progress')
          )
        ))
        .orderBy(asc(complianceTracking.dueDate));

      const deadlines = items.map(item => {
        const deadline = new Date(item.dueDate!);
        const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const category = mapComplianceCategory(item.regulationCategory || item.complianceType);

        return {
          id: item.id,
          complianceType: item.regulationCategory || item.complianceType,
          category,
          complianceName: item.complianceName || item.serviceType || item.serviceId,
          period: item.complianceType,
          deadline,
          daysRemaining,
          status: item.status,
          priority: item.priority,
          estimatedPenalty: Number(item.estimatedPenalty || 0),
          relatedServiceRequest: null,
        };
      });

      res.json({
        deadlines,
        summary: {
          total: deadlines.length,
          critical: deadlines.filter(d => d.daysRemaining <= 7).length,
          thisWeek: deadlines.filter(d => d.daysRemaining <= 7).length,
          thisMonth: deadlines.filter(d => d.daysRemaining <= 30).length,
          totalEstimatedPenalty: deadlines.reduce((sum, d) => sum + (d.estimatedPenalty || 0), 0),
        },
      });
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming deadlines' });
    }
  });

  console.log('✅ Client routes registered');
}
