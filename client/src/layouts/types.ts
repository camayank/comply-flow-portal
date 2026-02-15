import { ReactNode } from 'react';

export type LayoutType = 'public' | 'dashboard' | 'minimal' | 'print';

export interface BaseLayoutProps {
  children: ReactNode;
}

export interface PublicLayoutProps extends BaseLayoutProps {
  showHeader?: boolean;
  showFooter?: boolean;
}

export interface DashboardLayoutProps extends BaseLayoutProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  // Legacy props for backwards compatibility - ignored, handled internally
  navigation?: unknown;
  user?: unknown;
  logo?: ReactNode;
}

export interface MinimalLayoutProps extends BaseLayoutProps {
  showHeader?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export interface PrintLayoutProps extends BaseLayoutProps {}

export interface Breadcrumb {
  label: string;
  href?: string;
}
