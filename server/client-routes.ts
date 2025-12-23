import type { Express } from "express";
import { db } from './db';
import { 
  serviceRequests,
  businessEntities,
  complianceTracking
} from '@shared/schema';
import { eq, desc, and, gte, lte, or } from 'drizzle-orm';
import { COMPLIANCE_KNOWLEDGE_BASE, getComplianceByCode } from './compliance-knowledge-base';

export function registerClientRoutes(app: Express) {

  // Get all business entities for client
  app.get('/api/client/entities', async (req, res) => {
    try {
      const entities = await db
        .select()
        .from(businessEntities)
        .where(eq(businessEntities.isActive, true))
        .orderBy(desc(businessEntities.createdAt));

      res.json(entities);
    } catch (error) {
      console.error('Error fetching entities:', error);
      res.status(500).json({ error: 'Failed to fetch entities' });
    }
  });

  // Get service requests for client
  app.get('/api/client/service-requests', async (req, res) => {
    try {
      const { entityId } = req.query;
      
      let query = db
        .select()
        .from(serviceRequests)
        .orderBy(desc(serviceRequests.createdAt));

      const requests = entityId 
        ? await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.businessEntityId, parseInt(entityId as string)))
            .orderBy(desc(serviceRequests.createdAt))
        : await query;


      res.json(requests);
    } catch (error) {
      console.error('Error fetching service requests:', error);
      res.status(500).json({ error: 'Failed to fetch service requests' });
    }
  });

  // Get service request details
  app.get('/api/client/service-requests/:id', async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      
      const [request] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      res.json(request);
    } catch (error) {
      console.error('Error fetching service request:', error);
      res.status(500).json({ error: 'Failed to fetch service request' });
    }
  });

  // Update service request status (client actions)
  app.patch('/api/client/service-requests/:id', async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { status, clientNotes } = req.body;

      const [updated] = await db
        .update(serviceRequests)
        .set({ 
          status,
          clientNotes,
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, requestId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating service request:', error);
      res.status(500).json({ error: 'Failed to update service request' });
    }
  });

  // Get compliance tracking items for client
  app.get('/api/client/compliance-tracking', async (req, res) => {
    try {
      const { userId, startDate, endDate, status } = req.query;
      
      // Build the query with optional filters
      let conditions = [];
      
      if (userId) {
        conditions.push(eq(complianceTracking.userId, parseInt(userId as string)));
      }
      
      if (startDate) {
        conditions.push(gte(complianceTracking.dueDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(complianceTracking.dueDate, new Date(endDate as string)));
      }
      
      if (status) {
        conditions.push(eq(complianceTracking.status, status as string));
      }

      // Query compliance tracking data
      const complianceItems = conditions.length > 0
        ? await db
            .select()
            .from(complianceTracking)
            .where(and(...conditions))
            .orderBy(complianceTracking.dueDate)
        : await db
            .select()
            .from(complianceTracking)
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

  // Get compliance summary/stats for client dashboard
  app.get('/api/client/compliance-summary', async (req, res) => {
    try {
      const { userId } = req.query;
      
      const conditions = userId 
        ? [eq(complianceTracking.userId, parseInt(userId as string))]
        : [];

      const allItems = conditions.length > 0
        ? await db
            .select()
            .from(complianceTracking)
            .where(and(...conditions))
        : await db
            .select()
            .from(complianceTracking);

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

  console.log('✅ Client routes registered');
}