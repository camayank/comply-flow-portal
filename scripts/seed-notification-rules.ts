import { db } from '../server/db';
import { notificationRules, notificationTemplates } from '../shared/schema';

const templates = [
  {
    templateKey: 'GST_DUE_REMINDER',
    name: 'GST Due Reminder',
    channel: 'EMAIL',
    subject: 'GST filing due on {{dueDate}}',
    body: `Hello {{entityName}},

Your GST compliance is due on {{dueDate}}. Please review your checklist and confirm the filing.

Service: {{serviceName}}
Portal: {{portalDeepLink}}

DigiComply Team`,
    variables: JSON.stringify(['entityName', 'dueDate', 'serviceName', 'portalDeepLink'])
  },
  {
    templateKey: 'TDS_DUE_REMINDER',
    name: 'TDS Due Reminder',
    channel: 'EMAIL',
    subject: 'TDS filing due on {{dueDate}}',
    body: `Hello {{entityName}},

Your TDS compliance is due on {{dueDate}}. Please review and approve the filing steps.

Service: {{serviceName}}
Portal: {{portalDeepLink}}

DigiComply Team`,
    variables: JSON.stringify(['entityName', 'dueDate', 'serviceName', 'portalDeepLink'])
  },
  {
    templateKey: 'ROC_DUE_REMINDER',
    name: 'ROC Due Reminder',
    channel: 'EMAIL',
    subject: 'ROC filing due on {{dueDate}}',
    body: `Hello {{entityName}},

Your ROC filing is due on {{dueDate}}. Please review the required documents and confirm.

Service: {{serviceName}}
Portal: {{portalDeepLink}}

DigiComply Team`,
    variables: JSON.stringify(['entityName', 'dueDate', 'serviceName', 'portalDeepLink'])
  },
  {
    templateKey: 'PAYROLL_DUE_REMINDER',
    name: 'Payroll Compliance Reminder',
    channel: 'EMAIL',
    subject: 'Payroll compliance due on {{dueDate}}',
    body: `Hello {{entityName}},

Payroll compliance (PF/ESI/PT) is due on {{dueDate}}. Please confirm the payroll inputs.

Service: {{serviceName}}
Portal: {{portalDeepLink}}

DigiComply Team`,
    variables: JSON.stringify(['entityName', 'dueDate', 'serviceName', 'portalDeepLink'])
  },
  {
    templateKey: 'COMPLIANCE_OVERDUE_NOTICE',
    name: 'Compliance Overdue Notice',
    channel: 'EMAIL',
    subject: 'Overdue compliance item',
    body: `Hello {{entityName}},

One of your compliance items is overdue. Please take immediate action to avoid penalties.

Service: {{serviceName}}
Portal: {{portalDeepLink}}

DigiComply Team`,
    variables: JSON.stringify(['entityName', 'serviceName', 'portalDeepLink'])
  }
];

const rules = [
  {
    ruleKey: 'gst_due_reminder',
    name: 'GST Due Reminder',
    type: 'SCHEDULE',
    scopeJson: JSON.stringify({ serviceType: 'gst_returns' }),
    scheduleJson: JSON.stringify({ cron: '0 9 * * *', timezone: 'Asia/Kolkata' }),
    logicJson: JSON.stringify({ relativeDueDays: [7, 3, 1] }),
    filtersJson: JSON.stringify([
      { field: 'status', op: 'NOT_IN', value: ['completed', 'cancelled'] }
    ]),
    channelsJson: JSON.stringify(['EMAIL', 'WHATSAPP']),
    templateKey: 'GST_DUE_REMINDER',
    dedupeWindowMins: 720,
    respectQuietHours: true,
    isEnabled: true
  },
  {
    ruleKey: 'tds_due_reminder',
    name: 'TDS Due Reminder',
    type: 'SCHEDULE',
    scopeJson: JSON.stringify({ serviceType: 'tds_returns' }),
    scheduleJson: JSON.stringify({ cron: '0 9 * * *', timezone: 'Asia/Kolkata' }),
    logicJson: JSON.stringify({ relativeDueDays: [10, 5, 1] }),
    filtersJson: JSON.stringify([
      { field: 'status', op: 'NOT_IN', value: ['completed', 'cancelled'] }
    ]),
    channelsJson: JSON.stringify(['EMAIL']),
    templateKey: 'TDS_DUE_REMINDER',
    dedupeWindowMins: 720,
    respectQuietHours: true,
    isEnabled: true
  },
  {
    ruleKey: 'roc_due_reminder',
    name: 'ROC Due Reminder',
    type: 'SCHEDULE',
    scopeJson: JSON.stringify({ serviceType: 'roc_compliance' }),
    scheduleJson: JSON.stringify({ cron: '0 9 * * *', timezone: 'Asia/Kolkata' }),
    logicJson: JSON.stringify({ relativeDueDays: [30, 15, 7] }),
    filtersJson: JSON.stringify([
      { field: 'status', op: 'NOT_IN', value: ['completed', 'cancelled'] }
    ]),
    channelsJson: JSON.stringify(['EMAIL']),
    templateKey: 'ROC_DUE_REMINDER',
    dedupeWindowMins: 1440,
    respectQuietHours: true,
    isEnabled: true
  },
  {
    ruleKey: 'payroll_due_reminder',
    name: 'Payroll Compliance Reminder',
    type: 'SCHEDULE',
    scopeJson: JSON.stringify({ serviceType: 'payroll_compliance' }),
    scheduleJson: JSON.stringify({ cron: '0 9 * * *', timezone: 'Asia/Kolkata' }),
    logicJson: JSON.stringify({ relativeDueDays: [5, 2, 1] }),
    filtersJson: JSON.stringify([
      { field: 'status', op: 'NOT_IN', value: ['completed', 'cancelled'] }
    ]),
    channelsJson: JSON.stringify(['EMAIL']),
    templateKey: 'PAYROLL_DUE_REMINDER',
    dedupeWindowMins: 720,
    respectQuietHours: true,
    isEnabled: true
  },
  {
    ruleKey: 'compliance_overdue_notice',
    name: 'Compliance Overdue Notice',
    type: 'SCHEDULE',
    scopeJson: JSON.stringify({}),
    scheduleJson: JSON.stringify({ cron: '0 9 * * *', timezone: 'Asia/Kolkata' }),
    logicJson: JSON.stringify({ relativeDueDays: [0, -1, -3] }),
    filtersJson: JSON.stringify([
      { field: 'status', op: 'NOT_IN', value: ['completed', 'cancelled'] }
    ]),
    channelsJson: JSON.stringify(['EMAIL']),
    templateKey: 'COMPLIANCE_OVERDUE_NOTICE',
    dedupeWindowMins: 360,
    respectQuietHours: true,
    isEnabled: true
  }
];

async function run() {
  for (const template of templates) {
    await db.insert(notificationTemplates).values(template).onConflictDoNothing();
  }

  for (const rule of rules) {
    await db.insert(notificationRules).values(rule).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${templates.length} notification templates and ${rules.length} rules`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Notification rule seeding failed:', error);
    process.exit(1);
  });
