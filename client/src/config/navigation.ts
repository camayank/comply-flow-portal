import {
  Home,
  FileText,
  Calendar,
  Folder,
  Settings,
  Users,
  BarChart3,
  Shield,
  Briefcase,
  CheckSquare,
  MessageSquare,
  Bell,
  CreditCard,
  Building2,
  Layers,
  Activity,
  Target,
  PieChart,
  LucideIcon,
  HelpCircle,
  Gift,
  Clock,
  GraduationCap,
  UserCheck,
  TrendingUp,
  Clipboard,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export type UserRole =
  | 'client'
  | 'agent'
  | 'admin'
  | 'super_admin'
  | 'operations'
  | 'ops_manager'
  | 'ops_executive'
  | 'qc'
  | 'qc_executive'
  | 'sales'
  | 'sales_manager'
  | 'sales_executive'
  | 'hr'
  | 'customer_service'
  | 'accountant';

const CLIENT_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/portal-v2', icon: Home },
      { label: 'Services', href: '/services', icon: Briefcase },
      { label: 'My Requests', href: '/service-requests', icon: FileText },
      { label: 'Compliance', href: '/compliance-calendar', icon: Calendar },
      { label: 'Documents', href: '/vault', icon: Folder },
    ],
  },
  {
    title: 'AI Tools',
    items: [
      { label: 'AutoComply', href: '/autocomply', icon: Activity },
      { label: 'DigiScore', href: '/digiscore', icon: Target },
      { label: 'TaxTracker', href: '/taxtracker', icon: PieChart },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Messages', href: '/messages', icon: MessageSquare },
      { label: 'Support', href: '/support', icon: HelpCircle },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Billing', href: '/portal-v2/account/billing', icon: CreditCard },
      { label: 'Settings', href: '/portal-v2/account/security', icon: Settings },
    ],
  },
];

const AGENT_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/agent', icon: Home },
      { label: 'My Leads', href: '/agent/leads', icon: Users },
      { label: 'Commissions', href: '/agent/commissions', icon: CreditCard },
      { label: 'Performance', href: '/agent/performance', icon: BarChart3 },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Proposals', href: '/proposals', icon: FileText },
      { label: 'Referrals', href: '/referrals', icon: Gift },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'KYC', href: '/agent/kyc', icon: Shield },
      { label: 'Profile', href: '/agent/profile', icon: Settings },
    ],
  },
];

const OPERATIONS_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/operations', icon: Home },
      { label: 'Work Queue', href: '/work-queue', icon: Layers },
      { label: 'Documents', href: '/document-review', icon: FileText },
      { label: 'Escalations', href: '/escalations', icon: Activity },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Team Assignment', href: '/ops/team-assignment', icon: Users },
      { label: 'Status Management', href: '/status-management', icon: Clipboard },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Metrics', href: '/quality-metrics', icon: BarChart3 },
      { label: 'Performance', href: '/ops/performance', icon: TrendingUp },
      { label: 'Executive', href: '/executive-dashboard', icon: PieChart },
    ],
  },
];

const QC_NAV: NavSection[] = [
  {
    items: [
      { label: 'Review Queue', href: '/qc', icon: CheckSquare },
      { label: 'Delivery', href: '/qc-delivery-handoff', icon: FileText },
      { label: 'Metrics', href: '/quality-metrics', icon: BarChart3 },
    ],
  },
];

const SALES_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/sales', icon: Home },
      { label: 'Leads', href: '/leads', icon: Users },
      { label: 'Pipeline', href: '/lead-pipeline', icon: Activity },
      { label: 'Proposals', href: '/proposals', icon: FileText },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Referrals', href: '/referrals', icon: Gift },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Executive', href: '/executive-dashboard', icon: PieChart },
    ],
  },
];

const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/admin', icon: Home },
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Services', href: '/admin/services', icon: Briefcase },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Blueprints', href: '/admin/blueprints', icon: Layers },
      { label: 'Configuration', href: '/config', icon: Settings },
      { label: 'Bulk Upload', href: '/bulk-upload', icon: FileText },
    ],
  },
  {
    title: 'Developer',
    items: [
      { label: 'API Keys', href: '/admin/api-keys', icon: Shield },
      { label: 'Webhooks', href: '/admin/webhooks', icon: Activity },
      { label: 'Audit Log', href: '/audit-log', icon: FileText },
    ],
  },
];

const SUPER_ADMIN_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/super-admin', icon: Home },
      { label: 'Tenants', href: '/super-admin/tenants', icon: Building2 },
      { label: 'Pricing', href: '/super-admin/pricing', icon: CreditCard },
      { label: 'Analytics', href: '/super-admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Services', href: '/super-admin/services', icon: Briefcase },
      { label: 'Commissions', href: '/super-admin/commissions', icon: PieChart },
      { label: 'Security', href: '/super-admin/security', icon: Shield },
    ],
  },
];

const HR_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/hr', icon: Home },
      { label: 'Employees', href: '/hr/employees', icon: Users },
      { label: 'Attendance', href: '/hr/attendance', icon: Clock },
      { label: 'Leave', href: '/hr/leave', icon: Calendar },
    ],
  },
  {
    title: 'Development',
    items: [
      { label: 'Training', href: '/hr/training', icon: GraduationCap },
      { label: 'Performance', href: '/hr/performance', icon: BarChart3 },
      { label: 'Onboarding', href: '/hr/onboarding', icon: UserCheck },
    ],
  },
];

const CUSTOMER_SERVICE_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/customer-service', icon: Home },
      { label: 'Tickets', href: '/support', icon: MessageSquare },
      { label: 'Playbooks', href: '/playbooks', icon: FileText },
      { label: 'Renewals', href: '/renewals', icon: Activity },
    ],
  },
];

const ACCOUNTANT_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/financials', icon: Home },
      { label: 'Analytics', href: '/revenue-analytics', icon: BarChart3 },
      { label: 'Executive', href: '/executive-dashboard', icon: PieChart },
    ],
  },
];

const NAVIGATION_MAP: Record<string, NavSection[]> = {
  client: CLIENT_NAV,
  agent: AGENT_NAV,
  operations: OPERATIONS_NAV,
  ops_manager: OPERATIONS_NAV,
  ops_executive: OPERATIONS_NAV,
  ops_exec: OPERATIONS_NAV,
  ops_lead: OPERATIONS_NAV,
  qc: QC_NAV,
  qc_executive: QC_NAV,
  sales: SALES_NAV,
  sales_manager: SALES_NAV,
  sales_executive: SALES_NAV,
  admin: ADMIN_NAV,
  super_admin: SUPER_ADMIN_NAV,
  hr: HR_NAV,
  customer_service: CUSTOMER_SERVICE_NAV,
  accountant: ACCOUNTANT_NAV,
};

export function getNavigationForRole(role?: string): NavSection[] {
  if (!role) return CLIENT_NAV;
  const normalizedRole = role.toLowerCase();
  return NAVIGATION_MAP[normalizedRole] || CLIENT_NAV;
}
