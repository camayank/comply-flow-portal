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
    // First check if user has a direct entity assignment
    const [entity] = await db
      .select()
      .from(businessEntities)
      .where(eq(businessEntities.primaryContactId, userId));

    if (entity) return entity.id;

    // Fallback: check if user ID is stored as clientId in entities
    const [entityByClientId] = await db
      .select()
      .from(businessEntities)
      .where(eq(businessEntities.clientId, `U${userId}`));

    return entityByClientId?.id || null;
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
      const entities = await db
        .select()
        .from(businessEntities)
        .where(and(
          eq(businessEntities.isActive, true),
          or(
            eq(businessEntities.primaryContactId, userId),
            eq(businessEntities.clientId, `U${userId}`)
          )
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

  console.log('✅ Client routes registered');
}