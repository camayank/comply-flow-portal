/**
 * CONFIGURATION MANAGEMENT API
 *
 * Comprehensive system for managing:
 * - Services catalog (96+ services)
 * - Client/Business entity management
 * - Workflow templates
 * - Pricing configurations
 * - User & team management
 * - System settings
 *
 * Designed for compliance businesses with advanced configurability
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  services,
  businessEntities,
  users,
  serviceRequests,
  workflowTemplates,
  serviceWorkflowStatuses,
  statusTransitionRules
} from '@shared/schema';
import { eq, and, or, like, desc, asc, sql, count, isNull } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';
import bcrypt from 'bcrypt';
import { syncComplianceTracking } from './compliance-tracking-sync';
import { generateTempPassword } from './security-utils';

const router = Router();

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

/**
 * GET /api/config/services
 * List all services with full configuration
 */
router.get('/services', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, search, activeOnly, page = '1', limit = '50' } = req.query;

    let query = db.select().from(services);
    const conditions: any[] = [];

    if (category) {
      conditions.push(eq(services.category, category as string));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(services.name, searchTerm),
          like(services.serviceKey, searchTerm),
          like(services.description, searchTerm)
        )
      );
    }

    if (activeOnly === 'true') {
      conditions.push(eq(services.isActive, true));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allServices = await query.orderBy(asc(services.category), asc(services.name));

    // Group by category
    const byCategory: Record<string, any[]> = {};
    const categories: string[] = [];

    allServices.forEach((service: any) => {
      const cat = service.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
        categories.push(cat);
      }
      byCategory[cat].push(service);
    });

    // Get service request counts
    const requestCounts = await db.select({
      serviceId: serviceRequests.serviceId,
      count: count()
    })
      .from(serviceRequests)
      .groupBy(serviceRequests.serviceId);

    const requestCountMap = new Map(requestCounts.map((r: any) => [r.serviceId, r.count]));

    // Enrich services with counts
    const enrichedServices = allServices.map((service: any) => ({
      ...service,
      requestCount: requestCountMap.get(service.serviceKey) || 0
    }));

    res.json({
      success: true,
      services: enrichedServices,
      byCategory,
      categories,
      total: allServices.length
    });

  } catch (error: any) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

/**
 * GET /api/config/services/:id
 * Get single service with full configuration
 */
