import { db } from './db';
import { 
  servicesCatalog,
  workflowTemplatesAdmin,
  serviceDocTypes,
  dueDateMaster,
  notificationTemplates
} from '@shared/schema';
import { SERVICE_CATALOG } from './service-catalog-data';

// Comprehensive Service Configuration Seeder
export class ServiceSeeder {
  
  async seedAllServices() {
    console.log('🌱 Seeding comprehensive service configuration...');
    
    await this.seedServicesCatalog();
    await this.seedWorkflowTemplates();
    await this.seedDocumentTypes();
    await this.seedDueDateRules();
    await this.seedNotificationTemplates();
    
    console.log('✅ All service configurations seeded successfully');
  }

  async seedServicesCatalog() {
    const services = SERVICE_CATALOG;



    for (const service of services) {
      try {
        await db.insert(servicesCatalog).values(service).onConflictDoNothing();
      } catch (error) {
        console.log(`Service ${service.serviceKey} already exists`);
      }
    }
    
    console.log(`✅ Seeded ${services.length} services in catalog`);
  }

  async seedWorkflowTemplates() {
    const templates = [
      {
        serviceKey: 'gst_returns',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'data_collection',
              name: 'Data Collection & Validation',
              description: 'Collect and validate sales/purchase data',
              estimatedDays: 2,
              assigneeRole: 'OPS_EXECUTIVE',
              clientTasks: ['Upload Sales Register (CSV)', 'Upload Purchase Register (CSV)', 'Provide bank statements'],
              opsChecklist: ['Validate CSV format', 'Check data completeness', 'Verify GSTIN details'],
              requiredDocuments: ['sales_register', 'purchase_register', 'bank_statements'],
              qaRequired: false
            },
            {
              stepKey: 'reconciliation',
              name: 'Data Reconciliation',
              description: 'Reconcile data with GSTR-2B and prepare working papers',
              estimatedDays: 2,
              assigneeRole: 'OPS_EXECUTIVE',
              opsChecklist: ['Download GSTR-2B', 'Reconcile ITC', 'Prepare mismatch report', 'Calculate liability'],
              qaRequired: true,
              deliverables: ['reconciliation_report', 'liability_computation']
            },
            {
              stepKey: 'client_approval',
              name: 'Client Review & Approval',
              description: 'Client review of prepared returns',
              estimatedDays: 1,
              assigneeRole: 'CLIENT',
              clientTasks: ['Review return summary', 'Approve filing', 'Authorize payment'],
              deliverables: ['return_summary']
            },
            {
              stepKey: 'filing',
              name: 'Return Filing',
              description: 'File returns on GST portal',
              estimatedDays: 1,
              assigneeRole: 'OPS_EXECUTIVE',
              opsChecklist: ['File GSTR-3B', 'File GSTR-1', 'Generate acknowledgments', 'Process payment'],
              deliverables: ['gstr3b_ack', 'gstr1_ack', 'payment_receipt']
            }
          ],
          slaPolicy: {
            totalDays: 6,
            escalationThresholds: [4, 5],
            priorityMultiplier: { HIGH: 0.8, MEDIUM: 1.0, LOW: 1.2 }
          },
          dependencies: ['gst_registration'],
          automationRules: [
            { trigger: 'step_completed', step: 'filing', action: 'notify_client' },
            { trigger: 'sla_breach', action: 'escalate_to_lead' }
          ]
        }
      },
      {
        serviceKey: 'incorporation',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'name_approval',
              name: 'Company Name Approval',
              description: 'Submit name application and obtain approval',
              estimatedDays: 3,
              assigneeRole: 'OPS_EXECUTIVE',
              clientTasks: ['Provide 3 preferred names', 'Submit director details'],
              opsChecklist: ['Check name availability', 'Submit RUN application', 'Track approval'],
              requiredDocuments: ['director_pan', 'address_proof']
            },
            {
              stepKey: 'documentation',
              name: 'MoA & AoA Preparation',
              description: 'Prepare incorporation documents',
              estimatedDays: 2,
              assigneeRole: 'OPS_EXECUTIVE',
              qaRequired: true,
              opsChecklist: ['Draft MoA/AoA', 'Customize for business', 'Client review'],
              deliverables: ['moa_draft', 'aoa_draft']
            },
            {
              stepKey: 'filing',
              name: 'Incorporation Filing',
              description: 'Submit incorporation application',
              estimatedDays: 2,
              assigneeRole: 'OPS_EXECUTIVE',
              opsChecklist: ['Prepare SPICe+ form', 'Upload documents', 'Submit application'],
              deliverables: ['spice_receipt']
            },
            {
              stepKey: 'completion',
              name: 'Certificate & Compliance Setup',
              description: 'Obtain certificate and setup compliance',
              estimatedDays: 7,
              assigneeRole: 'OPS_EXECUTIVE',
              opsChecklist: ['Download COI', 'Generate PAN/TAN', 'Setup registers'],
              deliverables: ['certificate_of_incorporation', 'company_pan', 'statutory_registers']
            }
          ],
          slaPolicy: {
            totalDays: 14,
            escalationThresholds: [10, 12],
            priorityMultiplier: { HIGH: 0.8, MEDIUM: 1.0, LOW: 1.2 }
          }
        }
      },
      {
        serviceKey: 'tds_quarterly',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'data_compilation',
              name: 'TDS Data Compilation',
              description: 'Compile quarterly TDS data',
              estimatedDays: 3,
              assigneeRole: 'OPS_EXECUTIVE',
              clientTasks: ['Provide payroll data', 'Submit vendor payments', 'Confirm TDS rates'],
              opsChecklist: ['Extract payment data', 'Apply TDS rates', 'Calculate liability'],
              requiredDocuments: ['payroll_register', 'vendor_payments']
            },
            {
              stepKey: 'payment_processing',
              name: 'TDS Payment & Challans',
              description: 'Process TDS payments',
              estimatedDays: 2,
              assigneeRole: 'OPS_EXECUTIVE',
              opsChecklist: ['Generate challans', 'Process payments', 'Download receipts'],
              deliverables: ['tds_challans', 'payment_receipts']
            },
            {
              stepKey: 'return_filing',
              name: 'TDS Return Filing',
              description: 'File quarterly TDS returns',
              estimatedDays: 2,
              assigneeRole: 'OPS_EXECUTIVE',
              opsChecklist: ['Prepare return files', 'Upload to portal', 'File returns'],
              deliverables: ['tds_return_acks']
            },
            {
              stepKey: 'certificates',
              name: 'TDS Certificate Generation',
              description: 'Generate and distribute certificates',
              estimatedDays: 3,
              assigneeRole: 'OPS_EXECUTIVE',
              opsChecklist: ['Generate Form 16/16A', 'Quality check', 'Distribute certificates'],
              deliverables: ['form_16', 'form_16a']
            }
          ],
          slaPolicy: {
            totalDays: 10,
            escalationThresholds: [7, 9]
          }
        }
      }
    ];

    const templateMap = new Map(
      templates.map(template => [template.serviceKey, template.templateJson])
    );

    const allTemplates = SERVICE_CATALOG.map(service => ({
      serviceKey: service.serviceKey,
      templateJson: templateMap.get(service.serviceKey) ?? this.buildDefaultWorkflowTemplate(service)
    }));

    for (const template of allTemplates) {
      try {
        await db.insert(workflowTemplatesAdmin).values({
          serviceKey: template.serviceKey,
          version: 1,
          templateJson: JSON.stringify(template.templateJson),
          isPublished: true,
          createdBy: 'system'
        }).onConflictDoNothing();
      } catch (error) {
        console.log(`Template for ${template.serviceKey} already exists`);
      }
    }

    console.log(`✅ Seeded ${allTemplates.length} workflow templates`);
  }

  private buildDefaultWorkflowTemplate(service: { serviceKey: string; name: string; periodicity: string; description: string }) {
    const estimatedDays = this.estimateSlaDays(service.periodicity);

    return {
      version: 1,
      steps: [
        {
          stepKey: 'intake',
          name: 'Requirement Intake',
          description: `Collect inputs and documents for ${service.name}`,
          estimatedDays: Math.max(1, Math.round(estimatedDays * 0.3)),
          assigneeRole: 'CLIENT',
          clientTasks: ['Share required details', 'Upload supporting documents'],
          opsChecklist: ['Validate inputs', 'Confirm scope with client'],
          qaRequired: false
        },
        {
          stepKey: 'execution',
          name: 'Service Execution',
          description: `Execute ${service.name} workflow`,
          estimatedDays: Math.max(1, Math.round(estimatedDays * 0.4)),
          assigneeRole: 'OPS_EXECUTIVE',
          opsChecklist: ['Prepare working papers', 'Complete filing or submission'],
          qaRequired: true
        },
        {
          stepKey: 'review',
          name: 'Quality Review',
          description: 'Perform QA review and validations',
          estimatedDays: Math.max(1, Math.round(estimatedDays * 0.2)),
          assigneeRole: 'QA_REVIEWER',
          opsChecklist: ['Review outputs', 'Verify compliance requirements'],
          qaRequired: true
        },
        {
          stepKey: 'delivery',
          name: 'Client Delivery',
          description: 'Deliver outputs and close the service request',
          estimatedDays: Math.max(1, Math.round(estimatedDays * 0.1)),
          assigneeRole: 'OPS_EXECUTIVE',
          deliverables: ['final_report', 'acknowledgment'],
          qaRequired: false
        }
      ],
      slaPolicy: {
        totalDays: estimatedDays,
        escalationThresholds: [Math.max(1, estimatedDays - 2), Math.max(1, estimatedDays - 1)]
      },
      metadata: {
        description: service.description,
        periodicity: service.periodicity
      }
    };
  }

  private estimateSlaDays(periodicity: string) {
    switch (periodicity) {
      case 'MONTHLY':
        return 5;
      case 'QUARTERLY':
        return 7;
      case 'ANNUAL':
        return 10;
      case 'ONGOING':
        return 3;
      case 'ONE_TIME':
      default:
        return 6;
    }
  }

  async seedDocumentTypes() {
    const docTypes = [
      // GST Returns Documents
      { serviceKey: 'gst_returns', doctype: 'sales_register', label: 'Sales Register (CSV)', stepKey: 'data_collection', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_returns', doctype: 'purchase_register', label: 'Purchase Register (CSV)', stepKey: 'data_collection', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_returns', doctype: 'bank_statements', label: 'Bank Statements', stepKey: 'data_collection', clientUploads: true, mandatory: false },
      { serviceKey: 'gst_returns', doctype: 'gstr3b_ack', label: 'GSTR-3B Acknowledgment', stepKey: 'filing', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_returns', doctype: 'gstr1_ack', label: 'GSTR-1 Acknowledgment', stepKey: 'filing', isDeliverable: true, clientUploads: false },

      // Incorporation Documents
      { serviceKey: 'incorporation', doctype: 'director_pan', label: 'Director PAN Cards', stepKey: 'name_approval', clientUploads: true, mandatory: true },
      { serviceKey: 'incorporation', doctype: 'address_proof', label: 'Address Proof Documents', stepKey: 'name_approval', clientUploads: true, mandatory: true },
      { serviceKey: 'incorporation', doctype: 'certificate_of_incorporation', label: 'Certificate of Incorporation', stepKey: 'completion', isDeliverable: true },
      { serviceKey: 'incorporation', doctype: 'company_pan', label: 'Company PAN Card', stepKey: 'completion', isDeliverable: true },
      { serviceKey: 'incorporation', doctype: 'moa_aoa', label: 'MoA & AoA (Final)', stepKey: 'completion', isDeliverable: true },

      // TDS Documents
      { serviceKey: 'tds_quarterly', doctype: 'payroll_register', label: 'Payroll Register', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'tds_quarterly', doctype: 'vendor_payments', label: 'Vendor Payment Details', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'tds_quarterly', doctype: 'form_16', label: 'Form 16 (Salary TDS)', stepKey: 'certificates', isDeliverable: true },
      { serviceKey: 'tds_quarterly', doctype: 'form_16a', label: 'Form 16A (Other TDS)', stepKey: 'certificates', isDeliverable: true },

      // Accounting Documents
      { serviceKey: 'accounting_monthly', doctype: 'bank_statements', label: 'Bank Statements', stepKey: 'data_import', clientUploads: true, mandatory: true },
      { serviceKey: 'accounting_monthly', doctype: 'purchase_invoices', label: 'Purchase Invoices', stepKey: 'data_import', clientUploads: true, mandatory: false },
      { serviceKey: 'accounting_monthly', doctype: 'trial_balance', label: 'Trial Balance', stepKey: 'reporting', isDeliverable: true },
      { serviceKey: 'accounting_monthly', doctype: 'monthly_pl', label: 'Monthly P&L Statement', stepKey: 'reporting', isDeliverable: true },

      // Annual Filings Documents
      { serviceKey: 'annual_filings_roc', doctype: 'audited_financials', label: 'Audited Financial Statements', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'annual_filings_roc', doctype: 'board_resolutions', label: 'Board Resolutions', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'annual_filings_roc', doctype: 'aoc4_receipt', label: 'AOC-4 Filing Receipt', stepKey: 'filing', isDeliverable: true },
      { serviceKey: 'annual_filings_roc', doctype: 'mgt7_receipt', label: 'MGT-7 Filing Receipt', stepKey: 'filing', isDeliverable: true }
    ];

    for (const docType of docTypes) {
      try {
        await db.insert(serviceDocTypes).values(docType).onConflictDoNothing();
      } catch (error) {
        console.log(`Doc type ${docType.doctype} for ${docType.serviceKey} already exists`);
      }
    }

    console.log(`✅ Seeded ${docTypes.length} document types`);
  }

  async seedDueDateRules() {
    const dueDateRules = [
      {
        serviceKey: 'gst_returns',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'MONTHLY',
          dueDayOfMonth: 20,
          nudges: { tMinus: [7, 3, 1], fixedDays: [1, 2] }
        },
        effectiveFrom: '2025-01-01'
      },
      {
        serviceKey: 'gst_returns_qrmp',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'QUARTERLY',
          dueDayOfQuarter: 22,
          nudges: { tMinus: [10, 5, 2] }
        },
        effectiveFrom: '2025-01-01'
      },
      {
        serviceKey: 'tds_quarterly',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'QUARTERLY',
          quarterDue: { 
            'Q1': '07-31', // Apr-Jun filed by Jul 31
            'Q2': '10-31', // Jul-Sep filed by Oct 31  
            'Q3': '01-31', // Oct-Dec filed by Jan 31
            'Q4': '05-31'  // Jan-Mar filed by May 31
          },
          nudges: { tMinus: [10, 5, 1] }
        },
        effectiveFrom: '2025-01-01'
      },
      {
        serviceKey: 'annual_filings_roc',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'ANNUAL',
          fallbackDue: '09-30', // Sep 30 for most annual filings
          nudges: { tMinus: [30, 7, 1] }
        },
        effectiveFrom: '2025-01-01'
      },
      {
        serviceKey: 'itr_annual',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'ANNUAL',
          fallbackDue: '07-31', // Jul 31 for ITR filing
          nudges: { tMinus: [30, 15, 7, 1] }
        },
        effectiveFrom: '2025-01-01'
      },
      {
        serviceKey: 'bs_pl_annual',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'ANNUAL',
          basedOnFSApproval: true,
          fallbackDue: '09-30',
          nudges: { tMinus: [30, 7, 1] }
        },
        effectiveFrom: '2025-01-01'
      },
      {
        serviceKey: 'accounting_monthly',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'MONTHLY',
          dueDayOfMonth: 10, // Monthly books closure by 10th
          nudges: { tMinus: [3, 1], fixedDays: [5] }
        },
        effectiveFrom: '2025-01-01'
      },
      {
        serviceKey: 'pf_esi_monthly',
        jurisdiction: 'IN',
        ruleJson: {
          periodicity: 'MONTHLY',
          dueDayOfMonth: 15, // PF/ESI due by 15th
          nudges: { tMinus: [5, 3, 1], fixedDays: [1, 2] }
        },
        effectiveFrom: '2025-01-01'
      }
    ];

    for (const rule of dueDateRules) {
      try {
        await db.insert(dueDateMaster).values({
          serviceKey: rule.serviceKey,
          jurisdiction: rule.jurisdiction,
          ruleJson: JSON.stringify(rule.ruleJson),
          effectiveFrom: new Date(rule.effectiveFrom).toISOString()
        }).onConflictDoNothing();
      } catch (error) {
        console.log(`Due date rule for ${rule.serviceKey} already exists`);
      }
    }

    console.log(`✅ Seeded ${dueDateRules.length} due date rules`);
  }

  async seedNotificationTemplates() {
    const templates = [
      {
        templateKey: 'SERVICE_CREATED',
        name: 'Service Order Created',
        channel: 'EMAIL',
        subject: 'New Service Order Created - {{serviceName}} ({{periodLabel}})',
        body: `Hello {{clientName}},

A new service order has been created for {{entityName}}:

Service: {{serviceName}}
Period: {{periodLabel}}
Due Date: {{dueDate}}
Priority: {{priority}}

Next Steps: {{nextSteps}}

Track progress: {{portalLink}}

Best regards,
DigiComply Team`,
        variables: JSON.stringify(['clientName', 'entityName', 'serviceName', 'periodLabel', 'dueDate', 'priority', 'nextSteps', 'portalLink'])
      },
      {
        templateKey: 'STEP_COMPLETED',
        name: 'Workflow Step Completed',
        channel: 'EMAIL',
        subject: 'Step Completed - {{stepName}} for {{serviceName}}',
        body: `Hello {{clientName}},

Great progress! We've completed the following step:

Service: {{serviceName}} ({{periodLabel}})
Completed Step: {{stepName}}
Next Step: {{nextStepName}}

{{#deliverables}}
Available Deliverables:
{{#each deliverables}}
- {{this}}
{{/each}}
{{/deliverables}}

View details: {{portalLink}}

Best regards,
DigiComply Team`,
        variables: JSON.stringify(['clientName', 'serviceName', 'periodLabel', 'stepName', 'nextStepName', 'deliverables', 'portalLink'])
      },
      {
        templateKey: 'CLIENT_ACTION_REQUIRED',
        name: 'Client Action Required',
        channel: 'EMAIL',
        subject: 'Action Required - {{serviceName}} ({{periodLabel}})',
        body: `Hello {{clientName}},

Your action is required to proceed with {{serviceName}} for {{periodLabel}}.

Required Actions:
{{#each requiredActions}}
- {{this}}
{{/each}}

Due Date: {{dueDate}}
Time Remaining: {{timeRemaining}}

Complete actions here: {{portalLink}}

Best regards,
DigiComply Team`,
        variables: JSON.stringify(['clientName', 'serviceName', 'periodLabel', 'requiredActions', 'dueDate', 'timeRemaining', 'portalLink'])
      },
      {
        templateKey: 'DOCUMENT_REJECTED',
        name: 'Document Rejection Notice',
        channel: 'EMAIL',
        subject: 'Document Rejected - {{documentName}}',
        body: `Hello {{clientName}},

The document "{{documentName}}" has been rejected for {{serviceName}} ({{periodLabel}}).

Rejection Reason: {{rejectionReason}}

Please review the feedback and re-upload the corrected document.

Re-upload here: {{portalLink}}

Best regards,
DigiComply Team`,
        variables: JSON.stringify(['clientName', 'documentName', 'serviceName', 'periodLabel', 'rejectionReason', 'portalLink'])
      },
      {
        templateKey: 'SLA_BREACH_WARNING',
        name: 'SLA Breach Warning',
        channel: 'EMAIL',
        subject: 'SLA Warning - {{serviceName}} ({{periodLabel}})',
        body: `ATTENTION: SLA Breach Warning

Service: {{serviceName}} ({{periodLabel}})
Entity: {{entityName}}
Current Status: {{currentStatus}}
Due Date: {{dueDate}}
Days Overdue: {{daysOverdue}}

Immediate action required to prevent further delays.

Escalation Details:
- Assigned to: {{escalatedTo}}
- Priority: {{priority}}
- Current Step: {{currentStep}}

View details: {{adminPortalLink}}

DigiComply Operations Team`,
        variables: JSON.stringify(['serviceName', 'periodLabel', 'entityName', 'currentStatus', 'dueDate', 'daysOverdue', 'escalatedTo', 'priority', 'currentStep', 'adminPortalLink'])
      }
    ];

    for (const template of templates) {
      try {
        await db.insert(notificationTemplates).values(template).onConflictDoNothing();
      } catch (error) {
        console.log(`Template ${template.templateKey} already exists`);
      }
    }

    console.log(`✅ Seeded ${templates.length} notification templates`);
  }
}

// Global service seeder instance
export const serviceSeeder = new ServiceSeeder();
