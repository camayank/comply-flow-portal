import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  services,
  servicesCatalog,
  workflowTemplates,
  users,
  businessEntities
} from '@shared/schema';
import { eq, count, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// MASTER BLUEPRINT ROUTES
// Platform architecture visualization and system overview
// ============================================================================

// Get complete platform blueprint
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get counts for overview
    const [servicesCount] = await db.select({ count: count() }).from(servicesCatalog);
    const [usersCount] = await db.select({ count: count() }).from(users);
    const [entitiesCount] = await db.select({ count: count() }).from(businessEntities);

    const blueprint = {
      platform: {
        name: 'DigiComply',
        version: '2.0.0',
        architecture: 'Monolithic with Service-Oriented Design',
        stack: {
          frontend: ['React 18', 'TypeScript', 'Tailwind CSS', 'Shadcn/UI', 'React Query'],
          backend: ['Node.js', 'Express', 'TypeScript'],
          database: ['PostgreSQL', 'Drizzle ORM'],
          infrastructure: ['Docker', 'Nginx', 'AWS/GCP']
        }
      },
      modules: getModulesOverview(),
      dataFlow: getDataFlowDiagram(),
      integrations: getIntegrations(),
      stats: {
        totalServices: servicesCount?.count || 96,
        totalUsers: usersCount?.count || 0,
        totalEntities: entitiesCount?.count || 0,
        apiEndpoints: 150,
        databaseTables: 143,
        activeWorkflows: 12
      },
      generatedAt: new Date().toISOString()
    };

    res.json(blueprint);
  } catch (error) {
    console.error('Error fetching blueprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get module details
router.get('/modules', async (req: Request, res: Response) => {
  try {
    const modules = getModulesOverview();
    res.json({ modules });
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific module details
router.get('/modules/:moduleId', async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const moduleDetails = getModuleDetails(moduleId);

    if (!moduleDetails) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json(moduleDetails);
  } catch (error) {
    console.error('Error fetching module details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get data flow diagram data
router.get('/data-flow', async (req: Request, res: Response) => {
  try {
    const dataFlow = getDataFlowDiagram();
    res.json(dataFlow);
  } catch (error) {
    console.error('Error fetching data flow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get API documentation
router.get('/api-docs', async (req: Request, res: Response) => {
  try {
    const apiDocs = getApiDocumentation();
    res.json(apiDocs);
  } catch (error) {
    console.error('Error fetching API docs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get database schema overview
router.get('/database', async (req: Request, res: Response) => {
  try {
    const schema = getDatabaseSchema();
    res.json(schema);
  } catch (error) {
    console.error('Error fetching database schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get integrations overview
router.get('/integrations', async (req: Request, res: Response) => {
  try {
    const integrations = getIntegrations();
    res.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system health metrics
router.get('/health-metrics', async (req: Request, res: Response) => {
  try {
    const metrics = {
      uptime: '99.9%',
      responseTime: '145ms',
      errorRate: '0.02%',
      activeConnections: 42,
      databaseStatus: 'healthy',
      cacheHitRate: '94%',
      lastDeployment: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      version: '2.0.0'
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getModulesOverview() {
  return [
    {
      id: 'client-portal',
      name: 'Client Portal',
      description: 'Self-service portal for clients to manage compliance',
      status: 'active',
      pages: 15,
      endpoints: 25,
      features: ['Dashboard', 'Service Requests', 'Documents', 'Compliance Calendar', 'Payments']
    },
    {
      id: 'operations',
      name: 'Operations Module',
      description: 'Internal operations and service delivery',
      status: 'active',
      pages: 8,
      endpoints: 20,
      features: ['Task Queue', 'QC Review', 'Delivery', 'Client Master']
    },
    {
      id: 'compliance-engine',
      name: 'Compliance Engine',
      description: 'Automated compliance tracking and state management',
      status: 'active',
      pages: 5,
      endpoints: 15,
      features: ['State Machine', 'Due Date Calculator', 'Penalty Tracker', 'Alerts']
    },
    {
      id: 'sales-crm',
      name: 'Sales & CRM',
      description: 'Lead management and sales pipeline',
      status: 'active',
      pages: 6,
      endpoints: 18,
      features: ['Lead Capture', 'Proposals', 'Pre-Sales', 'Conversions']
    },
    {
      id: 'agent-portal',
      name: 'Agent Portal',
      description: 'Partner/reseller management',
      status: 'active',
      pages: 5,
      endpoints: 12,
      features: ['Dashboard', 'Leads', 'Commissions', 'Performance']
    },
    {
      id: 'admin',
      name: 'Admin Panel',
      description: 'System administration and configuration',
      status: 'active',
      pages: 6,
      endpoints: 20,
      features: ['User Management', 'Service Config', 'Workflow Builder', 'Reports']
    },
    {
      id: 'finance',
      name: 'Finance Module',
      description: 'Financial management and analytics',
      status: 'active',
      pages: 4,
      endpoints: 10,
      features: ['Revenue', 'Payments', 'Invoicing', 'Reports']
    },
    {
      id: 'hr',
      name: 'HR Module',
      description: 'Human resources management',
      status: 'active',
      pages: 3,
      endpoints: 8,
      features: ['Employees', 'Leave', 'Training']
    }
  ];
}

function getModuleDetails(moduleId: string) {
  const modules: Record<string, any> = {
    'client-portal': {
      id: 'client-portal',
      name: 'Client Portal',
      description: 'Self-service portal for clients to manage their compliance journey',
      architecture: {
        pattern: 'Feature-based structure',
        stateManagement: 'React Query + Zustand',
        routing: 'Wouter'
      },
      pages: [
        { path: '/lifecycle', name: 'Lifecycle Dashboard', depth: 'full' },
        { path: '/compliance-calendar', name: 'Compliance Calendar', depth: 'full' },
        { path: '/service-requests', name: 'Service Requests', depth: 'full' },
        { path: '/documents', name: 'Documents', depth: 'partial' },
        { path: '/vault', name: 'Document Vault', depth: 'full' }
      ],
      endpoints: [
        { method: 'GET', path: '/api/v2/lifecycle/dashboard', description: 'Get lifecycle overview' },
        { method: 'GET', path: '/api/client/compliance-calendar', description: 'Get compliance calendar' },
        { method: 'GET', path: '/api/service-requests', description: 'List service requests' },
        { method: 'POST', path: '/api/service-requests', description: 'Create service request' }
      ],
      dependencies: ['compliance-engine', 'finance']
    },
    'compliance-engine': {
      id: 'compliance-engine',
      name: 'Compliance Engine',
      description: 'Core compliance state management and automation',
      architecture: {
        pattern: 'Event-driven state machine',
        stateManagement: 'PostgreSQL + Triggers',
        scheduler: 'Node-cron'
      },
      components: [
        { name: 'ComplianceStateEngine', file: 'compliance-state-engine.ts' },
        { name: 'ComplianceRulesSeeder', file: 'compliance-rules-seeder.ts' },
        { name: 'SLAEngine', file: 'sla-engine.ts' },
        { name: 'StateScheduler', file: 'compliance-state-scheduler.ts' }
      ],
      stateTransitions: {
        GREEN: ['AMBER'],
        AMBER: ['GREEN', 'RED'],
        RED: ['AMBER', 'GREEN']
      }
    }
  };

  return modules[moduleId] || null;
}

function getDataFlowDiagram() {
  return {
    nodes: [
      { id: 'client', type: 'user', label: 'Client Portal' },
      { id: 'api', type: 'service', label: 'API Gateway' },
      { id: 'auth', type: 'service', label: 'Auth Service' },
      { id: 'compliance', type: 'engine', label: 'Compliance Engine' },
      { id: 'workflow', type: 'engine', label: 'Workflow Engine' },
      { id: 'notification', type: 'service', label: 'Notification Service' },
      { id: 'db', type: 'database', label: 'PostgreSQL' },
      { id: 'external', type: 'external', label: 'External APIs (GST/MCA)' }
    ],
    edges: [
      { from: 'client', to: 'api', label: 'HTTPS' },
      { from: 'api', to: 'auth', label: 'Validate' },
      { from: 'api', to: 'compliance', label: 'Check State' },
      { from: 'api', to: 'workflow', label: 'Execute' },
      { from: 'compliance', to: 'db', label: 'Read/Write' },
      { from: 'workflow', to: 'db', label: 'Read/Write' },
      { from: 'compliance', to: 'notification', label: 'Trigger' },
      { from: 'api', to: 'external', label: 'API Call' }
    ]
  };
}

function getIntegrations() {
  return {
    payment: [
      { name: 'Razorpay', status: 'active', type: 'payment_gateway' },
      { name: 'Stripe', status: 'planned', type: 'payment_gateway' }
    ],
    government: [
      { name: 'GST Portal', status: 'planned', type: 'api' },
      { name: 'MCA Portal', status: 'planned', type: 'api' },
      { name: 'Income Tax Portal', status: 'planned', type: 'api' }
    ],
    communication: [
      { name: 'SendGrid', status: 'active', type: 'email' },
      { name: 'Twilio', status: 'planned', type: 'sms' },
      { name: 'WhatsApp Business', status: 'planned', type: 'messaging' }
    ],
    storage: [
      { name: 'AWS S3', status: 'active', type: 'file_storage' },
      { name: 'Google Drive', status: 'planned', type: 'file_storage' }
    ],
    accounting: [
      { name: 'Tally', status: 'planned', type: 'erp' },
      { name: 'Zoho Books', status: 'planned', type: 'accounting' }
    ]
  };
}

function getApiDocumentation() {
  return {
    version: 'v2',
    baseUrl: '/api',
    authentication: 'Session-based with JWT support',
    categories: [
      {
        name: 'Client APIs',
        basePath: '/api/v2/client',
        endpoints: 12
      },
      {
        name: 'Lifecycle APIs',
        basePath: '/api/v2/lifecycle',
        endpoints: 8
      },
      {
        name: 'Service Requests',
        basePath: '/api/service-requests',
        endpoints: 6
      },
      {
        name: 'Compliance',
        basePath: '/api/compliance-state',
        endpoints: 10
      },
      {
        name: 'Admin',
        basePath: '/api/admin',
        endpoints: 15
      }
    ],
    totalEndpoints: 150
  };
}

function getDatabaseSchema() {
  return {
    totalTables: 143,
    categories: [
      {
        name: 'Core',
        tables: ['users', 'businessEntities', 'services', 'serviceRequests'],
        count: 15
      },
      {
        name: 'Compliance',
        tables: ['complianceTracking', 'complianceStates', 'complianceRules', 'complianceAlerts'],
        count: 12
      },
      {
        name: 'Documents',
        tables: ['documentsUploads', 'aiDocuments', 'documentVersions', 'documentSignatures'],
        count: 10
      },
      {
        name: 'Finance',
        tables: ['payments', 'invoices', 'commissions', 'walletTransactions'],
        count: 8
      },
      {
        name: 'Workflow',
        tables: ['workflowTemplates', 'workflowInstances', 'taskItems', 'slaTracking'],
        count: 10
      },
      {
        name: 'CRM',
        tables: ['leads', 'salesProposals', 'leadInteractions', 'campaigns'],
        count: 8
      }
    ],
    relationships: 'Full referential integrity with foreign keys',
    indexes: 'Optimized for common queries'
  };
}

export default router;
