import type { Express } from "express";
import { z } from 'zod';
import { db } from './db';
import { 
  serviceRequests,
  businessEntities,
  notificationRules,
  notificationOutbox,
  notificationTemplates,
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { notificationEngine } from './notification-engine';
import { serviceTemplateSeeder } from './service-template-seeder';
import { requireAuth, requireMinRole } from './auth-middleware';
import { log } from './logger';

const nonEmptyBodySchema = z
  .record(z.any())
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Request body is required',
  });

const ruleIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const templateKeySchema = z.object({
  templateKey: z.string().trim().min(1),
});

const outboxQuerySchema = z.object({
  status: z.enum(['QUEUED', 'SENT', 'FAILED', 'PROCESSING']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const manualTriggerSchema = z.object({
  ruleKey: z.string().trim().min(1),
  serviceRequestId: z.coerce.number().int().positive(),
  entityId: z.coerce.number().int().positive().optional(),
});

const testTemplateSchema = z.object({
  templateKey: z.string().trim().min(1),
  testData: z.record(z.any()).optional().default({}),
});

const statusChangeSchema = z.object({
  fromStatus: z.string().trim().min(1),
  toStatus: z.string().trim().min(1),
});

const documentRejectSchema = z.object({
  serviceRequestId: z.coerce.number().int().positive(),
  documentType: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export function registerNotificationRoutes(app: Express) {
  
  // Initialize/Seed Templates and Rules
  app.post('/api/admin/seed-templates', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      await serviceTemplateSeeder.seedAllTemplates();
      res.json({ message: 'All service templates seeded successfully' });
      log.business('Notification templates seeded', { userId: req.user?.id });
    } catch (error) {
      console.error('Error seeding templates:', error);
      res.status(500).json({ error: 'Failed to seed templates' });
    }
  });

  // Notification Rules Management
  app.get('/api/admin/notification-rules', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const rules = await db
        .select()
        .from(notificationRules)
        .orderBy(desc(notificationRules.createdAt));
      
      res.json(rules);
    } catch (error) {
      console.error('Error fetching notification rules:', error);
      res.status(500).json({ error: 'Failed to fetch notification rules' });
    }
  });

  app.post('/api/admin/notification-rules', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const rulePayload = nonEmptyBodySchema.parse(req.body);
      const rule = await notificationEngine.createRule(rulePayload);
      res.json(rule);
      log.business('Notification rule created', { userId: req.user?.id, ruleKey: rule.ruleKey });
    } catch (error) {
      console.error('Error creating notification rule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create notification rule' });
    }
  });

  app.put('/api/admin/notification-rules/:id', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const { id } = ruleIdSchema.parse(req.params);
      const rulePayload = nonEmptyBodySchema.parse(req.body);
      const rule = await notificationEngine.updateRule(
        id, 
        rulePayload
      );
      res.json(rule);
      log.business('Notification rule updated', { userId: req.user?.id, ruleId: id });
    } catch (error) {
      console.error('Error updating notification rule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update notification rule' });
    }
  });

  app.delete('/api/admin/notification-rules/:id', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const { id } = ruleIdSchema.parse(req.params);
      await db
        .update(notificationRules)
        .set({ isEnabled: false })
        .where(eq(notificationRules.id, id));
      
      await notificationEngine.reloadRules();
      res.json({ message: 'Notification rule disabled successfully' });
      log.business('Notification rule disabled', { userId: req.user?.id, ruleId: id });
    } catch (error) {
      console.error('Error disabling notification rule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to disable notification rule' });
    }
  });

  // Notification Templates Management
  app.get('/api/admin/notification-templates', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const templates = await db
        .select()
        .from(notificationTemplates)
        .orderBy(notificationTemplates.templateKey);
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      res.status(500).json({ error: 'Failed to fetch notification templates' });
    }
  });

  app.post('/api/admin/notification-templates', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const templatePayload = nonEmptyBodySchema.parse(req.body);
      const [template] = await db
        .insert(notificationTemplates)
        .values(templatePayload)
        .returning();
      
      res.json(template);
      log.business('Notification template created', { userId: req.user?.id, templateKey: template.templateKey });
    } catch (error) {
      console.error('Error creating notification template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create notification template' });
    }
  });

  app.put('/api/admin/notification-templates/:templateKey', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const { templateKey } = templateKeySchema.parse(req.params);
      const templatePayload = nonEmptyBodySchema.parse(req.body);
      const [template] = await db
        .update(notificationTemplates)
        .set({ ...templatePayload, updatedAt: new Date().toISOString() })
        .where(eq(notificationTemplates.templateKey, templateKey))
        .returning();
      
      res.json(template);
      log.business('Notification template updated', { userId: req.user?.id, templateKey });
    } catch (error) {
      console.error('Error updating notification template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update notification template' });
    }
  });

  // Notification Outbox Monitoring
  app.get('/api/admin/notification-outbox', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const { status, limit, offset } = outboxQuerySchema.parse(req.query);
      
      let query = db
        .select({
          notification: notificationOutbox,
          entityName: businessEntities.name
        })
        .from(notificationOutbox)
        .leftJoin(businessEntities, eq(notificationOutbox.entityId, businessEntities.id))
        .orderBy(desc(notificationOutbox.createdAt))
        .limit(limit)
        .offset(offset);

      if (status) {
        query = query.where(eq(notificationOutbox.status, status as string));
      }

      const notifications = await query;
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notification outbox:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch notification outbox' });
    }
  });

  // Notification Analytics
  app.get('/api/admin/notification-analytics', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const analytics = await db
        .select({
          ruleKey: notificationOutbox.ruleKey,
          channel: notificationOutbox.channel,
          status: notificationOutbox.status,
          count: sql`count(*)`
        })
        .from(notificationOutbox)
        .groupBy(
          notificationOutbox.ruleKey, 
          notificationOutbox.channel, 
          notificationOutbox.status
        );

      // Get delivery rates
      const deliveryRates = await db
        .select({
          channel: notificationOutbox.channel,
          totalSent: sql`count(*)`,
          delivered: sql`count(case when status = 'SENT' then 1 end)`,
          failed: sql`count(case when status = 'FAILED' then 1 end)`
        })
        .from(notificationOutbox)
        .where(sql`created_at > datetime('now', '-30 days')`)
        .groupBy(notificationOutbox.channel);

      res.json({
        ruleAnalytics: analytics,
        deliveryRates: deliveryRates.map(rate => ({
          ...rate,
          deliveryRate: rate.totalSent > 0 ? 
            (Number(rate.delivered) / Number(rate.totalSent)) * 100 : 0
        }))
      });
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      res.status(500).json({ error: 'Failed to fetch notification analytics' });
    }
  });

  // Trigger Manual Notifications
  app.post('/api/admin/trigger-notification', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const { ruleKey, serviceRequestId } = manualTriggerSchema.parse(req.body);
      
      // Get service request details
      const serviceRequest = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, serviceRequestId))
        .limit(1);

      if (serviceRequest.length === 0) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      // Trigger notification manually
      const rule = await db
        .select()
        .from(notificationRules)
        .where(eq(notificationRules.ruleKey, ruleKey))
        .limit(1);

      if (rule.length === 0) {
        return res.status(404).json({ error: 'Notification rule not found' });
      }

      // Process the notification
      await notificationEngine.executeScheduledRule(rule[0]);
      
      res.json({ message: 'Notification triggered successfully' });
      log.business('Manual notification triggered', {
        userId: req.user?.id,
        ruleKey,
        serviceRequestId,
      });
    } catch (error) {
      console.error('Error triggering manual notification:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to trigger notification' });
    }
  });

  // Test Notification Templates
  app.post('/api/admin/test-template', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const { templateKey, testData } = testTemplateSchema.parse(req.body);
      
      const template = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.templateKey, templateKey))
        .limit(1);

      if (template.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const templateData = template[0];
      
      // Render template with test data
      const subject = templateData.subject ? 
        notificationEngine.renderTemplate(templateData.subject, testData) : null;
      const body = notificationEngine.renderTemplate(templateData.body, testData);

      res.json({
        templateKey,
        channel: templateData.channel,
        renderedSubject: subject,
        renderedBody: body,
        testData
      });
      log.business('Notification template tested', { userId: req.user?.id, templateKey });
    } catch (error) {
      console.error('Error testing template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to test template' });
    }
  });

  // Service Status Change Events (for triggering notifications)
  app.post(
    '/api/service-requests/:id/status-change',
    requireAuth,
    requireMinRole('ops_executive'),
    async (req, res) => {
    try {
      const { fromStatus, toStatus } = statusChangeSchema.parse(req.body);
      const { id: serviceRequestId } = ruleIdSchema.parse(req.params);

      // Update service request status
      await db
        .update(serviceRequests)
        .set({ 
          status: toStatus,
          updatedAt: new Date().toISOString()
        })
        .where(eq(serviceRequests.id, serviceRequestId));

      // Trigger notification event
      notificationEngine.emitServiceStatusChanged(serviceRequestId, fromStatus, toStatus);

      res.json({ message: 'Status updated and notifications triggered' });
      log.business('Service status change notified', {
        userId: req.user?.id,
        serviceRequestId,
        fromStatus,
        toStatus,
      });
    } catch (error) {
      console.error('Error updating service status:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update service status' });
    }
  });

  // Document Rejection Events
  app.post('/api/documents/:id/reject', requireAuth, requireMinRole('ops_executive'), async (req, res) => {
    try {
      const { serviceRequestId, documentType, reason } = documentRejectSchema.parse(req.body);
      
      // Trigger document rejection notification
      notificationEngine.emitDocumentRejected(serviceRequestId, documentType, reason);

      res.json({ message: 'Document rejection notification triggered' });
      log.business('Document rejection notification triggered', {
        userId: req.user?.id,
        serviceRequestId,
        documentType,
      });
    } catch (error) {
      console.error('Error handling document rejection:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to handle document rejection' });
    }
  });

  // Reload Notification Engine
  app.post('/api/admin/reload-notification-engine', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      await notificationEngine.reloadRules();
      res.json({ message: 'Notification engine reloaded successfully' });
      log.business('Notification engine reloaded', { userId: req.user?.id });
    } catch (error) {
      console.error('Error reloading notification engine:', error);
      res.status(500).json({ error: 'Failed to reload notification engine' });
    }
  });

  // Get notification statistics
  app.get('/api/admin/notification-stats', requireAuth, requireMinRole('admin'), async (req, res) => {
    try {
      const stats = {
        activeRules: await db
          .select({ count: sql`count(*)` })
          .from(notificationRules)
          .where(eq(notificationRules.isEnabled, true)),
        
        queuedNotifications: await db
          .select({ count: sql`count(*)` })
          .from(notificationOutbox)
          .where(eq(notificationOutbox.status, 'QUEUED')),
          
        sentToday: await db
          .select({ count: sql`count(*)` })
          .from(notificationOutbox)
          .where(
            and(
              eq(notificationOutbox.status, 'SENT'),
              sql`date(created_at) = date('now')`
            )
          ),
          
        failedToday: await db
          .select({ count: sql`count(*)` })
          .from(notificationOutbox)
          .where(
            and(
              eq(notificationOutbox.status, 'FAILED'),
              sql`date(created_at) = date('now')`
            )
          )
      };

      res.json({
        activeRules: Number(stats.activeRules[0].count),
        queuedNotifications: Number(stats.queuedNotifications[0].count),
        sentToday: Number(stats.sentToday[0].count),
        failedToday: Number(stats.failedToday[0].count)
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      res.status(500).json({ error: 'Failed to fetch notification statistics' });
    }
  });

  console.log('✅ Notification routes registered');
}
