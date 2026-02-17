/**
 * Lead Assignment Service
 *
 * Handles intelligent lead assignment with skill matching and workload balancing
 */
import { db } from '../db';
import { eq, and, desc, sql, inArray, isNull, or } from 'drizzle-orm';
import { users, leads, operationsTeam } from '@shared/schema';
import { logger } from '../logger';

// Types
interface AssignmentCandidate {
  userId: number;
  fullName: string;
  role: string;
  department: string | null;
  skills: string[];
  currentWorkload: number;
  maxWorkload: number;
  isAvailable: boolean;
  matchScore: number;
}

interface AssignmentResult {
  success: boolean;
  assignedTo?: number;
  assignedToName?: string;
  matchScore?: number;
  reason?: string;
}

interface AssignmentRules {
  preferSameCategory: boolean;
  balanceWorkload: boolean;
  respectCapacity: boolean;
  allowOverload: boolean;
  overloadThreshold: number; // percentage above max workload allowed
}

const DEFAULT_RULES: AssignmentRules = {
  preferSameCategory: true,
  balanceWorkload: true,
  respectCapacity: true,
  allowOverload: false,
  overloadThreshold: 20, // 20% overload allowed if enabled
};

class LeadAssignmentService {
  /**
   * Auto-assign a lead to the best available executive
   */
  async autoAssign(
    leadId: number,
    options?: {
      serviceCategory?: string;
      priority?: string;
      rules?: Partial<AssignmentRules>;
    }
  ): Promise<AssignmentResult> {
    const rules = { ...DEFAULT_RULES, ...options?.rules };

    try {
      // Get lead details
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead) {
        return { success: false, reason: 'Lead not found' };
      }

      // Get available sales executives
      const candidates = await this.getAvailableCandidates(
        options?.serviceCategory || lead.serviceInterested || undefined,
        rules
      );

      if (candidates.length === 0) {
        return { success: false, reason: 'No available executives found' };
      }

      // Calculate scores and rank candidates
      const scoredCandidates = this.scoreCandidates(
        candidates,
        {
          serviceCategory: options?.serviceCategory || lead.serviceInterested || undefined,
          priority: options?.priority || lead.priority || 'medium',
          leadSource: lead.leadSource || undefined,
        },
        rules
      );

      // Get the best candidate
      const bestCandidate = scoredCandidates[0];

      if (!bestCandidate) {
        return { success: false, reason: 'No suitable executive found' };
      }

      // Assign the lead
      await db
        .update(leads)
        .set({
          assignedTo: bestCandidate.userId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      // Update workload
      await this.incrementWorkload(bestCandidate.userId);

      logger.info(`Lead ${lead.leadId} auto-assigned to ${bestCandidate.fullName} (score: ${bestCandidate.matchScore})`);

      return {
        success: true,
        assignedTo: bestCandidate.userId,
        assignedToName: bestCandidate.fullName,
        matchScore: bestCandidate.matchScore,
      };

    } catch (error: any) {
      logger.error('Auto-assign lead error:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Manual assignment of a lead
   */
  async manualAssign(
    leadId: number,
    assignToUserId: number,
    assignedByUserId: number,
    notes?: string
  ): Promise<AssignmentResult> {
    try {
      // Verify lead exists
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead) {
        return { success: false, reason: 'Lead not found' };
      }

      // Verify assignee exists and is active
      const [assignee] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, assignToUserId),
            eq(users.isActive, true)
          )
        )
        .limit(1);

      if (!assignee) {
        return { success: false, reason: 'Assignee not found or inactive' };
      }

      // Get previous assignee for workload update
      const previousAssigneeId = lead.assignedTo || null;

      // Update lead assignment
      await db
        .update(leads)
        .set({
          assignedTo: assignToUserId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      // Update workloads
      if (previousAssigneeId && previousAssigneeId !== assignToUserId) {
        await this.decrementWorkload(previousAssigneeId);
      }
      await this.incrementWorkload(assignToUserId);

      logger.info(`Lead ${lead.leadId} manually assigned to ${assignee.fullName} by user ${assignedByUserId}${notes ? `: ${notes}` : ''}`);

      return {
        success: true,
        assignedTo: assignToUserId,
        assignedToName: assignee.fullName || `User ${assignToUserId}`,
      };

    } catch (error: any) {
      logger.error('Manual assign lead error:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Reassign a lead to another executive
   */
  async reassign(
    leadId: number,
    newAssigneeId: number,
    reassignedByUserId: number,
    reason: string
  ): Promise<AssignmentResult> {
    return this.manualAssign(leadId, newAssigneeId, reassignedByUserId, `Reassigned: ${reason}`);
  }

  /**
   * Get available candidates for assignment
   */
  private async getAvailableCandidates(
    serviceCategory?: string,
    rules?: AssignmentRules
  ): Promise<AssignmentCandidate[]> {
    // Get all active sales staff
    const salesStaff = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
        department: users.department,
        skills: operationsTeam.specializations,
        currentWorkload: operationsTeam.currentWorkload,
        maxWorkload: operationsTeam.maxWorkload,
        isAvailable: operationsTeam.isAvailable,
      })
      .from(users)
      .leftJoin(operationsTeam, eq(operationsTeam.userId, users.id))
      .where(
        and(
          eq(users.isActive, true),
          or(
            eq(users.role, 'sales_executive'),
            eq(users.role, 'sales_manager'),
            eq(users.role, 'customer_service')
          )
        )
      );

    return salesStaff
      .filter((staff) => {
        // Filter by availability
        if (staff.isAvailable === false) return false;

        // Filter by capacity if rules require
        if (rules?.respectCapacity) {
          const currentWorkload = staff.currentWorkload || 0;
          const maxWorkload = staff.maxWorkload || 20; // Default 20 leads max

          if (rules.allowOverload) {
            const threshold = maxWorkload * (1 + (rules.overloadThreshold || 20) / 100);
            if (currentWorkload >= threshold) return false;
          } else {
            if (currentWorkload >= maxWorkload) return false;
          }
        }

        return true;
      })
      .map((staff) => ({
        userId: staff.id,
        fullName: staff.fullName || `User ${staff.id}`,
        role: staff.role || 'sales_executive',
        department: staff.department,
        skills: (staff.skills as string[]) || [],
        currentWorkload: staff.currentWorkload || 0,
        maxWorkload: staff.maxWorkload || 20,
        isAvailable: staff.isAvailable !== false,
        matchScore: 0,
      }));
  }

  /**
   * Score candidates based on matching criteria
   */
  private scoreCandidates(
    candidates: AssignmentCandidate[],
    criteria: {
      serviceCategory?: string;
      priority?: string;
      leadSource?: string;
    },
    rules: AssignmentRules
  ): AssignmentCandidate[] {
    return candidates
      .map((candidate) => {
        let score = 50; // Base score

        // Skill match bonus (up to +30 points)
        if (criteria.serviceCategory && candidate.skills.length > 0) {
          const categoryLower = criteria.serviceCategory.toLowerCase();
          const hasSkillMatch = candidate.skills.some(
            (skill) => skill.toLowerCase().includes(categoryLower) ||
              categoryLower.includes(skill.toLowerCase())
          );

          if (hasSkillMatch) {
            score += 30;
          }
        }

        // Workload balance bonus (up to +20 points)
        if (rules.balanceWorkload && candidate.maxWorkload > 0) {
          const utilizationRate = candidate.currentWorkload / candidate.maxWorkload;
          // Prefer executives with lower utilization
          score += Math.round((1 - utilizationRate) * 20);
        }

        // Role bonus
        if (criteria.priority === 'urgent' || criteria.priority === 'high') {
          // High priority leads prefer senior staff
          if (candidate.role === 'sales_manager') {
            score += 10;
          }
        } else {
          // Normal leads prefer balanced distribution to executives
          if (candidate.role === 'sales_executive') {
            score += 5;
          }
        }

        // Department match bonus
        if (criteria.serviceCategory && candidate.department) {
          const deptLower = candidate.department.toLowerCase();
          const categoryLower = criteria.serviceCategory.toLowerCase();
          if (
            deptLower.includes(categoryLower) ||
            categoryLower.includes(deptLower)
          ) {
            score += 10;
          }
        }

        return {
          ...candidate,
          matchScore: Math.min(100, score),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Increment user's workload count
   */
  private async incrementWorkload(userId: number): Promise<void> {
    await db
      .update(operationsTeam)
      .set({
        currentWorkload: sql`COALESCE(current_workload, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(operationsTeam.userId, userId));
  }

  /**
   * Decrement user's workload count
   */
  private async decrementWorkload(userId: number): Promise<void> {
    await db
      .update(operationsTeam)
      .set({
        currentWorkload: sql`GREATEST(COALESCE(current_workload, 0) - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(operationsTeam.userId, userId));
  }

  /**
   * Get workload summary for all executives
   */
  async getWorkloadSummary(): Promise<{
    executives: Array<{
      userId: number;
      name: string;
      role: string;
      currentWorkload: number;
      maxWorkload: number;
      utilizationPercent: number;
      isAvailable: boolean;
    }>;
    summary: {
      totalExecutives: number;
      availableExecutives: number;
      totalCapacity: number;
      currentLoad: number;
      overallUtilization: number;
    };
  }> {
    const staff = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
        currentWorkload: operationsTeam.currentWorkload,
        maxWorkload: operationsTeam.maxWorkload,
        isAvailable: operationsTeam.isAvailable,
      })
      .from(users)
      .leftJoin(operationsTeam, eq(operationsTeam.userId, users.id))
      .where(
        and(
          eq(users.isActive, true),
          or(
            eq(users.role, 'sales_executive'),
            eq(users.role, 'sales_manager'),
            eq(users.role, 'customer_service')
          )
        )
      );

    const executives = staff.map((s) => {
      const current = s.currentWorkload || 0;
      const max = s.maxWorkload || 20;
      return {
        userId: s.id,
        name: s.fullName || `User ${s.id}`,
        role: s.role || 'sales_executive',
        currentWorkload: current,
        maxWorkload: max,
        utilizationPercent: max > 0 ? Math.round((current / max) * 100) : 0,
        isAvailable: s.isAvailable !== false,
      };
    });

    const available = executives.filter((e) => e.isAvailable);
    const totalCapacity = executives.reduce((sum, e) => sum + e.maxWorkload, 0);
    const currentLoad = executives.reduce((sum, e) => sum + e.currentWorkload, 0);

    return {
      executives,
      summary: {
        totalExecutives: executives.length,
        availableExecutives: available.length,
        totalCapacity,
        currentLoad,
        overallUtilization: totalCapacity > 0 ? Math.round((currentLoad / totalCapacity) * 100) : 0,
      },
    };
  }

  /**
   * Bulk auto-assign unassigned leads
   */
  async bulkAutoAssign(
    leadIds?: number[],
    rules?: Partial<AssignmentRules>
  ): Promise<{
    total: number;
    assigned: number;
    failed: number;
    results: Array<{ leadId: number; success: boolean; assignedTo?: number; reason?: string }>;
  }> {
    // Get unassigned leads
    let unassignedLeads;
    if (leadIds && leadIds.length > 0) {
      unassignedLeads = await db
        .select()
        .from(leads)
        .where(inArray(leads.id, leadIds));
    } else {
      unassignedLeads = await db
        .select()
        .from(leads)
        .where(isNull(leads.assignedTo))
        .limit(100); // Process max 100 at a time
    }

    const results: Array<{ leadId: number; success: boolean; assignedTo?: number; reason?: string }> = [];

    for (const lead of unassignedLeads) {
      const result = await this.autoAssign(lead.id, {
        serviceCategory: lead.serviceInterested || undefined,
        priority: lead.priority || undefined,
        rules,
      });

      results.push({
        leadId: lead.id,
        success: result.success,
        assignedTo: result.assignedTo,
        reason: result.reason,
      });
    }

    const assigned = results.filter((r) => r.success).length;

    return {
      total: results.length,
      assigned,
      failed: results.length - assigned,
      results,
    };
  }

  /**
   * Round-robin assignment for even distribution
   */
  async roundRobinAssign(leadId: number): Promise<AssignmentResult> {
    try {
      // Get the last assigned executive
      const [lastAssigned] = await db
        .select({ assignedTo: leads.assignedTo })
        .from(leads)
        .where(sql`assigned_to IS NOT NULL`)
        .orderBy(desc(leads.updatedAt))
        .limit(1);

      const lastAssignedId = lastAssigned?.assignedTo || 0;

      // Get available executives sorted by ID
      const candidates = await this.getAvailableCandidates();

      if (candidates.length === 0) {
        return { success: false, reason: 'No available executives' };
      }

      // Find next executive after last assigned (round-robin)
      const sortedCandidates = candidates.sort((a, b) => a.userId - b.userId);
      let nextCandidate = sortedCandidates.find((c) => c.userId > lastAssignedId);

      // If no one found after last, wrap around to first
      if (!nextCandidate) {
        nextCandidate = sortedCandidates[0];
      }

      // Get lead
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead) {
        return { success: false, reason: 'Lead not found' };
      }

      // Assign
      await db
        .update(leads)
        .set({
          assignedTo: nextCandidate.userId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      await this.incrementWorkload(nextCandidate.userId);

      logger.info(`Lead ${lead.leadId} round-robin assigned to ${nextCandidate.fullName}`);

      return {
        success: true,
        assignedTo: nextCandidate.userId,
        assignedToName: nextCandidate.fullName,
      };

    } catch (error: any) {
      logger.error('Round-robin assign error:', error);
      return { success: false, reason: error.message };
    }
  }
}

export const leadAssignmentService = new LeadAssignmentService();
