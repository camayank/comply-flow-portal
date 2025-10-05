import { Express, Request, Response } from 'express';
import { db } from './db';
import { workflowTemplates, services } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, AuthenticatedRequest } from './rbac-middleware';

// ============================================================================
// GOOGLE SHEETS WORKFLOW IMPORT ROUTES
// Allows importing detailed service workflows from Google Sheets
// Converts sheet data to structured workflow templates with steps
// ============================================================================

export function registerGoogleSheetsImportRoutes(app: Express) {

  // Import workflow from Google Sheets URL
  app.post('/api/admin/import/google-sheets', 
    sessionAuthMiddleware, 
    requireMinimumRole(USER_ROLES.ADMIN), 
    async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sheetUrl, serviceKey, serviceName, serviceDescription } = req.body;

      if (!sheetUrl || !serviceKey || !serviceName) {
        return res.status(400).json({ 
          error: 'Sheet URL, service key, and service name are required' 
        });
      }

      // Convert Google Sheets edit URL to export URL
      const exportUrl = convertToExportUrl(sheetUrl);
      
      // Fetch sheet data
      const response = await fetch(exportUrl);
      const html = await response.text();
      
      // Parse HTML table to extract workflow steps
      const steps = parseGoogleSheetsHTML(html);

      if (!steps || steps.length === 0) {
        return res.status(400).json({ error: 'No valid workflow steps found in sheet' });
      }

      // Check if service exists
      let service = await db
        .select()
        .from(services)
        .where(eq(services.serviceId, serviceKey))
        .limit(1);

      // Create service if doesn't exist
      if (service.length === 0) {
        const [newService] = await db.insert(services).values({
          serviceId: serviceKey,
          name: serviceName,
          description: serviceDescription || `Imported from Google Sheets`,
          category: 'IMPORTED',
          type: 'ONE_TIME',
          price: 0,
          isActive: true
        }).returning();
        service = [newService];
      }

      // Get next version for this service
      const latestTemplate = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.serviceCode, serviceKey))
        .orderBy(desc(workflowTemplates.version))
        .limit(1);

      const nextVersion = latestTemplate.length > 0 ? latestTemplate[0].version + 1 : 1;

      // Deactivate previous versions
      if (latestTemplate.length > 0) {
        await db
          .update(workflowTemplates)
          .set({ isActive: false })
          .where(eq(workflowTemplates.serviceCode, serviceKey));
      }

      // Create workflow template
      const [template] = await db.insert(workflowTemplates).values({
        templateName: serviceName,
        serviceCode: serviceKey,
        workflowSteps: JSON.stringify(steps.map(s => ({
          stepKey: s.stepKey,
          name: s.name,
          description: s.description,
          slaDays: s.slaDays,
          qaRequired: s.qaRequired || false
        }))),
        version: nextVersion,
        isActive: true,
        globalTemplate: true,
        customForms: JSON.stringify([]),
        approvalNodes: JSON.stringify([]),
        escalationRules: JSON.stringify([]),
        createdBy: req.user?.id || 1
      }).returning();

      // Steps are stored in workflowSteps JSON field of template
      // Individual step records can be created if needed later

      res.json({
        success: true,
        template: {
          id: template.id,
          name: template.templateName,
          serviceCode: template.serviceCode,
          version: template.version,
          stepsCount: steps.length
        },
        steps: steps.map(s => ({
          stepKey: s.stepKey,
          name: s.name,
          slaDays: s.slaDays
        }))
      });

    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({ 
        error: 'Failed to import workflow', 
        details: error.message 
      });
    }
  });

  // Parse and preview workflow from Google Sheets (without saving)
  app.post('/api/admin/import/google-sheets/preview',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sheetUrl } = req.body;

      if (!sheetUrl) {
        return res.status(400).json({ error: 'Sheet URL is required' });
      }

      const exportUrl = convertToExportUrl(sheetUrl);
      const response = await fetch(exportUrl);
      const html = await response.text();
      const steps = parseGoogleSheetsHTML(html);

      if (!steps || steps.length === 0) {
        return res.status(400).json({ error: 'No valid workflow steps found in sheet' });
      }

      res.json({
        success: true,
        stepsCount: steps.length,
        steps: steps,
        summary: {
          totalSteps: steps.length,
          totalSLADays: steps.reduce((sum, s) => sum + s.slaDays, 0),
          qaSteps: steps.filter(s => s.qaRequired).length,
          clientSteps: steps.filter(s => s.isClientVisible).length
        }
      });

    } catch (error: any) {
      console.error('Preview error:', error);
      res.status(500).json({ 
        error: 'Failed to preview workflow', 
        details: error.message 
      });
    }
  });

  console.log('✅ Google Sheets Import routes registered');
}

