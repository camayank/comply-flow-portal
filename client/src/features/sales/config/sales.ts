import {
  Target,
  Phone,
  FileCheck,
  Send,
  Handshake,
  Trophy,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Users,
  PhoneCall,
  Mail,
  Megaphone,
  Building2,
  UserPlus,
  MessageSquare,
  Calendar,
  BarChart,
  FileText,
  Briefcase,
  UserCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Lead Stage Configuration
// ============================================================================

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface LeadStageConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  order: number;
  isTerminal: boolean;
}

export const leadStageConfig: Record<LeadStage, LeadStageConfig> = {
  new: {
    label: 'New',
    description: 'Fresh lead, not yet contacted',
    color: 'bg-slate-500',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: Target,
    order: 0,
    isTerminal: false,
  },
  contacted: {
    label: 'Contacted',
    description: 'Initial contact made',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Phone,
    order: 1,
    isTerminal: false,
  },
  qualified: {
    label: 'Qualified',
    description: 'Lead qualified for proposal',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: FileCheck,
    order: 2,
    isTerminal: false,
  },
  proposal_sent: {
    label: 'Proposal Sent',
    description: 'Proposal shared with client',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Send,
    order: 3,
    isTerminal: false,
  },
  negotiation: {
    label: 'Negotiation',
    description: 'In active negotiation',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: Handshake,
    order: 4,
    isTerminal: false,
  },
  won: {
    label: 'Won',
    description: 'Deal closed successfully',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: Trophy,
    order: 5,
    isTerminal: true,
  },
  lost: {
    label: 'Lost',
    description: 'Deal lost or closed',
    color: 'bg-red-500',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
    order: 6,
    isTerminal: true,
  },
};

// ============================================================================
// Lead Priority Configuration
// ============================================================================

export type LeadPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface LeadPriorityConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  weight: number;
}

export const leadPriorityConfig: Record<LeadPriority, LeadPriorityConfig> = {
  urgent: {
    label: 'Urgent',
    description: 'Requires immediate attention',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: AlertTriangle,
    weight: 4,
  },
  high: {
    label: 'High',
    description: 'High priority lead',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: AlertCircle,
    weight: 3,
  },
  medium: {
    label: 'Medium',
    description: 'Standard priority',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Clock,
    weight: 2,
  },
  low: {
    label: 'Low',
    description: 'Can be addressed later',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: Minus,
    weight: 1,
  },
};

// ============================================================================
// Lead Source Configuration
// ============================================================================

export type LeadSource =
  | 'website'
  | 'referral'
  | 'cold_call'
  | 'email_campaign'
  | 'social_media'
  | 'event'
  | 'partner'
  | 'direct'
  | 'whatsapp';

export interface LeadSourceConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

export const leadSourceConfig: Record<LeadSource, LeadSourceConfig> = {
  website: {
    label: 'Website',
    description: 'Organic website lead',
    color: 'blue',
    icon: Globe,
  },
  referral: {
    label: 'Referral',
    description: 'Referred by existing client',
    color: 'emerald',
    icon: Users,
  },
  cold_call: {
    label: 'Cold Call',
    description: 'Outbound cold call',
    color: 'purple',
    icon: PhoneCall,
  },
  email_campaign: {
    label: 'Email Campaign',
    description: 'Marketing email campaign',
    color: 'amber',
    icon: Mail,
  },
  social_media: {
    label: 'Social Media',
    description: 'Social media channel',
    color: 'pink',
    icon: Megaphone,
  },
  event: {
    label: 'Event',
    description: 'Trade show or event',
    color: 'indigo',
    icon: Calendar,
  },
  partner: {
    label: 'Partner',
    description: 'Channel partner referral',
    color: 'teal',
    icon: Building2,
  },
  direct: {
    label: 'Direct',
    description: 'Direct outreach',
    color: 'slate',
    icon: UserPlus,
  },
  whatsapp: {
    label: 'WhatsApp',
    description: 'WhatsApp inquiry',
    color: 'green',
    icon: MessageSquare,
  },
};

// ============================================================================
// Proposal Status Configuration
// ============================================================================

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'revised_sent'
  | 'viewed'
  | 'negotiation'
  | 'accepted'
  | 'rejected'
  | 'expired';

export interface ProposalStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  order: number;
  isTerminal: boolean;
}

