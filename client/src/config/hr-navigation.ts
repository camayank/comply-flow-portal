/**
 * HR Portal Navigation Configuration
 *
 * Shared navigation config for all HR-facing screens.
 * Ensures consistent navigation across the entire HR portal.
 */

import {
  Home,
  Users,
  Clock,
  Calendar,
  Trophy,
  GraduationCap,
  Target,
  PieChart,
  DollarSign,
  ClipboardList,
  Settings,
} from 'lucide-react';

export const HR_NAVIGATION = [
  {
    title: "HR Operations",
    items: [
      { label: "Dashboard", href: "/hr", icon: Home },
      { label: "Employee Directory", href: "/hr/employees", icon: Users },
      { label: "Attendance", href: "/hr/attendance", icon: Clock },
      { label: "Leave Management", href: "/hr/leave", icon: Calendar },
    ],
  },
  {
    title: "Performance & Training",
    items: [
      { label: "Performance Reviews", href: "/hr/performance", icon: Trophy },
      { label: "Training Programs", href: "/hr/training", icon: GraduationCap },
      { label: "Goals & KPIs", href: "/hr/goals", icon: Target },
    ],
  },
  {
    title: "Reports & Settings",
    items: [
      { label: "HR Analytics", href: "/hr/analytics", icon: PieChart },
      { label: "Payroll Reports", href: "/hr/payroll", icon: DollarSign },
      { label: "Compliance", href: "/hr/compliance", icon: ClipboardList },
      { label: "Settings", href: "/hr/settings", icon: Settings },
    ],
  },
];

// Route mappings for canonical URLs
export const HR_ROUTE_ALIASES = {
  '/hr-dashboard': '/hr',
  '/human-resources': '/hr',
};

// Helper to get the canonical route
export function getCanonicalHRRoute(path: string): string {
  return HR_ROUTE_ALIASES[path as keyof typeof HR_ROUTE_ALIASES] || path;
}
