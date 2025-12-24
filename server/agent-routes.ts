/**
 * AGENT PORTAL API ROUTES
 * File: server/agent-routes.ts
 *
 * Backend APIs for Agent/Partner Portal
 * Handles leads, commissions, performance tracking
 */

import { Router, Response } from 'express';
import { db } from './config/database';
import {
  users,
  leads,
  serviceRequests,
  businessEntities,
  payments,
  referralTransactions
} from '../shared/schema';
import { eq, and, gte, lte, desc, sql, count, sum } from 'drizzle-orm';
import { logger } from './config/logger';
import { sessionAuthMiddleware, type AuthenticatedRequest } from './rbac-middleware';

const router = Router();

// All routes require authentication
router.use(sessionAuthMiddleware);

// Middleware to verify agent role
const requireAgentRole = (req: AuthenticatedRequest, res: Response, next: Function) => {
  const allowedRoles = ['agent', 'partner', 'admin', 'super_admin'];
  if (!req.user || !allowedRoles.includes(req.user.role?.toLowerCase())) {
    return res.status(403).json({ error: 'Access denied. Agent role required.' });
  }
  next();
};

router.use(requireAgentRole);

// ============ DASHBOARD ============

/**
 * Get agent dashboard summary
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get lead stats
    const [leadStats] = await db.select({
      total: count(),
      thisMonth: sql<number>`COUNT(CASE WHEN ${leads.createdAt} >= ${startOfMonth} THEN 1 END)`,
      converted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'converted' THEN 1 END)`,
      pending: sql<number>`COUNT(CASE WHEN ${leads.status} IN ('new', 'contacted', 'qualified') THEN 1 END)`
    })
      .from(leads)
      .where(eq(leads.assignedTo, agentId));

    // Get commission stats
    const [commissionStats] = await db.select({
      totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${referralTransactions.status} = 'completed' THEN ${referralTransactions.amount} END), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${referralTransactions.status} = 'pending' THEN ${referralTransactions.amount} END), 0)`,
      thisMonth: sql<number>`COALESCE(SUM(CASE WHEN ${referralTransactions.createdAt} >= ${startOfMonth} AND ${referralTransactions.status} = 'completed' THEN ${referralTransactions.amount} END), 0)`,
      thisYear: sql<number>`COALESCE(SUM(CASE WHEN ${referralTransactions.createdAt} >= ${startOfYear} AND ${referralTransactions.status} = 'completed' THEN ${referralTransactions.amount} END), 0)`
    })
      .from(referralTransactions)
      .where(eq(referralTransactions.referrerId, agentId));

    // Get conversion rate
    const conversionRate = leadStats?.total && leadStats.total > 0
      ? ((leadStats.converted || 0) / leadStats.total) * 100
      : 0;

    // Get recent activity count
    const recentLeads = await db.select({ id: leads.id })
      .from(leads)
      .where(and(
        eq(leads.assignedTo, agentId),
        gte(leads.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
      ));

    res.json({
      success: true,
      data: {
        stats: {
          totalLeads: leadStats?.total || 0,
          leadsThisMonth: leadStats?.thisMonth || 0,
          convertedLeads: leadStats?.converted || 0,
          pendingLeads: leadStats?.pending || 0,
          conversionRate: Math.round(conversionRate * 10) / 10,
          totalEarnings: commissionStats?.totalEarned || 0,
          pendingCommissions: commissionStats?.pendingAmount || 0,
          earningsThisMonth: commissionStats?.thisMonth || 0,
          earningsThisYear: commissionStats?.thisYear || 0,
          recentActivityCount: recentLeads.length
        },
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch agent dashboard', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============ LEADS MANAGEMENT ============

/**
 * Get agent's leads
 */
