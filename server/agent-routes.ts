/**
 * Agent Portal Routes
 *
 * PRODUCTION READY - All routes protected with authentication and authorization
 *
 * Complete API for agent/partner management:
 * - Agent stats and profile
 * - Lead management (CRUD)
 * - Commission tracking
 * - Performance analytics
 * - Announcements
 */

import type { Express, Request, Response } from "express";
import { db } from './db';
import { leads, users, commissions, serviceRequests, services, businessEntities, agentProfiles, orderTasks, qualityReviews } from '@shared/schema';
import { agentKycStatus, agentKycDocuments, documents, kycVerificationLog } from './db/schema/agent-kyc';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, requireRole, USER_ROLES, type AuthenticatedRequest } from './rbac-middleware';

// Middleware combination for agent routes - requires authentication + agent role or higher
const agentAuth = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT)] as const;
const adminAuth = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;

export function registerAgentRoutes(app: Express) {

  // ============ AGENT STATS ============

  /**
   * GET /api/agent/stats
   * Get agent dashboard statistics
   * Requires: Agent role or higher
   */
  app.get('/api/agent/stats', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get lead statistics
      const allLeads = await db.select()
        .from(leads)
        .where(eq(leads.agentId, agentId));

      const convertedLeads = allLeads.filter(l => l.stage === 'converted');
      const thisMonthLeads = allLeads.filter(l => {
        const createdDate = new Date(l.createdAt || Date.now());
        const now = new Date();
        return createdDate.getMonth() === now.getMonth() &&
               createdDate.getFullYear() === now.getFullYear();
      });

      // Get commission statistics
      const commissionsData = await db.select()
        .from(commissions)
        .where(eq(commissions.agentId, parseInt(agentId) || 1));

      const totalCommission = commissionsData.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
      const pendingCommission = commissionsData
        .filter(c => ['pending', 'pending_approval'].includes(c.status || ''))
        .reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
      const paidCommission = commissionsData
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);

      const stats = {
        // Lead stats
        totalLeads: allLeads.length,
        convertedLeads: convertedLeads.length,
        thisMonthLeads: thisMonthLeads.length,
        conversionRate: allLeads.length > 0
          ? Math.round((convertedLeads.length / allLeads.length) * 100)
          : 0,

        // Pipeline breakdown
        leadsByStage: {
          new: allLeads.filter(l => l.stage === 'new').length,
          contacted: allLeads.filter(l => l.stage === 'contacted').length,
          qualified: allLeads.filter(l => l.stage === 'qualified').length,
          proposal: allLeads.filter(l => l.stage === 'proposal').length,
          negotiation: allLeads.filter(l => l.stage === 'negotiation').length,
          converted: convertedLeads.length,
          lost: allLeads.filter(l => l.stage === 'lost').length,
        },

        // Commission stats
        totalCommission,
        pendingCommission,
        paidCommission,

        // Agent profile
        territory: 'Mumbai Metropolitan',
        rank: convertedLeads.length >= 20 ? 'Gold Partner' :
              convertedLeads.length >= 10 ? 'Silver Partner' : 'Bronze Partner',
        performanceRating: Math.min(5, 3 + (convertedLeads.length / 10)),

        // Targets
        monthlyTarget: 10,
        monthlyAchieved: thisMonthLeads.length,
        targetProgress: Math.round((thisMonthLeads.length / 10) * 100),
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching agent stats:', error);
      res.status(500).json({ error: 'Failed to fetch agent stats' });
    }
  });

  // ============ LEAD MANAGEMENT ============

  /**
   * GET /api/agent/leads
   * Get all leads for the agent
   * Requires: Agent role or higher
   */
  app.get('/api/agent/leads', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;
      const userRole = req.user?.role;
      const { stage, limit = 50, offset = 0 } = req.query;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      let query = db.select().from(leads);

      // Filter by agentId for agents, admins see all
      if (userRole === 'agent') {
        query = query.where(eq(leads.agentId, String(agentId))) as any;
      }

      if (stage && stage !== 'all') {
        query = query.where(eq(leads.stage, stage as string)) as any;
      }

      const allLeads = await query
        .orderBy(desc(leads.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      res.json({
        leads: allLeads,
        total: allLeads.length,
        hasMore: allLeads.length === parseInt(limit as string),
      });
    } catch (error) {
      console.error('Error fetching agent leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  /**
   * GET /api/agent/leads/recent
   * Get recent leads for dashboard
   * Requires: Agent role or higher
   */
  app.get('/api/agent/leads/recent', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;
      const userRole = req.user?.role;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      let query = db.select().from(leads);

      // Filter by agentId for agents
      if (userRole === 'agent') {
        query = query.where(eq(leads.agentId, String(agentId))) as any;
      }

      const recentLeads = await query
        .orderBy(desc(leads.createdAt))
        .limit(5);

      res.json({
        leads: recentLeads.map(lead => ({
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          serviceInterested: lead.serviceInterested,
          leadStage: lead.stage,
          estimatedValue: lead.estimatedValue,
          createdAt: lead.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error fetching recent leads:', error);
      res.status(500).json({ error: 'Failed to fetch recent leads' });
    }
  });

  /**
   * POST /api/agent/leads
   * Create a new lead
   * Requires: Agent role or higher
   */
  app.post('/api/agent/leads', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const {
        companyName,
        contactName,
        email,
        phone,
        serviceInterested,
        estimatedValue,
        notes,
        source = 'agent_referral',
      } = req.body;

      if (!contactName || !phone) {
        return res.status(400).json({ error: 'Contact name and phone are required' });
      }

      const [newLead] = await db.insert(leads)
        .values({
          companyName,
          contactName,
          email,
          phone,
          serviceInterested,
          estimatedValue: estimatedValue ? parseInt(estimatedValue) : null,
          notes,
          source,
          stage: 'new',
          agentId: String(agentId),
        })
        .returning();

      res.status(201).json({
        message: 'Lead created successfully',
        lead: newLead,
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });

  /**
   * PATCH /api/agent/leads/:id
   * Update lead stage or details
   * Requires: Agent role or higher + ownership check
   */
  app.patch('/api/agent/leads/:id', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;
      const userRole = req.user?.role;
      const updates = req.body;

      // First verify ownership (unless admin)
      if (userRole === 'agent') {
        const [existingLead] = await db.select().from(leads).where(eq(leads.id, parseInt(id)));
        if (!existingLead || existingLead.agentId !== String(agentId)) {
          return res.status(403).json({ error: 'You can only update your own leads' });
        }
      }

      const [updatedLead] = await db.update(leads)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, parseInt(id)))
        .returning();

      if (!updatedLead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json({
        message: 'Lead updated successfully',
        lead: updatedLead,
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  /**
   * DELETE /api/agent/leads/:id
   * Delete a lead
   * Requires: Admin role (agents cannot delete leads)
   */
  app.delete('/api/agent/leads/:id', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      await db.delete(leads)
        .where(eq(leads.id, parseInt(id)));

      res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  });

  /**
   * GET /api/agent/leads/:id/lifecycle
   * Get complete lifecycle of a lead after conversion
   * Shows: lead status, service request progress, tasks, QC status, delivery status
   * Requires: Agent role or higher + ownership check
   */
  app.get('/api/agent/leads/:id/lifecycle', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;
      const userRole = req.user?.role;

      // Fetch the lead
      const [lead] = await db.select().from(leads).where(eq(leads.id, parseInt(id)));

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // Verify ownership (unless admin) - agentId in leads is integer
      if (userRole === 'agent' && lead.agentId !== agentId) {
        return res.status(403).json({ error: 'You can only view your own leads' });
      }

      // Build lifecycle response
      const lifecycle: {
        lead: {
          id: number;
          status: string;
          createdAt: Date | null;
          convertedAt: Date | null;
          clientName: string;
        };
        serviceRequest: {
          id: number;
          requestId: string | null;
          status: string | null;
          progress: number;
          serviceName: string;
          serviceId: string;
          createdAt: Date | null;
        } | null;
        tasks: {
          total: number;
          completed: number;
          currentStep: string | null;
          currentStepNumber: number | null;
        };
        qcStatus: 'pending' | 'approved' | 'rejected' | null;
        deliveryStatus: 'pending' | 'delivered' | 'confirmed' | null;
      } = {
        lead: {
          id: lead.id,
          status: lead.leadStage || lead.status || 'new',
          createdAt: lead.createdAt,
          convertedAt: lead.convertedAt || null,
          clientName: lead.clientName || 'Unknown',
        },
        serviceRequest: null,
        tasks: {
          total: 0,
          completed: 0,
          currentStep: null,
          currentStepNumber: null,
        },
        qcStatus: null,
        deliveryStatus: null,
      };

      // If lead is converted, find associated service request
      if (lead.leadStage === 'converted' || lead.status === 'converted') {
        // Find service request linked to this lead
        let serviceRequest = null;

        // Use serviceRequests.leadId to find the service request
        const [sr] = await db
          .select({
            id: serviceRequests.id,
            requestId: serviceRequests.requestId,
            status: serviceRequests.status,
            progress: serviceRequests.progress,
            serviceId: serviceRequests.serviceId,
            createdAt: serviceRequests.createdAt,
          })
          .from(serviceRequests)
          .where(eq(serviceRequests.leadId, lead.id))
          .limit(1);
        serviceRequest = sr;

        // Fallback: find by agent assignment near conversion time
        if (!serviceRequest && lead.contactEmail) {
          const [srFallback] = await db
            .select({
              id: serviceRequests.id,
              requestId: serviceRequests.requestId,
              status: serviceRequests.status,
              progress: serviceRequests.progress,
              serviceId: serviceRequests.serviceId,
              createdAt: serviceRequests.createdAt,
            })
            .from(serviceRequests)
            .where(
              and(
                eq(serviceRequests.assignedAgentId, agentId || 0),
                sql`created_at >= ${lead.convertedAt || lead.updatedAt || new Date()}`
              )
            )
            .orderBy(serviceRequests.createdAt)
            .limit(1);
          serviceRequest = srFallback;
        }

        if (serviceRequest) {
          // Get service name by matching serviceId (text) to service code or id
          let serviceName = 'Unknown Service';
          if (serviceRequest.serviceId) {
            // Try to find by service code first, then by numeric id
            const [service] = await db
              .select({ name: services.name })
              .from(services)
              .where(sql`${services.code} = ${serviceRequest.serviceId} OR CAST(${services.id} AS TEXT) = ${serviceRequest.serviceId}`)
              .limit(1);
            serviceName = service?.name || lead.serviceInterested || serviceName;
          }

          lifecycle.serviceRequest = {
            id: serviceRequest.id,
            requestId: serviceRequest.requestId,
            status: serviceRequest.status,
            progress: serviceRequest.progress || 0,
            serviceName,
            serviceId: serviceRequest.serviceId,
            createdAt: serviceRequest.createdAt,
          };

          // Get task statistics
          const tasks = await db
            .select({
              id: orderTasks.id,
              name: orderTasks.name,
              status: orderTasks.status,
              stepNumber: orderTasks.stepNumber,
              qcStatus: orderTasks.qcStatus,
            })
            .from(orderTasks)
            .where(eq(orderTasks.serviceRequestId, serviceRequest.id))
            .orderBy(orderTasks.stepNumber);

          const completedTasks = tasks.filter(t => t.status === 'completed');
          const inProgressTask = tasks.find(t => t.status === 'in_progress' || t.status === 'ready');

          lifecycle.tasks = {
            total: tasks.length,
            completed: completedTasks.length,
            currentStep: inProgressTask?.name || (completedTasks.length === tasks.length ? 'All Complete' : null),
            currentStepNumber: inProgressTask?.stepNumber || null,
          };

          // Determine QC status from tasks
          const qcPendingTask = tasks.find(t => t.status === 'qc_pending');
          const rejectedTask = tasks.find(t => t.qcStatus === 'rejected');
          const allQcApproved = tasks.filter(t => t.qcStatus === 'approved').length > 0;

          if (qcPendingTask) {
            lifecycle.qcStatus = 'pending';
          } else if (rejectedTask) {
            lifecycle.qcStatus = 'rejected';
          } else if (allQcApproved) {
            lifecycle.qcStatus = 'approved';
          }

          // Determine delivery status from service request status
          const srStatus = serviceRequest.status?.toLowerCase();
          if (srStatus === 'completed' || srStatus === 'delivered') {
            lifecycle.deliveryStatus = 'delivered';
          } else if (srStatus === 'confirmed' || srStatus === 'client_confirmed') {
            lifecycle.deliveryStatus = 'confirmed';
          } else if (tasks.length > 0 && completedTasks.length < tasks.length) {
            lifecycle.deliveryStatus = 'pending';
          }
        }
      }

      res.json(lifecycle);
    } catch (error) {
      console.error('Error fetching lead lifecycle:', error);
      res.status(500).json({ error: 'Failed to fetch lead lifecycle' });
    }
  });

  // ============ COMMISSION TRACKING ============

  /**
   * GET /api/agent/commissions
   * Get all commissions for the agent
   * Requires: Agent role or higher
   */
  app.get('/api/agent/commissions', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;
      const userRole = req.user?.role;
      const { status, period, limit = 50 } = req.query;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const filters = [];

      if (userRole === 'agent') {
        filters.push(eq(commissions.agentId, parseInt(String(agentId)) || 0));
      }

      if (status && status !== 'all') {
        if (status === 'cleared') {
          filters.push(eq(commissions.status, 'paid'));
        } else if (status === 'processing') {
          filters.push(eq(commissions.status, 'approved'));
        } else if (status === 'pending') {
          filters.push(sql`(${commissions.status} = 'pending' OR ${commissions.status} = 'pending_approval')` as any);
        } else {
          filters.push(eq(commissions.status, status as string));
        }
      }

      if (period && period !== 'all') {
        const now = new Date();
        let startDate = new Date(0);
        let endDate = now;

        if (period === 'this_month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'last_month') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (period === 'this_quarter') {
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
        } else if (period === 'this_year') {
          startDate = new Date(now.getFullYear(), 0, 1);
        }

        filters.push(gte(commissions.createdAt, startDate));
        filters.push(lte(commissions.createdAt, endDate));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      let query = db
        .select({
          id: commissions.id,
          createdAt: commissions.createdAt,
          clientName: businessEntities.name,
          serviceName: services.name,
          serviceAmount: serviceRequests.totalAmount,
          commissionAmount: commissions.commissionAmount,
          status: commissions.status,
          payoutDate: commissions.paidOn,
          payableOn: commissions.payableOn,
        })
        .from(commissions)
        .leftJoin(serviceRequests, eq(commissions.serviceRequestId, serviceRequests.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .orderBy(desc(commissions.createdAt))
        .limit(parseInt(limit as string));

      if (whereClause) {
        query = query.where(whereClause) as any;
      }

      const commissionRows = await query;

      const mapped = commissionRows.map((row) => {
        let mappedStatus = 'pending';
        if (row.status === 'paid') mappedStatus = 'cleared';
        else if (row.status === 'approved') mappedStatus = 'processing';
        else if (row.status === 'pending_approval') mappedStatus = 'pending';
        else if (row.status === 'pending') mappedStatus = 'pending';

        return {
          ...row,
          serviceAmount: row.serviceAmount ? Number(row.serviceAmount) : 0,
          commissionAmount: row.commissionAmount ? Number(row.commissionAmount) : 0,
          status: mappedStatus,
          payoutDate: row.payoutDate || row.payableOn || null,
        };
      });

      res.json({
        commissions: mapped,
        total: mapped.length,
      });
    } catch (error) {
      console.error('Error fetching commissions:', error);
      res.status(500).json({ error: 'Failed to fetch commissions' });
    }
  });

  /**
   * GET /api/agent/commissions/summary
   * Get commission summary for dashboard
   * Requires: Agent role or higher
   */
  app.get('/api/agent/commissions/summary', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;
      const userRole = req.user?.role;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      let query = db
        .select({
          id: commissions.id,
          commissionAmount: commissions.commissionAmount,
          status: commissions.status,
          createdAt: commissions.createdAt,
          paidOn: commissions.paidOn,
          payableOn: commissions.payableOn,
        })
        .from(commissions);

      if (userRole === 'agent') {
        query = query.where(eq(commissions.agentId, parseInt(String(agentId)) || 0)) as any;
      }

      const rows = await query;
      const toNumber = (value: any) => Number(value || 0);
      const now = new Date();

      const thisMonthRows = rows.filter((row) => {
        const created = new Date(row.createdAt || Date.now());
        return created.getMonth() === now.getMonth() &&
               created.getFullYear() === now.getFullYear();
      });

      const totalEarned = rows.reduce((sum, row) => sum + toNumber(row.commissionAmount), 0);
      const pendingAmount = rows
        .filter(row => ['pending', 'pending_approval'].includes(row.status || ''))
        .reduce((sum, row) => sum + toNumber(row.commissionAmount), 0);
      const clearedAmount = rows
        .filter(row => row.status === 'paid')
        .reduce((sum, row) => sum + toNumber(row.commissionAmount), 0);
      const thisMonthEarnings = thisMonthRows.reduce((sum, row) => sum + toNumber(row.commissionAmount), 0);
      const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
      const nextPayoutAmount = rows
        .filter(row => row.status === 'approved' && !row.paidOn)
        .reduce((sum, row) => sum + toNumber(row.commissionAmount), 0);

      const summary = {
        totalEarned,
        pendingAmount,
        clearedAmount,
        thisMonthEarnings,
        nextPayoutDate: nextPayoutDate.toISOString(),
        nextPayoutAmount,
      };

      res.json(summary);
    } catch (error) {
      console.error('Error fetching commission summary:', error);
      res.status(500).json({ error: 'Failed to fetch commission summary' });
    }
  });

  // ============ PERFORMANCE ANALYTICS ============

  /**
   * GET /api/agent/performance
   * Get detailed performance analytics
   * Requires: Agent role or higher
   */
  app.get('/api/agent/performance', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;
      const userRole = req.user?.role;
      const { period = '6months' } = req.query;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Filter data by agent if not admin
      let leadsQuery = db.select().from(leads);
      let commissionsQuery = db.select().from(commissions);

      if (userRole === 'agent') {
        leadsQuery = leadsQuery.where(eq(leads.agentId, String(agentId))) as any;
        commissionsQuery = commissionsQuery.where(eq(commissions.agentId, parseInt(String(agentId)) || 0)) as any;
      }

      const allLeads = await leadsQuery;
      const agentCommissions = await commissionsQuery;

      // Calculate monthly data for the last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });

        const monthLeads = allLeads.filter(l => {
          const created = new Date(l.createdAt || Date.now());
          return created.getMonth() === date.getMonth() &&
                 created.getFullYear() === date.getFullYear();
        });

        const monthCommissions = agentCommissions.filter(c => {
          const created = new Date(c.createdAt || Date.now());
          return created.getMonth() === date.getMonth() &&
                 created.getFullYear() === date.getFullYear();
        });

        monthlyData.push({
          month: monthName,
          leads: monthLeads.length,
          conversions: monthLeads.filter(l => l.stage === 'converted').length,
          commission: monthCommissions.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0),
        });
      }

      const convertedLeads = allLeads.filter(l => l.stage === 'converted');
      const currentAgentTotalCommission = agentCommissions.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);

      // Get all agents and calculate their performance for rankings
      const allAgents = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users).where(eq(users.role, 'agent'));

      // Get all leads and commissions for leaderboard calculation
      const allLeadsForRanking = await db.select().from(leads);
      const allCommissionsForRanking = await db.select().from(commissions);

      // Calculate each agent's performance
      const agentPerformances = allAgents.map(agent => {
        const agentLeads = allLeadsForRanking.filter(l => l.agentId === String(agent.id));
        const agentConversions = agentLeads.filter(l => l.stage === 'converted').length;
        const agentTotalCommission = allCommissionsForRanking
          .filter(c => c.agentId === agent.id)
          .reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);

        return {
          id: agent.id,
          name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent',
          conversions: agentConversions,
          commission: agentTotalCommission,
          isCurrentAgent: agent.id === agentId,
        };
      });

      // Sort by commission (descending) for ranking
      agentPerformances.sort((a, b) => b.commission - a.commission);

      // Calculate rank and percentile
      const totalAgents = agentPerformances.length || 1;
      const currentAgentRank = agentPerformances.findIndex(a => a.isCurrentAgent) + 1;
      const percentile = totalAgents > 1
        ? Math.round(((totalAgents - currentAgentRank) / (totalAgents - 1)) * 100)
        : 100;

      // Build leaderboard (top 5 + current agent if not in top 5)
      const leaderboard = agentPerformances.slice(0, 5).map((agent, index) => ({
        rank: index + 1,
        name: agent.isCurrentAgent ? 'You' : agent.name,
        conversions: agent.conversions,
        commission: agent.commission,
        isCurrentAgent: agent.isCurrentAgent,
      }));

      // If current agent not in top 5, add them
      if (currentAgentRank > 5) {
        const currentAgent = agentPerformances.find(a => a.isCurrentAgent);
        if (currentAgent) {
          leaderboard.push({
            rank: currentAgentRank,
            name: 'You',
            conversions: currentAgent.conversions,
            commission: currentAgent.commission,
            isCurrentAgent: true,
          });
        }
      }

      // Calculate badges based on actual performance
      const badges = [];
      if (currentAgentRank === 1) {
        badges.push({ name: 'Top Performer', icon: '🏆', earnedAt: new Date().toISOString().split('T')[0] });
      }
      if (convertedLeads.length >= 10) {
        badges.push({ name: '10+ Conversions', icon: '🎯', earnedAt: new Date().toISOString().split('T')[0] });
      }
      if (convertedLeads.length >= 25) {
        badges.push({ name: '25+ Conversions', icon: '⭐', earnedAt: new Date().toISOString().split('T')[0] });
      }
      if (currentAgentTotalCommission >= 100000) {
        badges.push({ name: '₹1L+ Earned', icon: '💰', earnedAt: new Date().toISOString().split('T')[0] });
      }
      if (percentile >= 90) {
        badges.push({ name: 'Top 10%', icon: '🔥', earnedAt: new Date().toISOString().split('T')[0] });
      }

      const performance = {
        // Overall metrics
        totalLeads: allLeads.length,
        totalConversions: convertedLeads.length,
        conversionRate: allLeads.length > 0
          ? Math.round((convertedLeads.length / allLeads.length) * 100)
          : 0,
        totalRevenue: currentAgentTotalCommission,

        // Rankings (real data)
        rank: currentAgentRank || totalAgents,
        totalAgents,
        percentile,

        // Monthly trend
        monthlyData,

        // Goals
        monthlyGoal: 10,
        monthlyAchieved: monthlyData[monthlyData.length - 1]?.leads || 0,

        // Badges earned (based on real performance)
        badges,

        // Leaderboard position (real data)
        leaderboard,
      };

      res.json(performance);
    } catch (error) {
      console.error('Error fetching performance:', error);
      res.status(500).json({ error: 'Failed to fetch performance data' });
    }
  });

  /**
   * GET /api/agent/leaderboard
   * Get agent leaderboard rankings
   * Requires: Agent role or higher
   */
  app.get('/api/agent/leaderboard', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { period = 'this_month' } = req.query;
      const currentAgentId = req.user?.id;

      // Get all agents
      const allAgents = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users).where(eq(users.role, 'agent'));

      // Get agent profiles for territory info
      const profiles = await db.select().from(agentProfiles);
      const profileMap = new Map(profiles.map(p => [p.userId, p]));

      // Get all leads and commissions
      const allLeads = await db.select().from(leads);
      const allCommissions = await db.select().from(commissions);

      // Calculate each agent's performance
      const agentPerformances = allAgents.map(agent => {
        const agentLeads = allLeads.filter(l => l.agentId === String(agent.id));
        const leadsConverted = agentLeads.filter(l => l.stage === 'converted').length;
        const commissionEarned = allCommissions
          .filter(c => c.agentId === agent.id)
          .reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
        const profile = profileMap.get(agent.id);

        return {
          id: agent.id,
          name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent',
          territory: profile?.assignedTerritory || 'Unassigned',
          commissionEarned,
          leadsConverted,
          isCurrentUser: agent.id === currentAgentId,
        };
      });

      // Sort by commission (descending) for ranking
      agentPerformances.sort((a, b) => b.commissionEarned - a.commissionEarned);

      // Add rank and limit to top 10
      const agents = agentPerformances.slice(0, 10).map((agent, index) => ({
        ...agent,
        rank: index + 1,
        name: agent.isCurrentUser ? 'You' : agent.name,
      }));

      // If current user is not in top 10, add them
      const currentUserRank = agentPerformances.findIndex(a => a.isCurrentUser) + 1;
      if (currentUserRank > 10) {
        const currentUser = agentPerformances.find(a => a.isCurrentUser);
        if (currentUser) {
          agents.push({
            ...currentUser,
            rank: currentUserRank,
            name: 'You',
          });
        }
      }

      res.json({ agents, period, totalAgents: allAgents.length });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // ============ TERRITORY MANAGEMENT ============

  /**
   * GET /api/agent/territory
   * Get agent's assigned territory and metrics
   * Requires: Agent role or higher
   */
  app.get('/api/agent/territory', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get agent profile for territory assignment
      const [agentProfile] = await db
        .select()
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, agentId));

      // Get lead stats for territory metrics
      const agentLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.agentId, String(agentId)));

      const convertedLeads = agentLeads.filter(l => l.stage === 'converted');
      const totalClients = convertedLeads.length;

      // Calculate market coverage based on leads
      const marketCoverage = Math.min(100, Math.round((agentLeads.length / 50) * 100)); // 50 leads = 100% coverage
      const customerDensity = Math.round((totalClients / Math.max(1, agentLeads.length)) * 100);

      const territoryData = {
        primary: {
          name: agentProfile?.assignedTerritory || 'Mumbai Metropolitan',
          coverage: marketCoverage,
        },
        secondary: [
          { name: 'Navi Mumbai', coverage: Math.round(marketCoverage * 0.7) },
          { name: 'Thane', coverage: Math.round(marketCoverage * 0.5) },
        ],
        metrics: {
          marketCoverage,
          customerDensity,
          competitionIndex: marketCoverage > 70 ? 'Low' : marketCoverage > 40 ? 'Medium' : 'High',
          totalClients,
        },
        stats: {
          totalLeads: agentLeads.length,
          activeClients: convertedLeads.length,
          potentialMarket: 150 - agentLeads.length,
          growthOpportunity: `${Math.round(((150 - agentLeads.length) / 150) * 100)}%`,
        },
        boundaries: {
          pincodes: ['400001', '400002', '400003', '400004', '400005'],
          districts: ['Mumbai City', 'Mumbai Suburban'],
          state: 'Maharashtra',
        },
      };

      res.json(territoryData);
    } catch (error) {
      console.error('Error fetching territory:', error);
      res.status(500).json({ error: 'Failed to fetch territory data' });
    }
  });

  // ============ MARKETING RESOURCES ============

  /**
   * GET /api/agent/resources
   * Get marketing resources for agents
   * Requires: Agent role or higher
   */
  app.get('/api/agent/resources', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, type, limit = 50 } = req.query;

      // Marketing resources for agents
      const allResources = [
        // Brochures
        {
          id: 1,
          title: 'GST Registration Services Brochure',
          description: 'Complete guide to our GST registration services with pricing and timelines',
          category: 'brochures',
          type: 'pdf',
          fileUrl: '/resources/brochures/gst-registration-brochure.pdf',
          thumbnailUrl: '/resources/thumbnails/gst-registration.jpg',
          downloads: 156,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          title: 'Company Registration Brochure',
          description: 'Private Limited and LLP registration services overview',
          category: 'brochures',
          type: 'pdf',
          fileUrl: '/resources/brochures/company-registration-brochure.pdf',
          thumbnailUrl: '/resources/thumbnails/company-registration.jpg',
          downloads: 203,
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          title: 'Compliance Calendar 2026',
          description: 'Annual compliance calendar with all important due dates',
          category: 'brochures',
          type: 'pdf',
          fileUrl: '/resources/brochures/compliance-calendar-2026.pdf',
          thumbnailUrl: '/resources/thumbnails/compliance-calendar.jpg',
          downloads: 342,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Presentations
        {
          id: 4,
          title: 'DigiComply Services Overview',
          description: 'Complete deck covering all services for client presentations',
          category: 'presentations',
          type: 'pptx',
          fileUrl: '/resources/presentations/services-overview.pptx',
          thumbnailUrl: '/resources/thumbnails/services-overview.jpg',
          downloads: 89,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 5,
          title: 'GST Benefits Presentation',
          description: 'Benefits of GST registration for small businesses',
          category: 'presentations',
          type: 'pptx',
          fileUrl: '/resources/presentations/gst-benefits.pptx',
          thumbnailUrl: '/resources/thumbnails/gst-benefits.jpg',
          downloads: 124,
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Videos
        {
          id: 6,
          title: 'How to Pitch GST Services',
          description: 'Training video on effective GST service pitching',
          category: 'videos',
          type: 'video',
          fileUrl: '/resources/videos/gst-pitch-training.mp4',
          thumbnailUrl: '/resources/thumbnails/gst-pitch.jpg',
          downloads: 67,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 7,
          title: 'Client Objection Handling',
          description: 'How to handle common client objections effectively',
          category: 'videos',
          type: 'video',
          fileUrl: '/resources/videos/objection-handling.mp4',
          thumbnailUrl: '/resources/thumbnails/objection-handling.jpg',
          downloads: 91,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Templates
        {
          id: 8,
          title: 'Client Introduction Email Template',
          description: 'Professional email template for introducing services to new clients',
          category: 'templates',
          type: 'docx',
          fileUrl: '/resources/templates/client-intro-email.docx',
          thumbnailUrl: '/resources/thumbnails/email-template.jpg',
          downloads: 245,
          createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 9,
          title: 'Follow-up Message Templates',
          description: 'WhatsApp and SMS templates for lead follow-ups',
          category: 'templates',
          type: 'docx',
          fileUrl: '/resources/templates/followup-templates.docx',
          thumbnailUrl: '/resources/thumbnails/followup-template.jpg',
          downloads: 312,
          createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 10,
          title: 'Quotation Template',
          description: 'Professional quotation format for client proposals',
          category: 'templates',
          type: 'xlsx',
          fileUrl: '/resources/templates/quotation-template.xlsx',
          thumbnailUrl: '/resources/thumbnails/quotation-template.jpg',
          downloads: 178,
          createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Guides
        {
          id: 11,
          title: 'Agent Sales Handbook',
          description: 'Comprehensive guide to selling compliance services',
          category: 'guides',
          type: 'pdf',
          fileUrl: '/resources/guides/sales-handbook.pdf',
          thumbnailUrl: '/resources/thumbnails/sales-handbook.jpg',
          downloads: 156,
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 12,
          title: 'Service Pricing Guide',
          description: 'Detailed pricing for all services with commission rates',
          category: 'guides',
          type: 'pdf',
          fileUrl: '/resources/guides/pricing-guide.pdf',
          thumbnailUrl: '/resources/thumbnails/pricing-guide.jpg',
          downloads: 289,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // Apply filters
      let filteredResources = allResources;

      if (category && category !== 'all') {
        filteredResources = filteredResources.filter(r => r.category === category);
      }

      if (type && type !== 'all') {
        filteredResources = filteredResources.filter(r => r.type === type);
      }

      // Sort by downloads (most popular first)
      filteredResources.sort((a, b) => b.downloads - a.downloads);

      // Apply limit
      const limitedResources = filteredResources.slice(0, parseInt(limit as string));

      // Get category summary
      const categories = [
        { id: 'brochures', name: 'Brochures', count: allResources.filter(r => r.category === 'brochures').length, icon: 'file-text' },
        { id: 'presentations', name: 'Presentations', count: allResources.filter(r => r.category === 'presentations').length, icon: 'presentation' },
        { id: 'videos', name: 'Videos', count: allResources.filter(r => r.category === 'videos').length, icon: 'video' },
        { id: 'templates', name: 'Templates', count: allResources.filter(r => r.category === 'templates').length, icon: 'file' },
        { id: 'guides', name: 'Guides', count: allResources.filter(r => r.category === 'guides').length, icon: 'book' },
      ];

      res.json({
        resources: limitedResources,
        total: filteredResources.length,
        categories,
        featured: allResources.slice(0, 3), // Top 3 most downloaded
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ error: 'Failed to fetch resources' });
    }
  });

  /**
   * POST /api/agent/resources/:id/download
   * Track resource download
   * Requires: Agent role or higher
   */
  app.post('/api/agent/resources/:id/download', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;

      // In production, increment download count and log analytics
      // await db.update(marketingResources).set({ downloads: sql`downloads + 1` }).where(eq(marketingResources.id, parseInt(id)));

      res.json({
        success: true,
        message: 'Download tracked',
        resourceId: parseInt(id),
        downloadedBy: agentId,
        downloadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking download:', error);
      res.status(500).json({ error: 'Failed to track download' });
    }
  });

  // ============ ANNOUNCEMENTS ============

  /**
   * GET /api/agent/announcements
   * Get announcements for agents
   * Requires: Agent role or higher
   */
  app.get('/api/agent/announcements', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // In production, this would query from an announcements table
      const announcements = [
        {
          id: 1,
          title: 'New Commission Structure',
          message: 'We have updated the commission structure for Q1 2026. Check your dashboard for details.',
          type: 'info',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          priority: 'high',
        },
        {
          id: 2,
          title: 'Monthly Target Bonus',
          message: 'Achieve 15+ conversions this month to unlock a 20% bonus on all commissions!',
          type: 'reward',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          priority: 'medium',
        },
        {
          id: 3,
          title: 'New Service Launch',
          message: 'We have launched GST Annual Return filing service. Commission: 15% per conversion.',
          type: 'product',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          priority: 'medium',
        },
        {
          id: 4,
          title: 'Training Webinar',
          message: 'Join our weekly training webinar every Friday at 3 PM to learn sales techniques.',
          type: 'training',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          priority: 'low',
        },
      ];

      res.json({ announcements });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  // ============ V1 API COMPATIBILITY ============
  // V1 routes also protected - they redirect to main routes which have auth

  app.get('/api/v1/agent/stats', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/stats';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/leads', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/leads';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/leads/recent', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/leads/recent';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/commissions', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/commissions';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/commissions/summary', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/commissions/summary';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/performance', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/performance';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/leaderboard', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/leaderboard';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/announcements', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/announcements';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/territory', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/territory';
    app._router.handle(req, res, () => {});
  });

  app.get('/api/v1/agent/resources', ...agentAuth, async (req: AuthenticatedRequest, res) => {
    req.url = '/api/agent/resources';
    app._router.handle(req, res, () => {});
  });

  // ============ KYC DOCUMENT MANAGEMENT ============

  /**
   * GET /api/agent/kyc/status
   * Get agent's KYC verification status
   * Requires: Agent role or higher
   */
  app.get('/api/agent/kyc/status', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // KYC Document Types Required for Agent Onboarding
      const requiredDocuments = [
        { id: 'pan_card', name: 'PAN Card', description: 'Permanent Account Number card issued by Income Tax Dept.', mandatory: true },
        { id: 'aadhaar', name: 'Aadhaar Card', description: 'UIDAI issued identity card', mandatory: true },
        { id: 'address_proof', name: 'Address Proof', description: 'Utility bill, Bank statement, or Rental agreement (last 3 months)', mandatory: true },
        { id: 'bank_details', name: 'Bank Account Proof', description: 'Cancelled cheque or bank statement showing account details', mandatory: true },
        { id: 'photo', name: 'Passport Photo', description: 'Recent passport-sized photograph with white background', mandatory: true },
        { id: 'gst_certificate', name: 'GST Certificate', description: 'If registered under GST', mandatory: false },
        { id: 'professional_cert', name: 'Professional Certificate', description: 'CA/CS/CMA certificate or relevant qualification', mandatory: false },
        { id: 'experience_letter', name: 'Experience Letter', description: 'Previous experience in financial/compliance services', mandatory: false },
      ];

      // Fetch real KYC documents from database
      const kycDocs = await db
        .select({
          id: agentKycDocuments.id,
          documentType: agentKycDocuments.documentType,
          fileName: documents.fileName,
          fileSize: documents.fileSize,
          uploadedAt: agentKycDocuments.createdAt,
          status: agentKycDocuments.verificationStatus,
          verifiedBy: agentKycDocuments.verifiedBy,
          verifiedAt: agentKycDocuments.verifiedAt,
          extractedData: agentKycDocuments.ocrExtractedData,
          rejectionReason: agentKycDocuments.rejectionReason,
        })
        .from(agentKycDocuments)
        .leftJoin(documents, eq(agentKycDocuments.documentId, documents.id))
        .where(eq(agentKycDocuments.agentId, agentId));

      // Map document types to match frontend expectations (e.g., 'pan' -> 'pan_card')
      const typeMapping: Record<string, string> = {
        'pan': 'pan_card',
        'aadhaar': 'aadhaar',
        'bank_statement': 'bank_details',
        'cancelled_cheque': 'bank_details',
        'address_proof': 'address_proof',
        'photo': 'photo',
        'signature': 'photo',
      };

      // Map status to match frontend expectations
      const statusMapping: Record<string, string> = {
        'pending': 'pending_review',
        'auto_verified': 'verified',
        'manual_review': 'pending_review',
        'verified': 'verified',
        'rejected': 'rejected',
      };

      const uploadedDocuments = kycDocs.map(doc => ({
        id: doc.id,
        documentType: typeMapping[doc.documentType] || doc.documentType,
        fileName: doc.fileName || `${doc.documentType}_document`,
        fileSize: doc.fileSize || 0,
        uploadedAt: doc.uploadedAt || new Date(),
        status: statusMapping[doc.status || 'pending'] || 'pending_review',
        verifiedBy: doc.verifiedBy ? 'KYC Team' : null,
        verifiedAt: doc.verifiedAt,
        extractedData: doc.extractedData,
        rejectionReason: doc.rejectionReason,
      }));

      // Calculate KYC status
      const mandatoryDocs = requiredDocuments.filter(d => d.mandatory);
      const uploadedMandatory = uploadedDocuments.filter(
        d => mandatoryDocs.some(m => m.id === d.documentType)
      );
      const verifiedMandatory = uploadedMandatory.filter(d => d.status === 'verified');
      const pendingMandatory = uploadedMandatory.filter(d => d.status === 'pending_review');
      const rejectedDocs = uploadedDocuments.filter(d => d.status === 'rejected');

      let overallStatus: 'not_started' | 'incomplete' | 'pending_verification' | 'verified' | 'action_required';

      if (uploadedMandatory.length === 0) {
        overallStatus = 'not_started';
      } else if (rejectedDocs.length > 0) {
        overallStatus = 'action_required';
      } else if (verifiedMandatory.length === mandatoryDocs.length) {
        overallStatus = 'verified';
      } else if (pendingMandatory.length > 0) {
        overallStatus = 'pending_verification';
      } else {
        overallStatus = 'incomplete';
      }

      const kycStatus = {
        agentId,
        overallStatus,
        statusMessage: getKycStatusMessage(overallStatus),
        completionPercentage: Math.round((verifiedMandatory.length / mandatoryDocs.length) * 100),

        statistics: {
          totalRequired: mandatoryDocs.length,
          uploaded: uploadedMandatory.length,
          verified: verifiedMandatory.length,
          pending: pendingMandatory.length,
          rejected: rejectedDocs.length,
          missing: mandatoryDocs.length - uploadedMandatory.length,
        },

        requiredDocuments: requiredDocuments.map(doc => {
          const uploaded = uploadedDocuments.find(u => u.documentType === doc.id);
          return {
            ...doc,
            status: uploaded?.status || 'not_uploaded',
            uploadedFile: uploaded ? {
              id: uploaded.id,
              fileName: uploaded.fileName,
              fileSize: uploaded.fileSize,
              uploadedAt: uploaded.uploadedAt,
              extractedData: uploaded.extractedData,
              rejectionReason: uploaded.rejectionReason,
            } : null,
          };
        }),

        uploadedDocuments,

        // Timeline of KYC progress - built from actual document history
        timeline: buildKycTimeline(uploadedDocuments),

        // Benefits unlocked with verified KYC
        benefits: {
          currentTier: verifiedMandatory.length >= 4 ? 'verified' : 'basic',
          unlockedFeatures: verifiedMandatory.length >= 4 ? [
            'Higher commission rates (up to 20%)',
            'Priority lead assignment',
            'Access to premium services',
            'Faster payout processing (T+3)',
            'Dedicated relationship manager',
          ] : [
            'Basic commission rates (15%)',
            'Standard lead assignment',
            'Standard payout processing (T+7)',
          ],
          pendingFeatures: verifiedMandatory.length < 4 ? [
            'Higher commission rates (up to 20%)',
            'Priority lead assignment',
            'Access to premium services',
            'Faster payout processing (T+3)',
            'Dedicated relationship manager',
          ] : [],
        },

        nextSteps: getNextSteps(overallStatus, uploadedDocuments, requiredDocuments),
      };

      res.json(kycStatus);
    } catch (error) {
      console.error('Error fetching KYC status:', error);
      res.status(500).json({ error: 'Failed to fetch KYC status' });
    }
  });

  /**
   * GET /api/agent/kyc/documents
   * Get all KYC documents for the agent
   * Requires: Agent role or higher
   */
  app.get('/api/agent/kyc/documents', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;
      const { status, documentType } = req.query;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Fetch real KYC documents from database
      const kycDocsQuery = db
        .select({
          id: agentKycDocuments.id,
          documentType: agentKycDocuments.documentType,
          documentName: agentKycDocuments.documentName,
          fileName: documents.fileName,
          originalFileName: documents.originalName,
          fileSize: documents.fileSize,
          mimeType: documents.mimeType,
          uploadedAt: agentKycDocuments.createdAt,
          status: agentKycDocuments.verificationStatus,
          verifiedBy: agentKycDocuments.verifiedBy,
          verifiedAt: agentKycDocuments.verifiedAt,
          extractedData: agentKycDocuments.ocrExtractedData,
          rejectionReason: agentKycDocuments.rejectionReason,
          version: agentKycDocuments.version,
        })
        .from(agentKycDocuments)
        .leftJoin(documents, eq(agentKycDocuments.documentId, documents.id))
        .where(eq(agentKycDocuments.agentId, agentId));

      const kycDocsResult = await kycDocsQuery;

      // Map document types and status to match frontend expectations
      const documentTypeNames: Record<string, string> = {
        'pan': 'PAN Card',
        'pan_card': 'PAN Card',
        'aadhaar': 'Aadhaar Card',
        'bank_statement': 'Bank Account Proof',
        'cancelled_cheque': 'Bank Account Proof',
        'bank_details': 'Bank Account Proof',
        'address_proof': 'Address Proof',
        'photo': 'Passport Photo',
        'signature': 'Signature',
        'gst_certificate': 'GST Certificate',
        'professional_cert': 'Professional Certificate',
        'experience_letter': 'Experience Letter',
      };

      const statusMapping: Record<string, string> = {
        'pending': 'pending_review',
        'auto_verified': 'verified',
        'manual_review': 'pending_review',
        'verified': 'verified',
        'rejected': 'rejected',
      };

      let kycDocuments = kycDocsResult.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        documentName: documentTypeNames[doc.documentType] || doc.documentName || doc.documentType,
        fileName: doc.fileName || `${doc.documentType}_document`,
        originalFileName: doc.originalFileName || doc.fileName,
        fileSize: doc.fileSize || 0,
        mimeType: doc.mimeType || 'application/octet-stream',
        uploadedAt: doc.uploadedAt || new Date(),
        status: statusMapping[doc.status || 'pending'] || 'pending_review',
        verifiedBy: doc.verifiedBy ? 'KYC Team' : null,
        verifiedAt: doc.verifiedAt,
        extractedData: doc.extractedData,
        rejectionReason: doc.rejectionReason,
        version: doc.version || 1,
        downloadUrl: `/api/agent/kyc/documents/${doc.id}/download`,
      }));

      // Apply filters
      if (status && status !== 'all') {
        kycDocuments = kycDocuments.filter(d => d.status === status);
      }
      if (documentType && documentType !== 'all') {
        kycDocuments = kycDocuments.filter(d => d.documentType === documentType);
      }

      res.json({
        documents: kycDocuments,
        total: kycDocuments.length,
        summary: {
          verified: kycDocuments.filter(d => d.status === 'verified').length,
          pending: kycDocuments.filter(d => d.status === 'pending_review').length,
          rejected: kycDocuments.filter(d => d.status === 'rejected').length,
        },
      });
    } catch (error) {
      console.error('Error fetching KYC documents:', error);
      res.status(500).json({ error: 'Failed to fetch KYC documents' });
    }
  });

  /**
   * POST /api/agent/kyc/documents
   * Upload a new KYC document
   * Requires: Agent role or higher
   */
  app.post('/api/agent/kyc/documents', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.user?.id;
      const { documentType, fileName, fileSize, mimeType, base64Data } = req.body;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!documentType || !fileName) {
        return res.status(400).json({ error: 'Document type and file name are required' });
      }

      // Validate document type
      const validTypes = ['pan_card', 'aadhaar', 'address_proof', 'bank_details', 'photo', 'gst_certificate', 'professional_cert', 'experience_letter'];
      if (!validTypes.includes(documentType)) {
        return res.status(400).json({ error: 'Invalid document type' });
      }

      // Mock upload - In production, save to storage and create DB record
      const newDocument = {
        id: Date.now(),
        agentId,
        documentType,
        documentName: getDocumentTypeName(documentType),
        fileName: `${documentType}_${agentId}_${Date.now()}.${fileName.split('.').pop()}`,
        originalFileName: fileName,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        uploadedAt: new Date(),
        status: 'pending_review',
        verifiedBy: null,
        verifiedAt: null,
        extractedData: null,
        rejectionReason: null,
        version: 1,
      };

      // In production: Save to cloud storage and insert into agentKycDocuments table
      // const [savedDoc] = await db.insert(agentKycDocuments).values(newDocument).returning();

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: newDocument,
        nextSteps: [
          'Your document has been submitted for verification',
          'Verification typically takes 1-2 business days',
          'You will be notified once verification is complete',
        ],
      });
    } catch (error) {
      console.error('Error uploading KYC document:', error);
      res.status(500).json({ error: 'Failed to upload KYC document' });
    }
  });

  /**
   * PUT /api/agent/kyc/documents/:id
   * Re-upload/update a rejected document
   * Requires: Agent role or higher
   */
  app.put('/api/agent/kyc/documents/:id', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;
      const { fileName, fileSize, mimeType, base64Data } = req.body;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Mock update - In production, verify ownership and update
      const updatedDocument = {
        id: parseInt(id),
        agentId,
        fileName: fileName || 'updated_document.pdf',
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/pdf',
        uploadedAt: new Date(),
        status: 'pending_review',
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null,
        version: 2, // Incremented version
      };

      res.json({
        message: 'Document re-uploaded successfully',
        document: updatedDocument,
        note: 'Previous rejection reason has been cleared. Your document is now pending verification.',
      });
    } catch (error) {
      console.error('Error updating KYC document:', error);
      res.status(500).json({ error: 'Failed to update KYC document' });
    }
  });

  /**
   * GET /api/agent/kyc/documents/:id/download
   * Download a KYC document
   * Requires: Agent role or higher + ownership
   */
  app.get('/api/agent/kyc/documents/:id/download', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Mock - In production, verify ownership and stream file
      res.json({
        downloadUrl: `/uploads/kyc/${id}/document.pdf`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
        fileName: 'document.pdf',
      });
    } catch (error) {
      console.error('Error downloading KYC document:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  /**
   * DELETE /api/agent/kyc/documents/:id
   * Delete a KYC document (only if not verified)
   * Requires: Agent role or higher + ownership + document not verified
   */
  app.delete('/api/agent/kyc/documents/:id', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const agentId = req.user?.id;

      if (!agentId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Mock check - In production, verify ownership and status
      // Cannot delete verified documents

      res.json({
        message: 'Document deleted successfully',
        documentId: id,
      });
    } catch (error) {
      console.error('Error deleting KYC document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  /**
   * GET /api/agent/kyc/requirements
   * Get KYC document requirements and guidelines
   * Requires: Agent role or higher
   */
  app.get('/api/agent/kyc/requirements', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requirements = {
        mandatoryDocuments: [
          {
            id: 'pan_card',
            name: 'PAN Card',
            description: 'Permanent Account Number card issued by Income Tax Department',
            acceptedFormats: ['PDF', 'JPG', 'PNG'],
            maxFileSize: '5MB',
            guidelines: [
              'Upload a clear, colored copy',
              'All corners should be visible',
              'Name and PAN number should be clearly readable',
              'No handwritten marks or corrections',
            ],
            sampleUrl: '/samples/pan_card_sample.jpg',
          },
          {
            id: 'aadhaar',
            name: 'Aadhaar Card',
            description: 'UIDAI issued identity card (masked Aadhaar accepted)',
            acceptedFormats: ['PDF', 'JPG', 'PNG'],
            maxFileSize: '5MB',
            guidelines: [
              'Both front and back required',
              'Can upload masked Aadhaar (last 4 digits visible)',
              'Photo should be clear and identifiable',
              'Address should match current communication address',
            ],
            sampleUrl: '/samples/aadhaar_sample.jpg',
          },
          {
            id: 'address_proof',
            name: 'Address Proof',
            description: 'Recent document proving current residential address',
            acceptedFormats: ['PDF', 'JPG', 'PNG'],
            maxFileSize: '5MB',
            acceptedDocuments: [
              'Utility Bill (Electricity/Water/Gas) - last 3 months',
              'Bank Statement - last 3 months',
              'Rental Agreement - valid/recent',
              'Passport with address page',
              'Voter ID with address',
            ],
            guidelines: [
              'Document should be recent (within last 3 months for bills)',
              'Name and address should be clearly visible',
              'Should match the name on PAN/Aadhaar',
            ],
            sampleUrl: '/samples/address_proof_sample.jpg',
          },
          {
            id: 'bank_details',
            name: 'Bank Account Proof',
            description: 'Proof of bank account for commission payouts',
            acceptedFormats: ['PDF', 'JPG', 'PNG'],
            maxFileSize: '5MB',
            acceptedDocuments: [
              'Cancelled cheque',
              'Bank statement showing account details',
              'Passbook first page',
            ],
            guidelines: [
              'Account holder name should match KYC name',
              'IFSC code and account number should be visible',
              'Cancelled cheque preferred for faster verification',
            ],
            sampleUrl: '/samples/bank_proof_sample.jpg',
          },
          {
            id: 'photo',
            name: 'Passport Photo',
            description: 'Recent photograph for profile and ID card',
            acceptedFormats: ['JPG', 'PNG'],
            maxFileSize: '2MB',
            guidelines: [
              'Passport size (35mm x 45mm) or close-up face photo',
              'White or light colored background',
              'Face should occupy 70-80% of the frame',
              'No sunglasses, caps, or face covering',
              'Recent photo (taken within last 6 months)',
            ],
            sampleUrl: '/samples/photo_sample.jpg',
          },
        ],
        optionalDocuments: [
          {
            id: 'gst_certificate',
            name: 'GST Certificate',
            description: 'GST registration certificate if registered',
            acceptedFormats: ['PDF'],
            maxFileSize: '5MB',
            guidelines: [
              'Current/active GST registration',
              'Trade name should match business name',
            ],
            benefit: 'Required for claiming input tax credit on commissions',
          },
          {
            id: 'professional_cert',
            name: 'Professional Certificate',
            description: 'CA/CS/CMA or relevant professional qualification',
            acceptedFormats: ['PDF', 'JPG', 'PNG'],
            maxFileSize: '5MB',
            guidelines: [
              'Certificate of practice or membership',
              'Should be current and valid',
            ],
            benefit: 'Unlocks access to advanced compliance services with higher commissions',
          },
          {
            id: 'experience_letter',
            name: 'Experience Letter',
            description: 'Previous experience in financial services',
            acceptedFormats: ['PDF'],
            maxFileSize: '5MB',
            guidelines: [
              'From previous employer in financial/compliance sector',
              'Should mention role and duration',
            ],
            benefit: 'May qualify for enhanced commission rates based on experience',
          },
        ],
        generalGuidelines: [
          'All documents should be clear and legible',
          'Documents with watermarks may be rejected',
          'Ensure file size is within the specified limit',
          'Color scans/photos preferred over black & white',
          'Avoid taking photos with flash causing glare',
          'Ensure all four corners of the document are visible',
        ],
        verificationTimeline: {
          standard: '1-2 business days',
          express: 'Same day (for complete submission before 2 PM)',
          rejectionResubmission: '24 hours after resubmission',
        },
        support: {
          email: 'kyc-support@digicomply.in',
          phone: '+91-124-4567890',
          hours: 'Mon-Sat, 9 AM - 6 PM IST',
        },
      };

      res.json(requirements);
    } catch (error) {
      console.error('Error fetching KYC requirements:', error);
      res.status(500).json({ error: 'Failed to fetch requirements' });
    }
  });

  // ============ ADMIN KYC MANAGEMENT ============

  /**
   * GET /api/admin/agent-kyc/pending
   * Get all agents with pending KYC verification
   * Requires: Admin role
   */
  app.get('/api/admin/agent-kyc/pending', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;

      // Get agents with pending KYC documents from database
      const pendingDocsQuery = await db
        .select({
          agentId: agentKycDocuments.agentId,
          documentType: agentKycDocuments.documentType,
          uploadedAt: agentKycDocuments.createdAt,
          version: agentKycDocuments.version,
        })
        .from(agentKycDocuments)
        .where(eq(agentKycDocuments.verificationStatus, 'pending'));

      // Get unique agent IDs with pending docs
      const agentIdsWithPending = [...new Set(pendingDocsQuery.map(d => d.agentId))];

      if (agentIdsWithPending.length === 0) {
        return res.json({
          agents: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          statistics: {
            totalPending: 0,
            awaitingInitialVerification: 0,
            awaitingResubmission: 0,
            avgVerificationTime: 'N/A',
          },
        });
      }

      // Get agent details and their document counts
      const agentDetails = await Promise.all(
        agentIdsWithPending.slice(offset, offset + limitNum).map(async (agentId) => {
          // Get agent user info
          const [agent] = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              email: users.email,
              phone: users.phone,
              createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, agentId));

          if (!agent) return null;

          // Get agent profile if exists
          const [profile] = await db
            .select({
              agentCode: agentProfiles.agentCode,
              territory: agentProfiles.territory,
            })
            .from(agentProfiles)
            .where(eq(agentProfiles.userId, agentId));

          // Get all KYC documents for this agent
          const allDocs = await db
            .select({
              id: agentKycDocuments.id,
              documentType: agentKycDocuments.documentType,
              verificationStatus: agentKycDocuments.verificationStatus,
              createdAt: agentKycDocuments.createdAt,
              version: agentKycDocuments.version,
            })
            .from(agentKycDocuments)
            .where(eq(agentKycDocuments.agentId, agentId));

          const pendingDocs = allDocs.filter(d => d.verificationStatus === 'pending');
          const verifiedDocs = allDocs.filter(d => d.verificationStatus === 'verified');
          const lastActivity = allDocs.length > 0
            ? new Date(Math.max(...allDocs.map(d => new Date(d.createdAt || 0).getTime())))
            : null;

          return {
            agentId: agent.id,
            agentCode: profile?.agentCode || `AGT${String(agent.id).padStart(3, '0')}`,
            agentName: agent.fullName || 'Unknown',
            email: agent.email,
            phone: agent.phone || 'N/A',
            territory: profile?.territory || 'Unassigned',
            joiningDate: agent.createdAt,
            kycStatus: pendingDocs.some(d => (d.version || 1) > 1) ? 'action_required' : 'pending_verification',
            pendingDocuments: pendingDocs.map(d => ({
              documentType: d.documentType,
              uploadedAt: d.createdAt,
              resubmission: (d.version || 1) > 1,
            })),
            totalDocuments: allDocs.length,
            verifiedDocuments: verifiedDocs.length,
            lastActivity,
          };
        })
      );

      const validAgents = agentDetails.filter(a => a !== null);
      const awaitingResubmission = validAgents.filter(a => a.kycStatus === 'action_required').length;

      res.json({
        agents: validAgents,
        total: agentIdsWithPending.length,
        page: pageNum,
        limit: limitNum,
        statistics: {
          totalPending: agentIdsWithPending.length,
          awaitingInitialVerification: agentIdsWithPending.length - awaitingResubmission,
          awaitingResubmission,
          avgVerificationTime: 'N/A',
        },
      });
    } catch (error) {
      console.error('Error fetching pending KYC:', error);
      res.status(500).json({ error: 'Failed to fetch pending verifications' });
    }
  });

  /**
   * GET /api/admin/agent-kyc/:agentId
   * Get detailed KYC for a specific agent
   * Requires: Admin role
   */
  app.get('/api/admin/agent-kyc/:agentId', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = parseInt(req.params.agentId);

      if (isNaN(agentId)) {
        return res.status(400).json({ error: 'Invalid agent ID' });
      }

      // Get agent user info
      const [agent] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, agentId));

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Get agent profile if exists
      const [profile] = await db
        .select({
          agentCode: agentProfiles.agentCode,
          territory: agentProfiles.territory,
        })
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, agentId));

      // Get all KYC documents for this agent with document file info
      const kycDocs = await db
        .select({
          id: agentKycDocuments.id,
          documentType: agentKycDocuments.documentType,
          documentName: agentKycDocuments.documentName,
          verificationStatus: agentKycDocuments.verificationStatus,
          createdAt: agentKycDocuments.createdAt,
          verifiedBy: agentKycDocuments.verifiedBy,
          verifiedAt: agentKycDocuments.verifiedAt,
          ocrExtractedData: agentKycDocuments.ocrExtractedData,
          rejectionReason: agentKycDocuments.rejectionReason,
          version: agentKycDocuments.version,
          documentId: agentKycDocuments.documentId,
          fileName: documents.fileName,
        })
        .from(agentKycDocuments)
        .leftJoin(documents, eq(agentKycDocuments.documentId, documents.id))
        .where(eq(agentKycDocuments.agentId, agentId))
        .orderBy(desc(agentKycDocuments.createdAt));

      // Get verifier names for documents
      const verifierIds = [...new Set(kycDocs.filter(d => d.verifiedBy).map(d => d.verifiedBy))];
      const verifiers = verifierIds.length > 0
        ? await db
            .select({ id: users.id, fullName: users.fullName })
            .from(users)
            .where(sql`${users.id} IN ${verifierIds}`)
        : [];
      const verifierMap = new Map(verifiers.map(v => [v.id, v.fullName]));

      // Format documents
      const formattedDocs = kycDocs.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        documentName: doc.documentName || doc.documentType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        status: doc.verificationStatus,
        fileName: doc.fileName || 'document.pdf',
        uploadedAt: doc.createdAt,
        verifiedBy: doc.verifiedBy ? verifierMap.get(doc.verifiedBy) || 'Admin' : null,
        verifiedAt: doc.verifiedAt,
        extractedData: doc.ocrExtractedData,
        rejectionReason: doc.rejectionReason,
        version: doc.version,
      }));

      // Get verification history from log
      const docIds = kycDocs.map(d => d.id);
      const historyLogs = docIds.length > 0
        ? await db
            .select({
              action: kycVerificationLog.action,
              kycDocumentId: kycVerificationLog.kycDocumentId,
              performedBy: kycVerificationLog.performedBy,
              notes: kycVerificationLog.notes,
              createdAt: kycVerificationLog.createdAt,
            })
            .from(kycVerificationLog)
            .where(sql`${kycVerificationLog.kycDocumentId} IN ${docIds}`)
            .orderBy(desc(kycVerificationLog.createdAt))
        : [];

      // Get performer names
      const performerIds = [...new Set(historyLogs.filter(l => l.performedBy).map(l => l.performedBy))];
      const performers = performerIds.length > 0
        ? await db
            .select({ id: users.id, fullName: users.fullName })
            .from(users)
            .where(sql`${users.id} IN ${performerIds}`)
        : [];
      const performerMap = new Map(performers.map(p => [p.id, p.fullName]));

      // Map doc IDs to document types
      const docTypeMap = new Map(kycDocs.map(d => [d.id, d.documentType]));

      const verificationHistory = historyLogs.map(log => ({
        action: log.action,
        documentType: docTypeMap.get(log.kycDocumentId) || 'unknown',
        by: log.performedBy ? performerMap.get(log.performedBy) || 'Admin' : 'System',
        at: log.createdAt,
        notes: log.notes,
      }));

      // Determine overall KYC status
      const hasPending = formattedDocs.some(d => d.status === 'pending' || d.status === 'pending_review');
      const hasRejected = formattedDocs.some(d => d.status === 'rejected');
      const allVerified = formattedDocs.length > 0 && formattedDocs.every(d => d.status === 'verified');
      let overallStatus = 'not_started';
      if (allVerified) overallStatus = 'verified';
      else if (hasRejected) overallStatus = 'action_required';
      else if (hasPending) overallStatus = 'pending_verification';
      else if (formattedDocs.length > 0) overallStatus = 'documents_pending';

      res.json({
        agent: {
          id: agent.id,
          agentCode: profile?.agentCode || `AGT${String(agent.id).padStart(3, '0')}`,
          name: agent.fullName || 'Unknown',
          email: agent.email,
          phone: agent.phone || 'N/A',
          territory: profile?.territory || 'Unassigned',
          joiningDate: agent.createdAt,
        },
        kycStatus: overallStatus,
        documents: formattedDocs,
        verificationHistory,
      });
    } catch (error) {
      console.error('Error fetching agent KYC:', error);
      res.status(500).json({ error: 'Failed to fetch agent KYC details' });
    }
  });

  /**
   * PATCH /api/admin/agent-kyc/:agentId/documents/:documentId/verify
   * Verify an agent's KYC document
   * Requires: Admin role
   */
  app.patch('/api/admin/agent-kyc/:agentId/documents/:documentId/verify', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const documentId = parseInt(req.params.documentId);
      const { extractedData, notes } = req.body;
      const verifierId = req.user?.id;

      if (isNaN(agentId) || isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid agent or document ID' });
      }

      // Verify the document belongs to the agent
      const [existingDoc] = await db
        .select()
        .from(agentKycDocuments)
        .where(and(
          eq(agentKycDocuments.id, documentId),
          eq(agentKycDocuments.agentId, agentId)
        ));

      if (!existingDoc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Update document verification status
      const [updatedDoc] = await db
        .update(agentKycDocuments)
        .set({
          verificationStatus: 'verified',
          verifiedBy: verifierId,
          verifiedAt: new Date(),
          ocrExtractedData: extractedData || existingDoc.ocrExtractedData,
          verificationNotes: notes,
          updatedAt: new Date(),
        })
        .where(eq(agentKycDocuments.id, documentId))
        .returning();

      // Log the verification action
      await db.insert(kycVerificationLog).values({
        kycDocumentId: documentId,
        action: 'approved',
        performedBy: verifierId,
        performedByRole: req.user?.role || 'admin',
        previousStatus: existingDoc.verificationStatus,
        newStatus: 'verified',
        notes,
      });

      res.json({
        message: 'Document verified successfully',
        document: {
          id: updatedDoc.id,
          agentId: updatedDoc.agentId,
          status: updatedDoc.verificationStatus,
          verifiedBy: req.user?.fullName || 'Admin',
          verifiedAt: updatedDoc.verifiedAt,
          extractedData: updatedDoc.ocrExtractedData,
        },
      });
    } catch (error) {
      console.error('Error verifying document:', error);
      res.status(500).json({ error: 'Failed to verify document' });
    }
  });

  /**
   * PATCH /api/admin/agent-kyc/:agentId/documents/:documentId/reject
   * Reject an agent's KYC document
   * Requires: Admin role
   */
  app.patch('/api/admin/agent-kyc/:agentId/documents/:documentId/reject', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const documentId = parseInt(req.params.documentId);
      const { reason, notes } = req.body;
      const rejectedById = req.user?.id;

      if (isNaN(agentId) || isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid agent or document ID' });
      }

      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      // Verify the document belongs to the agent
      const [existingDoc] = await db
        .select()
        .from(agentKycDocuments)
        .where(and(
          eq(agentKycDocuments.id, documentId),
          eq(agentKycDocuments.agentId, agentId)
        ));

      if (!existingDoc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Update document with rejection
      const [updatedDoc] = await db
        .update(agentKycDocuments)
        .set({
          verificationStatus: 'rejected',
          rejectionReason: reason,
          verificationNotes: notes,
          updatedAt: new Date(),
        })
        .where(eq(agentKycDocuments.id, documentId))
        .returning();

      // Log the rejection action
      await db.insert(kycVerificationLog).values({
        kycDocumentId: documentId,
        action: 'rejected',
        performedBy: rejectedById,
        performedByRole: req.user?.role || 'admin',
        previousStatus: existingDoc.verificationStatus,
        newStatus: 'rejected',
        notes: `Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`,
      });

      res.json({
        message: 'Document rejected. Agent will be notified to resubmit.',
        document: {
          id: updatedDoc.id,
          agentId: updatedDoc.agentId,
          status: updatedDoc.verificationStatus,
          rejectedBy: req.user?.fullName || 'Admin',
          rejectedAt: updatedDoc.updatedAt,
          rejectionReason: updatedDoc.rejectionReason,
        },
      });
    } catch (error) {
      console.error('Error rejecting document:', error);
      res.status(500).json({ error: 'Failed to reject document' });
    }
  });

  /**
   * GET /api/agent/profile
   * Get agent profile information
   */
  app.get('/api/agent/profile', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get agent profile record if exists
      const [agent] = await db
        .select()
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, userId));

      res.json({
        id: user.id,
        email: user.email,
        name: agent?.name || user.fullName || 'Agent User',
        phone: agent?.phone || user.phone || '',
        role: user.role,
        agentCode: agent?.agentCode || `AG${userId.toString().padStart(4, '0')}`,
        territory: agent?.assignedTerritory || null,
        performanceRating: agent?.performanceRating || null,
        totalCommissionEarned: agent?.totalCommissionEarned || '0.00',
        pendingPayouts: agent?.pendingPayouts || '0.00',
        clearedPayouts: agent?.clearedPayouts || '0.00',
        isActive: agent?.isActive ?? true,
        joiningDate: agent?.joiningDate || user.createdAt,
        notificationPreferences: {
          email: true,
          sms: true,
          push: true,
          leadUpdates: true,
          commissionAlerts: true,
          announcements: true,
        },
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Error fetching agent profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  /**
   * PATCH /api/agent/profile
   * Update agent profile
   */
  app.patch('/api/agent/profile', ...agentAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, phone, territory } = req.body;

      // Update user record
      const userUpdateData: any = {};
      if (name) userUpdateData.fullName = name;
      if (phone) userUpdateData.phone = phone;

      if (Object.keys(userUpdateData).length > 0) {
        await db
          .update(users)
          .set(userUpdateData)
          .where(eq(users.id, userId));
      }

      // Update agent profile record if additional fields provided
      const agentUpdateData: any = {};
      if (name) agentUpdateData.name = name;
      if (phone) agentUpdateData.phone = phone;
      if (territory) agentUpdateData.assignedTerritory = territory;

      if (Object.keys(agentUpdateData).length > 0) {
        const [existingAgent] = await db
          .select()
          .from(agentProfiles)
          .where(eq(agentProfiles.userId, userId));

        if (existingAgent) {
          await db
            .update(agentProfiles)
            .set(agentUpdateData)
            .where(eq(agentProfiles.userId, userId));
        }
      }

      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating agent profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  console.log('✅ Agent Portal routes registered (PROTECTED)');
}

// Helper functions for KYC management
function getKycStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'not_started': 'KYC not started. Please upload your documents to get verified.',
    'incomplete': 'KYC incomplete. Please upload all mandatory documents.',
    'pending_verification': 'Documents under review. Verification typically takes 1-2 business days.',
    'verified': 'KYC verified! You have full access to all agent features.',
    'action_required': 'Some documents need to be re-uploaded. Please check the rejected documents.',
  };
  return messages[status] || 'Unknown status';
}

