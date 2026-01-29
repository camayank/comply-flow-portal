/**
 * Centralized ID Generator Service
 *
 * Generates unique, human-readable IDs for all entities in the DigiComply platform.
 *
 * Format Convention: {PREFIX}{YEAR?}{MONTH?}{SEQUENCE}
 *
 * Features:
 * - Atomic sequence generation using database
 * - Year-based grouping for time-series analysis
 * - Human-readable prefixes for easy identification
 * - Thread-safe for concurrent operations
 */

import { db } from '../db';
import { idSequences, ID_TYPES, type IdType } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// ============================================================================
// ID CONFIGURATION
// ============================================================================

interface IdConfig {
  prefix: string;
  includeYear: boolean;
  includeMonth?: boolean;
  sequenceLength: number;
  description: string;
}

const ID_CONFIGS: Record<IdType, IdConfig> = {
  // Core Entities (no year - permanent IDs)
  [ID_TYPES.CLIENT]: {
    prefix: 'C',
    includeYear: false,
    sequenceLength: 5,
    description: 'Client Account'
  },
  [ID_TYPES.ENTITY]: {
    prefix: 'E',
    includeYear: false,
    sequenceLength: 5,
    description: 'Business Entity'
  },
  [ID_TYPES.CONTACT]: {
    prefix: 'CT',
    includeYear: false,
    sequenceLength: 6,
    description: 'Contact Person'
  },
  [ID_TYPES.USER]: {
    prefix: 'U',
    includeYear: false,
    sequenceLength: 6,
    description: 'System User'
  },
  [ID_TYPES.STAFF]: {
    prefix: 'STF',
    includeYear: false,
    sequenceLength: 4,
    description: 'Staff Member'
  },
  [ID_TYPES.AGENT]: {
    prefix: 'AGT',
    includeYear: false,
    sequenceLength: 4,
    description: 'Channel Partner'
  },
  [ID_TYPES.TEAM]: {
    prefix: 'TM',
    includeYear: false,
    sequenceLength: 3,
    description: 'Operations Team'
  },

  // Service & Work (year-based)
  [ID_TYPES.SERVICE_REQUEST]: {
    prefix: 'SR',
    includeYear: true,
    sequenceLength: 5,
    description: 'Service Request'
  },
  [ID_TYPES.WORK_ITEM]: {
    prefix: 'WI',
    includeYear: true,
    sequenceLength: 6,
    description: 'Work Item'
  },
  [ID_TYPES.TASK]: {
    prefix: 'TSK',
    includeYear: true,
    sequenceLength: 6,
    description: 'Task'
  },
  [ID_TYPES.SUB_TASK]: {
    prefix: 'ST',
    includeYear: true,
    sequenceLength: 6,
    description: 'Sub-Task'
  },
  [ID_TYPES.WORKFLOW_INSTANCE]: {
    prefix: 'WFI',
    includeYear: true,
    sequenceLength: 6,
    description: 'Workflow Instance'
  },

  // Financial (year + month based)
  [ID_TYPES.INVOICE]: {
    prefix: 'INV',
    includeYear: true,
    includeMonth: true,
    sequenceLength: 5,
    description: 'Invoice'
  },
  [ID_TYPES.PAYMENT]: {
    prefix: 'PAY',
    includeYear: true,
    sequenceLength: 6,
    description: 'Payment'
  },
  [ID_TYPES.RECEIPT]: {
    prefix: 'RCT',
    includeYear: true,
    sequenceLength: 6,
    description: 'Receipt'
  },
  [ID_TYPES.CREDIT_NOTE]: {
    prefix: 'CN',
    includeYear: true,
    sequenceLength: 5,
    description: 'Credit Note'
  },
  [ID_TYPES.DEBIT_NOTE]: {
    prefix: 'DN',
    includeYear: true,
    sequenceLength: 5,
    description: 'Debit Note'
  },
  [ID_TYPES.COMMISSION]: {
    prefix: 'COM',
    includeYear: true,
    sequenceLength: 6,
    description: 'Commission Record'
  },
  [ID_TYPES.WALLET_TXN]: {
    prefix: 'WLT',
    includeYear: true,
    sequenceLength: 6,
    description: 'Wallet Transaction'
  },
  [ID_TYPES.PAYOUT]: {
    prefix: 'PO',
    includeYear: true,
    sequenceLength: 5,
    description: 'Payout'
  },

  // Documents (year-based)
  [ID_TYPES.DOCUMENT]: {
    prefix: 'DOC',
    includeYear: true,
    sequenceLength: 6,
    description: 'Document'
  },
  [ID_TYPES.DOC_REQUEST]: {
    prefix: 'DR',
    includeYear: true,
    sequenceLength: 5,
    description: 'Document Request'
  },
  [ID_TYPES.SIGNATURE]: {
    prefix: 'SIG',
    includeYear: true,
    sequenceLength: 5,
    description: 'Signature Request'
  },
  [ID_TYPES.CERTIFICATE]: {
    prefix: 'CRT',
    includeYear: true,
    sequenceLength: 5,
    description: 'Certificate'
  },

  // Compliance (year-based)
  [ID_TYPES.COMPLIANCE_ITEM]: {
    prefix: 'CMP',
    includeYear: true,
    sequenceLength: 6,
    description: 'Compliance Item'
  },
  [ID_TYPES.DEADLINE]: {
    prefix: 'DL',
    includeYear: true,
    sequenceLength: 6,
    description: 'Deadline'
  },
  [ID_TYPES.PENALTY]: {
    prefix: 'PEN',
    includeYear: true,
    sequenceLength: 5,
    description: 'Penalty Record'
  },
  [ID_TYPES.FILING]: {
    prefix: 'FIL',
    includeYear: true,
    sequenceLength: 6,
    description: 'Filing Reference'
  },

  // Sales & CRM (year-based)
  [ID_TYPES.LEAD]: {
    prefix: 'L',
    includeYear: true,
    sequenceLength: 5,
    description: 'Lead'
  },
  [ID_TYPES.OPPORTUNITY]: {
    prefix: 'OPP',
    includeYear: true,
    sequenceLength: 5,
    description: 'Opportunity'
  },
  [ID_TYPES.PROPOSAL]: {
    prefix: 'PRP',
    includeYear: true,
    sequenceLength: 5,
    description: 'Proposal'
  },
  [ID_TYPES.CONTRACT]: {
    prefix: 'CON',
    includeYear: true,
    sequenceLength: 5,
    description: 'Contract'
  },
  [ID_TYPES.QUOTE]: {
    prefix: 'QT',
    includeYear: true,
    sequenceLength: 5,
    description: 'Quote'
  },

  // Support (year-based)
  [ID_TYPES.TICKET]: {
    prefix: 'TKT',
    includeYear: true,
    sequenceLength: 6,
    description: 'Support Ticket'
  },
  [ID_TYPES.ESCALATION]: {
    prefix: 'ESC',
    includeYear: true,
    sequenceLength: 5,
    description: 'Escalation'
  },
  [ID_TYPES.FEEDBACK]: {
    prefix: 'FB',
    includeYear: true,
    sequenceLength: 5,
    description: 'Feedback'
  },
  [ID_TYPES.MESSAGE]: {
    prefix: 'MSG',
    includeYear: true,
    sequenceLength: 6,
    description: 'Message Thread'
  },

  // Quality (year-based)
  [ID_TYPES.QC_REVIEW]: {
    prefix: 'QC',
    includeYear: true,
    sequenceLength: 6,
    description: 'QC Review'
  },
  [ID_TYPES.DELIVERY]: {
    prefix: 'DLV',
    includeYear: true,
    sequenceLength: 5,
    description: 'Delivery'
  },
  [ID_TYPES.REJECTION]: {
    prefix: 'REJ',
    includeYear: true,
    sequenceLength: 5,
    description: 'Rejection'
  },
};