// Convert Google Sheets edit URL to HTML export URL
function convertToExportUrl(sheetUrl: string): string {
  // Extract sheet ID from URL
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Invalid Google Sheets URL');
  }
  
  const sheetId = match[1];
  
  // Convert to HTML export URL
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:html`;
}

// Parse Google Sheets HTML to extract workflow steps
function parseGoogleSheetsHTML(html: string): any[] {
  const steps: any[] = [];
  
  // Simple HTML table parsing - looks for table rows
  const rowMatches = html.match(/<tr[^>]*>(.*?)<\/tr>/gs);
  
  if (!rowMatches) {
    return steps;
  }

  // Skip header row (first row)
  for (let i = 1; i < rowMatches.length; i++) {
    const row = rowMatches[i];
    const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs);
    
    if (!cells || cells.length < 4) continue;

    // Extract cell contents (remove HTML tags)
    const cleanCell = (cell: string) => 
      cell.replace(/<[^>]+>/g, '').trim();

    const stepNo = cleanCell(cells[0]);
    const task = cleanCell(cells[1]);
    const formsDocuments = cleanCell(cells[2]);
    const responsibleRole = cleanCell(cells[3]);
    const sla = cleanCell(cells[4] || '1 day');
    const deliverable = cleanCell(cells[5] || '');

    if (!stepNo || !task) continue;

    // Parse SLA to extract days
    const slaDays = parseSLA(sla);

    // Generate step key from step number and task
    const stepKey = `step_${stepNo.replace(/[^0-9]/g, '')}_${task
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .substring(0, 30)}`;

    steps.push({
      stepKey,
      name: task,
      description: `${task} - ${formsDocuments}`,
      formsDocuments,
      responsibleRole,
      slaDays,
      deliverable,
      qaRequired: task.toLowerCase().includes('review') || 
                  task.toLowerCase().includes('scrutiny') ||
                  task.toLowerCase().includes('validation'),
      isClientVisible: responsibleRole.toLowerCase().includes('client') ||
                      task.toLowerCase().includes('client'),
      assigneeRole: mapResponsibleRoleToSystem(responsibleRole)
    });
  }

  return steps;
}

// Parse SLA text to extract number of days
function parseSLA(slaText: string): number {
  // Extract number from text like "2 days", "1 day", "Same day", "3-5 days"
  if (slaText.toLowerCase().includes('same day')) return 0.5;
  if (slaText.toLowerCase().includes('30 days')) return 30;
  if (slaText.toLowerCase().includes('60 days')) return 60;
  if (slaText.toLowerCase().includes('180 days')) return 180;
  
  const match = slaText.match(/(\d+)[\s-]*(\d*)\s*day/i);
  if (match) {
    const num1 = parseInt(match[1]);
    const num2 = match[2] ? parseInt(match[2]) : num1;
    return Math.max(num1, num2); // Take the maximum if range given
  }
  
  return 1; // Default to 1 day
}

// Map responsible role from sheet to system role
function mapResponsibleRoleToSystem(responsibleRole: string): string {
  const role = responsibleRole.toLowerCase();
  
  if (role.includes('client')) return 'CLIENT';
  if (role.includes('cs') || role.includes('company secretary')) return 'CS';
  if (role.includes('roc') || role.includes('filing')) return 'ROC_FILING_TEAM';
  if (role.includes('dsc')) return 'DSC_TEAM';
  if (role.includes('account')) return 'ACCOUNTS';
  if (role.includes('ops') || role.includes('operation')) return 'OPS_EXECUTIVE';
  if (role.includes('compliance')) return 'COMPLIANCE_TEAM';
  if (role.includes('professional') || role.includes('ca') || role.includes('advocate')) 
    return 'PROFESSIONAL';
  
  return 'OPS_EXECUTIVE'; // Default
}
