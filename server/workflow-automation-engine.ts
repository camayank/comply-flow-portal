import nodemailer from 'nodemailer';
import { db } from './db';
import {
  workflowAutomationRules,
  workflowAutomationHistory,
  businessEntities,
  serviceRequests,
  users,
  complianceTracking,
  taskItems,
  notifications,
} from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import { sendWhatsApp } from './services/whatsappService';
import { generateTaskId } from './services/id-generator';

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

type AutomationContext = {
  entityType?: string;
  entityId?: number | null;
  data?: any;
  serviceRequest?: any;
  businessEntity?: any;
  user?: any;
  complianceItem?: any;
};

export type WorkflowTriggerRequest = {
  trigger: string;
  entityType?: string;
  entityId?: number | null;
  data?: any;
};

function getValueByPath(source: Record<string, any>, path: string) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), source);
}

function applyTemplate(template: string, variables: Record<string, any>) {
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
    const value = variables[key.trim()];
    return value === undefined || value === null ? '' : String(value);
  });
}

function evaluateConditions(conditions: any, context: Record<string, any>) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const field = condition.field || condition.key || condition.path;
    const op = (condition.op || condition.operator || 'eq').toLowerCase();
    const expected = condition.value;
    const actual = field ? getValueByPath(context, field) : undefined;

    switch (op) {
      case 'eq':
        return actual === expected;
      case 'neq':
        return actual !== expected;
      case 'gt':
        return Number(actual) > Number(expected);
      case 'gte':
        return Number(actual) >= Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'lte':
        return Number(actual) <= Number(expected);
      case 'in':
        return Array.isArray(expected) ? expected.includes(actual) : false;
      case 'contains':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.includes(expected)
          : Array.isArray(actual)
            ? actual.includes(expected)
            : false;
      case 'starts_with':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.startsWith(expected)
          : false;
      case 'ends_with':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.endsWith(expected)
          : false;
      default:
        return false;
    }
  });
}

async function resolveAutomationContext(entityType?: string, entityId?: number, data?: any): Promise<AutomationContext> {
  const context: AutomationContext = { entityType, entityId, data };

  const resolvedEntityType = entityType || data?.entityType;
  const resolvedEntityId = entityId || data?.entityId;

  if (data?.serviceRequestId && !context.serviceRequest) {
    const [serviceRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, Number(data.serviceRequestId)));
    context.serviceRequest = serviceRequest;
  }

  if (data?.businessEntityId && !context.businessEntity) {
    const [businessEntity] = await db
      .select()
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(data.businessEntityId)));
    context.businessEntity = businessEntity;
  }

  if (data?.userId && !context.user) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(data.userId)));
    context.user = user;
  }

  if (resolvedEntityType === 'service_request' && resolvedEntityId) {
    const [serviceRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, Number(resolvedEntityId)));
    context.serviceRequest = serviceRequest;
  }

  if (resolvedEntityType === 'business_entity' && resolvedEntityId) {
    const [businessEntity] = await db
      .select()
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(resolvedEntityId)));
    context.businessEntity = businessEntity;
  }

  if (resolvedEntityType === 'user' && resolvedEntityId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(resolvedEntityId)));
    context.user = user;
  }

  if (resolvedEntityType === 'compliance_tracking' && resolvedEntityId) {
    const [tracking] = await db
      .select()
      .from(complianceTracking)
      .where(eq(complianceTracking.id, Number(resolvedEntityId)));
    context.complianceItem = tracking;
    if (tracking?.businessEntityId && !context.businessEntity) {
      const [businessEntity] = await db
        .select()
        .from(businessEntities)
        .where(eq(businessEntities.id, tracking.businessEntityId));
      context.businessEntity = businessEntity;
    }
    if (tracking?.userId && !context.user) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, tracking.userId));
      context.user = user;
    }
  }

  if (context.serviceRequest && !context.businessEntity && context.serviceRequest.businessEntityId) {
    const [businessEntity] = await db
      .select()
      .from(businessEntities)
      .where(eq(businessEntities.id, context.serviceRequest.businessEntityId));
    context.businessEntity = businessEntity;
  }

  if (context.serviceRequest && !context.user && context.serviceRequest.userId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, context.serviceRequest.userId));
    context.user = user;
  }

  if (!context.user && context.businessEntity?.ownerId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, context.businessEntity.ownerId));
    context.user = user;
  }

  return context;
}

function buildVariableContext(context: AutomationContext) {
  return {
    ...(context.data || {}),
    entityName: context.businessEntity?.name,
    clientName: context.businessEntity?.name,
    dueDate: context.complianceItem?.dueDate || context.data?.dueDate,
    ruleCode: context.data?.ruleCode || context.complianceItem?.complianceRuleId,
    serviceRequestNumber: context.serviceRequest?.requestId,
    serviceRequestId: context.serviceRequest?.id,
  };
}

async function sendEmail(to: string, subject: string, body: string) {
  if (process.env.NOTIFICATION_EMAIL_ENABLED === 'false') {
    return { success: false, error: 'Email notifications disabled' };
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { success: false, error: 'SMTP not configured' };
  }
  const info = await emailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: body,
    html: body,
  });
  return { success: true, providerId: info.messageId };
}

