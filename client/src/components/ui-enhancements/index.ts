/**
 * UI Enhancement Components
 * Premium UI components for enhanced user experience
 *
 * This module exports all UI enhancement components created for
 * the DigiComply platform upgrade.
 */

// Micro-interactions and Animations
export {
  FadeIn,
  FadeInUp,
  StaggeredList,
  ScaleOnHover,
  ScaleOnTap,
  Skeleton,
  SkeletonCard,
  AnimatedCounter,
  AnimatedProgress,
  PulseIndicator,
  AttentionBadge,
  ShakeOnError,
  Slide,
  SuccessCheckmark,
  Spinner,
  DotsLoader,
} from '../MicroInteractions';

// Page Transitions
export {
  PageWrapper,
  ContentLoader,
  RevealOnScroll,
  RouteChangeIndicator,
  LazyLoad,
  DashboardSection,
  AnimatedCardGrid,
  EmptyState,
} from '../PageTransitions';

// Progressive Disclosure
export {
  ExpandableCard,
  SummaryDetailView,
  RevealOnHover,
  ShowMoreList,
  InfoTooltipCard,
  StepByStepGuide,
} from '../ProgressiveDisclosure';

// Mobile Enhancements
export {
  PullToRefresh,
  SwipeableCard,
  FloatingActionButton,
  MobileHeader,
  ActionSheet,
  TouchButton,
  ScrollToTopButton,
  SafeAreaView,
} from '../MobileEnhancements';

// Role-based Navigation
export {
  RoleBasedNavigation,
  CompactRoleNavigation,
  RoleBasedWelcome,
  SidebarNavigation,
  RoleQuickActionBar,
} from '../RoleBasedNavigation';

// Real-time Indicator
export { RealTimeIndicator } from '../RealTimeIndicator';

// Compliance Components
export { default as ComplianceHealthScore } from '../ComplianceHealthScore';
export { default as ProactiveAlerts } from '../ProactiveAlerts';

// Page Header with Breadcrumbs
export { PageHeader, Breadcrumbs } from '../PageHeader';
