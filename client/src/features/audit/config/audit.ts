import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileText,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Eye,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  Lock,
  User,
  Users,
  UserCheck,
  UserX,
  UserCog,
  Calendar,
  ClipboardList,
  Database,
  Settings,
  Hash,
  BarChart,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Audit Action Configuration
// ============================================================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'view'
  | 'download'
  | 'upload'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'unassign';

export interface AuditActionConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  isMutating: boolean;
}

export const auditActionConfig: Record<AuditAction, AuditActionConfig> = {
  create: {
    label: 'Create',
    description: 'Resource created',
    color: 'emerald',
    icon: FileText,
    isMutating: true,
  },
  update: {
    label: 'Update',
    description: 'Resource modified',
    color: 'blue',
    icon: Edit,
    isMutating: true,
  },
  delete: {
    label: 'Delete',
    description: 'Resource deleted',
    color: 'red',
    icon: Trash2,
    isMutating: true,
  },
  login: {
    label: 'Login',
    description: 'User authentication',
    color: 'purple',
    icon: LogIn,
    isMutating: false,
  },
  logout: {
    label: 'Logout',
    description: 'User session ended',
    color: 'slate',
    icon: LogOut,
    isMutating: false,
  },
  view: {
    label: 'View',
    description: 'Resource accessed',
    color: 'amber',
    icon: Eye,
    isMutating: false,
  },
  download: {
    label: 'Download',
    description: 'File downloaded',
    color: 'teal',
    icon: Download,
    isMutating: false,
  },
  upload: {
    label: 'Upload',
    description: 'File uploaded',
    color: 'indigo',
    icon: Upload,
    isMutating: true,
  },
  export: {
    label: 'Export',
    description: 'Data exported',
    color: 'cyan',
    icon: Download,
    isMutating: false,
  },
  import: {
    label: 'Import',
    description: 'Data imported',
    color: 'orange',
    icon: Upload,
    isMutating: true,
  },
  approve: {
    label: 'Approve',
    description: 'Item approved',
    color: 'emerald',
    icon: CheckCircle,
    isMutating: true,
  },
  reject: {
    label: 'Reject',
    description: 'Item rejected',
    color: 'red',
    icon: XCircle,
    isMutating: true,
  },
  assign: {
    label: 'Assign',
    description: 'Resource assigned',
    color: 'blue',
    icon: Users,
    isMutating: true,
  },
  unassign: {
    label: 'Unassign',
    description: 'Resource unassigned',
    color: 'slate',
    icon: Users,
    isMutating: true,
  },
};

// ============================================================================
// Entity Type Configuration
// ============================================================================

export type EntityType =
  | 'user'
  | 'client'
  | 'document'
  | 'service_request'
  | 'payment'
  | 'compliance'
  | 'entity'
  | 'system'
  | 'role'
  | 'permission';

export interface EntityTypeConfig {
  label: string;
  description: string;
  icon: LucideIcon;
}

export const entityTypeConfig: Record<EntityType, EntityTypeConfig> = {
  user: { label: 'User', description: 'User account', icon: User },
  client: { label: 'Client', description: 'Client account', icon: Users },
  document: { label: 'Document', description: 'Document file', icon: FileText },
  service_request: { label: 'Service Request', description: 'Service request', icon: ClipboardList },
  payment: { label: 'Payment', description: 'Payment transaction', icon: FileText },
  compliance: { label: 'Compliance', description: 'Compliance record', icon: Shield },
  entity: { label: 'Entity', description: 'Business entity', icon: FileText },
  system: { label: 'System', description: 'System configuration', icon: Settings },
  role: { label: 'Role', description: 'User role', icon: UserCog },
  permission: { label: 'Permission', description: 'Access permission', icon: Lock },
};

// ============================================================================
// Security Incident Configuration
// ============================================================================

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';

export interface IncidentSeverityConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  priority: number;
  slaHours: number;
}

export const incidentSeverityConfig: Record<IncidentSeverity, IncidentSeverityConfig> = {
  low: {
    label: 'Low',
    description: 'Minor security issue',
    color: 'blue',
    icon: Shield,
    priority: 0,
    slaHours: 72,
  },
  medium: {
    label: 'Medium',
    description: 'Moderate security concern',
    color: 'amber',
    icon: AlertCircle,
    priority: 1,
    slaHours: 24,
  },
  high: {
    label: 'High',
    description: 'Serious security threat',
    color: 'orange',
    icon: AlertTriangle,
    priority: 2,
    slaHours: 4,
  },
  critical: {
    label: 'Critical',
    description: 'Active breach or severe threat',
    color: 'red',
    icon: ShieldAlert,
    priority: 3,
    slaHours: 1,
  },
};

