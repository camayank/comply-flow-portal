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

// ============================================================================
// Compliance Type Configuration
// ============================================================================

export type ComplianceType =
  | 'statutory'
  | 'tax'
  | 'labor'
  | 'corporate'
  | 'industry_specific'
  | 'environmental'
  | 'data_privacy';

export interface ComplianceTypeConfig {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  priority: number;
}

export const complianceTypeConfig: Record<ComplianceType, ComplianceTypeConfig> = {
  statutory: {
    label: 'Statutory',
    description: 'Government mandated registrations and filings',
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    priority: 1,
  },
  tax: {
    label: 'Tax Compliance',
    description: 'Income tax, GST, and other tax filings',
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    priority: 2,
  },
  labor: {
    label: 'Labor & Employment',
    description: 'PF, ESI, and employment regulations',
    icon: Briefcase,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    priority: 3,
  },
  corporate: {
    label: 'Corporate Governance',
    description: 'Board meetings, ROC filings, and governance',
    icon: Building2,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    priority: 4,
  },
  industry_specific: {
    label: 'Industry Specific',
    description: 'Sector-specific licenses and certifications',
    icon: Target,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    priority: 5,
  },
  environmental: {
    label: 'Environmental',
    description: 'Pollution control and environmental clearances',
    icon: Sprout,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900',
    priority: 6,
  },
  data_privacy: {
    label: 'Data Privacy',
    description: 'GDPR, data protection, and privacy compliance',
    icon: Shield,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-900',
    priority: 7,
  },
};

// ============================================================================
// Funding Round Configuration
// ============================================================================

export type FundingRound =
  | 'bootstrapped'
  | 'friends_family'
  | 'angel'
  | 'pre_seed'
  | 'seed'
  | 'series_a'
  | 'series_b'
  | 'series_c'
  | 'series_d_plus'
  | 'pre_ipo'
  | 'ipo';

export interface FundingRoundConfig {
  label: string;
  shortLabel: string;
  description: string;
  typicalRange: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  order: number;
  typicalValuation?: string;
}

export const fundingRoundConfig: Record<FundingRound, FundingRoundConfig> = {
  bootstrapped: {
    label: 'Bootstrapped',
    shortLabel: 'Boot',
    description: 'Self-funded with personal savings',
    typicalRange: '₹0 - ₹50L',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900',
    icon: Rocket,
    order: 0,
  },
  friends_family: {
    label: 'Friends & Family',
    shortLabel: 'F&F',
    description: 'Initial funding from personal network',
    typicalRange: '₹10L - ₹1Cr',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900',
    icon: Briefcase,
    order: 1,
  },
  angel: {
    label: 'Angel Round',
    shortLabel: 'Angel',
    description: 'Investment from angel investors',
    typicalRange: '₹50L - ₹5Cr',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    icon: Crown,
    order: 2,
  },
  pre_seed: {
    label: 'Pre-Seed',
    shortLabel: 'Pre-Seed',
    description: 'Early institutional investment',
    typicalRange: '₹1Cr - ₹10Cr',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    icon: Sprout,
    order: 3,
    typicalValuation: '₹5Cr - ₹25Cr',
  },
  seed: {
    label: 'Seed Round',
    shortLabel: 'Seed',
    description: 'First significant institutional round',
    typicalRange: '₹5Cr - ₹25Cr',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900',
    icon: Sprout,
    order: 4,
    typicalValuation: '₹25Cr - ₹100Cr',
  },
  series_a: {
    label: 'Series A',
    shortLabel: 'Ser A',
    description: 'First major venture round',
    typicalRange: '₹25Cr - ₹100Cr',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    icon: TrendingUp,
    order: 5,
    typicalValuation: '₹100Cr - ₹500Cr',
  },
  series_b: {
    label: 'Series B',
    shortLabel: 'Ser B',
    description: 'Scaling and expansion round',
    typicalRange: '₹75Cr - ₹300Cr',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    icon: Zap,
    order: 6,
    typicalValuation: '₹300Cr - ₹1500Cr',
  },
  series_c: {
    label: 'Series C',
    shortLabel: 'Ser C',
    description: 'Growth and market dominance',
    typicalRange: '₹150Cr - ₹750Cr',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    icon: Building2,
    order: 7,
    typicalValuation: '₹750Cr - ₹5000Cr',
  },
  series_d_plus: {
    label: 'Series D+',
    shortLabel: 'Ser D+',
    description: 'Late-stage growth rounds',
    typicalRange: '₹300Cr+',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-900',
    icon: Crown,
    order: 8,
    typicalValuation: '₹2000Cr+',
  },
  pre_ipo: {
    label: 'Pre-IPO',
    shortLabel: 'Pre-IPO',
    description: 'Final private round before public listing',
    typicalRange: '₹500Cr+',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    icon: Flag,
    order: 9,
    typicalValuation: '₹5000Cr+',
  },
  ipo: {
    label: 'IPO',
    shortLabel: 'IPO',
    description: 'Initial Public Offering',
    typicalRange: 'Market determined',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    icon: Globe,
    order: 10,
    typicalValuation: 'Public market',
  },
};

