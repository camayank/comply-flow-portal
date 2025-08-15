import type { Express } from "express";
import { db } from './db';
import { 
  serviceRequests,
  businessEntities
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

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

  console.log('✅ Client routes registered');
}