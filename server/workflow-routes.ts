import type { Express } from "express";
import { db } from './db';
import { 
  serviceRequests
} from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

export function registerWorkflowRoutes(app: Express) {
  
  // Workflow Templates Management
  app.get('/api/admin/workflow-templates', async (req, res) => {
    try {
      const templates = await db
        .select()
        .from(workflowTemplates)
        .orderBy(desc(workflowTemplates.createdAt));
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      res.status(500).json({ error: 'Failed to fetch workflow templates' });
    }
  });

  app.get('/api/admin/workflow-templates/:id', async (req, res) => {
    try {
      const template = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, parseInt(req.params.id)))
        .limit(1);

      if (template.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Get associated workflow steps
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.templateId, parseInt(req.params.id)))
        .orderBy(workflowSteps.stepOrder);

      res.json({
        template: template[0],
        steps: steps
      });
    } catch (error) {
      console.error('Error fetching workflow template:', error);
      res.status(500).json({ error: 'Failed to fetch workflow template' });
    }
  });

  app.post('/api/admin/workflow-templates', async (req, res) => {
    try {
      const template = await adminWorkflowBuilder.createServiceTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error('Error creating workflow template:', error);
      res.status(500).json({ error: 'Failed to create workflow template' });
    }
  });

  app.put('/api/admin/workflow-templates/:id', async (req, res) => {
    try {
      const { applyToInFlight = false, ...updates } = req.body;
      
      const template = await adminWorkflowBuilder.updateServiceTemplate(
        parseInt(req.params.id),
        updates,
        applyToInFlight
      );
      
      res.json(template);
    } catch (error) {
      console.error('Error updating workflow template:', error);
      res.status(500).json({ error: 'Failed to update workflow template' });
    }
  });

  app.delete('/api/admin/workflow-templates/:id', async (req, res) => {
    try {
      await db
        .update(workflowTemplates)
        .set({ 
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(workflowTemplates.id, parseInt(req.params.id)));
      
      res.json({ message: 'Workflow template deactivated successfully' });
    } catch (error) {
      console.error('Error deactivating workflow template:', error);
      res.status(500).json({ error: 'Failed to deactivate workflow template' });
    }
  });

  // Template Impact Analysis
  app.post('/api/admin/workflow-templates/:id/impact-preview', async (req, res) => {
    try {
      const impact = await adminWorkflowBuilder.getTemplateImpactPreview(
        parseInt(req.params.id),
        req.body
      );
      
      res.json(impact);
    } catch (error) {
      console.error('Error getting template impact preview:', error);
      res.status(500).json({ error: 'Failed to get template impact preview' });
    }
  });

  // Clone Template
  app.post('/api/admin/workflow-templates/:id/clone', async (req, res) => {
    try {
      const { newName, customizations = {} } = req.body;
      
      const clonedTemplate = await adminWorkflowBuilder.cloneTemplate(
        parseInt(req.params.id),
        newName,
        customizations
      );
      
      res.json(clonedTemplate);
    } catch (error) {
      console.error('Error cloning workflow template:', error);
      res.status(500).json({ error: 'Failed to clone workflow template' });
    }
  });

  // Workflow Analytics
  app.get('/api/admin/workflow-analytics', async (req, res) => {
    try {
      const { serviceCode } = req.query;
      
      const analytics = await adminWorkflowBuilder.getWorkflowAnalytics(
        serviceCode as string
      );
      
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching workflow analytics:', error);
      res.status(500).json({ error: 'Failed to fetch workflow analytics' });
    }
  });

  // Workflow Execution Management
  app.get('/api/workflow-executions', async (req, res) => {
    try {
      const { serviceRequestId, status } = req.query;
      
      let query = db
        .select({
          execution: workflowExecutions,
          serviceRequest: serviceRequests
        })
        .from(workflowExecutions)
        .leftJoin(serviceRequests, eq(workflowExecutions.serviceRequestId, serviceRequests.id))
        .orderBy(desc(workflowExecutions.createdAt));

      if (serviceRequestId) {
        query = query.where(eq(workflowExecutions.serviceRequestId, parseInt(serviceRequestId as string)));
      }

      if (status) {
        query = query.where(eq(workflowExecutions.status, status as string));
      }

      const executions = await query;
      res.json(executions);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      res.status(500).json({ error: 'Failed to fetch workflow executions' });
    }
  });

  app.get('/api/workflow-executions/:id', async (req, res) => {
    try {
      const execution = await db
        .select({
          execution: workflowExecutions,
          serviceRequest: serviceRequests,
          template: workflowTemplates
        })
        .from(workflowExecutions)
        .leftJoin(serviceRequests, eq(workflowExecutions.serviceRequestId, serviceRequests.id))
        .leftJoin(workflowTemplates, eq(workflowExecutions.templateId, workflowTemplates.id))
        .where(eq(workflowExecutions.id, parseInt(req.params.id)))
        .limit(1);

      if (execution.length === 0) {
        return res.status(404).json({ error: 'Workflow execution not found' });
      }

      res.json(execution[0]);
    } catch (error) {
      console.error('Error fetching workflow execution:', error);
      res.status(500).json({ error: 'Failed to fetch workflow execution' });
    }
  });

  // Update workflow execution step
  app.put('/api/workflow-executions/:id/steps/:stepKey', async (req, res) => {
    try {
      const { status, assigneeId, notes, completedAt } = req.body;
      const executionId = parseInt(req.params.id);
      const stepKey = req.params.stepKey;

      // Get current execution
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, executionId))
        .limit(1);

      if (!execution) {
        return res.status(404).json({ error: 'Workflow execution not found' });
      }

      // Update step in the steps JSON
      const steps = JSON.parse(execution.stepsJson || '[]');
      const stepIndex = steps.findIndex((s: any) => s.stepKey === stepKey);

      if (stepIndex === -1) {
        return res.status(404).json({ error: 'Step not found' });
      }

      steps[stepIndex] = {
        ...steps[stepIndex],
        status,
        assigneeId,
        notes,
        completedAt: completedAt || (status === 'COMPLETED' ? new Date().toISOString() : null),
        updatedAt: new Date().toISOString()
      };

      // Update execution
      await db
        .update(workflowExecutions)
        .set({
          stepsJson: JSON.stringify(steps),
          currentStep: status === 'COMPLETED' ? this.getNextStep(steps, stepKey) : stepKey,
          status: this.calculateExecutionStatus(steps),
          updatedAt: new Date().toISOString()
        })
        .where(eq(workflowExecutions.id, executionId));

      res.json({ message: 'Workflow step updated successfully' });
    } catch (error) {
      console.error('Error updating workflow step:', error);
      res.status(500).json({ error: 'Failed to update workflow step' });
    }
  });

  // Service Template Categories
  app.get('/api/admin/service-categories', async (req, res) => {
    try {
      const categories = [
        {
          key: 'incorporation',
          name: 'Incorporation & Setup',
          description: 'Company formation and initial compliance',
          services: ['incorporation', 'post_incorporation', 'gst_registration']
        },
        {
          key: 'periodic_compliance',
          name: 'Periodic Compliance',
          description: 'Regular filings and compliance requirements',
          services: ['gst_returns', 'tds_quarterly', 'pf_esi_monthly', 'quarterly_statutory_generic']
        },
        {
          key: 'accounting_financial',
          name: 'Accounting & Financial',
          description: 'Bookkeeping and financial statement preparation',
          services: ['accounting_monthly', 'bs_pl_annual']
        },
        {
          key: 'annual_compliance',
          name: 'Annual Compliance',
          description: 'Annual filings and compliance requirements',
          services: ['annual_filings_roc', 'itr_annual']
        }
      ];

      // Get template counts for each category
      for (const category of categories) {
        const templates = await db
          .select({ count: sql`count(*)` })
          .from(workflowTemplates)
          .where(sql`service_code IN (${category.services.map(() => '?').join(',')})`, category.services);
        
        category.templateCount = Number(templates[0].count);
      }

      res.json(categories);
    } catch (error) {
      console.error('Error fetching service categories:', error);
      res.status(500).json({ error: 'Failed to fetch service categories' });
    }
  });

  // Workflow Health Dashboard
  app.get('/api/admin/workflow-health', async (req, res) => {
    try {
      const health = {
        totalTemplates: await db
          .select({ count: sql`count(*)` })
          .from(workflowTemplates)
          .where(eq(workflowTemplates.isActive, true)),
        
        activeExecutions: await db
          .select({ count: sql`count(*)` })
          .from(workflowExecutions)
          .where(sql`status IN ('RUNNING', 'WAITING')`),
        
        completedThisMonth: await db
          .select({ count: sql`count(*)` })
          .from(workflowExecutions)
          .where(sql`status = 'COMPLETED' AND date(completed_at) >= date('now', 'start of month')`),
        
        averageCompletionTime: await db
          .select({
            avgDays: sql`avg(julianday(completed_at) - julianday(started_at))`
          })
          .from(workflowExecutions)
          .where(sql`status = 'COMPLETED' AND completed_at IS NOT NULL`),
        
        topBottlenecks: await db
          .select({
            templateName: workflowTemplates.templateName,
            avgStepTime: sql`avg(julianday(we.updated_at) - julianday(we.started_at))`,
            executionCount: sql`count(*)`
          })
          .from(workflowExecutions)
          .leftJoin(workflowTemplates, eq(workflowExecutions.templateId, workflowTemplates.id))
          .where(sql`we.status = 'RUNNING'`)
          .groupBy(workflowTemplates.id, workflowTemplates.templateName)
          .orderBy(sql`avg(julianday(we.updated_at) - julianday(we.started_at)) DESC`)
          .limit(5)
      };

      res.json({
        totalTemplates: Number(health.totalTemplates[0].count),
        activeExecutions: Number(health.activeExecutions[0].count),
        completedThisMonth: Number(health.completedThisMonth[0].count),
        averageCompletionDays: Number(health.averageCompletionTime[0]?.avgDays || 0),
        topBottlenecks: health.topBottlenecks.map(b => ({
          templateName: b.templateName,
          avgStepDays: Number(b.avgStepTime),
          executionCount: Number(b.executionCount)
        }))
      });
    } catch (error) {
      console.error('Error fetching workflow health:', error);
      res.status(500).json({ error: 'Failed to fetch workflow health data' });
    }
  });

  console.log('✅ Workflow routes registered');

  // Helper functions
  function getNextStep(steps: any[], currentStepKey: string): string | null {
    const currentIndex = steps.findIndex(s => s.stepKey === currentStepKey);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      return steps[currentIndex + 1].stepKey;
    }
    return null;
  }

  function calculateExecutionStatus(steps: any[]): string {
    const completedSteps = steps.filter(s => s.status === 'COMPLETED').length;
    const totalSteps = steps.length;
    
    if (completedSteps === totalSteps) return 'COMPLETED';
    if (completedSteps === 0) return 'PENDING';
    if (steps.some(s => s.status === 'BLOCKED')) return 'BLOCKED';
    return 'RUNNING';
  }
}