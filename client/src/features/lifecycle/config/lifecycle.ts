import {
  Rocket,
  Sprout,
  TrendingUp,
  Zap,
  Building2,
  Crown,
  Globe,
  Flag,
  Shield,
  FileText,
  DollarSign,
  Clock,
  Target,
  Briefcase,
  LucideIcon,
} from 'lucide-react';
import type { LifecycleStage } from '../components/LifecycleStageIndicator';
import type { ActionUrgency } from '../components/LifecycleActionCard';

// Stage Configuration
export interface StageConfig {
  id: LifecycleStage;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  typicalDuration: string;
  keyMetrics: string[];
  typicalRequirements: string[];
}

export const stageConfigs: Record<LifecycleStage, StageConfig> = {
  bootstrap: {
    id: 'bootstrap',
    label: 'Bootstrap',
    shortLabel: 'Boot',
    description: 'Initial setup, company registration, and foundation building',
    icon: Rocket,
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-900',
    borderColor: 'border-slate-200 dark:border-slate-800',
    typicalDuration: '0-6 months',
    keyMetrics: ['Company registration', 'Basic compliance', 'Initial documents'],
    typicalRequirements: [
      'Company incorporation',
      'PAN/TAN registration',
      'Bank account opening',
      'Initial statutory registrations',
    ],
  },
  seed: {
    id: 'seed',
    label: 'Seed',
    shortLabel: 'Seed',
    description: 'Early product development and market validation',
    icon: Sprout,
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    borderColor: 'border-blue-200 dark:border-blue-800',
    typicalDuration: '6-18 months',
    keyMetrics: ['Product MVP', 'Initial customers', 'Seed funding'],
    typicalRequirements: [
      'GST registration',
      'Shop & establishment license',
      'Employment agreements',
      'IP protection filings',
    ],
  },
  early_growth: {
    id: 'early_growth',
    label: 'Early Growth',
    shortLabel: 'Early',
    description: 'Market validation achieved, scaling operations',
    icon: TrendingUp,
    color: 'indigo',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    typicalDuration: '1-2 years',
    keyMetrics: ['Revenue growth', 'Team expansion', 'Series A readiness'],
    typicalRequirements: [
      'Professional tax registration',
      'PF/ESI registration',
      'ISO certifications',
      'Data protection compliance',
    ],
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    shortLabel: 'Growth',
    description: 'Rapid expansion with proven business model',
    icon: Zap,
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    borderColor: 'border-purple-200 dark:border-purple-800',
    typicalDuration: '2-4 years',
    keyMetrics: ['Market share', 'Profitability', 'Team size'],
    typicalRequirements: [
      'Internal audit setup',
      'Corporate governance policies',
      'Board composition requirements',
      'Advanced HR policies',
    ],
  },
  scaling: {
    id: 'scaling',
    label: 'Scaling',
    shortLabel: 'Scale',
    description: 'Enterprise-level operations and market dominance',
    icon: Building2,
    color: 'pink',
    bgColor: 'bg-pink-100 dark:bg-pink-900',
    borderColor: 'border-pink-200 dark:border-pink-800',
    typicalDuration: '3-5 years',
    keyMetrics: ['Multi-market presence', 'Enterprise clients', 'Series C+'],
    typicalRequirements: [
      'SOC 2 compliance',
      'International compliance',
      'Transfer pricing documentation',
      'Enterprise risk management',
    ],
  },
  pre_ipo: {
    id: 'pre_ipo',
    label: 'Pre-IPO',
    shortLabel: 'Pre-IPO',
    description: 'Preparing for public offering',
    icon: Crown,
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    borderColor: 'border-orange-200 dark:border-orange-800',
    typicalDuration: '1-2 years',
    keyMetrics: ['IPO readiness', 'Public market valuation', 'Audit preparation'],
    typicalRequirements: [
      'SEBI compliance',
      'Independent directors',
      'Audit committee formation',
      'DRHP preparation',
    ],
  },
  public: {
    id: 'public',
    label: 'Public',
    shortLabel: 'Public',
    description: 'Publicly traded company with regulatory obligations',
    icon: Globe,
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    typicalDuration: 'Ongoing',
    keyMetrics: ['Market cap', 'Shareholder value', 'Quarterly reporting'],
    typicalRequirements: [
      'Quarterly financial reporting',
      'Annual general meetings',
      'Insider trading compliance',
      'Continuous disclosure obligations',
    ],
  },
  exit_ready: {
    id: 'exit_ready',
    label: 'Exit Ready',
    shortLabel: 'Exit',
    description: 'Prepared for acquisition, merger, or strategic exit',
    icon: Flag,
    color: 'teal',
    bgColor: 'bg-teal-100 dark:bg-teal-900',
    borderColor: 'border-teal-200 dark:border-teal-800',
    typicalDuration: '6-18 months',
    keyMetrics: ['Valuation', 'Due diligence readiness', 'Clean cap table'],
    typicalRequirements: [
      'Complete audit history',
      'Clean legal documentation',
      'IP ownership clarity',
      'Employee stock vesting completion',
    ],
  },
};

