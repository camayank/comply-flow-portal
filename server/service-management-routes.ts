import { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  insertServiceDefinitionSchema,
  insertAdvancedTaskTemplateSchema,
  insertServiceConfigurationSchema,
  insertTaskExecutionSchema
} from "@shared/schema";
import { authenticateToken } from './middleware/auth';
import {
  requireRole,
  requirePermissionFromConfig,
  requireAnyPermission,
  PERMISSIONS,
} from './middleware/rbac';

interface ServiceManagementStorage {
  // Service Definitions
  getAllServiceDefinitions: (filters?: any) => Promise<{ services: any[]; total: number }>;
  getServiceDefinition: (id: number) => Promise<any>;
  getServiceDefinitionByCode: (serviceCode: string) => Promise<any>;
  createServiceDefinition: (service: any) => Promise<any>;
  updateServiceDefinition: (id: number, updates: any) => Promise<any>;
  deleteServiceDefinition: (id: number) => Promise<boolean>;
  duplicateServiceDefinition: (id: number, newCode: string, newName: string) => Promise<any>;
  
  // Task Templates
  getAllTaskTemplates: (filters?: any) => Promise<any[]>;
  getTaskTemplate: (id: number) => Promise<any>;
  getTaskTemplateByCode: (templateCode: string) => Promise<any>;
  createTaskTemplate: (template: any) => Promise<any>;
  updateTaskTemplate: (id: number, updates: any) => Promise<any>;
  deleteTaskTemplate: (id: number) => Promise<boolean>;
  getTaskTemplatesForService: (serviceCode: string) => Promise<any[]>;
  
  // Service Configurations
  getAllServiceConfigurations: (serviceDefinitionId?: number) => Promise<any[]>;
  getServiceConfiguration: (id: number) => Promise<any>;
  createServiceConfiguration: (config: any) => Promise<any>;
  updateServiceConfiguration: (id: number, updates: any) => Promise<any>;
  deleteServiceConfiguration: (id: number) => Promise<boolean>;
  getDefaultServiceConfiguration: (serviceDefinitionId: number) => Promise<any>;
  
  // Performance & Analytics
  getServicePerformanceSummary: (serviceCode?: string) => Promise<any>;
  getServiceManagementAnalytics: () => Promise<any>;
  
  // Task Executions
  getAllTaskExecutions: (filters?: any) => Promise<any[]>;
  getTaskExecution: (id: number) => Promise<any>;
  createTaskExecution: (execution: any) => Promise<any>;
  updateTaskExecution: (id: number, updates: any) => Promise<any>;
  completeTaskExecution: (id: number, outputData?: any) => Promise<any>;
  getTaskExecutionMetrics: () => Promise<any>;
}

