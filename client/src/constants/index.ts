// Application constants

// API endpoints base
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Application info
export const APP_NAME = 'Comply Flow Portal';
export const APP_VERSION = '1.0.0';
export const COMPANY_NAME = 'Comply Flow';

// User roles
export const USER_ROLES = {
  CLIENT: 'CLIENT',
  SALES: 'SALES',
  OPERATIONS: 'OPERATIONS',
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

// =============================================================================
// SERVICE REQUEST STATUSES - Matches Backend State Machine
// server/services/service-request-state-machine.ts
// =============================================================================

export const SERVICE_REQUEST_STATUSES = {
  // Initial States
  DRAFT: 'draft',
  INITIATED: 'initiated',
  PENDING_PAYMENT: 'pending_payment',

  // Active Processing States
  PAYMENT_RECEIVED: 'payment_received',
  DOCUMENTS_PENDING: 'documents_pending',
  DOCUMENTS_UPLOADED: 'documents_uploaded',
  DOCUMENTS_VERIFIED: 'documents_verified',
  IN_PROGRESS: 'in_progress',
  PROCESSING: 'processing',

  // Review States
  PENDING_REVIEW: 'pending_review',
  UNDER_REVIEW: 'under_review',
  QC_REVIEW: 'qc_review',
  QC_APPROVED: 'qc_approved',
  QC_REJECTED: 'qc_rejected',

  // Delivery States
  READY_FOR_DELIVERY: 'ready_for_delivery',
  DELIVERED: 'delivered',
  AWAITING_CLIENT_CONFIRMATION: 'awaiting_client_confirmation',

  // Terminal States
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
  REJECTED: 'rejected',

  // Escalation States
  ESCALATED: 'escalated',
  SLA_BREACHED: 'sla_breached',
} as const;

export type ServiceRequestStatus = typeof SERVICE_REQUEST_STATUSES[keyof typeof SERVICE_REQUEST_STATUSES];

// Status display labels
export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  [SERVICE_REQUEST_STATUSES.DRAFT]: 'Draft',
  [SERVICE_REQUEST_STATUSES.INITIATED]: 'Initiated',
  [SERVICE_REQUEST_STATUSES.PENDING_PAYMENT]: 'Pending Payment',
  [SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED]: 'Payment Received',
  [SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING]: 'Documents Pending',
  [SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED]: 'Documents Uploaded',
  [SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED]: 'Documents Verified',
  [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 'In Progress',
  [SERVICE_REQUEST_STATUSES.PROCESSING]: 'Processing',
  [SERVICE_REQUEST_STATUSES.PENDING_REVIEW]: 'Pending Review',
  [SERVICE_REQUEST_STATUSES.UNDER_REVIEW]: 'Under Review',
  [SERVICE_REQUEST_STATUSES.QC_REVIEW]: 'QC Review',
  [SERVICE_REQUEST_STATUSES.QC_APPROVED]: 'QC Approved',
  [SERVICE_REQUEST_STATUSES.QC_REJECTED]: 'QC Rejected',
  [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY]: 'Ready for Delivery',
  [SERVICE_REQUEST_STATUSES.DELIVERED]: 'Delivered',
  [SERVICE_REQUEST_STATUSES.AWAITING_CLIENT_CONFIRMATION]: 'Awaiting Confirmation',
  [SERVICE_REQUEST_STATUSES.COMPLETED]: 'Completed',
  [SERVICE_REQUEST_STATUSES.CANCELLED]: 'Cancelled',
  [SERVICE_REQUEST_STATUSES.ON_HOLD]: 'On Hold',
  [SERVICE_REQUEST_STATUSES.REJECTED]: 'Rejected',
  [SERVICE_REQUEST_STATUSES.ESCALATED]: 'Escalated',
  [SERVICE_REQUEST_STATUSES.SLA_BREACHED]: 'SLA Breached',
};

// Status colors for UI badges
export const SERVICE_REQUEST_STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  [SERVICE_REQUEST_STATUSES.DRAFT]: 'bg-gray-100 text-gray-800',
  [SERVICE_REQUEST_STATUSES.INITIATED]: 'bg-blue-100 text-blue-800',
  [SERVICE_REQUEST_STATUSES.PENDING_PAYMENT]: 'bg-yellow-100 text-yellow-800',
  [SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED]: 'bg-green-100 text-green-800',
  [SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING]: 'bg-orange-100 text-orange-800',
  [SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED]: 'bg-blue-100 text-blue-800',
  [SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED]: 'bg-green-100 text-green-800',
  [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [SERVICE_REQUEST_STATUSES.PROCESSING]: 'bg-indigo-100 text-indigo-800',
  [SERVICE_REQUEST_STATUSES.PENDING_REVIEW]: 'bg-purple-100 text-purple-800',
  [SERVICE_REQUEST_STATUSES.UNDER_REVIEW]: 'bg-purple-100 text-purple-800',
  [SERVICE_REQUEST_STATUSES.QC_REVIEW]: 'bg-violet-100 text-violet-800',
  [SERVICE_REQUEST_STATUSES.QC_APPROVED]: 'bg-emerald-100 text-emerald-800',
  [SERVICE_REQUEST_STATUSES.QC_REJECTED]: 'bg-red-100 text-red-800',
  [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY]: 'bg-cyan-100 text-cyan-800',
  [SERVICE_REQUEST_STATUSES.DELIVERED]: 'bg-teal-100 text-teal-800',
  [SERVICE_REQUEST_STATUSES.AWAITING_CLIENT_CONFIRMATION]: 'bg-amber-100 text-amber-800',
  [SERVICE_REQUEST_STATUSES.COMPLETED]: 'bg-green-100 text-green-800',
  [SERVICE_REQUEST_STATUSES.CANCELLED]: 'bg-red-100 text-red-800',
  [SERVICE_REQUEST_STATUSES.ON_HOLD]: 'bg-gray-100 text-gray-800',
  [SERVICE_REQUEST_STATUSES.REJECTED]: 'bg-red-100 text-red-800',
  [SERVICE_REQUEST_STATUSES.ESCALATED]: 'bg-orange-100 text-orange-800',
  [SERVICE_REQUEST_STATUSES.SLA_BREACHED]: 'bg-red-100 text-red-800',
};

// Status groups for filtering
export const SERVICE_REQUEST_STATUS_GROUPS = {
  INITIAL: [SERVICE_REQUEST_STATUSES.DRAFT, SERVICE_REQUEST_STATUSES.INITIATED, SERVICE_REQUEST_STATUSES.PENDING_PAYMENT],
  ACTIVE: [SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED, SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING, SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED, SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED, SERVICE_REQUEST_STATUSES.IN_PROGRESS, SERVICE_REQUEST_STATUSES.PROCESSING],
  REVIEW: [SERVICE_REQUEST_STATUSES.PENDING_REVIEW, SERVICE_REQUEST_STATUSES.UNDER_REVIEW, SERVICE_REQUEST_STATUSES.QC_REVIEW, SERVICE_REQUEST_STATUSES.QC_APPROVED, SERVICE_REQUEST_STATUSES.QC_REJECTED],
  DELIVERY: [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY, SERVICE_REQUEST_STATUSES.DELIVERED, SERVICE_REQUEST_STATUSES.AWAITING_CLIENT_CONFIRMATION],
  TERMINAL: [SERVICE_REQUEST_STATUSES.COMPLETED, SERVICE_REQUEST_STATUSES.CANCELLED, SERVICE_REQUEST_STATUSES.REJECTED],
  SPECIAL: [SERVICE_REQUEST_STATUSES.ON_HOLD, SERVICE_REQUEST_STATUSES.ESCALATED, SERVICE_REQUEST_STATUSES.SLA_BREACHED],
} as const;

// =============================================================================
// QC REVIEW STATUSES
// =============================================================================

export const QC_REVIEW_STATUSES = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REWORK_REQUIRED: 'rework_required',
} as const;