// Stage Order (for progression)
export const stageOrder: LifecycleStage[] = [
  'bootstrap',
  'seed',
  'early_growth',
  'growth',
  'scaling',
  'pre_ipo',
  'public',
  'exit_ready',
];

// Urgency Configuration
export interface UrgencyConfig {
  label: string;
  description: string;
  color: string;
  priority: number;
  defaultEstimatedTime: string;
}

export const urgencyConfigs: Record<ActionUrgency, UrgencyConfig> = {
  critical: {
    label: 'Critical',
    description: 'Requires immediate attention to avoid penalties or legal issues',
    color: 'red',
    priority: 1,
    defaultEstimatedTime: '< 24 hours',
  },
  high: {
    label: 'High Priority',
    description: 'Should be addressed within this week',
    color: 'orange',
    priority: 2,
    defaultEstimatedTime: '1-3 days',
  },
  medium: {
    label: 'Medium Priority',
    description: 'Plan to address within two weeks',
    color: 'amber',
    priority: 3,
    defaultEstimatedTime: '1-2 weeks',
  },
  low: {
    label: 'Low Priority',
    description: 'Can be addressed when convenient',
    color: 'blue',
    priority: 4,
    defaultEstimatedTime: '2-4 weeks',
  },
};

// Lifecycle Categories
export interface LifecycleCategory {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const lifecycleCategories: LifecycleCategory[] = [
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'Regulatory and statutory compliance',
    icon: Shield,
    color: 'text-emerald-600',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    description: 'Legal and corporate documents',
    icon: FileText,
    color: 'text-blue-600',
  },
  {
    id: 'funding',
    label: 'Funding',
    description: 'Investor readiness and due diligence',
    icon: DollarSign,
    color: 'text-green-600',
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Day-to-day business operations',
    icon: Briefcase,
    color: 'text-purple-600',
  },
  {
    id: 'milestones',
    label: 'Milestones',
    description: 'Key business milestones and achievements',
    icon: Target,
    color: 'text-orange-600',
  },
  {
    id: 'deadlines',
    label: 'Deadlines',
    description: 'Upcoming filing and submission deadlines',
    icon: Clock,
    color: 'text-red-600',
  },
];

// Compliance Health Configuration
export type ComplianceHealth = 'GREEN' | 'AMBER' | 'RED';

export interface HealthConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  threshold: number;
}

export const healthConfigs: Record<ComplianceHealth, HealthConfig> = {
  GREEN: {
    label: 'Healthy',
    description: 'All compliance requirements met',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    threshold: 80,
  },
  AMBER: {
    label: 'At Risk',
    description: 'Some compliance items need attention',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800',
    threshold: 60,
  },
  RED: {
    label: 'Critical',
    description: 'Immediate action required',
    color: 'text-red-700',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    threshold: 0,
  },
};

export function getComplianceHealth(score: number): ComplianceHealth {
  if (score >= healthConfigs.GREEN.threshold) return 'GREEN';
  if (score >= healthConfigs.AMBER.threshold) return 'AMBER';
  return 'RED';
}

// Lifecycle Navigation
export interface LifecycleNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const lifecycleNavigation: LifecycleNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/lifecycle',
    icon: TrendingUp,
    description: 'Overview of your lifecycle journey',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    href: '/lifecycle/compliance',
    icon: Shield,
    description: 'Track compliance status',
  },
  {
    id: 'funding',
    label: 'Funding',
    href: '/lifecycle/funding',
    icon: DollarSign,
    description: 'Investor readiness score',
  },
  {
    id: 'documents',
    label: 'Documents',
    href: '/lifecycle/documents',
    icon: FileText,
    description: 'Document vault',
  },
  {
    id: 'services',
    label: 'Services',
    href: '/lifecycle/services',
    icon: Briefcase,
    description: 'Service catalog',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    href: '/lifecycle/timeline',
    icon: Clock,
    description: 'Stage progression',
  },
];

// Helper function to get next stage
export function getNextStage(currentStage: LifecycleStage): LifecycleStage | null {
  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
    return null;
  }
  return stageOrder[currentIndex + 1];
}

// Helper function to get stage progress percentage
export function getStageProgress(currentStage: LifecycleStage): number {
  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / stageOrder.length) * 100);
}
