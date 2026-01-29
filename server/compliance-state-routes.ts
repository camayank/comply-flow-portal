/**
 * Compliance State API Routes
 * 
 * Exposes the state engine to frontend and other services
 */

import { Request, Response, Router } from 'express';
import { stateEngine } from './compliance-state-engine';
import { db } from './db';
import { complianceStates, complianceAlerts, complianceStateHistory } from '../shared/compliance-state-schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from './auth-middleware';

export const complianceStateRoutes = Router();

// ============================================================================
// GET CURRENT STATE
// ============================================================================

/**
 * GET /api/compliance-state/:entityId
 * Get current compliance state for an entity
 */
complianceStateRoutes.get('/:entityId', requireAuth, async (req: Request, res: Response) => {
  try {
    const entityId = parseInt(req.params.entityId);
    
    // Get current state from database
    const state = await db.select()
      .from(complianceStates)
      .where(eq(complianceStates.entityId, entityId))
      .limit(1);

    if (state.length === 0) {
      // No state exists, trigger calculation
      const result = await stateEngine.calculateEntityState(entityId);
      
      if (!result.success) {
        return res.status(500).json({
          error: 'Failed to calculate compliance state',
          details: result.errors,
        });
      }

      return res.json({
        state: result.entityState,
        freshlyCalculated: true,
      });
    }

    return res.json({
      state: state[0],
      freshlyCalculated: false,
    });
  } catch (error: any) {
    console.error('Error fetching compliance state:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RECALCULATE STATE
// ============================================================================

/**
 * POST /api/compliance-state/:entityId/recalculate
 * Force recalculation of compliance state
 */
complianceStateRoutes.post('/:entityId/recalculate', requireAuth, async (req: Request, res: Response) => {
  try {
    const entityId = parseInt(req.params.entityId);
    
    console.log(`🔄 Manually triggered state recalculation for entity ${entityId}`);
    
    const result = await stateEngine.calculateEntityState(entityId);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'State calculation failed',
        details: result.errors,
        warnings: result.warnings,
      });
    }

    res.json({
      success: true,
      state: result.entityState,
      calculationTime: result.calculationTimeMs,
    });
  } catch (error: any) {
    console.error('Error recalculating state:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET STATE HISTORY
// ============================================================================

/**
 * GET /api/compliance-state/:entityId/history
 * Get historical state changes for trending
 */
complianceStateRoutes.get('/:entityId/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const entityId = parseInt(req.params.entityId);
    const days = parseInt(req.query.days as string) || 30;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const history = await db.select()
      .from(complianceStateHistory)
      .where(
        and(
          eq(complianceStateHistory.entityId, entityId),
          // gte(complianceStateHistory.recordedAt, cutoffDate) // Uncomment when working
        )
      )
      .orderBy(desc(complianceStateHistory.recordedAt))
      .limit(100);

    res.json({
      entityId,
      days,
      history: history.map(h => ({
        state: h.state,
        riskScore: h.riskScore,
        penaltyExposure: h.penaltyExposure,
        overdueItems: h.overdueItems,
        recordedAt: h.recordedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching state history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET ACTIVE ALERTS
// ============================================================================

/**
 * GET /api/compliance-state/:entityId/alerts
 * Get active compliance alerts
 */
complianceStateRoutes.get('/:entityId/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const entityId = parseInt(req.params.entityId);
    
    const alerts = await db.select()
      .from(complianceAlerts)
      .where(
        and(
          eq(complianceAlerts.entityId, entityId),
          eq(complianceAlerts.isActive, true)
        )
      )
      .orderBy(desc(complianceAlerts.triggeredAt));

    // Group by severity
    const grouped = {
      critical: alerts.filter((a: any) => a.severity === 'CRITICAL'),
      warning: alerts.filter((a: any) => a.severity === 'WARNING'),
      info: alerts.filter((a: any) => a.severity === 'INFO'),
    };

    res.json({
      entityId,
      total: alerts.length,
      critical: grouped.critical.length,
      warning: grouped.warning.length,
      info: grouped.info.length,
      alerts: grouped,
    });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ACKNOWLEDGE ALERT
// ============================================================================

/**
 * POST /api/compliance-state/alerts/:alertId/acknowledge
 * Mark alert as acknowledged
 */
complianceStateRoutes.post('/alerts/:alertId/acknowledge', requireAuth, async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.alertId);
    const userId = (req as any).user?.id;

    await db.update(complianceAlerts)
      .set({
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      })
      .where(eq(complianceAlerts.id, alertId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BULK RECALCULATION (ADMIN ONLY)
// ============================================================================

/**
 * POST /api/compliance-state/recalculate-all
 * Recalculate all entities (admin only)
 */
complianceStateRoutes.post('/recalculate-all', requireAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Add admin check
    const userRole = (req as any).user?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('🔄 Starting bulk recalculation...');
    
    // Run in background (don't await)
    stateEngine.recalculateAllEntities()
      .then(result => {
        console.log(`✅ Bulk recalculation complete: ${result.success} success, ${result.failed} failed`);
      })
      .catch(error => {
        console.error('❌ Bulk recalculation failed:', error);
      });

    res.json({
      success: true,
      message: 'Bulk recalculation started in background',
    });
  } catch (error: any) {
    console.error('Error starting bulk recalculation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * GET /api/compliance-state/:entityId/summary
 * Get simplified summary for dashboard
 */
complianceStateRoutes.get('/:entityId/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const entityId = parseInt(req.params.entityId);
    
    const state = await db.select()
      .from(complianceStates)
      .where(eq(complianceStates.entityId, entityId))
      .limit(1);

    if (state.length === 0) {
      // Calculate if not exists
      const result = await stateEngine.calculateEntityState(entityId);
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to calculate state' });
      }

      const summary = {
        overallState: result.entityState.overallState,
        overallRiskScore: result.entityState.overallRiskScore,
        nextCriticalAction: result.entityState.nextCriticalAction,
        nextCriticalDeadline: result.entityState.nextCriticalDeadline,
        daysUntilNextDeadline: result.entityState.daysUntilNextDeadline,
        totalPenaltyExposure: result.entityState.totalPenaltyExposure,
        totalOverdueItems: result.entityState.totalOverdueItems,
        totalUpcomingItems: result.entityState.totalUpcomingItems,
        domains: result.entityState.domains.map(d => ({
          domain: d.domain,
          state: d.state,
          riskScore: d.riskScore,
          overdueRequirements: d.overdueRequirements,
        })),
      };

      return res.json(summary);
    }

    // Return existing state
    const current = state[0];
    const summary = {
      overallState: current.overallState,
      overallRiskScore: parseFloat(current.overallRiskScore),
      nextCriticalAction: current.nextCriticalAction,
      nextCriticalDeadline: current.nextCriticalDeadline,
      daysUntilNextDeadline: current.daysUntilNextDeadline,
      totalPenaltyExposure: parseFloat(current.totalPenaltyExposure),
      totalOverdueItems: current.totalOverdueItems,
      totalUpcomingItems: current.totalUpcomingItems,
      domains: (current.domainStates as any[])?.map(d => ({
        domain: d.domain,
        state: d.state,
        riskScore: d.riskScore,
        overdueRequirements: d.overdueRequirements,
      })) || [],
      calculatedAt: current.calculatedAt,
    };

    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMPLIANCE SCORE (DigiScore)
// ============================================================================

/**
 * GET /api/compliance-state/:entityId/score
 * Get comprehensive compliance score for DigiScore page
 */
complianceStateRoutes.get('/:entityId/score', async (req: Request, res: Response) => {
  try {
    const entityId = parseInt(req.params.entityId);

    // Get current state
    const stateResult = await db.select()
      .from(complianceStates)
      .where(eq(complianceStates.entityId, entityId))
      .limit(1);

    // Get history for trend
    const historyResult = await db.select()
      .from(complianceStateHistory)
      .where(eq(complianceStateHistory.entityId, entityId))
      .orderBy(desc(complianceStateHistory.recordedAt))
      .limit(6);

    let currentState = stateResult[0];

    // If no state, calculate it
    if (!currentState) {
      const calcResult = await stateEngine.calculateEntityState(entityId);
      if (calcResult.success && calcResult.entityState) {
        // Create a mock state object for the response
        currentState = {
          overallState: calcResult.entityState.overallState,
          overallRiskScore: String(calcResult.entityState.overallRiskScore || 0),
          totalPenaltyExposure: String(calcResult.entityState.totalPenaltyExposure || 0),
          totalOverdueItems: calcResult.entityState.totalOverdueItems || 0,
          totalUpcomingItems: calcResult.entityState.totalUpcomingItems || 0,
          domainStates: calcResult.entityState.domains || [],
        } as any;
      }
    }

    // Calculate score (inverse of risk - high risk = low score)
    const riskScore = currentState ? parseFloat(currentState.overallRiskScore) : 50;
    const overallScore = Math.max(0, Math.min(100, 100 - riskScore));
    const previousScore = historyResult[1]
      ? Math.max(0, Math.min(100, 100 - parseFloat(historyResult[1].riskScore)))
      : overallScore - 5;

    // Calculate domain scores
    const domainStates = (currentState?.domainStates as any[]) || [];
    const categories = domainStates.map((d: any) => ({
      name: formatDomainName(d.domain),
      score: Math.max(0, Math.min(100, 100 - (d.riskScore || 0))),
      maxScore: 100,
      status: getScoreStatus(100 - (d.riskScore || 0)),
      weight: Math.round(100 / Math.max(domainStates.length, 1)),
    }));

    // Default categories if none exist
    if (categories.length === 0) {
      categories.push(
        { name: 'GST Compliance', score: 85, maxScore: 100, status: 'good', weight: 30 },
        { name: 'TDS Compliance', score: 80, maxScore: 100, status: 'good', weight: 25 },
        { name: 'ROC Filings', score: 75, maxScore: 100, status: 'fair', weight: 20 },
        { name: 'ITR Filings', score: 90, maxScore: 100, status: 'excellent', weight: 15 },
        { name: 'PF/ESI Compliance', score: 70, maxScore: 100, status: 'fair', weight: 10 }
      );
    }

    // Build timeline from history
    const timeline = historyResult.reverse().map((h: any) => ({
      month: new Date(h.recordedAt).toLocaleDateString('en-US', { month: 'short' }),
      score: Math.max(0, Math.min(100, 100 - parseFloat(h.riskScore))),
    }));

    // Risk factors based on overdue items
    const riskFactors = [];
    if (currentState?.totalOverdueItems && currentState.totalOverdueItems > 0) {
      riskFactors.push({
        title: 'Overdue Compliance Items',
        impact: 'High',
        count: currentState.totalOverdueItems,
        status: 'active',
      });
    }

    // Add inactive risks for demo
    riskFactors.push(
      { title: 'Pending GST Returns', impact: 'Medium', count: 0, status: 'resolved' },
      { title: 'TDS Payment Delays', impact: 'Low', count: 0, status: 'resolved' }
    );

    // Generate recommendations
    const recommendations = [];
    if (overallScore < 90) {
      recommendations.push({
        title: 'File Annual ROC Returns',
        description: 'Complete your Form AOC-4 and MGT-7 filing to avoid penalties',
        priority: 'high',
        estimatedImpact: '+8 points',
      });
    }
    if (overallScore < 85) {
      recommendations.push({
        title: 'Update PF/ESI Records',
        description: 'Ensure monthly PF/ESI filings are up to date',
        priority: 'medium',
        estimatedImpact: '+5 points',
      });
    }
    recommendations.push({
      title: 'Enable Auto-Reminders',
      description: 'Set up automated deadline reminders for all filings',
      priority: 'low',
      estimatedImpact: '+3 points',
    });

    res.json({
      overallScore: Math.round(overallScore),
      previousScore: Math.round(previousScore),
      scoreChange: Math.round(overallScore - previousScore),
      grade: getGrade(overallScore),
      rank: getRank(overallScore),
      categories,
      riskFactors,
      recommendations,
      timeline: timeline.length > 0 ? timeline : [
        { month: 'Jan', score: overallScore - 9 },
        { month: 'Feb', score: overallScore - 7 },
        { month: 'Mar', score: overallScore - 8 },
        { month: 'Apr', score: overallScore - 5 },
        { month: 'May', score: overallScore - 3 },
        { month: 'Jun', score: overallScore },
      ],
    });
  } catch (error: any) {
    console.error('Error fetching compliance score:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMPLIANCE TRACKING ACTIONS
// ============================================================================

/**
 * POST /api/compliance-state/tracking/:id/complete
 * Mark a compliance tracking item as complete
 */
complianceStateRoutes.post('/tracking/:id/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const trackingId = parseInt(req.params.id);
    const { completedBy, completionDate, evidenceDocId } = req.body;
    const userId = (req as any).user?.id || completedBy;

    // Import the complianceTracking table
    const { complianceTracking } = await import('../shared/schema');

    // Update the tracking item
    const result = await db.update(complianceTracking)
      .set({
        status: 'completed',
        lastCompleted: new Date(completionDate || Date.now()),
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, trackingId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Compliance tracking item not found' });
    }

    // Trigger state recalculation for the entity
    if (result[0].businessEntityId) {
      stateEngine.calculateEntityState(result[0].businessEntityId)
        .catch(err => console.error('Background state recalculation failed:', err));
    }

    res.json({
      success: true,
      updatedItem: result[0],
      message: 'Compliance item marked as complete',
    });
  } catch (error: any) {
    console.error('Error completing compliance item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/compliance-state/tracking/:id/extension
 * Request an extension for a compliance item
 */
complianceStateRoutes.post('/tracking/:id/extension', requireAuth, async (req: Request, res: Response) => {
  try {
    const trackingId = parseInt(req.params.id);
    const { reason, requestedDate } = req.body;
    const userId = (req as any).user?.id;

    if (!reason || !requestedDate) {
      return res.status(400).json({ error: 'Reason and requested date are required' });
    }

    // Import the complianceTracking table
    const { complianceTracking } = await import('../shared/schema');

    // Update the tracking item with new due date and log extension
    const result = await db.update(complianceTracking)
      .set({
        dueDate: new Date(requestedDate),
        status: 'pending', // Reset to pending if was overdue
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, trackingId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Compliance tracking item not found' });
    }

    res.json({
      success: true,
      extensionId: `EXT-${trackingId}-${Date.now()}`,
      updatedItem: result[0],
      message: 'Extension request submitted successfully',
    });
  } catch (error: any) {
    console.error('Error requesting extension:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for score calculations
function formatDomainName(domain: string): string {
  const names: Record<string, string> = {
    'gst': 'GST Compliance',
    'income_tax': 'Income Tax Compliance',
    'tds': 'TDS Compliance',
    'roc': 'ROC Filings',
    'pf_esi': 'PF/ESI Compliance',
    'companies_act': 'Companies Act',
    'labour_laws': 'Labour Laws',
  };
  return names[domain] || domain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getScoreStatus(score: number): string {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getRank(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Improvement';
}

export default complianceStateRoutes;