router.get('/leads', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const { status, limit = 50, offset = 0, search } = req.query;

    let query = db.select({
      lead: leads,
      businessName: businessEntities.name,
      clientId: businessEntities.clientId
    })
      .from(leads)
      .leftJoin(businessEntities, eq(leads.businessEntityId, businessEntities.id))
      .where(eq(leads.assignedTo, agentId))
      .orderBy(desc(leads.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    const results = await query;

    // Get total count for pagination
    const [countResult] = await db.select({ total: count() })
      .from(leads)
      .where(eq(leads.assignedTo, agentId));

    res.json({
      success: true,
      data: results.map(r => ({
        ...r.lead,
        businessName: r.businessName,
        clientId: r.clientId
      })),
      pagination: {
        total: countResult?.total || 0,
        limit: Number(limit),
        offset: Number(offset)
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch agent leads', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

/**
 * Create a new lead
 */
router.post('/leads', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const {
      name,
      email,
      phone,
      company,
      serviceInterest,
      source,
      notes,
      estimatedValue
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Generate lead number
    const leadNumber = `LEAD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const [lead] = await db.insert(leads).values({
      leadNumber,
      name,
      email,
      phone,
      company,
      serviceInterest,
      source: source || 'agent_referral',
      notes,
      estimatedValue: estimatedValue ? String(estimatedValue) : null,
      status: 'new',
      assignedTo: agentId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    logger.info('Agent created new lead', { agentId, leadId: lead.id });

    res.status(201).json({
      success: true,
      data: lead
    });

  } catch (error: any) {
    logger.error('Failed to create lead', { error: error.message });
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

/**
 * Update a lead
 */
router.patch('/leads/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const leadId = parseInt(req.params.id);
    const updates = req.body;

    // Verify ownership
    const [existingLead] = await db.select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.assignedTo, agentId)))
      .limit(1);

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const [updatedLead] = await db.update(leads)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId))
      .returning();

    res.json({
      success: true,
      data: updatedLead
    });

  } catch (error: any) {
    logger.error('Failed to update lead', { error: error.message });
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

/**
 * Get lead details
 */
router.get('/leads/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const leadId = parseInt(req.params.id);

    const [lead] = await db.select({
      lead: leads,
      businessName: businessEntities.name,
      serviceRequests: sql<number>`(SELECT COUNT(*) FROM service_requests WHERE business_entity_id = ${leads.businessEntityId})`
    })
      .from(leads)
      .leftJoin(businessEntities, eq(leads.businessEntityId, businessEntities.id))
      .where(and(eq(leads.id, leadId), eq(leads.assignedTo, agentId)))
      .limit(1);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      success: true,
      data: {
        ...lead.lead,
        businessName: lead.businessName,
        serviceRequestCount: lead.serviceRequests
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch lead details', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch lead details' });
  }
});

// ============ COMMISSIONS ============

/**
 * Get agent's commissions
 */
router.get('/commissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const { status, limit = 50, offset = 0 } = req.query;

    const commissions = await db.select({
      transaction: referralTransactions,
      clientName: businessEntities.name,
      serviceName: serviceRequests.serviceName
    })
      .from(referralTransactions)
      .leftJoin(businessEntities, eq(referralTransactions.referredUserId, businessEntities.ownerId))
      .leftJoin(serviceRequests, eq(referralTransactions.serviceRequestId, serviceRequests.id))
      .where(eq(referralTransactions.referrerId, agentId))
      .orderBy(desc(referralTransactions.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    // Get totals
    const [totals] = await db.select({
      total: count(),
      totalAmount: sum(referralTransactions.amount),
      pendingAmount: sql<number>`SUM(CASE WHEN ${referralTransactions.status} = 'pending' THEN ${referralTransactions.amount} ELSE 0 END)`,
      paidAmount: sql<number>`SUM(CASE WHEN ${referralTransactions.status} = 'completed' THEN ${referralTransactions.amount} ELSE 0 END)`
    })
      .from(referralTransactions)
      .where(eq(referralTransactions.referrerId, agentId));

    res.json({
      success: true,
      data: commissions.map(c => ({
        ...c.transaction,
        clientName: c.clientName,
        serviceName: c.serviceName
      })),
      summary: {
        totalCommissions: totals?.total || 0,
        totalAmount: totals?.totalAmount || 0,
        pendingAmount: totals?.pendingAmount || 0,
        paidAmount: totals?.paidAmount || 0
      },
      pagination: {
        total: totals?.total || 0,
        limit: Number(limit),
        offset: Number(offset)
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch commissions', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

/**
 * Get commission details
 */
router.get('/commissions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const commissionId = parseInt(req.params.id);

    const [commission] = await db.select({
      transaction: referralTransactions,
      clientName: businessEntities.name,
      serviceName: serviceRequests.serviceName,
      serviceAmount: serviceRequests.totalAmount
    })
      .from(referralTransactions)
      .leftJoin(businessEntities, eq(referralTransactions.referredUserId, businessEntities.ownerId))
      .leftJoin(serviceRequests, eq(referralTransactions.serviceRequestId, serviceRequests.id))
      .where(and(
        eq(referralTransactions.id, commissionId),
        eq(referralTransactions.referrerId, agentId)
      ))
      .limit(1);

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    res.json({
      success: true,
      data: {
        ...commission.transaction,
        clientName: commission.clientName,
        serviceName: commission.serviceName,
        serviceAmount: commission.serviceAmount
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch commission details', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch commission details' });
  }
});

// ============ PERFORMANCE ============

/**
 * Get agent performance metrics
 */
router.get('/performance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get daily lead counts for chart
    const dailyLeads = await db.select({
      date: sql<string>`DATE(${leads.createdAt})`,
      count: count()
    })
      .from(leads)
      .where(and(
        eq(leads.assignedTo, agentId),
        gte(leads.createdAt, startDate)
      ))
      .groupBy(sql`DATE(${leads.createdAt})`)
      .orderBy(sql`DATE(${leads.createdAt})`);

    // Get conversion funnel
    const [funnel] = await db.select({
      new: sql<number>`COUNT(CASE WHEN ${leads.status} = 'new' THEN 1 END)`,
      contacted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'contacted' THEN 1 END)`,
      qualified: sql<number>`COUNT(CASE WHEN ${leads.status} = 'qualified' THEN 1 END)`,
      proposal: sql<number>`COUNT(CASE WHEN ${leads.status} = 'proposal_sent' THEN 1 END)`,
      negotiation: sql<number>`COUNT(CASE WHEN ${leads.status} = 'negotiation' THEN 1 END)`,
      converted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'converted' THEN 1 END)`,
      lost: sql<number>`COUNT(CASE WHEN ${leads.status} = 'lost' THEN 1 END)`
    })
      .from(leads)
      .where(and(
        eq(leads.assignedTo, agentId),
        gte(leads.createdAt, startDate)
      ));

    // Get earnings by month
    const monthlyEarnings = await db.select({
      month: sql<string>`TO_CHAR(${referralTransactions.createdAt}, 'YYYY-MM')`,
      amount: sum(referralTransactions.amount)
    })
      .from(referralTransactions)
      .where(and(
        eq(referralTransactions.referrerId, agentId),
        eq(referralTransactions.status, 'completed'),
        gte(referralTransactions.createdAt, new Date(new Date().getFullYear(), 0, 1))
      ))
      .groupBy(sql`TO_CHAR(${referralTransactions.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${referralTransactions.createdAt}, 'YYYY-MM')`);

    // Calculate performance score
    const totalLeads = (funnel?.new || 0) + (funnel?.contacted || 0) + (funnel?.qualified || 0) +
      (funnel?.proposal || 0) + (funnel?.negotiation || 0) + (funnel?.converted || 0) + (funnel?.lost || 0);
    const conversionRate = totalLeads > 0 ? ((funnel?.converted || 0) / totalLeads) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: days,
        dailyLeads: dailyLeads.map(d => ({
          date: d.date,
          leads: d.count
        })),
        funnel: {
          new: funnel?.new || 0,
          contacted: funnel?.contacted || 0,
          qualified: funnel?.qualified || 0,
          proposalSent: funnel?.proposal || 0,
          negotiation: funnel?.negotiation || 0,
          converted: funnel?.converted || 0,
          lost: funnel?.lost || 0
        },
        monthlyEarnings: monthlyEarnings.map(m => ({
          month: m.month,
          amount: m.amount || 0
        })),
        metrics: {
          conversionRate: Math.round(conversionRate * 10) / 10,
          averageLeadsPerDay: dailyLeads.length > 0
            ? Math.round((dailyLeads.reduce((sum, d) => sum + d.count, 0) / dailyLeads.length) * 10) / 10
            : 0,
          totalLeads,
          totalConverted: funnel?.converted || 0
        }
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch performance metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// ============ REFERRAL TRACKING ============

/**
 * Get agent's referral link and stats
 */
router.get('/referral-info', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;

    // Get user's referral code
    const [user] = await db.select({
      referralCode: users.referralCode,
      name: users.fullName
    })
      .from(users)
      .where(eq(users.id, agentId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get referral stats
    const [stats] = await db.select({
      totalReferrals: count(),
      successfulReferrals: sql<number>`COUNT(CASE WHEN ${referralTransactions.status} = 'completed' THEN 1 END)`,
      totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${referralTransactions.status} = 'completed' THEN ${referralTransactions.amount} END), 0)`
    })
      .from(referralTransactions)
      .where(eq(referralTransactions.referrerId, agentId));

    const appUrl = process.env.APP_URL || 'https://app.complyflow.in';
    const referralLink = `${appUrl}/register?ref=${user.referralCode}`;

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink,
        stats: {
          totalReferrals: stats?.totalReferrals || 0,
          successfulReferrals: stats?.successfulReferrals || 0,
          totalEarnings: stats?.totalEarnings || 0
        }
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch referral info', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
});

/**
 * Get referred clients list
 */
router.get('/referred-clients', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    // Get users referred by this agent
    const referredUsers = await db.select({
      user: users,
      businessName: businessEntities.name,
      totalSpent: sql<number>`COALESCE((SELECT SUM(total_amount) FROM service_requests WHERE user_id = ${users.id}), 0)`
    })
      .from(users)
      .leftJoin(businessEntities, eq(businessEntities.ownerId, users.id))
      .where(eq(users.referredBy, agentId))
      .orderBy(desc(users.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json({
      success: true,
      data: referredUsers.map(r => ({
        id: r.user.id,
        name: r.user.fullName,
        email: r.user.email,
        phone: r.user.phone,
        businessName: r.businessName,
        totalSpent: r.totalSpent,
        joinedAt: r.user.createdAt
      }))
    });

  } catch (error: any) {
    logger.error('Failed to fetch referred clients', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch referred clients' });
  }
});

export default router;
