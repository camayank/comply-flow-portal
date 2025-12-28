import { db } from './db';
import { 
  notificationTemplates,
  workflowTemplates,
  workflowSteps,
  notificationRules
} from '@shared/schema';
import { adminWorkflowBuilder } from './admin-workflow-builder';
import { SERVICE_CATALOG } from './service-catalog-data';
import { eq } from 'drizzle-orm';

// Comprehensive Service Template Seeder for Universal Platform
export class ServiceTemplateSeeder {
  
  async seedAllTemplates() {
    console.log('🌱 Seeding comprehensive service templates...');
    
    // Seed notification templates first
    await this.seedNotificationTemplates();
    
    // Seed all service workflows
    await this.seedIncorporationWorkflow();
    await this.seedPostIncorporationWorkflow();
    await this.seedGSTRegistrationWorkflow();
    await this.seedGSTReturnsWorkflow();
    await this.seedTDSWorkflow();
    await this.seedAccountingWorkflow();
    await this.seedPFESIWorkflow();
    await this.seedQuarterlyFilingsWorkflow();
    await this.seedAnnualFilingsWorkflow();
    await this.seedITRWorkflow();
    await this.seedBSPLWorkflow();
    await this.seedCatalogDefaultTemplates();
    
    console.log('✅ All service templates seeded successfully');
  }

  private async seedCatalogDefaultTemplates() {
    const serviceKeysWithCustomTemplates = new Set([
      'incorporation',
      'gst_registration',
      'gst_returns',
      'tds_quarterly',
      'accounting_monthly',
      'pf_esi_monthly',
      'annual_filings_roc',
      'itr_annual',
      'bs_pl_annual',
      'post_incorporation',
      'quarterly_statutory_generic'
    ]);

    for (const service of SERVICE_CATALOG) {
      if (serviceKeysWithCustomTemplates.has(service.serviceKey)) {
        continue;
      }

      const existing = await db
        .select({ id: workflowTemplates.id })
        .from(workflowTemplates)
        .where(eq(workflowTemplates.serviceCode, service.serviceKey))
        .limit(1);

      if (existing.length > 0) {
        continue;
      }

      const normalizedPeriodicity = this.normalizePeriodicity(service.periodicity);
      const slaDays = this.estimateSlaDays(normalizedPeriodicity);

      await adminWorkflowBuilder.createServiceTemplate({
        serviceKey: service.serviceKey,
        name: service.name,
        description: service.description,
        periodicity: normalizedPeriodicity,
        dependencies: [],
        workflow: [
          {
            stepKey: 'intake',
            name: 'Requirement Intake',
            description: `Collect inputs and documents for ${service.name}`,
            clientTasks: ['Share required details', 'Upload supporting documents'],
            opsChecklist: ['Validate inputs', 'Confirm scope with client'],
            slaDays: Math.max(1, Math.round(slaDays * 0.3)),
            qaRequired: false
          },
          {
            stepKey: 'execution',
            name: 'Service Execution',
            description: `Execute ${service.name} workflow`,
            opsChecklist: ['Prepare working papers', 'Complete filing or submission'],
            slaDays: Math.max(1, Math.round(slaDays * 0.4)),
            qaRequired: true
          },
          {
            stepKey: 'review',
            name: 'Quality Review',
            description: 'Perform QA review and validations',
            opsChecklist: ['Review outputs', 'Verify compliance requirements'],
            slaDays: Math.max(1, Math.round(slaDays * 0.2)),
            qaRequired: true
          },
          {
            stepKey: 'delivery',
            name: 'Client Delivery',
            description: 'Deliver outputs and close the service request',
            opsChecklist: ['Share deliverables', 'Capture client sign-off'],
            slaDays: Math.max(1, Math.round(slaDays * 0.1)),
            qaRequired: false,
            deliverables: ['final_report', 'acknowledgment']
          }
        ]
      });
    }
  }

  private normalizePeriodicity(periodicity: string): 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' {
    if (periodicity === 'ONGOING') {
      return 'MONTHLY';
    }

    if (periodicity === 'ONE_TIME' || periodicity === 'MONTHLY' || periodicity === 'QUARTERLY' || periodicity === 'ANNUAL') {
      return periodicity;
    }

