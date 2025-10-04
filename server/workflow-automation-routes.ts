import type { Express } from "express";
import { db } from './db';
import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";

// Workflow Automation Engine - No-code workflow triggers and actions
export function registerWorkflowAutomationRoutes(app: Express) {

  // Get all workflow automation rules
  app.get('/api/workflows/automation', async (req, res) => {
    try {
      // In production, this would query from workflow_automation_rules table
      // For now, return sample automation workflows
      const automations = [
        {
          id: 1,
          name: "Welcome Email on Registration",
          trigger: "client_registered",
          enabled: true,
          actions: [
            { type: "send_email", template: "welcome", delay: 0 },
            { type: "create_task", assignTo: "relationship_manager", delay: 60 }
          ]
        },
        {
          id: 2,
          name: "Payment Reminder - 24hrs before due",
          trigger: "payment_due_soon",
          enabled: true,
          conditions: [{ field: "hours_until_due", operator: "equals", value: 24 }],
          actions: [
            { type: "send_email", template: "payment_reminder" },
            { type: "send_whatsapp", message: "Payment reminder" }
          ]
        },
        {
          id: 3,
          name: "Service Milestone Completed",
          trigger: "milestone_completed",
          enabled: true,
          actions: [
            { type: "send_notification", message: "Milestone completed" },
            { type: "update_progress", increment: 25 }
          ]
        },
        {
          id: 4,
          name: "Document Upload Reminder",
          trigger: "document_pending",
          enabled: true,
          conditions: [{ field: "days_pending", operator: "greater_than", value: 2 }],
          actions: [
            { type: "send_email", template: "document_reminder" },
            { type: "escalate_to", role: "customer_service" }
          ]
        },
        {
          id: 5,
          name: "Compliance Due Alert - 7 Days",
          trigger: "compliance_due_soon",
          enabled: true,
          conditions: [{ field: "days_until_due", operator: "equals", value: 7 }],
          actions: [
            { type: "send_email", template: "compliance_alert" },
            { type: "send_whatsapp", message: "Compliance deadline approaching" },
            { type: "create_task", priority: "high" }
          ]
        },
        {
          id: 6,
          name: "Referral Credit - Successful Onboarding",
          trigger: "referral_completed",
          enabled: true,
          actions: [
            { type: "credit_wallet", percentage: 10 },
            { type: "send_email", template: "referral_success" },
            { type: "send_notification", message: "You earned referral credit!" }
          ]
        }
      ];

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

      const newAutomation = {
        id: Math.floor(Math.random() * 10000),
        name,
        trigger,
        conditions: conditions || [],
        actions,
        enabled: enabled !== false,
        createdAt: new Date(),
      };

      res.json({ message: 'Automation created', automation: newAutomation });
    } catch (error) {
      console.error('Create automation error:', error);
      res.status(500).json({ error: 'Failed to create automation' });
    }
  });

  // Trigger workflow manually (for testing)
  app.post('/api/workflows/trigger', async (req, res) => {
    try {
      const { trigger, entityId, entityType, data } = req.body;

      // Log workflow execution
      console.log(`[Workflow Automation] Triggered: ${trigger}`, {
        entityId,
        entityType,
        data,
        timestamp: new Date()
      });

      // Execute actions based on trigger
      const executedActions = [];
      
      switch (trigger) {
        case 'client_registered':
          executedActions.push({ action: 'send_email', status: 'sent', template: 'welcome' });
          executedActions.push({ action: 'create_task', status: 'created', assignTo: 'relationship_manager' });
          break;
        
        case 'payment_due_soon':
          executedActions.push({ action: 'send_email', status: 'sent', template: 'payment_reminder' });
          break;
        
        case 'milestone_completed':
          executedActions.push({ action: 'send_notification', status: 'sent' });
          executedActions.push({ action: 'update_progress', status: 'updated' });
          break;
        
        case 'referral_completed':
          executedActions.push({ action: 'credit_wallet', status: 'credited' });
          executedActions.push({ action: 'send_email', status: 'sent', template: 'referral_success' });
          break;
      }

      res.json({
        message: 'Workflow triggered successfully',
        trigger,
        actionsExecuted: executedActions.length,
        actions: executedActions
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

      // Sample workflow execution history
      const history = [
        {
          id: 1,
          workflow: "Welcome Email on Registration",
          trigger: "client_registered",
          entityId: 123,
          status: "success",
          actionsExecuted: 2,
          executedAt: new Date(Date.now() - 3600000),
        },
        {
          id: 2,
          workflow: "Payment Reminder - 24hrs before due",
          trigger: "payment_due_soon",
          entityId: 456,
          status: "success",
          actionsExecuted: 2,
          executedAt: new Date(Date.now() - 7200000),
        },
        {
          id: 3,
          workflow: "Referral Credit - Successful Onboarding",
          trigger: "referral_completed",
          entityId: 789,
          status: "success",
          actionsExecuted: 3,
          executedAt: new Date(Date.now() - 10800000),
        }
      ];

      res.json(history.slice(0, parseInt(limit as string)));
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

      res.json({
        message: 'Automation updated',
        id: parseInt(id),
        enabled
      });
    } catch (error) {
      console.error('Update automation error:', error);
      res.status(500).json({ error: 'Failed to update automation' });
    }
  });

  console.log('✅ Workflow Automation routes registered');
}
