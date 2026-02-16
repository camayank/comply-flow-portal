import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  Loader2,
  Lightbulb,
  Zap,
  Users,
  MessageSquare,
  FileText,
  BarChart,
  Settings,
  BookOpen,
  Target,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Health Score Configuration
// ============================================================================

export type HealthTrend = 'up' | 'down' | 'stable';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface HealthScoreThreshold {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

export const healthScoreThresholds: HealthScoreThreshold[] = [
  { min: 80, max: 100, label: 'Excellent', color: 'emerald', description: 'Customer is highly engaged and satisfied' },
  { min: 60, max: 79, label: 'Good', color: 'blue', description: 'Customer is healthy with minor concerns' },
  { min: 40, max: 59, label: 'Fair', color: 'amber', description: 'Customer needs attention' },
  { min: 20, max: 39, label: 'Poor', color: 'orange', description: 'Customer is at risk' },
  { min: 0, max: 19, label: 'Critical', color: 'red', description: 'Immediate intervention required' },
];

export interface RiskLevelConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  actionRequired: boolean;
}

export const riskLevelConfig: Record<RiskLevel, RiskLevelConfig> = {
  low: {
    label: 'Low Risk',
    description: 'Customer is stable and engaged',
    color: 'emerald',
    icon: CheckCircle,
    actionRequired: false,
  },
  medium: {
    label: 'Medium Risk',
    description: 'Customer showing some warning signs',
    color: 'amber',
    icon: AlertTriangle,
    actionRequired: false,
  },
  high: {
    label: 'High Risk',
    description: 'Customer needs immediate attention',
    color: 'orange',
    icon: AlertTriangle,
    actionRequired: true,
  },
  critical: {
    label: 'Critical',
    description: 'Customer at high risk of churn',
    color: 'red',
    icon: XCircle,
    actionRequired: true,
  },
};

export interface TrendConfig {
  label: string;
  icon: LucideIcon;
  color: string;
}

export const trendConfig: Record<HealthTrend, TrendConfig> = {
  up: { label: 'Improving', icon: TrendingUp, color: 'emerald' },
  down: { label: 'Declining', icon: TrendingDown, color: 'red' },
  stable: { label: 'Stable', icon: Minus, color: 'slate' },
};

export function getHealthScoreThreshold(score: number): HealthScoreThreshold {
  return healthScoreThresholds.find(t => score >= t.min && score <= t.max) ||
    healthScoreThresholds[healthScoreThresholds.length - 1];
}

// ============================================================================
// Renewal Status Configuration
// ============================================================================

export type RenewalStatus =
  | 'upcoming'
  | 'in_progress'
  | 'at_risk'
  | 'renewed'
  | 'churned'
  | 'downgraded';

export interface RenewalStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  isTerminal: boolean;
}

export const renewalStatusConfig: Record<RenewalStatus, RenewalStatusConfig> = {
  upcoming: {
    label: 'Upcoming',
    description: 'Renewal due in the future',
    color: 'blue',
    icon: Calendar,
    isTerminal: false,
  },
  in_progress: {
    label: 'In Progress',
    description: 'Renewal discussions underway',
    color: 'amber',
    icon: RefreshCw,
    isTerminal: false,
  },
  at_risk: {
    label: 'At Risk',
    description: 'Renewal may not happen',
    color: 'red',
    icon: AlertTriangle,
    isTerminal: false,
  },
  renewed: {
    label: 'Renewed',
    description: 'Contract successfully renewed',
    color: 'emerald',
    icon: CheckCircle,
    isTerminal: true,
  },
  churned: {
    label: 'Churned',
    description: 'Customer did not renew',
    color: 'slate',
    icon: XCircle,
    isTerminal: true,
  },
  downgraded: {
    label: 'Downgraded',
    description: 'Renewed at lower value',
    color: 'orange',
    icon: TrendingDown,
    isTerminal: true,
  },
};

export interface RenewalUrgencyConfig {
  label: string;
  color: string;
  minDays?: number;
  maxDays?: number;
}

export const renewalUrgencyThresholds: RenewalUrgencyConfig[] = [
  { label: 'Overdue', color: 'red', maxDays: -1 },
  { label: 'Critical', color: 'red', minDays: 0, maxDays: 7 },
  { label: 'Urgent', color: 'orange', minDays: 8, maxDays: 30 },
  { label: 'Soon', color: 'amber', minDays: 31, maxDays: 90 },
  { label: 'Normal', color: 'slate', minDays: 91 },
];