export const proposalStatusConfig: Record<ProposalStatus, ProposalStatusConfig> = {
  draft: {
    label: 'Draft',
    description: 'Proposal being prepared',
    color: 'bg-slate-500',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: FileText,
    order: 0,
    isTerminal: false,
  },
  sent: {
    label: 'Sent',
    description: 'Proposal sent to client',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Send,
    order: 1,
    isTerminal: false,
  },
  revised_sent: {
    label: 'Revised',
    description: 'Revised proposal sent',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: FileCheck,
    order: 2,
    isTerminal: false,
  },
  viewed: {
    label: 'Viewed',
    description: 'Client viewed proposal',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: CheckCircle,
    order: 3,
    isTerminal: false,
  },
  negotiation: {
    label: 'Negotiation',
    description: 'In active negotiation',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: Handshake,
    order: 4,
    isTerminal: false,
  },
  accepted: {
    label: 'Accepted',
    description: 'Proposal accepted',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: Trophy,
    order: 5,
    isTerminal: true,
  },
  rejected: {
    label: 'Rejected',
    description: 'Proposal rejected',
    color: 'bg-red-500',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
    order: 6,
    isTerminal: true,
  },
  expired: {
    label: 'Expired',
    description: 'Proposal validity expired',
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    icon: Clock,
    order: 7,
    isTerminal: true,
  },
};

// ============================================================================
// Payment Status Configuration
// ============================================================================

export type PaymentStatus = 'pending' | 'partial' | 'full' | 'overdue' | 'refunded';

export interface PaymentStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export const paymentStatusConfig: Record<PaymentStatus, PaymentStatusConfig> = {
  pending: {
    label: 'Pending',
    description: 'Payment not received',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: Clock,
  },
  partial: {
    label: 'Partial',
    description: 'Partial payment received',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: DollarSign,
  },
  full: {
    label: 'Full',
    description: 'Full payment received',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    description: 'Payment overdue',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: AlertTriangle,
  },
  refunded: {
    label: 'Refunded',
    description: 'Payment refunded',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: DollarSign,
  },
};

// ============================================================================
// Deal Value Configuration
// ============================================================================

export type DealSize = 'small' | 'medium' | 'large' | 'enterprise';

export interface DealSizeConfig {
  label: string;
  description: string;
  minValue: number;
  maxValue: number | null;
  color: string;
}

export const dealSizeConfig: Record<DealSize, DealSizeConfig> = {
  small: {
    label: 'Small',
    description: 'Small deal',
    minValue: 0,
    maxValue: 50000,
    color: 'slate',
  },
  medium: {
    label: 'Medium',
    description: 'Medium deal',
    minValue: 50001,
    maxValue: 200000,
    color: 'blue',
  },
  large: {
    label: 'Large',
    description: 'Large deal',
    minValue: 200001,
    maxValue: 500000,
    color: 'purple',
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Enterprise deal',
    minValue: 500001,
    maxValue: null,
    color: 'amber',
  },
};

export function getDealSize(value: number): DealSize {
  if (value <= 50000) return 'small';
  if (value <= 200000) return 'medium';
  if (value <= 500000) return 'large';
  return 'enterprise';
}

// ============================================================================
// Value Change Configuration
// ============================================================================

export type ValueTrend = 'up' | 'down' | 'stable';

export interface ValueTrendConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

export const valueTrendConfig: Record<ValueTrend, ValueTrendConfig> = {
  up: {
    label: 'Increasing',
    color: 'text-emerald-600',
    icon: TrendingUp,
  },
  down: {
    label: 'Decreasing',
    color: 'text-red-600',
    icon: TrendingDown,
  },
  stable: {
    label: 'Stable',
    color: 'text-slate-600',
    icon: Minus,
  },
};

// ============================================================================
// Qualified Lead Status Configuration
// ============================================================================

export type QualifiedLeadStatus =
  | 'qualified'
  | 'not_qualified'
  | 'needs_nurturing'
  | 'ready_for_proposal';