export const fundingRoundOrder: FundingRound[] = [
  'bootstrapped',
  'friends_family',
  'angel',
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'series_c',
  'series_d_plus',
  'pre_ipo',
  'ipo',
];

// ============================================================================
// Achievement/Badge Configuration
// ============================================================================

export type AchievementType =
  | 'compliance'
  | 'funding'
  | 'growth'
  | 'milestone'
  | 'certification'
  | 'special';

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

export interface AchievementTypeConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const achievementTypeConfig: Record<AchievementType, AchievementTypeConfig> = {
  compliance: {
    label: 'Compliance',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
  },
  funding: {
    label: 'Funding',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
  },
  growth: {
    label: 'Growth',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
  },
  milestone: {
    label: 'Milestone',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
  },
  certification: {
    label: 'Certification',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
  },
  special: {
    label: 'Special',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-900',
  },
};

export const rarityConfig: Record<Achievement['rarity'], { label: string; color: string; bgColor: string }> = {
  common: {
    label: 'Common',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900',
  },
  uncommon: {
    label: 'Uncommon',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900',
  },
  rare: {
    label: 'Rare',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
  },
  epic: {
    label: 'Epic',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
  },
  legendary: {
    label: 'Legendary',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
  },
};

// ============================================================================
// Document Category Configuration (per Stage)
// ============================================================================

export interface StageDocumentCategory {
  id: string;
  label: string;
  description: string;
  required: boolean;
  icon: LucideIcon;
}