export function getRenewalUrgency(daysUntilRenewal: number): RenewalUrgencyConfig {
  if (daysUntilRenewal < 0) return renewalUrgencyThresholds[0];
  if (daysUntilRenewal <= 7) return renewalUrgencyThresholds[1];
  if (daysUntilRenewal <= 30) return renewalUrgencyThresholds[2];
  if (daysUntilRenewal <= 90) return renewalUrgencyThresholds[3];
  return renewalUrgencyThresholds[4];
}

// ============================================================================
// Playbook Execution Configuration
// ============================================================================

export type ExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface ExecutionStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  isTerminal: boolean;
  allowsAdvance: boolean;
}

export const executionStatusConfig: Record<ExecutionStatus, ExecutionStatusConfig> = {
  pending: {
    label: 'Pending',
    description: 'Execution not yet started',
    color: 'slate',
    icon: Clock,
    isTerminal: false,
    allowsAdvance: false,
  },
  in_progress: {
    label: 'In Progress',
    description: 'Execution is active',
    color: 'blue',
    icon: Loader2,
    isTerminal: false,
    allowsAdvance: true,
  },
  paused: {
    label: 'Paused',
    description: 'Execution temporarily paused',
    color: 'amber',
    icon: Pause,
    isTerminal: false,
    allowsAdvance: false,
  },
  completed: {
    label: 'Completed',
    description: 'Execution finished successfully',
    color: 'emerald',
    icon: CheckCircle,
    isTerminal: true,
    allowsAdvance: false,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Execution was cancelled',
    color: 'slate',
    icon: XCircle,
    isTerminal: true,
    allowsAdvance: false,
  },
  failed: {
    label: 'Failed',
    description: 'Execution failed',
    color: 'red',
    icon: XCircle,
    isTerminal: true,
    allowsAdvance: false,
  },
};

// ============================================================================
// Playbook Trigger Types
// ============================================================================

export type PlaybookTriggerType =
  | 'onboarding'
  | 'health_drop'
  | 'renewal_due'
  | 'at_risk'
  | 'upsell_opportunity'
  | 'manual';

export interface PlaybookTriggerConfig {
  label: string;
  description: string;
  icon: LucideIcon;
  isAutomatic: boolean;
}

export const playbookTriggerConfig: Record<PlaybookTriggerType, PlaybookTriggerConfig> = {
  onboarding: {
    label: 'Onboarding',
    description: 'Triggered when new client is onboarded',
    icon: Users,
    isAutomatic: true,
  },
  health_drop: {
    label: 'Health Drop',
    description: 'Triggered when health score drops significantly',
    icon: TrendingDown,
    isAutomatic: true,
  },
  renewal_due: {
    label: 'Renewal Due',
    description: 'Triggered when renewal date approaches',
    icon: RefreshCw,
    isAutomatic: true,
  },
  at_risk: {
    label: 'At Risk',
    description: 'Triggered when client becomes at risk',
    icon: AlertTriangle,
    isAutomatic: true,
  },
  upsell_opportunity: {
    label: 'Upsell Opportunity',
    description: 'Triggered when upsell opportunity detected',
    icon: TrendingUp,
    isAutomatic: true,
  },
  manual: {
    label: 'Manual',
    description: 'Manually triggered by CSM',
    icon: Play,
    isAutomatic: false,
  },
};

// ============================================================================
// Recommendation Configuration
// ============================================================================

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationType =
  | 'upsell'
  | 'retention'
  | 'engagement'
  | 'compliance'
  | 'support'
  | 'onboarding'
  | 'renewal'
  | 'health';

export interface RecommendationPriorityConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  sortOrder: number;
}

export const recommendationPriorityConfig: Record<RecommendationPriority, RecommendationPriorityConfig> = {
  critical: {
    label: 'Critical',
    description: 'Requires immediate action',
    color: 'red',
    icon: Zap,
    sortOrder: 0,
  },
  high: {
    label: 'High',
    description: 'Should be addressed urgently',
    color: 'orange',
    icon: AlertTriangle,
    sortOrder: 1,
  },
  medium: {
    label: 'Medium',
    description: 'Normal priority',
    color: 'amber',
    icon: Clock,
    sortOrder: 2,
  },
  low: {
    label: 'Low',
    description: 'Can be addressed when convenient',
    color: 'slate',
    icon: Clock,
    sortOrder: 3,
  },
};

export interface RecommendationTypeConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

