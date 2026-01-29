/**
 * ID Validation Middleware
 *
 * Validates that IDs in request parameters match expected DigiComply ID formats.
 * Provides consistent error responses for invalid IDs.
 */

import { Request, Response, NextFunction } from 'express';
import { idGenerator, ID_TYPES, type IdType } from '../services/id-generator';

// ID prefix to type mapping for auto-detection
const PREFIX_TO_TYPE: Record<string, IdType> = {
  'C': ID_TYPES.CLIENT,
  'E': ID_TYPES.ENTITY,
  'CT': ID_TYPES.CONTACT,
  'U': ID_TYPES.USER,
  'STF': ID_TYPES.STAFF,
  'AGT': ID_TYPES.AGENT,
  'TM': ID_TYPES.TEAM,
  'SR': ID_TYPES.SERVICE_REQUEST,
  'WI': ID_TYPES.WORK_ITEM,
  'TSK': ID_TYPES.TASK,
  'ST': ID_TYPES.SUB_TASK,
  'WFI': ID_TYPES.WORKFLOW_INSTANCE,
  'INV': ID_TYPES.INVOICE,
  'PAY': ID_TYPES.PAYMENT,
  'RCT': ID_TYPES.RECEIPT,
  'CN': ID_TYPES.CREDIT_NOTE,
  'DN': ID_TYPES.DEBIT_NOTE,
  'COM': ID_TYPES.COMMISSION,
  'WLT': ID_TYPES.WALLET_TXN,
  'PO': ID_TYPES.PAYOUT,
  'DOC': ID_TYPES.DOCUMENT,
  'DR': ID_TYPES.DOC_REQUEST,
  'SIG': ID_TYPES.SIGNATURE,
  'CRT': ID_TYPES.CERTIFICATE,
  'CMP': ID_TYPES.COMPLIANCE_ITEM,
  'DL': ID_TYPES.DEADLINE,
  'PEN': ID_TYPES.PENALTY,
  'FIL': ID_TYPES.FILING,
  'L': ID_TYPES.LEAD,
  'OPP': ID_TYPES.OPPORTUNITY,
  'PRP': ID_TYPES.PROPOSAL,
  'CON': ID_TYPES.CONTRACT,
  'QT': ID_TYPES.QUOTE,
  'TKT': ID_TYPES.TICKET,
  'ESC': ID_TYPES.ESCALATION,
  'FB': ID_TYPES.FEEDBACK,
  'MSG': ID_TYPES.MESSAGE,
  'QC': ID_TYPES.QC_REVIEW,
  'DLV': ID_TYPES.DELIVERY,
  'REJ': ID_TYPES.REJECTION,
};

/**
 * Detect ID type from prefix
 */
export function detectIdType(id: string): IdType | null {
  // Sort prefixes by length (longest first) to match correctly
  const prefixes = Object.keys(PREFIX_TO_TYPE).sort((a, b) => b.length - a.length);

  for (const prefix of prefixes) {
    if (id.toUpperCase().startsWith(prefix)) {
      return PREFIX_TO_TYPE[prefix];
    }
  }
  return null;
}

/**
 * Validate ID format
 */
export function isValidIdFormat(id: string, expectedType?: IdType): boolean {
  if (!id || typeof id !== 'string') return false;

  const upperCaseId = id.toUpperCase();
  const detectedType = detectIdType(upperCaseId);

  if (!detectedType) return false;
  if (expectedType && detectedType !== expectedType) return false;

  return idGenerator.isValidId(upperCaseId, expectedType);
}

/**
 * Middleware factory to validate ID parameter
 *
 * @param paramName - The name of the route parameter containing the ID
 * @param expectedType - Optional expected ID type for strict validation
 * @param allowNumeric - If true, also accepts numeric IDs (for backwards compatibility)
 */
