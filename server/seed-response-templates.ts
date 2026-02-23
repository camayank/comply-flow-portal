/**
 * Seed Response Templates for Customer Service
 * Run with: npx tsx server/seed-response-templates.ts
 */

import { db } from './db';
import { responseTemplates } from '@shared/schema';

const templates = [
  {
    name: 'Welcome Message',
    category: 'greeting',
    subject: 'Welcome to DigiComply!',
    content: `Dear {{client_name}},

Thank you for reaching out to DigiComply. We're here to help you with your compliance needs.

I've reviewed your inquiry and will assist you further. Please let me know if you have any additional questions.

Best regards,
{{agent_name}}
Customer Success Team`,
    placeholders: ['client_name', 'agent_name'],
    tags: ['welcome', 'greeting', 'intro'],
    isActive: true,
    usageCount: 0,
  },
  {
    name: 'Document Request',
    category: 'document',
    subject: 'Documents Required for Your Service Request',
    content: `Dear {{client_name}},

To proceed with your {{service_name}} request, we need the following documents:

{{document_list}}

Please upload these documents through your portal or reply to this email with the attachments.

If you have any questions about the required documents, feel free to reach out.

Best regards,
{{agent_name}}
Customer Success Team`,
    placeholders: ['client_name', 'service_name', 'document_list', 'agent_name'],
    tags: ['documents', 'request', 'requirements'],
    isActive: true,
    usageCount: 0,
  },
  {
    name: 'Service Update',
    category: 'update',
    subject: 'Update on Your {{service_name}} Request',
    content: `Dear {{client_name}},

I wanted to provide you with an update on your {{service_name}} request.

Current Status: {{status}}
Progress: {{progress}}%

{{additional_notes}}

If you have any questions, please don't hesitate to reach out.

Best regards,
{{agent_name}}
Customer Success Team`,
    placeholders: ['client_name', 'service_name', 'status', 'progress', 'additional_notes', 'agent_name'],
    tags: ['update', 'status', 'progress'],
    isActive: true,
    usageCount: 0,
  },
  {
    name: 'Service Completion',
    category: 'completion',
    subject: 'Your {{service_name}} Has Been Completed!',
    content: `Dear {{client_name}},

Great news! Your {{service_name}} request has been completed successfully.

Here are the details:
- Service: {{service_name}}
- Completion Date: {{completion_date}}
- Reference Number: {{reference_number}}

You can download your documents from your portal or find them attached to this email.

Thank you for choosing DigiComply. We're here for any future compliance needs.

Best regards,
{{agent_name}}
Customer Success Team`,
    placeholders: ['client_name', 'service_name', 'completion_date', 'reference_number', 'agent_name'],
    tags: ['completion', 'success', 'delivery'],
    isActive: true,
    usageCount: 0,
  },
  {
    name: 'Delay Notification',
    category: 'delay',
    subject: 'Important Update: Delay in Your {{service_name}} Request',
    content: `Dear {{client_name}},

We wanted to inform you about a delay in processing your {{service_name}} request.

Reason for Delay: {{delay_reason}}
New Expected Completion: {{new_date}}

We apologize for any inconvenience this may cause. Our team is working diligently to complete your request as soon as possible.

If you have any concerns, please reach out.

Best regards,
{{agent_name}}
Customer Success Team`,
    placeholders: ['client_name', 'service_name', 'delay_reason', 'new_date', 'agent_name'],
    tags: ['delay', 'notification', 'update'],
    isActive: true,
    usageCount: 0,
  },
  {
    name: 'Payment Reminder',
    category: 'payment',
    subject: 'Payment Reminder for {{service_name}}',
    content: `Dear {{client_name}},

This is a friendly reminder about the pending payment for your {{service_name}} service.

Amount Due: {{amount}}
Due Date: {{due_date}}

You can make the payment through your portal or using the following payment link:
{{payment_link}}

If you've already made the payment, please disregard this message.

Best regards,
{{agent_name}}
Accounts Team`,
    placeholders: ['client_name', 'service_name', 'amount', 'due_date', 'payment_link', 'agent_name'],
    tags: ['payment', 'reminder', 'billing'],
    isActive: true,
    usageCount: 0,
  },
  {
    name: 'Issue Resolution',
    category: 'support',
    subject: 'Your Issue Has Been Resolved',
    content: `Dear {{client_name}},

I'm pleased to inform you that the issue you reported has been resolved.

Issue: {{issue_description}}
Resolution: {{resolution_details}}

If you experience any further issues or have questions, please don't hesitate to reach out.

Thank you for your patience.

Best regards,
{{agent_name}}
Customer Success Team`,
    placeholders: ['client_name', 'issue_description', 'resolution_details', 'agent_name'],
    tags: ['support', 'resolution', 'issue'],
    isActive: true,
    usageCount: 0,
  },
  {
    name: 'Follow-up Request',
    category: 'followup',
    subject: 'Following Up on Your {{service_name}} Request',
    content: `Dear {{client_name}},

I'm following up on your {{service_name}} request. We noticed that some information is still pending from your end.

Pending Items:
{{pending_items}}

Please provide the above at your earliest convenience so we can proceed with your request.

Best regards,
{{agent_name}}
Customer Success Team`,
    placeholders: ['client_name', 'service_name', 'pending_items', 'agent_name'],
    tags: ['followup', 'pending', 'request'],
    isActive: true,
    usageCount: 0,
  },
];

async function seedResponseTemplates() {
  console.log('🌱 Seeding response templates...');

  try {
    // Check if templates already exist
    const existing = await db.select().from(responseTemplates).limit(1);

    if (existing.length > 0) {
      console.log('⚠️  Response templates already exist. Skipping seed.');
      return;
    }

    // Insert templates
    for (const template of templates) {
      await db.insert(responseTemplates).values({
        ...template,
        createdBy: 1, // Admin user
      });
      console.log(`  ✓ Added template: ${template.name}`);
    }

    console.log(`✅ Successfully seeded ${templates.length} response templates`);
  } catch (error) {
    console.error('❌ Error seeding response templates:', error);
    throw error;
  }
}

// Run if executed directly
seedResponseTemplates()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

export { seedResponseTemplates };
