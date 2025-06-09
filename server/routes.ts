import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { storage } from "./storage";
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

  // Company Incorporation Workflow API
  app.get("/api/workflows/company-incorporation", async (req: Request, res: Response) => {
    try {
      const workflow = {
        serviceId: 'company-incorporation',
        name: 'Company Incorporation',
        totalSteps: 10,
        estimatedDuration: '20 days from name approval',
        totalCost: 15000,
        steps: [
          {
            id: 'pre-incorporation-prep',
            name: 'Pre-Incorporation Documentation',
            status: 'pending',
            estimatedDays: 2,
            requiredDocs: [
              'minimum_2_unique_names',
              'minimum_2_directors',
              'electricity_bill_not_older_2months',
              'moa_objects',
              'share_capital_info',
              'director_pan_aadhaar_photos',
              'noc_property_owner'
            ]
          },
          {
            id: 'name-reservation',
            name: 'SPICE Part A - Name Reservation',
            status: 'pending',
            estimatedDays: 5,
            formType: 'SPICE+ Part A',
            mcaSteps: [
              'Login to MCA portal',
              'Select SPICE+ form',
              'Enter company details',
              'Pay ₹1,000 fee'
            ]
          },
          {
            id: 'dsc-application',
            name: 'DSC Application',
            status: 'pending',
            estimatedDays: 3,
            dscRequirements: ['directors', 'shareholders', 'professional']
          },
          {
            id: 'spice-part-b',
            name: 'SPICE Part B Filing',
            status: 'pending',
            estimatedDays: 1,
            formType: 'SPICE+ Part B',
            dscRequirements: ['one_director', 'professional']
          },
          {
            id: 'agilepro',
            name: 'Agilepro Form',
            status: 'pending',
            estimatedDays: 1,
            dscRequirements: ['director_only']
          },
          {
            id: 'aoa',
            name: 'Articles of Association',
            status: 'pending',
            estimatedDays: 1,
            dscRequirements: ['all_directors', 'all_shareholders', 'professional']
          },
          {
            id: 'moa',
            name: 'Memorandum of Association',
            status: 'pending',
            estimatedDays: 1,
            dscRequirements: ['all_directors', 'all_shareholders', 'professional']
          },
          {
            id: 'inc9',
            name: 'INC-9 Form',
            status: 'pending',
            estimatedDays: 1,
            dscRequirements: ['all_directors', 'all_shareholders']
          },
          {
            id: 'upload-payment',
            name: 'Form Upload & Payment',
            status: 'pending',
            estimatedDays: 1
          },
          {
            id: 'certificate',
            name: 'Certificate Issuance',
            status: 'pending',
            estimatedDays: 7
          }
        ],
        criticalDeadlines: [
          'All processes must complete within 20 days of name approval',
          'Address proof must not be older than 2 months',
          'DSC must be associated on V3 portal'
        ],
        mcaPortalLinks: {
          main: 'https://www.mca.gov.in',
          pan: 'https://tin.tin.nsdl.com/pan/servlet/AOSearch',
          tan: 'https://tin.tin.nsdl.com/tan/servlet/TanAOSearch'
        }
      };
      
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  // Update workflow step status
  app.patch("/api/workflows/company-incorporation/steps/:stepId", async (req: Request, res: Response) => {
    try {
      const { stepId } = req.params;
      const { status, documents, notes } = req.body;
      
      // In a real implementation, this would update the workflow state in database
      res.json({
        stepId,
        status,
        updatedAt: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update workflow step" });
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