    return 'ONE_TIME';
  }

  private estimateSlaDays(periodicity: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL') {
    switch (periodicity) {
      case 'MONTHLY':
        return 5;
      case 'QUARTERLY':
        return 7;
      case 'ANNUAL':
        return 10;
      case 'ONE_TIME':
      default:
        return 6;
    }
  }

  async seedNotificationTemplates() {
    const templates = [
      // GST Templates
      {
        templateKey: 'GST_REMINDER_GENERIC',
        name: 'GST Return Reminder',
        channel: 'EMAIL',
        subject: 'GST Return – Action Needed for {{entityName}} ({{periodLabel}})',
        body: `Hello {{clientFirstName}},

GST return for {{entityName}} ({{periodLabel}}) is due on {{dueDate}}.

Next step: {{nextClientAction}}

Access your portal: {{portalDeepLink}}

— DigiComply Team`,
        variables: JSON.stringify(['entityName', 'clientFirstName', 'periodLabel', 'dueDate', 'nextClientAction', 'portalDeepLink'])
      },
      {
        templateKey: 'GST_DUE_NUDGE',
        name: 'GST Due Date Nudge',
        channel: 'WHATSAPP',
        subject: null,
        body: 'GST return for *{{entityName}}* ({{periodLabel}}) is due on {{dueDate}}. Complete: {{portalDeepLink}}',
        variables: JSON.stringify(['entityName', 'periodLabel', 'dueDate', 'portalDeepLink'])
      },
      
      // Filing Completion Templates
      {
        templateKey: 'FILING_DONE_CONFIRMATION',
        name: 'Filing Completed Confirmation',
        channel: 'EMAIL',
        subject: 'Filing Completed – {{serviceName}} ({{periodLabel}})',
        body: `Great news! Filing completed for {{entityName}} – {{serviceName}} ({{periodLabel}}).

Acknowledgment: {{ackNo}}
Download: {{portalDeepLink}}

— DigiComply Team`,
        variables: JSON.stringify(['entityName', 'serviceName', 'periodLabel', 'ackNo', 'portalDeepLink'])
      },
      
      // Client Action Templates
      {
        templateKey: 'CLIENT_PENDENCY_ALERT',
        name: 'Client Action Pending Alert',
        channel: 'EMAIL',
        subject: 'Action Needed – {{serviceName}} ({{periodLabel}})',
        body: `Your action is pending for {{serviceName}} ({{periodLabel}}): {{pendingItem}}.

Complete the required action here: {{portalDeepLink}}

— DigiComply Team`,
        variables: JSON.stringify(['serviceName', 'periodLabel', 'pendingItem', 'portalDeepLink'])
      },
      
      // Document Templates
      {
        templateKey: 'DOC_REJECTED_REUPLOAD',
        name: 'Document Rejection Notice',
        channel: 'EMAIL',
        subject: 'Document Rejected – {{serviceName}} ({{periodLabel}})',
        body: `The document {{docType}} was rejected for {{serviceName}} ({{periodLabel}}).

Reason: {{reason}}
Re-upload here: {{portalDeepLink}}

— DigiComply Team`,
        variables: JSON.stringify(['docType', 'serviceName', 'periodLabel', 'reason', 'portalDeepLink'])
      },
      
      // TDS Templates
      {
        templateKey: 'TDS_QUARTERLY_REMINDER',
        name: 'TDS Quarterly Filing Reminder',
        channel: 'EMAIL',
        subject: 'TDS Quarterly Return Due – {{entityName}} ({{periodLabel}})',
        body: `TDS quarterly return for {{entityName}} ({{periodLabel}}) is due on {{dueDate}}.

Please prepare payroll data and vendor information.
Portal: {{portalDeepLink}}

— DigiComply Team`,
        variables: JSON.stringify(['entityName', 'periodLabel', 'dueDate', 'portalDeepLink'])
      },
      
      // State/Annual Templates
      {
        templateKey: 'STATE_GENERIC_MONTHLY_REMINDER',
        name: 'State Filing Monthly Reminder',
        channel: 'EMAIL',
        subject: 'State Filing Due – {{entityName}} ({{periodLabel}})',
        body: `State filing for {{entityName}} ({{periodLabel}}) is due on {{dueDate}}.

Portal: {{portalDeepLink}}

— DigiComply Team`,
        variables: JSON.stringify(['entityName', 'periodLabel', 'dueDate', 'portalDeepLink'])
      },
      
      // Annual Templates
      {
        templateKey: 'ANNUAL_FILING_REMINDER',
        name: 'Annual Filing Reminder',
        channel: 'EMAIL',
        subject: 'Annual Filing Due – {{entityName}} ({{periodLabel}})',
        body: `Annual filing for {{entityName}} ({{periodLabel}}) is due on {{dueDate}}.

Please prepare financial statements and required documents.
Portal: {{portalDeepLink}}

— DigiComply Team`,
        variables: JSON.stringify(['entityName', 'periodLabel', 'dueDate', 'portalDeepLink'])
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

  async seedIncorporationWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'incorporation',
      name: 'Company Incorporation',
      description: 'Complete company incorporation process including name approval, documentation, and certificate issuance',
      periodicity: 'ONE_TIME',
      dependencies: [],
      workflow: [
        {
          stepKey: 'name_approval',
          name: 'Name Approval Application',
          description: 'Submit company name application for approval',
          clientTasks: ['Provide 3 preferred company names', 'Submit required documents'],
          opsChecklist: ['Verify name availability', 'Submit RUN application', 'Track approval status'],
          slaDays: 3,
          qaRequired: false,
          requiredDocuments: ['director_pan', 'address_proof']
        },
        {
          stepKey: 'moa_aoa_drafting',
          name: 'MoA & AoA Drafting',
          description: 'Prepare Memorandum and Articles of Association',
          clientTasks: ['Review and approve business objectives', 'Confirm share structure'],
          opsChecklist: ['Draft MoA/AoA', 'Customize as per business requirements', 'Client review cycle'],
          slaDays: 2,
          qaRequired: true,
          requiredDocuments: ['business_plan_draft']
        },
        {
          stepKey: 'incorporation_filing',
          name: 'Incorporation Filing',
          description: 'Submit incorporation application with MCA',
          opsChecklist: ['Prepare SPICe+ form', 'Upload all documents', 'Pay government fees', 'Submit application'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['spice_plus_receipt']
        },
        {
          stepKey: 'certificate_issuance',
          name: 'Certificate & Post-Incorporation',
          description: 'Obtain incorporation certificate and complete initial compliance',
          opsChecklist: ['Download COI', 'Generate PAN/TAN', 'Prepare statutory registers', 'Deliver incorporation kit'],
          slaDays: 7,
          qaRequired: false,
          deliverables: ['certificate_of_incorporation', 'company_pan', 'company_tan', 'moa_aoa_final', 'statutory_registers']
        }
      ],
      notifications: {
        events: {
          service_created: { channels: ['EMAIL'], template: 'SERVICE_STARTED_INCORPORATION' },
          step_completed: { channels: ['EMAIL'], template: 'INCORPORATION_STEP_COMPLETE' },
          filing_done: { channels: ['EMAIL', 'WHATSAPP'], template: 'INCORPORATION_COMPLETE' }
        }
      }
    });
  }

  async seedGSTRegistrationWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'gst_registration',
      name: 'GST Registration',
      description: 'Complete GST registration process with GSTN portal',
      periodicity: 'ONE_TIME',
      dependencies: ['incorporation'],
      workflow: [
        {
          stepKey: 'document_collection',
          name: 'Document Collection & KYC',
          description: 'Collect all required documents for GST registration',
          clientTasks: ['Upload business registration documents', 'Provide bank account details', 'Submit address proof'],
          opsChecklist: ['Verify document completeness', 'Validate business details', 'Prepare GST application'],
          slaDays: 2,
          qaRequired: false,
          requiredDocuments: ['coi', 'pan_card', 'bank_account_proof', 'business_address_proof']
        },
        {
          stepKey: 'gst_application',
          name: 'GST Application Submission',
          description: 'Submit GST registration application on GSTN portal',
          opsChecklist: ['Login to GSTN portal', 'Fill GST REG-01 form', 'Upload documents', 'Submit application'],
          slaDays: 1,
          qaRequired: true,
          deliverables: ['gst_application_receipt']
        },
        {
          stepKey: 'verification_compliance',
          name: 'Verification & Compliance',
          description: 'Handle verification process and respond to queries',
          opsChecklist: ['Track application status', 'Respond to department queries', 'Coordinate physical verification if required'],
          slaDays: 15,
          qaRequired: false
        },
        {
          stepKey: 'gstin_allotment',
          name: 'GSTIN Allotment & Setup',
          description: 'Receive GSTIN and complete initial setup',
          opsChecklist: ['Download GST certificate', 'Setup return filing calendar', 'Configure compliance tracker'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['gst_registration_certificate', 'compliance_calendar', 'return_filing_schedule']
        }
      ],
      notifications: {
        events: {
          verification_required: { channels: ['EMAIL', 'WHATSAPP'], template: 'GST_VERIFICATION_ALERT' },
          gstin_received: { channels: ['EMAIL', 'WHATSAPP'], template: 'GST_REGISTRATION_COMPLETE' }
        }
      }
    });
  }

  async seedGSTReturnsWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'gst_returns',
      name: 'GST Returns Filing',
      description: 'Monthly/Quarterly GST return preparation and filing',
      periodicity: 'MONTHLY',
      periodRule: { dayOfMonth: 11 },
      dependencies: ['gst_registration'],
      workflow: [
        {
          stepKey: 'data_intake',
          name: 'Data Collection & Intake',
          description: 'Collect sales and purchase data for the period',
          clientTasks: ['Upload Sales Register (CSV/Excel)', 'Upload Purchase Register (CSV/Excel)', 'Provide additional transaction details'],
          opsChecklist: ['Validate CSV format', 'Check data completeness', 'Run preliminary reconciliation'],
          slaDays: 2,
          qaRequired: false,
          requiredDocuments: ['sales_register', 'purchase_register', 'bank_statement']
        },
        {
          stepKey: 'reconciliation',
          name: 'Reconciliation & Working',
          description: 'Reconcile data and prepare working papers',
          opsChecklist: ['GSTR-2B reconciliation', 'ITC eligibility check', 'Mismatch analysis', 'Prepare working papers'],
          slaDays: 2,
          qaRequired: true,
          deliverables: ['reconciliation_report', 'itc_working']
        },
        {
          stepKey: 'client_review',
          name: 'Client Review & Approval',
          description: 'Client review of prepared returns',
          clientTasks: ['Review return summary', 'Approve liability amount', 'Confirm filing authorization'],
          opsChecklist: ['Prepare return preview', 'Client presentation', 'Capture approval'],
          slaDays: 1,
          qaRequired: false,
          deliverables: ['return_summary', 'liability_computation']
        },
        {
          stepKey: 'filing_completion',
          name: 'Portal Filing & Compliance',
          description: 'File returns on GST portal and complete compliance',
          opsChecklist: ['File GSTR-3B', 'File GSTR-1 (if applicable)', 'Generate acknowledgments', 'Update compliance tracker'],
          slaDays: 1,
          qaRequired: false,
          deliverables: ['gstr3b_acknowledgment', 'gstr1_acknowledgment', 'payment_challan']
        }
      ],
      notifications: {
        schedules: [
          {
            type: 'monthly_reminder',
            cron: { cron: '0 9 1,2 * *', timezone: 'Asia/Kolkata' },
            filters: [{ field: 'serviceOrder.status', op: 'IN', value: ['Created', 'In Progress'] }],
            channels: ['EMAIL', 'WHATSAPP'],
            template: 'GST_REMINDER_GENERIC'
          },
          {
            type: 'due_date_nudge',
            cron: { cron: '*/30 * * * *', timezone: 'Asia/Kolkata' },
            filters: [{ field: 'serviceOrder.status', op: 'NE', value: 'Completed' }],
            channels: ['EMAIL', 'WHATSAPP'],
            template: 'GST_DUE_NUDGE'
          }
        ],
        events: {
          filing_done: { channels: ['EMAIL', 'WHATSAPP'], template: 'FILING_DONE_CONFIRMATION' },
          client_action_required: { channels: ['EMAIL', 'WHATSAPP'], template: 'CLIENT_PENDENCY_ALERT' }
        }
      }
    });
  }

  async seedAccountingWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'accounting_monthly',
      name: 'Monthly Accounting & Books Maintenance',
      description: 'Monthly bookkeeping, reconciliation, and financial reporting',
      periodicity: 'MONTHLY',
      periodRule: { dayOfMonth: 5 },
      dependencies: [],
      workflow: [
        {
          stepKey: 'data_import',
          name: 'Data Import & Entry',
          description: 'Import bank statements and transaction data',
          clientTasks: ['Upload bank statements', 'Provide cash transaction details', 'Submit vendor invoices'],
          opsChecklist: ['Import bank feeds', 'Auto-categorize transactions', 'Manual entry verification'],
          slaDays: 3,
          qaRequired: false,
          requiredDocuments: ['bank_statements', 'cash_book', 'purchase_invoices', 'sales_invoices']
        },
        {
          stepKey: 'ledger_posting',
          name: 'Ledger Posting & Classification',
          description: 'Post transactions to appropriate ledger accounts',
          opsChecklist: ['Review transaction categories', 'Post journal entries', 'Update ledger accounts', 'Apply accounting standards'],
          slaDays: 2,
          qaRequired: true
        },
        {
          stepKey: 'reconciliation',
          name: 'Bank & Ledger Reconciliation',
          description: 'Reconcile bank statements with ledger entries',
          opsChecklist: ['Bank reconciliation', 'Identify unmatched entries', 'Resolve discrepancies', 'Prepare reconciliation report'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['bank_reconciliation_report']
        },
        {
          stepKey: 'monthly_reporting',
          name: 'Monthly Financial Reporting',
          description: 'Generate monthly financial statements and reports',
          opsChecklist: ['Generate trial balance', 'Prepare P&L statement', 'Create balance sheet draft', 'Variance analysis'],
          slaDays: 1,
          qaRequired: true,
          deliverables: ['trial_balance', 'monthly_pl', 'balance_sheet_draft', 'variance_report']
        }
      ],
      notifications: {
        schedules: [
          {
            type: 'monthly_reminder',
            cron: { cron: '0 9 5 * *', timezone: 'Asia/Kolkata' },
            channels: ['EMAIL'],
            template: 'ACCOUNTING_MONTHLY_REMINDER'
          }
        ]
      }
    });
  }

  async seedBSPLWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'bs_pl_annual',
      name: 'Annual Financial Statements (BS & P&L)',
      description: 'Preparation of audited annual financial statements',
      periodicity: 'ANNUAL',
      periodRule: { month: 3, day: 31 }, // March 31st deadline
      dependencies: ['accounting_monthly'],
      workflow: [
        {
          stepKey: 'year_end_adjustments',
          name: 'Year-End Adjustments & Closing',
          description: 'Process year-end adjustments and account closures',
          opsChecklist: ['Depreciation calculations', 'Accrual adjustments', 'Provision entries', 'Closing entries'],
          slaDays: 7,
          qaRequired: true,
          deliverables: ['adjustment_entries', 'closing_trial_balance']
        },
        {
          stepKey: 'draft_financials',
          name: 'Draft Financial Statements',
          description: 'Prepare draft Balance Sheet and P&L Account',
          opsChecklist: ['Draft Balance Sheet preparation', 'P&L Account preparation', 'Notes to accounts', 'Schedules preparation'],
          slaDays: 5,
          qaRequired: true,
          deliverables: ['draft_balance_sheet', 'draft_pl_account', 'notes_to_accounts']
        },
        {
          stepKey: 'audit_coordination',
          name: 'Audit Coordination & Support',
          description: 'Coordinate with auditors and provide required support',
          opsChecklist: ['Auditor coordination', 'Query resolution', 'Document provision', 'Audit trail maintenance'],
          slaDays: 15,
          qaRequired: false
        },
        {
          stepKey: 'final_financials',
          name: 'Final Financial Statements',
          description: 'Finalize audited financial statements',
          clientTasks: ['Review audited financials', 'Board approval', 'Sign-off authorization'],
          opsChecklist: ['Incorporate audit suggestions', 'Final formatting', 'Compliance check', 'Digital signatures'],
          slaDays: 3,
          qaRequired: true,
          deliverables: ['audited_balance_sheet', 'audited_pl_account', 'auditor_report', 'board_resolution']
        }
      ],
      notifications: {
        schedules: [
          {
            type: 'annual_reminder',
            cron: { cron: '0 9 1 1,2,3 *', timezone: 'Asia/Kolkata' },
            channels: ['EMAIL'],
            template: 'ANNUAL_FILING_REMINDER'
          }
        ]
      }
    });
  }

  async seedTDSWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'tds_quarterly',
      name: 'TDS Quarterly Returns (24Q/26Q/27Q)',
      description: 'Quarterly TDS calculation, payment, and return filing',
      periodicity: 'QUARTERLY',
      periodRule: { months: [6, 9, 12, 3], day: 31 },
      dependencies: ['accounting_monthly'],
      workflow: [
        {
          stepKey: 'tds_calculation',
          name: 'TDS Calculation & Working',
          description: 'Calculate TDS liability for the quarter',
          clientTasks: ['Provide payroll data', 'Submit vendor payment details', 'Confirm TDS rates'],
          opsChecklist: ['Extract payment data', 'Apply TDS rates', 'Calculate quarterly liability', 'Prepare working papers'],
          slaDays: 3,
          qaRequired: true,
          requiredDocuments: ['payroll_register', 'vendor_payments', 'tds_certificates']
        },
        {
          stepKey: 'challan_payment',
          name: 'TDS Challan Payment',
          description: 'Generate and process TDS payment challans',
          clientTasks: ['Approve TDS amount', 'Authorize payment'],
          opsChecklist: ['Generate challans', 'Process payments', 'Download acknowledgments', 'Update records'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['tds_challans', 'payment_acknowledgments']
        },
        {
          stepKey: 'return_filing',
          name: 'TDS Return Filing',
          description: 'File quarterly TDS returns (24Q/26Q/27Q)',
          opsChecklist: ['Prepare return files', 'Upload to TIN portal', 'File quarterly returns', 'Download acknowledgments'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['tds_return_receipts', 'quarterly_certificates']
        },
        {
          stepKey: 'certificate_generation',
          name: 'TDS Certificate Generation',
          description: 'Generate and distribute TDS certificates',
          opsChecklist: ['Generate Form 16/16A', 'Quality check certificates', 'Distribute to deductees', 'Maintain records'],
          slaDays: 7,
          qaRequired: false,
          deliverables: ['form_16', 'form_16a', 'distribution_report']
        }
      ],
      notifications: {
        schedules: [
          {
            type: 'quarterly_reminder',
            cron: { cron: '0 10 1 4,7,10,1 *', timezone: 'Asia/Kolkata' },
            channels: ['EMAIL', 'WHATSAPP'],
            template: 'TDS_QUARTERLY_REMINDER'
          }
        ]
      }
    });
  }

  async seedPFESIWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'pf_esi_monthly',
      name: 'PF/ESI Monthly Compliance',
      description: 'Monthly PF and ESI contribution calculation and filing',
      periodicity: 'MONTHLY',
      periodRule: { dayOfMonth: 15 },
      dependencies: [],
      workflow: [
        {
          stepKey: 'payroll_processing',
          name: 'Payroll Data Processing',
          description: 'Process monthly payroll for PF/ESI calculations',
          clientTasks: ['Submit monthly payroll', 'Provide attendance records', 'Confirm salary revisions'],
          opsChecklist: ['Validate payroll data', 'Calculate PF contributions', 'Calculate ESI contributions', 'Generate contribution schedules'],
          slaDays: 3,
          qaRequired: false,
          requiredDocuments: ['payroll_register', 'attendance_sheet', 'salary_slips']
        },
        {
          stepKey: 'challan_generation',
          name: 'Challan Generation & Payment',
          description: 'Generate payment challans and process contributions',
          opsChecklist: ['Generate PF challan', 'Generate ESI challan', 'Process payments', 'Download acknowledgments'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['pf_challan', 'esi_challan', 'payment_receipts']
        },
        {
          stepKey: 'return_filing',
          name: 'Monthly Return Filing',
          description: 'File monthly PF and ESI returns',
          opsChecklist: ['File PF monthly return', 'File ESI monthly return', 'Submit employee details', 'Update compliance tracker'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['pf_return_receipt', 'esi_return_receipt']
        }
      ]
    });
  }

  async seedAnnualFilingsWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'annual_filings_roc',
      name: 'Annual ROC Filings (AOC-4, MGT-7)',
      description: 'Annual compliance filings with Registrar of Companies',
      periodicity: 'ANNUAL',
      periodRule: { month: 9, day: 30 }, // September 30th deadline
      dependencies: ['bs_pl_annual'],
      workflow: [
        {
          stepKey: 'data_compilation',
          name: 'Annual Data Compilation',
          description: 'Compile all required data for annual filings',
          clientTasks: ['Approve annual accounts', 'Provide director details', 'Submit board resolutions'],
          opsChecklist: ['Compile financial data', 'Update company details', 'Prepare director information', 'Validate share structure'],
          slaDays: 5,
          qaRequired: true,
          requiredDocuments: ['audited_financials', 'board_resolutions', 'director_details']
        },
        {
          stepKey: 'form_preparation',
          name: 'Form Preparation (AOC-4, MGT-7)',
          description: 'Prepare annual filing forms',
          opsChecklist: ['Prepare AOC-4 form', 'Prepare MGT-7/7A form', 'Attach required documents', 'Validation checks'],
          slaDays: 3,
          qaRequired: true,
          deliverables: ['aoc4_draft', 'mgt7_draft']
        },
        {
          stepKey: 'client_approval',
          name: 'Client Review & Digital Signature',
          description: 'Client review and digital signature on forms',
          clientTasks: ['Review prepared forms', 'Digital signature submission', 'Payment authorization'],
          opsChecklist: ['Client presentation', 'Capture digital signatures', 'Payment processing', 'Final validation'],
          slaDays: 2,
          qaRequired: false
        },
        {
          stepKey: 'mca_filing',
          name: 'MCA Filing & Compliance',
          description: 'File forms with MCA and complete compliance',
          opsChecklist: ['Upload to MCA portal', 'Submit filings', 'Payment processing', 'Download acknowledgments'],
          slaDays: 1,
          qaRequired: false,
          deliverables: ['aoc4_receipt', 'mgt7_receipt', 'compliance_certificate']
        }
      ]
    });
  }

  async seedITRWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'itr_annual',
      name: 'Income Tax Return Filing',
      description: 'Annual income tax return preparation and filing',
      periodicity: 'ANNUAL',
      periodRule: { month: 7, day: 31 }, // July 31st deadline
      dependencies: ['bs_pl_annual', 'tds_quarterly'],
      workflow: [
        {
          stepKey: 'tax_computation',
          name: 'Tax Computation & Working',
          description: 'Calculate annual tax liability and prepare working papers',
          opsChecklist: ['Income computation', 'Deduction calculations', 'Tax liability working', 'Advance tax reconciliation'],
          slaDays: 5,
          qaRequired: true,
          deliverables: ['tax_computation_sheet', 'deduction_working']
        },
        {
          stepKey: 'itr_preparation',
          name: 'ITR Form Preparation',
          description: 'Prepare appropriate ITR form with all schedules',
          opsChecklist: ['Select appropriate ITR form', 'Fill all schedules', 'Attach required documents', 'Validation checks'],
          slaDays: 3,
          qaRequired: true,
          deliverables: ['itr_draft', 'supporting_schedules']
        },
        {
          stepKey: 'client_review_sign',
          name: 'Client Review & Verification',
          description: 'Client review and digital signature',
          clientTasks: ['Review ITR details', 'Verify all information', 'Digital signature/eVerification'],
          opsChecklist: ['Client presentation', 'Query resolution', 'Capture verification', 'Final checks'],
          slaDays: 2,
          qaRequired: false
        },
        {
          stepKey: 'itr_filing',
          name: 'ITR Filing & Processing',
          description: 'File ITR and complete all post-filing requirements',
          opsChecklist: ['e-File ITR', 'ITR-V processing', 'Download acknowledgment', 'Refund tracking'],
          slaDays: 1,
          qaRequired: false,
          deliverables: ['itr_acknowledgment', 'itr_v', 'refund_status']
        }
      ]
    });
  }

  async seedPostIncorporationWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'post_incorporation',
      name: 'Post-Incorporation Initial Compliance',
      description: 'Complete initial compliance requirements within 30 days of incorporation',
      periodicity: 'ONE_TIME',
      dependencies: ['incorporation'],
      workflow: [
        {
          stepKey: 'board_meeting_setup',
          name: 'First Board Meeting & Resolutions',
          description: 'Conduct first board meeting and pass necessary resolutions',
          clientTasks: ['Attend board meeting', 'Approve resolutions', 'Sign board minutes'],
          opsChecklist: ['Draft board resolutions', 'Conduct board meeting', 'Prepare minutes', 'File necessary forms'],
          slaDays: 7,
          qaRequired: false,
          deliverables: ['board_minutes', 'resolutions_copy']
        },
        {
          stepKey: 'bank_account_opening',
          name: 'Bank Account Opening Support',
          description: 'Assist with corporate bank account opening',
          clientTasks: ['Visit bank with documents', 'Complete KYC formalities', 'Initial deposit'],
          opsChecklist: ['Prepare bank documents', 'Coordinate bank visit', 'Verify account opening', 'Update records'],
          slaDays: 14,
          qaRequired: false,
          deliverables: ['bank_account_details', 'account_opening_confirmation']
        },
        {
          stepKey: 'statutory_registers',
          name: 'Statutory Registers Setup',
          description: 'Prepare and maintain statutory registers',
          opsChecklist: ['Register of Members', 'Register of Directors', 'Register of Charges', 'Minutes book setup'],
          slaDays: 3,
          qaRequired: true,
          deliverables: ['register_of_members', 'register_of_directors', 'register_of_charges']
        },
        {
          stepKey: 'compliance_setup',
          name: 'Compliance Calendar Setup',
          description: 'Setup ongoing compliance calendar and procedures',
          opsChecklist: ['Create compliance calendar', 'Setup reminder system', 'Document procedures', 'Train client team'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['compliance_calendar', 'procedure_manual']
        }
      ]
    });
  }

  async seedQuarterlyFilingsWorkflow() {
    return await adminWorkflowBuilder.createServiceTemplate({
      serviceKey: 'quarterly_statutory_generic',
      name: 'Quarterly Statutory Filings',
      description: 'Generic quarterly filings including MSME, FLA, and other sectoral returns',
      periodicity: 'QUARTERLY',
      periodRule: { months: [6, 9, 12, 3], day: 30 },
      dependencies: [],
      workflow: [
        {
          stepKey: 'compliance_review',
          name: 'Quarterly Compliance Review',
          description: 'Review applicable quarterly compliances',
          opsChecklist: ['Identify applicable returns', 'Review compliance requirements', 'Gather necessary data', 'Prepare filing checklist'],
          slaDays: 3,
          qaRequired: false
        },
        {
          stepKey: 'data_preparation',
          name: 'Data Compilation & Preparation',
          description: 'Compile data for quarterly filings',
          clientTasks: ['Provide quarterly data', 'Submit required documents', 'Verify information'],
          opsChecklist: ['Compile quarterly data', 'Validate information', 'Prepare draft returns', 'Quality checks'],
          slaDays: 3,
          qaRequired: true,
          requiredDocuments: ['quarterly_financials', 'operational_data']
        },
        {
          stepKey: 'filing_submission',
          name: 'Filing Submission & Compliance',
          description: 'Submit quarterly filings and obtain confirmations',
          opsChecklist: ['Submit quarterly returns', 'Process payments', 'Download acknowledgments', 'Update compliance tracker'],
          slaDays: 2,
          qaRequired: false,
          deliverables: ['filing_receipts', 'compliance_updates']
        }
      ]
    });
  }
}

// Global service template seeder instance
export const serviceTemplateSeeder = new ServiceTemplateSeeder();
