/**
 * ID Display Utilities for Frontend
 *
 * Provides consistent formatting and display of DigiComply IDs
 */

// ID type to icon mapping
const ID_ICONS: Record<string, string> = {
  C: '👤',      // Client
  E: '🏢',      // Entity
  CT: '📞',     // Contact
  U: '👤',      // User
  STF: '👨‍💼',   // Staff
  AGT: '🤝',    // Agent
  TM: '👥',     // Team
  SR: '📋',     // Service Request
  WI: '⚙️',     // Work Item
  TSK: '✅',    // Task
  ST: '📌',     // Sub-Task
  WFI: '🔄',    // Workflow Instance
  INV: '🧾',    // Invoice
  PAY: '💳',    // Payment
  RCT: '🧾',    // Receipt
  CN: '📄',     // Credit Note
  DN: '📄',     // Debit Note
  COM: '💰',    // Commission
  WLT: '💵',    // Wallet
  PO: '💸',     // Payout
  DOC: '📄',    // Document
  DR: '📥',     // Document Request
  SIG: '✍️',    // Signature
  CRT: '🏆',    // Certificate
  CMP: '📊',    // Compliance
  DL: '⏰',     // Deadline
  PEN: '⚠️',    // Penalty
  FIL: '📝',    // Filing
  L: '🎯',      // Lead
  OPP: '💡',    // Opportunity
  PRP: '📑',    // Proposal
  CON: '📜',    // Contract
  QT: '💲',     // Quote
  TKT: '🎫',    // Ticket
  ESC: '🚨',    // Escalation
  FB: '💬',     // Feedback
  MSG: '✉️',    // Message
  QC: '✔️',     // QC Review
  DLV: '📦',    // Delivery
  REJ: '❌',    // Rejection
};

// ID type to description mapping
const ID_DESCRIPTIONS: Record<string, string> = {
  C: 'Client',
  E: 'Entity',
  CT: 'Contact',
  U: 'User',
  STF: 'Staff',
  AGT: 'Agent',
  TM: 'Team',
  SR: 'Service Request',
  WI: 'Work Item',
  TSK: 'Task',
  ST: 'Sub-Task',
  WFI: 'Workflow',
  INV: 'Invoice',
  PAY: 'Payment',
  RCT: 'Receipt',
  CN: 'Credit Note',
  DN: 'Debit Note',
  COM: 'Commission',
  WLT: 'Wallet Txn',
  PO: 'Payout',
  DOC: 'Document',
  DR: 'Doc Request',
  SIG: 'Signature',
  CRT: 'Certificate',
  CMP: 'Compliance',
  DL: 'Deadline',
  PEN: 'Penalty',
  FIL: 'Filing',
  L: 'Lead',
  OPP: 'Opportunity',
  PRP: 'Proposal',
  CON: 'Contract',
  QT: 'Quote',
  TKT: 'Ticket',
  ESC: 'Escalation',
  FB: 'Feedback',
  MSG: 'Message',
  QC: 'QC Review',
  DLV: 'Delivery',
  REJ: 'Rejection',
};

// Color scheme for different ID types
const ID_COLORS: Record<string, string> = {
  C: 'text-blue-600 bg-blue-50',
  E: 'text-indigo-600 bg-indigo-50',
  SR: 'text-green-600 bg-green-50',
  WI: 'text-orange-600 bg-orange-50',
  TSK: 'text-purple-600 bg-purple-50',
  INV: 'text-emerald-600 bg-emerald-50',
  PAY: 'text-teal-600 bg-teal-50',
  DOC: 'text-cyan-600 bg-cyan-50',
  L: 'text-yellow-600 bg-yellow-50',
  TKT: 'text-red-600 bg-red-50',
  CMP: 'text-pink-600 bg-pink-50',
};

/**
 * Extract prefix from an ID
 */
export function getIdPrefix(id: string): string | null {
  // Try to match known prefixes (longest first)
  const prefixes = Object.keys(ID_DESCRIPTIONS).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (id.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

/**
 * Get icon for an ID
 */
export function getIdIcon(id: string): string {
  const prefix = getIdPrefix(id);
  return prefix ? ID_ICONS[prefix] || '📋' : '📋';
}

/**
 * Get description for an ID
 */
export function getIdDescription(id: string): string {
  const prefix = getIdPrefix(id);
  return prefix ? ID_DESCRIPTIONS[prefix] || 'Unknown' : 'Unknown';
}

/**
 * Get color classes for an ID badge
 */
export function getIdColorClasses(id: string): string {
  const prefix = getIdPrefix(id);
  return prefix ? ID_COLORS[prefix] || 'text-gray-600 bg-gray-50' : 'text-gray-600 bg-gray-50';
}

/**
 * Format ID with icon
 */
export function formatIdWithIcon(id: string): string {
  return `${getIdIcon(id)} ${id}`;
}

/**
 * Format ID for verbal communication
 */
export function formatIdForSpeech(id: string): string {
  const description = getIdDescription(id);
  return `${description} number ${id}`;
}

/**
 * Format ID with full description
 */
export function formatIdFull(id: string): string {
  const description = getIdDescription(id);
  const icon = getIdIcon(id);
  return `${icon} ${description} #${id}`;
}

/**
 * Parse ID to extract components
 */
export function parseId(id: string): {
  prefix: string | null;
  year: string | null;
  month: string | null;
  sequence: string;
  description: string;
} {
  const prefix = getIdPrefix(id);
  if (!prefix) {
    return { prefix: null, year: null, month: null, sequence: id, description: 'Unknown' };
  }

  const rest = id.slice(prefix.length);
  const description = ID_DESCRIPTIONS[prefix] || 'Unknown';

  // Check if it has year (2 digits at start)
  if (/^\d{2}/.test(rest)) {
    const year = '20' + rest.slice(0, 2);
    const remaining = rest.slice(2);

    // Check if it has month (next 2 digits)
    if (/^\d{2}/.test(remaining) && remaining.length > 5) {
      return {
        prefix,
        year,
        month: remaining.slice(0, 2),
        sequence: remaining.slice(2),
        description,
      };
    }

    return {
      prefix,
      year,
      month: null,
      sequence: remaining,
      description,
    };
  }

  return {
    prefix,
    year: null,
    month: null,
    sequence: rest,
    description,
  };
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

/**
 * Validate if a string is a valid DigiComply ID
 */
export function isValidId(id: string): boolean {
  const prefix = getIdPrefix(id);
  if (!prefix) return false;

  const rest = id.slice(prefix.length);
  // Should have only digits after prefix
  return /^\d+$/.test(rest);
}

/**
 * Generate a copy-friendly format
 */
export function formatIdForCopy(id: string): string {
  return id;
}

/**
 * Get all ID types with their info
 */
export function getAllIdTypes(): Array<{
  prefix: string;
  description: string;
  icon: string;
}> {
  return Object.entries(ID_DESCRIPTIONS).map(([prefix, description]) => ({
    prefix,
    description,
    icon: ID_ICONS[prefix] || '📋',
  }));
}

export default {
  getIdPrefix,
  getIdIcon,
  getIdDescription,
  getIdColorClasses,
  formatIdWithIcon,
  formatIdForSpeech,
  formatIdFull,
  parseId,
  idToSlug,
  slugToId,
  isValidId,
  formatIdForCopy,
  getAllIdTypes,
};
