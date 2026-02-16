import {
  Building,
  Building2,
  User,
  Users,
  Briefcase,
  Scale,
  FileText,
  Calculator,
  Shield,
  Receipt,
  Landmark,
  FileCheck,
  BookOpen,
  Stamp,
  CreditCard,
  Target,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  MapPin,
  IndianRupee,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Entity Type Configuration
// ============================================================================

export type EntityType =
  | 'individual'
  | 'proprietorship'
  | 'partnership'
  | 'llp'
  | 'pvt_ltd'
  | 'public_ltd'
  | 'opc'
  | 'trust'
  | 'society'
  | 'huf';

export interface EntityTypeConfig {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  requiresGst: boolean;
  requiresPan: boolean;
  minDirectors?: number;
}

export const entityTypeConfig: Record<EntityType, EntityTypeConfig> = {
  individual: {
    label: 'Individual',
    shortLabel: 'IND',
    description: 'Individual taxpayer',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: User,
    requiresGst: false,
    requiresPan: true,
  },
  proprietorship: {
    label: 'Proprietorship',
    shortLabel: 'PROP',
    description: 'Sole proprietorship business',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Briefcase,
    requiresGst: true,
    requiresPan: true,
  },
  partnership: {
    label: 'Partnership',
    shortLabel: 'PART',
    description: 'Partnership firm',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: Users,
    requiresGst: true,
    requiresPan: true,
    minDirectors: 2,
  },
  llp: {
    label: 'Limited Liability Partnership',
    shortLabel: 'LLP',
    description: 'LLP registered under LLP Act',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    icon: Scale,
    requiresGst: true,
    requiresPan: true,
    minDirectors: 2,
  },
  pvt_ltd: {
    label: 'Private Limited',
    shortLabel: 'PVT',
    description: 'Private limited company',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: Building,
    requiresGst: true,
    requiresPan: true,
    minDirectors: 2,
  },
  public_ltd: {
    label: 'Public Limited',
    shortLabel: 'PUB',
    description: 'Public limited company',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Building2,
    requiresGst: true,
    requiresPan: true,
    minDirectors: 3,
  },
  opc: {
    label: 'One Person Company',
    shortLabel: 'OPC',
    description: 'Single member company',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    icon: User,
    requiresGst: true,
    requiresPan: true,
    minDirectors: 1,
  },
  trust: {
    label: 'Trust',
    shortLabel: 'TRUST',
    description: 'Registered trust',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
    icon: Shield,
    requiresGst: false,
    requiresPan: true,
  },
  society: {
    label: 'Society',
    shortLabel: 'SOC',
    description: 'Registered society',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: Users,
    requiresGst: false,
    requiresPan: true,
  },
  huf: {
    label: 'Hindu Undivided Family',
    shortLabel: 'HUF',
    description: 'HUF entity',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    icon: Users,
    requiresGst: false,
    requiresPan: true,
  },
};

// ============================================================================
// Service Category Configuration
// ============================================================================

export type ServiceCategory =
  | 'registration'
  | 'compliance'
  | 'taxation'
  | 'legal'
  | 'accounting'
  | 'advisory';

export interface ServiceCategoryConfig {
  label: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

export const serviceCategoryConfig: Record<ServiceCategory, ServiceCategoryConfig> = {
  registration: {
    label: 'Registration',
    description: 'Business registration services',
    color: 'blue',
    icon: FileText,
  },
  compliance: {
    label: 'Compliance',
    description: 'Regulatory compliance',
    color: 'emerald',
    icon: Shield,
  },
  taxation: {
    label: 'Taxation',
    description: 'Tax filing and planning',
    color: 'amber',
    icon: Calculator,
  },
  legal: {
    label: 'Legal',
    description: 'Legal documentation',
    color: 'purple',
    icon: Scale,
  },
  accounting: {
    label: 'Accounting',
    description: 'Bookkeeping and accounting',
    color: 'indigo',
    icon: BookOpen,
  },
  advisory: {
    label: 'Advisory',
    description: 'Business advisory',
    color: 'rose',
    icon: Briefcase,
  },
};

// ============================================================================
// Service Configuration
// ============================================================================

export interface ServiceConfig {
  id: string;
  label: string;
  description: string;
  category: ServiceCategory;
  basePrice: number;
  icon: LucideIcon;
  applicableEntities: EntityType[];
  isPopular?: boolean;
}

export const serviceConfig: ServiceConfig[] = [
  // Registration Services
  {
    id: 'gst_registration',
    label: 'GST Registration',
    description: 'Register for Goods and Services Tax',
    category: 'registration',
    basePrice: 2999,
    icon: Receipt,
    applicableEntities: ['proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
    isPopular: true,
  },
  {
    id: 'company_incorporation',
    label: 'Company Incorporation',
    description: 'Register a new private limited company',
    category: 'registration',
    basePrice: 14999,
    icon: Building,
    applicableEntities: ['pvt_ltd', 'public_ltd', 'opc'],
    isPopular: true,
  },
  {
    id: 'llp_registration',
    label: 'LLP Registration',
    description: 'Register a Limited Liability Partnership',
    category: 'registration',
    basePrice: 9999,
    icon: Scale,
    applicableEntities: ['llp'],
  },
  {
    id: 'trademark_registration',
    label: 'Trademark Registration',
    description: 'Register and protect your brand',
    category: 'registration',
    basePrice: 7999,
    icon: Stamp,
    applicableEntities: ['individual', 'proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
    isPopular: true,
  },
  {
    id: 'msme_registration',
    label: 'MSME Registration',
    description: 'Register as Micro, Small or Medium Enterprise',
    category: 'registration',
    basePrice: 999,
    icon: FileCheck,
    applicableEntities: ['proprietorship', 'partnership', 'llp', 'pvt_ltd', 'opc'],
  },
  {
    id: 'fssai_registration',
    label: 'FSSAI Registration',
    description: 'Food Safety and Standards Authority license',
    category: 'registration',
    basePrice: 4999,
    icon: Shield,
    applicableEntities: ['proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
  },
  // Taxation Services
  {
    id: 'itr_filing',
    label: 'ITR Filing',
    description: 'Income Tax Return filing',
    category: 'taxation',
    basePrice: 1999,
    icon: Calculator,
    applicableEntities: ['individual', 'proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc', 'huf'],
    isPopular: true,
  },
  {
    id: 'gst_filing',
    label: 'GST Filing',
    description: 'Monthly/Quarterly GST return filing',
    category: 'taxation',
    basePrice: 999,
    icon: Receipt,
    applicableEntities: ['proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
    isPopular: true,
  },
  {
    id: 'tds_returns',
    label: 'TDS Returns',
    description: 'TDS return filing',
    category: 'taxation',
    basePrice: 1499,
    icon: CreditCard,
    applicableEntities: ['proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
  },
  {
    id: 'tax_planning',
    label: 'Tax Planning',
    description: 'Strategic tax planning advisory',
    category: 'taxation',
    basePrice: 4999,
    icon: TrendingUp,
    applicableEntities: ['individual', 'proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc', 'huf'],
  },
  // Compliance Services
  {
    id: 'annual_compliance',
    label: 'Annual Compliance',
    description: 'Complete annual compliance package',
    category: 'compliance',
    basePrice: 9999,
    icon: FileCheck,
    applicableEntities: ['llp', 'pvt_ltd', 'public_ltd', 'opc'],
    isPopular: true,
  },
  {
    id: 'roc_filing',
    label: 'ROC Filing',
    description: 'Registrar of Companies filings',
    category: 'compliance',
    basePrice: 2999,
    icon: Landmark,
    applicableEntities: ['llp', 'pvt_ltd', 'public_ltd', 'opc'],
  },
  {
    id: 'audit_services',
    label: 'Audit Services',
    description: 'Statutory audit and internal audit',
    category: 'compliance',
    basePrice: 14999,
    icon: Shield,
    applicableEntities: ['partnership', 'llp', 'pvt_ltd', 'public_ltd'],
  },
  // Accounting Services
  {
    id: 'bookkeeping',
    label: 'Bookkeeping',
    description: 'Monthly bookkeeping services',
    category: 'accounting',
    basePrice: 2999,
    icon: BookOpen,
    applicableEntities: ['proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
  },
  {
    id: 'payroll_processing',
    label: 'Payroll Processing',
    description: 'Monthly payroll management',
    category: 'accounting',
    basePrice: 1999,
    icon: IndianRupee,
    applicableEntities: ['proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
  },
  // Legal Services
  {
    id: 'legal_drafting',
    label: 'Legal Drafting',
    description: 'Contract and agreement drafting',
    category: 'legal',
    basePrice: 4999,
    icon: FileText,
    applicableEntities: ['individual', 'proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'opc'],
  },
];

// ============================================================================
// Indian States Configuration
// ============================================================================

export interface StateConfig {
  code: string;
  name: string;
  gstCode: string;
  region: 'north' | 'south' | 'east' | 'west' | 'central' | 'northeast' | 'ut';
}

export const indianStates: StateConfig[] = [
  { code: 'AP', name: 'Andhra Pradesh', gstCode: '37', region: 'south' },
  { code: 'AR', name: 'Arunachal Pradesh', gstCode: '12', region: 'northeast' },
  { code: 'AS', name: 'Assam', gstCode: '18', region: 'northeast' },
  { code: 'BR', name: 'Bihar', gstCode: '10', region: 'east' },
  { code: 'CT', name: 'Chhattisgarh', gstCode: '22', region: 'central' },
  { code: 'DL', name: 'Delhi', gstCode: '07', region: 'north' },
  { code: 'GA', name: 'Goa', gstCode: '30', region: 'west' },
  { code: 'GJ', name: 'Gujarat', gstCode: '24', region: 'west' },
  { code: 'HR', name: 'Haryana', gstCode: '06', region: 'north' },
  { code: 'HP', name: 'Himachal Pradesh', gstCode: '02', region: 'north' },
  { code: 'JH', name: 'Jharkhand', gstCode: '20', region: 'east' },
  { code: 'KA', name: 'Karnataka', gstCode: '29', region: 'south' },
  { code: 'KL', name: 'Kerala', gstCode: '32', region: 'south' },
  { code: 'MP', name: 'Madhya Pradesh', gstCode: '23', region: 'central' },
  { code: 'MH', name: 'Maharashtra', gstCode: '27', region: 'west' },
  { code: 'MN', name: 'Manipur', gstCode: '14', region: 'northeast' },
  { code: 'ML', name: 'Meghalaya', gstCode: '17', region: 'northeast' },
  { code: 'MZ', name: 'Mizoram', gstCode: '15', region: 'northeast' },
  { code: 'NL', name: 'Nagaland', gstCode: '13', region: 'northeast' },
  { code: 'OR', name: 'Odisha', gstCode: '21', region: 'east' },
  { code: 'PB', name: 'Punjab', gstCode: '03', region: 'north' },
  { code: 'RJ', name: 'Rajasthan', gstCode: '08', region: 'north' },
  { code: 'SK', name: 'Sikkim', gstCode: '11', region: 'northeast' },
  { code: 'TN', name: 'Tamil Nadu', gstCode: '33', region: 'south' },
  { code: 'TG', name: 'Telangana', gstCode: '36', region: 'south' },
  { code: 'TR', name: 'Tripura', gstCode: '16', region: 'northeast' },
  { code: 'UP', name: 'Uttar Pradesh', gstCode: '09', region: 'north' },
  { code: 'UT', name: 'Uttarakhand', gstCode: '05', region: 'north' },
  { code: 'WB', name: 'West Bengal', gstCode: '19', region: 'east' },
  // Union Territories
  { code: 'AN', name: 'Andaman & Nicobar', gstCode: '35', region: 'ut' },
  { code: 'CH', name: 'Chandigarh', gstCode: '04', region: 'ut' },
  { code: 'DN', name: 'Dadra & Nagar Haveli', gstCode: '26', region: 'ut' },
  { code: 'DD', name: 'Daman & Diu', gstCode: '25', region: 'ut' },
  { code: 'JK', name: 'Jammu & Kashmir', gstCode: '01', region: 'ut' },
  { code: 'LA', name: 'Ladakh', gstCode: '38', region: 'ut' },
  { code: 'LD', name: 'Lakshadweep', gstCode: '31', region: 'ut' },
  { code: 'PY', name: 'Puducherry', gstCode: '34', region: 'ut' },
];

// ============================================================================
// Follow-up Activity Configuration
// ============================================================================

export type FollowUpActivity =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'site_visit'
  | 'demo'
  | 'document_collection'
  | 'proposal_discussion';

export interface FollowUpActivityConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  defaultDurationMinutes: number;
  requiresScheduling: boolean;
}

export const followUpActivityConfig: Record<FollowUpActivity, FollowUpActivityConfig> = {
  call: {
    label: 'Phone Call',
    description: 'Voice call with client',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Phone,
    defaultDurationMinutes: 15,
    requiresScheduling: false,
  },
  email: {
    label: 'Email',
    description: 'Email correspondence',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: Mail,
    defaultDurationMinutes: 0,
    requiresScheduling: false,
  },
  whatsapp: {
    label: 'WhatsApp',
    description: 'WhatsApp message',
    color: 'text-green-600',
    bgColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: MessageSquare,
    defaultDurationMinutes: 0,
    requiresScheduling: false,
  },
  meeting: {
    label: 'Meeting',
    description: 'In-person or virtual meeting',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Users,
    defaultDurationMinutes: 60,
    requiresScheduling: true,
  },
  site_visit: {
    label: 'Site Visit',
    description: 'Visit client location',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: MapPin,
    defaultDurationMinutes: 120,
    requiresScheduling: true,
  },
  demo: {
    label: 'Demo',
    description: 'Service demonstration',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    icon: Target,
    defaultDurationMinutes: 45,
    requiresScheduling: true,
  },
  document_collection: {
    label: 'Document Collection',
    description: 'Collect documents from client',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
    icon: FileText,
    defaultDurationMinutes: 30,
    requiresScheduling: true,
  },
  proposal_discussion: {
    label: 'Proposal Discussion',
    description: 'Discuss proposal with client',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: Briefcase,
    defaultDurationMinutes: 45,
    requiresScheduling: true,
  },
};

// ============================================================================
// Follow-up Status Configuration
// ============================================================================

export type FollowUpStatus = 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';

export interface FollowUpStatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export const followUpStatusConfig: Record<FollowUpStatus, FollowUpStatusConfig> = {
  scheduled: {
    label: 'Scheduled',
    description: 'Follow-up is scheduled',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Calendar,
  },
  completed: {
    label: 'Completed',
    description: 'Follow-up completed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
  },
  missed: {
    label: 'Missed',
    description: 'Follow-up was missed',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
  rescheduled: {
    label: 'Rescheduled',
    description: 'Follow-up was rescheduled',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Clock,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Follow-up was cancelled',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: XCircle,
  },
};

// ============================================================================
// Lead Temperature Configuration
// ============================================================================

export type LeadTemperature = 'hot' | 'warm' | 'cold';

export interface LeadTemperatureConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  minScore: number;
  maxScore: number;
}

export const leadTemperatureConfig: Record<LeadTemperature, LeadTemperatureConfig> = {
  hot: {
    label: 'Hot',
    description: 'High intent, ready to convert',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: AlertTriangle,
    minScore: 70,
    maxScore: 100,
  },
  warm: {
    label: 'Warm',
    description: 'Interested, needs nurturing',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: AlertCircle,
    minScore: 40,
    maxScore: 69,
  },
  cold: {
    label: 'Cold',
    description: 'Low intent, long-term prospect',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Clock,
    minScore: 0,
    maxScore: 39,
  },
};

// ============================================================================
// Lead Score Factors
// ============================================================================

export interface LeadScoreFactor {
  id: string;
  label: string;
  weight: number;
  maxPoints: number;
}

export const leadScoreFactors: LeadScoreFactor[] = [
  { id: 'budget_fit', label: 'Budget Fit', weight: 20, maxPoints: 20 },
  { id: 'authority', label: 'Decision Authority', weight: 15, maxPoints: 15 },
  { id: 'need', label: 'Business Need', weight: 25, maxPoints: 25 },
  { id: 'timeline', label: 'Timeline Urgency', weight: 15, maxPoints: 15 },
  { id: 'engagement', label: 'Engagement Level', weight: 15, maxPoints: 15 },
  { id: 'fit', label: 'Service Fit', weight: 10, maxPoints: 10 },
];

// ============================================================================
// Navigation Configuration
// ============================================================================

export interface LeadNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const leadNavigation: LeadNavItem[] = [
  {
    id: 'all-leads',
    label: 'All Leads',
    href: '/leads',
    icon: Target,
    description: 'View all leads',
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    href: '/leads/pipeline',
    icon: TrendingUp,
    description: 'Lead pipeline view',
  },
  {
    id: 'follow-ups',
    label: 'Follow-ups',
    href: '/leads/follow-ups',
    icon: Calendar,
    description: 'Scheduled follow-ups',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/leads/analytics',
    icon: TrendingUp,
    description: 'Lead analytics',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get entity type configuration
 */
export function getEntityTypeConfig(entityType: string | null | undefined): EntityTypeConfig | null {
  if (!entityType) return null;
  return entityTypeConfig[entityType as EntityType] || null;
}

/**
 * Get service configuration by ID
 */
export function getServiceConfig(serviceId: string): ServiceConfig | undefined {
  return serviceConfig.find(s => s.id === serviceId);
}

/**
 * Get services applicable for an entity type
 */
export function getServicesForEntityType(entityType: EntityType): ServiceConfig[] {
  return serviceConfig.filter(s => s.applicableEntities.includes(entityType));
}

/**
 * Get state by name or code
 */
export function getStateConfig(stateNameOrCode: string): StateConfig | undefined {
  return indianStates.find(
    s => s.name.toLowerCase() === stateNameOrCode.toLowerCase() || s.code === stateNameOrCode
  );
}

/**
 * Calculate lead temperature based on score
 */
export function getLeadTemperature(score: number): LeadTemperature {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

/**
 * Format currency in Indian format
 */
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

/**
 * Calculate days until follow-up
 */
export function getDaysUntilFollowUp(followUpDate: Date | string | null): number | null {
  if (!followUpDate) return null;
  const date = new Date(followUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if follow-up is overdue
 */
export function isFollowUpOverdue(followUpDate: Date | string | null): boolean {
  const days = getDaysUntilFollowUp(followUpDate);
  return days !== null && days < 0;
}

/**
 * Check if follow-up is due today
 */
export function isFollowUpToday(followUpDate: Date | string | null): boolean {
  const days = getDaysUntilFollowUp(followUpDate);
  return days === 0;
}

/**
 * Get follow-up urgency level
 */
export function getFollowUpUrgency(
  followUpDate: Date | string | null
): 'overdue' | 'today' | 'soon' | 'upcoming' | null {
  const days = getDaysUntilFollowUp(followUpDate);
  if (days === null) return null;
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'upcoming';
}

/**
 * Calculate lead age in days
 */
export function getLeadAgeInDays(createdAt: Date | string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  // Format as Indian phone number
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Get popular services
 */
export function getPopularServices(): ServiceConfig[] {
  return serviceConfig.filter(s => s.isPopular);
}

/**
 * Group services by category
 */
export function getServicesByCategory(): Record<ServiceCategory, ServiceConfig[]> {
  return serviceConfig.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<ServiceCategory, ServiceConfig[]>);
}
