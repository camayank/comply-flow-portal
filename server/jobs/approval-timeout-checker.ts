import { db } from '../db';
import { approvalRequests } from '@shared/pipeline-schema';
import { eq, and, lt } from 'drizzle-orm';
import { logger } from '../logger';

export async function checkApprovalTimeouts(): Promise<void> {
  const expired = await db.select().from(approvalRequests)
    .where(and(
      eq(approvalRequests.status, 'pending'),
      lt(approvalRequests.expiresAt, new Date()),
      eq(approvalRequests.escalated, false),
    ));

  for (const approval of expired) {
    await db.update(approvalRequests).set({
      escalated: true,
    }).where(eq(approvalRequests.id, approval.id));

    try {
      const { notificationHub } = await import('../services/notifications/notification-hub');
      await notificationHub.send({
        type: 'approval_timeout',
        channels: ['in_app'],
        content: `Approval ${approval.id} expired — escalated`,
        data: { approvalId: approval.id },
      });
    } catch (err) {
      logger.warn(`Approval timeout notification failed:`, err);
    }

    logger.warn(`Approval ${approval.id} expired — escalated to admin`);
  }
}
