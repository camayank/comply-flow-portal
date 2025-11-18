/**
 * Design System Utilities
 * Centralized utilities for consistent UI/UX using semantic design tokens
 */

/**
 * Status badge color classes using semantic design tokens
 * Use these instead of hardcoded Tailwind colors for consistency across themes
 */
export const statusColors = {
  // Payment & Financial Status
  paid: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  overdue: "bg-error/10 text-error border-error/20",
  partially_paid: "bg-warning/10 text-warning border-warning/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-primary/10 text-primary border-primary/20",

  // Service Request Status
  in_progress: "bg-primary/10 text-primary border-primary/20",
  pending_docs: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
  on_hold: "bg-muted text-muted-foreground border-border",
  rejected: "bg-error/10 text-error border-error/20",

  // QC Review Status
  approved: "bg-success/10 text-success border-success/20",
  rework_required: "bg-warning/10 text-warning border-warning/20",
  escalated: "bg-error/10 text-error border-error/20",

  // Lead Status
  new: "bg-primary/10 text-primary border-primary/20",
  hot_lead: "bg-error/10 text-error border-error/20",
  warm_lead: "bg-warning/10 text-warning border-warning/20",
  cold_lead: "bg-muted text-muted-foreground border-border",
  not_answered: "bg-warning/10 text-warning border-warning/20",
  not_interested: "bg-muted text-muted-foreground border-border",
  converted: "bg-success/10 text-success border-success/20",
  lost: "bg-error/10 text-error border-error/20",

  // Priority Levels
  high: "bg-error/10 text-error border-error/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-primary/10 text-primary border-primary/20",

  // General Status
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-success/10 text-success border-success/20",
} as const;

/**
 * Get status color classes
 * @param status - The status key
 * @returns Tailwind CSS classes for the status
 */
export function getStatusColor(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_') as keyof typeof statusColors;
  return statusColors[normalizedStatus] || statusColors.pending;
}

/**
 * Chart colors using design system tokens
 * Use these for consistent chart visualization across the platform
 */
export const chartColors = {
  semantic: [
    'hsl(var(--chart-1))',  // Primary Blue
    'hsl(var(--chart-2))',  // Success Green
    'hsl(var(--chart-3))',  // Warning Orange
    'hsl(var(--chart-4))',  // Error Red
    'hsl(var(--chart-5))',  // Purple
    'hsl(var(--chart-6))',  // Teal
    'hsl(var(--chart-7))',  // Amber
    'hsl(var(--chart-8))',  // Pink
  ],
  primary: 'hsl(var(--chart-1))',
  success: 'hsl(var(--chart-2))',
  warning: 'hsl(var(--chart-3))',
  error: 'hsl(var(--chart-4))',
} as const;

/**
 * User role colors using semantic tokens
 */
export const roleColors = {
  super_admin: "bg-primary text-primary-foreground",
  admin: "bg-primary text-primary-foreground",
  ops_executive: "bg-success text-success-foreground",
  customer_service: "bg-warning text-warning-foreground",
  agent: "bg-secondary text-secondary-foreground",
  client: "bg-accent text-accent-foreground",
} as const;

/**
 * Get role color classes
 * @param role - The user role
 * @returns Tailwind CSS classes for the role
 */
export function getRoleColor(role: string): string {
  const normalizedRole = role.toLowerCase().replace(/\s+/g, '_') as keyof typeof roleColors;
  return roleColors[normalizedRole] || roleColors.client;
}

/**
 * Spacing utilities using design tokens
 * Use these instead of hardcoded Tailwind spacing
 */
export const spacing = {
  xs: 'gap-xs',    // 0.25rem
  sm: 'gap-sm',    // 0.5rem
  md: 'gap-md',    // 1rem
  lg: 'gap-lg',    // 1.5rem
  xl: 'gap-xl',    // 2rem
  '2xl': 'gap-2xl', // 3rem
  '3xl': 'gap-3xl', // 4rem
} as const;

/**
 * Padding utilities using design tokens
 */
export const padding = {
  xs: 'p-xs',
  sm: 'p-sm',
  md: 'p-md',
  lg: 'p-lg',
  xl: 'p-xl',
  '2xl': 'p-2xl',
  '3xl': 'p-3xl',
} as const;

/**
 * Icon size utilities for consistent icon sizing
 */
export const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
} as const;

/**
 * Get icon size classes
 * @param size - The icon size
 * @returns Tailwind CSS classes for the icon size
 */
export function getIconSize(size: keyof typeof iconSizes = 'md'): string {
  return iconSizes[size];
}

/**
 * Card hover effect using design system transitions
 */
export const cardInteractive = "transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 cursor-pointer";

/**
 * Focus ring utilities using design system tokens
 */
export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
