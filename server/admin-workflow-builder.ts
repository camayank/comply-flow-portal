import { db } from './db';
import { 
  serviceRequests
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// No-Code Admin Workflow Builder for Universal Service Provider Platform
export class AdminWorkflowBuilder {
  constructor() {
    console.log('🔧 Admin Workflow Builder initialized');
  }

  // Create a new service template with workflow steps
  async createServiceTemplate(templateData: {
    serviceKey: string;
    name: string;
    description: string;
    periodicity: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
    periodRule?: any;
    dependencies?: string[];
    workflow: Array<{
      stepKey: string;
      name: string;
      description: string;
      clientTasks?: string[];
      opsChecklist?: string[];
      slaDays: number;
      qaRequired: boolean;
      requiredDocuments?: string[];
      deliverables?: string[];
    }>;
    notifications?: any;
  }) {
    try {
      // Create workflow template
      const [template] = await db
        .insert(workflowTemplates)
        .values({
          templateName: templateData.name,
          serviceCode: templateData.serviceKey,
          workflowSteps: JSON.stringify(templateData.workflow),
          version: 1,
          isActive: true,
          globalTemplate: true,
          customForms: JSON.stringify([]),
          approvalNodes: JSON.stringify(this.generateApprovalNodes(templateData.workflow)),
          escalationRules: JSON.stringify(this.generateEscalationRules(templateData.workflow)),
          createdBy: 1 // Admin user
        })
        .returning();

      // Create individual workflow steps
      for (let index = 0; index < templateData.workflow.length; index++) {
        const step = templateData.workflow[index];
        await db.insert(workflowSteps).values({
          templateId: template.id,
          stepKey: step.stepKey,
          stepName: step.name,
          stepOrder: index + 1,
          stepType: step.qaRequired ? 'QA_REVIEW' : 'STANDARD',
          assigneeRole: this.determineAssigneeRole(step),
          estimatedHours: step.slaDays * 8, // Convert days to hours
          dependsOn: index > 0 ? templateData.workflow[index - 1].stepKey : null,
          isClientVisible: step.clientTasks && step.clientTasks.length > 0,
          autoAdvance: !step.qaRequired,
          configJson: JSON.stringify({
            clientTasks: step.clientTasks || [],
            opsChecklist: step.opsChecklist || [],
            requiredDocuments: step.requiredDocuments || [],
            deliverables: step.deliverables || [],
            slaDays: step.slaDays
          })
        });
      }

      // Create associated notification rules
      if (templateData.notifications) {
        await this.createNotificationRulesForTemplate(templateData.serviceKey, templateData.notifications);
      }

      console.log(`✅ Created service template: ${templateData.name}`);
      return template;
    } catch (error) {
      console.error('❌ Error creating service template:', error);
      throw error;
    }
  }

  // Update existing template and apply to in-flight orders
  async updateServiceTemplate(templateId: number, updates: any, applyToInFlight: boolean = false) {
    try {
      const [updatedTemplate] = await db
        .update(workflowTemplates)
        .set({
          ...updates,
          version: sql`version + 1`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(workflowTemplates.id, templateId))
        .returning();

      if (applyToInFlight) {
        await this.applyTemplateUpdatesToInFlight(templateId, updates);
      }

      console.log(`✅ Updated service template ID: ${templateId}`);
      return updatedTemplate;
    } catch (error) {
      console.error('❌ Error updating service template:', error);
      throw error;
    }
  }

  // Apply template changes to in-flight service orders
  private async applyTemplateUpdatesToInFlight(templateId: number, updates: any) {
    try {
      // Get template details
      const template = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, templateId))
        .limit(1);

      if (template.length === 0) return;

      // Find all active service orders using this template
      const activeOrders = await db
        .select()
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.serviceType, template[0].serviceCode),
            sql`status NOT IN ('COMPLETED', 'CANCELLED')`
          )
        );

      console.log(`🔄 Applying template updates to ${activeOrders.length} in-flight orders`);

      for (const order of activeOrders) {
        // Update workflow execution if exists
        const execution = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.serviceRequestId, order.id))
          .limit(1);

        if (execution.length > 0) {
          // Merge new steps without disrupting completed ones
          const currentSteps = JSON.parse(execution[0].stepsJson || '[]');
          const newSteps = JSON.parse(updates.workflowSteps || '[]');
          
          const mergedSteps = this.mergeWorkflowSteps(currentSteps, newSteps);

          await db
            .update(workflowExecutions)
            .set({
              stepsJson: JSON.stringify(mergedSteps),
              updatedAt: new Date().toISOString()
            })
            .where(eq(workflowExecutions.id, execution[0].id));
        }
      }

      console.log(`✅ Applied template updates to ${activeOrders.length} orders`);
    } catch (error) {
      console.error('❌ Error applying template updates to in-flight orders:', error);
    }
  }

  // Merge workflow steps without disrupting completed ones
  private mergeWorkflowSteps(currentSteps: any[], newSteps: any[]): any[] {
    const merged = [...currentSteps];

    for (const newStep of newSteps) {
      const existingIndex = merged.findIndex(s => s.stepKey === newStep.stepKey);
      
      if (existingIndex >= 0) {
        // Update existing step only if not completed
        if (merged[existingIndex].status !== 'COMPLETED') {
          merged[existingIndex] = { ...merged[existingIndex], ...newStep };
        }
      } else {
        // Add new step
        merged.push({
          ...newStep,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        });
      }
    }

    return merged;
  }

  // Create notification rules for a service template
  private async createNotificationRulesForTemplate(serviceKey: string, notifications: any) {
    try {
      const rules = [];

      // Create schedule-based reminders
      if (notifications.schedules) {
        for (const schedule of notifications.schedules) {
          const rule = await notificationEngine.createRule({
            ruleKey: `${serviceKey}_${schedule.type}_reminder`,
            name: `${serviceKey} ${schedule.type} Reminder`,
            type: 'SCHEDULE',
            scopeJson: JSON.stringify({ serviceType: serviceKey }),
            scheduleJson: JSON.stringify(schedule.cron),
            filtersJson: JSON.stringify(schedule.filters || []),
            channelsJson: JSON.stringify(schedule.channels || ['EMAIL']),
            templateKey: schedule.template,
            dedupeWindowMins: schedule.dedupeWindowMins || 120,
            isEnabled: true
          });
          rules.push(rule);
        }
      }

      // Create event-based notifications
      if (notifications.events) {
        for (const [event, config] of Object.entries(notifications.events)) {
          const rule = await notificationEngine.createRule({
            ruleKey: `${serviceKey}_${event}_notify`,
            name: `${serviceKey} ${event} Notification`,
            type: 'EVENT',
            scopeJson: JSON.stringify({ serviceType: serviceKey }),
            logicJson: JSON.stringify({ eventType: event, ...config }),
            channelsJson: JSON.stringify(config.channels || ['EMAIL']),
            templateKey: config.template || `${serviceKey.toUpperCase()}_${event.toUpperCase()}`,
            dedupeWindowMins: config.dedupeWindowMins || 15,
            isEnabled: true
          });
          rules.push(rule);
        }
      }

      console.log(`✅ Created ${rules.length} notification rules for ${serviceKey}`);
      return rules;
    } catch (error) {
      console.error('❌ Error creating notification rules:', error);
      throw error;
    }
  }

  // Generate approval nodes based on workflow steps
  private generateApprovalNodes(workflow: any[]): any[] {
    return workflow
      .filter(step => step.qaRequired)
      .map((step, index) => ({
        nodeId: `qa_${step.stepKey}`,
        stepKey: step.stepKey,
        approverRole: 'QA_REVIEWER',
        approvalType: 'MANDATORY',
        order: index + 1,
        criteria: {
          checklistComplete: true,
          documentsApproved: true,
          clientSignOff: step.clientTasks && step.clientTasks.length > 0
        }
      }));
  }

  // Generate escalation rules based on SLA days
  private generateEscalationRules(workflow: any[]): any[] {
    return workflow.map(step => ({
      stepKey: step.stepKey,
      warningThresholdHours: (step.slaDays * 8) * 0.75, // 75% of SLA
      escalationThresholdHours: step.slaDays * 8,
      escalationChain: [
        { level: 1, role: 'OPS_LEAD', delayHours: 4 },
        { level: 2, role: 'ADMIN', delayHours: 8 }
      ],
      notificationChannels: ['EMAIL', 'WHATSAPP']
    }));
  }

  // Determine assignee role based on step characteristics
  private determineAssigneeRole(step: any): string {
    if (step.qaRequired) return 'QA_REVIEWER';
    if (step.clientTasks && step.clientTasks.length > 0) return 'CLIENT';
    return 'OPS_EXECUTIVE';
  }

  // Get template preview with impact analysis
  async getTemplateImpactPreview(templateId: number, proposedChanges: any) {
    try {
      const template = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, templateId))
        .limit(1);

      if (template.length === 0) {
        throw new Error('Template not found');
      }

      // Count affected in-flight orders
      const affectedOrders = await db
        .select({ count: sql`count(*)` })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.serviceType, template[0].serviceCode),
            sql`status NOT IN ('COMPLETED', 'CANCELLED')`
          )
        );

      // Analyze step-level impact
      const currentSteps = JSON.parse(template[0].workflowSteps);
      const proposedSteps = proposedChanges.workflowSteps ? 
        JSON.parse(proposedChanges.workflowSteps) : currentSteps;

      const stepImpact = this.analyzeStepImpact(currentSteps, proposedSteps);

      return {
        templateName: template[0].templateName,
        affectedOrdersCount: affectedOrders[0].count,
        stepImpact,
        riskLevel: this.calculateRiskLevel(stepImpact, affectedOrders[0].count),
        recommendations: this.generateRecommendations(stepImpact)
      };
    } catch (error) {
      console.error('❌ Error getting template impact preview:', error);
      throw error;
    }
  }

  // Analyze impact of step changes
  private analyzeStepImpact(currentSteps: any[], proposedSteps: any[]) {
    const impact = {
      added: [],
      modified: [],
      removed: [],
      reordered: []
    };

    // Find added steps
    proposedSteps.forEach(proposedStep => {
      if (!currentSteps.find(s => s.stepKey === proposedStep.stepKey)) {
        impact.added.push(proposedStep);
      }
    });

    // Find removed steps
    currentSteps.forEach(currentStep => {
      if (!proposedSteps.find(s => s.stepKey === currentStep.stepKey)) {
        impact.removed.push(currentStep);
      }
    });

    // Find modified steps
    proposedSteps.forEach((proposedStep, index) => {
      const currentStep = currentSteps.find(s => s.stepKey === proposedStep.stepKey);
      if (currentStep) {
        const changes = this.getStepChanges(currentStep, proposedStep);
        if (Object.keys(changes).length > 0) {
          impact.modified.push({
            stepKey: proposedStep.stepKey,
            changes
          });
        }

        // Check for reordering
        const currentIndex = currentSteps.findIndex(s => s.stepKey === proposedStep.stepKey);
        if (currentIndex !== index) {
          impact.reordered.push({
            stepKey: proposedStep.stepKey,
            fromPosition: currentIndex + 1,
            toPosition: index + 1
          });
        }
      }
    });

    return impact;
  }

  // Get specific changes between step versions
  private getStepChanges(currentStep: any, proposedStep: any): any {
    const changes = {};
    
    if (currentStep.slaDays !== proposedStep.slaDays) {
      changes.slaDays = { from: currentStep.slaDays, to: proposedStep.slaDays };
    }
    
    if (currentStep.qaRequired !== proposedStep.qaRequired) {
      changes.qaRequired = { from: currentStep.qaRequired, to: proposedStep.qaRequired };
    }

    if (JSON.stringify(currentStep.opsChecklist) !== JSON.stringify(proposedStep.opsChecklist)) {
      changes.opsChecklist = { 
        from: currentStep.opsChecklist, 
        to: proposedStep.opsChecklist 
      };
    }

    return changes;
  }

  // Calculate risk level for template changes
  private calculateRiskLevel(stepImpact: any, affectedOrdersCount: number): string {
    let riskScore = 0;

    // Risk factors
    riskScore += stepImpact.removed.length * 10; // Removing steps is high risk
    riskScore += stepImpact.added.length * 3; // Adding steps is medium risk
    riskScore += stepImpact.modified.length * 5; // Modifying steps is medium-high risk
    riskScore += stepImpact.reordered.length * 7; // Reordering is high risk

    // Scale by affected orders
    riskScore *= Math.log10(affectedOrdersCount + 1);

    if (riskScore < 10) return 'LOW';
    if (riskScore < 30) return 'MEDIUM';
    return 'HIGH';
  }

  // Generate recommendations based on impact analysis
  private generateRecommendations(stepImpact: any): string[] {
    const recommendations = [];

    if (stepImpact.removed.length > 0) {
      recommendations.push('⚠️ Removing steps may disrupt in-flight orders. Consider deprecating instead.');
    }

    if (stepImpact.reordered.length > 0) {
      recommendations.push('🔄 Step reordering detected. Verify dependencies are maintained.');
    }

    if (stepImpact.modified.some(m => m.changes.slaDays)) {
      recommendations.push('⏰ SLA changes detected. Review with operations team before applying.');
    }

    if (stepImpact.added.length > 2) {
      recommendations.push('📈 Multiple new steps added. Consider phased rollout.');
    }

    return recommendations;
  }

  // Clone template for customization
  async cloneTemplate(sourceTemplateId: number, newName: string, customizations: any = {}) {
    try {
      const sourceTemplate = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, sourceTemplateId))
        .limit(1);

      if (sourceTemplate.length === 0) {
        throw new Error('Source template not found');
      }

      const source = sourceTemplate[0];
      const clonedTemplate = await db
        .insert(workflowTemplates)
        .values({
          templateName: newName,
          serviceCode: customizations.serviceCode || `${source.serviceCode}_custom`,
          workflowSteps: JSON.stringify({
            ...JSON.parse(source.workflowSteps),
            ...customizations.workflowSteps
          }),
          version: 1,
          isActive: true,
          globalTemplate: false,
          customForms: JSON.stringify({
            ...JSON.parse(source.customForms || '[]'),
            ...customizations.customForms
          }),
          approvalNodes: source.approvalNodes,
          escalationRules: source.escalationRules,
          createdBy: customizations.createdBy || 1
        })
        .returning();

      console.log(`✅ Cloned template: ${newName}`);
      return clonedTemplate[0];
    } catch (error) {
      console.error('❌ Error cloning template:', error);
      throw error;
    }
  }

  // Get comprehensive workflow analytics
  async getWorkflowAnalytics(serviceCode?: string) {
    try {
      let query = db
        .select({
          template: workflowTemplates,
          totalOrders: sql`count(distinct sr.id)`,
          completedOrders: sql`count(distinct case when sr.status = 'COMPLETED' then sr.id end)`,
          avgCompletionDays: sql`avg(julianday(sr.completed_at) - julianday(sr.created_at))`,
          slaBreaches: sql`count(distinct case when sr.sla_status = 'BREACHED' then sr.id end)`
        })
        .from(workflowTemplates)
        .leftJoin(serviceRequests, eq(serviceRequests.serviceType, workflowTemplates.serviceCode))
        .groupBy(workflowTemplates.id);

      if (serviceCode) {
        query = query.where(eq(workflowTemplates.serviceCode, serviceCode));
      }

      const analytics = await query;

      return analytics.map(row => ({
        templateName: row.template.templateName,
        serviceCode: row.template.serviceCode,
        version: row.template.version,
        totalOrders: Number(row.totalOrders),
        completedOrders: Number(row.completedOrders),
        completionRate: Number(row.totalOrders) > 0 ? 
          (Number(row.completedOrders) / Number(row.totalOrders)) * 100 : 0,
        avgCompletionDays: Number(row.avgCompletionDays) || 0,
        slaBreaches: Number(row.slaBreaches),
        isActive: row.template.isActive
      }));
    } catch (error) {
      console.error('❌ Error getting workflow analytics:', error);
      throw error;
    }
  }
}

// Global admin workflow builder instance
export const adminWorkflowBuilder = new AdminWorkflowBuilder();