export const stageDocuments: Record<LifecycleStage, StageDocumentCategory[]> = {
  bootstrap: [
    { id: 'coi', label: 'Certificate of Incorporation', description: 'Company registration certificate', required: true, icon: FileText },
    { id: 'moa', label: 'MOA/AOA', description: 'Memorandum and Articles of Association', required: true, icon: FileText },
    { id: 'pan', label: 'PAN Card', description: 'Company PAN card', required: true, icon: FileText },
    { id: 'tan', label: 'TAN Registration', description: 'Tax Deduction Account Number', required: true, icon: FileText },
    { id: 'bank', label: 'Bank Account Proof', description: 'Bank account opening documents', required: true, icon: FileText },
  ],
  seed: [
    { id: 'gst', label: 'GST Registration', description: 'GST certificate', required: true, icon: FileText },
    { id: 'shop_est', label: 'Shop & Establishment', description: 'Shop and establishment license', required: true, icon: FileText },
    { id: 'ip_filing', label: 'IP Filings', description: 'Trademark/Patent applications', required: false, icon: FileText },
    { id: 'emp_agreements', label: 'Employment Agreements', description: 'Standard employment contracts', required: true, icon: FileText },
  ],
  early_growth: [
    { id: 'pf_esi', label: 'PF/ESI Registration', description: 'Provident fund and ESI registration', required: true, icon: FileText },
    { id: 'professional_tax', label: 'Professional Tax', description: 'Professional tax registration', required: true, icon: FileText },
    { id: 'iso', label: 'ISO Certifications', description: 'Quality management certifications', required: false, icon: FileText },
    { id: 'data_protection', label: 'Data Protection Policy', description: 'Privacy and data protection documents', required: true, icon: FileText },
  ],
  growth: [
    { id: 'internal_audit', label: 'Internal Audit Report', description: 'Internal audit setup and reports', required: true, icon: FileText },
    { id: 'governance', label: 'Governance Policies', description: 'Corporate governance documents', required: true, icon: FileText },
    { id: 'board_composition', label: 'Board Composition', description: 'Board member documentation', required: true, icon: FileText },
    { id: 'hr_policies', label: 'HR Policy Manual', description: 'Comprehensive HR policies', required: true, icon: FileText },
  ],
  scaling: [
    { id: 'soc2', label: 'SOC 2 Compliance', description: 'SOC 2 audit reports', required: false, icon: Shield },
    { id: 'intl_compliance', label: 'International Compliance', description: 'Cross-border compliance documents', required: false, icon: Globe },
    { id: 'transfer_pricing', label: 'Transfer Pricing', description: 'Transfer pricing documentation', required: false, icon: FileText },
    { id: 'erm', label: 'Risk Management', description: 'Enterprise risk management framework', required: true, icon: Shield },
  ],
  pre_ipo: [
    { id: 'sebi', label: 'SEBI Compliance', description: 'SEBI registration and filings', required: true, icon: Shield },
    { id: 'independent_directors', label: 'Independent Directors', description: 'Independent director appointments', required: true, icon: FileText },
    { id: 'audit_committee', label: 'Audit Committee', description: 'Audit committee formation', required: true, icon: FileText },
    { id: 'drhp', label: 'DRHP', description: 'Draft Red Herring Prospectus', required: true, icon: FileText },
  ],
  public: [
    { id: 'quarterly_reports', label: 'Quarterly Reports', description: 'Quarterly financial statements', required: true, icon: FileText },
    { id: 'agm', label: 'AGM Minutes', description: 'Annual general meeting records', required: true, icon: FileText },
    { id: 'insider_trading', label: 'Insider Trading Policy', description: 'Insider trading compliance', required: true, icon: Shield },
    { id: 'continuous_disclosure', label: 'Continuous Disclosure', description: 'Material event disclosures', required: true, icon: FileText },
  ],
  exit_ready: [
    { id: 'audit_history', label: 'Audit History', description: 'Complete audit records', required: true, icon: FileText },
    { id: 'legal_docs', label: 'Legal Documentation', description: 'Clean legal records', required: true, icon: FileText },
    { id: 'ip_ownership', label: 'IP Ownership', description: 'IP ownership clarity documents', required: true, icon: FileText },
    { id: 'esop_vesting', label: 'ESOP Vesting', description: 'Employee stock vesting records', required: true, icon: FileText },
  ],
};

// ============================================================================
// Lifecycle Metrics Configuration
// ============================================================================

export interface LifecycleMetricConfig {
  id: string;
  label: string;
  description: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  icon: LucideIcon;
  goodThreshold?: number;
  warningThreshold?: number;
}