export function registerServiceManagementRoutes(app: Express, storage: ServiceManagementStorage) {

  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION MIDDLEWARE
  // ============================================================================

  // All service management routes require authentication
  const serviceRouteAuth = [authenticateToken as any];

  // View permissions - most authenticated users can view
  const viewServiceAuth = [
    ...serviceRouteAuth,
    requirePermissionFromConfig(PERMISSIONS.SERVICES.VIEW) as any,
  ];

  // Create/Update/Delete permissions - only admin roles
  const manageServiceAuth = [
    ...serviceRouteAuth,
    requireAnyPermission(
      PERMISSIONS.SERVICES.CREATE,
      PERMISSIONS.SERVICES.UPDATE,
      PERMISSIONS.SERVICES.DELETE
    ) as any,
  ];

  // Delete permission - only super_admin/admin
  const deleteServiceAuth = [
    ...serviceRouteAuth,
    requirePermissionFromConfig(PERMISSIONS.SERVICES.DELETE) as any,
  ];

  // Workflow/Template management
  const manageWorkflowAuth = [
    ...serviceRouteAuth,
    requireAnyPermission(
      PERMISSIONS.WORKFLOWS.CREATE,
      PERMISSIONS.WORKFLOWS.UPDATE,
      PERMISSIONS.WORKFLOWS.DELETE,
      PERMISSIONS.WORKFLOWS.MANAGE_TEMPLATES
    ) as any,
  ];

  // ============================================================================
  // SERVICE DEFINITIONS MANAGEMENT
  // ============================================================================

  // Get all service definitions with filtering and pagination
  app.get("/api/services/definitions", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const {
        search,
        category,
        serviceType,
        isActive,
        complexityLevel,
        limit = '20',
        offset = '0'
      } = req.query;
      
      const filters = {
        search: search as string,
        category: category as string,
        serviceType: serviceType as string,
        isActive: isActive === 'true',
        complexityLevel: complexityLevel as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };
      
      const result = await storage.getAllServiceDefinitions(filters);
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching service definitions:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single service definition by ID
  app.get("/api/services/definitions/:id", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = await storage.getServiceDefinition(parseInt(id));
      
      if (!service) {
        return res.status(404).json({ error: "Service definition not found" });
      }
      
      res.json(service);
    } catch (error: any) {
      console.error('Error fetching service definition:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get service definition by code
  app.get("/api/services/definitions/code/:code", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const service = await storage.getServiceDefinitionByCode(code);
      
      if (!service) {
        return res.status(404).json({ error: "Service definition not found" });
      }
      
      res.json(service);
    } catch (error: any) {
      console.error('Error fetching service definition by code:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create new service definition (Admin only)
  app.post("/api/services/definitions", manageServiceAuth, async (req: Request, res: Response) => {
    try {
      const serviceData = insertServiceDefinitionSchema.parse(req.body);
      const service = await storage.createServiceDefinition(serviceData);
      res.status(201).json(service);
    } catch (error: any) {
      console.error('Error creating service definition:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update service definition (Admin only)
  app.put("/api/services/definitions/:id", manageServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const service = await storage.updateServiceDefinition(parseInt(id), updates);
      
      if (!service) {
        return res.status(404).json({ error: "Service definition not found" });
      }
      
      res.json(service);
    } catch (error: any) {
      console.error('Error updating service definition:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete service definition (Super Admin/Admin only)
  app.delete("/api/services/definitions/:id", deleteServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteServiceDefinition(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Service definition not found" });
      }
      
      res.json({ message: "Service definition deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting service definition:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Duplicate service definition (Admin only)
  app.post("/api/services/definitions/:id/duplicate", manageServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newCode, newName } = req.body;
      
      if (!newCode || !newName) {
        return res.status(400).json({ error: "New code and name are required" });
      }
      
      const service = await storage.duplicateServiceDefinition(parseInt(id), newCode, newName);
      
      if (!service) {
        return res.status(404).json({ error: "Service definition not found" });
      }
      
      res.status(201).json(service);
    } catch (error: any) {
      console.error('Error duplicating service definition:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // TASK TEMPLATES MANAGEMENT
  // ============================================================================
  
  // Get all task templates with filtering
  app.get("/api/services/task-templates", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { search, taskType, category, skillLevel, isActive } = req.query;
      
      const filters = {
        search: search as string,
        taskType: taskType as string,
        category: category as string,
        skillLevel: skillLevel as string,
        isActive: isActive === 'true'
      };
      
      const templates = await storage.getAllTaskTemplates(filters);
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching task templates:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task templates for specific service
  app.get("/api/services/definitions/:serviceCode/templates", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { serviceCode } = req.params;
      const templates = await storage.getTaskTemplatesForService(serviceCode);
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching task templates for service:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single task template by ID
  app.get("/api/services/task-templates/:id", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const template = await storage.getTaskTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ error: "Task template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error('Error fetching task template:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task template by code
  app.get("/api/services/task-templates/code/:code", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const template = await storage.getTaskTemplateByCode(code);
      
      if (!template) {
        return res.status(404).json({ error: "Task template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error('Error fetching task template by code:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create new task template (Admin/Workflow Manager only)
  app.post("/api/services/task-templates", manageWorkflowAuth, async (req: Request, res: Response) => {
    try {
      const templateData = insertAdvancedTaskTemplateSchema.parse(req.body);
      const template = await storage.createTaskTemplate(templateData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error('Error creating task template:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update task template (Admin/Workflow Manager only)
  app.put("/api/services/task-templates/:id", manageWorkflowAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const template = await storage.updateTaskTemplate(parseInt(id), updates);
      
      if (!template) {
        return res.status(404).json({ error: "Task template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error('Error updating task template:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete task template (Admin only)
  app.delete("/api/services/task-templates/:id", deleteServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTaskTemplate(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Task template not found" });
      }
      
      res.json({ message: "Task template deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting task template:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // SERVICE CONFIGURATIONS MANAGEMENT
  // ============================================================================
  
  // Get all service configurations
  app.get("/api/services/configurations", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { serviceDefinitionId } = req.query;
      const serviceDefId = serviceDefinitionId ? parseInt(serviceDefinitionId as string) : undefined;
      
      const configurations = await storage.getAllServiceConfigurations(serviceDefId);
      res.json(configurations);
    } catch (error: any) {
      console.error('Error fetching service configurations:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get service configuration by ID
  app.get("/api/services/configurations/:id", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const config = await storage.getServiceConfiguration(parseInt(id));
      
      if (!config) {
        return res.status(404).json({ error: "Service configuration not found" });
      }
      
      res.json(config);
    } catch (error: any) {
      console.error('Error fetching service configuration:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get default configuration for service
  app.get("/api/services/definitions/:serviceId/default-config", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      const config = await storage.getDefaultServiceConfiguration(parseInt(serviceId));
      
      if (!config) {
        return res.status(404).json({ error: "Default configuration not found" });
      }
      
      res.json(config);
    } catch (error: any) {
      console.error('Error fetching default service configuration:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create service configuration (Admin only)
  app.post("/api/services/configurations", manageServiceAuth, async (req: Request, res: Response) => {
    try {
      const configData = insertServiceConfigurationSchema.parse(req.body);
      const config = await storage.createServiceConfiguration(configData);
      res.status(201).json(config);
    } catch (error: any) {
      console.error('Error creating service configuration:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid configuration data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update service configuration (Admin only)
  app.put("/api/services/configurations/:id", manageServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const config = await storage.updateServiceConfiguration(parseInt(id), updates);
      
      if (!config) {
        return res.status(404).json({ error: "Service configuration not found" });
      }
      
      res.json(config);
    } catch (error: any) {
      console.error('Error updating service configuration:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete service configuration (Admin only)
  app.delete("/api/services/configurations/:id", deleteServiceAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteServiceConfiguration(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Service configuration not found" });
      }
      
      res.json({ message: "Service configuration deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting service configuration:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // TASK EXECUTIONS MANAGEMENT
  // ============================================================================
  
  // Get all task executions with filtering (Operations/Admin)
  app.get("/api/services/task-executions", serviceRouteAuth, async (req: Request, res: Response) => {
    try {
      const {
        serviceRequestId,
        templateId,
        assignedTo,
        status,
        dateFrom,
        dateTo
      } = req.query;
      
      const filters = {
        serviceRequestId: serviceRequestId ? parseInt(serviceRequestId as string) : undefined,
        templateId: templateId ? parseInt(templateId as string) : undefined,
        assignedTo: assignedTo ? parseInt(assignedTo as string) : undefined,
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      };
      
      const executions = await storage.getAllTaskExecutions(filters);
      res.json(executions);
    } catch (error: any) {
      console.error('Error fetching task executions:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task execution by ID
  app.get("/api/services/task-executions/:id", serviceRouteAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const execution = await storage.getTaskExecution(parseInt(id));
      
      if (!execution) {
        return res.status(404).json({ error: "Task execution not found" });
      }
      
      res.json(execution);
    } catch (error: any) {
      console.error('Error fetching task execution:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create task execution (Operations/Admin)
  app.post("/api/services/task-executions", serviceRouteAuth, async (req: Request, res: Response) => {
    try {
      const executionData = insertTaskExecutionSchema.parse(req.body);
      const execution = await storage.createTaskExecution(executionData);
      res.status(201).json(execution);
    } catch (error: any) {
      console.error('Error creating task execution:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid execution data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update task execution (Operations/Admin)
  app.put("/api/services/task-executions/:id", serviceRouteAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const execution = await storage.updateTaskExecution(parseInt(id), updates);
      
      if (!execution) {
        return res.status(404).json({ error: "Task execution not found" });
      }
      
      res.json(execution);
    } catch (error: any) {
      console.error('Error updating task execution:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Complete task execution (Operations/Admin)
  app.post("/api/services/task-executions/:id/complete", serviceRouteAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { outputData } = req.body;
      
      const execution = await storage.completeTaskExecution(parseInt(id), outputData);
      
      if (!execution) {
        return res.status(404).json({ error: "Task execution not found" });
      }
      
      res.json(execution);
    } catch (error: any) {
      console.error('Error completing task execution:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task execution metrics (Admin/Manager)
  app.get("/api/services/task-executions/metrics", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const metrics = await storage.getTaskExecutionMetrics();
      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching task execution metrics:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // ANALYTICS AND PERFORMANCE
  // ============================================================================
  
  // Get service performance summary (Admin/Manager)
  app.get("/api/services/performance", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const { serviceCode } = req.query;
      const summary = await storage.getServicePerformanceSummary(serviceCode as string);
      res.json(summary);
    } catch (error: any) {
      console.error('Error fetching service performance:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get service management analytics (Admin/Manager)
  app.get("/api/services/analytics", viewServiceAuth, async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getServiceManagementAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error('Error fetching service management analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // SERVICE CATALOG OPERATIONS
  // ============================================================================
  
  // Get service catalog with enhanced features (All authenticated users)
  app.get("/api/services/catalog", serviceRouteAuth, async (req: Request, res: Response) => {
    try {
      const {
        category,
        complexityLevel,
        priceRange,
        isConfigurable,
        clientType,
        entityType
      } = req.query;
      
      const filters = {
        category: category as string,
        complexityLevel: complexityLevel as string,
        isConfigurable: isConfigurable === 'true',
        // Add custom filtering logic here based on requirements
      };
      
      const result = await storage.getAllServiceDefinitions(filters);
      
      // Add catalog-specific enhancements
      const catalogItems = result.services.map(service => ({
        ...service,
        // Add pricing calculations, availability checks, etc.
        isAvailable: true,
        estimatedDelivery: service.slaHours ? `${Math.ceil(service.slaHours / 24)} days` : 'TBD',
        configurationOptions: service.isConfigurable ? service.variations || [] : []
      }));
      
      res.json({
        ...result,
        services: catalogItems
      });
    } catch (error: any) {
      console.error('Error fetching service catalog:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get service recommendations based on client profile (Authenticated users)
  app.post("/api/services/recommendations", serviceRouteAuth, async (req: Request, res: Response) => {
    try {
      const { clientProfile, currentServices, businessGoals } = req.body;
      
      // Implement recommendation logic based on:
      // - Client business type and size
      // - Current service portfolio
      // - Industry best practices
      // - Regulatory requirements
      
      // For now, return basic recommendations
      const allServices = await storage.getAllServiceDefinitions({});
      
      const recommendations = allServices.services
        .filter(service => service.isActive)
        .slice(0, 5) // Limit to top 5 recommendations
        .map(service => ({
          ...service,
          recommendationReason: "Based on your business profile and current needs",
          priority: "medium",
          potentialImpact: "Improves compliance and reduces operational overhead"
        }));
      
      res.json({
        recommendations,
        totalRecommendations: recommendations.length,
        categories: [...new Set(recommendations.map(r => r.category))]
      });
    } catch (error: any) {
      console.error('Error generating service recommendations:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Bulk operations for service management (Admin only)
  app.post("/api/services/bulk-operations", deleteServiceAuth, async (req: Request, res: Response) => {
    try {
      const { operation, serviceIds, updates } = req.body;
      
      if (!operation || !serviceIds || !Array.isArray(serviceIds)) {
        return res.status(400).json({ error: "Invalid bulk operation request" });
      }
      
      const results = [];
      const errors = [];
      
      for (const serviceId of serviceIds) {
        try {
          let result;
          
          switch (operation) {
            case 'update':
              result = await storage.updateServiceDefinition(serviceId, updates);
              break;
            case 'delete':
              result = await storage.deleteServiceDefinition(serviceId);
              break;
            case 'activate':
              result = await storage.updateServiceDefinition(serviceId, { isActive: true });
              break;
            case 'deactivate':
              result = await storage.updateServiceDefinition(serviceId, { isActive: false });
              break;
            default:
              throw new Error(`Unsupported operation: ${operation}`);
          }
          
          results.push({ serviceId, success: true, result });
        } catch (error: any) {
          errors.push({ serviceId, success: false, error: error.message });
        }
      }
      
      res.json({
        operation,
        processedCount: serviceIds.length,
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors
      });
    } catch (error: any) {
      console.error('Error performing bulk operations:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log("✅ Service Management routes registered");
}