export function validateIdParam(
  paramName: string = 'id',
  expectedType?: IdType,
  allowNumeric: boolean = true
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({
        error: 'Missing ID parameter',
        param: paramName
      });
    }

    // Allow numeric IDs for backwards compatibility
    if (allowNumeric && /^\d+$/.test(id)) {
      return next();
    }

    // Validate readable ID format
    const upperCaseId = id.toUpperCase();

    if (!isValidIdFormat(upperCaseId, expectedType)) {
      const config = expectedType ? idGenerator.getConfig(expectedType) : null;

      return res.status(400).json({
        error: 'Invalid ID format',
        received: id,
        expected: config
          ? `${config.prefix}... (${config.description})`
          : 'Valid DigiComply ID format',
        examples: config
          ? [`${config.prefix}2600001`, `${config.prefix}2600002`]
          : ['SR2600001', 'INV2601000001', 'DOC26000001']
      });
    }

    // Normalize to uppercase
    req.params[paramName] = upperCaseId;

    next();
  };
}

/**
 * Middleware to validate multiple ID parameters
 */
export function validateIdParams(
  validations: Array<{
    param: string;
    type?: IdType;
    allowNumeric?: boolean;
    optional?: boolean;
  }>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ param: string; error: string }> = [];

    for (const validation of validations) {
      const id = req.params[validation.param];

      // Skip optional params if not provided
      if (!id && validation.optional) continue;

      if (!id) {
        errors.push({ param: validation.param, error: 'Missing ID parameter' });
        continue;
      }

      // Allow numeric IDs
      if (validation.allowNumeric !== false && /^\d+$/.test(id)) {
        continue;
      }

      const upperCaseId = id.toUpperCase();

      if (!isValidIdFormat(upperCaseId, validation.type)) {
        errors.push({
          param: validation.param,
          error: `Invalid ID format for ${validation.type || 'unknown type'}`
        });
      } else {
        // Normalize
        req.params[validation.param] = upperCaseId;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid ID parameters',
        details: errors
      });
    }

    next();
  };
}

/**
 * Middleware to validate ID in request body
 */
export function validateIdBody(
  fieldName: string,
  expectedType?: IdType,
  allowNumeric: boolean = true
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.body[fieldName];

    if (!id) {
      return next(); // Allow empty - validation should be handled elsewhere
    }

    if (allowNumeric && typeof id === 'number') {
      return next();
    }

    if (typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid ID type',
        field: fieldName,
        expected: 'string or number'
      });
    }

    const upperCaseId = id.toUpperCase();

    if (!isValidIdFormat(upperCaseId, expectedType)) {
      return res.status(400).json({
        error: 'Invalid ID format in request body',
        field: fieldName,
        received: id
      });
    }

    // Normalize
    req.body[fieldName] = upperCaseId;

    next();
  };
}

/**
 * Parse ID and return both numeric and readable versions
 * Useful for database lookups that need to support both formats
 */
export interface ParsedId {
  original: string;
  isNumeric: boolean;
  numericId?: number;
  readableId?: string;
  type?: IdType;
  parsed?: ReturnType<typeof idGenerator.parseId>;
}

export function parseIdParam(id: string): ParsedId {
  if (/^\d+$/.test(id)) {
    return {
      original: id,
      isNumeric: true,
      numericId: parseInt(id, 10)
    };
  }

  const upperCaseId = id.toUpperCase();
  const parsed = idGenerator.parseId(upperCaseId);

  return {
    original: id,
    isNumeric: false,
    readableId: upperCaseId,
    type: parsed?.type || undefined,
    parsed: parsed || undefined
  };
}

/**
 * Helper to get ID description for error messages
 */
export function getIdDescription(id: string): string {
  return idGenerator.getIdDescription(id.toUpperCase());
}

/**
 * Format response to include readable ID
 */
export function formatResponseWithId<T extends { id?: number }>(
  entity: T,
  readableId?: string | null
): T & { displayId?: string } {
  if (readableId) {
    return {
      ...entity,
      displayId: readableId
    };
  }
  return entity;
}

export default {
  validateIdParam,
  validateIdParams,
  validateIdBody,
  parseIdParam,
  isValidIdFormat,
  detectIdType,
  getIdDescription,
  formatResponseWithId
};