export interface IncidentStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  progress: number;
  isTerminal: boolean;
}

export const incidentStatusConfig: Record<IncidentStatus, IncidentStatusConfig> = {
  open: {
    label: 'Open',
    description: 'Incident reported',
    color: 'red',
    icon: ShieldX,
    progress: 0,
    isTerminal: false,
  },
  investigating: {
    label: 'Investigating',
    description: 'Under investigation',
    color: 'amber',
    icon: Loader2,
    progress: 25,
    isTerminal: false,
  },
  contained: {
    label: 'Contained',
    description: 'Threat contained',
    color: 'blue',
    icon: Shield,
    progress: 50,
    isTerminal: false,
  },
  resolved: {
    label: 'Resolved',
    description: 'Issue resolved',
    color: 'emerald',
    icon: ShieldCheck,
    progress: 75,
    isTerminal: false,
  },
  closed: {
    label: 'Closed',
    description: 'Incident closed',
    color: 'slate',
    icon: CheckCircle,
    progress: 100,
    isTerminal: true,
  },
};

// ============================================================================
// Data Request Configuration (GDPR/DPDP)
// ============================================================================

export type DataRequestType = 'erasure' | 'portability' | 'rectification' | 'restriction';
export type DataRequestStatus = 'pending' | 'verified' | 'processing' | 'completed' | 'rejected';

export interface DataRequestTypeConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  complianceArticle: string;
}

export const dataRequestTypeConfig: Record<DataRequestType, DataRequestTypeConfig> = {
  erasure: {
    label: 'Erasure',
    description: 'Right to be forgotten',
    color: 'red',
    icon: Trash2,
    complianceArticle: 'GDPR Art. 17 / DPDP Sec. 12',
  },
  portability: {
    label: 'Portability',
    description: 'Data export request',
    color: 'blue',
    icon: Download,
    complianceArticle: 'GDPR Art. 20 / DPDP Sec. 6',
  },
  rectification: {
    label: 'Rectification',
    description: 'Correct inaccurate data',
    color: 'amber',
    icon: Edit,
    complianceArticle: 'GDPR Art. 16 / DPDP Sec. 11',
  },
  restriction: {
    label: 'Restriction',
    description: 'Limit data processing',
    color: 'purple',
    icon: Lock,
    complianceArticle: 'GDPR Art. 18',
  },
};

export interface DataRequestStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  progress: number;
  isTerminal: boolean;
}

export const dataRequestStatusConfig: Record<DataRequestStatus, DataRequestStatusConfig> = {
  pending: {
    label: 'Pending',
    description: 'Awaiting verification',
    color: 'slate',
    icon: Clock,
    progress: 0,
    isTerminal: false,
  },
  verified: {
    label: 'Verified',
    description: 'Identity verified',
    color: 'blue',
    icon: CheckCircle,
    progress: 33,
    isTerminal: false,
  },
  processing: {
    label: 'Processing',
    description: 'Request being processed',
    color: 'amber',
    icon: Loader2,
    progress: 66,
    isTerminal: false,
  },
  completed: {
    label: 'Completed',
    description: 'Request fulfilled',
    color: 'emerald',
    icon: CheckCircle,
    progress: 100,
    isTerminal: true,
  },
  rejected: {
    label: 'Rejected',
    description: 'Request denied',
    color: 'red',
    icon: XCircle,
    progress: 100,
    isTerminal: true,
  },
};

// Data request SLA (in days)
export const dataRequestSLA = {
  erasure: 30,
  portability: 30,
  rectification: 30,
  restriction: 30,
};

// ============================================================================
// Access Review Configuration
// ============================================================================

export type ReviewType = 'quarterly' | 'annual' | 'termination';
export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type ReviewDecision = 'approve' | 'revoke' | 'modify';

export interface ReviewTypeConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  frequencyDays: number;
}

export const reviewTypeConfig: Record<ReviewType, ReviewTypeConfig> = {
  quarterly: {
    label: 'Quarterly',
    description: 'Periodic quarterly review',
    color: 'blue',
    icon: Calendar,
    frequencyDays: 90,
  },
  annual: {
    label: 'Annual',
    description: 'Comprehensive yearly review',
    color: 'purple',
    icon: ClipboardList,
    frequencyDays: 365,
  },
  termination: {
    label: 'Termination',
    description: 'Access revocation review',
    color: 'red',
    icon: UserX,
    frequencyDays: 0,
  },
};

