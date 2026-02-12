import { db } from './db';
import { 
  servicesCatalog,
  workflowTemplatesAdmin,
  serviceDocTypes,
  dueDateMaster,
  notificationTemplates
} from '@shared/schema';
import { SERVICE_CATALOG } from './service-catalog-data';
import { buildDefaultWorkflowTemplate, buildDefaultDocTypes, buildDefaultDueDateRule } from './service-config-defaults';
import { eq, desc } from 'drizzle-orm';

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
              stepKey: 'period_setup',
              name: 'Period Setup & Data Request',
              description: 'Confirm filing period, scheme and request data from client',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              clientTasks: ['Confirm filing period and scheme (Monthly/QRMP)', 'Share GST portal access/OTP if needed'],
              opsChecklist: ['Verify previous period status', 'Check late fees/interest exposure'],
              qaRequired: false
            },
            {
              stepKey: 'data_collection',
              name: 'Data Collection & Validation',
              description: 'Collect and validate sales, purchase, and ledger data',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              clientTasks: ['Upload Sales Register (CSV)', 'Upload Purchase Register (CSV)', 'Upload Bank Statements'],
              opsChecklist: ['Validate CSV format', 'Check data completeness', 'Verify GSTIN details'],
              requiredDocuments: ['sales_register', 'purchase_register', 'bank_statements', 'gstr2b', 'e_invoice', 'e_way_bill'],
              qaRequired: false
            },
            {
              stepKey: 'reconciliation',
              name: 'ITC Reconciliation',
              description: 'Reconcile ITC with GSTR-2B and prepare mismatch report',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Download GSTR-2B', 'Reconcile ITC', 'Prepare mismatch report'],
              qaRequired: true,
              deliverables: ['reconciliation_report']
            },
            {
              stepKey: 'tax_computation',
              name: 'Liability Computation',
              description: 'Compute GST liability and prepare GSTR-3B/GSTR-1 summaries',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Compute output liability', 'Adjust ITC', 'Prepare return summary'],
              qaRequired: true,
              deliverables: ['liability_computation', 'return_summary']
            },
            {
              stepKey: 'client_approval',
              name: 'Client Review & Approval',
              description: 'Client review of prepared returns and payment confirmation',
              estimatedDays: 1,
              assigneeRole: 'client',
              clientTasks: ['Review return summary', 'Approve filing', 'Authorize payment'],
              deliverables: ['client_approval']
            },
            {
              stepKey: 'filing',
              name: 'GST Filing',
              description: 'File returns on GST portal and generate acknowledgments',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['File GSTR-3B', 'File GSTR-1', 'Generate acknowledgments', 'Process payment'],
              deliverables: ['gstr3b_ack', 'gstr1_ack', 'payment_receipt']
            },
            {
              stepKey: 'post_filing',
              name: 'Post Filing Closure',
              description: 'Share acknowledgments and update ledgers',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Upload acknowledgments', 'Share compliance summary'],
              deliverables: ['compliance_summary']
            }
          ],
          slaPolicy: {
            totalDays: 8,
            escalationThresholds: [5, 7],
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
              assigneeRole: 'ops_executive',
              clientTasks: ['Provide 3 preferred names', 'Submit director details'],
              opsChecklist: ['Check name availability', 'Submit RUN application', 'Track approval'],
              requiredDocuments: ['director_pan', 'address_proof']
            },
            {
              stepKey: 'documentation',
              name: 'MoA & AoA Preparation',
              description: 'Prepare incorporation documents',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              qaRequired: true,
              opsChecklist: ['Draft MoA/AoA', 'Customize for business', 'Client review'],
              deliverables: ['moa_draft', 'aoa_draft']
            },
            {
              stepKey: 'filing',
              name: 'Incorporation Filing',
              description: 'Submit incorporation application',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Prepare SPICe+ form', 'Upload documents', 'Submit application'],
              deliverables: ['spice_receipt']
            },
            {
              stepKey: 'completion',
              name: 'Certificate & Compliance Setup',
              description: 'Obtain certificate and setup compliance',
              estimatedDays: 7,
              assigneeRole: 'ops_executive',
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
              description: 'Compile quarterly TDS data and validate PAN/master data',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              clientTasks: ['Provide payroll data', 'Submit vendor payments', 'Confirm TDS rates'],
              opsChecklist: ['Validate PAN master', 'Extract payment data', 'Apply TDS rates'],
              requiredDocuments: ['payroll_register', 'vendor_payments', 'pan_master', 'challan_history']
            },
            {
              stepKey: 'tax_computation',
              name: 'TDS Computation & Challan Prep',
              description: 'Compute TDS liability and prepare challans',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Compute section-wise liability', 'Prepare challan working'],
              qaRequired: true,
              deliverables: ['tds_working', 'tds_challans']
            },
            {
              stepKey: 'payment_processing',
              name: 'TDS Payment',
              description: 'Process payments and fetch challan receipts',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Process payment', 'Download challan receipts'],
              deliverables: ['payment_receipts']
            },
            {
              stepKey: 'return_preparation',
              name: 'Return Preparation & Validation',
              description: 'Prepare return files (RPU/FVU) and validate',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Prepare RPU file', 'Run FVU validation', 'Resolve errors'],
              qaRequired: true,
              deliverables: ['tds_return_files']
            },
            {
              stepKey: 'return_filing',
              name: 'TDS Return Filing',
              description: 'File quarterly TDS returns and collect acknowledgments',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Upload to portal', 'File returns', 'Download acknowledgment'],
              deliverables: ['tds_return_acks']
            },
            {
              stepKey: 'certificates',
              name: 'Certificate Generation',
              description: 'Generate and distribute Form 16/16A',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
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
      ,
      {
        serviceKey: 'gst_registration',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'eligibility_intake',
              name: 'Eligibility & Intake',
              description: 'Confirm business details, GST applicability, and collect inputs',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              clientTasks: ['Share business details', 'Confirm business address', 'Share authorized signatory details'],
              opsChecklist: ['Validate PAN and entity details', 'Confirm state jurisdiction'],
              qaRequired: false
            },
            {
              stepKey: 'document_preparation',
              name: 'Document Preparation',
              description: 'Collect and validate KYC and business documents',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Verify address proof', 'Verify bank proof', 'Prepare authorization letter'],
              requiredDocuments: ['pan_card', 'address_proof', 'bank_proof', 'photo', 'authorization_letter'],
              qaRequired: true
            },
            {
              stepKey: 'application_submission',
              name: 'Application Submission',
              description: 'File GST registration and generate ARN',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Submit GST REG-01', 'Capture ARN'],
              deliverables: ['gst_arn']
            },
            {
              stepKey: 'verification_response',
              name: 'Verification & Queries',
              description: 'Handle GST officer queries and verification',
              estimatedDays: 3,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Respond to notices', 'Upload additional documents if requested'],
              qaRequired: true
            },
            {
              stepKey: 'gstin_issuance',
              name: 'GSTIN Issuance',
              description: 'Download GSTIN certificate and share with client',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['gst_certificate', 'gst_login_credentials']
            }
          ],
          slaPolicy: {
            totalDays: 8,
            escalationThresholds: [5, 7]
          }
        }
      },
      {
        serviceKey: 'annual_filings_roc',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'data_collection',
              name: 'Data & Document Collection',
              description: 'Collect audited financials, AGM details, and registers',
              estimatedDays: 3,
              assigneeRole: 'ops_executive',
              clientTasks: ['Upload audited financials', 'Share AGM/board resolutions', 'Confirm shareholding details'],
              opsChecklist: ['Verify FY period', 'Check previous year filings'],
              requiredDocuments: ['audited_financials', 'agm_minutes', 'board_resolutions', 'shareholding_pattern']
            },
            {
              stepKey: 'financial_review',
              name: 'Financial Review & QC',
              description: 'Validate financial statements and disclosures',
              estimatedDays: 2,
              assigneeRole: 'qc_reviewer',
              opsChecklist: ['Check schedules', 'Validate director report', 'Confirm auditor details'],
              qaRequired: true
            },
            {
              stepKey: 'aoc4_preparation',
              name: 'AOC-4 Preparation',
              description: 'Prepare AOC-4 and attachments',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Prepare AOC-4', 'Attach financials and reports'],
              deliverables: ['aoc4_draft']
            },
            {
              stepKey: 'mgt7_preparation',
              name: 'MGT-7 Preparation',
              description: 'Prepare MGT-7 annual return',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Prepare MGT-7', 'Verify shareholder data'],
              deliverables: ['mgt7_draft']
            },
            {
              stepKey: 'filing',
              name: 'ROC Filing',
              description: 'File AOC-4 and MGT-7 on MCA portal',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['File AOC-4', 'File MGT-7', 'Download receipts'],
              deliverables: ['aoc4_receipt', 'mgt7_receipt']
            },
            {
              stepKey: 'closure',
              name: 'Post Filing Closure',
              description: 'Share acknowledgments and compliance summary',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['roc_compliance_summary']
            }
          ],
          slaPolicy: {
            totalDays: 12,
            escalationThresholds: [8, 10]
          }
        }
      },
      {
        serviceKey: 'pf_esi_monthly',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'payroll_intake',
              name: 'Payroll & Attendance Intake',
              description: 'Collect payroll, attendance and employee master',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              clientTasks: ['Upload payroll register', 'Share attendance data', 'Update employee master'],
              requiredDocuments: ['payroll_register', 'attendance_sheet', 'employee_master']
            },
            {
              stepKey: 'pf_computation',
              name: 'PF Computation & ECR Prep',
              description: 'Compute PF dues and prepare ECR file',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Validate UAN', 'Compute PF contributions', 'Prepare ECR'],
              qaRequired: true,
              deliverables: ['pf_ecr']
            },
            {
              stepKey: 'pf_payment',
              name: 'PF Upload & Payment',
              description: 'Upload ECR and generate challan',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Upload ECR', 'Generate challan', 'Confirm payment'],
              deliverables: ['pf_challan']
            },
            {
              stepKey: 'esi_processing',
              name: 'ESI Upload & Payment',
              description: 'Prepare ESI return and process payment',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Prepare ESI contribution file', 'Upload and pay'],
              deliverables: ['esi_challan']
            },
            {
              stepKey: 'closure',
              name: 'Compliance Closure',
              description: 'Share receipts and compliance summary',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['pf_esi_compliance_summary']
            }
          ],
          slaPolicy: {
            totalDays: 5,
            escalationThresholds: [3, 4]
          }
        }
      },
      {
        serviceKey: 'fssai_registration',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'business_assessment',
              name: 'Business Assessment',
              description: 'Identify FSSAI category and license type',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              clientTasks: ['Share business activities and product list', 'Confirm premises details'],
              opsChecklist: ['Determine license category', 'Confirm state/central scope']
            },
            {
              stepKey: 'document_preparation',
              name: 'Document Preparation',
              description: 'Collect and validate FSSAI documents',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              requiredDocuments: ['identity_proof', 'address_proof', 'product_list', 'kitchen_layout', 'water_test_report'],
              qaRequired: true
            },
            {
              stepKey: 'application_submission',
              name: 'Application Submission',
              description: 'File FSSAI application and pay fees',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Submit form', 'Pay fees', 'Capture application ID'],
              deliverables: ['fssai_application_id']
            },
            {
              stepKey: 'inspection_response',
              name: 'Inspection & Queries',
              description: 'Handle inspection or queries if required',
              estimatedDays: 3,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Coordinate inspection', 'Respond to queries']
            },
            {
              stepKey: 'license_issuance',
              name: 'License Issuance',
              description: 'Download and share FSSAI license',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['fssai_license']
            }
          ],
          slaPolicy: {
            totalDays: 8,
            escalationThresholds: [5, 7]
          }
        }
      },
      {
        serviceKey: 'shops_establishments',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'intake',
              name: 'Business Intake',
              description: 'Collect establishment and employee details',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              clientTasks: ['Share establishment details', 'Provide employee list'],
              requiredDocuments: ['address_proof', 'identity_proof', 'employee_list']
            },
            {
              stepKey: 'application_preparation',
              name: 'Application Preparation',
              description: 'Prepare Shops & Establishments registration application',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Prepare application', 'Validate documents'],
              qaRequired: true
            },
            {
              stepKey: 'submission',
              name: 'Submission & Fee Payment',
              description: 'Submit application and pay fees',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['application_receipt']
            },
            {
              stepKey: 'certificate_issuance',
              name: 'Certificate Issuance',
              description: 'Download and share registration certificate',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['shops_certificate']
            }
          ],
          slaPolicy: {
            totalDays: 4,
            escalationThresholds: [2, 3]
          }
        }
      },
      {
        serviceKey: 'trade_license',
        templateJson: {
          version: 1,
          steps: [
            {
              stepKey: 'intake',
              name: 'Business Intake',
              description: 'Collect trade details and premises information',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              clientTasks: ['Share trade details', 'Provide premises documents'],
              requiredDocuments: ['address_proof', 'identity_proof', 'ownership_proof', 'noc_landlord']
            },
            {
              stepKey: 'application_preparation',
              name: 'Application Preparation',
              description: 'Prepare municipal trade license application',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Fill application', 'Attach required documents'],
              qaRequired: true
            },
            {
              stepKey: 'submission',
              name: 'Submission & Fee Payment',
              description: 'Submit application and pay fees',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['application_receipt']
            },
            {
              stepKey: 'inspection',
              name: 'Inspection & Follow-up',
              description: 'Coordinate inspection if required',
              estimatedDays: 2,
              assigneeRole: 'ops_executive',
              opsChecklist: ['Schedule inspection', 'Respond to queries']
            },
            {
              stepKey: 'license_issuance',
              name: 'License Issuance',
              description: 'Download and share trade license',
              estimatedDays: 1,
              assigneeRole: 'ops_executive',
              deliverables: ['trade_license_certificate']
            }
          ],
          slaPolicy: {
            totalDays: 7,
            escalationThresholds: [4, 6]
          }
        }
      }
    ];

    const templateMap = new Map(
      templates.map(template => [template.serviceKey, template.templateJson])
    );

    const allTemplates = SERVICE_CATALOG.map(service => ({
      serviceKey: service.serviceKey,
      templateJson: templateMap.get(service.serviceKey) ?? buildDefaultWorkflowTemplate(service)
    }));

    const normalizeTemplate = (value: unknown) => {
      if (typeof value === 'string') {
        try {
          return JSON.stringify(JSON.parse(value));
        } catch (error) {
          return JSON.stringify(value);
        }
      }
      return JSON.stringify(value);
    };

    for (const template of allTemplates) {
      try {
        const payload = normalizeTemplate(template.templateJson);
        const [latest] = await db
          .select({
            id: workflowTemplatesAdmin.id,
            version: workflowTemplatesAdmin.version,
            templateJson: workflowTemplatesAdmin.templateJson
          })
          .from(workflowTemplatesAdmin)
          .where(eq(workflowTemplatesAdmin.serviceKey, template.serviceKey))
          .orderBy(desc(workflowTemplatesAdmin.version))
          .limit(1);

        if (!latest) {
          await db.insert(workflowTemplatesAdmin).values({
            serviceKey: template.serviceKey,
            version: 1,
            templateJson: payload,
            isPublished: true,
            createdBy: 'system'
          });
          continue;
        }

        const existingPayload = normalizeTemplate(latest.templateJson);
        if (existingPayload === payload) {
          continue;
        }

        await db
          .update(workflowTemplatesAdmin)
          .set({ isPublished: false, updatedAt: new Date() })
          .where(eq(workflowTemplatesAdmin.serviceKey, template.serviceKey));

        await db.insert(workflowTemplatesAdmin).values({
          serviceKey: template.serviceKey,
          version: latest.version + 1,
          templateJson: payload,
          isPublished: true,
          createdBy: 'system'
        });
      } catch (error) {
        console.log(`Template for ${template.serviceKey} already exists or failed to update`);
      }
    }

    console.log(`✅ Seeded ${allTemplates.length} workflow templates`);
  }

  async seedDocumentTypes() {
    const docTypes = [
      // GST Returns Documents
      { serviceKey: 'gst_returns', doctype: 'sales_register', label: 'Sales Register (CSV)', stepKey: 'data_collection', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_returns', doctype: 'purchase_register', label: 'Purchase Register (CSV)', stepKey: 'data_collection', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_returns', doctype: 'bank_statements', label: 'Bank Statements', stepKey: 'data_collection', clientUploads: true, mandatory: false },
      { serviceKey: 'gst_returns', doctype: 'gstr2b', label: 'GSTR-2B Download', stepKey: 'reconciliation', clientUploads: false, mandatory: false },
      { serviceKey: 'gst_returns', doctype: 'e_invoice', label: 'E-Invoice Data', stepKey: 'data_collection', clientUploads: true, mandatory: false },
      { serviceKey: 'gst_returns', doctype: 'e_way_bill', label: 'E-Way Bill Data', stepKey: 'data_collection', clientUploads: true, mandatory: false },
      { serviceKey: 'gst_returns', doctype: 'reconciliation_report', label: 'ITC Reconciliation Report', stepKey: 'reconciliation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_returns', doctype: 'liability_computation', label: 'GST Liability Computation', stepKey: 'tax_computation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_returns', doctype: 'return_summary', label: 'Return Summary', stepKey: 'tax_computation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_returns', doctype: 'gstr3b_ack', label: 'GSTR-3B Acknowledgment', stepKey: 'filing', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_returns', doctype: 'gstr1_ack', label: 'GSTR-1 Acknowledgment', stepKey: 'filing', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_returns', doctype: 'payment_receipt', label: 'GST Payment Receipt', stepKey: 'filing', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_returns', doctype: 'compliance_summary', label: 'GST Compliance Summary', stepKey: 'post_filing', isDeliverable: true, clientUploads: false },

      // Incorporation Documents
      { serviceKey: 'incorporation', doctype: 'director_pan', label: 'Director PAN Cards', stepKey: 'name_approval', clientUploads: true, mandatory: true },
      { serviceKey: 'incorporation', doctype: 'address_proof', label: 'Address Proof Documents', stepKey: 'name_approval', clientUploads: true, mandatory: true },
      { serviceKey: 'incorporation', doctype: 'certificate_of_incorporation', label: 'Certificate of Incorporation', stepKey: 'completion', isDeliverable: true },
      { serviceKey: 'incorporation', doctype: 'company_pan', label: 'Company PAN Card', stepKey: 'completion', isDeliverable: true },
      { serviceKey: 'incorporation', doctype: 'moa_aoa', label: 'MoA & AoA (Final)', stepKey: 'completion', isDeliverable: true },

      // TDS Documents
      { serviceKey: 'tds_quarterly', doctype: 'payroll_register', label: 'Payroll Register', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'tds_quarterly', doctype: 'vendor_payments', label: 'Vendor Payment Details', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'tds_quarterly', doctype: 'pan_master', label: 'PAN Master List', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'tds_quarterly', doctype: 'challan_history', label: 'Previous Challan History', stepKey: 'data_compilation', clientUploads: true, mandatory: false },
      { serviceKey: 'tds_quarterly', doctype: 'tds_working', label: 'TDS Working Sheet', stepKey: 'tax_computation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'tds_quarterly', doctype: 'tds_challans', label: 'TDS Challans', stepKey: 'payment_processing', isDeliverable: true, clientUploads: false },
      { serviceKey: 'tds_quarterly', doctype: 'payment_receipts', label: 'TDS Payment Receipts', stepKey: 'payment_processing', isDeliverable: true, clientUploads: false },
      { serviceKey: 'tds_quarterly', doctype: 'tds_return_files', label: 'TDS Return Files (RPU/FVU)', stepKey: 'return_preparation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'tds_quarterly', doctype: 'tds_return_acks', label: 'TDS Return Acknowledgments', stepKey: 'return_filing', isDeliverable: true, clientUploads: false },
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
      { serviceKey: 'annual_filings_roc', doctype: 'agm_minutes', label: 'AGM Minutes', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'annual_filings_roc', doctype: 'shareholding_pattern', label: 'Shareholding Pattern', stepKey: 'data_compilation', clientUploads: true, mandatory: true },
      { serviceKey: 'annual_filings_roc', doctype: 'directors_report', label: 'Directors Report', stepKey: 'financial_review', clientUploads: false, mandatory: false },
      { serviceKey: 'annual_filings_roc', doctype: 'aoc4_draft', label: 'AOC-4 Draft', stepKey: 'aoc4_preparation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'annual_filings_roc', doctype: 'mgt7_draft', label: 'MGT-7 Draft', stepKey: 'mgt7_preparation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'annual_filings_roc', doctype: 'aoc4_receipt', label: 'AOC-4 Filing Receipt', stepKey: 'filing', isDeliverable: true },
      { serviceKey: 'annual_filings_roc', doctype: 'mgt7_receipt', label: 'MGT-7 Filing Receipt', stepKey: 'filing', isDeliverable: true }
      ,

      // GST Registration Documents
      { serviceKey: 'gst_registration', doctype: 'pan_card', label: 'PAN Card', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_registration', doctype: 'address_proof', label: 'Address Proof', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_registration', doctype: 'bank_proof', label: 'Bank Proof', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_registration', doctype: 'photo', label: 'Authorized Signatory Photo', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_registration', doctype: 'authorization_letter', label: 'Authorization Letter', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'gst_registration', doctype: 'gst_arn', label: 'GST ARN', stepKey: 'application_submission', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_registration', doctype: 'gst_certificate', label: 'GST Certificate', stepKey: 'gstin_issuance', isDeliverable: true, clientUploads: false },
      { serviceKey: 'gst_registration', doctype: 'gst_login_credentials', label: 'GST Login Credentials', stepKey: 'gstin_issuance', isDeliverable: true, clientUploads: false },

      // PF/ESI Documents
      { serviceKey: 'pf_esi_monthly', doctype: 'attendance_sheet', label: 'Attendance Sheet', stepKey: 'payroll_intake', clientUploads: true, mandatory: true },
      { serviceKey: 'pf_esi_monthly', doctype: 'employee_master', label: 'Employee Master', stepKey: 'payroll_intake', clientUploads: true, mandatory: true },
      { serviceKey: 'pf_esi_monthly', doctype: 'pf_ecr', label: 'PF ECR File', stepKey: 'pf_computation', isDeliverable: true, clientUploads: false },
      { serviceKey: 'pf_esi_monthly', doctype: 'pf_challan', label: 'PF Challan', stepKey: 'pf_payment', isDeliverable: true, clientUploads: false },
      { serviceKey: 'pf_esi_monthly', doctype: 'esi_challan', label: 'ESI Challan', stepKey: 'esi_processing', isDeliverable: true, clientUploads: false },
      { serviceKey: 'pf_esi_monthly', doctype: 'pf_esi_compliance_summary', label: 'PF/ESI Compliance Summary', stepKey: 'closure', isDeliverable: true, clientUploads: false },

      // FSSAI Documents
      { serviceKey: 'fssai_registration', doctype: 'identity_proof', label: 'Identity Proof', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'fssai_registration', doctype: 'address_proof', label: 'Address Proof', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'fssai_registration', doctype: 'product_list', label: 'Product List', stepKey: 'document_preparation', clientUploads: true, mandatory: true },
      { serviceKey: 'fssai_registration', doctype: 'kitchen_layout', label: 'Kitchen/Layout Plan', stepKey: 'document_preparation', clientUploads: true, mandatory: false },
      { serviceKey: 'fssai_registration', doctype: 'water_test_report', label: 'Water Test Report', stepKey: 'document_preparation', clientUploads: true, mandatory: false },
      { serviceKey: 'fssai_registration', doctype: 'fssai_application_id', label: 'FSSAI Application ID', stepKey: 'application_submission', isDeliverable: true, clientUploads: false },
      { serviceKey: 'fssai_registration', doctype: 'fssai_license', label: 'FSSAI License', stepKey: 'license_issuance', isDeliverable: true, clientUploads: false },

      // Shops & Establishments Documents
      { serviceKey: 'shops_establishments', doctype: 'employee_list', label: 'Employee List', stepKey: 'intake', clientUploads: true, mandatory: true },
      { serviceKey: 'shops_establishments', doctype: 'application_receipt', label: 'Application Receipt', stepKey: 'submission', isDeliverable: true, clientUploads: false },
      { serviceKey: 'shops_establishments', doctype: 'shops_certificate', label: 'Shops Registration Certificate', stepKey: 'certificate_issuance', isDeliverable: true, clientUploads: false },

      // Trade License Documents
      { serviceKey: 'trade_license', doctype: 'ownership_proof', label: 'Ownership/Lease Proof', stepKey: 'intake', clientUploads: true, mandatory: true },
      { serviceKey: 'trade_license', doctype: 'noc_landlord', label: 'Landlord NOC', stepKey: 'intake', clientUploads: true, mandatory: false },
      { serviceKey: 'trade_license', doctype: 'application_receipt', label: 'Application Receipt', stepKey: 'submission', isDeliverable: true, clientUploads: false },
      { serviceKey: 'trade_license', doctype: 'trade_license_certificate', label: 'Trade License Certificate', stepKey: 'license_issuance', isDeliverable: true, clientUploads: false }
    ];
    const existing = await db.select({
      serviceKey: serviceDocTypes.serviceKey,
      doctype: serviceDocTypes.doctype
    }).from(serviceDocTypes);

    const existingSet = new Set(existing.map(row => `${row.serviceKey}:${row.doctype}`));
    const toInsert = [];

    for (const docType of docTypes) {
      const key = `${docType.serviceKey}:${docType.doctype}`;
      if (!existingSet.has(key)) {
        existingSet.add(key);
        toInsert.push(docType);
      }
    }

    for (const service of SERVICE_CATALOG) {
      const defaults = buildDefaultDocTypes(service);
      for (const doc of defaults) {
        const key = `${service.serviceKey}:${doc.doctype}`;
        if (!existingSet.has(key)) {
          existingSet.add(key);
          toInsert.push({
            serviceKey: service.serviceKey,
            ...doc
          });
        }
      }
    }

    if (toInsert.length > 0) {
      await db.insert(serviceDocTypes).values(toInsert);
    }

    console.log(`✅ Seeded ${toInsert.length} document types`);
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

    const existing = await db
      .select({ serviceKey: dueDateMaster.serviceKey, jurisdiction: dueDateMaster.jurisdiction })
      .from(dueDateMaster)
      .where(eq(dueDateMaster.isActive, true));

    const existingSet = new Set(existing.map(row => `${row.serviceKey}:${row.jurisdiction}`));
    const toInsert = [];

    for (const rule of dueDateRules) {
      const key = `${rule.serviceKey}:${rule.jurisdiction}`;
      if (!existingSet.has(key)) {
        existingSet.add(key);
        toInsert.push({
          serviceKey: rule.serviceKey,
          jurisdiction: rule.jurisdiction,
          ruleJson: JSON.stringify(rule.ruleJson),
          effectiveFrom: new Date(rule.effectiveFrom)
        });
      }
    }

    for (const service of SERVICE_CATALOG) {
      const key = `${service.serviceKey}:IN`;
      if (!existingSet.has(key)) {
        existingSet.add(key);
        toInsert.push({
          serviceKey: service.serviceKey,
          jurisdiction: 'IN',
          ruleJson: JSON.stringify(buildDefaultDueDateRule(service.periodicity)),
          effectiveFrom: new Date()
        });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(dueDateMaster).values(toInsert);
    }

    console.log(`✅ Seeded ${toInsert.length} due date rules`);
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
