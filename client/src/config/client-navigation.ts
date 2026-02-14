/**
 * Client Portal Navigation Configuration
 *
 * Shared navigation config for all client-facing screens.
 * Ensures consistent navigation across the entire client portal.
 */

import {
  LayoutDashboard,
  BarChart3,
  Briefcase,
  ShoppingCart,
  Calendar,
  FolderOpen,
  User,
  HelpCircle,
  Bell,
  Shield,
  CreditCard,
} from 'lucide-react';

export const CLIENT_NAVIGATION = [
  {
    title: "Dashboard",
    items: [
      { label: "Overview", href: "/portal-v2", icon: LayoutDashboard },
      { label: "Executive Summary", href: "/executive-summary", icon: BarChart3 },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "My Services", href: "/my-services", icon: Briefcase },
      { label: "Service Catalog", href: "/services", icon: ShoppingCart },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Calendar", href: "/compliance-calendar", icon: Calendar },
      { label: "Documents", href: "/vault", icon: FolderOpen },
      { label: "Alert Preferences", href: "/client/alert-preferences", icon: Bell },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile & Settings", href: "/client-profile", icon: User },
      { label: "Billing & Wallet", href: "/portal-v2/account", icon: CreditCard },
      { label: "Security", href: "/portal-v2/account/security", icon: Shield },
      { label: "Support", href: "/support", icon: HelpCircle },
    ],
  },
];

// Route mappings for canonical URLs
export const CLIENT_ROUTE_ALIASES = {
  // Dashboard routes
  '/client': '/portal-v2',
  '/client-dashboard': '/portal-v2',
  '/mobile-dashboard': '/portal-v2',
  '/mobile': '/portal-v2',
  '/command-center': '/portal-v2',

  // Service routes
  '/client/services': '/my-services',
  '/client-services': '/my-services',
  '/service-tracker': '/my-services',
  '/service-catalog': '/services',

  // Profile routes
  '/client/profile': '/client-profile',
  '/settings': '/client-profile',
  '/client/settings': '/client-profile',

  // Support routes
  '/help': '/support',
  '/tickets': '/support',
  '/client/help': '/support',
  '/client/support': '/support',

  // Documents
  '/client/documents': '/vault',
  '/documents': '/vault',

  // Calendar
  '/client/calendar': '/compliance-calendar',
};

// Helper to get the canonical route
export function getCanonicalRoute(path: string): string {
  return CLIENT_ROUTE_ALIASES[path as keyof typeof CLIENT_ROUTE_ALIASES] || path;
}