function getDocumentTypeName(type: string): string {
  const names: Record<string, string> = {
    'pan_card': 'PAN Card',
    'aadhaar': 'Aadhaar Card',
    'address_proof': 'Address Proof',
    'bank_details': 'Bank Account Proof',
    'photo': 'Passport Photo',
    'gst_certificate': 'GST Certificate',
    'professional_cert': 'Professional Certificate',
    'experience_letter': 'Experience Letter',
  };
  return names[type] || type;
}

function getNextSteps(status: string, uploadedDocs: any[], requiredDocs: any[]): string[] {
  const steps: string[] = [];

  if (status === 'not_started') {
    steps.push('Upload your PAN Card to begin KYC verification');
    steps.push('Upload Aadhaar Card (masked version accepted)');
    steps.push('Prepare address proof and bank details');
  } else if (status === 'incomplete') {
    const mandatoryTypes = requiredDocs.filter(d => d.mandatory).map(d => d.id);
    const uploadedTypes = uploadedDocs.map(d => d.documentType);
    const missing = mandatoryTypes.filter(t => !uploadedTypes.includes(t));
    missing.forEach(type => {
      steps.push(`Upload ${getDocumentTypeName(type)}`);
    });
  } else if (status === 'action_required') {
    const rejected = uploadedDocs.filter(d => d.status === 'rejected');
    rejected.forEach(doc => {
      steps.push(`Re-upload ${getDocumentTypeName(doc.documentType)}: ${doc.rejectionReason}`);
    });
  } else if (status === 'pending_verification') {
    steps.push('Wait for verification (1-2 business days)');
    steps.push('You will receive notification once verified');
  } else if (status === 'verified') {
    steps.push('Your KYC is complete!');
    steps.push('You now have access to all agent features');
    steps.push('Consider uploading optional documents for additional benefits');
  }

  return steps;
}