export const recommendationTypeConfig: Record<RecommendationType, RecommendationTypeConfig> = {
  upsell: {
    label: 'Upsell',
    description: 'Opportunity to expand account',
    color: 'emerald',
    icon: TrendingUp,
  },
  retention: {
    label: 'Retention',
    description: 'Action to retain customer',
    color: 'blue',
    icon: Users,
  },
  engagement: {
    label: 'Engagement',
    description: 'Improve customer engagement',
    color: 'purple',
    icon: MessageSquare,
  },
  compliance: {
    label: 'Compliance',
    description: 'Compliance-related action',
    color: 'amber',
    icon: FileText,
  },
  support: {
    label: 'Support',
    description: 'Support-related action',
    color: 'pink',
    icon: MessageSquare,
  },
  onboarding: {
    label: 'Onboarding',
    description: 'Onboarding-related action',
    color: 'teal',
    icon: Users,
  },
  renewal: {
    label: 'Renewal',
    description: 'Renewal-related action',
    color: 'indigo',
    icon: RefreshCw,
  },
  health: {
    label: 'Health',
    description: 'Health score improvement',
    color: 'rose',
    icon: Heart,
  },
};

// ============================================================================
// Confidence Thresholds
// ============================================================================

export interface ConfidenceThreshold {
  min: number;
  max: number;
  label: string;
  color: string;
}

export const confidenceThresholds: ConfidenceThreshold[] = [
  { min: 80, max: 100, label: 'High', color: 'emerald' },
  { min: 60, max: 79, label: 'Moderate', color: 'blue' },
  { min: 40, max: 59, label: 'Low', color: 'amber' },
  { min: 0, max: 39, label: 'Very Low', color: 'slate' },
];

export function getConfidenceLevel(confidence: number): ConfidenceThreshold {
  return confidenceThresholds.find(t => confidence >= t.min && confidence <= t.max) ||
    confidenceThresholds[confidenceThresholds.length - 1];
}

// ============================================================================
// Navigation Configuration
// ============================================================================

export interface CustomerSuccessNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
}

export const customerSuccessNavigation: CustomerSuccessNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/customer-success',
    icon: BarChart,
    description: 'Overview and metrics',
  },
  {
    id: 'health-scores',
    label: 'Health Scores',
    href: '/customer-success/health',
    icon: Heart,
    description: 'Customer health tracking',
  },
  {
    id: 'renewals',
    label: 'Renewals',
    href: '/customer-success/renewals',
    icon: RefreshCw,
    description: 'Renewal pipeline',
  },
  {
    id: 'playbooks',
    label: 'Playbooks',
    href: '/customer-success/playbooks',
    icon: BookOpen,
    description: 'Success playbooks',
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    href: '/customer-success/recommendations',
    icon: Lightbulb,
    description: 'AI-powered recommendations',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/customer-success/settings',
    icon: Settings,
    description: 'CS settings',
  },
];

// ============================================================================
// Contract Types
// ============================================================================

export interface ContractTypeConfig {
  key: string;
  label: string;
  description: string;
  defaultDurationMonths: number;
}

export const contractTypes: ContractTypeConfig[] = [
  {
    key: 'subscription',
    label: 'Subscription',
    description: 'Monthly or annual subscription',
    defaultDurationMonths: 12,
  },
  {
    key: 'retainer',
    label: 'Retainer',
    description: 'Ongoing service retainer',
    defaultDurationMonths: 12,
  },
  {
    key: 'project',
    label: 'Project',
    description: 'Fixed-term project engagement',
    defaultDurationMonths: 6,
  },
  {
    key: 'annual',
    label: 'Annual Contract',
    description: 'Annual service agreement',
    defaultDurationMonths: 12,
  },
];

// ============================================================================
// Health Score Weights
// ============================================================================

export interface HealthScoreWeight {
  key: string;
  label: string;
  weight: number;
  description: string;
}

export const healthScoreWeights: HealthScoreWeight[] = [
  { key: 'engagement', label: 'Engagement', weight: 0.25, description: 'Platform activity and usage' },
  { key: 'compliance', label: 'Compliance', weight: 0.20, description: 'Compliance adherence' },
  { key: 'payment', label: 'Payment', weight: 0.20, description: 'Payment history' },
  { key: 'support', label: 'Support', weight: 0.15, description: 'Support ticket sentiment' },
  { key: 'productUsage', label: 'Product Usage', weight: 0.20, description: 'Feature adoption' },
];
