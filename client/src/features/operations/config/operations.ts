import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSearch,
  Package,
  Send,
  PauseCircle,
  Loader2,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  Bell,
  BellRing,
  AlertCircle,
  Flame,
  Users,
  ClipboardList,
  FileText,
  Settings,
  BarChart,
  MessageSquare,
  LucideIcon,
} from 'lucide-react';
import type { WorkItemStatus } from '../components/WorkItemStatusBadge';
import type { Priority } from '../components/PriorityBadge';
import type { QCStatus } from '../components/QCReviewCard';
import type { EscalationLevel } from '../components/EscalationIndicator';

// Work Item Status Configuration
export interface WorkItemStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  sortOrder: number;
  isTerminal: boolean;
}

export const workItemStatusConfig: Record<WorkItemStatus, WorkItemStatusConfig> = {
  pending: {
    label: 'Pending',
    description: 'Waiting to be picked up',
    color: 'slate',
    icon: Clock,
    sortOrder: 0,
    isTerminal: false,
  },
  in_progress: {
    label: 'In Progress',
    description: 'Currently being worked on',
    color: 'blue',
    icon: Loader2,
    sortOrder: 1,
    isTerminal: false,
  },
  review: {
    label: 'In Review',
    description: 'Under quality review',
    color: 'purple',
    icon: FileSearch,
    sortOrder: 2,
    isTerminal: false,
  },
  approved: {
    label: 'Approved',
    description: 'Passed quality review',
    color: 'emerald',
    icon: CheckCircle,
    sortOrder: 3,
    isTerminal: false,
  },
  rejected: {
    label: 'Rejected',
    description: 'Failed quality review',
    color: 'red',
    icon: XCircle,
    sortOrder: 4,
    isTerminal: false,
  },
  revision_required: {
    label: 'Revision Required',
    description: 'Needs corrections',
    color: 'amber',
    icon: AlertTriangle,
    sortOrder: 5,
    isTerminal: false,
  },
  ready_for_delivery: {
    label: 'Ready for Delivery',
    description: 'Prepared for client delivery',
    color: 'indigo',
    icon: Package,
    sortOrder: 6,
    isTerminal: false,
  },
  delivered: {
    label: 'Delivered',
    description: 'Sent to client',
    color: 'teal',
    icon: Send,
    sortOrder: 7,
    isTerminal: false,
  },
  completed: {
    label: 'Completed',
    description: 'Work item finished',
    color: 'emerald',
    icon: CheckCircle,
    sortOrder: 8,
    isTerminal: true,
  },
  on_hold: {
    label: 'On Hold',
    description: 'Temporarily paused',
    color: 'orange',
    icon: PauseCircle,
    sortOrder: 9,
    isTerminal: false,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Work item cancelled',
    color: 'slate',
    icon: XCircle,
    sortOrder: 10,
    isTerminal: true,
  },
};

// Priority Configuration
export interface PriorityConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  sortOrder: number;
  slaMultiplier: number;
}

export const priorityConfig: Record<Priority, PriorityConfig> = {
  critical: {
    label: 'Critical',
    description: 'Requires immediate attention',
    color: 'red',
    icon: Zap,
    sortOrder: 0,
    slaMultiplier: 0.5,
  },
  high: {
    label: 'High',
    description: 'Should be addressed urgently',
    color: 'orange',
    icon: ArrowUp,
    sortOrder: 1,
    slaMultiplier: 0.75,
  },
  medium: {
    label: 'Medium',
    description: 'Normal priority',
    color: 'amber',
    icon: Minus,
    sortOrder: 2,
    slaMultiplier: 1.0,
  },
  low: {
    label: 'Low',
    description: 'Can be addressed when convenient',
    color: 'blue',
    icon: ArrowDown,
    sortOrder: 3,
    slaMultiplier: 1.5,
  },
  none: {
    label: 'None',
    description: 'No priority assigned',
    color: 'slate',
    icon: Minus,
    sortOrder: 4,
    slaMultiplier: 2.0,
  },
};