export interface QualifiedLeadStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export const qualifiedLeadStatusConfig: Record<QualifiedLeadStatus, QualifiedLeadStatusConfig> = {
  qualified: {
    label: 'Qualified',
    description: 'Lead meets qualification criteria',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: UserCheck,
  },
  not_qualified: {
    label: 'Not Qualified',
    description: 'Lead does not meet criteria',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
  needs_nurturing: {
    label: 'Needs Nurturing',
    description: 'Lead needs further engagement',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Clock,
  },
  ready_for_proposal: {
    label: 'Ready for Proposal',
    description: 'Lead ready to receive proposal',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: FileText,
  },
};

// ============================================================================
// Navigation Configuration
// ============================================================================

export interface SalesNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const salesNavigation: SalesNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/sales',
    icon: BarChart,
    description: 'Sales overview',
  },
  {
    id: 'leads',
    label: 'Lead Management',
    href: '/sales/leads',
    icon: Target,
    description: 'Manage sales leads',
  },
  {
    id: 'pipeline',
    label: 'Lead Pipeline',
    href: '/sales/pipeline',
    icon: TrendingUp,
    description: 'Visual pipeline view',
  },
  {
    id: 'proposals',
    label: 'Proposals',
    href: '/sales/proposals',
    icon: FileText,
    description: 'Manage proposals',
  },
  {
    id: 'pre-sales',
    label: 'Pre-Sales',
    href: '/sales/pre-sales',
    icon: Briefcase,
    description: 'Pre-sales activities',
  },
  {
    id: 'post-sales',
    label: 'Post-Sales',
    href: '/sales/post-sales',
    icon: UserCheck,
    description: 'Post-sales follow-up',
  },
  {
    id: 'upsell',
    label: 'Upsell Engine',
    href: '/sales/upsell',
    icon: TrendingUp,
    description: 'Upsell opportunities',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/sales/settings',
    icon: Settings,
    description: 'Sales configuration',
  },
];

// ============================================================================
// Pipeline Stage Order (for Kanban views)
// ============================================================================

export const pipelineStageOrder: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
];

// ============================================================================
// Sales Metrics Configuration
// ============================================================================

export interface SalesMetricConfig {
  id: string;
  label: string;
  description: string;
  format: 'number' | 'currency' | 'percentage' | 'duration';
  icon: LucideIcon;
}

export const salesMetrics: SalesMetricConfig[] = [
  {
    id: 'total_leads',
    label: 'Total Leads',
    description: 'Total number of leads',
    format: 'number',
    icon: Target,
  },
  {
    id: 'qualified_leads',
    label: 'Qualified Leads',
    description: 'Leads that passed qualification',
    format: 'number',
    icon: UserCheck,
  },
  {
    id: 'pipeline_value',
    label: 'Pipeline Value',
    description: 'Total value in pipeline',
    format: 'currency',
    icon: DollarSign,
  },
  {
    id: 'conversion_rate',
    label: 'Conversion Rate',
    description: 'Lead to client conversion',
    format: 'percentage',
    icon: TrendingUp,
  },
  {
    id: 'avg_deal_size',
    label: 'Avg Deal Size',
    description: 'Average deal value',
    format: 'currency',
    icon: DollarSign,
  },
  {
    id: 'avg_sales_cycle',
    label: 'Sales Cycle',
    description: 'Average days to close',
    format: 'duration',
    icon: Clock,
  },
];

// ============================================================================
// Follow-up Configuration
// ============================================================================

export type FollowUpType = 'call' | 'email' | 'meeting' | 'demo' | 'proposal_review';

export interface FollowUpTypeConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
  defaultDurationMinutes: number;
}

export const followUpTypeConfig: Record<FollowUpType, FollowUpTypeConfig> = {
  call: {
    label: 'Call',
    description: 'Phone follow-up',
    color: 'blue',
    icon: Phone,
    defaultDurationMinutes: 15,
  },
  email: {
    label: 'Email',
    description: 'Email follow-up',
    color: 'purple',
    icon: Mail,
    defaultDurationMinutes: 0,
  },
  meeting: {
    label: 'Meeting',
    description: 'In-person or virtual meeting',
    color: 'emerald',
    icon: Users,
    defaultDurationMinutes: 60,
  },
  demo: {
    label: 'Demo',
    description: 'Product demonstration',
    color: 'amber',
    icon: Briefcase,
    defaultDurationMinutes: 45,
  },
  proposal_review: {
    label: 'Proposal Review',
    description: 'Review proposal with client',
    color: 'indigo',
    icon: FileText,
    defaultDurationMinutes: 30,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

export function formatCurrency(
  amount: string | number | null | undefined,
  currency: string = 'INR'
): string {
  if (amount === null || amount === undefined) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
}

export function getLeadAgeInDays(createdAt: Date | string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isFollowUpOverdue(followUpDate: Date | string | null): boolean {
  if (!followUpDate) return false;
  const date = new Date(followUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function getNextBusinessDay(days: number = 1): Date {
  const date = new Date();
  let daysAdded = 0;
  while (daysAdded < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  return date;
}