router.get('/services/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.id;

    // Try by ID or serviceKey
    const [service] = await db.select()
      .from(services)
      .where(
        or(
          eq(services.id, parseInt(serviceId) || 0),
          eq(services.serviceKey, serviceId)
        )
      )
      .limit(1);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get workflow statuses for this service
    const statuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(eq(serviceWorkflowStatuses.serviceKey, service.serviceKey))
      .orderBy(asc(serviceWorkflowStatuses.statusOrder));

    // Get transition rules
    const transitions = await db.select()
      .from(statusTransitionRules)
      .where(eq(statusTransitionRules.serviceKey, service.serviceKey));

    // Get request stats
    const requestStats = await db.select({
      status: serviceRequests.status,
      count: count()
    })
      .from(serviceRequests)
      .where(eq(serviceRequests.serviceId, service.serviceKey))
      .groupBy(serviceRequests.status);

    res.json({
      success: true,
      service: {
        ...service,
        workflow: {
          statuses,
          transitions
        },
        stats: {
          byStatus: Object.fromEntries(requestStats.map((r: any) => [r.status, r.count])),
          total: requestStats.reduce((sum: number, r: any) => sum + r.count, 0)
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

/**
 * POST /api/config/services
 * Create new service
 */
router.post('/services', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Generate service key if not provided
    const serviceKey = data.serviceKey ||
      data.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

    // Check for duplicate
    const existing = await db.select({ id: services.id })
      .from(services)
      .where(eq(services.serviceKey, serviceKey))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Service with this key already exists' });
    }

    const [newService] = await db.insert(services)
      .values({
        serviceKey,
        name: data.name,
        category: data.category,
        type: data.type || 'one_time',
        periodicity: data.periodicity || 'ONE_TIME',
        price: data.price || 0,
        description: data.description,
        isActive: data.isActive ?? true,
        requiredDocuments: data.requiredDocuments || [],
        defaultWorkflowSteps: data.defaultWorkflowSteps || [],
        slaHours: data.slaHours || 72,
        metadata: data.metadata || {}
      })
      .returning();

    // Create default workflow statuses if provided
    if (data.workflowStatuses && Array.isArray(data.workflowStatuses)) {
      for (let i = 0; i < data.workflowStatuses.length; i++) {
        const status = data.workflowStatuses[i];
        await db.insert(serviceWorkflowStatuses)
          .values({
            serviceKey,
            statusKey: status.key,
            statusName: status.name,
            statusOrder: i + 1,
            category: status.category || 'processing',
            description: status.description,
            isTerminal: status.isTerminal || false,
            isActive: true
          });
      }
    }

    res.status(201).json({
      success: true,
      service: newService,
      message: 'Service created successfully'
    });

  } catch (error: any) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service', details: error.message });
  }
});

/**
 * PUT /api/config/services/:id
 * Update service
 */
router.put('/services/:id', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    const data = req.body;

    const [updated] = await db.update(services)
      .set({
        name: data.name,
        category: data.category,
        type: data.type,
        periodicity: data.periodicity,
        price: data.price,
        description: data.description,
        isActive: data.isActive,
        requiredDocuments: data.requiredDocuments,
        defaultWorkflowSteps: data.defaultWorkflowSteps,
        slaHours: data.slaHours,
        metadata: data.metadata,
        updatedAt: new Date()
      })
      .where(eq(services.id, serviceId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      success: true,
      service: updated,
      message: 'Service updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

/**
 * DELETE /api/config/services/:id
 * Deactivate service (soft delete)
 */
router.delete('/services/:id', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { hardDelete = false } = req.query;

    // Check if service has requests
    const [service] = await db.select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const requestCount = await db.select({ count: count() })
      .from(serviceRequests)
      .where(eq(serviceRequests.serviceId, service.serviceKey));

    if (requestCount[0]?.count > 0 && hardDelete) {
      return res.status(400).json({
        error: 'Cannot delete service with existing requests',
        requestCount: requestCount[0].count
      });
    }

    if (hardDelete === 'true' && requestCount[0]?.count === 0) {
      await db.delete(services).where(eq(services.id, serviceId));
    } else {
      await db.update(services)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(services.id, serviceId));
    }

    res.json({
      success: true,
      message: hardDelete === 'true' ? 'Service deleted' : 'Service deactivated'
    });

  } catch (error: any) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// ============================================================================
// CLIENT/BUSINESS ENTITY MANAGEMENT
// ============================================================================

/**
 * GET /api/config/clients
 * List all clients/business entities
 */
router.get('/clients', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      search,
      entityType,
      status,
      state,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = db.select().from(businessEntities);
    const conditions: any[] = [];

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(businessEntities.name, searchTerm),
          like(businessEntities.clientId, searchTerm),
          like(businessEntities.contactEmail, searchTerm),
          like(businessEntities.contactPhone, searchTerm)
        )
      );
    }

    if (entityType) {
      conditions.push(eq(businessEntities.entityType, entityType as string));
    }

    if (status) {
      conditions.push(eq(businessEntities.status, status as string));
    }

    if (state) {
      conditions.push(eq(businessEntities.state, state as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(businessEntities)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count || 0;

    // Apply sorting and pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const clients = await query
      .orderBy(sortOrder === 'asc' ? asc(businessEntities.createdAt) : desc(businessEntities.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    // Get service request counts per client
    const requestCounts = await db.select({
      businessEntityId: serviceRequests.businessEntityId,
      count: count()
    })
      .from(serviceRequests)
      .groupBy(serviceRequests.businessEntityId);

    const requestCountMap = new Map(requestCounts.map((r: any) => [r.businessEntityId, r.count]));

    const enrichedClients = clients.map((client: any) => ({
      ...client,
      activeRequestCount: requestCountMap.get(client.id) || 0
    }));

    res.json({
      success: true,
      clients: enrichedClients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * GET /api/config/clients/:id
 * Get single client with full details
 */
router.get('/clients/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;

    const [client] = await db.select()
      .from(businessEntities)
      .where(
        or(
          eq(businessEntities.id, parseInt(clientId) || 0),
          eq(businessEntities.clientId, clientId)
        )
      )
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get service requests
    const requests = await db.select()
      .from(serviceRequests)
      .where(eq(serviceRequests.businessEntityId, client.id))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(20);

    // Get associated user
    const [user] = client.userId ? await db.select()
      .from(users)
      .where(eq(users.id, client.userId))
      .limit(1) : [null];

    res.json({
      success: true,
      client: {
        ...client,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        } : null,
        recentRequests: requests,
        stats: {
          totalRequests: requests.length,
          activeRequests: requests.filter((r: any) => !['completed', 'delivered', 'cancelled'].includes(r.status)).length,
          completedRequests: requests.filter((r: any) => r.status === 'completed' || r.status === 'delivered').length
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * POST /api/config/clients
 * Create new client/business entity
 */
router.post('/clients', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const requesterId = (req as any).user?.id;

    // Generate client ID
    const lastClient = await db.select({ clientId: businessEntities.clientId })
      .from(businessEntities)
      .orderBy(desc(businessEntities.id))
      .limit(1);

    const lastNum = lastClient[0]?.clientId
      ? parseInt(lastClient[0].clientId.replace('C', ''))
      : 0;
    const newClientId = `C${String(lastNum + 1).padStart(4, '0')}`;

    // Check for duplicate
    const existing = await db.select({ id: businessEntities.id })
      .from(businessEntities)
      .where(
        or(
          eq(businessEntities.contactPhone, data.contactPhone),
          data.contactEmail ? eq(businessEntities.contactEmail, data.contactEmail) : undefined
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Client with this phone or email already exists',
        existingId: existing[0].id
      });
    }

    let ownerId = data.ownerId as number | undefined;
    if (!ownerId && data.contactEmail) {
      const [existingUser] = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, data.contactEmail))
        .limit(1);

      if (existingUser) {
        ownerId = existingUser.id;
      } else {
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        const usernameBase = data.contactEmail.split('@')[0];
        const username = `${usernameBase}_${Date.now().toString(36)}`;

        const [newUser] = await db.insert(users)
          .values({
            username,
            email: data.contactEmail,
            phone: data.contactPhone || null,
            fullName: data.contactName || data.businessName || 'Client',
            password: hashedPassword,
            role: 'client',
            isActive: true,
          })
          .returning();
        ownerId = newUser.id;
      }
    }

    if (!ownerId && requesterId) {
      ownerId = requesterId;
    }

    if (!ownerId) {
      return res.status(400).json({ error: 'Unable to determine client owner. Provide contactEmail or ownerId.' });
    }

    const [newClient] = await db.insert(businessEntities)
      .values({
        ownerId,
        clientId: newClientId,
        name: data.businessName || data.name,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        entityType: data.entityType || 'pvt_ltd',
        state: data.state,
        address: data.address,
        pincode: data.pincode,
        pan: data.pan,
        gstin: data.gstin,
        cin: data.cin,
        leadSource: data.leadSource,
        referredBy: data.referredBy,
        clientStatus: data.status || 'active',
        onboardingStage: data.onboardingStage || 'basic_info',
        metadata: data.metadata || {},
        annualTurnover: data.annualTurnover ?? null,
        employeeCount: data.employeeCount ?? null,
        registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
        industryType: data.industryType || data.industry || null,
        isActive: data.status ? data.status === 'active' : true,
      })
      .returning();

    await db.update(users)
      .set({ businessEntityId: newClient.id })
      .where(eq(users.id, ownerId));

    await syncComplianceTracking({ entityIds: [newClient.id] });

    res.status(201).json({
      success: true,
      client: newClient,
      message: 'Client created successfully'
    });

  } catch (error: any) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client', details: error.message });
  }
});

/**
 * PUT /api/config/clients/:id
 * Update client
 */
router.put('/clients/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);
    const data = req.body;

    const [updated] = await db.update(businessEntities)
      .set({
        name: data.businessName || data.name,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        entityType: data.entityType,
        state: data.state,
        address: data.address,
        pincode: data.pincode,
        pan: data.pan,
        gstin: data.gstin,
        cin: data.cin,
        clientStatus: data.status || data.clientStatus,
        onboardingStage: data.onboardingStage,
        metadata: data.metadata,
        annualTurnover: data.annualTurnover ?? undefined,
        employeeCount: data.employeeCount ?? undefined,
        registrationDate: data.registrationDate ? new Date(data.registrationDate) : undefined,
        industryType: data.industryType || data.industry || undefined,
        isActive: typeof data.status === 'string' ? data.status === 'active' : undefined,
        updatedAt: new Date()
      })
      .where(eq(businessEntities.id, clientId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      success: true,
      client: updated,
      message: 'Client updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

/**
 * DELETE /api/config/clients/:id
 * Deactivate client
 */
router.delete('/clients/:id', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);

    // Check for active requests
    const [client] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const activeRequests = await db.select({ count: count() })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.businessEntityId, clientId),
          sql`status NOT IN ('completed', 'delivered', 'cancelled')`
        )
      );

    if (activeRequests[0]?.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete client with active service requests',
        activeRequests: activeRequests[0].count
      });
    }

    await db.update(businessEntities)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(businessEntities.id, clientId));

    res.json({
      success: true,
      message: 'Client deactivated successfully'
    });

  } catch (error: any) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// ============================================================================
// BULK CLIENT OPERATIONS
// ============================================================================

/**
 * POST /api/config/clients/bulk-import
 * Import clients from CSV
 */
router.post('/clients/bulk-import', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { clients: clientsData, updateExisting = false } = req.body;

    if (!clientsData || !Array.isArray(clientsData)) {
      return res.status(400).json({ error: 'Clients array is required' });
    }

    const result = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Get last client ID
    const lastClient = await db.select({ clientId: businessEntities.clientId })
      .from(businessEntities)
      .orderBy(desc(businessEntities.id))
      .limit(1);

    let lastNum = lastClient[0]?.clientId
      ? parseInt(lastClient[0].clientId.replace('C', ''))
      : 0;

    for (const clientData of clientsData) {
      try {
        // Check for existing
        const existing = await db.select()
          .from(businessEntities)
          .where(
            or(
              eq(businessEntities.contactPhone, clientData.contactPhone),
              clientData.contactEmail ? eq(businessEntities.contactEmail, clientData.contactEmail) : undefined
            )
          )
          .limit(1);

        if (existing.length > 0) {
          if (updateExisting) {
            await db.update(businessEntities)
              .set({
                ...clientData,
                updatedAt: new Date()
              })
              .where(eq(businessEntities.id, existing[0].id));
            result.updated++;
          } else {
            result.failed++;
            result.errors.push({ data: clientData, error: 'Duplicate phone/email' });
          }
        } else {
          lastNum++;
          const newClientId = `C${String(lastNum).padStart(4, '0')}`;

          await db.insert(businessEntities)
            .values({
              clientId: newClientId,
              ...clientData,
              status: clientData.status || 'active'
            });
          result.created++;
        }

      } catch (err: any) {
        result.failed++;
        result.errors.push({ data: clientData, error: err.message });
      }
    }

    res.json({
      success: true,
      result,
      message: `Import completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed`
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

/**
 * GET /api/config/system
 * Get system configuration
 */
router.get('/system', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    // Service categories
    const categories = await db.select({
      category: services.category,
      count: count()
    })
      .from(services)
      .groupBy(services.category);

    // Entity types distribution
    const entityTypes = await db.select({
      entityType: businessEntities.entityType,
      count: count()
    })
      .from(businessEntities)
      .groupBy(businessEntities.entityType);

    // User roles distribution
    const userRoles = await db.select({
      role: users.role,
      count: count()
    })
      .from(users)
      .groupBy(users.role);

    // System stats
    const [totalServices] = await db.select({ count: count() }).from(services);
    const [totalClients] = await db.select({ count: count() }).from(businessEntities);
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalRequests] = await db.select({ count: count() }).from(serviceRequests);

    res.json({
      success: true,
      config: {
        serviceCategories: categories,
        entityTypes,
        userRoles,
        stats: {
          totalServices: totalServices.count,
          totalClients: totalClients.count,
          totalUsers: totalUsers.count,
          totalRequests: totalRequests.count
        },
        features: {
          bulkOperations: true,
          leadScoring: true,
          workflowAutomation: true,
          complianceTracking: true,
          documentManagement: true,
          multiChannelCommunication: true
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching system config:', error);
    res.status(500).json({ error: 'Failed to fetch system configuration' });
  }
});

/**
 * GET /api/config/dashboard
 * Configuration dashboard stats
 */
router.get('/dashboard', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    // Active services
    const [activeServices] = await db.select({ count: count() })
      .from(services)
      .where(eq(services.isActive, true));

    // Active clients
    const [activeClients] = await db.select({ count: count() })
      .from(businessEntities)
      .where(eq(businessEntities.status, 'active'));

    // Services by category
    const servicesByCategory = await db.select({
      category: services.category,
      count: count()
    })
      .from(services)
      .where(eq(services.isActive, true))
      .groupBy(services.category);

    // Clients by entity type
    const clientsByType = await db.select({
      entityType: businessEntities.entityType,
      count: count()
    })
      .from(businessEntities)
      .where(eq(businessEntities.status, 'active'))
      .groupBy(businessEntities.entityType);

    // Recent activity
    const recentServices = await db.select()
      .from(services)
      .orderBy(desc(services.createdAt))
      .limit(5);

    const recentClients = await db.select()
      .from(businessEntities)
      .orderBy(desc(businessEntities.createdAt))
      .limit(5);

    res.json({
      success: true,
      dashboard: {
        counts: {
          activeServices: activeServices.count,
          activeClients: activeClients.count
        },
        servicesByCategory,
        clientsByType,
        recentActivity: {
          services: recentServices,
          clients: recentClients
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching config dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

export default router;
