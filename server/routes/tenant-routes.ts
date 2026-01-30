/**
 * Tenant Routes
 *
 * API endpoints for multi-tenancy management:
 * - Tenant CRUD operations
 * - Tenant settings and branding
 * - Billing and subscription management
 * - User invitations
 * - Usage statistics
 */

import { Router, Request, Response } from 'express';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from '../rbac-middleware';
import { tenantService, BILLING_PLANS, type BillingPlan } from '../services/tenant-service';
import { extractTenant, requireTenant, type TenantRequest } from '../middleware/tenant-middleware';
import { logger } from '../logger';

const router = Router();

// Apply tenant extraction to all routes
router.use(extractTenant);

// ============================================================================
// CURRENT TENANT (Authenticated Users)
// ============================================================================

/**
 * GET /api/tenants/current
 * Get the current tenant context
 */
router.get('/current', sessionAuthMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.json({
        hasTenant: false,
        message: 'No tenant context',
      });
    }

    const tenant = await tenantService.getTenant(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const usage = await tenantService.getTenantUsage(req.tenantId);

    res.json({
      hasTenant: true,
      tenant,
      usage,
    });
  } catch (error) {
    logger.error('Error getting current tenant:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

/**
 * GET /api/tenants/current/settings
 * Get current tenant settings
 */
router.get('/current/settings', sessionAuthMiddleware, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    const tenant = await tenantService.getTenant(req.tenantId!);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      settings: tenant.settings,
      features: tenant.features,
      branding: {
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
      },
    });
  } catch (error) {
    logger.error('Error getting tenant settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/tenants/current/settings
 * Update current tenant settings
 */
router.put('/current/settings', sessionAuthMiddleware, requireTenant, requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const { settings } = req.body;

    const tenant = await tenantService.updateTenant(req.tenantId!, { settings });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      message: 'Settings updated successfully',
      settings: tenant.settings,
    });
  } catch (error) {
    logger.error('Error updating tenant settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * PUT /api/tenants/current/branding
 * Update current tenant branding
 */
router.put('/current/branding', sessionAuthMiddleware, requireTenant, requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const { logoUrl, primaryColor, secondaryColor, faviconUrl } = req.body;

    // Validate colors (hex format)
    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return res.status(400).json({ error: 'Invalid primaryColor. Use hex format (e.g., #1e40af)' });
    }

    if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
      return res.status(400).json({ error: 'Invalid secondaryColor. Use hex format (e.g., #3b82f6)' });
    }

    const updates: any = {};
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor;

    const tenant = await tenantService.updateTenant(req.tenantId!, updates);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      message: 'Branding updated successfully',
      branding: {
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
      },
    });
  } catch (error) {
    logger.error('Error updating tenant branding:', error);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

/**
 * GET /api/tenants/current/usage
 * Get current tenant usage statistics
 */
router.get('/current/usage', sessionAuthMiddleware, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    const usage = await tenantService.getTenantUsage(req.tenantId!);
    if (!usage) {
      return res.status(404).json({ error: 'Usage not found' });
    }

    res.json({ usage });
  } catch (error) {
    logger.error('Error getting tenant usage:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

// ============================================================================
// INVITATIONS
// ============================================================================

/**
 * POST /api/tenants/current/invitations
 * Create a new invitation to the current tenant
 */
router.post('/current/invitations', sessionAuthMiddleware, requireTenant, requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if can add more users
    const canAdd = await tenantService.canAddUser(req.tenantId!);
    if (!canAdd) {
      return res.status(403).json({
        error: 'User limit reached',
        hint: 'Upgrade your plan to invite more users',
      });
    }

    const invitation = await tenantService.createInvitation(
      req.tenantId!,
      email,
      role,
      user.id
    );

    res.status(201).json({
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteUrl: `${process.env.APP_URL || 'http://localhost:5000'}/invite/${invitation.token}`,
      },
    });
  } catch (error) {
    logger.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

/**
 * GET /api/tenants/invitations/:token
 * Verify an invitation token (public)
 */
router.get('/invitations/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await tenantService.verifyInvitation(token);
    if (!invitation) {
      return res.status(404).json({
        error: 'Invalid or expired invitation',
        hint: 'Request a new invitation from your administrator',
      });
    }

    const tenant = await tenantService.getTenant(invitation.tenantId);

    res.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      tenant: tenant ? {
        name: tenant.name,
        logoUrl: tenant.logoUrl,
      } : null,
    });
  } catch (error) {
    logger.error('Error verifying invitation:', error);
    res.status(500).json({ error: 'Failed to verify invitation' });
  }
});

/**
 * POST /api/tenants/invitations/:token/accept
 * Accept an invitation
 */
