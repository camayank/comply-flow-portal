/**
 * ID Lookup Routes
 *
 * Provides endpoints to look up entities by their readable DigiComply IDs
 * and resolve them to their database records.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  serviceRequests,
  payments,
  invoices,
  documentsUploads,
  supportTickets,
  qualityReviews,
  leads,
  users,
  businessEntities
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { detectIdType, parseIdParam } from '../middleware/id-validator';
import { ID_TYPES } from '../services/id-generator';
import { sessionAuthMiddleware } from '../rbac-middleware';

const router = Router();

/**
 * GET /api/lookup/:id
 *
 * Universal ID lookup endpoint. Resolves any DigiComply ID to its entity details.
 * Auto-detects the ID type from the prefix and returns the matching record.
 */
router.get('/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = parseIdParam(id);

    // If numeric, we can't auto-detect the type
    if (parsed.isNumeric) {
      return res.status(400).json({
        error: 'Cannot lookup numeric ID without type specification',
        hint: 'Use a readable ID (e.g., SR2600001) or specify the entity type'
      });
    }

    const idType = parsed.type;
    if (!idType) {
      return res.status(400).json({
        error: 'Unknown ID format',
        received: id,
        hint: 'ID should start with a valid prefix like SR, INV, DOC, TKT, etc.'
      });
    }

    let entity: any = null;
    let entityType = '';

    switch (idType) {
      case ID_TYPES.SERVICE_REQUEST:
        [entity] = await db.select()
          .from(serviceRequests)
          .where(eq(serviceRequests.requestId, parsed.readableId!))
          .limit(1);
        entityType = 'serviceRequest';
        break;

      case ID_TYPES.PAYMENT:
        [entity] = await db.select()
          .from(payments)
          .where(eq(payments.paymentId, parsed.readableId!))
          .limit(1);
        entityType = 'payment';
        break;

      case ID_TYPES.INVOICE:
        [entity] = await db.select()
          .from(invoices)
          .where(eq(invoices.invoiceNumber, parsed.readableId!))
          .limit(1);
        entityType = 'invoice';
        break;

      case ID_TYPES.DOCUMENT:
        [entity] = await db.select()
          .from(documentsUploads)
          .where(eq(documentsUploads.documentId, parsed.readableId!))
          .limit(1);
        entityType = 'document';
        break;

      case ID_TYPES.TICKET:
        [entity] = await db.select()
          .from(supportTickets)
          .where(eq(supportTickets.ticketNumber, parsed.readableId!))
          .limit(1);
        entityType = 'ticket';
        break;

      case ID_TYPES.QC_REVIEW:
        [entity] = await db.select()
          .from(qualityReviews)
          .where(eq(qualityReviews.reviewId, parsed.readableId!))
          .limit(1);
        entityType = 'qcReview';
        break;

      case ID_TYPES.LEAD:
        [entity] = await db.select()
          .from(leads)
          .where(eq(leads.leadId, parsed.readableId!))
          .limit(1);
        entityType = 'lead';
        break;

      case ID_TYPES.CLIENT:
        [entity] = await db.select()
          .from(users)
          .where(eq(users.clientId, parsed.readableId!))
          .limit(1);
        entityType = 'client';
        break;

      case ID_TYPES.ENTITY:
        [entity] = await db.select()
          .from(businessEntities)
          .where(eq(businessEntities.entityId, parsed.readableId!))
          .limit(1);
        entityType = 'businessEntity';
        break;

      default:
        return res.status(400).json({
          error: 'Lookup not implemented for this ID type',
          type: idType,
          id: parsed.readableId
        });
    }

    if (!entity) {
      return res.status(404).json({
        error: 'Entity not found',
        type: entityType,
        id: parsed.readableId
      });
    }

    res.json({
      found: true,
      type: entityType,
      displayId: parsed.readableId,
      numericId: entity.id,
      entity
    });

  } catch (error) {
    console.error('Error looking up ID:', error);
    res.status(500).json({ error: 'Failed to lookup ID' });
  }
});

/**
 * POST /api/lookup/batch
 *
 * Batch lookup multiple IDs at once.
 * Useful for resolving multiple references in a single request.
 */
router.post('/batch', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'ids must be a non-empty array of ID strings'
      });
    }

    if (ids.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 IDs per batch request'
      });
    }

    const results: Record<string, any> = {};

    for (const id of ids) {
      const parsed = parseIdParam(id);

      if (parsed.isNumeric) {
        results[id] = { error: 'Numeric IDs not supported in batch lookup' };
        continue;
      }

      const idType = parsed.type;
      if (!idType) {
        results[id] = { error: 'Unknown ID format' };
        continue;
      }

      let entity: any = null;
      let entityType = '';

      try {
        switch (idType) {
          case ID_TYPES.SERVICE_REQUEST:
            [entity] = await db.select({ id: serviceRequests.id, status: serviceRequests.status })
              .from(serviceRequests)
              .where(eq(serviceRequests.requestId, parsed.readableId!))
              .limit(1);
            entityType = 'serviceRequest';
            break;

          case ID_TYPES.PAYMENT:
            [entity] = await db.select({ id: payments.id, status: payments.status })
              .from(payments)
              .where(eq(payments.paymentId, parsed.readableId!))
              .limit(1);
            entityType = 'payment';
            break;

          case ID_TYPES.INVOICE:
            [entity] = await db.select({ id: invoices.id, status: invoices.status })
              .from(invoices)
              .where(eq(invoices.invoiceNumber, parsed.readableId!))
              .limit(1);
            entityType = 'invoice';
            break;

          case ID_TYPES.DOCUMENT:
            [entity] = await db.select({ id: documentsUploads.id, status: documentsUploads.status })
              .from(documentsUploads)
              .where(eq(documentsUploads.documentId, parsed.readableId!))
              .limit(1);
            entityType = 'document';
            break;

          case ID_TYPES.TICKET:
            [entity] = await db.select({ id: supportTickets.id, status: supportTickets.status })
              .from(supportTickets)
              .where(eq(supportTickets.ticketNumber, parsed.readableId!))
              .limit(1);
            entityType = 'ticket';
            break;

          default:
            results[id] = { error: 'Lookup not implemented for this type' };
            continue;
        }

        if (entity) {
          results[id] = {
            found: true,
            type: entityType,
            numericId: entity.id,
            status: entity.status
          };
        } else {
          results[id] = { found: false, type: entityType };
        }
      } catch (err) {
        results[id] = { error: 'Lookup failed' };
      }
    }

    res.json({
      total: ids.length,
      results
    });

  } catch (error) {
    console.error('Error in batch lookup:', error);
    res.status(500).json({ error: 'Batch lookup failed' });
  }
});

/**
 * GET /api/lookup/validate/:id
 *
 * Validate an ID format without looking it up in the database.
 * Returns information about the ID structure.
 */
router.get('/validate/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = parseIdParam(id);

    if (parsed.isNumeric) {
      return res.json({
        valid: true,
        format: 'numeric',
        numericId: parsed.numericId,
        hint: 'Numeric IDs are legacy format. Consider using readable IDs.'
      });
    }

    const idType = parsed.type;
    if (!idType) {
      return res.json({
        valid: false,
        format: 'unknown',
        received: id,
        hint: 'ID should start with a valid prefix like SR, INV, DOC, TKT, etc.'
      });
    }

    res.json({
      valid: true,
      format: 'readable',
      readableId: parsed.readableId,
      type: idType,
      parsed: parsed.parsed
    });

  } catch (error) {
    console.error('Error validating ID:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

export default router;
