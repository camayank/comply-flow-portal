/**
 * UX Consistency Exports
 * Central export point for all UX consistency components and hooks
 */

// Hooks
export { useStandardQuery } from './hooks/useStandardQuery';
export { useStandardMutation } from './hooks/useStandardMutation';

// Layouts
export { PageLayout, PageSection } from './components/layouts/PageLayout';
export { DashboardLayout } from './components/layouts/DashboardLayout';

// Loading States
export {
  LoadingSpinner,
  InlineSpinner,
  LoadingCard,
  LoadingTableRow,
  LoadingListItem,
  LoadingStatsCard,
  LoadingPage,
  LoadingOverlay,
} from './components/common/LoadingStates';

// Error States
export {
  ErrorAlert,
  ErrorPage,
  ErrorSection,
  NetworkError,
  NotFoundError,
  UnauthorizedError,
} from './components/common/ErrorStates';

// Navigation
export { AppHeader } from './components/common/AppHeader';
export { MobileBottomNav, type MobileNavItem } from './components/common/MobileBottomNav';

// API Utilities
export { apiRequest, get, post, put, patch, del, APIError } from './lib/api';

// Types
export type { StandardQueryResult } from './hooks/useStandardQuery';
