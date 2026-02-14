/**
 * Admin Portal Navigation Configuration
 *
 * Shared navigation config for all admin-facing screens.
 * Ensures consistent navigation across the entire admin portal.
 */

import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Building2,
  Briefcase,
  Workflow,
  Settings,
  Key,
  Webhook,
  ShieldCheck,
  Upload,
  Server,
} from 'lucide-react';

export const ADMIN_NAVIGATION = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Services", href: "/admin/services", icon: Briefcase },
      { label: "Blueprints", href: "/admin/blueprints", icon: Workflow },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "API Keys", href: "/admin/api-keys", icon: Key },
      { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
      { label: "Bulk Upload", href: "/admin/bulk-upload", icon: Upload },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Access Reviews", href: "/admin/access-reviews", icon: ShieldCheck },
      { label: "Configuration", href: "/admin/config", icon: Settings },
    ],
  },
];

// Route mappings for canonical URLs
export const ADMIN_ROUTE_ALIASES = {
  '/admin': '/admin/dashboard',
  '/admin-control': '/admin/dashboard',
  '/admin/enterprise': '/admin/blueprints',
  '/enterprise-config': '/admin/blueprints',
  '/developer/api-keys': '/admin/api-keys',
};

// Helper to get the canonical route
export function getCanonicalAdminRoute(path: string): string {
  return ADMIN_ROUTE_ALIASES[path as keyof typeof ADMIN_ROUTE_ALIASES] || path;
}
