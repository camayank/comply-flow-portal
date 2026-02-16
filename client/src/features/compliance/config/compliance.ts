import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileCheck,
  Scale,
  Building2,
  Briefcase,
  Users,
  LucideIcon,
} from 'lucide-react';
import type { ComplianceStatus } from '../components/ComplianceStatusBadge';
import type { AlertSeverity } from '../components/ComplianceAlertCard';

// Compliance Categories
export interface ComplianceCategory {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const complianceCategories: ComplianceCategory[] = [
  {
    id: 'regulatory',
    label: 'Regulatory',
    description: 'Government and regulatory body compliance',
    icon: Scale,
    color: 'text-blue-600',
  },
  {
    id: 'corporate',
    label: 'Corporate',
    description: 'Company registration and corporate filings',
    icon: Building2,
    color: 'text-purple-600',
  },
  {
    id: 'tax',
    label: 'Tax',
    description: 'Tax filings and returns',
    icon: FileText,
    color: 'text-emerald-600',
  },
  {
    id: 'labor',
    label: 'Labor & Employment',
    description: 'Employment and labor law compliance',
    icon: Users,
    color: 'text-orange-600',
  },
  {
    id: 'licenses',
    label: 'Licenses & Permits',
    description: 'Business licenses and permits',
    icon: FileCheck,
    color: 'text-indigo-600',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    description: 'Contract renewals and obligations',
    icon: Briefcase,
    color: 'text-slate-600',
  },
];

// Compliance Status Configuration
export interface StatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  priority: number;
}

export const statusConfig: Record<ComplianceStatus, StatusConfig> = {
  compliant: {
    label: 'Compliant',
    description: 'All requirements met',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950',
    priority: 5,
  },
  non_compliant: {
    label: 'Non-Compliant',
    description: 'Requirements not met',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-950',
    priority: 1,
  },
  pending: {
    label: 'Pending',
    description: 'Awaiting action or approval',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-950',
    priority: 3,
  },
  expired: {
    label: 'Expired',
    description: 'Past due date',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-950',
    priority: 2,
  },
  at_risk: {
    label: 'At Risk',
    description: 'Approaching deadline or issues detected',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    priority: 2,
  },
  exempt: {
    label: 'Exempt',
    description: 'Not applicable to this entity',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-950',
    priority: 6,
  },
  not_applicable: {
    label: 'N/A',
    description: 'Not applicable',
    color: 'slate',
    bgColor: 'bg-slate-50 dark:bg-slate-900',
    priority: 7,
  },
  in_progress: {
    label: 'In Progress',
    description: 'Currently being worked on',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    priority: 4,
  },
};

// Alert Severity Configuration
export interface SeverityConfig {
  label: string;
  description: string;
  color: string;
  priority: number;
}

export const severityConfig: Record<AlertSeverity, SeverityConfig> = {
  critical: {
    label: 'Critical',
    description: 'Immediate action required',
    color: 'red',
    priority: 1,
  },
  warning: {
    label: 'Warning',
    description: 'Action needed soon',
    color: 'amber',
    priority: 2,
  },
  info: {
    label: 'Info',
    description: 'For your awareness',
    color: 'blue',
    priority: 3,
  },
  success: {
    label: 'Success',
    description: 'Positive update',
    color: 'emerald',
    priority: 4,
  },
};

// Score Thresholds
export interface ScoreThreshold {
  min: number;
  max: number;
  label: string;
  color: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const scoreThresholds: ScoreThreshold[] = [
  { min: 80, max: 100, label: 'Excellent', color: 'emerald', riskLevel: 'low' },
  { min: 60, max: 79, label: 'Good', color: 'amber', riskLevel: 'medium' },
  { min: 40, max: 59, label: 'Fair', color: 'orange', riskLevel: 'high' },
  { min: 0, max: 39, label: 'Poor', color: 'red', riskLevel: 'critical' },
];

export function getScoreThreshold(score: number): ScoreThreshold {
  return (
    scoreThresholds.find((t) => score >= t.min && score <= t.max) ||
    scoreThresholds[scoreThresholds.length - 1]
  );
}

// Default Reminder Days
export const reminderDays = [1, 3, 7, 14, 30];

// Filing Frequencies
export type FilingFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'annually'
  | 'one_time'
  | 'event_based';

export interface FrequencyConfig {
  label: string;
  description: string;
  daysInterval?: number;
}

export const frequencyConfig: Record<FilingFrequency, FrequencyConfig> = {
  daily: { label: 'Daily', description: 'Every day', daysInterval: 1 },
  weekly: { label: 'Weekly', description: 'Every week', daysInterval: 7 },
  monthly: { label: 'Monthly', description: 'Every month', daysInterval: 30 },
  quarterly: { label: 'Quarterly', description: 'Every 3 months', daysInterval: 90 },
  half_yearly: { label: 'Half Yearly', description: 'Every 6 months', daysInterval: 180 },
  annually: { label: 'Annually', description: 'Every year', daysInterval: 365 },
  one_time: { label: 'One Time', description: 'Single occurrence' },
  event_based: { label: 'Event Based', description: 'Triggered by specific events' },
};

// Compliance Navigation
export interface ComplianceNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const complianceNavigation: ComplianceNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/compliance',
    icon: Shield,
    description: 'Overview of compliance status',
  },
  {
    id: 'tracker',
    label: 'Compliance Tracker',
    href: '/compliance/tracker',
    icon: CheckCircle,
    description: 'Track all compliance items',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    href: '/compliance/alerts',
    icon: AlertTriangle,
    description: 'View compliance alerts',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/compliance/calendar',
    icon: Clock,
    description: 'Upcoming deadlines',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/compliance/reports',
    icon: FileText,
    description: 'Compliance reports',
  },
];
