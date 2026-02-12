import type { Express } from "express";
import { db } from './db';
import {
  servicesCatalog,
  workflowTemplatesAdmin,
  serviceDocTypes,
  dueDateMaster,
  entityServices
} from '@shared/schema';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';

export function registerAdminConfigRoutes(app: Express) {
  const requireAdminAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;

  // ========== SERVICES CATALOG ==========
  app.get('/api/admin/services', ...requireAdminAccess, async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';

      let query = db
        .select()
        .from(servicesCatalog);

      if (!includeInactive) {
        query = query.where(eq(servicesCatalog.isActive, true));
      }

      const servicesList = await query.orderBy(servicesCatalog.category, servicesCatalog.name);
      res.json(servicesList);
    } catch (error) {
      console.error('Error fetching services catalog:', error);
      res.status(500).json({ error: 'Failed to fetch services catalog' });
    }
  });

  app.post('/api/admin/services', ...requireAdminAccess, async (req, res) => {
    try {
      const { serviceKey, name, periodicity, description, category } = req.body;

      if (!serviceKey || !name) {
        return res.status(400).json({ error: 'serviceKey and name are required' });
      }

      const [service] = await db
        .insert(servicesCatalog)
        .values({
          serviceKey,
          name,
          periodicity: periodicity || 'ONE_TIME',
          description,
          category,
          isActive: true
        })
        .returning();

      res.json(service);
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  });

  app.put('/api/admin/services/:serviceKey', ...requireAdminAccess, async (req, res) => {
    try {
      const { name, periodicity, description, category, isActive } = req.body;
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString()
      };

      if (name !== undefined) updates.name = name;
      if (periodicity !== undefined) updates.periodicity = periodicity;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (isActive !== undefined) updates.isActive = isActive;

      const [service] = await db
        .update(servicesCatalog)
        .set(updates)
        .where(eq(servicesCatalog.serviceKey, req.params.serviceKey))
        .returning();

      res.json(service);
    } catch (error) {
      console.error('Error updating service:', error);
      res.status(500).json({ error: 'Failed to update service' });
    }
  });

  app.delete('/api/admin/services/:serviceKey', ...requireAdminAccess, async (req, res) => {
    try {
      const [service] = await db
        .update(servicesCatalog)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(servicesCatalog.serviceKey, req.params.serviceKey))
        .returning();

      res.json(service || { serviceKey: req.params.serviceKey, deactivated: true });
    } catch (error) {
      console.error('Error deactivating service:', error);
      res.status(500).json({ error: 'Failed to deactivate service' });
    }
  });

  // ========== WORKFLOW TEMPLATES ==========
  app.get('/api/admin/workflows/:serviceKey', ...requireAdminAccess, async (req, res) => {
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

  app.post('/api/admin/workflows/:serviceKey', ...requireAdminAccess, async (req, res) => {
    try {
      const { templateJson } = req.body;
      const serviceKey = req.params.serviceKey;
      const [latest] = await db
        .select({ maxVersion: sql<number>`max(${workflowTemplatesAdmin.version})` })
        .from(workflowTemplatesAdmin)
        .where(eq(workflowTemplatesAdmin.serviceKey, serviceKey));

      const nextVersion = (latest?.maxVersion || 0) + 1;
      const payload = typeof templateJson === 'string'
        ? templateJson
        : JSON.stringify(templateJson || {});

      const [template] = await db
        .insert(workflowTemplatesAdmin)
        .values({
          serviceKey,
          version: nextVersion,
          templateJson: payload,
          isPublished: false,
          createdBy: (req as any).user?.email || (req as any).user?.username || 'admin'
        })
        .returning();

      res.json(template);
    } catch (error) {
      console.error('Error creating workflow template:', error);
      res.status(500).json({ error: 'Failed to create workflow template' });
    }
  });

  app.post('/api/admin/workflows/:serviceKey/publish', ...requireAdminAccess, async (req, res) => {
    try {
      const { version } = req.body;
      if (!version) {
        return res.status(400).json({ error: 'version is required to publish' });
      }

      const serviceKey = req.params.serviceKey;
      await db
        .update(workflowTemplatesAdmin)
        .set({ isPublished: false, updatedAt: new Date().toISOString() })
        .where(eq(workflowTemplatesAdmin.serviceKey, serviceKey));

      const [published] = await db
        .update(workflowTemplatesAdmin)
        .set({ isPublished: true, updatedAt: new Date().toISOString() })
        .where(and(
          eq(workflowTemplatesAdmin.serviceKey, serviceKey),
          eq(workflowTemplatesAdmin.version, Number(version))
        ))
        .returning();

      res.json({
        success: true,
        version: Number(version),
        publishedAt: new Date().toISOString(),
        template: published
      });
    } catch (error) {
      console.error('Error publishing workflow:', error);
      res.status(500).json({ error: 'Failed to publish workflow' });
    }
  });

  // ========== DOCUMENT TYPES ==========
  app.get('/api/admin/services/:serviceKey/doc-types', ...requireAdminAccess, async (req, res) => {
    try {
      const docTypes = await db
        .select()
        .from(serviceDocTypes)
        .where(eq(serviceDocTypes.serviceKey, req.params.serviceKey))
        .orderBy(asc(serviceDocTypes.label));

      res.json(docTypes);
    } catch (error) {
      console.error('Error fetching document types:', error);
      res.status(500).json({ error: 'Failed to fetch document types' });
    }
  });

  app.post('/api/admin/services/:serviceKey/doc-types', ...requireAdminAccess, async (req, res) => {
    try {
      const {
        doctype,
        label,
        clientUploads = true,
        isDeliverable = false,
        isInternal = false,
        versioned = true,
        stepKey,
        mandatory = true
      } = req.body;

      if (!doctype || !label) {
        return res.status(400).json({ error: 'doctype and label are required' });
      }

      const [docType] = await db
        .insert(serviceDocTypes)
        .values({
          serviceKey: req.params.serviceKey,
          doctype,
          label,
          clientUploads,
          isDeliverable,
          isInternal,
          versioned,
          stepKey,
          mandatory
        })
        .returning();

      res.json(docType);
    } catch (error) {
      console.error('Error creating document type:', error);
      res.status(500).json({ error: 'Failed to create document type' });
    }
  });

  app.delete('/api/admin/services/:serviceKey/doc-types/:docTypeId', ...requireAdminAccess, async (req, res) => {
    try {
      const docTypeId = parseInt(req.params.docTypeId);
      await db
        .delete(serviceDocTypes)
        .where(eq(serviceDocTypes.id, docTypeId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting document type:', error);
      res.status(500).json({ error: 'Failed to delete document type' });
    }
  });

  // ========== DUE DATE RULES ==========
  app.get('/api/admin/due-dates/:serviceKey', ...requireAdminAccess, async (req, res) => {
    try {
      const rules = await db
        .select()
        .from(dueDateMaster)
        .where(eq(dueDateMaster.serviceKey, req.params.serviceKey))
        .orderBy(desc(dueDateMaster.effectiveFrom));

      res.json(rules);
    } catch (error) {
      console.error('Error fetching due date rules:', error);
      res.status(500).json({ error: 'Failed to fetch due date rules' });
    }
  });

  app.post('/api/admin/due-dates/:serviceKey', ...requireAdminAccess, async (req, res) => {
    try {
      const { jurisdiction = 'IN', ruleJson, effectiveFrom } = req.body;
      const serviceKey = req.params.serviceKey;

      const effective = effectiveFrom ? new Date(effectiveFrom) : new Date();
      const payload = typeof ruleJson === 'string' ? ruleJson : JSON.stringify(ruleJson || {});

      await db
        .update(dueDateMaster)
        .set({
          isActive: false,
          effectiveTo: effective
        })
        .where(and(
          eq(dueDateMaster.serviceKey, serviceKey),
          eq(dueDateMaster.jurisdiction, jurisdiction),
          eq(dueDateMaster.isActive, true)
        ));

      const [rule] = await db
        .insert(dueDateMaster)
        .values({
          serviceKey,
          jurisdiction,
          ruleJson: payload,
          effectiveFrom: effective,
          isActive: true
        })
        .returning();

      res.json(rule);
    } catch (error) {
      console.error('Error creating due date rule:', error);
      res.status(500).json({ error: 'Failed to create due date rule' });
    }
  });

  app.put('/api/admin/due-dates/:ruleId', ...requireAdminAccess, async (req, res) => {
    try {
      const ruleId = parseInt(req.params.ruleId);
      const { ruleJson, isActive, effectiveFrom, effectiveTo } = req.body;

      const updates: Record<string, unknown> = { };
      if (ruleJson !== undefined) {
        updates.ruleJson = typeof ruleJson === 'string' ? ruleJson : JSON.stringify(ruleJson || {});
      }
      if (isActive !== undefined) updates.isActive = isActive;
      if (effectiveFrom) updates.effectiveFrom = new Date(effectiveFrom);
      if (effectiveTo) updates.effectiveTo = new Date(effectiveTo);

      const [rule] = await db
        .update(dueDateMaster)
        .set(updates)
        .where(eq(dueDateMaster.id, ruleId))
        .returning();

      res.json(rule);
    } catch (error) {
      console.error('Error updating due date rule:', error);
      res.status(500).json({ error: 'Failed to update due date rule' });
    }
  });

  // ========== ENTITY SERVICES ==========
  app.post('/api/admin/entities/:entityId/services', ...requireAdminAccess, async (req, res) => {
    try {
      const { serviceKey, periodicityOverride, jurisdiction = 'IN', metaJson } = req.body;
      const entityId = parseInt(req.params.entityId);

      if (!serviceKey) {
        return res.status(400).json({ error: 'serviceKey is required' });
      }

      const [existing] = await db
        .select()
        .from(entityServices)
        .where(and(
          eq(entityServices.entityId, entityId),
          eq(entityServices.serviceKey, serviceKey)
        ))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(entityServices)
          .set({
            periodicityOverride,
            jurisdiction,
            metaJson: metaJson
              ? (typeof metaJson === 'string' ? metaJson : JSON.stringify(metaJson))
              : existing.metaJson,
            isActive: true
          })
          .where(eq(entityServices.id, existing.id))
          .returning();

        return res.json(updated);
      }

      const [binding] = await db
        .insert(entityServices)
        .values({
          entityId,
          serviceKey,
          periodicityOverride,
          jurisdiction,
          metaJson: metaJson
            ? (typeof metaJson === 'string' ? metaJson : JSON.stringify(metaJson))
            : null,
          isActive: true
        })
        .returning();

      res.json(binding);
    } catch (error) {
      console.error('Error binding entity service:', error);
      res.status(500).json({ error: 'Failed to bind entity service' });
    }
  });

  // ========== DASHBOARD STATS ==========
  app.get('/api/admin/config-stats', ...requireAdminAccess, async (req, res) => {
    try {
      const [[totalServices], [publishedTemplates], [activeEntityBindings], [dueDateRules]] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(servicesCatalog),
        db.select({ count: sql<number>`count(*)::int` }).from(workflowTemplatesAdmin).where(eq(workflowTemplatesAdmin.isPublished, true)),
        db.select({ count: sql<number>`count(*)::int` }).from(entityServices).where(eq(entityServices.isActive, true)),
        db.select({ count: sql<number>`count(*)::int` }).from(dueDateMaster).where(eq(dueDateMaster.isActive, true))
      ]);

      res.json({
        totalServices: totalServices?.count || 0,
        publishedTemplates: publishedTemplates?.count || 0,
        activeEntityBindings: activeEntityBindings?.count || 0,
        dueDateRules: dueDateRules?.count || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching admin config stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin config stats' });
    }
  });

  // Backward-compatible alias
  app.get('/api/admin/stats', ...requireAdminAccess, async (req, res) => {
    try {
      const [[totalServices], [publishedTemplates], [activeEntityBindings], [dueDateRules]] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(servicesCatalog),
        db.select({ count: sql<number>`count(*)::int` }).from(workflowTemplatesAdmin).where(eq(workflowTemplatesAdmin.isPublished, true)),
        db.select({ count: sql<number>`count(*)::int` }).from(entityServices).where(eq(entityServices.isActive, true)),
        db.select({ count: sql<number>`count(*)::int` }).from(dueDateMaster).where(eq(dueDateMaster.isActive, true))
      ]);

      res.json({
        totalServices: totalServices?.count || 0,
        publishedTemplates: publishedTemplates?.count || 0,
        activeEntityBindings: activeEntityBindings?.count || 0,
        dueDateRules: dueDateRules?.count || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  console.log('✅ Admin configuration routes registered');
}
