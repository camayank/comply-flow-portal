import type { Express } from "express";
import { db } from './db';
import { 
  services,
  serviceRequests,
  businessEntities,
  servicesCatalog,
  documentsUploads
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export function registerAdminConfigRoutes(app: Express) {

  // ========== SERVICES CATALOG ==========
  app.get('/api/admin/services', async (req, res) => {
    try {
      // Get services from the services_catalog table (real implementation)
      const servicesList = await db
        .select()
        .from(servicesCatalog)
        .where(eq(servicesCatalog.isActive, true))
        .orderBy(servicesCatalog.category, servicesCatalog.name);
      
      console.log('Found services in catalog:', servicesList.length);
      
      res.json(servicesList);
    } catch (error) {
      console.error('Error fetching services catalog:', error);
      res.status(500).json({ error: 'Failed to fetch services catalog' });
    }
  });

  app.post('/api/admin/services', async (req, res) => {
    try {
      const { serviceKey, name, periodicity, description, category, price } = req.body;
      
      const [service] = await db
        .insert(servicesCatalog)
        .values({
          serviceKey,
          name,
          periodicity: periodicity || 'ONE_TIME',
          description,
          category,
          basePrice: price || 0
        })
        .returning();
      
      res.json(service);
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  });

  app.put('/api/admin/services/:serviceKey', async (req, res) => {
    try {
      const { name, periodicity, description, category, price } = req.body;
      
      const [service] = await db
        .update(services)
        .set({
          name,
          type: periodicity,
          description,
          category,
          price
        })
        .where(eq(services.serviceId, req.params.serviceKey))
        .returning();
      
      res.json(service);
    } catch (error) {
      console.error('Error updating service:', error);
      res.status(500).json({ error: 'Failed to update service' });
    }
  });

  // ========== WORKFLOW TEMPLATES ==========
  app.get('/api/admin/workflows/:serviceKey', async (req, res) => {
    try {
      // Mock workflow template data for demonstration
      const templates = [
        {
          id: 1,
          serviceKey: req.params.serviceKey,
          version: 1,
          templateJson: JSON.stringify({
            steps: [
              { id: 'step1', name: 'Document Collection', type: 'document_upload' },
              { id: 'step2', name: 'Review & Processing', type: 'manual_review' },
              { id: 'step3', name: 'Completion', type: 'delivery' }
            ]
          }),
          isPublished: true,
          createdAt: new Date().toISOString()
        }
      ];
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      res.status(500).json({ error: 'Failed to fetch workflow templates' });
    }
  });

  app.post('/api/admin/workflows/:serviceKey/publish', async (req, res) => {
    try {
      const { templateJson } = req.body;
      
      // Mock publishing workflow
      const result = {
        success: true,
        version: 1,
        publishedAt: new Date().toISOString()
      };
      
      res.json(result);
    } catch (error) {
      console.error('Error publishing workflow:', error);
      res.status(500).json({ error: 'Failed to publish workflow' });
    }
  });

  // ========== DOCUMENT TYPES ==========
  app.post('/api/admin/services/:serviceKey/doc-types', async (req, res) => {
    try {
      const { doctype, label, mandatory, clientUploads } = req.body;
      
      // Mock document type creation
      const docType = {
        id: Date.now(),
        serviceKey: req.params.serviceKey,
        doctype,
        label,
        mandatory: mandatory || true,
        clientUploads: clientUploads || true,
        createdAt: new Date().toISOString()
      };
      
      res.json(docType);
    } catch (error) {
      console.error('Error creating document type:', error);
      res.status(500).json({ error: 'Failed to create document type' });
    }
  });

  // ========== DUE DATE RULES ==========
  app.post('/api/admin/due-dates/:serviceKey', async (req, res) => {
    try {
      const { jurisdiction, ruleJson } = req.body;
      
      // Mock due date rule creation
      const rule = {
        id: Date.now(),
        serviceKey: req.params.serviceKey,
        jurisdiction: jurisdiction || 'IN',
        ruleJson,
        effectiveFrom: new Date().toISOString(),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      res.json(rule);
    } catch (error) {
      console.error('Error creating due date rule:', error);
      res.status(500).json({ error: 'Failed to create due date rule' });
    }
  });

  // ========== ENTITY SERVICES ==========
  app.post('/api/admin/entities/:entityId/services', async (req, res) => {
    try {
      const { serviceKey, periodicityOverride, jurisdiction } = req.body;
      const entityId = parseInt(req.params.entityId);
      
      // Create a service request for the entity
      const [serviceRequest] = await db
        .insert(serviceRequests)
        .values({
          businessEntityId: entityId,
          serviceId: serviceKey,
          status: 'initiated',
          totalAmount: 0,
          priority: 'medium'
        })
        .returning();
      
      res.json(serviceRequest);
    } catch (error) {
      console.error('Error binding entity service:', error);
      res.status(500).json({ error: 'Failed to bind entity service' });
    }
  });

  // ========== DASHBOARD STATS ==========
  app.get('/api/admin/stats', async (req, res) => {
    try {
      // Get accurate counts from database
      const totalServices = await db.select().from(servicesCatalog).then(r => r.length);
      const totalEntities = await db.select().from(businessEntities).then(r => r.length);
      const activeRequests = await db.select().from(serviceRequests)
        .where(eq(serviceRequests.status, 'in_progress')).then(r => r.length);
      
      const stats = {
        totalServices,
        totalEntities,
        activeServiceRequests: activeRequests,
        timestamp: new Date().toISOString()
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  console.log('✅ Admin configuration routes registered (simplified)');
}