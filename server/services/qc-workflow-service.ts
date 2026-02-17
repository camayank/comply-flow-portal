/**
 * QC Workflow Service
 *
 * Handles checklist-based quality review workflow and handoff with signature capture
 */
import { db } from '../db';
import { eq, and, desc, sql, inArray, isNull } from 'drizzle-orm';
import {
  qualityReviews,
  qualityChecklists,
  deliveryConfirmations,
  serviceRequests,
  businessEntities,
  services,
  users,
  notifications,
  QC_REVIEW_STATUS,
  DELIVERY_STATUS,
} from '@shared/schema';
import { logger } from '../logger';

// Types
interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  description?: string;
  status: 'pending' | 'passed' | 'failed' | 'na';
  isMandatory: boolean;
  weight: number;
  notes?: string;
  checkedAt?: Date;
  checkedBy?: number;
}

interface ReviewChecklist {
  items: ChecklistItem[];
  approvalThreshold: number;
  escalationThreshold: number;
  totalScore: number;
  mandatoryPassed: boolean;
}

interface HandoffDocument {
  serviceRequestId: number;
  qualityReviewId: number;
  clientName: string;
  serviceName: string;
  completionDate: string;
  qcApprovalDate: string;
  qualityScore: number;
  deliverables: DeliverableItem[];
  keyHighlights: string[];
  nextSteps?: string[];
  signatureRequired: boolean;
  handoffNotes?: string;
  preparedBy: string;
  approvedBy: string;
}

interface DeliverableItem {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'certificate' | 'registration' | 'filing' | 'other';
  fileUrl?: string;
  referenceNumber?: string;
  issuedDate?: string;
  validUntil?: string;
}

interface SignatureData {
  signatureImage: string; // Base64 encoded signature
  signedAt: Date;
  signedBy: string;
  ipAddress?: string;
  deviceInfo?: string;
  verificationCode?: string;
}

interface QCWorkflowResult {
  success: boolean;
  reviewId?: number;
  status?: string;
  message?: string;
  error?: string;
}

interface HandoffResult {
  success: boolean;
  deliveryConfirmationId?: number;
  handoffDocument?: HandoffDocument;
  error?: string;
}

// Default checklist templates by service type
const DEFAULT_CHECKLISTS: Record<string, ChecklistItem[]> = {
  incorporation: [
    { id: 'inc_01', category: 'Documentation', item: 'All incorporation documents are complete', isMandatory: true, weight: 20, status: 'pending' },
    { id: 'inc_02', category: 'Documentation', item: 'MOA/AOA reviewed and correct', isMandatory: true, weight: 15, status: 'pending' },
    { id: 'inc_03', category: 'Compliance', item: 'Director KYC documents verified', isMandatory: true, weight: 15, status: 'pending' },
    { id: 'inc_04', category: 'Compliance', item: 'Registered office address proof verified', isMandatory: true, weight: 10, status: 'pending' },
    { id: 'inc_05', category: 'Quality', item: 'Company name as per approval', isMandatory: true, weight: 10, status: 'pending' },
    { id: 'inc_06', category: 'Quality', item: 'Share capital correctly stated', isMandatory: true, weight: 10, status: 'pending' },
    { id: 'inc_07', category: 'Process', item: 'Filing acknowledgment received', isMandatory: true, weight: 10, status: 'pending' },
    { id: 'inc_08', category: 'Presentation', item: 'Certificate formatting is professional', isMandatory: false, weight: 5, status: 'pending' },
    { id: 'inc_09', category: 'Process', item: 'Timeline met as per SLA', isMandatory: false, weight: 5, status: 'pending' },
  ],
  gst_registration: [
    { id: 'gst_01', category: 'Documentation', item: 'GST application form complete', isMandatory: true, weight: 20, status: 'pending' },
    { id: 'gst_02', category: 'Documentation', item: 'PAN card copy attached', isMandatory: true, weight: 15, status: 'pending' },
    { id: 'gst_03', category: 'Documentation', item: 'Business address proof verified', isMandatory: true, weight: 15, status: 'pending' },
    { id: 'gst_04', category: 'Compliance', item: 'Authorized signatory details correct', isMandatory: true, weight: 15, status: 'pending' },
    { id: 'gst_05', category: 'Quality', item: 'Business category correctly classified', isMandatory: true, weight: 10, status: 'pending' },
    { id: 'gst_06', category: 'Process', item: 'ARN received from portal', isMandatory: true, weight: 15, status: 'pending' },
    { id: 'gst_07', category: 'Presentation', item: 'Registration certificate attached', isMandatory: false, weight: 5, status: 'pending' },
    { id: 'gst_08', category: 'Process', item: 'Timeline met as per SLA', isMandatory: false, weight: 5, status: 'pending' },
  ],
  default: [
    { id: 'def_01', category: 'Documentation', item: 'All required documents are complete', isMandatory: true, weight: 20, status: 'pending' },
    { id: 'def_02', category: 'Compliance', item: 'Service meets legal requirements', isMandatory: true, weight: 25, status: 'pending' },
    { id: 'def_03', category: 'Quality', item: 'All data entries are accurate', isMandatory: true, weight: 20, status: 'pending' },
    { id: 'def_04', category: 'Requirements', item: 'Client requirements fulfilled', isMandatory: true, weight: 15, status: 'pending' },
    { id: 'def_05', category: 'Presentation', item: 'Documents professionally formatted', isMandatory: false, weight: 10, status: 'pending' },
    { id: 'def_06', category: 'Process', item: 'Timeline met as per SLA', isMandatory: false, weight: 10, status: 'pending' },
  ],
};