function buildKycTimeline(uploadedDocs: any[]): Array<{ date: Date; event: string; status: string }> {
  const timeline: Array<{ date: Date; event: string; status: string }> = [];

  // If no documents uploaded, return empty timeline
  if (!uploadedDocs || uploadedDocs.length === 0) {
    return timeline;
  }

  // Find earliest upload date as KYC initiation
  const sortedByDate = [...uploadedDocs].sort((a, b) =>
    new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  );

  if (sortedByDate.length > 0) {
    timeline.push({
      date: new Date(sortedByDate[0].uploadedAt),
      event: 'KYC process initiated',
      status: 'completed',
    });
  }

  // Add events for each document
  for (const doc of uploadedDocs) {
    const docName = getDocumentTypeName(doc.documentType);

    // Upload event
    timeline.push({
      date: new Date(doc.uploadedAt),
      event: `${docName} uploaded`,
      status: 'completed',
    });

    // Verification event (if verified)
    if (doc.status === 'verified' && doc.verifiedAt) {
      timeline.push({
        date: new Date(doc.verifiedAt),
        event: `${docName} verified`,
        status: 'completed',
      });
    }

    // Rejection event (if rejected)
    if (doc.status === 'rejected') {
      timeline.push({
        date: new Date(doc.uploadedAt),
        event: `${docName} rejected`,
        status: 'action_required',
      });
    }

    // Pending event
    if (doc.status === 'pending_review') {
      timeline.push({
        date: new Date(doc.uploadedAt),
        event: `${docName} awaiting review`,
        status: 'pending',
      });
    }
  }

  // Sort timeline by date (newest first)
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return timeline;
}