// ============================================================================
// ID GENERATOR CLASS
// ============================================================================

class IdGenerator {
  private inMemoryCounters: Map<string, number> = new Map();
  private useDatabase: boolean = true;

  /**
   * Generate a new unique ID for the given entity type
   */
  async generateId(type: IdType): Promise<string> {
    const config = ID_CONFIGS[type];
    if (!config) {
      throw new Error(`Unknown ID type: ${type}`);
    }

    const now = new Date();
    const year = config.includeYear ? now.getFullYear().toString().slice(-2) : 'ALL';
    const month = config.includeMonth ? (now.getMonth() + 1).toString().padStart(2, '0') : null;

    try {
      // Try database-based generation first
      const sequence = await this.getNextSequenceFromDb(type, year, month, config.prefix);
      return this.formatId(config, year, month, sequence);
    } catch (error) {
      // Fallback to in-memory counter (for development/testing)
      console.warn(`Database sequence failed for ${type}, using in-memory counter`);
      const sequence = this.getNextSequenceInMemory(type, year, month);
      return this.formatId(config, year, month, sequence);
    }
  }

  /**
   * Generate multiple IDs in a batch (more efficient)
   */
  async generateBatch(type: IdType, count: number): Promise<string[]> {
    const config = ID_CONFIGS[type];
    if (!config) {
      throw new Error(`Unknown ID type: ${type}`);
    }

    const now = new Date();
    const year = config.includeYear ? now.getFullYear().toString().slice(-2) : 'ALL';
    const month = config.includeMonth ? (now.getMonth() + 1).toString().padStart(2, '0') : null;

    const ids: string[] = [];

    try {
      // Get batch of sequences from database
      const startSequence = await this.reserveSequenceRange(type, year, month, config.prefix, count);

      for (let i = 0; i < count; i++) {
        ids.push(this.formatId(config, year, month, startSequence + i));
      }
    } catch (error) {
      // Fallback to sequential in-memory generation
      for (let i = 0; i < count; i++) {
        const sequence = this.getNextSequenceInMemory(type, year, month);
        ids.push(this.formatId(config, year, month, sequence));
      }
    }

    return ids;
  }

