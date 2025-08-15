import type { Express } from "express";
import { db } from './db';
import { 
  servicesCatalog,
  workflowTemplatesAdmin,
  serviceDocTypes,
  dueDateMaster,
  entityServices,
  serviceRequests,
  businessEntities
} from '@shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

export function registerAdminConfigRoutes(app: Express) {

  // ========== SERVICES CATALOG ==========
  app.get('/api/admin/services', async (req, res) => {
    try {
      const services = await db
        .select()
        .from(servicesCatalog)
        .where(eq(servicesCatalog.isActive, true))
        .orderBy(servicesCatalog.category, servicesCatalog.name);
      
      res.json(services);
    } catch (error) {
      console.error('Error fetching services catalog:', error);
      res.status(500).json({ error: 'Failed to fetch services catalog' });
    }
  });

  app.post('/api/admin/services', async (req, res) => {
    try {
      const { serviceKey, name, periodicity, description, category } = req.body;
      
      const [service] = await db
        .insert(servicesCatalog)
        .values({
          serviceKey,
          name,
          periodicity,
          description,
          category
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
      const { name, periodicity, description, category, isActive } = req.body;
      
      const [service] = await db
        .update(servicesCatalog)
        .set({
          name,
          periodicity,
          description,
          category,
          isActive,
          updatedAt: new Date().toISOString()
        })
        .where(eq(servicesCatalog.serviceKey, req.params.serviceKey))
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
      const templates = await db
        .select()
        .from(workflowTemplatesAdmin)
        .where(eq(workflowTemplatesAdmin.serviceKey, req.params.serviceKey))
        .orderBy(desc(workflowTemplatesAdmin.version));
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      res.status(500).json({ error: 'Failed to fetch workflow templates' });
    }
  });

  app.post('/api/admin/workflows/:serviceKey', async (req, res) => {
    try {
      const { templateJson, isPublished = false } = req.body;
      
      // Get next version number
      const latestVersion = await db
        .select({ version: sql`coalesce(max(version), 0) + 1` })
        .from(workflowTemplatesAdmin)
        .where(eq(workflowTemplatesAdmin.serviceKey, req.params.serviceKey));
      
      const version = Number(latestVersion[0].version);
      
      const [template] = await db
        .insert(workflowTemplatesAdmin)
        .values({
          serviceKey: req.params.serviceKey,
          version,
          templateJson: JSON.stringify(templateJson),
          isPublished,
          createdBy: 'admin' // TODO: get from auth
        })
        .returning();
      
      res.json({ ...template, version });
    } catch (error) {
      console.error('Error creating workflow template:', error);
      res.status(500).json({ error: 'Failed to create workflow template' });
    }
  });

  app.post('/api/admin/workflows/:serviceKey/publish', async (req, res) => {
    try {
      const { version } = req.body;
      
      // Unpublish all versions first
      await db
        .update(workflowTemplatesAdmin)
        .set({ isPublished: false })
        .where(eq(workflowTemplatesAdmin.serviceKey, req.params.serviceKey));
      
      // Publish the specified version
      await db
        .update(workflowTemplatesAdmin)
        .set({ isPublished: true })
        .where(
          and(
            eq(workflowTemplatesAdmin.serviceKey, req.params.serviceKey),
            eq(workflowTemplatesAdmin.version, version)
          )
        );
      
      res.json({ message: 'Workflow template published successfully' });
    } catch (error) {
      console.error('Error publishing workflow template:', error);
      res.status(500).json({ error: 'Failed to publish workflow template' });
    }
  });

  // ========== SERVICE DOC TYPES ==========
  app.get('/api/admin/services/:serviceKey/doc-types', async (req, res) => {
    try {
      const docTypes = await db
        .select()
        .from(serviceDocTypes)
        .where(eq(serviceDocTypes.serviceKey, req.params.serviceKey))
        .orderBy(serviceDocTypes.stepKey, serviceDocTypes.label);
      
      res.json(docTypes);
    } catch (error) {
      console.error('Error fetching doc types:', error);
      res.status(500).json({ error: 'Failed to fetch doc types' });
    }
  });

  app.post('/api/admin/services/:serviceKey/doc-types', async (req, res) => {
    try {
      const { 
        doctype, 
        label, 
        clientUploads = true, 
        versioned = true, 
        isDeliverable = false, 
        isInternal = false,
        stepKey,
        mandatory = true
      } = req.body;
      
      const [docType] = await db
        .insert(serviceDocTypes)
        .values({
          serviceKey: req.params.serviceKey,
          doctype,
          label,
          clientUploads,
          versioned,
          isDeliverable,
          isInternal,
          stepKey,
          mandatory
        })
        .returning();
      
      res.json(docType);
    } catch (error) {
      console.error('Error creating doc type:', error);
      res.status(500).json({ error: 'Failed to create doc type' });
    }
  });

  app.put('/api/admin/doc-types/:id', async (req, res) => {
    try {
      const [docType] = await db
        .update(serviceDocTypes)
        .set(req.body)
        .where(eq(serviceDocTypes.id, parseInt(req.params.id)))
        .returning();
      
      res.json(docType);
    } catch (error) {
      console.error('Error updating doc type:', error);
      res.status(500).json({ error: 'Failed to update doc type' });
    }
  });

  app.delete('/api/admin/doc-types/:id', async (req, res) => {
    try {
      await db
        .delete(serviceDocTypes)
        .where(eq(serviceDocTypes.id, parseInt(req.params.id)));
      
      res.json({ message: 'Doc type deleted successfully' });
    } catch (error) {
      console.error('Error deleting doc type:', error);
      res.status(500).json({ error: 'Failed to delete doc type' });
    }
  });

  // ========== DUE DATE MASTER ==========
  app.get('/api/admin/due-dates/:serviceKey', async (req, res) => {
    try {
      const dueDates = await db
        .select()
        .from(dueDateMaster)
        .where(
          and(
            eq(dueDateMaster.serviceKey, req.params.serviceKey),
            eq(dueDateMaster.isActive, true)
          )
        )
        .orderBy(dueDateMaster.jurisdiction, desc(dueDateMaster.effectiveFrom));
      
      res.json(dueDates);
    } catch (error) {
      console.error('Error fetching due date rules:', error);
      res.status(500).json({ error: 'Failed to fetch due date rules' });
    }
  });

  app.post('/api/admin/due-dates/:serviceKey', async (req, res) => {
    try {
      const { jurisdiction = 'IN', ruleJson, effectiveFrom, effectiveTo = null } = req.body;
      
      const [dueDate] = await db
        .insert(dueDateMaster)
        .values({
          serviceKey: req.params.serviceKey,
          jurisdiction,
          ruleJson: JSON.stringify(ruleJson),
          effectiveFrom: new Date(effectiveFrom).toISOString(),
          effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null
        })
        .returning();
      
      res.json(dueDate);
    } catch (error) {
      console.error('Error creating due date rule:', error);
      res.status(500).json({ error: 'Failed to create due date rule' });
    }
  });

  app.put('/api/admin/due-dates/:id', async (req, res) => {
    try {
      const { ruleJson, effectiveFrom, effectiveTo, isActive } = req.body;
      
      const [dueDate] = await db
        .update(dueDateMaster)
        .set({
          ruleJson: JSON.stringify(ruleJson),
          effectiveFrom: new Date(effectiveFrom).toISOString(),
          effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
          isActive
        })
        .where(eq(dueDateMaster.id, parseInt(req.params.id)))
        .returning();
      
      res.json(dueDate);
    } catch (error) {
      console.error('Error updating due date rule:', error);
      res.status(500).json({ error: 'Failed to update due date rule' });
    }
  });

  // ========== ENTITY SERVICES BINDING ==========
  app.get('/api/admin/entities/:entityId/services', async (req, res) => {
    try {
      const entityServices = await db
        .select({
          binding: entityServices,
          service: servicesCatalog
        })
        .from(entityServices)
        .leftJoin(servicesCatalog, eq(entityServices.serviceKey, servicesCatalog.serviceKey))
        .where(eq(entityServices.entityId, parseInt(req.params.entityId)));
      
      res.json(entityServices);
    } catch (error) {
      console.error('Error fetching entity services:', error);
      res.status(500).json({ error: 'Failed to fetch entity services' });
    }
  });

  app.post('/api/admin/entities/:entityId/services', async (req, res) => {
    try {
      const { serviceKey, periodicityOverride = null, jurisdiction = 'IN', metaJson = null } = req.body;
      
      const [binding] = await db
        .insert(entityServices)
        .values({
          entityId: parseInt(req.params.entityId),
          serviceKey,
          periodicityOverride,
          jurisdiction,
          metaJson: metaJson ? JSON.stringify(metaJson) : null
        })
        .returning();
      
      res.json(binding);
    } catch (error) {
      console.error('Error binding service to entity:', error);
      res.status(500).json({ error: 'Failed to bind service to entity' });
    }
  });

  app.delete('/api/admin/entities/:entityId/services/:serviceKey', async (req, res) => {
    try {
      await db
        .update(entityServices)
        .set({ isActive: false })
        .where(
          and(
            eq(entityServices.entityId, parseInt(req.params.entityId)),
            eq(entityServices.serviceKey, req.params.serviceKey)
          )
        );
      
      res.json({ message: 'Service binding deactivated' });
    } catch (error) {
      console.error('Error deactivating service binding:', error);
      res.status(500).json({ error: 'Failed to deactivate service binding' });
    }
  });

  // ========== DUE DATE COMPUTATION PREVIEW ==========
  app.post('/api/admin/due-dates/preview', async (req, res) => {
    try {
      const { ruleJson, baseDate = new Date(), metaJson = {} } = req.body;
      
      const dueDate = computeDueDate(ruleJson, new Date(baseDate), metaJson);
      
      res.json({
        baseDate,
        computedDueDate: dueDate,
        rule: ruleJson,
        meta: metaJson
      });
    } catch (error) {
      console.error('Error computing due date preview:', error);
      res.status(500).json({ error: 'Failed to compute due date preview' });
    }
  });

  // ========== SPAWNER TRIGGER (Manual) ==========
  app.post('/api/admin/spawn-periods', async (req, res) => {
    try {
      const { entityId, serviceKey, forceSpawn = false } = req.body;
      
      const spawned = await spawnServiceOrdersForEntity(entityId, serviceKey, forceSpawn);
      
      res.json({
        message: 'Service orders spawned successfully',
        spawned
      });
    } catch (error) {
      console.error('Error spawning periods:', error);
      res.status(500).json({ error: 'Failed to spawn periods' });
    }
  });

  // ========== SEED DEFAULT TEMPLATES ==========
  app.post('/api/admin/seed-templates', async (req, res) => {
    try {
      const { serviceSeeder } = await import('./service-seeder');
      await serviceSeeder.seedAllServices();
      
      res.json({
        message: 'All services and templates seeded successfully'
      });
    } catch (error) {
      console.error('Error seeding templates:', error);
      res.status(500).json({ error: 'Failed to seed templates' });
    }
  });

  // ========== ADMIN DASHBOARD STATS ==========
  app.get('/api/admin/config-stats', async (req, res) => {
    try {
      const stats = {
        totalServices: await db
          .select({ count: sql`count(*)` })
          .from(servicesCatalog)
          .where(eq(servicesCatalog.isActive, true)),
        
        publishedTemplates: await db
          .select({ count: sql`count(distinct service_key)` })
          .from(workflowTemplatesAdmin)
          .where(eq(workflowTemplatesAdmin.isPublished, true)),
        
        activeEntityBindings: await db
          .select({ count: sql`count(*)` })
          .from(entityServices)
          .where(eq(entityServices.isActive, true)),
        
        dueDateRules: await db
          .select({ count: sql`count(*)` })
          .from(dueDateMaster)
          .where(eq(dueDateMaster.isActive, true)),
        
        servicesByCategory: await db
          .select({
            category: servicesCatalog.category,
            count: sql`count(*)`
          })
          .from(servicesCatalog)
          .where(eq(servicesCatalog.isActive, true))
          .groupBy(servicesCatalog.category)
      };

      res.json({
        totalServices: Number(stats.totalServices[0].count),
        publishedTemplates: Number(stats.publishedTemplates[0].count),
        activeEntityBindings: Number(stats.activeEntityBindings[0].count),
        dueDateRules: Number(stats.dueDateRules[0].count),
        servicesByCategory: stats.servicesByCategory.map(s => ({
          category: s.category || 'Uncategorized',
          count: Number(s.count)
        }))
      });
    } catch (error) {
      console.error('Error fetching config stats:', error);
      res.status(500).json({ error: 'Failed to fetch config stats' });
    }
  });

  console.log('✅ Admin configuration routes registered');
}

// ========== HELPER FUNCTIONS ==========
function computeDueDate(ruleJson: any, baseDate = new Date(), meta: any = {}): string {
  const r = typeof ruleJson === 'string' ? JSON.parse(ruleJson) : ruleJson;

  // MONTHLY
  if (r.periodicity === 'MONTHLY') {
    const month = baseDate.getMonth();
    const year = baseDate.getFullYear();
    const due = new Date(year, month, r.dueDayOfMonth || 20);
    return due.toISOString().slice(0, 10);
  }

  // QUARTERLY (QRMP or generic)
  if (r.periodicity === 'QUARTERLY') {
    const m = baseDate.getMonth(); // 0..11
    const q = m <= 2 ? 'Q4' : m <= 5 ? 'Q1' : m <= 8 ? 'Q2' : 'Q3'; // adjust if FY vs CY
    if (r.quarterDue && r.quarterDue[q]) {
      const [MM, DD] = r.quarterDue[q].split('-'); // "01-31"
      const year = baseDate.getFullYear();
      return `${year}-${MM.padStart(2, '0')}-${DD.padStart(2, '0')}`;
    }
    if (r.dueDayOfQuarter) {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      const due = new Date(baseDate.getFullYear(), quarterStartMonth + 2, r.dueDayOfQuarter);
      return due.toISOString().slice(0, 10);
    }
  }

  // ANNUAL
  if (r.periodicity === 'ANNUAL') {
    if (r.fallbackDue) {
      const [MM, DD] = r.fallbackDue.split('-');
      const year = baseDate.getFullYear();
      return `${year}-${MM.padStart(2, '0')}-${DD.padStart(2, '0')}`;
    }
  }

  // Default: 20th of this month
  const fallback = new Date(baseDate.getFullYear(), baseDate.getMonth(), 20);
  return fallback.toISOString().slice(0, 10);
}

async function spawnServiceOrdersForEntity(entityId?: number, serviceKey?: string, forceSpawn = false) {
  try {
    let query = db
      .select({
        binding: entityServices,
        entity: businessEntities,
        service: servicesCatalog,
        dueRule: dueDateMaster
      })
      .from(entityServices)
      .leftJoin(businessEntities, eq(entityServices.entityId, businessEntities.id))
      .leftJoin(servicesCatalog, eq(entityServices.serviceKey, servicesCatalog.serviceKey))
      .leftJoin(dueDateMaster, 
        and(
          eq(dueDateMaster.serviceKey, entityServices.serviceKey),
          eq(dueDateMaster.isActive, true)
        )
      )
      .where(
        and(
          eq(entityServices.isActive, true),
          eq(servicesCatalog.isActive, true)
        )
      );

    if (entityId) {
      query = query.where(eq(entityServices.entityId, entityId));
    }

    if (serviceKey) {
      query = query.where(eq(entityServices.serviceKey, serviceKey));
    }

    const bindings = await query;
    const spawned = [];

    for (const binding of bindings) {
      const { binding: b, entity: e, service: s, dueRule: d } = binding;
      
      if (!e || !s) continue;

      const periodicity = b.periodicityOverride || s.periodicity;
      const ruleJson = d?.ruleJson ? JSON.parse(d.ruleJson) : { periodicity, dueDayOfMonth: 20 };
      const dueDate = computeDueDate(ruleJson, new Date(), JSON.parse(b.metaJson || '{}'));
      const periodLabel = new Date().toLocaleString('en-IN', { 
        month: 'short', 
        year: 'numeric', 
        timeZone: 'Asia/Kolkata' 
      });

      // Check if order already exists for this period
      if (!forceSpawn) {
        const existing = await db
          .select()
          .from(serviceRequests)
          .where(
            and(
              eq(serviceRequests.entityId, b.entityId),
              eq(serviceRequests.serviceType, b.serviceKey),
              eq(serviceRequests.periodLabel, periodLabel)
            )
          )
          .limit(1);

        if (existing.length > 0) continue;
      }

      // Create new service order
      const [newOrder] = await db
        .insert(serviceRequests)
        .values({
          entityId: b.entityId,
          serviceType: b.serviceKey,
          periodicity,
          periodLabel,
          dueDate,
          status: 'Created',
          priority: 'MEDIUM'
        })
        .returning();

      spawned.push({
        entityName: e.name,
        serviceKey: b.serviceKey,
        periodLabel,
        dueDate,
        orderId: newOrder.id
      });

      console.log(`[Spawner] Created ${b.serviceKey} for ${e.name} (${periodLabel}) due ${dueDate}`);
    }

    return spawned;
  } catch (error) {
    console.error('Error spawning service orders:', error);
    throw error;
  }
}