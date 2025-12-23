/**
 * Seed Workflow Templates
 * Creates comprehensive workflow templates for each service
 */

exports.seed = async function(knex) {
  // Clear existing templates
  await knex('workflow_templates').del();
  
  // Get all services to create templates for
  const services = await knex('services').select('id', 'code', 'name');
  
  const workflowTemplates = [];
  
  for (const service of services) {
    let steps = [];
    let automationRules = {};
    
    switch (service.code) {
      case 'PVT_LTD_INC':
        steps = [
          {
            name: 'Document Collection',
            description: 'Collect all required documents from client',
            order: 1,
            estimated_hours: 2,
            assignee_role: 'service_executive',
            is_client_facing: true,
            required_documents: ['PAN Card of Directors', 'Aadhaar Card', 'Address Proof'],
            checklist: [
              'Verify PAN card validity',
              'Confirm Aadhaar linking',
              'Validate address proof'
            ]
          },
          {
            name: 'Name Search & Approval',
            description: 'Search and reserve company name with MCA',
            order: 2,
            estimated_hours: 24,
            assignee_role: 'service_executive',
            is_client_facing: true,
            checklist: [
              'Search name availability',
              'File name reservation application',
              'Obtain name approval'
            ]
          },
          {
            name: 'DIN & DSC Procurement',
            description: 'Obtain Director Identification Number and Digital Signature Certificate',
            order: 3,
            estimated_hours: 48,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Apply for DIN',
              'Process DSC application',
              'Verify DSC delivery'
            ]
          },
          {
            name: 'Incorporation Filing',
            description: 'File incorporation documents with MCA',
            order: 4,
            estimated_hours: 72,
            assignee_role: 'operations_manager',
            is_client_facing: false,
            checklist: [
              'Prepare incorporation forms',
              'File with MCA',
              'Track application status'
            ]
          },
          {
            name: 'Certificate Generation',
            description: 'Generate and deliver incorporation certificate and other documents',
            order: 5,
            estimated_hours: 24,
            assignee_role: 'service_executive',
            is_client_facing: true,
            deliverables: ['Certificate of Incorporation', 'PAN', 'TAN'],
            checklist: [
              'Download incorporation certificate',
              'Apply for company PAN',
              'Generate company documents'
            ]
          },
          {
            name: 'Bank Account Assistance',
            description: 'Assist with current account opening',
            order: 6,
            estimated_hours: 8,
            assignee_role: 'service_executive',
            is_client_facing: true,
            checklist: [
              'Prepare bank account documents',
              'Coordinate with bank',
              'Follow up on account opening'
            ]
          },
          {
            name: 'Compliance Calendar Setup',
            description: 'Setup compliance calendar and deliver to client',
            order: 7,
            estimated_hours: 2,
            assignee_role: 'service_executive',
            is_client_facing: true,
            deliverables: ['Compliance Calendar', 'Contact Information'],
            checklist: [
              'Generate compliance calendar',
              'Setup reminder system',
              'Brief client on obligations'
            ]
          }
        ];
        
        automationRules = {
          notifications: [
            {
              trigger: 'step_completion',
              step: 'Document Collection',
              template: 'documents_received',
              recipients: ['client']
            },
            {
              trigger: 'step_completion',
              step: 'Certificate Generation',
              template: 'incorporation_complete',
              recipients: ['client', 'assigned_user']
            }
          ],
          escalations: [
            {
              condition: 'step_overdue',
              hours: 24,
              action: 'notify_manager'
            }
          ]
        };
        break;
        
      case 'GST_REG':
        steps = [
          {
            name: 'Document Review',
            description: 'Review and validate all GST registration documents',
            order: 1,
            estimated_hours: 1,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Verify business registration',
              'Check PAN validity',
              'Validate address proof'
            ]
          },
          {
            name: 'GST Application Filing',
            description: 'File GST registration application online',
            order: 2,
            estimated_hours: 2,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Fill GST REG-01 form',
              'Upload documents',
              'Submit application'
            ]
          },
          {
            name: 'Follow-up & Clarifications',
            description: 'Handle any clarifications or additional requirements',
            order: 3,
            estimated_hours: 4,
            assignee_role: 'service_executive',
            is_client_facing: true,
            checklist: [
              'Monitor application status',
              'Handle clarifications',
              'Submit additional documents if needed'
            ]
          },
          {
            name: 'GSTIN Generation & Delivery',
            description: 'Obtain GSTIN and setup client portal access',
            order: 4,
            estimated_hours: 1,
            assignee_role: 'service_executive',
            is_client_facing: true,
            deliverables: ['GST Certificate', 'Login Credentials', 'Initial Filing Guide'],
            checklist: [
              'Download GST certificate',
              'Setup portal access',
              'Provide filing guidance'
            ]
          }
        ];
        break;
        
      case 'ITR_FILING':
        steps = [
          {
            name: 'Document Analysis',
            description: 'Analyze provided documents and identify additional requirements',
            order: 1,
            estimated_hours: 1,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Review Form 16',
              'Check investment proofs',
              'Identify missing documents'
            ]
          },
          {
            name: 'Tax Computation',
            description: 'Calculate tax liability and optimize deductions',
            order: 2,
            estimated_hours: 2,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Compute total income',
              'Apply deductions',
              'Calculate tax liability'
            ]
          },
          {
            name: 'ITR Preparation',
            description: 'Prepare and review income tax return',
            order: 3,
            estimated_hours: 1,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Fill appropriate ITR form',
              'Attach required documents',
              'Review for accuracy'
            ]
          },
          {
            name: 'Client Review & Filing',
            description: 'Get client approval and file return',
            order: 4,
            estimated_hours: 1,
            assignee_role: 'service_executive',
            is_client_facing: true,
            deliverables: ['Filed ITR', 'Acknowledgment', 'Refund Status'],
            checklist: [
              'Get client approval',
              'E-file return',
              'Generate acknowledgment'
            ]
          }
        ];
        break;
        
      case 'CONTRACT_DRAFT':
        steps = [
          {
            name: 'Requirement Analysis',
            description: 'Understand contract requirements and legal implications',
            order: 1,
            estimated_hours: 2,
            assignee_role: 'service_executive',
            is_client_facing: true,
            checklist: [
              'Understand business requirements',
              'Identify legal implications',
              'Define contract scope'
            ]
          },
          {
            name: 'Legal Research',
            description: 'Research applicable laws and precedents',
            order: 2,
            estimated_hours: 4,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Research applicable laws',
              'Review similar contracts',
              'Identify risk areas'
            ]
          },
          {
            name: 'Contract Drafting',
            description: 'Draft comprehensive contract document',
            order: 3,
            estimated_hours: 6,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: [
              'Draft contract clauses',
              'Include risk mitigation',
              'Ensure legal compliance'
            ]
          },
          {
            name: 'Review & Finalization',
            description: 'Review with client and finalize document',
            order: 4,
            estimated_hours: 2,
            assignee_role: 'service_executive',
            is_client_facing: true,
            deliverables: ['Final Contract', 'Risk Assessment', 'Execution Guide'],
            checklist: [
              'Client review session',
              'Incorporate feedback',
              'Provide execution guidance'
            ]
          }
        ];
        break;
        
      // Add more service-specific workflows...
      default:
        // Generic workflow for services without specific templates
        steps = [
          {
            name: 'Initial Assessment',
            description: 'Assess client requirements and document needs',
            order: 1,
            estimated_hours: 1,
            assignee_role: 'service_executive',
            is_client_facing: true,
            checklist: ['Review requirements', 'Identify documents needed']
          },
          {
            name: 'Processing',
            description: 'Process the service request',
            order: 2,
            estimated_hours: 8,
            assignee_role: 'service_executive',
            is_client_facing: false,
            checklist: ['Complete processing', 'Prepare deliverables']
          },
          {
            name: 'Quality Review',
            description: 'Quality check of completed work',
            order: 3,
            estimated_hours: 1,
            assignee_role: 'quality_reviewer',
            is_client_facing: false,
            checklist: ['Review quality', 'Approve for delivery']
          },
          {
            name: 'Delivery',
            description: 'Deliver completed work to client',
            order: 4,
            estimated_hours: 1,
            assignee_role: 'service_executive',
            is_client_facing: true,
            deliverables: ['Service Output'],
            checklist: ['Deliver to client', 'Get confirmation']
          }
        ];
    }
    
    workflowTemplates.push({
      service_id: service.id,
      name: `${service.name} - Standard Workflow`,
      description: `Standard workflow template for ${service.name}`,
      steps: JSON.stringify(steps),
      conditions: JSON.stringify({}),
      automation_rules: JSON.stringify(automationRules),
      is_default: true,
      is_active: true
    });
  }
  
  await knex('workflow_templates').insert(workflowTemplates);
  
  console.log(`✅ Seeded ${workflowTemplates.length} workflow templates for all services`);
};