// Escalation Level Configuration
export interface EscalationLevelConfig {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: LucideIcon;
  notifyRoles: string[];
  autoReassign: boolean;
}

export const escalationLevelConfig: Record<EscalationLevel, EscalationLevelConfig> = {
  0: {
    label: 'No Escalation',
    shortLabel: 'None',
    description: 'Normal processing',
    color: 'slate',
    icon: Bell,
    notifyRoles: [],
    autoReassign: false,
  },
  1: {
    label: 'Level 1 - Attention',
    shortLabel: 'L1',
    description: 'Team lead attention required',
    color: 'blue',
    icon: Bell,
    notifyRoles: ['team_lead'],
    autoReassign: false,
  },
  2: {
    label: 'Level 2 - Warning',
    shortLabel: 'L2',
    description: 'Manager notification',
    color: 'amber',
    icon: BellRing,
    notifyRoles: ['team_lead', 'manager'],
    autoReassign: false,
  },
  3: {
    label: 'Level 3 - Urgent',
    shortLabel: 'L3',
    description: 'Senior management involved',
    color: 'orange',
    icon: AlertTriangle,
    notifyRoles: ['manager', 'senior_manager'],
    autoReassign: true,
  },
  4: {
    label: 'Level 4 - Critical',
    shortLabel: 'L4',
    description: 'Executive attention',
    color: 'red',
    icon: AlertCircle,
    notifyRoles: ['senior_manager', 'director'],
    autoReassign: true,
  },
  5: {
    label: 'Level 5 - Emergency',
    shortLabel: 'L5',
    description: 'All hands emergency',
    color: 'red',
    icon: Flame,
    notifyRoles: ['director', 'vp', 'ceo'],
    autoReassign: true,
  },
};

// SLA Thresholds
export interface SLAThreshold {
  status: 'on_track' | 'at_risk' | 'critical' | 'breached';
  label: string;
  color: string;
  minHoursRemaining?: number;
  maxHoursRemaining?: number;
}

export const slaThresholds: SLAThreshold[] = [
  {
    status: 'breached',
    label: 'SLA Breached',
    color: 'red',
    maxHoursRemaining: 0,
  },
  {
    status: 'critical',
    label: 'Critical',
    color: 'red',
    minHoursRemaining: 0,
    maxHoursRemaining: 4,
  },
  {
    status: 'at_risk',
    label: 'At Risk',
    color: 'orange',
    minHoursRemaining: 4,
    maxHoursRemaining: 24,
  },
  {
    status: 'on_track',
    label: 'On Track',
    color: 'emerald',
    minHoursRemaining: 24,
  },
];

export function getSLAStatus(hoursRemaining: number): SLAThreshold {
  if (hoursRemaining < 0) return slaThresholds[0]; // breached
  if (hoursRemaining <= 4) return slaThresholds[1]; // critical
  if (hoursRemaining <= 24) return slaThresholds[2]; // at_risk
  return slaThresholds[3]; // on_track
}

// QC Status Configuration
export interface QCStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  allowsEditing: boolean;
}

export const qcStatusConfig: Record<QCStatus, QCStatusConfig> = {
  pending: {
    label: 'Pending Review',
    description: 'Awaiting QC review',
    color: 'slate',
    icon: Clock,
    allowsEditing: true,
  },
  in_progress: {
    label: 'In Review',
    description: 'QC review in progress',
    color: 'blue',
    icon: FileSearch,
    allowsEditing: false,
  },
  approved: {
    label: 'Approved',
    description: 'Passed QC review',
    color: 'emerald',
    icon: CheckCircle,
    allowsEditing: false,
  },
  rejected: {
    label: 'Rejected',
    description: 'Failed QC review',
    color: 'red',
    icon: XCircle,
    allowsEditing: true,
  },
  revision_required: {
    label: 'Revision Required',
    description: 'Changes needed',
    color: 'amber',
    icon: AlertTriangle,
    allowsEditing: true,
  },
};

// Work Item Types
export interface WorkItemTypeConfig {
  key: string;
  label: string;
  description: string;
  defaultPriority: Priority;
  defaultSLAHours: number;
}

