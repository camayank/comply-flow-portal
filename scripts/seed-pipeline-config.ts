import { db } from '../server/db';
import { pipelineAutomationConfig } from '@shared/pipeline-schema';

const DEFAULT_CONFIG = [
  // Zone A: Sales
  { serviceCode: '*', eventType: 'lead.created', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.assigned', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.qualified', automationLevel: 'GATED', gateApproverRole: 'sales_manager' },
  { serviceCode: '*', eventType: 'lead.proposal_sent', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.proposal_approved', automationLevel: 'GATED', gateApproverRole: 'admin' },
  { serviceCode: '*', eventType: 'lead.converted', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.lost', automationLevel: 'AUTO' },
  // Zone B: Execution
  { serviceCode: '*', eventType: 'service.created', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.payment_pending', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.payment_received', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.docs_uploaded', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.docs_verified', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.task_completed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.qc_submitted', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.qc_approved', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.qc_rejected', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.delivered', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.confirmed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.sla_warning', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.sla_breached', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.escalated', automationLevel: 'MANUAL' },
  { serviceCode: '*', eventType: 'service.cancelled', automationLevel: 'AUTO' },
  // Zone C: Finance
  { serviceCode: '*', eventType: 'finance.invoice_created', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.invoice_sent', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.payment_received', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.commission_calculated', automationLevel: 'GATED', gateApproverRole: 'finance' },
  { serviceCode: '*', eventType: 'finance.commission_approved', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.commission_paid', automationLevel: 'AUTO' },
  // Zone D: Compliance
  { serviceCode: '*', eventType: 'compliance.entity_initialized', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.deadline_approaching', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.deadline_overdue', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.action_completed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.state_changed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.renewal_due', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.gap_detected', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.portal_synced', automationLevel: 'MANUAL' },
];

async function seed() {
  for (const config of DEFAULT_CONFIG) {
    await db.insert(pipelineAutomationConfig).values({
      serviceCode: config.serviceCode,
      eventType: config.eventType,
      automationLevel: config.automationLevel,
      gateApproverRole: config.gateApproverRole || null,
    }).onConflictDoNothing();
  }
  console.log(`Seeded ${DEFAULT_CONFIG.length} automation config entries`);
}

seed().catch(console.error);
