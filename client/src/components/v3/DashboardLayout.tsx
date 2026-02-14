import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navigation: NavSection[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  logo?: React.ReactNode;
  notificationCount?: number;
  onLogout?: () => void;
  className?: string;
}

export function DashboardLayout({
  children,
  navigation,
  user,
  logo,
  notificationCount = 0,
  onLogout,
  className,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={cn("flex h-screen bg-slate-50", className)}>
      <div className="hidden lg:block">
        <AppSidebar
          sections={navigation}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          logo={logo}
        />
      </div>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <AppSidebar
              sections={navigation}
              collapsed={false}
              logo={logo}
            />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          user={user}
          notificationCount={notificationCount}
          onMenuClick={() => setMobileMenuOpen(true)}
          onLogout={onLogout}
          showMobileMenu={true}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
