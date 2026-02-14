/**
 * Super Admin Portal Navigation Configuration
 *
 * Shared navigation config for all super-admin-facing screens.
 * Ensures consistent navigation across the entire super admin portal.
 */

import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Percent,
  Shield,
  Server,
  BarChart3,
  Briefcase,
  Settings,
  Users,
  Globe,
} from 'lucide-react';

export const SUPER_ADMIN_NAVIGATION = [
  {
    title: "Dashboard",
    items: [
      { label: "Overview", href: "/super-admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Platform Management",
    items: [
      { label: "Tenant Management", href: "/super-admin/tenants", icon: Building2 },
      { label: "Services", href: "/super-admin/services", icon: Briefcase },
      { label: "Operations", href: "/super-admin/operations", icon: Server },
    ],
  },
  {
    title: "Financial",
    items: [
      { label: "Pricing Engine", href: "/super-admin/pricing", icon: DollarSign },
      { label: "Commission Config", href: "/super-admin/commissions", icon: Percent },
    ],
  },
  {
    title: "Security & Settings",
    items: [
      { label: "Security Center", href: "/super-admin/security", icon: Shield },
      { label: "Platform Settings", href: "/super-admin/settings", icon: Settings },
    ],
  },
];

// Route mappings for canonical URLs
export const SUPER_ADMIN_ROUTE_ALIASES = {
  '/super-admin': '/super-admin/dashboard',
};

// Helper to get the canonical route
export function getCanonicalSuperAdminRoute(path: string): string {
  return SUPER_ADMIN_ROUTE_ALIASES[path as keyof typeof SUPER_ADMIN_ROUTE_ALIASES] || path;
}