export const workItemTypes: WorkItemTypeConfig[] = [
  {
    key: 'service_request',
    label: 'Service Request',
    description: 'Client service request',
    defaultPriority: 'medium',
    defaultSLAHours: 48,
  },
  {
    key: 'document_review',
    label: 'Document Review',
    description: 'Document verification task',
    defaultPriority: 'medium',
    defaultSLAHours: 24,
  },
  {
    key: 'compliance_filing',
    label: 'Compliance Filing',
    description: 'Statutory compliance filing',
    defaultPriority: 'high',
    defaultSLAHours: 72,
  },
  {
    key: 'qc_review',
    label: 'QC Review',
    description: 'Quality control review',
    defaultPriority: 'medium',
    defaultSLAHours: 8,
  },
  {
    key: 'client_communication',
    label: 'Client Communication',
    description: 'Client inquiry or follow-up',
    defaultPriority: 'medium',
    defaultSLAHours: 4,
  },
  {
    key: 'escalation',
    label: 'Escalation',
    description: 'Escalated item',
    defaultPriority: 'high',
    defaultSLAHours: 4,
  },
];

// Operations Navigation
export interface OpsNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
}

export const operationsNavigation: OpsNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/operations',
    icon: BarChart,
    description: 'Operations overview',
  },
  {
    id: 'work-queue',
    label: 'Work Queue',
    href: '/operations/work-queue',
    icon: ClipboardList,
    description: 'Active work items',
  },
  {
    id: 'document-review',
    label: 'Document Review',
    href: '/operations/documents',
    icon: FileText,
    description: 'Document verification',
  },
  {
    id: 'team',
    label: 'Team',
    href: '/operations/team',
    icon: Users,
    description: 'Team management',
  },
  {
    id: 'escalations',
    label: 'Escalations',
    href: '/operations/escalations',
    icon: AlertTriangle,
    description: 'Escalated items',
  },
  {
    id: 'communications',
    label: 'Communications',
    href: '/operations/communications',
    icon: MessageSquare,
    description: 'Client communications',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/operations/settings',
    icon: Settings,
    description: 'Operations settings',
  },
];

// Team Roles
export interface TeamRole {
  key: string;
  label: string;
  description: string;
  maxWorkload: number;
  canEscalate: boolean;
  canAssign: boolean;
}

export const teamRoles: TeamRole[] = [
  {
    key: 'operations_associate',
    label: 'Operations Associate',
    description: 'Handles day-to-day operations tasks',
    maxWorkload: 15,
    canEscalate: true,
    canAssign: false,
  },
  {
    key: 'senior_associate',
    label: 'Senior Associate',
    description: 'Handles complex tasks and reviews',
    maxWorkload: 12,
    canEscalate: true,
    canAssign: true,
  },
  {
    key: 'team_lead',
    label: 'Team Lead',
    description: 'Leads a team of associates',
    maxWorkload: 8,
    canEscalate: true,
    canAssign: true,
  },
  {
    key: 'qc_reviewer',
    label: 'QC Reviewer',
    description: 'Quality control specialist',
    maxWorkload: 20,
    canEscalate: true,
    canAssign: false,
  },
  {
    key: 'manager',
    label: 'Operations Manager',
    description: 'Manages operations team',
    maxWorkload: 5,
    canEscalate: true,
    canAssign: true,
  },
];

// Quality Score Thresholds
export interface QualityScoreThreshold {
  min: number;
  max: number;
  label: string;
  color: string;
}

export const qualityScoreThresholds: QualityScoreThreshold[] = [
  { min: 90, max: 100, label: 'Excellent', color: 'emerald' },
  { min: 70, max: 89, label: 'Good', color: 'blue' },
  { min: 50, max: 69, label: 'Fair', color: 'amber' },
  { min: 0, max: 49, label: 'Poor', color: 'red' },
];

export function getQualityScoreThreshold(score: number): QualityScoreThreshold {
  return (
    qualityScoreThresholds.find((t) => score >= t.min && score <= t.max) ||
    qualityScoreThresholds[qualityScoreThresholds.length - 1]
  );
}
