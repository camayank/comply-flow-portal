import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  users,
  businessEntities,
  serviceRequests,
  documentsUploads,
  payments,
  complianceTracking
} from '@shared/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// CLIENT PROFILE MANAGEMENT ROUTES
// Comprehensive profile viewing and management for clients
// ============================================================================

// Get complete client profile
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user details
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get associated business entity
    let businessEntity = null;
    if (user.businessEntityId) {
      const [entity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.id, user.businessEntityId))
        .limit(1);
      businessEntity = entity;
    }

    // Get profile completeness
    const completeness = calculateProfileCompleteness(user, businessEntity);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      businessEntity: businessEntity ? {
        id: businessEntity.id,
        entityName: businessEntity.entityName,
        entityType: businessEntity.entityType,
        clientId: businessEntity.clientId,
        cin: businessEntity.cin,
        gstin: businessEntity.gstin,
        pan: businessEntity.pan,
        tan: businessEntity.tan,
        incorporationDate: businessEntity.incorporationDate,
        registeredAddress: businessEntity.registeredAddress,
        status: businessEntity.status
      } : null,
      profileCompleteness: completeness,
      memberSince: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.patch('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { fullName, phone, avatarUrl, preferences } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (preferences !== undefined) updateData.preferences = preferences;

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, Number(userId)))
      .returning();

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile statistics
router.get('/:userId/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user's business entity
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (!user?.businessEntityId) {
      return res.json({
        serviceRequests: { total: 0, active: 0, completed: 0 },
        documents: { total: 0, verified: 0, pending: 0 },
        payments: { total: 0, paid: 0, pending: 0 },
        compliance: { total: 0, compliant: 0, overdue: 0 }
      });
    }

    const entityId = user.businessEntityId;

    // Service Requests stats
    const serviceStats = await db.select({
      status: serviceRequests.status,
      count: count()
    })
      .from(serviceRequests)
      .where(eq(serviceRequests.businessEntityId, entityId))
      .groupBy(serviceRequests.status);

    // Documents stats
    const docStats = await db.select({
      status: documentsUploads.verificationStatus,
      count: count()
    })
      .from(documentsUploads)
      .where(eq(documentsUploads.businessEntityId, entityId))
      .groupBy(documentsUploads.verificationStatus);

    // Payments stats
    const paymentStats = await db.select({
      status: payments.status,
      count: count()
    })
      .from(payments)
      .where(eq(payments.businessEntityId, entityId))
      .groupBy(payments.status);

    // Compliance stats
    const complianceStats = await db.select({
      status: complianceTracking.status,
      count: count()
    })
      .from(complianceTracking)
      .where(eq(complianceTracking.businessEntityId, entityId))
      .groupBy(complianceTracking.status);

    res.json({
      serviceRequests: {
        total: serviceStats.reduce((sum, s) => sum + (s.count || 0), 0),
        active: serviceStats.find(s => s.status === 'in_progress')?.count || 0,
        completed: serviceStats.find(s => s.status === 'completed')?.count || 0,
        pending: serviceStats.find(s => s.status === 'pending')?.count || 0
      },
      documents: {
        total: docStats.reduce((sum, s) => sum + (s.count || 0), 0),
        verified: docStats.find(s => s.status === 'verified')?.count || 0,
        pending: docStats.find(s => s.status === 'pending')?.count || 0
      },
      payments: {
        total: paymentStats.reduce((sum, s) => sum + (s.count || 0), 0),
        paid: paymentStats.find(s => s.status === 'completed')?.count || 0,
        pending: paymentStats.find(s => s.status === 'pending')?.count || 0
      },
      compliance: {
        total: complianceStats.reduce((sum, s) => sum + (s.count || 0), 0),
        compliant: complianceStats.find(s => s.status === 'completed')?.count || 0,
        overdue: complianceStats.find(s => s.status === 'overdue')?.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity history
router.get('/:userId/activity', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (!user?.businessEntityId) {
      return res.json({ activities: [], total: 0 });
    }

    // Get recent service requests as activity
    const recentServices = await db.select({
      id: serviceRequests.id,
      type: sql<string>`'service_request'`,
      title: serviceRequests.serviceId,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt
    })
      .from(serviceRequests)
      .where(eq(serviceRequests.businessEntityId, user.businessEntityId))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(Number(limit));

    // Get recent documents
    const recentDocs = await db.select({
      id: documentsUploads.id,
      type: sql<string>`'document'`,
      title: documentsUploads.documentType,
      status: documentsUploads.verificationStatus,
      createdAt: documentsUploads.uploadedAt
    })
      .from(documentsUploads)
      .where(eq(documentsUploads.businessEntityId, user.businessEntityId))
      .orderBy(desc(documentsUploads.uploadedAt))
      .limit(Number(limit));

    // Combine and sort
    const activities = [...recentServices, ...recentDocs]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, Number(limit));

    res.json({
      activities: activities.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        status: a.status,
        timestamp: a.createdAt
      })),
      total: activities.length
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification preferences
router.get('/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Default preferences if not set
    const preferences = user.preferences || {
      notifications: {
        email: true,
        sms: true,
        push: false,
        whatsapp: true
      },
      alerts: {
        complianceDeadlines: true,
        paymentReminders: true,
        serviceUpdates: true,
        newsletters: false
      },
      display: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY'
      }
    };

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification preferences
router.patch('/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const newPreferences = req.body;

    const [updatedUser] = await db.update(users)
      .set({
        preferences: newPreferences,
        updatedAt: new Date()
      })
      .where(eq(users.id, Number(userId)))
      .returning();

    res.json({ success: true, preferences: updatedUser.preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get connected accounts (for SSO)
router.get('/:userId/connections', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // In production, this would fetch from a connected accounts table
    const connections = [
      { provider: 'google', connected: false, email: null },
      { provider: 'microsoft', connected: false, email: null },
      { provider: 'tally', connected: false, accountId: null },
      { provider: 'zoho', connected: false, accountId: null }
    ];

    res.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update business entity details
router.patch('/:userId/business', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (!user?.businessEntityId) {
      return res.status(400).json({ error: 'No business entity associated' });
    }

    const [updatedEntity] = await db.update(businessEntities)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(businessEntities.id, user.businessEntityId))
      .returning();

    res.json(updatedEntity);
  } catch (error) {
    console.error('Error updating business entity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account (soft delete)
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Soft delete - mark as inactive
    const [updatedUser] = await db.update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        deletionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(users.id, Number(userId)))
      .returning();

    res.json({ success: true, message: 'Account deactivated' });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate profile completeness
function calculateProfileCompleteness(user: any, entity: any): { percentage: number; missing: string[] } {
  const missing: string[] = [];
  let completed = 0;
  const total = 12;

  // User fields
  if (user.fullName) completed++; else missing.push('Full Name');
  if (user.email) completed++; else missing.push('Email');
  if (user.phone) completed++; else missing.push('Phone Number');
  if (user.isEmailVerified) completed++; else missing.push('Email Verification');
  if (user.isPhoneVerified) completed++; else missing.push('Phone Verification');
  if (user.avatarUrl) completed++; else missing.push('Profile Photo');

  // Business entity fields
  if (entity) {
    if (entity.entityName) completed++; else missing.push('Business Name');
    if (entity.gstin) completed++; else missing.push('GSTIN');
    if (entity.pan) completed++; else missing.push('PAN');
    if (entity.registeredAddress) completed++; else missing.push('Registered Address');
    if (entity.cin) completed++; else missing.push('CIN');
    if (entity.incorporationDate) completed++; else missing.push('Incorporation Date');
  } else {
    missing.push('Business Entity', 'GSTIN', 'PAN', 'Address', 'CIN', 'Incorporation Date');
  }

  return {
    percentage: Math.round((completed / total) * 100),
    missing
  };
}

export default router;