export type QCReviewStatus = typeof QC_REVIEW_STATUSES[keyof typeof QC_REVIEW_STATUSES];

export const QC_REVIEW_STATUS_LABELS: Record<QCReviewStatus, string> = {
  [QC_REVIEW_STATUSES.PENDING]: 'Pending',
  [QC_REVIEW_STATUSES.ASSIGNED]: 'Assigned',
  [QC_REVIEW_STATUSES.IN_PROGRESS]: 'In Progress',
  [QC_REVIEW_STATUSES.APPROVED]: 'Approved',
  [QC_REVIEW_STATUSES.REJECTED]: 'Rejected',
  [QC_REVIEW_STATUSES.REWORK_REQUIRED]: 'Rework Required',
};

export const QC_REVIEW_STATUS_COLORS: Record<QCReviewStatus, string> = {
  [QC_REVIEW_STATUSES.PENDING]: 'bg-yellow-100 text-yellow-800',
  [QC_REVIEW_STATUSES.ASSIGNED]: 'bg-blue-100 text-blue-800',
  [QC_REVIEW_STATUSES.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
  [QC_REVIEW_STATUSES.APPROVED]: 'bg-green-100 text-green-800',
  [QC_REVIEW_STATUSES.REJECTED]: 'bg-red-100 text-red-800',
  [QC_REVIEW_STATUSES.REWORK_REQUIRED]: 'bg-orange-100 text-orange-800',
};

// =============================================================================
// DOCUMENT VERIFICATION STATUSES
// =============================================================================

export const DOCUMENT_VERIFICATION_STATUSES = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  VERIFIED: 'verified',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type DocumentVerificationStatus = typeof DOCUMENT_VERIFICATION_STATUSES[keyof typeof DOCUMENT_VERIFICATION_STATUSES];

export const DOCUMENT_VERIFICATION_STATUS_LABELS: Record<DocumentVerificationStatus, string> = {
  [DOCUMENT_VERIFICATION_STATUSES.PENDING]: 'Pending',
  [DOCUMENT_VERIFICATION_STATUSES.UPLOADED]: 'Uploaded',
  [DOCUMENT_VERIFICATION_STATUSES.VERIFIED]: 'Verified',
  [DOCUMENT_VERIFICATION_STATUSES.APPROVED]: 'Approved',
  [DOCUMENT_VERIFICATION_STATUSES.REJECTED]: 'Rejected',
  [DOCUMENT_VERIFICATION_STATUSES.EXPIRED]: 'Expired',
};

// =============================================================================
// SLA & ESCALATION STATUSES
// =============================================================================

export const SLA_STATUSES = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  WARNING: 'warning',
  BREACHED: 'breached',
} as const;

