import type { Express } from "express";
import { db } from './db';
import { 
  serviceRequests,
  businessEntities
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export function registerNotificationRoutes(app: Express) {
  
  // Initialize/Seed Templates and Rules
  app.post('/api/admin/seed-templates', async (req, res) => {
    try {
      await serviceTemplateSeeder.seedAllTemplates();
      res.json({ message: 'All service templates seeded successfully' });
    } catch (error) {
      console.error('Error seeding templates:', error);
      res.status(500).json({ error: 'Failed to seed templates' });
    }
  });

  // Notification Rules Management
  app.get('/api/admin/notification-rules', async (req, res) => {
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

  app.post('/api/admin/notification-rules', async (req, res) => {
    try {
      const rule = await notificationEngine.createRule(req.body);
      res.json(rule);
    } catch (error) {
      console.error('Error creating notification rule:', error);
      res.status(500).json({ error: 'Failed to create notification rule' });
    }
  });

  app.put('/api/admin/notification-rules/:id', async (req, res) => {
    try {
      const rule = await notificationEngine.updateRule(
        parseInt(req.params.id), 
        req.body
      );
      res.json(rule);
    } catch (error) {
      console.error('Error updating notification rule:', error);
      res.status(500).json({ error: 'Failed to update notification rule' });
    }
  });

  app.delete('/api/admin/notification-rules/:id', async (req, res) => {
    try {
      await db
        .update(notificationRules)
        .set({ isEnabled: false })
        .where(eq(notificationRules.id, parseInt(req.params.id)));
      
      await notificationEngine.reloadRules();
      res.json({ message: 'Notification rule disabled successfully' });
    } catch (error) {
      console.error('Error disabling notification rule:', error);
      res.status(500).json({ error: 'Failed to disable notification rule' });
    }
  });

  // Notification Templates Management
  app.get('/api/admin/notification-templates', async (req, res) => {
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

  app.post('/api/admin/notification-templates', async (req, res) => {
    try {
      const [template] = await db
        .insert(notificationTemplates)
        .values(req.body)
        .returning();
      
      res.json(template);
    } catch (error) {
      console.error('Error creating notification template:', error);
      res.status(500).json({ error: 'Failed to create notification template' });
    }
  });

  app.put('/api/admin/notification-templates/:templateKey', async (req, res) => {
    try {
      const [template] = await db
        .update(notificationTemplates)
        .set({ ...req.body, updatedAt: new Date().toISOString() })
        .where(eq(notificationTemplates.templateKey, req.params.templateKey))
        .returning();
      
      res.json(template);
    } catch (error) {
      console.error('Error updating notification template:', error);
      res.status(500).json({ error: 'Failed to update notification template' });
    }
  });

  // Notification Outbox Monitoring
  app.get('/api/admin/notification-outbox', async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      
      let query = db
        .select({
          notification: notificationOutbox,
          entityName: businessEntities.name
        })
        .from(notificationOutbox)
        .leftJoin(businessEntities, eq(notificationOutbox.entityId, businessEntities.id))
        .orderBy(desc(notificationOutbox.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      if (status) {
        query = query.where(eq(notificationOutbox.status, status as string));
      }

      const notifications = await query;
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notification outbox:', error);
      res.status(500).json({ error: 'Failed to fetch notification outbox' });
    }
  });

  // Notification Analytics
  app.get('/api/admin/notification-analytics', async (req, res) => {
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
  app.post('/api/admin/trigger-notification', async (req, res) => {
    try {
      const { ruleKey, serviceRequestId, entityId } = req.body;
      
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
    } catch (error) {
      console.error('Error triggering manual notification:', error);
      res.status(500).json({ error: 'Failed to trigger notification' });
    }
  });

  // Test Notification Templates
  app.post('/api/admin/test-template', async (req, res) => {
    try {
      const { templateKey, testData } = req.body;
      
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
    } catch (error) {
      console.error('Error testing template:', error);
      res.status(500).json({ error: 'Failed to test template' });
    }
  });

  // Service Status Change Events (for triggering notifications)
  app.post('/api/service-requests/:id/status-change', async (req, res) => {
    try {
      const { fromStatus, toStatus } = req.body;
      const serviceRequestId = parseInt(req.params.id);

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
    } catch (error) {
      console.error('Error updating service status:', error);
      res.status(500).json({ error: 'Failed to update service status' });
    }
  });

  // Document Rejection Events
  app.post('/api/documents/:id/reject', async (req, res) => {
    try {
      const { serviceRequestId, documentType, reason } = req.body;
      
      // Trigger document rejection notification
      notificationEngine.emitDocumentRejected(serviceRequestId, documentType, reason);

      res.json({ message: 'Document rejection notification triggered' });
    } catch (error) {
      console.error('Error handling document rejection:', error);
      res.status(500).json({ error: 'Failed to handle document rejection' });
    }
  });

  // Reload Notification Engine
  app.post('/api/admin/reload-notification-engine', async (req, res) => {
    try {
      await notificationEngine.reloadRules();
      res.json({ message: 'Notification engine reloaded successfully' });
    } catch (error) {
      console.error('Error reloading notification engine:', error);
      res.status(500).json({ error: 'Failed to reload notification engine' });
    }
  });

  // Get notification statistics
  app.get('/api/admin/notification-stats', async (req, res) => {
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