class QCWorkflowService {
  /**
   * Initialize a QC review with checklist for a service request
   */
  async initializeReview(
    serviceRequestId: number,
    serviceType?: string,
    priority: string = 'medium'
  ): Promise<QCWorkflowResult> {
    try {
      // Check if review already exists
      const [existingReview] = await db
        .select()
        .from(qualityReviews)
        .where(eq(qualityReviews.serviceRequestId, serviceRequestId))
        .limit(1);

      if (existingReview) {
        return {
          success: true,
          reviewId: existingReview.id,
          status: existingReview.status || 'pending',
          message: 'Review already exists',
        };
      }

      // Get checklist for service type
      const checklist = await this.getChecklistForServiceType(serviceType || 'default');

      // Calculate SLA deadline based on priority
      const slaDays = priority === 'urgent' ? 1 : priority === 'high' ? 2 : 3;
      const slaDeadline = new Date();
      slaDeadline.setDate(slaDeadline.getDate() + slaDays);

      // Create QC review
      const [review] = await db
        .insert(qualityReviews)
        .values({
          serviceRequestId,
          status: QC_REVIEW_STATUS.PENDING,
          priority,
          checklist: checklist.items,
          slaDeadline,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update service request status
      await db
        .update(serviceRequests)
        .set({
          status: 'qc_review',
          updatedAt: new Date(),
        })
        .where(eq(serviceRequests.id, serviceRequestId));

      logger.info(`QC review initialized for service request ${serviceRequestId}`);

      return {
        success: true,
        reviewId: review.id,
        status: review.status || 'pending',
        message: 'QC review initialized successfully',
      };
    } catch (error: any) {
      logger.error('Initialize QC review error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get checklist template for a service type
   */
  async getChecklistForServiceType(serviceType: string): Promise<ReviewChecklist> {
    try {
      // Try to get custom checklist from database
      const [customChecklist] = await db
        .select()
        .from(qualityChecklists)
        .where(
          and(
            eq(qualityChecklists.serviceType, serviceType),
            eq(qualityChecklists.isActive, true),
            eq(qualityChecklists.isDefault, true)
          )
        )
        .limit(1);

      if (customChecklist) {
        return {
          items: customChecklist.checklistItems as ChecklistItem[],
          approvalThreshold: customChecklist.approvalThreshold || 80,
          escalationThreshold: customChecklist.escalationThreshold || 60,
          totalScore: 0,
          mandatoryPassed: false,
        };
      }

      // Use default checklist
      const items = DEFAULT_CHECKLISTS[serviceType] || DEFAULT_CHECKLISTS.default;

      return {
        items,
        approvalThreshold: 80,
        escalationThreshold: 60,
        totalScore: 0,
        mandatoryPassed: false,
      };
    } catch (error) {
      logger.error('Get checklist error:', error);
      return {
        items: DEFAULT_CHECKLISTS.default,
        approvalThreshold: 80,
        escalationThreshold: 60,
        totalScore: 0,
        mandatoryPassed: false,
      };
    }
  }

  /**
   * Update checklist item status
   */
  async updateChecklistItem(
    reviewId: number,
    itemId: string,
    status: 'passed' | 'failed' | 'na',
    notes?: string,
    reviewerId?: number
  ): Promise<QCWorkflowResult> {
    try {
      const [review] = await db
        .select()
        .from(qualityReviews)
        .where(eq(qualityReviews.id, reviewId))
        .limit(1);

      if (!review) {
        return { success: false, error: 'Review not found' };
      }

      const checklist = (review.checklist as ChecklistItem[]) || [];
      const itemIndex = checklist.findIndex((item) => item.id === itemId);

      if (itemIndex === -1) {
        return { success: false, error: 'Checklist item not found' };
      }

      // Update item
      checklist[itemIndex] = {
        ...checklist[itemIndex],
        status,
        notes,
        checkedAt: new Date(),
        checkedBy: reviewerId,
      };

      // Update review
      await db
        .update(qualityReviews)
        .set({
          checklist,
          updatedAt: new Date(),
        })
        .where(eq(qualityReviews.id, reviewId));

      return { success: true, message: 'Checklist item updated' };
    } catch (error: any) {
      logger.error('Update checklist item error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate review score from checklist
   */
  calculateChecklistScore(checklist: ChecklistItem[]): ReviewChecklist {
    let totalWeight = 0;
    let passedWeight = 0;
    let mandatoryPassed = true;

    for (const item of checklist) {
      if (item.status === 'na') continue; // Skip N/A items
      totalWeight += item.weight;

      if (item.status === 'passed') {
        passedWeight += item.weight;
      } else if (item.isMandatory && item.status !== 'passed') {
        mandatoryPassed = false;
      }
    }

    const totalScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

    return {
      items: checklist,
      approvalThreshold: 80,
      escalationThreshold: 60,
      totalScore,
      mandatoryPassed,
    };
  }

  /**
   * Complete QC review with final decision
   */
  async completeReview(
    reviewId: number,
    decision: 'approved' | 'rejected' | 'rework_required',
    reviewerId: number,
    options?: {
      reviewNotes?: string;
      internalComments?: string;
      reworkInstructions?: string;
    }
  ): Promise<QCWorkflowResult> {
    try {
      const [review] = await db
        .select()
        .from(qualityReviews)
        .where(eq(qualityReviews.id, reviewId))
        .limit(1);

      if (!review) {
        return { success: false, error: 'Review not found' };
      }

      const checklist = (review.checklist as ChecklistItem[]) || [];
      const scoreResult = this.calculateChecklistScore(checklist);

      // Validate decision against checklist
      if (decision === 'approved' && !scoreResult.mandatoryPassed) {
        return {
          success: false,
          error: 'Cannot approve: mandatory checklist items have not passed',
        };
      }

      if (decision === 'approved' && scoreResult.totalScore < scoreResult.approvalThreshold) {
        return {
          success: false,
          error: `Cannot approve: score ${scoreResult.totalScore}% is below threshold ${scoreResult.approvalThreshold}%`,
        };
      }

      // Map decision to status
      const statusMap: Record<string, string> = {
        approved: QC_REVIEW_STATUS.APPROVED,
        rejected: QC_REVIEW_STATUS.REJECTED,
        rework_required: QC_REVIEW_STATUS.REWORK_REQUIRED,
      };

      // Update review
      await db
        .update(qualityReviews)
        .set({
          status: statusMap[decision],
          qualityScore: scoreResult.totalScore,
          reviewerId,
          reviewNotes: options?.reviewNotes,
          internalComments: options?.internalComments,
          reworkInstructions: decision === 'rework_required' ? options?.reworkInstructions : null,
          reviewCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(qualityReviews.id, reviewId));

      // Update service request status
      const newServiceStatus = decision === 'approved' ? 'ready_for_delivery' : 'in_progress';
      await db
        .update(serviceRequests)
        .set({
          status: newServiceStatus,
          updatedAt: new Date(),
        })
        .where(eq(serviceRequests.id, review.serviceRequestId));

      // Send notifications
      if (decision === 'rework_required') {
        const [sr] = await db
          .select({ assignedTeamMember: serviceRequests.assignedTeamMember })
          .from(serviceRequests)
          .where(eq(serviceRequests.id, review.serviceRequestId))
          .limit(1);

        if (sr?.assignedTeamMember) {
          await db.insert(notifications).values({
            userId: sr.assignedTeamMember,
            title: 'QC Review: Rework Required',
            message: options?.reworkInstructions || 'Service requires rework. Please review QC feedback.',
            type: 'qc_rework',
            category: 'service',
            priority: 'high',
            actionUrl: `/ops/service-requests/${review.serviceRequestId}`,
            actionText: 'View Details',
          });
        }
      }

      logger.info(`QC review ${reviewId} completed: ${decision} (score: ${scoreResult.totalScore}%)`);

      return {
        success: true,
        reviewId,
        status: statusMap[decision],
        message: `Review ${decision} with score ${scoreResult.totalScore}%`,
      };
    } catch (error: any) {
      logger.error('Complete QC review error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Prepare handoff document after QC approval
   */
  async prepareHandoff(
    reviewId: number,
    preparedBy: number,
    deliverables: DeliverableItem[],
    options?: {
      keyHighlights?: string[];
      nextSteps?: string[];
      handoffNotes?: string;
      signatureRequired?: boolean;
    }
  ): Promise<HandoffResult> {
    try {
      const [review] = await db
        .select({
          id: qualityReviews.id,
          serviceRequestId: qualityReviews.serviceRequestId,
          status: qualityReviews.status,
          qualityScore: qualityReviews.qualityScore,
          reviewCompletedAt: qualityReviews.reviewCompletedAt,
          reviewerId: qualityReviews.reviewerId,
        })
        .from(qualityReviews)
        .where(eq(qualityReviews.id, reviewId))
        .limit(1);

      if (!review) {
        return { success: false, error: 'Review not found' };
      }

      if (review.status !== QC_REVIEW_STATUS.APPROVED) {
        return { success: false, error: 'Review must be approved before handoff' };
      }

      // Get service request and related details
      const [sr] = await db
        .select({
          id: serviceRequests.id,
          clientId: serviceRequests.businessEntityId,
          clientName: businessEntities.name,
          serviceName: services.name,
          completedAt: serviceRequests.updatedAt,
        })
        .from(serviceRequests)
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .where(eq(serviceRequests.id, review.serviceRequestId))
        .limit(1);

      if (!sr) {
        return { success: false, error: 'Service request not found' };
      }

      // Get preparer and approver names
      const [preparer] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, preparedBy))
        .limit(1);

      const [approver] = review.reviewerId
        ? await db
            .select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, review.reviewerId))
            .limit(1)
        : [null];

      // Build handoff document
      const handoffDocument: HandoffDocument = {
        serviceRequestId: sr.id,
        qualityReviewId: review.id,
        clientName: sr.clientName || 'Client',
        serviceName: sr.serviceName || 'Service',
        completionDate: sr.completedAt?.toISOString() || new Date().toISOString(),
        qcApprovalDate: review.reviewCompletedAt?.toISOString() || new Date().toISOString(),
        qualityScore: review.qualityScore || 0,
        deliverables,
        keyHighlights: options?.keyHighlights || [
          'All documents verified and complete',
          'Quality standards met',
          'Ready for client delivery',
        ],
        nextSteps: options?.nextSteps,
        signatureRequired: options?.signatureRequired ?? true,
        handoffNotes: options?.handoffNotes,
        preparedBy: preparer?.fullName || `User ${preparedBy}`,
        approvedBy: approver?.fullName || 'QC Team',
      };

      // Create delivery confirmation record
      const [confirmation] = await db
        .insert(deliveryConfirmations)
        .values({
          serviceRequestId: sr.id,
          qualityReviewId: reviewId,
          clientId: sr.clientId || 0,
          deliveryMethod: 'portal_download',
          deliveredBy: preparedBy,
          status: DELIVERY_STATUS.READY_FOR_DELIVERY,
          deliverables,
          handoffDocument,
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        })
        .returning();

      // Update service request status
      await db
        .update(serviceRequests)
        .set({
          status: 'ready_for_delivery',
          updatedAt: new Date(),
        })
        .where(eq(serviceRequests.id, sr.id));

      logger.info(`Handoff prepared for service request ${sr.id}`);

      return {
        success: true,
        deliveryConfirmationId: confirmation.id,
        handoffDocument,
      };
    } catch (error: any) {
      logger.error('Prepare handoff error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture client signature for delivery confirmation
   */
  async captureSignature(
    deliveryConfirmationId: number,
    signatureData: SignatureData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [confirmation] = await db
        .select()
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.id, deliveryConfirmationId))
        .limit(1);

      if (!confirmation) {
        return { success: false, error: 'Delivery confirmation not found' };
      }

      // Store signature and update confirmation
      await db
        .update(deliveryConfirmations)
        .set({
          clientSignature: JSON.stringify(signatureData),
          clientConfirmedAt: signatureData.signedAt,
          confirmationMethod: 'digital_signature',
          status: DELIVERY_STATUS.DELIVERED,
          updatedAt: new Date(),
        })
        .where(eq(deliveryConfirmations.id, deliveryConfirmationId));

      // Update service request status
      await db
        .update(serviceRequests)
        .set({
          status: 'delivered',
          updatedAt: new Date(),
        })
        .where(eq(serviceRequests.id, confirmation.serviceRequestId));

      // Notify delivery team
      if (confirmation.deliveredBy) {
        await db.insert(notifications).values({
          userId: confirmation.deliveredBy,
          title: 'Client Signature Received',
          message: `Client has signed and confirmed delivery for service request #${confirmation.serviceRequestId}`,
          type: 'delivery_confirmed',
          category: 'service',
          priority: 'normal',
          actionUrl: `/ops/deliveries/${deliveryConfirmationId}`,
          actionText: 'View Details',
        });
      }

      logger.info(`Signature captured for delivery ${deliveryConfirmationId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Capture signature error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate verification code for signature
   */
  generateVerificationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Send handoff notification to client
   */
  async notifyClientForHandoff(
    deliveryConfirmationId: number,
    clientUserId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [confirmation] = await db
        .select({
          id: deliveryConfirmations.id,
          serviceRequestId: deliveryConfirmations.serviceRequestId,
          handoffDocument: deliveryConfirmations.handoffDocument,
        })
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.id, deliveryConfirmationId))
        .limit(1);

      if (!confirmation) {
        return { success: false, error: 'Delivery confirmation not found' };
      }

      const handoff = confirmation.handoffDocument as HandoffDocument;

      await db.insert(notifications).values({
        userId: clientUserId,
        title: `Service Ready: ${handoff?.serviceName || 'Your Service'}`,
        message: `Your ${handoff?.serviceName || 'service'} is ready for delivery. Please review and confirm receipt.`,
        type: 'delivery_ready',
        category: 'service',
        priority: 'high',
        actionUrl: `/client/deliveries/${deliveryConfirmationId}`,
        actionText: 'Review & Confirm',
      });

      logger.info(`Client notified for handoff ${deliveryConfirmationId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Notify client error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending handoffs for dashboard
   */
  async getPendingHandoffs(userId?: number): Promise<any[]> {
    try {
      const conditions = [
        eq(deliveryConfirmations.status, DELIVERY_STATUS.READY_FOR_DELIVERY),
        isNull(deliveryConfirmations.clientConfirmedAt),
      ];

      if (userId) {
        conditions.push(eq(deliveryConfirmations.deliveredBy, userId));
      }

      const handoffs = await db
        .select({
          id: deliveryConfirmations.id,
          serviceRequestId: deliveryConfirmations.serviceRequestId,
          clientId: deliveryConfirmations.clientId,
          clientName: businessEntities.name,
          serviceName: services.name,
          deliveredAt: deliveryConfirmations.deliveredAt,
          followUpDate: deliveryConfirmations.followUpDate,
          handoffDocument: deliveryConfirmations.handoffDocument,
        })
        .from(deliveryConfirmations)
        .leftJoin(serviceRequests, eq(deliveryConfirmations.serviceRequestId, serviceRequests.id))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .where(and(...conditions))
        .orderBy(desc(deliveryConfirmations.createdAt));

      return handoffs;
    } catch (error) {
      logger.error('Get pending handoffs error:', error);
      return [];
    }
  }

  /**
   * Get QC workflow statistics
   */
  async getWorkflowStats(): Promise<{
    pendingReviews: number;
    inProgressReviews: number;
    completedToday: number;
    avgReviewTime: number;
    approvalRate: number;
    pendingHandoffs: number;
    confirmedDeliveries: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [stats] = await db
        .select({
          pending: sql<number>`COUNT(CASE WHEN ${qualityReviews.status} = 'pending' THEN 1 END)`,
          inProgress: sql<number>`COUNT(CASE WHEN ${qualityReviews.status} = 'in_progress' THEN 1 END)`,
          completedToday: sql<number>`COUNT(CASE WHEN ${qualityReviews.status} = 'approved' AND DATE(${qualityReviews.reviewCompletedAt}) = CURRENT_DATE THEN 1 END)`,
          total: sql<number>`COUNT(*)`,
          approved: sql<number>`COUNT(CASE WHEN ${qualityReviews.status} = 'approved' THEN 1 END)`,
        })
        .from(qualityReviews);

      const [deliveryStats] = await db
        .select({
          pendingHandoffs: sql<number>`COUNT(CASE WHEN ${deliveryConfirmations.status} = 'ready_for_delivery' AND ${deliveryConfirmations.clientConfirmedAt} IS NULL THEN 1 END)`,
          confirmed: sql<number>`COUNT(CASE WHEN ${deliveryConfirmations.clientConfirmedAt} IS NOT NULL THEN 1 END)`,
        })
        .from(deliveryConfirmations);

      const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

      return {
        pendingReviews: stats.pending || 0,
        inProgressReviews: stats.inProgress || 0,
        completedToday: stats.completedToday || 0,
        avgReviewTime: 25, // Minutes - could be calculated from actual data
        approvalRate,
        pendingHandoffs: deliveryStats.pendingHandoffs || 0,
        confirmedDeliveries: deliveryStats.confirmed || 0,
      };
    } catch (error) {
      logger.error('Get workflow stats error:', error);
      return {
        pendingReviews: 0,
        inProgressReviews: 0,
        completedToday: 0,
        avgReviewTime: 0,
        approvalRate: 0,
        pendingHandoffs: 0,
        confirmedDeliveries: 0,
      };
    }
  }
}

export const qcWorkflowService = new QCWorkflowService();
