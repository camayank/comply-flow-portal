/**
 * Operations Portal Navigation Configuration
 *
 * Shared navigation config for all operations-facing screens.
 * Ensures consistent navigation across the entire operations portal.
 */

import {
  LayoutDashboard,
  ListTodo,
  FileSearch,
  AlertTriangle,
  FileText,
  Users,
  BarChart3,
  Settings,
  Calendar,
  ClipboardList,
} from 'lucide-react';

export const OPERATIONS_NAVIGATION = [
  {
    title: "Dashboard",
    items: [
      { label: "Overview", href: "/operations", icon: LayoutDashboard },
    ],
  },
  {
    title: "Work Management",
    items: [
      { label: "Work Queue", href: "/work-queue", icon: ListTodo },
      { label: "Service Requests", href: "/ops/service-requests", icon: ClipboardList },
      { label: "Document Review", href: "/ops/document-review", icon: FileSearch },
      { label: "Escalations", href: "/escalations", icon: AlertTriangle },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Team Performance", href: "/operations/team", icon: Users },
      { label: "Reports", href: "/operations/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile & Settings", href: "/operations/profile", icon: Settings },
    ],
  },
];

// Route mappings for canonical URLs
export const OPERATIONS_ROUTE_ALIASES = {
  // Dashboard routes
  '/ops': '/operations',
  '/universal-ops': '/operations',

  // Work queue routes
  '/ops/work-queue': '/work-queue',
  '/operations/work-queue': '/work-queue',
  '/operations-queue': '/work-queue',

  // Document review routes
  '/operations/document-review': '/ops/document-review',
  '/document-review': '/ops/document-review',

  // Service requests
  '/operations/service-requests': '/ops/service-requests',
};

// Helper to get the canonical route
export function getCanonicalOperationsRoute(path: string): string {
  return OPERATIONS_ROUTE_ALIASES[path as keyof typeof OPERATIONS_ROUTE_ALIASES] || path;
}
