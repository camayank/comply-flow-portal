import { useState } from 'react';
import { DashboardLayoutProps } from './types';
import { AppSidebar } from '@/components/v3/AppSidebar';
import { AppHeader } from '@/components/v3/AppHeader';
import { useAuth } from '@/hooks/use-auth';

// Default navigation - will be replaced with dynamic navigation in Task 14
const DEFAULT_NAVIGATION = [
  {
    items: [
      { label: 'Dashboard', href: '/portal-v2', icon: () => null },
    ],
  },
];

export function DashboardLayout({
  children,
  title,
  breadcrumbs,
  actions,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Will be replaced with getNavigationForRole(user?.role) in Task 16
  const navigation = DEFAULT_NAVIGATION;

  // Map auth user to AppHeader user format
  const headerUser = user ? {
    name: user.fullName,
    email: user.email,
  } : undefined;

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-lg"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex">
        <AppSidebar
          sections={navigation}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setMobileMenuOpen(false)}
            tabIndex={0}
            role="button"
            aria-label="Close menu"
          />
          <div className="absolute left-0 top-0 h-full">
            <AppSidebar
              sections={navigation}
              collapsed={false}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <AppHeader
          user={headerUser}
          notificationCount={0}
          onMenuClick={() => setMobileMenuOpen(true)}
          onLogout={logout}
          showMobileMenu={true}
        />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 lg:p-6"
        >
          {children}
        </main>

        {/* NO Footer - clean dashboard experience */}
      </div>
    </div>
  );
}
