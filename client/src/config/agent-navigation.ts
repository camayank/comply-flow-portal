/**
 * Agent Portal Navigation Configuration
 *
 * Shared navigation config for all agent-facing screens.
 * Ensures consistent navigation across the entire agent portal.
 */

import {
  LayoutDashboard,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  AlertCircle,
  FileCheck,
  UserPlus,
} from 'lucide-react';

export const AGENT_NAVIGATION = [
  {
    title: "Dashboard",
    items: [
      { label: "Overview", href: "/agent", icon: LayoutDashboard },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Lead Management", href: "/agent/leads", icon: UserPlus },
      { label: "My Clients", href: "/agent/clients", icon: Users },
      { label: "Commissions", href: "/agent/commissions", icon: DollarSign },
      { label: "Disputes", href: "/agent/disputes", icon: AlertCircle },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Performance", href: "/agent/performance", icon: TrendingUp },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "KYC Verification", href: "/agent/kyc", icon: FileCheck },
      { label: "Profile & Settings", href: "/agent/profile", icon: Settings },
    ],
  },
];

// Route mappings for canonical URLs
export const AGENT_ROUTE_ALIASES = {
  // Dashboard routes
  '/agent/dashboard': '/agent',

  // Client/Lead routes (leads and clients may overlap)
  '/agent/client-management': '/agent/clients',

  // Commission routes
  '/agent/commission-tracker': '/agent/commissions',

  // Settings routes
  '/agent/settings': '/agent/profile',
};

// Helper to get the canonical route
export function getCanonicalAgentRoute(path: string): string {
  return AGENT_ROUTE_ALIASES[path as keyof typeof AGENT_ROUTE_ALIASES] || path;
}