router.post('/invitations/:token/accept', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const accepted = await tenantService.acceptInvitation(token);
    if (!accepted) {
      return res.status(400).json({
        error: 'Failed to accept invitation',
        hint: 'The invitation may be invalid, expired, or already accepted',
      });
    }

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    logger.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// ============================================================================
// BILLING & SUBSCRIPTION
// ============================================================================

/**
 * GET /api/tenants/plans
 * List available billing plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = Object.entries(BILLING_PLANS).map(([id, plan]) => ({
      id,
      ...plan,
    }));

    res.json({ plans });
  } catch (error) {
    logger.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/tenants/current/billing
 * Get current tenant billing info
 */
router.get('/current/billing', sessionAuthMiddleware, requireTenant, requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const tenant = await tenantService.getTenant(req.tenantId!);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const plan = BILLING_PLANS[tenant.billingPlan as BillingPlan];

    res.json({
      billing: {
        plan: tenant.billingPlan,
        planName: plan?.name || 'Unknown',
        status: tenant.subscriptionStatus,
        limits: {
          maxUsers: tenant.maxUsers,
          maxEntities: tenant.maxEntities,
          maxStorageGb: tenant.maxStorageGb,
        },
        features: tenant.features,
      },
    });
  } catch (error) {
    logger.error('Error getting billing info:', error);
    res.status(500).json({ error: 'Failed to get billing info' });
  }
});

/**
 * POST /api/tenants/current/billing/upgrade
 * Upgrade billing plan (would integrate with Stripe in production)
 */
router.post('/current/billing/upgrade', sessionAuthMiddleware, requireTenant, requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const { plan, customLimits } = req.body;

    if (!plan || !BILLING_PLANS[plan as BillingPlan]) {
      return res.status(400).json({
        error: 'Invalid plan',
        validPlans: Object.keys(BILLING_PLANS),
      });
    }

    const tenant = await tenantService.updateBillingPlan(
      req.tenantId!,
      plan as BillingPlan,
      customLimits
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      message: 'Plan upgraded successfully',
      billing: {
        plan: tenant.billingPlan,
        limits: {
          maxUsers: tenant.maxUsers,
          maxEntities: tenant.maxEntities,
          maxStorageGb: tenant.maxStorageGb,
        },
        features: tenant.features,
      },
    });
  } catch (error) {
    logger.error('Error upgrading plan:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

// ============================================================================
// SUPER ADMIN - TENANT MANAGEMENT
// ============================================================================

/**
 * GET /api/tenants
 * List all tenants (super admin only)
 */
router.get('/', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      plan,
      limit = '50',
      offset = '0',
    } = req.query;

    const result = await tenantService.listTenants({
      search: search as string,
      status: status as string,
      plan: plan as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      tenants: result.tenants,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    logger.error('Error listing tenants:', error);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

/**
 * POST /api/tenants
 * Create a new tenant (super admin only)
 */
router.post('/', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      domain,
      billingPlan,
      billingEmail,
      maxUsers,
      maxEntities,
      maxStorageGb,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid slug format',
        hint: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
    }

    const tenant = await tenantService.createTenant({
      name,
      slug,
      domain,
      billingPlan,
      billingEmail,
      maxUsers,
      maxEntities,
      maxStorageGb,
    });

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant,
    });
  } catch (error: any) {
    if (error.message === 'Tenant slug already exists') {
      return res.status(409).json({ error: error.message });
    }
    logger.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

/**
 * GET /api/tenants/:id
 * Get a specific tenant (super admin only)
 */
router.get('/:id', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tenant = await tenantService.getTenant(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const usage = await tenantService.getTenantUsage(id);

    res.json({ tenant, usage });
  } catch (error) {
    logger.error('Error getting tenant:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

/**
 * PUT /api/tenants/:id
 * Update a tenant (super admin only)
 */
router.put('/:id', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const tenant = await tenantService.updateTenant(id, updates);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      message: 'Tenant updated successfully',
      tenant,
    });
  } catch (error) {
    logger.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * POST /api/tenants/:id/suspend
 * Suspend a tenant (super admin only)
 */
router.post('/:id/suspend', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    const suspended = await tenantService.suspendTenant(id, reason);
    if (!suspended) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ message: 'Tenant suspended successfully' });
  } catch (error) {
    logger.error('Error suspending tenant:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
});

/**
 * POST /api/tenants/:id/reactivate
 * Reactivate a suspended tenant (super admin only)
 */
router.post('/:id/reactivate', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reactivated = await tenantService.reactivateTenant(id);
    if (!reactivated) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ message: 'Tenant reactivated successfully' });
  } catch (error) {
    logger.error('Error reactivating tenant:', error);
    res.status(500).json({ error: 'Failed to reactivate tenant' });
  }
});

export default router;
