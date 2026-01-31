import type { Express, Response } from "express";
import { db } from './db';
import {
  serviceRequests,
  businessEntities,
  complianceTracking,
  messages,
  users
} from '@shared/schema';
import { eq, desc, and, gte, lte, or, asc } from 'drizzle-orm';
import { COMPLIANCE_KNOWLEDGE_BASE, getComplianceByCode } from './compliance-knowledge-base';
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
          .select({ businessName: businessEntities.businessName })
          .from(businessEntities)
          .where(eq(businessEntities.id, userEntityId));
        if (entity?.businessName) {
          entityName = entity.businessName;
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
        return res.json({ alerts: [], total: 0 });
      }

      // Mock alerts - In production, query from complianceAlerts table
      const alerts = [
        {
          id: 1,
          entityId: userEntityId,
          alertType: 'upcoming_deadline',
          severity: 'critical',
          title: 'GST Return Due in 3 Days',
          message: 'GSTR-3B for January 2026 is due on 20th February. Please ensure timely filing to avoid penalties.',
          actionRequired: 'File GSTR-3B before deadline',
          complianceType: 'gst',
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          isActive: true,
          isAcknowledged: false,
          triggeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          metadata: {
            filingPeriod: 'January 2026',
            returnType: 'GSTR-3B',
            estimatedPenalty: 5000,
          },
        },
        {
          id: 2,
          entityId: userEntityId,
          alertType: 'upcoming_deadline',
          severity: 'warning',
          title: 'TDS Return Due in 15 Days',
          message: 'Quarterly TDS return for Q3 FY 2025-26 is due on 31st January 2026.',
          actionRequired: 'File TDS return',
          complianceType: 'income_tax',
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          isActive: true,
          isAcknowledged: false,
          triggeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          metadata: {
            quarter: 'Q3 FY 2025-26',
            returnType: '26Q',
          },
        },
        {
          id: 3,
          entityId: userEntityId,
          alertType: 'document_expiry',
          severity: 'info',
          title: 'GST Certificate Renewal',
          message: 'Your GST registration certificate will expire in 30 days. Renewal process should be initiated.',
          actionRequired: 'Initiate GST certificate renewal',
          complianceType: 'gst',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          isAcknowledged: true,
          acknowledgedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          triggeredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          metadata: {
            documentType: 'GST Certificate',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        {
          id: 4,
          entityId: userEntityId,
          alertType: 'regulatory_updates',
          severity: 'info',
          title: 'New GST Compliance Update',
          message: 'CBIC has issued new guidelines for e-invoicing threshold. Review changes that may affect your business.',
          actionRequired: 'Review new guidelines',
          complianceType: 'gst',
          deadline: null,
          isActive: true,
          isAcknowledged: false,
          triggeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          metadata: {
            circularNumber: 'CBIC/2026/01/15',
            effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        {
          id: 5,
          entityId: userEntityId,
          alertType: 'service_status',
          severity: 'info',
          title: 'Service Request Update',
          message: 'Your Annual ROC Filing (SR-001) has moved to "Documents Pending" status.',
          actionRequired: 'Upload required documents',
          complianceType: 'roc',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: true,
          isAcknowledged: false,
          triggeredAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          metadata: {
            serviceRequestId: 'SR-001',
            previousStatus: 'Payment Received',
            newStatus: 'Documents Pending',
          },
        },
      ];

      // Apply filters
      let filteredAlerts = alerts;

      if (severity && severity !== 'all') {
        filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
      }
      if (type && type !== 'all') {
        filteredAlerts = filteredAlerts.filter(a => a.alertType === type);
      }
      if (acknowledged !== undefined) {
        const isAck = acknowledged === 'true';
        filteredAlerts = filteredAlerts.filter(a => a.isAcknowledged === isAck);
      }

      // Sort by severity and date
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      filteredAlerts.sort((a, b) => {
        const sevDiff = severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder];
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
      });

      res.json({
        alerts: filteredAlerts.slice(0, parseInt(limit as string)),
        total: filteredAlerts.length,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical' && !a.isAcknowledged).length,
          warning: alerts.filter(a => a.severity === 'warning' && !a.isAcknowledged).length,
          info: alerts.filter(a => a.severity === 'info' && !a.isAcknowledged).length,
          acknowledged: alerts.filter(a => a.isAcknowledged).length,
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

      // Mock acknowledge - In production, update complianceAlerts table
      res.json({
        message: 'Alert acknowledged successfully',
        alertId: parseInt(id),
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        notes,
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

      // Mock test notification - In production, actually send test notification
      res.json({
        message: `Test notification sent to ${channel}`,
        channel,
        sentAt: new Date(),
        status: 'sent',
        note: `A test notification has been sent to your registered ${channel}. Please check and confirm receipt.`,
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

      // Mock upcoming deadlines - In production, query from compliance tracking
      const upcomingDeadlines = [
        {
          id: 1,
          complianceType: 'gst',
          complianceName: 'GSTR-3B',
          period: 'January 2026',
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          daysRemaining: 3,
          status: 'pending',
          priority: 'critical',
          estimatedPenalty: 5000,
          relatedServiceRequest: null,
        },
        {
          id: 2,
          complianceType: 'income_tax',
          complianceName: 'TDS Return (26Q)',
          period: 'Q3 FY 2025-26',
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          daysRemaining: 15,
          status: 'pending',
          priority: 'high',
          estimatedPenalty: 10000,
          relatedServiceRequest: null,
        },
        {
          id: 3,
          complianceType: 'gst',
          complianceName: 'GSTR-1',
          period: 'January 2026',
          deadline: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
          daysRemaining: 11,
          status: 'pending',
          priority: 'high',
          estimatedPenalty: 5000,
          relatedServiceRequest: null,
        },
        {
          id: 4,
          complianceType: 'roc',
          complianceName: 'AOC-4 (Financial Statements)',
          period: 'FY 2024-25',
          deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          daysRemaining: 45,
          status: 'in_progress',
          priority: 'medium',
          estimatedPenalty: 100000,
          relatedServiceRequest: 'SR-001',
        },
        {
          id: 5,
          complianceType: 'roc',
          complianceName: 'DIR-3 KYC',
          period: 'Annual',
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          daysRemaining: 60,
          status: 'pending',
          priority: 'low',
          estimatedPenalty: 5000,
          relatedServiceRequest: null,
        },
      ];

      // Filter by days
      const maxDays = parseInt(days as string);
      const filtered = upcomingDeadlines.filter(d => d.daysRemaining <= maxDays);

      res.json({
        deadlines: filtered,
        summary: {
          total: filtered.length,
          critical: filtered.filter(d => d.daysRemaining <= 7).length,
          thisWeek: filtered.filter(d => d.daysRemaining <= 7).length,
          thisMonth: filtered.filter(d => d.daysRemaining <= 30).length,
          totalEstimatedPenalty: filtered.reduce((sum, d) => sum + (d.estimatedPenalty || 0), 0),
        },
      });
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming deadlines' });
    }
  });

  console.log('✅ Client routes registered');
}