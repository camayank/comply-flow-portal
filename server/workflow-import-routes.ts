import { Router, Request, Response } from 'express';
import { db } from './db';
import { workflowTemplates } from '@shared/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// WORKFLOW IMPORT & TEMPLATE MANAGEMENT ROUTES
// Import, export, and manage workflow templates
// ============================================================================

// Get all workflow templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;

    let templates = await db.select()
      .from(workflowTemplates)
      .orderBy(desc(workflowTemplates.createdAt))
      .limit(100);

    // If no templates exist, return default templates
    if (templates.length === 0) {
      templates = getDefaultWorkflowTemplates();
    }

    // Apply filters
    let filtered = templates;
    if (category) {
      filtered = filtered.filter((t: any) => t.category === category);
    }
    if (status) {
      filtered = filtered.filter((t: any) => t.isActive === (status === 'active'));
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter((t: any) =>
        t.name?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const total = filtered.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(startIndex, startIndex + Number(limit));

    res.json({
      templates: paginated,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = [
      { id: 'incorporation', name: 'Business Incorporation', count: 5 },
      { id: 'compliance', name: 'Compliance Filing', count: 12 },
      { id: 'tax', name: 'Tax Filing', count: 8 },
      { id: 'registration', name: 'Registrations', count: 6 },
      { id: 'audit', name: 'Audit & Review', count: 4 },
      { id: 'hr', name: 'HR & Payroll', count: 3 },
      { id: 'legal', name: 'Legal Services', count: 5 }
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single template details
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [template] = await db.select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, Number(id)))
      .limit(1);

    if (!template) {
      // Check default templates
      const defaults = getDefaultWorkflowTemplates();
      const defaultTemplate = defaults.find((t: any) => t.id === Number(id));

      if (defaultTemplate) {
        return res.json(defaultTemplate);
      }

      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import workflow template from JSON
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { template, overwrite = false } = req.body;

    if (!template || !template.name) {
      return res.status(400).json({ error: 'Invalid template format' });
    }

    // Check if template with same name exists
    const existing = await db.select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.name, template.name))
      .limit(1);

    if (existing.length > 0 && !overwrite) {
      return res.status(409).json({
        error: 'Template with this name already exists',
        existingId: existing[0].id,
        suggestion: 'Use overwrite=true to replace or rename the template'
      });
    }

    // Import the template
    const importedTemplate = {
      name: template.name,
      description: template.description,
      serviceKey: template.serviceKey,
      category: template.category || 'general',
      version: template.version || 1,
      stepsJson: JSON.stringify(template.steps || []),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (existing.length > 0 && overwrite) {
      const [updated] = await db.update(workflowTemplates)
        .set(importedTemplate)
        .where(eq(workflowTemplates.id, existing[0].id))
        .returning();

      return res.json({
        success: true,
        action: 'updated',
        template: updated
      });
    }

    const [created] = await db.insert(workflowTemplates)
      .values(importedTemplate)
      .returning();

    res.status(201).json({
      success: true,
      action: 'created',
      template: created
    });
  } catch (error) {
    console.error('Error importing template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export workflow template as JSON
router.get('/export/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [template] = await db.select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, Number(id)))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const exportData = {
      name: template.name,
      description: template.description,
      serviceKey: template.serviceKey,
      category: template.category,
      version: template.version,
      steps: template.stepsJson ? JSON.parse(template.stepsJson as string) : [],
      exportedAt: new Date().toISOString(),
      source: 'DigiComply'
    };

    res.setHeader('Content-Disposition', `attachment; filename="${template.name?.replace(/\s+/g, '_')}_workflow.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk import templates
router.post('/import/bulk', async (req: Request, res: Response) => {
  try {
    const { templates } = req.body;

    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ error: 'Invalid templates array' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const template of templates) {
      try {
        const importedTemplate = {
          name: template.name,
          description: template.description,
          serviceKey: template.serviceKey,
          category: template.category || 'general',
          version: template.version || 1,
          stepsJson: JSON.stringify(template.steps || []),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.insert(workflowTemplates).values(importedTemplate);
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          template: template.name,
          error: err.message
        });
      }
    }

    res.json({
      message: `Imported ${results.success} templates, ${results.failed} failed`,
      ...results
    });
  } catch (error) {
    console.error('Error bulk importing templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clone existing template
router.post('/templates/:id/clone', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    const [original] = await db.select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, Number(id)))
      .limit(1);

    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const clonedTemplate = {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      serviceKey: `${original.serviceKey}_copy_${Date.now()}`,
      category: original.category,
      version: 1,
      stepsJson: original.stepsJson,
      isActive: false, // Clones start inactive
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [created] = await db.insert(workflowTemplates)
      .values(clonedTemplate)
      .returning();

    res.status(201).json({
      success: true,
      template: created
    });
  } catch (error) {
    console.error('Error cloning template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate template structure
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { template } = req.body;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!template.name) errors.push('Template name is required');
    if (!template.serviceKey) errors.push('Service key is required');
    if (!template.steps || !Array.isArray(template.steps)) {
      errors.push('Steps array is required');
    } else {
      // Validate steps
      template.steps.forEach((step: any, index: number) => {
        if (!step.name) errors.push(`Step ${index + 1}: Name is required`);
        if (!step.type) errors.push(`Step ${index + 1}: Type is required`);
        if (step.assigneeRole && !['ops_executive', 'ops_manager', 'qc_reviewer', 'admin'].includes(step.assigneeRole)) {
          warnings.push(`Step ${index + 1}: Unknown assignee role "${step.assigneeRole}"`);
        }
      });

      // Check for orphan steps (no connection)
      if (template.steps.length > 1) {
        const hasEndStep = template.steps.some((s: any) => s.type === 'end' || s.isEndStep);
        if (!hasEndStep) warnings.push('Workflow has no defined end step');
      }
    }

    const isValid = errors.length === 0;

    res.json({
      isValid,
      errors,
      warnings,
      stepCount: template.steps?.length || 0
    });
  } catch (error) {
    console.error('Error validating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template library (pre-built templates)
router.get('/library', async (req: Request, res: Response) => {
  try {
    const library = getDefaultWorkflowTemplates();

    res.json({
      templates: library,
      total: library.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching template library:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDefaultWorkflowTemplates(): any[] {
  return [
    {
      id: 1,
      name: 'Private Limited Incorporation',
      description: 'Complete workflow for Pvt Ltd company registration',
      serviceKey: 'pvt-ltd-incorporation',
      category: 'incorporation',
      version: 1,
      isActive: true,
      steps: [
        { id: 1, name: 'Document Collection', type: 'document_upload', order: 1, assigneeRole: 'client' },
        { id: 2, name: 'Document Verification', type: 'review', order: 2, assigneeRole: 'ops_executive' },
        { id: 3, name: 'DSC Application', type: 'task', order: 3, assigneeRole: 'ops_executive' },
        { id: 4, name: 'Name Approval', type: 'task', order: 4, assigneeRole: 'ops_executive' },
        { id: 5, name: 'SPICe+ Filing', type: 'task', order: 5, assigneeRole: 'ops_executive' },
        { id: 6, name: 'QC Review', type: 'review', order: 6, assigneeRole: 'qc_reviewer' },
        { id: 7, name: 'Client Delivery', type: 'delivery', order: 7, assigneeRole: 'ops_executive' }
      ]
    },
    {
      id: 2,
      name: 'GST Registration',
      description: 'GST registration workflow',
      serviceKey: 'gst-registration',
      category: 'registration',
      version: 1,
      isActive: true,
      steps: [
        { id: 1, name: 'Document Collection', type: 'document_upload', order: 1, assigneeRole: 'client' },
        { id: 2, name: 'Application Preparation', type: 'task', order: 2, assigneeRole: 'ops_executive' },
        { id: 3, name: 'GST Portal Submission', type: 'task', order: 3, assigneeRole: 'ops_executive' },
        { id: 4, name: 'ARN Tracking', type: 'task', order: 4, assigneeRole: 'ops_executive' },
        { id: 5, name: 'Certificate Download', type: 'task', order: 5, assigneeRole: 'ops_executive' },
        { id: 6, name: 'Delivery', type: 'delivery', order: 6, assigneeRole: 'ops_executive' }
      ]
    },
    {
      id: 3,
      name: 'Monthly GST Return',
      description: 'GSTR-1 and GSTR-3B filing workflow',
      serviceKey: 'gst-return-monthly',
      category: 'tax',
      version: 1,
      isActive: true,
      steps: [
        { id: 1, name: 'Data Collection', type: 'document_upload', order: 1, assigneeRole: 'client' },
        { id: 2, name: 'Invoice Reconciliation', type: 'task', order: 2, assigneeRole: 'ops_executive' },
        { id: 3, name: 'GSTR-1 Preparation', type: 'task', order: 3, assigneeRole: 'ops_executive' },
        { id: 4, name: 'GSTR-3B Computation', type: 'task', order: 4, assigneeRole: 'ops_executive' },
        { id: 5, name: 'Filing & Payment', type: 'task', order: 5, assigneeRole: 'ops_executive' },
        { id: 6, name: 'Acknowledgment', type: 'delivery', order: 6, assigneeRole: 'ops_executive' }
      ]
    },
    {
      id: 4,
      name: 'Annual ROC Compliance',
      description: 'AOC-4 and MGT-7 filing workflow',
      serviceKey: 'annual-compliance-pvt',
      category: 'compliance',
      version: 1,
      isActive: true,
      steps: [
        { id: 1, name: 'Financial Data Collection', type: 'document_upload', order: 1, assigneeRole: 'client' },
        { id: 2, name: 'Financial Statement Preparation', type: 'task', order: 2, assigneeRole: 'ops_executive' },
        { id: 3, name: 'Board Meeting', type: 'task', order: 3, assigneeRole: 'ops_executive' },
        { id: 4, name: 'AOC-4 Preparation', type: 'task', order: 4, assigneeRole: 'ops_executive' },
        { id: 5, name: 'MGT-7 Preparation', type: 'task', order: 5, assigneeRole: 'ops_executive' },
        { id: 6, name: 'AGM Documentation', type: 'task', order: 6, assigneeRole: 'ops_executive' },
        { id: 7, name: 'QC Review', type: 'review', order: 7, assigneeRole: 'qc_reviewer' },
        { id: 8, name: 'Filing & Delivery', type: 'delivery', order: 8, assigneeRole: 'ops_executive' }
      ]
    },
    {
      id: 5,
      name: 'Trademark Registration',
      description: 'Trademark application and registration workflow',
      serviceKey: 'trademark-registration',
      category: 'legal',
      version: 1,
      isActive: true,
      steps: [
        { id: 1, name: 'TM Search', type: 'task', order: 1, assigneeRole: 'ops_executive' },
        { id: 2, name: 'Application Preparation', type: 'task', order: 2, assigneeRole: 'ops_executive' },
        { id: 3, name: 'Filing', type: 'task', order: 3, assigneeRole: 'ops_executive' },
        { id: 4, name: 'Examination Response', type: 'task', order: 4, assigneeRole: 'ops_executive' },
        { id: 5, name: 'Publication Monitoring', type: 'task', order: 5, assigneeRole: 'ops_executive' },
        { id: 6, name: 'Certificate Delivery', type: 'delivery', order: 6, assigneeRole: 'ops_executive' }
      ]
    }
  ];
}

export default router;
