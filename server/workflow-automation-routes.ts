import type { Express } from "express";
import { db } from './db';
import { workflowAutomationRules, workflowAutomationHistory } from '@shared/schema';
import { and, desc, eq } from 'drizzle-orm';
import { triggerWorkflowAutomation } from './workflow-automation-engine';

// Workflow Automation Engine - No-code workflow triggers and actions
export function registerWorkflowAutomationRoutes(app: Express) {

  // Get all workflow automation rules
  app.get('/api/workflows/automation', async (req, res) => {
    try {
      const automations = await db
        .select()
        .from(workflowAutomationRules)
        .orderBy(desc(workflowAutomationRules.createdAt));

      res.json(automations);
    } catch (error) {
      console.error('Get automations error:', error);
      res.status(500).json({ error: 'Failed to fetch automations' });
    }
  });

  // Create new workflow automation
  app.post('/api/workflows/automation', async (req, res) => {
    try {
      const { name, trigger, conditions, actions, enabled } = req.body;

      // Validate automation rule
      if (!name || !trigger || !actions || actions.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const [created] = await db
        .insert(workflowAutomationRules)
        .values({
          name,
          trigger,
          conditions: conditions || [],
          actions,
          enabled: enabled !== false,
        })
        .returning();

      res.json({ message: 'Automation created', automation: created });
    } catch (error) {
      console.error('Create automation error:', error);
      res.status(500).json({ error: 'Failed to create automation' });
    }
  });

  // Trigger workflow manually (for testing)
  app.post('/api/workflows/trigger', async (req, res) => {
    try {
      const { trigger, entityId, entityType, data } = req.body;

      if (!trigger) {
        return res.status(400).json({ error: 'Trigger is required' });
      }

      const result = await triggerWorkflowAutomation({
        trigger,
        entityId: entityId ? Number(entityId) : null,
        entityType,
        data,
      });

      res.json({
        message: 'Workflow triggered successfully',
        ...result,
      });
    } catch (error) {
      console.error('Trigger workflow error:', error);
      res.status(500).json({ error: 'Failed to trigger workflow' });
    }
  });

  // Get workflow execution history
  app.get('/api/workflows/history', async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const history = await db
        .select()
        .from(workflowAutomationHistory)
        .orderBy(desc(workflowAutomationHistory.executedAt))
        .limit(Math.min(100, Math.max(1, parseInt(limit as string))));

      res.json(history);
    } catch (error) {
      console.error('Get workflow history error:', error);
      res.status(500).json({ error: 'Failed to fetch workflow history' });
    }
  });

  // Update automation status (enable/disable)
  app.patch('/api/workflows/automation/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      const [updated] = await db
        .update(workflowAutomationRules)
        .set({ enabled: enabled !== false, updatedAt: new Date() })
        .where(eq(workflowAutomationRules.id, parseInt(id)))
        .returning();

      res.json({ message: 'Automation updated', automation: updated });
    } catch (error) {
      console.error('Update automation error:', error);
      res.status(500).json({ error: 'Failed to update automation' });
    }
  });

  // Register duplicate routes at /api/v1 paths for backward compatibility
  app.get('/api/v1/workflows/automation', async (req, res) => {
    const automations = await db
      .select()
      .from(workflowAutomationRules)
      .orderBy(desc(workflowAutomationRules.createdAt));
    res.json(automations);
  });

  app.get('/api/v1/workflows/history', async (req, res) => {
    const history = await db
      .select()
      .from(workflowAutomationHistory)
      .orderBy(desc(workflowAutomationHistory.executedAt))
      .limit(50);
    res.json(history);
  });

  app.post('/api/v1/workflows/automation', async (req, res) => {
    const { name, trigger, actions, enabled } = req.body;
    const [created] = await db
      .insert(workflowAutomationRules)
      .values({
        name,
        trigger,
        actions,
        enabled: enabled !== false,
        conditions: []
      })
      .returning();
    res.json({ message: 'Automation created', automation: created });
  });

  app.patch('/api/v1/workflows/automation/:id', async (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body;
    const [updated] = await db
      .update(workflowAutomationRules)
      .set({ enabled: enabled !== false, updatedAt: new Date() })
      .where(eq(workflowAutomationRules.id, parseInt(id)))
      .returning();
    res.json({ message: 'Automation updated', automation: updated });
  });

  console.log('✅ Workflow Automation routes registered');
}