export const lifecycleMetrics: LifecycleMetricConfig[] = [
  {
    id: 'compliance_score',
    label: 'Compliance Score',
    description: 'Overall compliance health percentage',
    format: 'percentage',
    icon: Shield,
    goodThreshold: 80,
    warningThreshold: 60,
  },
  {
    id: 'stage_progress',
    label: 'Stage Progress',
    description: 'Progress through current stage',
    format: 'percentage',
    icon: TrendingUp,
    goodThreshold: 70,
    warningThreshold: 40,
  },
  {
    id: 'pending_actions',
    label: 'Pending Actions',
    description: 'Number of pending compliance actions',
    format: 'number',
    icon: Clock,
  },
  {
    id: 'completed_milestones',
    label: 'Milestones Completed',
    description: 'Total milestones achieved',
    format: 'number',
    icon: Target,
  },
  {
    id: 'funding_readiness',
    label: 'Funding Readiness',
    description: 'Readiness for next funding round',
    format: 'percentage',
    icon: DollarSign,
    goodThreshold: 80,
    warningThreshold: 50,
  },
  {
    id: 'company_age',
    label: 'Company Age',
    description: 'Time since incorporation',
    format: 'duration',
    icon: Clock,
  },
];

// ============================================================================
// Additional Utility Functions
// ============================================================================

/**
 * Get recommended services for a lifecycle stage
 */
export function getRecommendedServicesForStage(stage: LifecycleStage): string[] {
  const stageConfig = stageConfigs[stage];
  return stageConfig.typicalRequirements;
}

/**
 * Get compliance types relevant for a stage
 */
export function getComplianceTypesForStage(stage: LifecycleStage): ComplianceType[] {
  const stageToCompliance: Record<LifecycleStage, ComplianceType[]> = {
    bootstrap: ['statutory', 'tax'],
    seed: ['statutory', 'tax', 'labor'],
    early_growth: ['statutory', 'tax', 'labor', 'data_privacy'],
    growth: ['statutory', 'tax', 'labor', 'corporate', 'data_privacy'],
    scaling: ['statutory', 'tax', 'labor', 'corporate', 'data_privacy', 'industry_specific'],
    pre_ipo: ['statutory', 'tax', 'labor', 'corporate', 'data_privacy', 'industry_specific'],
    public: ['statutory', 'tax', 'labor', 'corporate', 'data_privacy', 'industry_specific', 'environmental'],
    exit_ready: ['statutory', 'tax', 'labor', 'corporate'],
  };
  return stageToCompliance[stage];
}

/**
 * Calculate days in current stage
 */
export function getDaysInStage(stageEnteredAt: Date | string): number {
  const entered = new Date(stageEnteredAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - entered.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format company age
 */
export function formatCompanyAge(incorporationDate: Date | string): string {
  const incorporated = new Date(incorporationDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - incorporated.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;

  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${remainingMonths}m`;
}

/**
 * Get stage from funding round
 */
export function getStageFromFundingRound(round: FundingRound): LifecycleStage {
  const fundingToStage: Record<FundingRound, LifecycleStage> = {
    bootstrapped: 'bootstrap',
    friends_family: 'bootstrap',
    angel: 'seed',
    pre_seed: 'seed',
    seed: 'seed',
    series_a: 'early_growth',
    series_b: 'growth',
    series_c: 'scaling',
    series_d_plus: 'scaling',
    pre_ipo: 'pre_ipo',
    ipo: 'public',
  };
  return fundingToStage[round];
}

/**
 * Calculate transition readiness percentage
 */
export function calculateTransitionReadiness(
  completedRequirements: number,
  totalRequirements: number
): number {
  if (totalRequirements === 0) return 100;
  return Math.round((completedRequirements / totalRequirements) * 100);
}

/**
 * Get urgency color class
 */
export function getUrgencyColorClass(urgency: ActionUrgency): string {
  const colors: Record<ActionUrgency, string> = {
    critical: 'text-red-600 bg-red-100 dark:bg-red-900',
    high: 'text-orange-600 bg-orange-100 dark:bg-orange-900',
    medium: 'text-amber-600 bg-amber-100 dark:bg-amber-900',
    low: 'text-blue-600 bg-blue-100 dark:bg-blue-900',
  };
  return colors[urgency];
}

/**
 * Format currency in Indian format
 */
export function formatCurrency(
  amount: number | string | null | undefined,
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