export interface ReviewStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

export const reviewStatusConfig: Record<ReviewStatus, ReviewStatusConfig> = {
  pending: {
    label: 'Pending',
    description: 'Review not started',
    color: 'slate',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    description: 'Review ongoing',
    color: 'amber',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    description: 'Review finished',
    color: 'emerald',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    description: 'Past due date',
    color: 'red',
    icon: AlertTriangle,
  },
};

export interface DecisionConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

export const decisionConfig: Record<ReviewDecision, DecisionConfig> = {
  approve: {
    label: 'Approved',
    description: 'Access maintained',
    color: 'emerald',
    icon: UserCheck,
  },
  revoke: {
    label: 'Revoked',
    description: 'Access removed',
    color: 'red',
    icon: UserX,
  },
  modify: {
    label: 'Modified',
    description: 'Access changed',
    color: 'amber',
    icon: UserCog,
  },
};

// ============================================================================
// Data Classification Configuration
// ============================================================================

export type DataClassification = 'public' | 'internal' | 'confidential' | 'pii' | 'sensitive';

export interface DataClassificationConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  encryptionRequired: boolean;
  auditRequired: boolean;
  retentionYears: number;
}

export const dataClassificationConfig: Record<DataClassification, DataClassificationConfig> = {
  public: {
    label: 'Public',
    description: 'No restrictions',
    color: 'emerald',
    icon: Eye,
    encryptionRequired: false,
    auditRequired: false,
    retentionYears: 1,
  },
  internal: {
    label: 'Internal',
    description: 'Internal use only',
    color: 'blue',
    icon: Shield,
    encryptionRequired: false,
    auditRequired: false,
    retentionYears: 3,
  },
  confidential: {
    label: 'Confidential',
    description: 'Business sensitive',
    color: 'amber',
    icon: Lock,
    encryptionRequired: true,
    auditRequired: true,
    retentionYears: 7,
  },
  pii: {
    label: 'PII',
    description: 'Personal Identifiable Info',
    color: 'orange',
    icon: User,
    encryptionRequired: true,
    auditRequired: true,
    retentionYears: 7,
  },
  sensitive: {
    label: 'Sensitive',
    description: 'Highly restricted',
    color: 'red',
    icon: ShieldAlert,
    encryptionRequired: true,
    auditRequired: true,
    retentionYears: 10,
  },
};

// ============================================================================
// Navigation Configuration
// ============================================================================

export interface AuditNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const auditNavigation: AuditNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/audit',
    icon: BarChart,
    description: 'Audit overview',
  },
  {
    id: 'logs',
    label: 'Audit Logs',
    href: '/audit/logs',
    icon: FileText,
    description: 'Immutable audit trail',
  },
  {
    id: 'security-incidents',
    label: 'Security Incidents',
    href: '/audit/security-incidents',
    icon: ShieldAlert,
    description: 'Incident management',
  },
  {
    id: 'data-requests',
    label: 'Data Requests',
    href: '/audit/data-requests',
    icon: Database,
    description: 'GDPR/DPDP requests',
  },
  {
    id: 'access-reviews',
    label: 'Access Reviews',
    href: '/audit/access-reviews',
    icon: UserCheck,
    description: 'Periodic access reviews',
  },
  {
    id: 'classifications',
    label: 'Data Classifications',
    href: '/audit/classifications',
    icon: Lock,
    description: 'Data sensitivity levels',
  },
  {
    id: 'chain-verification',
    label: 'Chain Verification',
    href: '/audit/verify',
    icon: Hash,
    description: 'Verify audit chain',
  },
];

// ============================================================================
// Compliance Frameworks
// ============================================================================

export interface ComplianceFramework {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
}

export const complianceFrameworks: ComplianceFramework[] = [
  {
    id: 'gdpr',
    name: 'General Data Protection Regulation',
    abbreviation: 'GDPR',
    description: 'EU data protection regulation',
  },
  {
    id: 'dpdp',
    name: 'Digital Personal Data Protection',
    abbreviation: 'DPDP',
    description: 'India data protection act',
  },
  {
    id: 'soc2',
    name: 'SOC 2',
    abbreviation: 'SOC 2',
    description: 'Service Organization Control 2',
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    abbreviation: 'ISO 27001',
    description: 'Information security management',
  },
];
