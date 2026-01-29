import { db } from './db';
import {
  serviceWorkflowStatuses,
  statusTransitionRules,
  servicesCatalog
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// WORKFLOW STATUS SEEDER
// Seeds default workflow statuses for all services
// ============================================================================

// Default statuses applicable to most services
const DEFAULT_STATUSES = [
  {
    statusCode: 'initiated',
    statusName: 'Service Initiated',
    statusDescription: 'Client has requested this service',
    statusCategory: 'milestone',
    isTerminal: false,
    displayOrder: 1,
    color: '#3b82f6',
    icon: 'play',
    triggerNotification: true,
    triggerTasks: true,
    clientVisible: true,
    clientStatusLabel: 'Request Received',
    clientMessage: 'Your service request has been received. Our team will begin processing shortly.'
  },
  {
    statusCode: 'docs_pending',
    statusName: 'Documents Pending',
    statusDescription: 'Waiting for client to upload required documents',
    statusCategory: 'process',
    isTerminal: false,
    displayOrder: 2,
    color: '#f59e0b',
    icon: 'file-text',
    requiresDocument: true,
    slaHours: 72,
    triggerNotification: true,
    clientVisible: true,
    clientStatusLabel: 'Documents Required',
    clientMessage: 'Please upload the required documents to proceed with your request.'
  },
  {
    statusCode: 'docs_uploaded',
    statusName: 'Documents Uploaded',
    statusDescription: 'Client has uploaded documents, pending review',
    statusCategory: 'process',
    isTerminal: false,
    displayOrder: 3,
    color: '#10b981',
    icon: 'check-circle',
    triggerNotification: true,
    triggerTasks: true,
    defaultAssigneeRole: 'ops_executive',
    clientVisible: true,
    clientStatusLabel: 'Documents Under Review',
    clientMessage: 'Your documents are being reviewed by our team.'
  },
  {
    statusCode: 'in_progress',
    statusName: 'In Progress',
    statusDescription: 'Service is being actively worked on',
    statusCategory: 'process',
    isTerminal: false,
    displayOrder: 4,
    color: '#6366f1',
    icon: 'loader',
    slaHours: 48,
    triggerTasks: true,
    defaultAssigneeRole: 'ops_executive',
    clientVisible: true,
    clientStatusLabel: 'Processing',
    clientMessage: 'Your request is being processed by our operations team.'
  },
  {
    statusCode: 'govt_submission',
    statusName: 'Government Submission',
    statusDescription: 'Filed with government authority',
    statusCategory: 'process',
    isTerminal: false,
    displayOrder: 5,
    color: '#8b5cf6',
    icon: 'send',
    triggerNotification: true,
    clientVisible: true,
    clientStatusLabel: 'Filed with Authority',
    clientMessage: 'Your application has been submitted to the relevant government authority.'
  },
  {
    statusCode: 'qc_review',
    statusName: 'QC Review',
    statusDescription: 'Quality check before delivery',
    statusCategory: 'process',
    isTerminal: false,
    displayOrder: 6,
    color: '#ec4899',
    icon: 'check-square',
    requiresApproval: true,
    slaHours: 24,
    triggerTasks: true,
    defaultAssigneeRole: 'qc_reviewer',
    clientVisible: true,
    clientStatusLabel: 'Quality Check',
    clientMessage: 'Your deliverables are undergoing quality review.'
  },
  {
    statusCode: 'ready_for_delivery',
    statusName: 'Ready for Delivery',
    statusDescription: 'QC passed, ready to deliver to client',
    statusCategory: 'milestone',
    isTerminal: false,
    displayOrder: 7,
    color: '#14b8a6',
    icon: 'package',
    triggerNotification: true,
    clientVisible: true,
    clientStatusLabel: 'Ready',
    clientMessage: 'Your deliverables are ready and will be shared shortly.'
  },
  {
    statusCode: 'completed',
    statusName: 'Completed',
    statusDescription: 'Service successfully completed and delivered',
    statusCategory: 'terminal',
    isTerminal: true,
    displayOrder: 8,
    color: '#22c55e',
    icon: 'check-circle-2',
    triggerNotification: true,
    clientVisible: true,
    clientStatusLabel: 'Completed',
    clientMessage: 'Your service has been completed. Thank you for choosing DigiComply!'
  },
  {
    statusCode: 'on_hold',
    statusName: 'On Hold',
    statusDescription: 'Service temporarily paused',
    statusCategory: 'process',
    isTerminal: false,
    displayOrder: 9,
    color: '#f97316',
    icon: 'pause-circle',
    triggerNotification: true,
    clientVisible: true,
    clientStatusLabel: 'On Hold',
    clientMessage: 'Your request is currently on hold. Our team will contact you for next steps.'
  },
  {
    statusCode: 'cancelled',
    statusName: 'Cancelled',
    statusDescription: 'Service request cancelled',
    statusCategory: 'terminal',
    isTerminal: true,
    displayOrder: 10,
    color: '#ef4444',
    icon: 'x-circle',
    triggerNotification: true,
    clientVisible: true,
    clientStatusLabel: 'Cancelled',
    clientMessage: 'This service request has been cancelled.'
  }
];

// Default transition rules
const DEFAULT_TRANSITIONS = [
  {
    fromStatusCode: 'initiated',
    toStatusCode: 'docs_pending',
    transitionName: 'Request Documents',
    buttonLabel: 'Request Documents',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 1
  },
  {
    fromStatusCode: 'initiated',
    toStatusCode: 'docs_uploaded',
    transitionName: 'Documents Already Provided',
    buttonLabel: 'Documents Provided',
    allowedRoles: ['ops_executive', 'admin', 'client'],
    displayOrder: 2
  },
  {
    fromStatusCode: 'docs_pending',
    toStatusCode: 'docs_uploaded',
    transitionName: 'Documents Received',
    buttonLabel: 'Mark Documents Received',
    allowedRoles: ['ops_executive', 'admin', 'client'],
    displayOrder: 1
  },
  {
    fromStatusCode: 'docs_uploaded',
    toStatusCode: 'in_progress',
    transitionName: 'Start Processing',
    buttonLabel: 'Start Processing',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 1
  },
  {
    fromStatusCode: 'in_progress',
    toStatusCode: 'govt_submission',
    transitionName: 'Submit to Government',
    buttonLabel: 'Mark as Submitted',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 1
  },
  {
    fromStatusCode: 'govt_submission',
    toStatusCode: 'qc_review',
    transitionName: 'Send for QC',
    buttonLabel: 'Send for QC',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 1
  },
  {
    fromStatusCode: 'in_progress',
    toStatusCode: 'qc_review',
    transitionName: 'Send for QC',
    buttonLabel: 'Send for QC',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 2
  },
  {
    fromStatusCode: 'qc_review',
    toStatusCode: 'ready_for_delivery',
    transitionName: 'QC Approved',
    buttonLabel: 'Approve QC',
    buttonColor: 'success',
    allowedRoles: ['qc_reviewer', 'admin'],
    requiresApproval: true,
    displayOrder: 1
  },
  {
    fromStatusCode: 'qc_review',
    toStatusCode: 'in_progress',
    transitionName: 'QC Rejected - Rework',
    buttonLabel: 'Return for Rework',
    buttonColor: 'warning',
    allowedRoles: ['qc_reviewer', 'admin'],
    displayOrder: 2
  },
  {
    fromStatusCode: 'ready_for_delivery',
    toStatusCode: 'completed',
    transitionName: 'Complete Delivery',
    buttonLabel: 'Mark Completed',
    buttonColor: 'success',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 1
  },
  {
    fromStatusCode: 'initiated',
    toStatusCode: 'on_hold',
    transitionName: 'Put on Hold',
    buttonLabel: 'Put on Hold',
    buttonColor: 'warning',
    confirmationRequired: true,
    confirmationMessage: 'Are you sure you want to put this request on hold?',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 10
  },
  {
    fromStatusCode: 'in_progress',
    toStatusCode: 'on_hold',
    transitionName: 'Put on Hold',
    buttonLabel: 'Put on Hold',
    buttonColor: 'warning',
    confirmationRequired: true,
    confirmationMessage: 'Are you sure you want to put this request on hold?',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 10
  },
  {
    fromStatusCode: 'on_hold',
    toStatusCode: 'in_progress',
    transitionName: 'Resume Processing',
    buttonLabel: 'Resume',
    allowedRoles: ['ops_executive', 'admin'],
    displayOrder: 1
  },
  {
    fromStatusCode: 'initiated',
    toStatusCode: 'cancelled',
    transitionName: 'Cancel Request',
    buttonLabel: 'Cancel',
    buttonColor: 'danger',
    confirmationRequired: true,
    confirmationMessage: 'Are you sure you want to cancel this request? This action cannot be undone.',
    allowedRoles: ['admin', 'client'],
    displayOrder: 20
  },
  {
    fromStatusCode: 'on_hold',
    toStatusCode: 'cancelled',
    transitionName: 'Cancel Request',
    buttonLabel: 'Cancel',
    buttonColor: 'danger',
    confirmationRequired: true,
    confirmationMessage: 'Are you sure you want to cancel this request?',
    allowedRoles: ['admin'],
    displayOrder: 20
  }
];

// Service-specific status customizations
const SERVICE_SPECIFIC_STATUSES: Record<string, any[]> = {
  // GST Registration needs additional status for ARN tracking
  'gst-registration': [
    ...DEFAULT_STATUSES.slice(0, 5),
    {
      statusCode: 'arn_received',
      statusName: 'ARN Received',
      statusDescription: 'Application Reference Number received from GST portal',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 5,
      color: '#0ea5e9',
      icon: 'hash',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Application Submitted',
      clientMessage: 'Your GST application has been submitted. ARN: Check portal for reference number.'
    },
    ...DEFAULT_STATUSES.slice(5)
  ],
  // Trademark has longer workflow
  'trademark-registration': [
    ...DEFAULT_STATUSES.slice(0, 5),
    {
      statusCode: 'tm_search_complete',
      statusName: 'TM Search Complete',
      statusDescription: 'Trademark search completed',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 3,
      color: '#0ea5e9',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Search Completed'
    },
    {
      statusCode: 'examination_pending',
      statusName: 'Examination Pending',
      statusDescription: 'Waiting for examiner review',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 6,
      color: '#8b5cf6',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Under Examination'
    },
    {
      statusCode: 'objection_received',
      statusName: 'Objection Received',
      statusDescription: 'Examiner raised objection',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 7,
      color: '#f59e0b',
      triggerNotification: true,
      triggerTasks: true,
      clientVisible: true,
      clientStatusLabel: 'Objection - Action Required'
    },
    {
      statusCode: 'published',
      statusName: 'Published in Journal',
      statusDescription: 'Trademark published for opposition',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 8,
      color: '#22c55e',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Published'
    },
    ...DEFAULT_STATUSES.slice(5)
  ]
};

// ============================================================================
// SEEDER FUNCTIONS
// ============================================================================

export async function seedDefaultStatusesForService(serviceKey: string): Promise<{
  statusesCreated: number;
  transitionsCreated: number;
}> {
  // Check if service already has custom statuses
  const existingStatuses = await db.select()
    .from(serviceWorkflowStatuses)
    .where(eq(serviceWorkflowStatuses.serviceKey, serviceKey))
    .limit(1);

  if (existingStatuses.length > 0) {
    console.log(`Service ${serviceKey} already has custom statuses, skipping`);
    return { statusesCreated: 0, transitionsCreated: 0 };
  }

  // Get statuses for this service (service-specific or default)
  const statuses = SERVICE_SPECIFIC_STATUSES[serviceKey] || DEFAULT_STATUSES;

  // Insert statuses
  let statusesCreated = 0;
  for (const status of statuses) {
    await db.insert(serviceWorkflowStatuses).values({
      serviceKey,
      ...status,
      isActive: true
    });
    statusesCreated++;
  }

  // Insert transition rules
  let transitionsCreated = 0;
  for (const transition of DEFAULT_TRANSITIONS) {
    await db.insert(statusTransitionRules).values({
      serviceKey,
      ...transition,
      isActive: true
    });
    transitionsCreated++;
  }

  console.log(`Seeded ${statusesCreated} statuses and ${transitionsCreated} transitions for ${serviceKey}`);
  return { statusesCreated, transitionsCreated };
}

export async function seedAllServiceStatuses(): Promise<{
  servicesProcessed: number;
  totalStatuses: number;
  totalTransitions: number;
}> {
  // Get all active services
  const services = await db.select()
    .from(servicesCatalog)
    .where(eq(servicesCatalog.isActive, true));

  let servicesProcessed = 0;
  let totalStatuses = 0;
  let totalTransitions = 0;

  for (const service of services) {
    try {
      const result = await seedDefaultStatusesForService(service.serviceKey);
      if (result.statusesCreated > 0) {
        servicesProcessed++;
        totalStatuses += result.statusesCreated;
        totalTransitions += result.transitionsCreated;
      }
    } catch (error) {
      console.error(`Error seeding statuses for ${service.serviceKey}:`, error);
    }
  }

  console.log(`
    ========================================
    WORKFLOW STATUS SEEDING COMPLETE
    ========================================
    Services processed: ${servicesProcessed}
    Total statuses created: ${totalStatuses}
    Total transitions created: ${totalTransitions}
    ========================================
  `);

  return { servicesProcessed, totalStatuses, totalTransitions };
}

export async function clearServiceStatuses(serviceKey: string): Promise<void> {
  await db.update(serviceWorkflowStatuses)
    .set({ isActive: false })
    .where(eq(serviceWorkflowStatuses.serviceKey, serviceKey));

  await db.update(statusTransitionRules)
    .set({ isActive: false })
    .where(eq(statusTransitionRules.serviceKey, serviceKey));

  console.log(`Cleared statuses for ${serviceKey}`);
}

// ============================================================================
// CLI RUNNER
// ============================================================================

// Run if called directly: npx ts-node server/seed-workflow-statuses.ts
if (require.main === module) {
  (async () => {
    console.log('Starting workflow status seeding...');
    const result = await seedAllServiceStatuses();
    console.log('Seeding complete:', result);
    process.exit(0);
  })().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
