import { db } from '../../../db';
import { invoices } from '@shared/pipeline-schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import type { PipelineOrchestrator, HandlerContext } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';

// ── finance.invoice_created: Send invoice to client ──
async function handleInvoiceCreated(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;
  const { serviceRequestId } = payload as any;

  await db.update(invoices).set({ status: 'sent', updatedAt: new Date() })
    .where(eq(invoices.id, entityId));

  // Notify client
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('invoice_sent', { invoiceId: entityId, serviceRequestId });
  } catch (err) {
    logger.warn(`Invoice notification failed for invoice ${entityId}:`, err);
  }

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.FINANCE_INVOICE_SENT,
    entityType: 'invoice', entityId,
    payload: { serviceRequestId },
  });

  return { invoiceSent: true };
}

// ── finance.invoice_sent: Set payment due tracking ──
async function handleInvoiceSent(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  logger.info(`Invoice ${entityId} sent — payment due tracking active`);
  return { trackingActive: true };
}

// ── finance.payment_received: Reconcile + calc commission ──
async function handlePaymentReceived(event: PipelineEvent, ctx: HandlerContext) {
  const { payload } = event;
  const { serviceRequestId, paymentId, amount } = payload as any;

  // Update invoice status
  await db.update(invoices).set({ status: 'paid', paidAt: new Date(), paymentId, updatedAt: new Date() })
    .where(eq(invoices.serviceRequestId, serviceRequestId));

  // DELEGATE commission calculation to existing service
  const { commissionService } = await import('../../commission-service');
  const commission = await commissionService.calculateCommission(serviceRequestId, amount);

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.FINANCE_COMMISSION_CALCULATED,
    entityType: 'commission', entityId: commission.commissionId,
    payload: { serviceRequestId, paymentId, amount: commission.amount, agentId: commission.agentId },
  });

  return { reconciled: true, commissionId: commission.commissionId };
}

// ── finance.commission_calculated: Queue for approval (GATED) ──
async function handleCommissionCalculated(event: PipelineEvent, ctx: HandlerContext) {
  const { payload } = event;
  logger.info(`Commission ${(payload as any).commissionId || event.entityId} calculated — awaiting approval`);
  return { awaitingApproval: true };
}

// ── finance.commission_approved: Credit wallet ──
async function handleCommissionApproved(event: PipelineEvent, ctx: HandlerContext) {
  const { payload } = event;
  const { agentId, amount, commissionId } = payload as any;

  // DELEGATE to existing wallet service
  const { walletService } = await import('../../wallet-service');
  await walletService.credit(agentId, amount, `Commission payout #${commissionId}`, 'commission', 'commission', commissionId);

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.FINANCE_COMMISSION_PAID,
    entityType: 'commission', entityId: event.entityId,
    payload: { agentId, amount, commissionId },
  });

  return { walletCredited: true };
}

// ── finance.commission_paid: Notify agent ──
async function handleCommissionPaid(event: PipelineEvent, ctx: HandlerContext) {
  const { payload } = event;
  const { agentId, amount } = payload as any;
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('commission_paid', { agentId, amount });
  } catch (err) {
    logger.warn(`Commission payout notification failed:`, err);
  }
  return { agentNotified: true };
}

export function registerFinanceHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED, 'invoice-send', handleInvoiceCreated);
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_INVOICE_SENT, 'invoice-track', handleInvoiceSent);
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_PAYMENT_RECEIVED, 'payment-reconcile', handlePaymentReceived);
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_COMMISSION_CALCULATED, 'commission-queue', handleCommissionCalculated);
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_COMMISSION_APPROVED, 'commission-payout', handleCommissionApproved);
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_COMMISSION_PAID, 'commission-notify', handleCommissionPaid);
}