  /**
   * Parse an ID to extract its components
   */
  parseId(id: string): { type: IdType | null; year: string | null; month: string | null; sequence: number } | null {
    // Find matching config by prefix
    for (const [type, config] of Object.entries(ID_CONFIGS)) {
      if (id.startsWith(config.prefix)) {
        const rest = id.slice(config.prefix.length);

        let year: string | null = null;
        let month: string | null = null;
        let sequenceStr: string;

        if (config.includeYear && config.includeMonth) {
          year = rest.slice(0, 2);
          month = rest.slice(2, 4);
          sequenceStr = rest.slice(4);
        } else if (config.includeYear) {
          year = rest.slice(0, 2);
          sequenceStr = rest.slice(2);
        } else {
          sequenceStr = rest;
        }

        return {
          type: type as IdType,
          year,
          month,
          sequence: parseInt(sequenceStr, 10)
        };
      }
    }
    return null;
  }

  /**
   * Validate if an ID matches expected format
   */
  isValidId(id: string, expectedType?: IdType): boolean {
    const parsed = this.parseId(id);
    if (!parsed || !parsed.type) return false;
    if (expectedType && parsed.type !== expectedType) return false;
    return !isNaN(parsed.sequence) && parsed.sequence > 0;
  }

  /**
   * Get human-readable description for an ID
   */
  getIdDescription(id: string): string {
    const parsed = this.parseId(id);
    if (!parsed || !parsed.type) return 'Unknown ID';

    const config = ID_CONFIGS[parsed.type];
    let desc = config.description;

    if (parsed.year && parsed.year !== 'ALL') {
      desc += ` (20${parsed.year})`;
    }

    return `${desc} #${id}`;
  }

  /**
   * Get the config for an ID type
   */
  getConfig(type: IdType): IdConfig | undefined {
    return ID_CONFIGS[type];
  }

