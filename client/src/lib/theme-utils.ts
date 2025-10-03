/**
 * Theme Utilities - Centralized styling system for consistent UI
 * Replaces hardcoded colors with theme-aware variants
 */

// Status color variants that work with light/dark modes
export const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  inProgress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  notApplicable: 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  expiringSoon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  official: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  cleared: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
} as const;

// Priority color variants
export const priorityStyles = {
  critical: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    card: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500 dark:text-red-400',
  },
  high: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    card: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'text-orange-500 dark:text-orange-400',
  },
  urgent: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    card: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500 dark:text-red-400',
  },
  medium: {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    card: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: 'text-yellow-500 dark:text-yellow-400',
  },
  low: {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    card: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500 dark:text-blue-400',
  },
  normal: {
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    card: 'border-gray-200 bg-gray-50 dark:border-gray-900 dark:bg-gray-950/20',
    text: 'text-gray-600 dark:text-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
  },
} as const;

// Health score color variants
export const healthScoreStyles = {
  excellent: {
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-950/20',
  },
  good: {
    text: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
  },
  fair: {
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
  },
  poor: {
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-950/20',
  },
} as const;

// Service category color variants
export const categoryStyles = {
  mandatory: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  recurring: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  conditional: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  optional: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  standard: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  premium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  enterprise: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
} as const;

// File type icon colors
export const fileTypeColors = {
  image: 'text-blue-500 dark:text-blue-400',
  pdf: 'text-red-500 dark:text-red-400',
  spreadsheet: 'text-green-500 dark:text-green-400',
  document: 'text-blue-500 dark:text-blue-400',
  default: 'text-gray-500 dark:text-gray-400',
} as const;

// Plan gradient backgrounds (for retainership/subscription plans)
export const planGradients = {
  basic: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
  standard: 'bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700',
  premium: 'bg-gradient-to-br from-yellow-500 to-orange-500 dark:from-yellow-600 dark:to-orange-600',
  enterprise: 'bg-gradient-to-br from-pink-500 to-rose-500 dark:from-pink-600 dark:to-rose-600',
  default: 'bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700',
} as const;

// Interactive state colors (for selection, hover, etc.)
export const interactiveStyles = {
  selected: {
    border: 'border-primary dark:border-primary',
    bg: 'bg-primary/10 dark:bg-primary/20',
    text: 'text-primary dark:text-primary',
  },
  unselected: {
    border: 'border-border dark:border-border',
    bg: 'bg-background dark:bg-background',
    text: 'text-foreground dark:text-foreground',
  },
  hover: 'hover:bg-accent dark:hover:bg-accent',
  focus: 'focus:ring-2 focus:ring-ring dark:focus:ring-ring',
} as const;

// Helper functions

/**
 * Get status badge style based on status string
 * @param status - Status value (pending, completed, etc.)
 * @returns Tailwind CSS classes for the badge
 */
export function getStatusStyle(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/[-_\s]/g, '');
  
  // Map common status variations
  const statusMap: Record<string, keyof typeof statusStyles> = {
    'pending': 'pending',
    'inprogress': 'inProgress',
    'completed': 'completed',
    'overdue': 'overdue',
    'cancelled': 'cancelled',
    'notapplicable': 'notApplicable',
    'approved': 'approved',
    'rejected': 'rejected',
    'expired': 'expired',
    'expiringsoon': 'expiringSoon',
    'official': 'official',
    'active': 'active',
    'cleared': 'cleared',
    'disputed': 'disputed',
  };
  
  const mappedStatus = statusMap[normalizedStatus];
  return statusStyles[mappedStatus] || statusStyles.pending;
}

/**
 * Get priority badge style based on priority string
 * @param priority - Priority value (critical, high, medium, low)
 * @param variant - Style variant to return (badge, card, text, icon)
 * @returns Tailwind CSS classes
 */
export function getPriorityStyle(
  priority: string,
  variant: 'badge' | 'card' | 'text' | 'icon' = 'badge'
): string {
  const normalizedPriority = priority.toLowerCase() as keyof typeof priorityStyles;
  const styles = priorityStyles[normalizedPriority] || priorityStyles.normal;
  return styles[variant];
}

/**
 * Get health score style based on score value
 * @param score - Health score (0-100)
 * @param variant - Style variant to return (text, badge, bg)
 * @returns Object with label and style classes
 */
export function getHealthScoreStyle(
  score: number,
  variant: 'text' | 'badge' | 'bg' = 'text'
): { label: string; style: string } {
  if (score >= 90) {
    return { label: 'Excellent', style: healthScoreStyles.excellent[variant] };
  }
  if (score >= 75) {
    return { label: 'Good', style: healthScoreStyles.good[variant] };
  }
  if (score >= 60) {
    return { label: 'Fair', style: healthScoreStyles.fair[variant] };
  }
  return { label: 'Needs Attention', style: healthScoreStyles.poor[variant] };
}

/**
 * Get category badge style
 * @param category - Service category
 * @returns Tailwind CSS classes
 */
export function getCategoryStyle(category: string): string {
  const normalizedCategory = category.toLowerCase() as keyof typeof categoryStyles;
  return categoryStyles[normalizedCategory] || categoryStyles.optional;
}

/**
 * Get file type icon color
 * @param mimeType - MIME type of the file
 * @returns Tailwind CSS color class
 */
export function getFileTypeColor(mimeType: string | null): string {
  if (!mimeType) return fileTypeColors.default;
  
  if (mimeType.startsWith('image/')) return fileTypeColors.image;
  if (mimeType.includes('pdf')) return fileTypeColors.pdf;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return fileTypeColors.spreadsheet;
  if (mimeType.includes('document') || mimeType.includes('word')) return fileTypeColors.document;
  
  return fileTypeColors.default;
}

/**
 * Get plan gradient style
 * @param plan - Plan category (basic, standard, premium, enterprise)
 * @returns Tailwind CSS gradient classes
 */
export function getPlanGradient(plan: string): string {
  const normalizedPlan = plan.toLowerCase() as keyof typeof planGradients;
  return planGradients[normalizedPlan] || planGradients.default;
}

/**
 * Get interactive state style
 * @param isSelected - Whether the element is selected
 * @param variant - Style variant (border, bg, text)
 * @returns Tailwind CSS classes
 */
export function getInteractiveStyle(
  isSelected: boolean,
  variant: 'border' | 'bg' | 'text' = 'border'
): string {
  const state = isSelected ? interactiveStyles.selected : interactiveStyles.unselected;
  return state[variant];
}
