import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Building2,
  Briefcase,
  Workflow,
  Webhook,
  KeyRound,
  Shield,
  Settings,
  Upload,
  GitBranch,
  CheckCircle,
  LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const adminNavigation: AdminNavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        description: 'Admin overview and metrics',
      },
      {
        label: 'Reports',
        href: '/admin/reports',
        icon: FileBarChart,
        description: 'Analytics and reports',
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: Users,
        description: 'Manage user accounts',
      },
      {
        label: 'Clients',
        href: '/admin/clients',
        icon: Building2,
        description: 'Client management',
      },
      {
        label: 'Services',
        href: '/admin/services',
        icon: Briefcase,
        description: 'Service configuration',
      },
      {
        label: 'Blueprints',
        href: '/admin/blueprints',
        icon: Workflow,
        description: 'Workflow blueprints',
      },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        label: 'Status Management',
        href: '/admin/status-management',
        icon: CheckCircle,
        description: 'Status workflow configuration',
      },
      {
        label: 'Bulk Upload',
        href: '/admin/bulk-upload',
        icon: Upload,
        description: 'Import data in bulk',
      },
      {
        label: 'Workflow Import',
        href: '/admin/workflow-import',
        icon: GitBranch,
        description: 'Import workflow definitions',
      },
      {
        label: 'Settings',
        href: '/admin/configuration',
        icon: Settings,
        description: 'System configuration',
      },
    ],
  },
  {
    title: 'Developer',
    items: [
      {
        label: 'Webhooks',
        href: '/admin/webhooks',
        icon: Webhook,
        description: 'Webhook configuration',
      },
      {
        label: 'API Keys',
        href: '/admin/api-keys',
        icon: KeyRound,
        description: 'API key management',
      },
      {
        label: 'Access Reviews',
        href: '/admin/access-reviews',
        icon: Shield,
        description: 'Security access reviews',
      },
    ],
  },
];

export const adminRoutes = adminNavigation.flatMap((section) =>
  section.items.map((item) => item.href)
);

export function getAdminNavItem(href: string): AdminNavItem | undefined {
  for (const section of adminNavigation) {
    const item = section.items.find((i) => i.href === href);
    if (item) return item;
  }
  return undefined;
}
