/**
 * Enterprise Engine API Routes
 *
 * World-class compliance platform APIs for:
 * - Service Blueprints Engine
 * - Compliance Calendar Engine
 * - Jurisdictions & Rules Engine
 * - No-Code Builder (Custom Fields)
 * - AI Intelligence Layer
 *
 * @author DigiComply Enterprise Team
 * @version 2.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from './db';
import { eq, and, desc, asc, sql, ilike, or, inArray, gte, lte, between } from 'drizzle-orm';
import { blueprintService } from './services/blueprint-service';
import { complianceCalendarService } from './services/compliance-calendar-service';
import { requireAuth, requireRole, requireMinRole } from './auth-middleware';
import {
  serviceBlueprints,
  blueprintPricingTiers,
  blueprintWorkflowSteps,
  blueprintDocumentTypes,
  blueprintComplianceRules,
  blueprintChecklists,
  complianceCalendar,
  deadlineFormulas,
  penaltyRulesMaster,
  holidayCalendars,
  jurisdictions,
  jurisdictionRules,
  professionalTaxRates,
  customFieldDefinitions,
  customFieldValues,
  customFieldHistory,
  pageLayouts,
  automationRules,
  automationExecutionLog,
  documentExtractionTemplates,
  intelligentDocuments,
  aiPredictions,
  smartRecommendations,
  clientServiceSubscriptions,
} from '@shared/blueprints-schema';
import { nanoid } from 'nanoid';

const router = Router();

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// All enterprise routes require authentication
// ============================================================================
router.use(requireAuth);

// Admin-only routes get additional role check below
const requireAdmin = requireMinRole('admin');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createBlueprintSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['GST', 'INCOME_TAX', 'ROC', 'LABOR_LAW', 'RERA', 'FEMA', 'CUSTOMS', 'OTHER']),
  subCategory: z.string().optional(),
  jurisdictionType: z.enum(['CENTRAL', 'STATE', 'CITY', 'MULTI_STATE', 'INTERNATIONAL']),
  applicableJurisdictions: z.array(z.string()).optional(),
  entityTypes: z.array(z.string()).optional(),
  turnoverSlabs: z.array(z.object({
    min: z.number(),
    max: z.number().optional(),
    label: z.string()
  })).optional(),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'ON_OCCURRENCE', 'EVENT_BASED']),
  slaHours: z.number().int().positive().optional(),
  governmentPortal: z.string().optional(),
  formNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const createWorkflowStepSchema = z.object({
  stepCode: z.string().min(1),
  stepName: z.string().min(1),
  stepType: z.enum(['DATA_COLLECTION', 'DOCUMENT_UPLOAD', 'VERIFICATION', 'CALCULATION', 'GOVERNMENT_FILING', 'PAYMENT', 'ACKNOWLEDGMENT', 'QC_REVIEW', 'CLIENT_APPROVAL', 'DELIVERY', 'TASK', 'APPROVAL', 'REVIEW', 'DOCUMENT_COLLECTION', 'CLIENT_ACTION', 'AUTO', 'WAIT', 'DECISION']),
  description: z.string().optional(),
  defaultAssigneeRole: z.string().optional(),
  assignmentStrategy: z.enum(['ROUND_ROBIN', 'LEAST_LOADED', 'SKILL_BASED', 'MANUAL']).optional(),
  requiredSkills: z.array(z.string()).optional(),
  slaHours: z.number().int().positive().optional(),
  slaBusinessHoursOnly: z.boolean().optional(),
  warningThresholdPct: z.number().int().optional(),
  escalationAfterHours: z.number().int().optional(),
  escalationChain: z.array(z.object({ role: z.string(), afterHours: z.number() })).optional(),
  requiredDocuments: z.array(z.string()).optional(),
  requiredFields: z.array(z.string()).optional(),
  autoActions: z.array(z.object({ trigger: z.string(), action: z.string(), config: z.record(z.any()) })).optional(),
});

const createPricingTierSchema = z.object({
  tierName: z.string().min(1),
  tierCode: z.string().min(1),
  basePrice: z.number().nonnegative(),
  gstRate: z.number().nonnegative().default(18),
  conditions: z.record(z.any()).optional(),
  entityTypeCondition: z.string().optional(),
  turnoverMin: z.number().nonnegative().optional(),
  turnoverMax: z.number().nonnegative().optional(),
  stateCondition: z.string().optional(),
  addOnServices: z.array(z.object({
    code: z.string(),
    name: z.string(),
    price: z.number()
  })).optional(),
  discountRules: z.array(z.object({
    type: z.string(),
    value: z.number(),
    conditions: z.record(z.any()).optional()
  })).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

const createComplianceRuleSchema = z.object({
  ruleCode: z.string().min(1),
  ruleName: z.string().min(1),
  ruleType: z.enum(['DEADLINE', 'PENALTY', 'EXEMPTION', 'THRESHOLD', 'RATE', 'VALIDATION']),
  description: z.string().optional(),
  conditions: z.record(z.any()).optional(),
  formulaId: z.string().optional(),
  penaltyRuleId: z.string().optional(),
  priority: z.number().int().default(100),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});

const createDocumentTypeSchema = z.object({
  documentCode: z.string().min(1),
  documentName: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  isRequired: z.boolean().default(true),
  acceptedFormats: z.array(z.string()).optional(),
  maxSizeMb: z.number().positive().optional(),
  validationRules: z.record(z.any()).optional(),
  extractionTemplateId: z.string().optional(),
  sampleUrl: z.string().optional(),
  instructions: z.string().optional(),
  forStep: z.string().optional(),
});

const subscribeClientSchema = z.object({
  clientId: z.string().min(1),
  businessEntityId: z.string().min(1),
  pricingTierId: z.string().optional(),
  fiscalYearStart: z.string().optional(),
  customConfig: z.record(z.any()).optional(),
});

const calculateDeadlineSchema = z.object({
  formulaId: z.string().min(1),
  referenceDate: z.string(),
  jurisdictionId: z.string().optional(),
  parameters: z.record(z.any()).optional(),
});

const calculatePenaltySchema = z.object({
  penaltyRuleId: z.string().min(1),
  dueDate: z.string(),
  filingDate: z.string().optional(),
  taxAmount: z.number().nonnegative().optional(),
  parameters: z.record(z.any()).optional(),
});

const generateCalendarSchema = z.object({
  clientId: z.string().min(1),
  blueprintIds: z.array(z.string()).min(1),
  fiscalYearStart: z.string(),
  fiscalYearEnd: z.string(),
  parameters: z.record(z.any()).optional(),
});

const createCustomFieldSchema = z.object({
  entityType: z.string().min(1),
  fieldCode: z.string().min(1),
  fieldLabel: z.string().min(1),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'EMAIL', 'PHONE', 'URL', 'CURRENCY', 'PERCENTAGE', 'FILE', 'RICH_TEXT', 'LOOKUP', 'FORMULA', 'DECIMAL']),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  defaultValue: z.string().optional(),
  isRequired: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  validationRules: z.array(z.any()).optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional(),
    icon: z.string().optional()
  })).optional(),
  optionsSource: z.enum(['STATIC', 'API', 'LOOKUP']).optional(),
  optionsApiEndpoint: z.string().optional(),
  lookupEntity: z.string().optional(),
  lookupDisplayField: z.string().optional(),
  lookupValueField: z.string().optional(),
  lookupFilters: z.record(z.any()).optional(),
  formulaExpression: z.string().optional(),
  formulaDependencies: z.array(z.string()).optional(),
  displayOrder: z.number().int().optional(),
  groupName: z.string().optional(),
  conditionalDisplay: z.record(z.any()).optional(),
});

const createAutomationRuleSchema = z.object({
  ruleCode: z.string().min(1),
  ruleName: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  triggerType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'FIELD_CHANGE', 'SCHEDULED', 'MANUAL', 'WEBHOOK']),
  triggerEntity: z.string().min(1),
  triggerConditions: z.record(z.any()).optional(),
  triggerFields: z.array(z.string()).optional(),
  scheduleCron: z.string().optional(),
  scheduleTimezone: z.string().optional(),
  filterConditions: z.array(z.any()).optional(),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.any())
  })).min(1),
  isActive: z.boolean().default(true),
  executionOrder: z.number().int().default(0),
  stopOnError: z.boolean().default(false),
  retryOnError: z.boolean().default(true),
  maxRetries: z.number().int().default(3),
});

const createJurisdictionSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  shortName: z.string().max(50).optional(),
  level: z.enum(['COUNTRY', 'STATE', 'CITY', 'ZONE']),
  parentId: z.string().optional(),
  path: z.string().optional(),
  gstStateCode: z.string().max(2).optional(),
  tinPrefix: z.string().max(4).optional(),
  stateCode: z.string().max(5).optional(),
  defaultCurrency: z.string().max(3).default('INR'),
  timezone: z.string().max(50).default('Asia/Kolkata'),
  locale: z.string().max(10).default('en-IN'),
  dateFormat: z.string().max(20).default('DD/MM/YYYY'),
  taxAuthorityName: z.string().optional(),
  taxAuthorityWebsite: z.string().optional(),
  helplineNumber: z.string().optional(),
});

const createExtractionTemplateSchema = z.object({
  templateCode: z.string().min(1),
  templateName: z.string().min(1),
  documentType: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.string(),
    pattern: z.string().optional(),
    required: z.boolean().optional(),
    confidenceThreshold: z.number().optional(),
    locationHint: z.string().optional(),
  })),
  validationRules: z.array(z.any()).optional(),
  ocrProvider: z.enum(['GOOGLE_VISION', 'AWS_TEXTRACT', 'AZURE_FORM_RECOGNIZER', 'CUSTOM']).default('GOOGLE_VISION'),
  ocrConfig: z.record(z.any()).optional(),
  preProcessing: z.array(z.any()).optional(),
  postProcessing: z.array(z.any()).optional(),
  sampleDocumentUrl: z.string().optional(),
  annotatedSampleUrl: z.string().optional(),
});

// ============================================================================
// SERVICE BLUEPRINTS ROUTES
// ============================================================================

// List all blueprints with filtering
router.get('/blueprints', async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      serviceType,
      status,
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const results = await blueprintService.searchBlueprints({
      search: search as string,
      category: category as string | undefined,
      serviceType: serviceType as string | undefined,
      status: status as string | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching blueprints:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single blueprint with full details
router.get('/blueprints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeRelated = req.query.includeRelated !== 'false';

    const blueprint = await blueprintService.getBlueprintById(id, includeRelated);

    if (!blueprint) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }

    res.json(blueprint);
  } catch (error: any) {
    console.error('Error fetching blueprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get blueprint by code
router.get('/blueprints/code/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const blueprint = await blueprintService.getBlueprintByCode(code);

    if (!blueprint) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }

    res.json(blueprint);
  } catch (error: any) {
    console.error('Error fetching blueprint by code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new blueprint
// SECURITY: Requires admin role to create blueprints
router.post('/blueprints', requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const createdBy = (req as any).user?.id || 'system';

    const data = createBlueprintSchema.parse(req.body);

    const blueprint = await blueprintService.createBlueprint({
      ...data,
      tenantId,
      createdBy,
    });

    res.status(201).json(blueprint);
  } catch (error: any) {
    console.error('Error creating blueprint:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update blueprint
// SECURITY: Requires admin role to update blueprints
router.put('/blueprints/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedBy = (req as any).user?.id;
    const updates = req.body;

    const blueprint = await blueprintService.updateBlueprint({ id, updatedBy, ...updates });

    if (!blueprint) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }

    res.json(blueprint);
  } catch (error: any) {
    console.error('Error updating blueprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete blueprint (soft delete)
// SECURITY: Requires admin role to delete blueprints
router.delete('/blueprints/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await blueprintService.deleteBlueprint(id);

    if (!success) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }

    res.json({ message: 'Blueprint deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting blueprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clone blueprint
// SECURITY: Requires admin role to clone blueprints
router.post('/blueprints/:id/clone', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newCode, newName } = req.body;
    const createdBy = (req as any).user?.id || 'system';

    if (!newCode || !newName) {
      return res.status(400).json({ error: 'newCode and newName are required' });
    }

    const cloned = await blueprintService.cloneBlueprint(id, newCode, newName, createdBy);
    res.status(201).json(cloned);
  } catch (error: any) {
    console.error('Error cloning blueprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Activate blueprint
// SECURITY: Requires admin role to activate blueprints
router.post('/blueprints/:id/activate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blueprint = await blueprintService.activateBlueprint(id);
    res.json(blueprint);
  } catch (error: any) {
    console.error('Error activating blueprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deactivate blueprint
// SECURITY: Requires admin role to deactivate blueprints
router.post('/blueprints/:id/deactivate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blueprint = await blueprintService.deactivateBlueprint(id);
    res.json(blueprint);
  } catch (error: any) {
    console.error('Error deactivating blueprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get blueprint categories
router.get('/blueprints/meta/categories', async (req: Request, res: Response) => {
  try {
    const categories = await db
      .select({
        category: serviceBlueprints.category,
        count: sql<number>`count(*)::int`
      })
      .from(serviceBlueprints)
      .where(eq(serviceBlueprints.isActive, true))
      .groupBy(serviceBlueprints.category);

    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WORKFLOW STEPS ROUTES
// ============================================================================

// Get workflow steps for a blueprint
router.get('/blueprints/:blueprintId/workflow-steps', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const steps = await blueprintService.getWorkflowSteps(blueprintId);
    res.json(steps);
  } catch (error: any) {
    console.error('Error fetching workflow steps:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add workflow step to blueprint
router.post('/blueprints/:blueprintId/workflow-steps', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const createdBy = (req as any).user?.id || 'system';

    const data = createWorkflowStepSchema.parse(req.body);

    const step = await blueprintService.addWorkflowStep(blueprintId, data);

    res.status(201).json(step);
  } catch (error: any) {
    console.error('Error adding workflow step:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update workflow step
router.put('/blueprints/:blueprintId/workflow-steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const updates = req.body;

    const step = await blueprintService.updateWorkflowStep(stepId, updates);

    if (!step) {
      return res.status(404).json({ error: 'Workflow step not found' });
    }

    res.json(step);
  } catch (error: any) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete workflow step
router.delete('/blueprints/:blueprintId/workflow-steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const success = await blueprintService.deleteWorkflowStep(stepId);

    if (!success) {
      return res.status(404).json({ error: 'Workflow step not found' });
    }

    res.json({ message: 'Workflow step deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting workflow step:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reorder workflow steps
router.post('/blueprints/:blueprintId/workflow-steps/reorder', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const { stepOrder } = req.body;

    if (!Array.isArray(stepOrder)) {
      return res.status(400).json({ error: 'stepOrder must be an array of step IDs' });
    }

    await blueprintService.reorderWorkflowSteps(blueprintId, stepOrder);
    res.json({ message: 'Workflow steps reordered successfully' });
  } catch (error: any) {
    console.error('Error reordering workflow steps:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PRICING TIERS ROUTES
// ============================================================================

// Get pricing tiers for a blueprint
router.get('/blueprints/:blueprintId/pricing-tiers', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const tiers = await blueprintService.getPricingTiers(blueprintId);
    res.json(tiers);
  } catch (error: any) {
    console.error('Error fetching pricing tiers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add pricing tier
router.post('/blueprints/:blueprintId/pricing-tiers', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const data = createPricingTierSchema.parse(req.body);

    const tier = await blueprintService.addPricingTier(blueprintId, {
      ...data,
      basePrice: String(data.basePrice),
    });
    res.status(201).json(tier);
  } catch (error: any) {
    console.error('Error adding pricing tier:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update pricing tier
router.put('/blueprints/:blueprintId/pricing-tiers/:tierId', async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const updates = req.body;

    const tier = await blueprintService.updatePricingTier(tierId, updates);

    if (!tier) {
      return res.status(404).json({ error: 'Pricing tier not found' });
    }

    res.json(tier);
  } catch (error: any) {
    console.error('Error updating pricing tier:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete pricing tier
router.delete('/blueprints/:blueprintId/pricing-tiers/:tierId', async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const success = await blueprintService.deletePricingTier(tierId);

    if (!success) {
      return res.status(404).json({ error: 'Pricing tier not found' });
    }

    res.json({ message: 'Pricing tier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting pricing tier:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate price
router.post('/blueprints/:blueprintId/calculate-price', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const { entityType, turnover, state, quantity, isUrgent, isSuperUrgent, isLoyaltyMember } = req.body;

    const price = await blueprintService.calculatePrice(blueprintId, {
      entityType,
      turnover,
      state,
      quantity,
      isUrgent,
      isSuperUrgent,
      isLoyaltyMember,
    });

    res.json(price);
  } catch (error: any) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DOCUMENT TYPES ROUTES
// ============================================================================

// Get document types for a blueprint
router.get('/blueprints/:blueprintId/document-types', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;

    const documents = await db
      .select()
      .from(blueprintDocumentTypes)
      .where(and(
        eq(blueprintDocumentTypes.blueprintId, blueprintId),
        eq(blueprintDocumentTypes.isActive, true)
      ))
      .orderBy(asc(blueprintDocumentTypes.sortOrder));

    res.json(documents);
  } catch (error: any) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add document type
router.post('/blueprints/:blueprintId/document-types', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const data = createDocumentTypeSchema.parse(req.body);

    const document = await blueprintService.addDocumentType(blueprintId, {
      ...data,
      category: data.category as 'IDENTITY' | 'FINANCIAL' | 'LEGAL' | 'TAX' | 'SUPPORTING' | undefined,
      isMandatory: data.isRequired,
    });
    res.status(201).json(document);
  } catch (error: any) {
    console.error('Error adding document type:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update document type
router.put('/blueprints/:blueprintId/document-types/:docId', async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    const updates = req.body;

    const [document] = await db
      .update(blueprintDocumentTypes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blueprintDocumentTypes.id, docId))
      .returning();

    if (!document) {
      return res.status(404).json({ error: 'Document type not found' });
    }

    res.json(document);
  } catch (error: any) {
    console.error('Error updating document type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document type
router.delete('/blueprints/:blueprintId/document-types/:docId', async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;

    const document = await blueprintService.deleteDocumentType(docId);

    if (!document) {
      return res.status(404).json({ error: 'Document type not found' });
    }

    res.json({ message: 'Document type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document type:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMPLIANCE RULES ROUTES
// ============================================================================

// Get compliance rules for a blueprint
router.get('/blueprints/:blueprintId/compliance-rules', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const { ruleType } = req.query;

    const rules = await blueprintService.getComplianceRules(blueprintId);

    if (ruleType) {
      return res.json(rules.filter(r => r.ruleType === ruleType));
    }

    res.json(rules);
  } catch (error: any) {
    console.error('Error fetching compliance rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add compliance rule
router.post('/blueprints/:blueprintId/compliance-rules', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const data = createComplianceRuleSchema.parse(req.body);

    const rule = await blueprintService.addComplianceRule(blueprintId, data);
    res.status(201).json(rule);
  } catch (error: any) {
    console.error('Error adding compliance rule:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update compliance rule
router.put('/blueprints/:blueprintId/compliance-rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const [rule] = await db
      .update(blueprintComplianceRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blueprintComplianceRules.id, ruleId))
      .returning();

    if (!rule) {
      return res.status(404).json({ error: 'Compliance rule not found' });
    }

    res.json(rule);
  } catch (error: any) {
    console.error('Error updating compliance rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete compliance rule
router.delete('/blueprints/:blueprintId/compliance-rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;

    const deleted = await blueprintService.deleteComplianceRule(ruleId);

    if (!deleted) {
      return res.status(404).json({ error: 'Compliance rule not found' });
    }

    res.json({ message: 'Compliance rule deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting compliance rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CLIENT SUBSCRIPTIONS ROUTES
// ============================================================================

// Subscribe client to blueprint
router.post('/blueprints/:blueprintId/subscriptions', async (req: Request, res: Response) => {
  try {
    const { blueprintId } = req.params;
    const tenantId = (req as any).user?.tenantId || 'default';
    const createdBy = (req as any).user?.id;

    const data = subscribeClientSchema.parse(req.body);

    const subscription = await blueprintService.subscribeClient({
      blueprintId,
      clientId: parseInt(data.clientId, 10),
      entityId: data.businessEntityId ? parseInt(data.businessEntityId, 10) : undefined,
      tenantId,
      pricingTierId: data.pricingTierId,
      startDate: data.fiscalYearStart || new Date().toISOString().split('T')[0],
      configOverrides: data.customConfig,
      createdBy,
    });

    res.status(201).json(subscription);
  } catch (error: any) {
    console.error('Error subscribing client:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get client subscriptions
router.get('/clients/:clientId/subscriptions', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const subscriptions = await blueprintService.getClientSubscriptions(
      parseInt(clientId, 10)
    );

    res.json(subscriptions);
  } catch (error: any) {
    console.error('Error fetching client subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/subscriptions/:subscriptionId/cancel', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    await blueprintService.cancelSubscription(subscriptionId, reason);
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMPLIANCE CALENDAR ROUTES
// ============================================================================

// Get upcoming deadlines
router.get('/calendar/upcoming', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { daysAhead = '30', clientId } = req.query;

    const deadlines = await complianceCalendarService.getUpcomingDeadlines(
      tenantId,
      parseInt(daysAhead as string),
      clientId ? parseInt(clientId as string, 10) : undefined
    );

    res.json(deadlines);
  } catch (error: any) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get overdue deadlines
router.get('/calendar/overdue', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { clientId } = req.query;

    const overdue = await complianceCalendarService.getOverdueDeadlines(
      tenantId,
      clientId ? parseInt(clientId as string, 10) : undefined
    );

    res.json(overdue);
  } catch (error: any) {
    console.error('Error fetching overdue deadlines:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get calendar for client
router.get('/calendar/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, status, blueprintId } = req.query;

    const entries = await complianceCalendarService.getCalendarEntries({
      clientId: parseInt(clientId, 10),
      fromDate: startDate as string | undefined,
      toDate: endDate as string | undefined,
      status: status as string | undefined,
      blueprintId: blueprintId as string | undefined,
    });

    res.json(entries);
  } catch (error: any) {
    console.error('Error fetching client calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate calendar for client
router.post('/calendar/generate', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const data = generateCalendarSchema.parse(req.body);

    const entries = await complianceCalendarService.generateCalendarForBlueprints({
      tenantId,
      clientId: parseInt(data.clientId, 10),
      blueprintIds: data.blueprintIds,
      fiscalYearStart: data.fiscalYearStart,
      fiscalYearEnd: data.fiscalYearEnd,
    });

    res.status(201).json({
      message: 'Calendar generated successfully',
      entriesCreated: entries.length,
      entries,
    });
  } catch (error: any) {
    console.error('Error generating calendar:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Calculate deadline
router.post('/calendar/calculate-deadline', async (req: Request, res: Response) => {
  try {
    const data = calculateDeadlineSchema.parse(req.body);
    const params = data.parameters || {};

    const deadline = await complianceCalendarService.calculateDeadline({
      baseDateType: (params.baseDateType as string) || 'PERIOD_END',
      periodEnd: data.referenceDate,
      jurisdictionId: data.jurisdictionId,
      offsetDays: params.offsetDays as number | undefined,
      offsetMonths: params.offsetMonths as number | undefined,
      adjustmentRule: params.adjustmentRule as 'NEXT_WORKING_DAY' | 'PREVIOUS_WORKING_DAY' | 'NONE' | undefined,
    });

    res.json({ deadline });
  } catch (error: any) {
    console.error('Error calculating deadline:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Calculate penalty
router.post('/calendar/calculate-penalty', async (req: Request, res: Response) => {
  try {
    const data = calculatePenaltySchema.parse(req.body);
    const params = data.parameters || {};

    const penalty = complianceCalendarService.calculatePenalty({
      penaltyType: (params.penaltyType as any) || 'DAILY',
      dueDate: data.dueDate,
      filedDate: data.filingDate,
      taxLiability: data.taxAmount,
      dailyAmount: params.dailyAmount as number | undefined,
      flatAmount: params.flatAmount as number | undefined,
      interestRateAnnual: params.interestRateAnnual as number | undefined,
      maxPenalty: params.maxPenalty as number | undefined,
      maxDays: params.maxDays as number | undefined,
    });

    res.json(penalty);
  } catch (error: any) {
    console.error('Error calculating penalty:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Mark as filed
router.post('/calendar/:entryId/filed', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const completedBy = (req as any).user?.id;
    const { filedDate, filingReference, filingProofUrl } = req.body;

    const entry = await complianceCalendarService.markAsFiled(
      entryId,
      filedDate || new Date().toISOString().split('T')[0],
      filingReference,
      filingProofUrl,
      completedBy
    );

    res.json(entry);
  } catch (error: any) {
    console.error('Error marking as filed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Grant extension
router.post('/calendar/:entryId/extension', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const approvedBy = (req as any).user?.id;
    const { newDueDate, reason } = req.body;

    if (!newDueDate || !reason) {
      return res.status(400).json({ error: 'newDueDate and reason are required' });
    }

    const entry = await complianceCalendarService.grantExtension(
      entryId,
      newDueDate,
      reason,
      approvedBy
    );

    res.json(entry);
  } catch (error: any) {
    console.error('Error granting extension:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/calendar/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { fiscalYear } = req.query;

    const stats = await complianceCalendarService.getDashboardStats(
      tenantId,
      fiscalYear as string
    );

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DEADLINE FORMULAS ROUTES
// ============================================================================

// Get all deadline formulas
router.get('/deadline-formulas', async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;

    let conditions = [eq(deadlineFormulas.isActive, true)];

    if (category) {
      conditions.push(eq(deadlineFormulas.category, category as string));
    }

    let formulas = await db
      .select()
      .from(deadlineFormulas)
      .where(and(...conditions))
      .orderBy(asc(deadlineFormulas.category), asc(deadlineFormulas.name));

    if (search) {
      const searchLower = (search as string).toLowerCase();
      formulas = formulas.filter(f =>
        f.name.toLowerCase().includes(searchLower) ||
        f.code.toLowerCase().includes(searchLower) ||
        f.description?.toLowerCase().includes(searchLower)
      );
    }

    res.json(formulas);
  } catch (error: any) {
    console.error('Error fetching deadline formulas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single formula
router.get('/deadline-formulas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [formula] = await db
      .select()
      .from(deadlineFormulas)
      .where(eq(deadlineFormulas.id, id));

    if (!formula) {
      return res.status(404).json({ error: 'Deadline formula not found' });
    }

    res.json(formula);
  } catch (error: any) {
    console.error('Error fetching deadline formula:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create deadline formula
router.post('/deadline-formulas', async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      category,
      description,
      baseDateType,
      offsetDays,
      offsetMonths,
      offsetYears,
      adjustmentRule,
      excludeWeekends,
      excludeHolidays,
      applicablePeriods,
      applicableJurisdictions,
      exampleCalculation,
    } = req.body;

    const [formula] = await db
      .insert(deadlineFormulas)
      .values({
        code,
        name,
        category,
        description,
        baseDateType,
        offsetDays: offsetDays ?? 0,
        offsetMonths: offsetMonths ?? 0,
        offsetYears: offsetYears ?? 0,
        adjustmentRule: adjustmentRule ?? 'NEXT_WORKING_DAY',
        excludeWeekends: excludeWeekends ?? true,
        excludeHolidays: excludeHolidays ?? true,
        applicablePeriods: applicablePeriods ?? ['MONTHLY', 'QUARTERLY', 'ANNUAL'],
        applicableJurisdictions: applicableJurisdictions ?? [],
        exampleCalculation,
        isActive: true,
      })
      .returning();

    res.status(201).json(formula);
  } catch (error: any) {
    console.error('Error creating deadline formula:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PENALTY RULES ROUTES
// ============================================================================

// Get all penalty rules
router.get('/penalty-rules', async (req: Request, res: Response) => {
  try {
    const { category, penaltyType } = req.query;

    let conditions = [eq(penaltyRulesMaster.isActive, true)];

    if (category) {
      conditions.push(eq(penaltyRulesMaster.category, category as string));
    }
    if (penaltyType) {
      conditions.push(eq(penaltyRulesMaster.penaltyType, penaltyType as any));
    }

    const rules = await db
      .select()
      .from(penaltyRulesMaster)
      .where(and(...conditions))
      .orderBy(asc(penaltyRulesMaster.category), asc(penaltyRulesMaster.name));

    res.json(rules);
  } catch (error: any) {
    console.error('Error fetching penalty rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single penalty rule
router.get('/penalty-rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rule] = await db
      .select()
      .from(penaltyRulesMaster)
      .where(eq(penaltyRulesMaster.id, id));

    if (!rule) {
      return res.status(404).json({ error: 'Penalty rule not found' });
    }

    res.json(rule);
  } catch (error: any) {
    console.error('Error fetching penalty rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create penalty rule
router.post('/penalty-rules', async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      category,
      description,
      penaltyType,
      flatAmount,
      dailyAmount,
      interestRateAnnual,
      compoundingFrequency,
      slabs,
      maxPenalty,
      maxPenaltyDays,
      minPenalty,
      minimumTaxLiability,
      conditions,
      legalSection,
      circularReference,
      effectiveFrom,
      effectiveUntil,
    } = req.body;

    const [rule] = await db
      .insert(penaltyRulesMaster)
      .values({
        code,
        name,
        category,
        description,
        penaltyType,
        flatAmount,
        dailyAmount,
        interestRateAnnual,
        compoundingFrequency,
        slabs: slabs ?? [],
        maxPenalty,
        maxPenaltyDays,
        minPenalty,
        minimumTaxLiability,
        conditions: conditions ?? {},
        legalSection,
        circularReference,
        effectiveFrom,
        effectiveUntil,
        isActive: true,
      })
      .returning();

    res.status(201).json(rule);
  } catch (error: any) {
    console.error('Error creating penalty rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HOLIDAY CALENDARS ROUTES
// ============================================================================

// Get holiday calendars
router.get('/holidays', async (req: Request, res: Response) => {
  try {
    const { jurisdictionId, year, calendarType } = req.query;

    let conditions: any[] = [];

    if (jurisdictionId) {
      conditions.push(eq(holidayCalendars.jurisdictionId, jurisdictionId as string));
    }
    if (year) {
      conditions.push(eq(holidayCalendars.year, parseInt(year as string)));
    }
    if (calendarType) {
      conditions.push(eq(holidayCalendars.calendarType, calendarType as string));
    }

    const calendars = await db
      .select()
      .from(holidayCalendars)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(holidayCalendars.year));

    res.json(calendars);
  } catch (error: any) {
    console.error('Error fetching holiday calendars:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update holiday calendar
router.post('/holidays', async (req: Request, res: Response) => {
  try {
    const {
      jurisdictionId,
      calendarType,
      year,
      holidays,
      weekendDays,
      saturdayRules,
    } = req.body;

    const [calendar] = await db
      .insert(holidayCalendars)
      .values({
        jurisdictionId,
        calendarType: calendarType ?? 'BANK',
        year,
        holidays: holidays ?? [],
        weekendDays: weekendDays ?? [0, 6],
        saturdayRules,
        isActive: true,
      })
      .returning();

    res.status(201).json(calendar);
  } catch (error: any) {
    console.error('Error creating holiday calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// JURISDICTIONS ROUTES
// ============================================================================

// Get all jurisdictions
router.get('/jurisdictions', async (req: Request, res: Response) => {
  try {
    const { level, parentId, search, includeInactive } = req.query;

    let conditions = [];

    if (!includeInactive) {
      conditions.push(eq(jurisdictions.isActive, true));
    }
    if (level) {
      conditions.push(eq(jurisdictions.level, level as string));
    }
    if (parentId) {
      conditions.push(eq(jurisdictions.parentId, parentId as string));
    }

    let results = await db
      .select()
      .from(jurisdictions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(jurisdictions.level), asc(jurisdictions.name));

    if (search) {
      const searchLower = (search as string).toLowerCase();
      results = results.filter(j =>
        j.name.toLowerCase().includes(searchLower) ||
        j.code.toLowerCase().includes(searchLower)
      );
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching jurisdictions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get jurisdiction by ID
router.get('/jurisdictions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [jurisdiction] = await db
      .select()
      .from(jurisdictions)
      .where(eq(jurisdictions.id, id));

    if (!jurisdiction) {
      return res.status(404).json({ error: 'Jurisdiction not found' });
    }

    res.json(jurisdiction);
  } catch (error: any) {
    console.error('Error fetching jurisdiction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get jurisdiction hierarchy (states with children)
router.get('/jurisdictions/hierarchy/tree', async (req: Request, res: Response) => {
  try {
    const allJurisdictions = await db
      .select()
      .from(jurisdictions)
      .where(eq(jurisdictions.isActive, true))
      .orderBy(asc(jurisdictions.level), asc(jurisdictions.name));

    // Build tree structure
    const tree: any[] = [];
    const map = new Map<string, any>();

    // First pass: create map
    allJurisdictions.forEach(j => {
      map.set(j.id, { ...j, children: [] });
    });

    // Second pass: build tree
    allJurisdictions.forEach(j => {
      const node = map.get(j.id);
      if (j.parentId && map.has(j.parentId)) {
        map.get(j.parentId).children.push(node);
      } else {
        tree.push(node);
      }
    });

    res.json(tree);
  } catch (error: any) {
    console.error('Error fetching jurisdiction hierarchy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create jurisdiction
router.post('/jurisdictions', async (req: Request, res: Response) => {
  try {
    const data = createJurisdictionSchema.parse(req.body);

    const result = await db
      .insert(jurisdictions)
      .values({
        id: `jurisdiction_${nanoid()}`,
        ...data,
        isActive: true,
      })
      .returning() as any[];
    const jurisdiction = result[0];

    res.status(201).json(jurisdiction);
  } catch (error: any) {
    console.error('Error creating jurisdiction:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get jurisdiction rules
router.get('/jurisdictions/:jurisdictionId/rules', async (req: Request, res: Response) => {
  try {
    const { jurisdictionId } = req.params;
    const { ruleType } = req.query;

    let conditions = [
      eq(jurisdictionRules.jurisdictionId, jurisdictionId),
      eq(jurisdictionRules.isActive, true),
    ];

    if (ruleType) {
      conditions.push(eq(jurisdictionRules.ruleType, ruleType as string));
    }

    const rules = await db
      .select()
      .from(jurisdictionRules)
      .where(and(...conditions))
      .orderBy(asc(jurisdictionRules.priority));

    res.json(rules);
  } catch (error: any) {
    console.error('Error fetching jurisdiction rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get professional tax rates
router.get('/jurisdictions/:jurisdictionId/pt-rates', async (req: Request, res: Response) => {
  try {
    const { jurisdictionId } = req.params;

    const rates = await db
      .select()
      .from(professionalTaxRates)
      .where(and(
        eq(professionalTaxRates.jurisdictionId, jurisdictionId),
        eq(professionalTaxRates.isActive, true)
      ))
      .orderBy(desc(professionalTaxRates.effectiveFrom));

    res.json(rates);
  } catch (error: any) {
    console.error('Error fetching PT rates:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CUSTOM FIELDS ROUTES (NO-CODE BUILDER)
// ============================================================================

// Get custom field definitions
router.get('/custom-fields', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { entityType, search, includeInactive } = req.query;

    let conditions = [eq(customFieldDefinitions.tenantId, tenantId)];

    if (!includeInactive) {
      conditions.push(eq(customFieldDefinitions.isActive, true));
    }
    if (entityType) {
      conditions.push(eq(customFieldDefinitions.entityType, entityType as string));
    }

    let fields = await db
      .select()
      .from(customFieldDefinitions)
      .where(and(...conditions))
      .orderBy(asc(customFieldDefinitions.entityType), asc(customFieldDefinitions.displayOrder));

    if (search) {
      const searchLower = (search as string).toLowerCase();
      fields = fields.filter(f =>
        f.fieldCode.toLowerCase().includes(searchLower) ||
        f.fieldLabel.toLowerCase().includes(searchLower)
      );
    }

    res.json(fields);
  } catch (error: any) {
    console.error('Error fetching custom fields:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single custom field definition
router.get('/custom-fields/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [field] = await db
      .select()
      .from(customFieldDefinitions)
      .where(eq(customFieldDefinitions.id, id));

    if (!field) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    res.json(field);
  } catch (error: any) {
    console.error('Error fetching custom field:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create custom field definition
router.post('/custom-fields', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const createdBy = (req as any).user?.id;

    const data = createCustomFieldSchema.parse(req.body);

    const [field] = await db
      .insert(customFieldDefinitions)
      .values({
        tenantId,
        entityType: data.entityType,
        fieldCode: data.fieldCode,
        fieldLabel: data.fieldLabel,
        fieldType: data.fieldType,
        options: data.options,
        optionsSource: data.optionsSource,
        optionsApiEndpoint: data.optionsApiEndpoint,
        lookupEntity: data.lookupEntity,
        lookupDisplayField: data.lookupDisplayField,
        lookupValueField: data.lookupValueField,
        lookupFilters: data.lookupFilters,
        formulaExpression: data.formulaExpression,
        formulaDependencies: data.formulaDependencies,
        isRequired: data.isRequired ?? false,
        isUnique: data.isUnique ?? false,
        validationRules: data.validationRules ?? [],
        defaultValue: data.defaultValue,
        placeholder: data.placeholder,
        helpText: data.helpText,
        displayOrder: data.displayOrder ?? 0,
        groupName: data.groupName,
        isActive: true,
        createdBy,
      })
      .returning();

    res.status(201).json(field);
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update custom field definition
router.put('/custom-fields/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [field] = await db
      .update(customFieldDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customFieldDefinitions.id, id))
      .returning();

    if (!field) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    res.json(field);
  } catch (error: any) {
    console.error('Error updating custom field:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete custom field definition
router.delete('/custom-fields/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [field] = await db
      .update(customFieldDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customFieldDefinitions.id, id))
      .returning();

    if (!field) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    res.json({ message: 'Custom field deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting custom field:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get custom field values for entity
router.get('/custom-fields/values/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const tenantId = (req as any).user?.tenantId || 'default';

    const values = await db
      .select({
        fieldDefinition: customFieldDefinitions,
        value: customFieldValues,
      })
      .from(customFieldValues)
      .innerJoin(
        customFieldDefinitions,
        eq(customFieldValues.fieldDefinitionId, customFieldDefinitions.id)
      )
      .where(and(
        eq(customFieldValues.entityType, entityType),
        eq(customFieldValues.entityId, entityId),
        eq(customFieldDefinitions.tenantId, tenantId)
      ));

    res.json(values);
  } catch (error: any) {
    console.error('Error fetching custom field values:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set custom field value
router.post('/custom-fields/values', async (req: Request, res: Response) => {
  try {
    const createdBy = (req as any).user?.id || 'system';
    const { fieldDefinitionId, entityType, entityId, value } = req.body;

    // Check if value exists
    const [existing] = await db
      .select()
      .from(customFieldValues)
      .where(and(
        eq(customFieldValues.fieldDefinitionId, fieldDefinitionId),
        eq(customFieldValues.entityType, entityType),
        eq(customFieldValues.entityId, entityId)
      ));

    let result;

    if (existing) {
      // Store history
      await db.insert(customFieldHistory).values({
        fieldValueId: existing.id,
        oldValue: existing.value,
        newValue: value,
        changedBy: createdBy,
      });

      // Update value
      [result] = await db
        .update(customFieldValues)
        .set({ value, updatedAt: new Date() })
        .where(eq(customFieldValues.id, existing.id))
        .returning();
    } else {
      // Create new value
      [result] = await db
        .insert(customFieldValues)
        .values({
          id: `cfv_${nanoid()}`,
          fieldDefinitionId,
          entityType,
          entityId,
          value,
        })
        .returning();
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error setting custom field value:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get field history
router.get('/custom-fields/values/:valueId/history', async (req: Request, res: Response) => {
  try {
    const { valueId } = req.params;

    const history = await db
      .select()
      .from(customFieldHistory)
      .where(eq(customFieldHistory.fieldValueId, valueId))
      .orderBy(desc(customFieldHistory.changedAt));

    res.json(history);
  } catch (error: any) {
    console.error('Error fetching field history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AUTOMATION RULES ROUTES
// ============================================================================

// Get automation rules
router.get('/automation-rules', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { triggerEntity, triggerType, isActive } = req.query;

    let conditions = [eq(automationRules.tenantId, tenantId)];

    if (triggerEntity) {
      conditions.push(eq(automationRules.triggerEntity, triggerEntity as string));
    }
    if (triggerType) {
      conditions.push(eq(automationRules.triggerType, triggerType as any));
    }
    if (isActive !== undefined) {
      conditions.push(eq(automationRules.isActive, isActive === 'true'));
    }

    const rules = await db
      .select()
      .from(automationRules)
      .where(and(...conditions))
      .orderBy(asc(automationRules.executionOrder));

    res.json(rules);
  } catch (error: any) {
    console.error('Error fetching automation rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single automation rule
router.get('/automation-rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rule] = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, id));

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json(rule);
  } catch (error: any) {
    console.error('Error fetching automation rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create automation rule
router.post('/automation-rules', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const createdBy = (req as any).user?.id;

    const data = createAutomationRuleSchema.parse(req.body);

    const [rule] = await db
      .insert(automationRules)
      .values({
        tenantId,
        ruleCode: data.ruleCode,
        ruleName: data.ruleName,
        description: data.description,
        category: data.category,
        triggerType: data.triggerType,
        triggerEntity: data.triggerEntity,
        triggerConditions: data.triggerConditions ?? {},
        triggerFields: data.triggerFields,
        scheduleCron: data.scheduleCron,
        scheduleTimezone: data.scheduleTimezone ?? 'Asia/Kolkata',
        filterConditions: data.filterConditions ?? [],
        actions: data.actions,
        isActive: data.isActive ?? true,
        executionOrder: data.executionOrder ?? 0,
        stopOnError: data.stopOnError ?? false,
        retryOnError: data.retryOnError ?? true,
        maxRetries: data.maxRetries ?? 3,
        createdBy,
      })
      .returning();

    res.status(201).json(rule);
  } catch (error: any) {
    console.error('Error creating automation rule:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update automation rule
router.put('/automation-rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [rule] = await db
      .update(automationRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(automationRules.id, id))
      .returning();

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json(rule);
  } catch (error: any) {
    console.error('Error updating automation rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete automation rule
router.delete('/automation-rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rule] = await db
      .delete(automationRules)
      .where(eq(automationRules.id, id))
      .returning();

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({ message: 'Automation rule deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting automation rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get automation execution log
router.get('/automation-rules/:ruleId/executions', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { limit = '50', status } = req.query;

    let conditions = [eq(automationExecutionLog.ruleId, ruleId)];

    if (status) {
      conditions.push(eq(automationExecutionLog.status, status as any));
    }

    const executions = await db
      .select()
      .from(automationExecutionLog)
      .where(and(...conditions))
      .orderBy(desc(automationExecutionLog.startedAt))
      .limit(parseInt(limit as string));

    res.json(executions);
  } catch (error: any) {
    console.error('Error fetching execution log:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI INTELLIGENCE ROUTES
// ============================================================================

// Get extraction templates
router.get('/ai/extraction-templates', async (req: Request, res: Response) => {
  try {
    const { documentType, isActive } = req.query;

    let conditions: any[] = [];

    if (documentType) {
      conditions.push(eq(documentExtractionTemplates.documentType, documentType as string));
    }
    if (isActive !== undefined) {
      conditions.push(eq(documentExtractionTemplates.isActive, isActive === 'true'));
    }

    const templates = await db
      .select()
      .from(documentExtractionTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(documentExtractionTemplates.templateName));

    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching extraction templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create extraction template
router.post('/ai/extraction-templates', async (req: Request, res: Response) => {
  try {
    const data = createExtractionTemplateSchema.parse(req.body);

    const [template] = await db
      .insert(documentExtractionTemplates)
      .values({
        ...data,
        totalExtractions: 0,
        isActive: true,
      })
      .returning();

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating extraction template:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get AI predictions
router.get('/ai/predictions', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { entityType, entityId, predictionType, limit = '50' } = req.query;

    let conditions = [eq(aiPredictions.tenantId, tenantId)];

    if (entityType) {
      conditions.push(eq(aiPredictions.entityType, entityType as string));
    }
    if (entityId) {
      conditions.push(eq(aiPredictions.entityId, entityId as string));
    }
    if (predictionType) {
      conditions.push(eq(aiPredictions.predictionType, predictionType as any));
    }

    const predictions = await db
      .select()
      .from(aiPredictions)
      .where(and(...conditions))
      .orderBy(desc(aiPredictions.createdAt))
      .limit(parseInt(limit as string));

    res.json(predictions);
  } catch (error: any) {
    console.error('Error fetching AI predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get smart recommendations
router.get('/ai/recommendations', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { entityType, entityId, category, status } = req.query;

    let conditions = [eq(smartRecommendations.tenantId, tenantId)];

    if (entityType) {
      conditions.push(eq(smartRecommendations.entityType, entityType as string));
    }
    if (entityId) {
      conditions.push(eq(smartRecommendations.entityId, entityId as string));
    }
    if (category) {
      conditions.push(eq(smartRecommendations.category, category as string));
    }
    if (status) {
      conditions.push(eq(smartRecommendations.status, status as any));
    }

    const recommendations = await db
      .select()
      .from(smartRecommendations)
      .where(and(...conditions))
      .orderBy(desc(smartRecommendations.priority), desc(smartRecommendations.createdAt));

    res.json(recommendations);
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dismiss recommendation
router.post('/ai/recommendations/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [recommendation] = await db
      .update(smartRecommendations)
      .set({
        status: 'DISMISSED',
        actionedAt: new Date(),
        actionResult: 'DISMISSED',
        dismissReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(smartRecommendations.id, id))
      .returning();

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json(recommendation);
  } catch (error: any) {
    console.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept recommendation
router.post('/ai/recommendations/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [recommendation] = await db
      .update(smartRecommendations)
      .set({
        status: 'ACCEPTED',
        actionedAt: new Date(),
        actionResult: 'ACCEPTED',
        updatedAt: new Date(),
      })
      .where(eq(smartRecommendations.id, id))
      .returning();

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json(recommendation);
  } catch (error: any) {
    console.error('Error accepting recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PAGE LAYOUTS ROUTES
// ============================================================================

// Get page layouts
router.get('/page-layouts', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const { entityType, layoutType, isActive } = req.query;

    let conditions = [eq(pageLayouts.tenantId, tenantId)];

    if (entityType) {
      conditions.push(eq(pageLayouts.entityType, entityType as string));
    }
    if (layoutType) {
      conditions.push(eq(pageLayouts.layoutType, layoutType as any));
    }
    if (isActive !== undefined) {
      conditions.push(eq(pageLayouts.isActive, isActive === 'true'));
    }

    const layouts = await db
      .select()
      .from(pageLayouts)
      .where(and(...conditions))
      .orderBy(asc(pageLayouts.entityType), asc(pageLayouts.layoutName));

    res.json(layouts);
  } catch (error: any) {
    console.error('Error fetching page layouts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create page layout
router.post('/page-layouts', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 'default';
    const createdBy = (req as any).user?.id || 'system';

    const {
      layoutName,
      layoutCode,
      entityType,
      layoutType,
      description,
      layoutDefinition,
      conditions,
      isDefault,
    } = req.body;

    const [layout] = await db
      .insert(pageLayouts)
      .values({
        tenantId,
        layoutName,
        layoutCode,
        entityType,
        layoutType,
        description,
        layoutDefinition: layoutDefinition ?? { sections: [] },
        conditions,
        isDefault: isDefault ?? false,
        isActive: true,
        createdBy,
      })
      .returning();

    res.status(201).json(layout);
  } catch (error: any) {
    console.error('Error creating page layout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update page layout
router.put('/page-layouts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [layout] = await db
      .update(pageLayouts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pageLayouts.id, id))
      .returning();

    if (!layout) {
      return res.status(404).json({ error: 'Page layout not found' });
    }

    res.json(layout);
  } catch (error: any) {
    console.error('Error updating page layout:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// INTELLIGENT DOCUMENTS ROUTES
// ============================================================================

// Get intelligent documents
router.get('/ai/intelligent-documents', async (req: Request, res: Response) => {
  try {
    const { extractionStatus, verificationStatus, documentId } = req.query;

    let conditions: any[] = [];

    if (extractionStatus) {
      conditions.push(eq(intelligentDocuments.extractionStatus, extractionStatus as string));
    }
    if (verificationStatus) {
      conditions.push(eq(intelligentDocuments.verificationStatus, verificationStatus as string));
    }
    if (documentId) {
      conditions.push(eq(intelligentDocuments.documentId, parseInt(documentId as string)));
    }

    const documents = await db
      .select()
      .from(intelligentDocuments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(intelligentDocuments.createdAt));

    res.json(documents);
  } catch (error: any) {
    console.error('Error fetching intelligent documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single intelligent document
router.get('/ai/intelligent-documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [document] = await db
      .select()
      .from(intelligentDocuments)
      .where(eq(intelligentDocuments.id, id));

    if (!document) {
      return res.status(404).json({ error: 'Intelligent document not found' });
    }

    res.json(document);
  } catch (error: any) {
    console.error('Error fetching intelligent document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark document as verified
router.post('/ai/intelligent-documents/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const verifiedBy = (req as any).user?.id;
    const { verificationStatus, verificationMethod, verificationNotes, corrections } = req.body;

    const [document] = await db
      .update(intelligentDocuments)
      .set({
        verificationStatus: verificationStatus ?? 'VERIFIED',
        verificationMethod,
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes,
        corrections,
        updatedAt: new Date(),
      })
      .where(eq(intelligentDocuments.id, id))
      .returning();

    if (!document) {
      return res.status(404).json({ error: 'Intelligent document not found' });
    }

    res.json(document);
  } catch (error: any) {
    console.error('Error verifying document:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
