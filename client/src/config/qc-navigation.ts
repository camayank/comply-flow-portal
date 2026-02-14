/**
 * QC Portal Navigation Configuration
 *
 * Shared navigation config for all QC-facing screens.
 * Ensures consistent navigation across the entire QC portal.
 */

import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  BarChart3,
  Settings,
  FileSearch,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const QC_NAVIGATION = [
  {
    title: "Dashboard",
    items: [
      { label: "Overview", href: "/qc", icon: LayoutDashboard },
    ],
  },
  {
    title: "Work Management",
    items: [
      { label: "Review Queue", href: "/qc/queue", icon: ClipboardCheck },
      { label: "Delivery Handoff", href: "/qc-delivery-handoff", icon: Package },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Quality Metrics", href: "/quality-metrics", icon: BarChart3 },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile & Settings", href: "/qc/profile", icon: Settings },
    ],
  },
];

// Route mappings for canonical URLs
export const QC_ROUTE_ALIASES = {
  // Dashboard routes
  '/qc-dashboard': '/qc',
  '/quality-control': '/qc',

  // Delivery routes
  '/delivery-handoff': '/qc-delivery-handoff',

  // Metrics routes
  '/qc-metrics': '/quality-metrics',
};

// Helper to get the canonical route
export function getCanonicalQCRoute(path: string): string {
  return QC_ROUTE_ALIASES[path as keyof typeof QC_ROUTE_ALIASES] || path;
}
