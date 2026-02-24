/**
 * Operations Portal Navigation Configuration
 *
 * Shared navigation config for all operations-facing screens.
 * Ensures consistent navigation across the entire operations portal.
 *
 * Role-based access:
 * - ops_manager: Full access including Team Assignment and Performance Metrics
 * - ops_executive: Limited to My Tasks, Work Queue, and Case Dashboard only
 */

import {
  LayoutDashboard,
  ListTodo,
  FileSearch,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  UserPlus,
  TrendingUp,
} from 'lucide-react';

// Base navigation for all ops roles
const BASE_OPERATIONS_NAVIGATION = [
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
];

// Full navigation for ops managers
export const OPERATIONS_NAVIGATION = [
  ...BASE_OPERATIONS_NAVIGATION,
  {
    title: "Team Management",
    items: [
      { label: "Team Assignment", href: "/ops/team-assignment", icon: UserPlus },
      { label: "Team Performance", href: "/operations/team", icon: Users },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Performance Metrics", href: "/ops/performance", icon: TrendingUp },
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

/**
 * Get role-based operations navigation
 * @param role - User's role (ops_manager, ops_executive, admin, super_admin)
 * @returns Navigation config filtered by role
 */
export function getOperationsNavigation(role?: string): typeof OPERATIONS_NAVIGATION {
  // Managers, admins, and super_admins get full navigation
  const hasManagerAccess = role === 'ops_manager' || role === 'admin' || role === 'super_admin';

  if (hasManagerAccess) {
    return OPERATIONS_NAVIGATION;
  }

  // Ops executives only get base navigation (no Team Management or Analytics)
  return [
    ...BASE_OPERATIONS_NAVIGATION,
    {
      title: "Account",
      items: [
        { label: "Profile & Settings", href: "/operations/profile", icon: Settings },
      ],
    },
  ];
}

/**
 * Check if a path requires manager access
 * @param path - Route path to check
 * @returns true if path is manager-only
 */
export function isManagerOnlyPath(path: string): boolean {
  const managerOnlyPaths = [
    '/ops/team-assignment',
    '/operations/team',
    '/ops/performance',
  ];
  return managerOnlyPaths.some(p => path.startsWith(p));
}

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