  /**
   * Get all ID types and their configs
   */
  getAllConfigs(): Record<IdType, IdConfig> {
    return { ...ID_CONFIGS };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private formatId(config: IdConfig, year: string, month: string | null, sequence: number): string {
    let id = config.prefix;

    if (config.includeYear && year !== 'ALL') {
      id += year;
    }

    if (config.includeMonth && month) {
      id += month;
    }

    id += sequence.toString().padStart(config.sequenceLength, '0');

    return id;
  }

  private async getNextSequenceFromDb(
    entityType: string,
    year: string,
    month: string | null,
    prefix: string
  ): Promise<number> {
    // Use upsert pattern for atomic increment
    const result = await db.execute(sql`
      INSERT INTO id_sequences (entity_type, year, month, prefix, current_sequence, last_generated_id, updated_at)
      VALUES (${entityType}, ${year}, ${month}, ${prefix}, 1, NULL, NOW())
      ON CONFLICT (entity_type, year, COALESCE(month, ''))
      DO UPDATE SET
        current_sequence = id_sequences.current_sequence + 1,
        updated_at = NOW()
      RETURNING current_sequence
    `);

    return (result.rows[0] as any).current_sequence;
  }

  private async reserveSequenceRange(
    entityType: string,
    year: string,
    month: string | null,
    prefix: string,
    count: number
  ): Promise<number> {
    const result = await db.execute(sql`
      INSERT INTO id_sequences (entity_type, year, month, prefix, current_sequence, updated_at)
      VALUES (${entityType}, ${year}, ${month}, ${prefix}, ${count}, NOW())
      ON CONFLICT (entity_type, year, COALESCE(month, ''))
      DO UPDATE SET
        current_sequence = id_sequences.current_sequence + ${count},
        updated_at = NOW()
      RETURNING current_sequence - ${count} + 1 as start_sequence
    `);

    return (result.rows[0] as any).start_sequence;
  }

  private getNextSequenceInMemory(type: string, year: string, month: string | null): number {
    const key = `${type}:${year}:${month || ''}`;
    const current = this.inMemoryCounters.get(key) || 0;
    const next = current + 1;
    this.inMemoryCounters.set(key, next);
    return next;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const idGenerator = new IdGenerator();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate a Client ID (C00001)
 */
export async function generateClientId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.CLIENT);
}

/**
 * Generate an Entity ID (E00001)
 */
export async function generateEntityId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.ENTITY);
}

/**
 * Generate a Service Request ID (SR2600001)
 */
export async function generateServiceRequestId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.SERVICE_REQUEST);
}

/**
 * Generate a Work Item ID (WI26000001)
 */
export async function generateWorkItemId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.WORK_ITEM);
}

/**
 * Generate a Task ID (TSK26000001)
 */
export async function generateTaskId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.TASK);
}

/**
 * Generate an Invoice ID (INV2601000001)
 */
export async function generateInvoiceId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.INVOICE);
}

/**
 * Generate a Payment ID (PAY26000001)
 */
export async function generatePaymentId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.PAYMENT);
}

/**
 * Generate a Document ID (DOC26000001)
 */
export async function generateDocumentId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.DOCUMENT);
}

/**
 * Generate a Lead ID (L2600001)
 */
export async function generateLeadId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.LEAD);
}

/**
 * Generate a Ticket ID (TKT26000001)
 */
export async function generateTicketId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.TICKET);
}

/**
 * Generate a Compliance Item ID (CMP26000001)
 */
export async function generateComplianceItemId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.COMPLIANCE_ITEM);
}

/**
 * Generate a QC Review ID (QC26000001)
 */
export async function generateQcReviewId(): Promise<string> {
  return idGenerator.generateId(ID_TYPES.QC_REVIEW);
}

// ============================================================================
// ID DISPLAY UTILITIES
// ============================================================================

/**
 * Format an ID for display with icon
 */
export function formatIdWithIcon(id: string): string {
  const icons: Record<string, string> = {
    C: '👤',
    E: '🏢',
    SR: '📋',
    WI: '⚙️',
    TSK: '✅',
    INV: '🧾',
    PAY: '💳',
    DOC: '📄',
    L: '🎯',
    TKT: '🎫',
    CMP: '📊',
    QC: '✔️',
  };

  for (const [prefix, icon] of Object.entries(icons)) {
    if (id.startsWith(prefix)) {
      return `${icon} ${id}`;
    }
  }
  return id;
}

/**
 * Format an ID for verbal communication
 */
export function formatIdForSpeech(id: string): string {
  const parsed = idGenerator.parseId(id);
  if (!parsed || !parsed.type) return id;

  const config = idGenerator.getConfig(parsed.type);
  if (!config) return id;

  return `${config.description} number ${id}`;
}

/**
 * Create a URL-safe slug from an ID
 */
export function idToSlug(id: string): string {
  return id.toLowerCase();
}

/**
 * Parse an ID from a URL slug
 */
export function slugToId(slug: string): string {
  return slug.toUpperCase();
}

console.log('✅ ID Generator service initialized');