async function executeAction(action: any, context: AutomationContext, trigger: string) {
  const type = String(action?.type || '').toLowerCase();
  const variables = buildVariableContext(context);

  if (type === 'send_email') {
    const recipient =
      action.to ||
      action.email ||
      context.data?.recipientEmail ||
      context.user?.email ||
      context.businessEntity?.contactEmail;

    if (!recipient) {
      return { success: false, error: 'Missing email recipient' };
    }

    const subject = applyTemplate(action.subject || `Compliance Update: ${trigger}`, variables);
    const message = applyTemplate(action.message || action.template || 'Compliance notification', variables);
    return sendEmail(recipient, subject, message);
  }

  if (type === 'send_whatsapp') {
    const recipient =
      action.to ||
      action.phone ||
      context.data?.recipientPhone ||
      context.user?.phone ||
      context.businessEntity?.contactPhone;

    if (!recipient) {
      return { success: false, error: 'Missing WhatsApp recipient' };
    }

    const message = applyTemplate(action.message || action.template || 'Compliance notification', variables);
    const success = await sendWhatsApp({ to: recipient, message });
    return success ? { success: true } : { success: false, error: 'WhatsApp send failed' };
  }

  if (type === 'create_task') {
    const taskNumber = await generateTaskId();
    const now = new Date();
    const dueDate = action.dueDate
      ? new Date(action.dueDate)
      : action.dueInDays
        ? new Date(now.getTime() + Number(action.dueInDays) * 24 * 60 * 60 * 1000)
        : null;

    const [task] = await db
      .insert(taskItems)
      .values({
        taskNumber,
        title: applyTemplate(action.title || `AutoComply: ${trigger}`, variables),
        description: applyTemplate(action.description || `Automated task from ${trigger}`, variables),
        taskType: action.taskType || 'compliance',
        initiatorId: action.initiatorId || context.data?.initiatorId || context.user?.id || 0,
        assigneeId: action.assigneeId || null,
        assigneeRole: action.assigneeRole || null,
        priority: action.priority || 'medium',
        dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
        businessEntityId: context.businessEntity?.id || null,
        serviceRequestId: context.serviceRequest?.id || null,
        metadata: { trigger, entityType: context.entityType, entityId: context.entityId, data: context.data },
      })
      .returning();

    return { success: true, taskId: task?.id };
  }

  if (type === 'send_notification' || type === 'create_notification') {
    const targetUserId = action.userId || context.data?.userId || context.user?.id;
    if (!targetUserId) {
      return { success: false, error: 'Missing notification userId' };
    }

    const [notification] = await db
      .insert(notifications)
      .values({
        userId: Number(targetUserId),
        title: applyTemplate(action.title || 'Compliance Notification', variables),
        message: applyTemplate(action.message || 'Compliance update available', variables),
        type: action.type || 'automation',
        category: action.category || 'compliance',
        priority: action.priority || 'normal',
        actionUrl: action.actionUrl,
        actionText: action.actionText,
        metadata: { trigger, data: context.data },
      })
      .returning();

    return { success: true, notificationId: notification?.id };
  }

  if (type === 'escalate_to') {
    const escalationTask = {
      type: 'create_task',
      title: action.title || `Escalation: ${trigger}`,
      description: action.description || action.message || `Escalation raised for ${trigger}`,
      priority: action.priority || 'urgent',
      assigneeRole: action.role || action.assigneeRole || 'ops_executive',
      taskType: action.taskType || 'compliance',
      dueInDays: action.dueInDays || 1,
    };
    return executeAction(escalationTask, context, trigger);
  }

  return { success: false, error: `Unknown action type: ${action?.type}` };
}

export async function triggerWorkflowAutomation(request: WorkflowTriggerRequest) {
  const { trigger, entityId, entityType, data } = request;
  if (!trigger) {
    return { trigger, actionsExecuted: 0, executions: [] };
  }

  const rules = await db
    .select()
    .from(workflowAutomationRules)
    .where(and(
      eq(workflowAutomationRules.trigger, trigger),
      eq(workflowAutomationRules.enabled, true)
    ));

  const context = await resolveAutomationContext(entityType, entityId || undefined, data);
  const evaluationContext = {
    ...(context.data || {}),
    entity: context.businessEntity,
    serviceRequest: context.serviceRequest,
    compliance: context.complianceItem,
    user: context.user,
    ...buildVariableContext(context),
  };

  const historyInserts = [];
  const executions: any[] = [];
  let totalExecuted = 0;

  for (const rule of rules) {
    const actions = Array.isArray(rule.actions) ? rule.actions : [];
    const conditionsMet = evaluateConditions(rule.conditions, evaluationContext);

    if (!conditionsMet) {
      historyInserts.push({
        workflowRuleId: rule.id,
        workflowName: rule.name,
        trigger,
        entityId: entityId ? Number(entityId) : null,
        status: 'skipped',
        actionsExecuted: 0,
        details: { entityType, data, reason: 'conditions_not_met' },
      });
      executions.push({ ruleId: rule.id, ruleName: rule.name, status: 'skipped', actions: [] });
      continue;
    }

    const actionResults = [];
    let successCount = 0;

    for (const action of actions) {
      try {
        const result = await executeAction(action, context, trigger);
        if (result?.success) {
          successCount += 1;
        }
        actionResults.push({ action, ...result });
      } catch (actionError: any) {
        actionResults.push({ action, success: false, error: actionError?.message || 'Action failed' });
      }
    }

    const status =
      successCount === actions.length
        ? 'success'
        : successCount > 0
          ? 'partial'
          : 'failed';

    totalExecuted += successCount;

    historyInserts.push({
      workflowRuleId: rule.id,
      workflowName: rule.name,
      trigger,
      entityId: entityId ? Number(entityId) : null,
      status,
      actionsExecuted: successCount,
      details: { entityType, data, actions: actionResults },
    });

    executions.push({ ruleId: rule.id, ruleName: rule.name, status, actions: actionResults });
  }

  if (historyInserts.length > 0) {
    await db.insert(workflowAutomationHistory).values(historyInserts);
  }

  return {
    trigger,
    actionsExecuted: totalExecuted,
    executions,
  };
}
