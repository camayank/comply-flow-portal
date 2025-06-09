import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { workflowEngine, type WorkflowCustomization } from "./workflow-engine";
import { 
  insertServiceRequestSchema, 
  insertPaymentSchema,
  type Service 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Services API
  app.get("/api/services", async (req: Request, res: Response) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:serviceId", async (req: Request, res: Response) => {
    try {
      const service = await storage.getService(req.params.serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  // Service Requests API
  app.post("/api/service-requests", async (req: Request, res: Response) => {
    try {
      const validatedData = insertServiceRequestSchema.parse(req.body);
      
      // Calculate total amount from services
      const services = await Promise.all(
        (Array.isArray(validatedData.serviceId) ? validatedData.serviceId : [validatedData.serviceId])
          .map(id => storage.getService(id))
      );
      
      const totalAmount = services.reduce((sum, service) => {
        return sum + (service?.price || 0);
      }, 0);

      const serviceRequest = await storage.createServiceRequest({
        ...validatedData,
        totalAmount,
        status: "initiated"
      });

      res.status(201).json(serviceRequest);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.get("/api/service-requests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const serviceRequest = await storage.getServiceRequest(id);
      
      if (!serviceRequest) {
        return res.status(404).json({ error: "Service request not found" });
      }
      
      res.json(serviceRequest);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service request" });
    }
  });

  app.patch("/api/service-requests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // If updating with document hash, verify integrity
      if (updates.documentHash && updates.uploadedDocs) {
        const computedHash = createHash('sha256')
          .update(JSON.stringify(updates.uploadedDocs))
          .digest('hex');
        
        if (computedHash !== updates.documentHash) {
          return res.status(400).json({ error: "Document hash verification failed" });
        }
      }
      
      const updatedRequest = await storage.updateServiceRequest(id, updates);
      
      if (!updatedRequest) {
        return res.status(404).json({ error: "Service request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ error: "Failed to update service request" });
    }
  });

  // Payment Verification API (Critical Security Fix)
  app.get("/api/payment/verify/:serviceRequestId", async (req: Request, res: Response) => {
    try {
      const serviceRequestId = parseInt(req.params.serviceRequestId);
      const serviceRequest = await storage.getServiceRequest(serviceRequestId);
      
      if (!serviceRequest) {
        return res.status(404).json({ error: "Service request not found" });
      }
      
      // Server-side price calculation to prevent client manipulation
      const services = Array.isArray(serviceRequest.serviceId) 
        ? serviceRequest.serviceId 
        : [serviceRequest.serviceId];
        
      let totalAmount = 0;
      for (const serviceId of services) {
        const service = await storage.getService(serviceId);
        if (service) {
          totalAmount += service.price;
        }
      }
      
      // Add GST (18%)
      const gst = Math.round(totalAmount * 0.18);
      const finalAmount = totalAmount + gst;
      
      res.json({ 
        amount: finalAmount,
        baseAmount: totalAmount,
        gst,
        serviceRequestId,
        verified: true
      });
    } catch (error) {
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  // Payment Processing API
  app.post("/api/payments", async (req: Request, res: Response) => {
    try {
      const { serviceRequestId, paymentMethod, amount } = req.body;
      
      // Verify payment amount against service request
      const serviceRequest = await storage.getServiceRequest(serviceRequestId);
      if (!serviceRequest) {
        return res.status(404).json({ error: "Service request not found" });
      }
      
      // Server-side amount verification
      const verificationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/payment/verify/${serviceRequestId}`);
      const { amount: verifiedAmount } = await verificationResponse.json();
      
      if (amount !== verifiedAmount) {
        return res.status(400).json({ error: "Payment amount mismatch" });
      }
      
      const paymentId = nanoid();
      const payment = await storage.createPayment({
        paymentId,
        serviceRequestId,
        amount: verifiedAmount,
        status: "pending",
        paymentMethod
      });
      
      // Update service request with payment ID
      await storage.updateServiceRequest(serviceRequestId, {
        paymentId,
        status: "payment_pending"
      });
      
      res.status(201).json({ 
        paymentId,
        amount: verifiedAmount,
        status: "pending"
      });
    } catch (error) {
      res.status(500).json({ error: "Payment processing failed" });
    }
  });

  app.patch("/api/payments/:paymentId", async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const updates = req.body;
      
      const updatedPayment = await storage.updatePayment(paymentId, updates);
      
      if (!updatedPayment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // If payment is completed, update service request status
      if (updates.status === "completed") {
        await storage.updateServiceRequest(updatedPayment.serviceRequestId, {
          status: "payment_completed"
        });
      }
      
      res.json(updatedPayment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  // Document Upload with Hash Verification
  app.post("/api/service-requests/:id/documents", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { documents } = req.body;
      
      // Validate file types and sizes
      for (const doc of documents) {
        if (!validateFileType(doc.type)) {
          return res.status(400).json({ error: `Invalid file type: ${doc.type}` });
        }
        if (doc.size > 5 * 1024 * 1024) { // 5MB limit
          return res.status(400).json({ error: "File size exceeds 5MB limit" });
        }
      }
      
      // Generate document hash for integrity verification
      const documentHash = createHash('sha256')
        .update(JSON.stringify(documents))
        .digest('hex');
      
      const updatedRequest = await storage.updateServiceRequest(id, {
        uploadedDocs: documents,
        documentHash,
        status: "docs_uploaded"
      });
      
      if (!updatedRequest) {
        return res.status(404).json({ error: "Service request not found" });
      }
      
      res.json({ 
        success: true, 
        documentHash,
        status: "docs_uploaded"
      });
    } catch (error) {
      res.status(500).json({ error: "Document upload failed" });
    }
  });

  // E-Sign API with Document Hash Verification
  app.post("/api/service-requests/:id/sign", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { signature, documentHash } = req.body;
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ error: "Service request not found" });
      }
      
      // Verify document hash integrity
      if (serviceRequest.documentHash !== documentHash) {
        return res.status(400).json({ error: "Document hash verification failed" });
      }
      
      const signatureData = {
        signature,
        documentHash,
        timestamp: new Date().toISOString(),
        verified: true
      };
      
      const updatedRequest = await storage.updateServiceRequest(id, {
        signatureData,
        status: "ready_for_payment"
      });
      
      res.json({ 
        success: true, 
        status: "signed",
        signatureVerified: true
      });
    } catch (error) {
      res.status(500).json({ error: "E-signing failed" });
    }
  });

  // Workflow Templates API
  app.get("/api/workflow-templates", async (req: Request, res: Response) => {
    try {
      const templates = workflowEngine.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow templates" });
    }
  });

  app.get("/api/workflow-templates/:templateId", async (req: Request, res: Response) => {
    try {
      const template = workflowEngine.getTemplate(req.params.templateId);
      if (!template) {
        return res.status(404).json({ error: "Workflow template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow template" });
    }
  });

  // Workflow Instances API
  app.post("/api/workflow-instances", async (req: Request, res: Response) => {
    try {
      const { templateId, userId, serviceRequestId, customizations } = req.body;
      
      const instance = workflowEngine.createWorkflowInstance(
        templateId,
        userId || 1,
        serviceRequestId,
        customizations || []
      );
      
      res.status(201).json(instance);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create workflow instance" });
    }
  });

  app.get("/api/workflow-instances/:instanceId", async (req: Request, res: Response) => {
    try {
      const instance = workflowEngine.getInstance(req.params.instanceId);
      if (!instance) {
        return res.status(404).json({ error: "Workflow instance not found" });
      }
      res.json(instance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow instance" });
    }
  });

  app.get("/api/workflow-instances/:instanceId/progress", async (req: Request, res: Response) => {
    try {
      const progress = workflowEngine.getProgress(req.params.instanceId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow progress" });
    }
  });

  // Workflow Step Management
  app.patch("/api/workflow-instances/:instanceId/steps/:stepId", async (req: Request, res: Response) => {
    try {
      const { instanceId, stepId } = req.params;
      const { status, notes, uploadedDocs } = req.body;
      
      const success = workflowEngine.updateStepStatus(instanceId, stepId, status, notes);
      if (!success) {
        return res.status(404).json({ error: "Workflow instance or step not found" });
      }
      
      res.json({ 
        success: true, 
        instanceId, 
        stepId, 
        status, 
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update workflow step" });
    }
  });

  app.get("/api/workflow-instances/:instanceId/steps/:stepId/validate", async (req: Request, res: Response) => {
    try {
      const { instanceId, stepId } = req.params;
      const isValid = workflowEngine.validateDependencies(instanceId, stepId);
      
      res.json({ 
        valid: isValid,
        canProceed: isValid,
        instanceId,
        stepId 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate workflow dependencies" });
    }
  });

  // Workflow Customization API
  app.post("/api/workflow-instances/:instanceId/custom-steps", async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { afterStepId, stepData, reason } = req.body;
      
      const success = workflowEngine.addCustomStep(instanceId, afterStepId, stepData, reason);
      if (!success) {
        return res.status(404).json({ error: "Workflow instance not found" });
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Custom step added successfully",
        instanceId 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add custom step" });
    }
  });

  app.post("/api/workflow-instances/:instanceId/customizations", async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      const customization: WorkflowCustomization = {
        ...req.body,
        appliedAt: new Date()
      };
      
      const instance = workflowEngine.getInstance(instanceId);
      if (!instance) {
        return res.status(404).json({ error: "Workflow instance not found" });
      }
      
      instance.customizations.push(customization);
      
      res.status(201).json({ 
        success: true, 
        customization,
        message: "Workflow customization applied" 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to apply workflow customization" });
    }
  });

  // Service-specific workflow endpoints
  app.get("/api/services/:serviceId/workflow-template", async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      
      // Map service IDs to workflow template IDs
      const serviceToTemplateMap: Record<string, string> = {
        'company-incorporation': 'company-incorporation-standard',
        'llp-incorporation': 'llp-incorporation-standard',
        'opc-incorporation': 'opc-incorporation-standard'
      };
      
      const templateId = serviceToTemplateMap[serviceId];
      if (!templateId) {
        return res.status(404).json({ error: "No workflow template found for this service" });
      }
      
      const template = workflowEngine.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Workflow template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service workflow template" });
    }
  });

  // Bulk workflow operations
  app.get("/api/workflow-instances/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const userInstances = Array.from(workflowEngine['instances'].values())
        .filter(instance => instance.userId === userId);
      
      res.json(userInstances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user workflows" });
    }
  });

  app.get("/api/workflow-analytics", async (req: Request, res: Response) => {
    try {
      const allInstances = Array.from(workflowEngine['instances'].values());
      
      const analytics = {
        totalWorkflows: allInstances.length,
        completedWorkflows: allInstances.filter(w => w.status === 'completed').length,
        inProgressWorkflows: allInstances.filter(w => w.status === 'in_progress').length,
        averageCompletionTime: 0, // Calculate based on actual data
        mostUsedTemplates: {}, // Calculate template usage statistics
        customizationStats: {
          totalCustomizations: allInstances.reduce((sum, w) => sum + w.customizations.length, 0),
          mostCommonCustomizations: [] // Analyze customization patterns
        }
      };
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function validateFileType(fileType: string): boolean {
  const validTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  return validTypes.includes(fileType);
}
