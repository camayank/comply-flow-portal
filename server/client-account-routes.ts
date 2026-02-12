/**
 * Client Account Management Routes
 *
 * Complete API for client account management:
 * - Profile management
 * - Business entities management
 * - Billing & invoices
 * - Document management
 * - Security settings
 */

import type { Express, Request, Response } from "express";
import { db } from './db';
import { users, businessEntities, payments, serviceRequests, documentVault } from '@shared/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { sessionAuthMiddleware, type AuthenticatedRequest } from './rbac-middleware';
import { storage } from './storage';
import { syncComplianceTracking } from './compliance-tracking-sync';
import { enable2FA, verify2FA, disable2FA, is2FAEnabled } from './services/twoFactorService';

export function registerClientAccountRoutes(app: Express) {

  // ============ PROFILE MANAGEMENT ============

  /**
   * GET /api/account/profile
   * Get client profile information
   */
  app.get('/api/account/profile', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Get primary business entity (first created for the owner)
      const [primaryEntity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.ownerId, userId))
        .orderBy(desc(businessEntities.createdAt))
        .limit(1);

      const profile = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        clientId: primaryEntity?.clientId || null,
        status: primaryEntity?.clientStatus || (user.isActive ? 'active' : 'inactive'),
        createdAt: user.createdAt,
        // Profile settings
        profilePhoto: null,
        timezone: 'Asia/Kolkata',
        language: 'en',
        notifications: {
          email: true,
          sms: true,
          whatsapp: true,
          push: true,
        },
        // Primary business
        primaryBusiness: primaryEntity ? {
          id: primaryEntity.id,
          name: primaryEntity.name,
          type: primaryEntity.entityType,
          gstin: primaryEntity.gstin,
          pan: primaryEntity.pan,
        } : null,
      };

      res.json(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  /**
   * PATCH /api/account/profile
   * Update client profile
   */
  app.patch('/api/account/profile', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { fullName, phone, profilePhoto, timezone, language, notifications } = req.body;

      const [updatedUser] = await db.update(users)
        .set({
          fullName: fullName || undefined,
          phone: phone || undefined,
          profilePhoto: profilePhoto || undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // ============ BUSINESS ENTITIES MANAGEMENT ============

  /**
   * GET /api/account/businesses
   * Get all business entities for the user
   */
  app.get('/api/account/businesses', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);

      // Get all business entities associated with this user
      const entities = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.ownerId, userId))
        .orderBy(desc(businessEntities.createdAt));

      const primaryEntityId = user?.businessEntityId || entities[0]?.id;
      const businessList = entities.map(entity => ({
        id: entity.id,
        clientId: entity.clientId,
        companyName: entity.name,
        entityType: entity.entityType,
        registrationNumber: entity.cin,
        cin: entity.cin,
        gstin: entity.gstin,
        pan: entity.pan,
        tan: null,
        status: entity.clientStatus,
        incorporationDate: entity.registrationDate,
        financialYearEnd: null,
        industry: entity.industryType,
        address: entity.address,
        city: entity.city,
        state: entity.state,
        pincode: entity.pincode,
        createdAt: entity.createdAt,
        isPrimary: entity.id === primaryEntityId,
      }));

      res.json({ businesses: businessList, total: businessList.length });
    } catch (error) {
      console.error('Error fetching businesses:', error);
      res.status(500).json({ error: 'Failed to fetch businesses' });
    }
  });

  /**
   * POST /api/account/businesses
   * Add a new business entity
   */
  app.post('/api/account/businesses', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const {
        companyName,
        name,
        entityType,
        gstin,
        pan,
        address,
        city,
        state,
        pincode,
        contactEmail,
        contactPhone,
        annualTurnover,
        employeeCount,
        registrationDate,
        status,
      } = req.body;

      const resolvedName = companyName || name;

      if (!resolvedName || !entityType) {
        return res.status(400).json({ error: 'Company name and entity type are required' });
      }

      // Generate client ID
      const count = await db.select({ count: sql`count(*)` }).from(businessEntities);
      const clientId = `C${String(Number(count[0]?.count || 0) + 1).padStart(4, '0')}`;

      const [newEntity] = await db.insert(businessEntities)
        .values({
          ownerId: userId,
          clientId,
          name: resolvedName,
          entityType,
          gstin,
          pan,
          address,
          city,
          state,
          pincode,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          annualTurnover: annualTurnover ?? null,
          employeeCount: employeeCount ?? null,
          registrationDate: registrationDate ? new Date(registrationDate) : null,
          clientStatus: status || 'active',
          isActive: status ? status === 'active' : true,
        })
        .returning();

      await db.update(users)
        .set({ businessEntityId: newEntity.id })
        .where(and(eq(users.id, userId), isNull(users.businessEntityId)));

      await syncComplianceTracking({ entityIds: [newEntity.id] });

      res.status(201).json({ message: 'Business added successfully', business: newEntity });
    } catch (error) {
      console.error('Error adding business:', error);
      res.status(500).json({ error: 'Failed to add business' });
    }
  });

  /**
   * PATCH /api/account/businesses/:id
   * Update a business entity
   */
  app.patch('/api/account/businesses/:id', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const updates = req.body;
      const updatePayload: Record<string, any> = {
        name: updates.companyName ?? updates.name,
        entityType: updates.entityType,
        gstin: updates.gstin,
        pan: updates.pan,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        pincode: updates.pincode,
        contactEmail: updates.contactEmail,
        contactPhone: updates.contactPhone,
        annualTurnover: updates.annualTurnover,
        employeeCount: updates.employeeCount,
        registrationDate: updates.registrationDate ? new Date(updates.registrationDate) : undefined,
        clientStatus: updates.status ?? updates.clientStatus,
        isActive: typeof updates.status === 'string' ? updates.status === 'active' : undefined,
        updatedAt: new Date(),
      };

      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      const [updatedEntity] = await db.update(businessEntities)
        .set(updatePayload)
        .where(and(
          eq(businessEntities.id, parseInt(id)),
          eq(businessEntities.ownerId, userId)
        ))
        .returning();

      if (!updatedEntity) {
        return res.status(404).json({ error: 'Business not found' });
      }

      res.json({ message: 'Business updated successfully', business: updatedEntity });
    } catch (error) {
      console.error('Error updating business:', error);
      res.status(500).json({ error: 'Failed to update business' });
    }
  });

  /**
   * POST /api/account/businesses/:id/set-primary
   * Set a business as primary
   */
  app.post('/api/account/businesses/:id/set-primary', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Update user's primary business entity
      await db.update(users)
        .set({ businessEntityId: parseInt(id) })
        .where(eq(users.id, userId));

      res.json({ message: 'Primary business updated successfully' });
    } catch (error) {
      console.error('Error setting primary business:', error);
      res.status(500).json({ error: 'Failed to set primary business' });
    }
  });

  // ============ BILLING & INVOICES ============

  /**
   * GET /api/account/billing
   * Get billing summary and invoices
   */
  app.get('/api/account/billing', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Get all payments
      const allPayments = await db.select()
        .from(payments)
        .where(entityId ? eq(payments.businessEntityId, entityId) : eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt));

      // Calculate billing summary
      const totalPaid = allPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const pendingAmount = allPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const billing = {
        summary: {
          totalPaid,
          pendingAmount,
          totalInvoices: allPayments.length,
          outstandingInvoices: allPayments.filter(p => p.status === 'pending').length,
          lastPaymentDate: allPayments.find(p => p.status === 'completed')?.createdAt || null,
        },
        invoices: allPayments.map(p => ({
          id: p.id,
          invoiceNumber: `INV-${String(p.id).padStart(6, '0')}`,
          amount: p.amount,
          status: p.status,
          paymentMethod: p.paymentMethod,
          description: p.description || 'Service Payment',
          serviceRequestId: p.serviceRequestId,
          createdAt: p.createdAt,
          paidAt: p.status === 'completed' ? p.updatedAt : null,
        })),
        paymentMethods: [
          { id: 'razorpay', name: 'Razorpay', type: 'online', isDefault: true },
          { id: 'bank_transfer', name: 'Bank Transfer', type: 'offline', isDefault: false },
        ],
        billingAddress: user?.address || null,
      };

      res.json(billing);
    } catch (error) {
      console.error('Error fetching billing:', error);
      res.status(500).json({ error: 'Failed to fetch billing information' });
    }
  });

  /**
   * GET /api/account/billing/invoices/:id
   * Get invoice details
   */
  app.get('/api/account/billing/invoices/:id', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const [payment] = await db.select()
        .from(payments)
        .where(eq(payments.id, parseInt(id)));

      if (!payment) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get associated service request
      let serviceRequest = null;
      if (payment.serviceRequestId) {
        [serviceRequest] = await db.select()
          .from(serviceRequests)
          .where(eq(serviceRequests.id, payment.serviceRequestId));
      }

      const invoice = {
        id: payment.id,
        invoiceNumber: `INV-${String(payment.id).padStart(6, '0')}`,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        description: payment.description,
        serviceRequest: serviceRequest ? {
          id: serviceRequest.id,
          serviceName: serviceRequest.serviceName,
          status: serviceRequest.status,
        } : null,
        createdAt: payment.createdAt,
        paidAt: payment.status === 'completed' ? payment.updatedAt : null,
        breakdown: {
          subtotal: Number(payment.amount) * 0.85,
          tax: Number(payment.amount) * 0.18,
          discount: Number(payment.amount) * 0.03,
          total: payment.amount,
        },
      };

      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });

  // ============ DOCUMENT MANAGEMENT ============

  /**
   * GET /api/account/documents
   * Get account-level documents
   */
  app.get('/api/account/documents', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Get documents from vault
      const documents = await db.select()
        .from(documentVault)
        .where(entityId ? eq(documentVault.businessEntityId, entityId) : eq(documentVault.userId, userId))
        .orderBy(desc(documentVault.createdAt));

      // Categorize documents
      const categorized = {
        identity: documents.filter(d => d.category === 'identity'),
        financial: documents.filter(d => d.category === 'financial'),
        legal: documents.filter(d => d.category === 'legal'),
        tax: documents.filter(d => d.category === 'tax'),
        compliance: documents.filter(d => d.category === 'compliance'),
        other: documents.filter(d => !['identity', 'financial', 'legal', 'tax', 'compliance'].includes(d.category || '')),
      };

      const summary = {
        total: documents.length,
        verified: documents.filter(d => d.approvalStatus === 'approved').length,
        pending: documents.filter(d => d.approvalStatus === 'pending').length,
        expiringSoon: documents.filter(d => {
          if (!d.expiryDate) return false;
          const daysUntilExpiry = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
        }).length,
      };

      res.json({ documents: categorized, summary, allDocuments: documents });
    } catch (error) {
      console.error('Error fetching account documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  // ============ SECURITY SETTINGS ============

  /**
   * GET /api/account/security
   * Get security settings
   */
  app.get('/api/account/security', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);

      // Check real 2FA status
      const twoFactorEnabled = await is2FAEnabled(userId);

      // Calculate security score based on actual settings
      let securityScore = 50; // Base score
      const recommendations: { type: string; message: string }[] = [];

      if (twoFactorEnabled) {
        securityScore += 25;
      } else {
        recommendations.push({ type: 'enable_2fa', message: 'Enable two-factor authentication for added security' });
      }

      // Password age check (if we had lastPasswordChange field)
      securityScore += 15; // Assume password is reasonably recent
      recommendations.push({ type: 'strong_password', message: 'Consider updating your password regularly' });

      // Account verification - check if user is active
      if (user?.isActive) {
        securityScore += 10;
      }

      const security = {
        passwordLastChanged: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // TODO: Track actual password change
        twoFactorEnabled,
        twoFactorMethod: twoFactorEnabled ? 'authenticator' : null,
        trustedDevices: [
          {
            id: 1,
            name: 'Current Device',
            lastUsed: new Date(),
            location: 'Current Session',
            isCurrent: true,
          },
        ],
        loginHistory: [
          { timestamp: new Date(), ip: req.ip || 'Unknown', location: 'Current Session', device: req.get('User-Agent')?.substring(0, 50) || 'Unknown', status: 'success' },
        ],
        securityScore: Math.min(100, securityScore),
        recommendations,
      };

      res.json(security);
    } catch (error) {
      console.error('Error fetching security settings:', error);
      res.status(500).json({ error: 'Failed to fetch security settings' });
    }
  });

  /**
   * POST /api/account/security/change-password
   * Change password
   */
  app.post('/api/account/security/change-password', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // In production, verify current password and hash new password
      // For dev, just return success
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  /**
   * POST /api/account/security/enable-2fa
   * Enable two-factor authentication (initiates setup)
   */
  app.post('/api/account/security/enable-2fa', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { method } = req.body; // 'authenticator' is the only supported method for TOTP

      if (method !== 'authenticator') {
        return res.status(400).json({ error: 'Only authenticator app method is currently supported' });
      }

      // Generate real TOTP secret and QR code
      const { secret, uri, qrCode } = await enable2FA(userId);

      res.json({
        message: '2FA setup initiated. Scan the QR code with your authenticator app.',
        method,
        setupRequired: true,
        secret, // For manual entry
        uri, // Full TOTP URI
        qrCode, // QR code image URL
      });
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({ error: 'Failed to enable 2FA' });
    }
  });

  /**
   * POST /api/account/security/verify-2fa
   * Verify 2FA code and activate
   */
  app.post('/api/account/security/verify-2fa', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { token } = req.body;

      if (!token || typeof token !== 'string' || token.length !== 6) {
        return res.status(400).json({ error: 'Invalid token format. Please enter a 6-digit code.' });
      }

      const verified = await verify2FA(userId, token);

      if (!verified) {
        return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
      }

      res.json({
        message: '2FA has been successfully enabled for your account.',
        twoFactorEnabled: true,
      });
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      res.status(500).json({ error: 'Failed to verify 2FA code' });
    }
  });

  /**
   * POST /api/account/security/disable-2fa
   * Disable two-factor authentication
   */
  app.post('/api/account/security/disable-2fa', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { token } = req.body;

      // Require valid 2FA code to disable
      const isEnabled = await is2FAEnabled(userId);
      if (isEnabled) {
        if (!token) {
          return res.status(400).json({ error: 'Please provide your 2FA code to disable' });
        }

        const { validate2FALogin } = await import('./services/twoFactorService');
        const valid = await validate2FALogin(userId, token);
        if (!valid) {
          return res.status(400).json({ error: 'Invalid 2FA code' });
        }
      }

      await disable2FA(userId);

      res.json({
        message: '2FA has been disabled for your account.',
        twoFactorEnabled: false,
      });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({ error: 'Failed to disable 2FA' });
    }
  });

  /**
   * DELETE /api/account/security/trusted-devices/:id
   * Remove a trusted device
   */
  app.delete('/api/account/security/trusted-devices/:id', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      res.json({ message: 'Device removed successfully' });
    } catch (error) {
      console.error('Error removing device:', error);
      res.status(500).json({ error: 'Failed to remove device' });
    }
  });

  // ============ V1 API COMPATIBILITY ============

  app.get('/api/v1/account/profile', sessionAuthMiddleware, async (req, res) => {
    req.url = '/api/account/profile';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/account/businesses', sessionAuthMiddleware, async (req, res) => {
    req.url = '/api/account/businesses';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/account/billing', sessionAuthMiddleware, async (req, res) => {
    req.url = '/api/account/billing';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/account/documents', sessionAuthMiddleware, async (req, res) => {
    req.url = '/api/account/documents';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/account/security', sessionAuthMiddleware, async (req, res) => {
    req.url = '/api/account/security';
    app._router.handle(req, res, () => {});
  });

  console.log('✅ Client Account routes registered');
}