export type SLAStatus = typeof SLA_STATUSES[keyof typeof SLA_STATUSES];

export const SLA_STATUS_LABELS: Record<SLAStatus, string> = {
  [SLA_STATUSES.ON_TRACK]: 'On Track',
  [SLA_STATUSES.AT_RISK]: 'At Risk',
  [SLA_STATUSES.WARNING]: 'Warning',
  [SLA_STATUSES.BREACHED]: 'Breached',
};

export const SLA_STATUS_COLORS: Record<SLAStatus, string> = {
  [SLA_STATUSES.ON_TRACK]: 'bg-green-100 text-green-800',
  [SLA_STATUSES.AT_RISK]: 'bg-yellow-100 text-yellow-800',
  [SLA_STATUSES.WARNING]: 'bg-orange-100 text-orange-800',
  [SLA_STATUSES.BREACHED]: 'bg-red-100 text-red-800',
};

export const ESCALATION_SEVERITIES = {
  WARNING: 'warning',
  CRITICAL: 'critical',
  BREACH: 'breach',
} as const;

export type EscalationSeverity = typeof ESCALATION_SEVERITIES[keyof typeof ESCALATION_SEVERITIES];

// =============================================================================
// LEGACY SERVICE STATUSES (for backwards compatibility)
// =============================================================================

// Service statuses (legacy - use SERVICE_REQUEST_STATUSES for new code)
export const SERVICE_STATUSES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  UNDER_REVIEW: 'UNDER_REVIEW',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

// Task statuses
export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  REWORK_REQUIRED: 'rework_required',
} as const;

// Priority levels
export const PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

// Lead stages
export const LEAD_STAGES = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST',
} as const;

// Lead sources
export const LEAD_SOURCES = {
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  AGENT: 'AGENT',
  DIRECT: 'DIRECT',
  MARKETING: 'MARKETING',
} as const;

// Business types
export const BUSINESS_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  PARTNERSHIP: 'PARTNERSHIP',
  LLP: 'LLP',
  PRIVATE_LIMITED: 'PRIVATE_LIMITED',
  PUBLIC_LIMITED: 'PUBLIC_LIMITED',
  OPC: 'OPC',
} as const;

// Document categories
export const DOCUMENT_CATEGORIES = {
  IDENTITY: 'IDENTITY',
  ADDRESS: 'ADDRESS',
  BUSINESS: 'BUSINESS',
  TAX: 'TAX',
  COMPLIANCE: 'COMPLIANCE',
  OTHER: 'OTHER',
} as const;

// Payment statuses
export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// Proposal statuses
export const PROPOSAL_STATUSES = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

// Invoice statuses
export const INVOICE_STATUSES = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

// Commission statuses
export const COMMISSION_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
} as const;

// Agent statuses
export const AGENT_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
} as const;

// Compliance deadline statuses
export const COMPLIANCE_DEADLINE_STATUSES = {
  UPCOMING: 'UPCOMING',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
  COMPLETED: 'COMPLETED',
} as const;

// Client statuses
export const CLIENT_STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

// Service categories
export const SERVICE_CATEGORIES = [
  'Company Registration',
  'GST Services',
  'Income Tax',
  'Accounting & Bookkeeping',
  'Trademark & IP',
  'Legal & Compliance',
  'Auditing',
  'Payroll & HR',
  'Annual Compliance',
  'Business Licenses',
  'Import Export Code',
  'FSSAI Registration',
  'Other Services',
];

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  ITEMS_PER_PAGE_OPTIONS: [10, 25, 50, 100],
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMM yyyy, hh:mm a',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
};

// Toast duration
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000,
  WARNING: 4000,
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'comply-flow-auth',
  THEME: 'comply-flow-theme',
  LANGUAGE: 'comply-flow-language',
  SIDEBAR_STATE: 'comply-flow-sidebar',
};

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  CLIENT_PORTAL: '/client-portal',
  SERVICES: '/services',
  DOCUMENTS: '/documents',
  PAYMENTS: '/payments',
  COMPLIANCE_CALENDAR: '/compliance-calendar',
  LEADS: '/leads',
  PROPOSALS: '/proposals',
  OPERATIONS: '/operations',
  TASKS: '/tasks',
  ADMIN: '/admin',
  AGENT: '/agent',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOT_FOUND: '/404',
} as const;

// Indian states
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// Chart colors
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

// Status colors
export const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  UNDER_REVIEW: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

// Priority colors
export const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};
