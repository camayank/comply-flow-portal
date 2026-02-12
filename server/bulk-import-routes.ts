/**
 * Bulk Import API Routes
 * Handles bulk data import for all modules: Leads, Clients, Entities, Services, Tasks, Compliance
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  leads,
  serviceRequests,
  businessEntities,
  complianceTracking,
  complianceRules,
  services
} from "@shared/schema";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

interface BulkImportResult {
  success: number;
  failed: number;
  errors: string[];
  insertedIds: (string | number)[];
}

// Validation helpers
const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string): boolean =>
  /^[\+]?[0-9]{10,15}$/.test(phone.replace(/[\s\-]/g, ''));

const validatePAN = (pan: string): boolean =>
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

const validateGSTIN = (gstin: string): boolean =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/.test(gstin);

export function registerBulkImportRoutes(app: Express) {
  const requireOpsAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE)] as const;
  const requireSalesAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SALES_EXECUTIVE)] as const;
  const requireAdminAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;

  /**
   * Bulk Import Leads
   * POST /api/crm/leads/bulk
   * TRANSACTION: All-or-nothing import with validation phase
   */
  app.post("/api/crm/leads/bulk", ...requireSalesAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      if (items.length > 1000) {
        return res.status(400).json({ error: "Maximum 1000 items per batch" });
      }

      const tenantId = req.user?.tenantId || 1;
      const userId = req.user?.id || 1;

      // PHASE 1: Validate all items BEFORE starting transaction
      const validationErrors: string[] = [];
      const validItems: typeof items = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;

        // Validate required fields
        if (!item.companyName || !item.contactPerson || !item.email || !item.phone) {
          validationErrors.push(`Row ${rowNum}: Missing required fields (companyName, contactPerson, email, phone)`);
          continue;
        }

        // Validate email
        if (!validateEmail(item.email)) {
          validationErrors.push(`Row ${rowNum}: Invalid email format`);
          continue;
        }

        // Validate phone
        if (!validatePhone(item.phone)) {
          validationErrors.push(`Row ${rowNum}: Invalid phone format`);
          continue;
        }

        validItems.push({ ...item, rowNum });
      }

      // If any validation errors, reject entire batch
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Validation failed - no records imported",
          validationErrors,
          validCount: validItems.length,
          invalidCount: validationErrors.length,
        });
      }

      // PHASE 2: Insert all valid items in a transaction
      const result: BulkImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        insertedIds: [],
      };

      await db.transaction(async (tx) => {
        for (const item of validItems) {
          const [inserted] = await tx.insert(leads).values({
            tenantId,
            companyName: item.companyName,
            contactPerson: item.contactPerson,
            email: item.email,
            phone: item.phone.replace(/[\s\-]/g, ''),
            leadSource: item.leadSource || 'bulk_import',
            stage: item.stage || 'new',
            requirementSummary: item.requirementSummary || '',
            estimatedValue: item.estimatedValue ? String(item.estimatedValue) : null,
            assignedTo: userId,
            isHot: item.stage === 'hot',
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning({ id: leads.id });

          result.success++;
          result.insertedIds.push(inserted.id);
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Bulk lead import error:", error);
      // Transaction automatically rolled back on error
      res.status(500).json({ error: error.message || "Bulk import failed - all changes rolled back" });
    }
  });

  /**
   * Bulk Import Clients
   * POST /api/clients/bulk
   * TRANSACTION: All-or-nothing import with validation phase
   */
  app.post("/api/clients/bulk", ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      if (items.length > 1000) {
        return res.status(400).json({ error: "Maximum 1000 items per batch" });
      }

      const tenantId = req.user?.tenantId || 1;

      // PHASE 1: Validate all items BEFORE starting transaction
      const validationErrors: string[] = [];
      const validItems: typeof items = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;

        // Validate required fields
        if (!item.name || !item.entityType || !item.email || !item.phone || !item.city || !item.state) {
          validationErrors.push(`Row ${rowNum}: Missing required fields (name, entityType, email, phone, city, state)`);
          continue;
        }

        // Validate email
        if (!validateEmail(item.email)) {
          validationErrors.push(`Row ${rowNum}: Invalid email format`);
          continue;
        }

        // Validate PAN if provided
        if (item.pan && !validatePAN(item.pan.toUpperCase())) {
          validationErrors.push(`Row ${rowNum}: Invalid PAN format`);
          continue;
        }

        // Validate GSTIN if provided
        if (item.gstin && !validateGSTIN(item.gstin.toUpperCase())) {
          validationErrors.push(`Row ${rowNum}: Invalid GSTIN format`);
          continue;
        }

        validItems.push({ ...item, rowNum });
      }

      // If any validation errors, reject entire batch
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Validation failed - no records imported",
          validationErrors,
          validCount: validItems.length,
          invalidCount: validationErrors.length,
        });
      }

      // PHASE 2: Insert all valid items in a transaction
      const result: BulkImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        insertedIds: [],
      };

      await db.transaction(async (tx) => {
        for (const item of validItems) {
          const clientId = `CLT-${nanoid(8).toUpperCase()}`;

          const [inserted] = await tx.insert(businessEntities).values({
            tenantId,
            clientId,
            name: item.name,
            entityType: item.entityType,
            pan: item.pan?.toUpperCase() || null,
            gstin: item.gstin?.toUpperCase() || null,
            cin: item.cin || null,
            email: item.email,
            phone: item.phone.replace(/[\s\-]/g, ''),
            address: item.address || null,
            city: item.city,
            state: item.state,
            industryType: item.industry || 'other',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning({ id: businessEntities.id });

          result.success++;
          result.insertedIds.push(inserted.id);
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Bulk client import error:", error);
      res.status(500).json({ error: error.message || "Bulk import failed - all changes rolled back" });
    }
  });

  /**
   * Bulk Import Business Entities
   * POST /api/entities/bulk
   * TRANSACTION: All-or-nothing import with validation phase
   */
  app.post("/api/entities/bulk", ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      if (items.length > 1000) {
        return res.status(400).json({ error: "Maximum 1000 items per batch" });
      }

      const tenantId = req.user?.tenantId || 1;
      const clientId = req.body.clientId || req.user?.clientId;

      // PHASE 1: Validate all items BEFORE starting transaction
      const validationErrors: string[] = [];
      const validItems: typeof items = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;

        // Validate required fields
        if (!item.name || !item.entityType || !item.pan || !item.state) {
          validationErrors.push(`Row ${rowNum}: Missing required fields (name, entityType, pan, state)`);
          continue;
        }

        // Validate PAN
        if (!validatePAN(item.pan.toUpperCase())) {
          validationErrors.push(`Row ${rowNum}: Invalid PAN format (expected: ABCDE1234F)`);
          continue;
        }

        // Validate GSTIN if provided
        if (item.gstin && !validateGSTIN(item.gstin.toUpperCase())) {
          validationErrors.push(`Row ${rowNum}: Invalid GSTIN format`);
          continue;
        }

        validItems.push({ ...item, rowNum });
      }

      // If any validation errors, reject entire batch
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Validation failed - no records imported",
          validationErrors,
          validCount: validItems.length,
          invalidCount: validationErrors.length,
        });
      }

      // PHASE 2: Insert all valid items in a transaction
      const result: BulkImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        insertedIds: [],
      };

      await db.transaction(async (tx) => {
        for (const item of validItems) {
          const [inserted] = await tx.insert(businessEntities).values({
            tenantId,
            clientId: clientId || null,
            name: item.name,
            entityType: item.entityType,
            pan: item.pan.toUpperCase(),
            gstin: item.gstin?.toUpperCase() || null,
            cin: item.cin || null,
            address: item.address || null,
            city: item.city || null,
            state: item.state,
            industryType: item.industryType || 'other',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning({ id: businessEntities.id });

          result.success++;
          result.insertedIds.push(inserted.id);
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Bulk entity import error:", error);
      res.status(500).json({ error: error.message || "Bulk import failed - all changes rolled back" });
    }
  });

  /**
   * Bulk Import Services
   * POST /api/services/bulk
   */
  app.post("/api/services/bulk", ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      const result: BulkImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        insertedIds: [],
      };

      // Services are stored in memory/JSON in the current implementation
      // This would need to be adapted based on your actual storage mechanism
      const { storage } = await import('./storage');

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;

        try {
          // Validate required fields
          if (!item.serviceCode || !item.name || !item.category || !item.basePrice) {
            result.errors.push(`Row ${rowNum}: Missing required fields (serviceCode, name, category, basePrice)`);
            result.failed++;
            continue;
          }

          // Check for duplicate service code
          const existing = await storage.getService(item.serviceCode);
          if (existing) {
            result.errors.push(`Row ${rowNum}: Service code ${item.serviceCode} already exists`);
            result.failed++;
            continue;
          }

          // Create service
          const service = await storage.createService({
            serviceId: item.serviceCode,
            name: item.name,
            description: item.description || '',
            category: item.category,
            serviceType: item.serviceType || 'standard',
            price: Number(item.basePrice),
            slaHours: Number(item.slaHours) || 48,
            complexityLevel: item.complexityLevel || 'medium',
            isActive: item.isActive !== false,
            isConfigurable: item.isConfigurable || false,
            tags: item.tags || [],
            prerequisites: item.prerequisites || [],
          });

          result.success++;
          result.insertedIds.push(service.serviceId);
        } catch (err: any) {
          result.errors.push(`Row ${rowNum}: ${err.message || 'Insert failed'}`);
          result.failed++;
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Bulk service import error:", error);
      res.status(500).json({ error: error.message || "Bulk import failed" });
    }
  });

  /**
   * Bulk Import Tasks
   * POST /api/tasks/bulk
   * TRANSACTION: All-or-nothing import with validation phase
   */
  app.post("/api/tasks/bulk", ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      if (items.length > 1000) {
        return res.status(400).json({ error: "Maximum 1000 items per batch" });
      }

      const tenantId = req.user?.tenantId || 1;
      const createdBy = req.user?.id || 1;

      // Import tasks table if available
      const { tasks } = await import('@shared/schema');

      // PHASE 1: Validate all items BEFORE starting transaction
      const validationErrors: string[] = [];
      const validItems: typeof items = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;

        // Validate required fields
        if (!item.title || !item.priority || !item.category) {
          validationErrors.push(`Row ${rowNum}: Missing required fields (title, priority, category)`);
          continue;
        }

        // Validate due date if provided
        if (item.dueDate) {
          const dueDate = new Date(item.dueDate);
          if (isNaN(dueDate.getTime())) {
            validationErrors.push(`Row ${rowNum}: Invalid date format for dueDate`);
            continue;
          }
        }

        validItems.push({ ...item, rowNum });
      }

      // If any validation errors, reject entire batch
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Validation failed - no records imported",
          validationErrors,
          validCount: validItems.length,
          invalidCount: validationErrors.length,
        });
      }

      // PHASE 2: Insert all valid items in a transaction
      const result: BulkImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        insertedIds: [],
      };

      await db.transaction(async (tx) => {
        for (const item of validItems) {
          const [inserted] = await tx.insert(tasks).values({
            tenantId,
            title: item.title,
            description: item.description || '',
            priority: item.priority,
            category: item.category,
            status: 'pending',
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            createdBy,
            assignedTo: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning({ id: tasks.id });

          result.success++;
          result.insertedIds.push(inserted.id);
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Bulk task import error:", error);
      res.status(500).json({ error: error.message || "Bulk import failed - all changes rolled back" });
    }
  });

  /**
   * Bulk Import Compliance Items
   * POST /api/compliance/bulk
   * TRANSACTION: All-or-nothing import with validation phase
   */
  app.post("/api/compliance/bulk", ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      if (items.length > 1000) {
        return res.status(400).json({ error: "Maximum 1000 items per batch" });
      }

      const entities = await db
        .select({ id: businessEntities.id, ownerId: businessEntities.ownerId, name: businessEntities.name })
        .from(businessEntities);

      const entityMap = new Map(
        entities.map(entity => [entity.name.trim().toLowerCase(), entity])
      );

      const rules = await db
        .select({
          id: complianceRules.id,
          ruleCode: complianceRules.ruleCode,
          complianceName: complianceRules.complianceName,
          periodicity: complianceRules.periodicity,
          priorityLevel: complianceRules.priorityLevel,
          penaltyRiskLevel: complianceRules.penaltyRiskLevel,
        })
        .from(complianceRules);

      const ruleCodeMap = new Map(
        rules.map(rule => [rule.ruleCode.trim().toLowerCase(), rule])
      );
      const ruleNameMap = new Map(
        rules.map(rule => [rule.complianceName.trim().toLowerCase(), rule])
      );

      const serviceRows = await db
        .select({ serviceId: services.serviceId, name: services.name })
        .from(services);
      const serviceNameMap = new Map(
        serviceRows.map(service => [service.name.trim().toLowerCase(), service])
      );

      // PHASE 1: Validate all items BEFORE starting transaction
      const validationErrors: string[] = [];
      const validItems: { item: typeof items[0]; dueDate: Date; rowNum: number; entity: any; rule: any | null; service: any | null }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;

        // Validate required fields
        if (!item.entityName || !item.complianceType || !item.dueDate || !item.status) {
          validationErrors.push(`Row ${rowNum}: Missing required fields (entityName, complianceType, dueDate, status)`);
          continue;
        }

        // Validate date
        const dueDate = new Date(item.dueDate);
        if (isNaN(dueDate.getTime())) {
          validationErrors.push(`Row ${rowNum}: Invalid date format for dueDate`);
          continue;
        }

        const entityKey = String(item.entityName).trim().toLowerCase();
        const entity = entityMap.get(entityKey);
        if (!entity) {
          validationErrors.push(`Row ${rowNum}: Entity not found (${item.entityName})`);
          continue;
        }

        const serviceName = (item.serviceName || '').trim().toLowerCase();
        const complianceType = (item.complianceType || '').trim().toLowerCase();
        const rule =
          (serviceName && (ruleCodeMap.get(serviceName) || ruleNameMap.get(serviceName))) ||
          (complianceType && (ruleCodeMap.get(complianceType) || ruleNameMap.get(complianceType))) ||
          null;
        const service = serviceName ? serviceNameMap.get(serviceName) || null : null;

        validItems.push({ item, dueDate, rowNum, entity, rule, service });
      }

      // If any validation errors, reject entire batch
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Validation failed - no records imported",
          validationErrors,
          validCount: validItems.length,
          invalidCount: validationErrors.length,
        });
      }

      // PHASE 2: Insert all valid items in a transaction
      const result: BulkImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        insertedIds: [],
      };

      await db.transaction(async (tx) => {
        for (const { item, dueDate, entity, rule, service } of validItems) {
          const serviceId = rule?.ruleCode || service?.serviceId || item.serviceName || item.complianceType;
          const serviceType = rule?.complianceName || service?.name || item.serviceName || item.complianceType;
          const complianceType = rule?.periodicity || item.complianceType;
          const penaltyRisk = rule ? ['high', 'critical'].includes(rule.penaltyRiskLevel || '') : Boolean(item.penaltyAmount);
          const estimatedPenalty = item.penaltyAmount ? Number(item.penaltyAmount) : 0;

          const [inserted] = await tx.insert(complianceTracking).values({
            userId: entity.ownerId,
            businessEntityId: entity.id,
            complianceRuleId: rule?.id ?? null,
            serviceId: String(serviceId),
            serviceType,
            complianceType,
            dueDate,
            status: item.status,
            priority: rule?.priorityLevel || 'medium',
            penaltyRisk,
            estimatedPenalty,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning({ id: complianceTracking.id });

          result.success++;
          result.insertedIds.push(inserted.id);
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Bulk compliance import error:", error);
      res.status(500).json({ error: error.message || "Bulk import failed - all changes rolled back" });
    }
  });

  /**
   * Get Bulk Import History
   * GET /api/bulk-import/history
   */
  app.get("/api/bulk-import/history", ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // This would typically come from an audit log or import history table
      res.json({
        imports: [],
        message: "Import history tracking can be implemented with an audit log table"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch import history" });
    }
  });

  console.log("✅ Bulk import routes registered");
}
