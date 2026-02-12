import { db } from '../server/db';
import { workflowAutomationRules } from '../shared/schema';

const DEFAULT_RULES = [
  {
    name: 'GST Due Reminder (T-7)',
    trigger: 'compliance_due_soon',
    conditions: [
      { field: 'ruleCode', op: 'starts_with', value: 'GST_' },
      { field: 'daysUntilDue', op: 'lte', value: 7 },
    ],
    actions: [
      {
        type: 'send_email',
        subject: 'GST filing due on {{dueDate}}',
        message: 'Reminder: GST compliance for {{entityName}} is due on {{dueDate}}.',
      },
      {
        type: 'send_whatsapp',
        message: 'GST filing due for {{entityName}} on {{dueDate}}. Please review and confirm.',
      },
      {
        type: 'create_task',
        title: 'Prepare GST filing for {{entityName}}',
        description: 'AutoComply reminder: GST due on {{dueDate}}.',
        priority: 'high',
        assigneeRole: 'ops_executive',
        taskType: 'compliance',
        dueInDays: 3,
      },
    ],
    enabled: true,
  },
  {
    name: 'TDS Due Reminder (T-7)',
    trigger: 'compliance_due_soon',
    conditions: [
      { field: 'ruleCode', op: 'starts_with', value: 'TDS_' },
      { field: 'daysUntilDue', op: 'lte', value: 7 },
    ],
    actions: [
      {
        type: 'send_email',
        subject: 'TDS filing due on {{dueDate}}',
        message: 'Reminder: TDS compliance for {{entityName}} is due on {{dueDate}}.',
      },
      {
        type: 'create_task',
        title: 'Prepare TDS filing for {{entityName}}',
        description: 'AutoComply reminder: TDS due on {{dueDate}}.',
        priority: 'high',
        assigneeRole: 'ops_executive',
        taskType: 'compliance',
        dueInDays: 3,
      },
    ],
    enabled: true,
  },
  {
    name: 'ROC Annual Reminder (T-15)',
    trigger: 'compliance_due_soon',
    conditions: [
      { field: 'ruleCode', op: 'starts_with', value: 'ROC_' },
      { field: 'daysUntilDue', op: 'lte', value: 15 },
    ],
    actions: [
      {
        type: 'send_email',
        subject: 'ROC filing due on {{dueDate}}',
        message: 'Reminder: ROC compliance for {{entityName}} is due on {{dueDate}}.',
      },
      {
        type: 'create_task',
        title: 'Prepare ROC filing for {{entityName}}',
        description: 'AutoComply reminder: ROC due on {{dueDate}}.',
        priority: 'high',
        assigneeRole: 'ops_executive',
        taskType: 'compliance',
        dueInDays: 7,
      },
    ],
    enabled: true,
  },
  {
    name: 'Compliance Overdue Escalation',
    trigger: 'compliance_overdue',
    conditions: [],
    actions: [
      {
        type: 'escalate_to',
        title: 'Overdue compliance escalation for {{entityName}}',
        description: 'Compliance item is overdue. Immediate action required.',
        priority: 'urgent',
        assigneeRole: 'ops_executive',
        taskType: 'compliance',
        dueInDays: 1,
      },
      {
        type: 'send_notification',
        title: 'Compliance overdue',
        message: 'Compliance item for {{entityName}} is overdue. Escalation created.',
        priority: 'urgent',
        category: 'compliance',
      },
    ],
    enabled: true,
  },
];

async function run() {
  const existing = await db
    .select({ name: workflowAutomationRules.name })
    .from(workflowAutomationRules);

  const existingNames = new Set(existing.map((row) => row.name));
  const toInsert = DEFAULT_RULES.filter((rule) => !existingNames.has(rule.name));

  if (toInsert.length === 0) {
    console.log('✅ Workflow automation rules already seeded');
    return;
  }

  await db.insert(workflowAutomationRules).values(toInsert);
  console.log(`✅ Seeded ${toInsert.length} workflow automation rules`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Workflow automation seeding failed:', error);
    process.exit(1);
  });
