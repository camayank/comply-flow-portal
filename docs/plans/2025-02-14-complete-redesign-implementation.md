# DigiComply Complete UI Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign all DigiComply pages with Corporate Authority visual identity, then delete old code.

**Architecture:** Create shared components first (MetricCard, PageShell, AppSidebar), then build pages in `/pages/v3/` directory. Update routes incrementally and delete old files after each phase is verified.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter routing, TanStack Query

---

## Phase 1: Foundation Components

### Task 1: Create MetricCard Component

**Files:**
- Create: `client/src/components/v3/MetricCard.tsx`

**Step 1: Create the MetricCard component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
  accentColor?: "blue" | "green" | "orange" | "red" | "purple" | "teal";
  className?: string;
}

const accentColors = {
  blue: "border-l-blue-600",
  green: "border-l-emerald-600",
  orange: "border-l-orange-500",
  red: "border-l-red-600",
  purple: "border-l-purple-600",
  teal: "border-l-teal-600",
};

const trendColors = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-slate-500",
};

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  accentColor = "blue",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-sm p-5",
        "border-l-4",
        accentColors[accentColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={cn("text-sm", trendColors[trend.direction])}>
              {trend.direction === "up" && "↑ "}
              {trend.direction === "down" && "↓ "}
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add client/src/components/v3/MetricCard.tsx
git commit -m "feat(v3): add MetricCard component with accent colors"
```

---

### Task 2: Create PageShell Component

**Files:**
- Create: `client/src/components/v3/PageShell.tsx`

**Step 1: Create the PageShell component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("min-h-screen bg-slate-50", className)}>
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-slate-500 mb-2">
            <Link href="/" className="hover:text-slate-700">
              <Home className="h-4 w-4" />
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="h-4 w-4" />
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-slate-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>

      {/* Page Content */}
      <div className="p-6">{children}</div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/components/v3/PageShell.tsx
git commit -m "feat(v3): add PageShell component with breadcrumbs"
```

---

### Task 3: Create AppSidebar Component

**Files:**
- Create: `client/src/components/v3/AppSidebar.tsx`

**Step 1: Create the AppSidebar component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { LucideIcon, ChevronLeft, ChevronRight } from "lucide-react";

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

interface AppSidebarProps {
  sections: NavSection[];
  collapsed?: boolean;
  onToggle?: () => void;
  logo?: React.ReactNode;
  className?: string;
}

export function AppSidebar({
  sections,
  collapsed = false,
  onToggle,
  logo,
  className,
}: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        {!collapsed && logo}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            {section.title && !collapsed && (
              <p className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <ul className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-navy-800 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/components/v3/AppSidebar.tsx
git commit -m "feat(v3): add AppSidebar navigation component"
```

---

### Task 4: Create AppHeader Component

**Files:**
- Create: `client/src/components/v3/AppHeader.tsx`

**Step 1: Create the AppHeader component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { Bell, Search, Menu, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  notificationCount?: number;
  onMenuClick?: () => void;
  onLogout?: () => void;
  showMobileMenu?: boolean;
  className?: string;
}

export function AppHeader({
  user,
  notificationCount = 0,
  onMenuClick,
  onLogout,
  showMobileMenu = false,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-40",
        className
      )}
    >
      {/* Left Side */}
      <div className="flex items-center gap-4">
        {showMobileMenu && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        )}

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-md px-3 py-2 w-64">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 w-full"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-md hover:bg-slate-100">
          <Bell className="h-5 w-5 text-slate-600" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100">
                <div className="h-8 w-8 bg-navy-800 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">
                  {user.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/components/v3/AppHeader.tsx
git commit -m "feat(v3): add AppHeader component with user menu"
```

---

### Task 5: Create DashboardLayout Component

**Files:**
- Create: `client/src/components/v3/DashboardLayout.tsx`

**Step 1: Create the DashboardLayout component**

```tsx
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
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          sections={navigation}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          logo={logo}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Content Area */}
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
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/components/v3/DashboardLayout.tsx
git commit -m "feat(v3): add DashboardLayout with responsive sidebar"
```

---

### Task 6: Create DataTable Component

**Files:**
- Create: `client/src/components/v3/DataTable.tsx`

**Step 1: Create the DataTable component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  emptyMessage = "No data available",
  className,
}: DataTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className={cn("bg-white rounded-lg border border-slate-200 overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-3 text-left text-sm font-semibold text-slate-600",
                    column.sortable && "cursor-pointer hover:bg-slate-100",
                    column.className
                  )}
                  onClick={() => column.sortable && onSort?.(String(column.key))}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <span className="text-slate-400">
                        {getSortIcon(String(column.key))}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={String(item[keyField])}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    index % 2 === 1 && "bg-slate-50/50",
                    onRowClick && "cursor-pointer hover:bg-slate-100"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn("px-4 py-3 text-sm text-slate-700", column.className)}
                    >
                      {column.render
                        ? column.render(item)
                        : String(item[column.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/components/v3/DataTable.tsx
git commit -m "feat(v3): add DataTable component with sorting"
```

---

### Task 7: Create EmptyState Component

**Files:**
- Create: `client/src/components/v3/EmptyState.tsx`

**Step 1: Create the EmptyState component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="p-4 bg-slate-100 rounded-full mb-4">
        <Icon className="h-12 w-12 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="bg-navy-800 hover:bg-navy-700">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/components/v3/EmptyState.tsx
git commit -m "feat(v3): add EmptyState component"
```

---

### Task 8: Create Component Index Export

**Files:**
- Create: `client/src/components/v3/index.ts`

**Step 1: Create the index file**

```tsx
export { MetricCard } from "./MetricCard";
export { PageShell } from "./PageShell";
export { AppSidebar } from "./AppSidebar";
export { AppHeader } from "./AppHeader";
export { DashboardLayout } from "./DashboardLayout";
export { DataTable } from "./DataTable";
export { EmptyState } from "./EmptyState";
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/components/v3/index.ts
git commit -m "feat(v3): add component index exports"
```

---

### Task 9: Update Tailwind Config for Navy Colors

**Files:**
- Modify: `client/tailwind.config.ts`

**Step 1: Add navy color palette**

Add to the `theme.extend.colors` section:

```typescript
navy: {
  50: '#f0f4f8',
  100: '#d9e2ec',
  200: '#bcccdc',
  300: '#9fb3c8',
  400: '#829ab1',
  500: '#627d98',
  600: '#486581',
  700: '#334e68',
  800: '#1e3a5f',
  900: '#0f172a',
},
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/tailwind.config.ts
git commit -m "feat(v3): add navy color palette to Tailwind"
```

---

## Phase 2: Landing Page

### Task 10: Create New Landing Page

**Files:**
- Create: `client/src/pages/v3/LandingPage.tsx`

**Step 1: Create the landing page**

```tsx
import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield,
  FileText,
  Bell,
  CheckCircle,
  ArrowRight,
  Building2,
  Users,
  Clock,
  TrendingUp,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold text-navy-800">DigiComply</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              Pricing
            </a>
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              About
            </a>
            <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-navy-800">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="border-navy-800 text-navy-800 hover:bg-navy-50">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-navy-800 hover:bg-navy-700 text-white">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                Stop Drowning in{" "}
                <span className="text-navy-800">Compliance Chaos</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Running a business in India means managing 50+ filings, 100+ deadlines,
                and constant penalty risk. DigiComply automates it all.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-navy-800 hover:bg-navy-700 text-white px-8">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/platform-demo">
                  <Button size="lg" variant="outline" className="border-slate-300">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">10,000+ businesses</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">₹50Cr+ penalties prevented</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-100 rounded-xl p-4 shadow-xl">
                <div className="bg-white rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-navy-800 rounded-lg flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Compliance Status</p>
                      <p className="text-xs text-emerald-600">All filings on track</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-navy-800">12</p>
                      <p className="text-xs text-slate-500">Upcoming</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">98%</p>
                      <p className="text-xs text-slate-500">On Time</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-navy-800">₹0</p>
                      <p className="text-xs text-slate-500">Penalties</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-8 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-slate-500 mb-6">
            Trusted by 10,000+ Indian businesses
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-24 bg-slate-300 rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            The DigiComply Difference
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8">
              <h3 className="text-lg font-semibold text-red-800 mb-6">Without DigiComply</h3>
              <ul className="space-y-4">
                {[
                  "Missed deadlines and penalties",
                  "Manual tracking in spreadsheets",
                  "Constant anxiety about filings",
                  "Scattered documents everywhere",
                  "No visibility into compliance status",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-red-700">
                    <span className="text-red-500 mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8">
              <h3 className="text-lg font-semibold text-emerald-800 mb-6">With DigiComply</h3>
              <ul className="space-y-4">
                {[
                  "Automated reminders before deadlines",
                  "Single dashboard for everything",
                  "Peace of mind guaranteed",
                  "Secure document vault",
                  "Real-time compliance health score",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-emerald-700">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything You Need for Compliance
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From GST to ROC filings, we handle all your compliance needs in one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: FileText, title: "GST Compliance", desc: "Returns, reconciliation, and e-invoicing" },
              { icon: Building2, title: "ROC Filings", desc: "Annual returns and director compliance" },
              { icon: TrendingUp, title: "Income Tax", desc: "ITR filing and advance tax reminders" },
              { icon: Users, title: "Payroll Compliance", desc: "PF, ESI, and professional tax" },
              { icon: Shield, title: "License Management", desc: "Track and renew all business licenses" },
              { icon: Bell, title: "Smart Alerts", desc: "Never miss a deadline with smart reminders" },
            ].map((feature, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 bg-navy-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-navy-800" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Loved by Business Owners
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote: "DigiComply saved us from a ₹2L penalty. The automated reminders are a lifesaver.",
                name: "Rajesh Kumar",
                title: "Founder, TechStart India",
              },
              {
                quote: "Finally, all our compliance in one place. No more spreadsheet nightmares.",
                name: "Priya Sharma",
                title: "CFO, RetailCorp",
              },
              {
                quote: "The peace of mind is worth every rupee. Highly recommend to all founders.",
                name: "Amit Patel",
                title: "CEO, ManufactureHub",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-navy-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Simplify Compliance?
          </h2>
          <p className="text-lg text-navy-100 mb-8 max-w-2xl mx-auto">
            Join 10,000+ businesses that trust DigiComply for their compliance needs.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-navy-800 hover:bg-slate-100 px-8">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">DigiComply</h3>
              <p className="text-slate-400 text-sm">
                India's most trusted compliance management platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#about" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} DigiComply. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/pages/v3/LandingPage.tsx
git commit -m "feat(v3): add new Corporate Authority landing page"
```

---

### Task 11: Update Routes for Landing Page

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Import new landing page and update route**

Add import at top:
```tsx
const LandingPageV3 = lazy(() => import("@/pages/v3/LandingPage"));
```

Replace the landing route (around line where "/" route is defined):
```tsx
<Route path="/" component={LandingPageV3} />
```

**Step 2: Verify build and test in browser**

Run: `cd client && npm run build && npm run dev`
Expected: Build succeeds, navigate to "/" shows new landing page

**Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(v3): switch landing page route to new design"
```

---

### Task 12: Delete Old Landing Page

**Files:**
- Delete: `client/src/pages/UnifiedLanding.tsx`

**Step 1: Remove old landing page file**

```bash
rm client/src/pages/UnifiedLanding.tsx
```

**Step 2: Remove any unused imports in App.tsx**

Search App.tsx for any imports of UnifiedLanding and remove them.

**Step 3: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old UnifiedLanding page"
```

---

## Phase 3: Client Dashboard

### Task 13: Create Client Dashboard Page

**Files:**
- Create: `client/src/pages/v3/client/ClientDashboard.tsx`

**Step 1: Create the client dashboard**

```tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DashboardLayout,
  MetricCard,
  PageShell,
  DataTable,
  EmptyState,
} from "@/components/v3";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  FolderOpen,
  HelpCircle,
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface ComplianceStatus {
  state: "GREEN" | "AMBER" | "RED";
  daysSafe: number;
  tasksCompleted: number;
  pendingActions: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysLeft: number;
    priority: "high" | "medium" | "low";
  }>;
  recentActivity: Array<{
    id: string;
    description: string;
    timestamp: string;
    type: string;
  }>;
}

const navigation = [
  {
    items: [
      { label: "Dashboard", href: "/portal-v2", icon: LayoutDashboard },
      { label: "Executive Summary", href: "/executive-summary", icon: BarChart3 },
      { label: "Compliance Calendar", href: "/compliance-calendar", icon: Calendar },
      { label: "Documents", href: "/vault", icon: FolderOpen },
      { label: "Support", href: "/support", icon: HelpCircle },
    ],
  },
];

const statusColors = {
  GREEN: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  AMBER: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  RED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
};

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

export default function ClientDashboard() {
  const { data, isLoading } = useQuery<ComplianceStatus>({
    queryKey: ["/api/v2/client/status"],
  });

  const user = { name: "John Doe", email: "john@example.com" };

  const deadlineColumns = [
    { key: "title", header: "Task", sortable: true },
    { key: "dueDate", header: "Due Date", sortable: true },
    {
      key: "daysLeft",
      header: "Days Left",
      render: (item: any) => (
        <span className={item.daysLeft <= 3 ? "text-red-600 font-medium" : ""}>
          {item.daysLeft} days
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (item: any) => (
        <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
          {item.priority}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout
      navigation={navigation}
      user={user}
      logo={<span className="text-lg font-bold text-navy-800">DigiComply</span>}
    >
      <PageShell
        title="Dashboard"
        subtitle="Your compliance overview"
        breadcrumbs={[{ label: "Dashboard" }]}
      >
        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-lg" />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Compliance Status Banner */}
            <div
              className={`rounded-xl p-6 border ${statusColors[data.state].bg} ${statusColors[data.state].border}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {data.state === "GREEN" ? (
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  ) : data.state === "AMBER" ? (
                    <Clock className="h-8 w-8 text-amber-600" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <h2 className={`text-lg font-semibold ${statusColors[data.state].text}`}>
                      {data.state === "GREEN"
                        ? "All Compliances On Track"
                        : data.state === "AMBER"
                        ? "Action Required Soon"
                        : "Immediate Action Required"}
                    </h2>
                    <p className="text-slate-600">
                      {data.daysSafe} days until next deadline
                    </p>
                  </div>
                </div>
                <Link href="/compliance-calendar">
                  <Button variant="outline">View Calendar</Button>
                </Link>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Tasks Completed"
                value={data.tasksCompleted}
                trend={{ value: "This month", direction: "up" }}
                icon={CheckCircle}
                accentColor="green"
              />
              <MetricCard
                label="Pending Actions"
                value={data.pendingActions}
                trend={{ value: data.pendingActions > 0 ? "Due soon" : "All clear", direction: data.pendingActions > 0 ? "down" : "neutral" }}
                icon={Clock}
                accentColor="orange"
              />
              <MetricCard
                label="Days Safe"
                value={data.daysSafe}
                trend={{ value: "Until next deadline", direction: "neutral" }}
                icon={TrendingUp}
                accentColor="blue"
              />
              <MetricCard
                label="Compliance Score"
                value="98%"
                trend={{ value: "Excellent", direction: "up" }}
                icon={BarChart3}
                accentColor="purple"
              />
            </div>

            {/* Upcoming Deadlines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Upcoming Deadlines
                </h3>
                <Link href="/compliance-calendar">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              {data.upcomingDeadlines.length > 0 ? (
                <DataTable
                  data={data.upcomingDeadlines}
                  columns={deadlineColumns}
                  keyField="id"
                />
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming deadlines"
                  description="All your compliance tasks are up to date."
                />
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/vault">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer">
                    <FileText className="h-6 w-6 text-navy-800 mb-2" />
                    <p className="font-medium text-slate-900">Upload Documents</p>
                    <p className="text-sm text-slate-500">Add new files to vault</p>
                  </div>
                </Link>
                <Link href="/compliance-calendar">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer">
                    <Calendar className="h-6 w-6 text-navy-800 mb-2" />
                    <p className="font-medium text-slate-900">View Calendar</p>
                    <p className="text-sm text-slate-500">See all deadlines</p>
                  </div>
                </Link>
                <Link href="/support">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer">
                    <HelpCircle className="h-6 w-6 text-navy-800 mb-2" />
                    <p className="font-medium text-slate-900">Get Help</p>
                    <p className="text-sm text-slate-500">Contact support</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Unable to load dashboard"
            description="Please try refreshing the page."
            action={{ label: "Refresh", onClick: () => window.location.reload() }}
          />
        )}
      </PageShell>
    </DashboardLayout>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/pages/v3/client/ClientDashboard.tsx
git commit -m "feat(v3): add new client dashboard page"
```

---

### Task 14: Update Routes for Client Dashboard

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Import new client dashboard**

```tsx
const ClientDashboardV3 = lazy(() => import("@/pages/v3/client/ClientDashboard"));
```

**Step 2: Update the client portal route**

Replace the `/portal-v2` route:
```tsx
<Route path="/portal-v2" component={ClientDashboardV3} />
```

**Step 3: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(v3): switch client portal route to new design"
```

---

### Task 15: Delete Old Client Portal

**Files:**
- Delete: `client/src/pages/ClientPortalV2.tsx`

**Step 1: Remove old file**

```bash
rm client/src/pages/ClientPortalV2.tsx
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old ClientPortalV2 page"
```

---

## Phase 4: Admin Dashboard

### Task 16: Create Admin Dashboard Page

**Files:**
- Create: `client/src/pages/v3/admin/AdminDashboard.tsx`

**Step 1: Create the admin dashboard**

```tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DashboardLayout,
  MetricCard,
  PageShell,
  DataTable,
  EmptyState,
} from "@/components/v3";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileBarChart,
  Workflow,
  Settings,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  serviceRequests: number;
  leads: number;
  revenue: number;
}

interface PendingAction {
  id: number;
  type: string;
  title: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

const navigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Services", href: "/admin/services", icon: Briefcase },
      { label: "Blueprints", href: "/admin/blueprints", icon: Workflow },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Configuration", href: "/config", icon: Settings },
    ],
  },
];

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const { data: pending } = useQuery<PendingAction[]>({
    queryKey: ["/api/admin/dashboard/pending"],
  });

  const user = { name: "Admin User", email: "admin@digicomply.com" };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const pendingColumns = [
    { key: "title", header: "Action", sortable: true },
    { key: "type", header: "Type" },
    {
      key: "priority",
      header: "Priority",
      render: (item: PendingAction) => (
        <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (item: PendingAction) =>
        new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout
      navigation={navigation}
      user={user}
      logo={<span className="text-lg font-bold text-navy-800">DigiComply</span>}
    >
      <PageShell
        title="Admin Dashboard"
        subtitle="Manage users, services, and operations"
        breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
        actions={
          <Link href="/admin/reports">
            <Button variant="outline">View Reports</Button>
          </Link>
        }
      >
        {statsLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Users"
                value={stats?.totalUsers?.toLocaleString() || "0"}
                trend={{ value: "Registered users", direction: "neutral" }}
                icon={Users}
                accentColor="blue"
              />
              <MetricCard
                label="Service Requests"
                value={stats?.serviceRequests?.toLocaleString() || "0"}
                trend={{ value: "Active requests", direction: "neutral" }}
                icon={Briefcase}
                accentColor="purple"
              />
              <MetricCard
                label="Leads"
                value={stats?.leads?.toLocaleString() || "0"}
                trend={{ value: "Potential clients", direction: "up" }}
                icon={TrendingUp}
                accentColor="green"
              />
              <MetricCard
                label="Revenue"
                value={formatCurrency(stats?.revenue || 0)}
                trend={{ value: "This month", direction: "up" }}
                icon={Activity}
                accentColor="teal"
              />
            </div>

            {/* Pending Actions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Pending Actions
                  {pending && pending.length > 0 && (
                    <Badge variant="secondary">{pending.length}</Badge>
                  )}
                </h3>
              </div>
              {pending && pending.length > 0 ? (
                <DataTable
                  data={pending}
                  columns={pendingColumns}
                  keyField="id"
                />
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="All Caught Up"
                  description="No pending actions at this time."
                />
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/users">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer">
                    <Users className="h-6 w-6 text-navy-800 mb-2" />
                    <p className="font-medium text-slate-900">Manage Users</p>
                    <p className="text-sm text-slate-500">View and manage accounts</p>
                  </div>
                </Link>
                <Link href="/admin/reports">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer">
                    <FileBarChart className="h-6 w-6 text-navy-800 mb-2" />
                    <p className="font-medium text-slate-900">View Reports</p>
                    <p className="text-sm text-slate-500">Analytics and insights</p>
                  </div>
                </Link>
                <Link href="/admin/services">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer">
                    <Settings className="h-6 w-6 text-navy-800 mb-2" />
                    <p className="font-medium text-slate-900">Service Config</p>
                    <p className="text-sm text-slate-500">Configure services</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </DashboardLayout>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/pages/v3/admin/AdminDashboard.tsx
git commit -m "feat(v3): add new admin dashboard page"
```

---

### Task 17: Update Routes and Delete Old Admin Dashboard

**Files:**
- Modify: `client/src/App.tsx`
- Delete: `client/src/pages/admin/AdminDashboard.tsx`

**Step 1: Import new admin dashboard**

```tsx
const AdminDashboardV3 = lazy(() => import("@/pages/v3/admin/AdminDashboard"));
```

**Step 2: Update the admin dashboard route**

Replace the `/admin/dashboard` route:
```tsx
<Route path="/admin/dashboard" component={AdminDashboardV3} />
```

**Step 3: Delete old file**

```bash
rm client/src/pages/admin/AdminDashboard.tsx
```

**Step 4: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(v3): switch admin dashboard to new design, remove old"
```

---

## Phase 5: Super Admin Dashboard

### Task 18: Create Super Admin Dashboard Page

**Files:**
- Create: `client/src/pages/v3/super-admin/SuperAdminDashboard.tsx`

**Step 1: Create the super admin dashboard** (similar structure to admin but with purple accent and super admin specific content)

```tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DashboardLayout,
  MetricCard,
  PageShell,
  DataTable,
  EmptyState,
} from "@/components/v3";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  LayoutDashboard,
  Building2,
  Briefcase,
  DollarSign,
  Percent,
  Link as LinkIcon,
  ShieldCheck,
  Settings,
  BarChart3,
  FileText,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface SuperAdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  activeTenants: number;
  pendingIncidents: number;
  monthlyRevenue: number;
}

interface SecurityIncident {
  id: number;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  createdAt: string;
  tenantName?: string;
}

const navigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
      { label: "Services", href: "/super-admin/services", icon: Briefcase },
      { label: "Pricing", href: "/super-admin/pricing", icon: DollarSign },
      { label: "Commissions", href: "/super-admin/commissions", icon: Percent },
      { label: "Integrations", href: "/super-admin/integrations", icon: LinkIcon },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Security", href: "/super-admin/security", icon: ShieldCheck },
      { label: "Operations", href: "/super-admin/operations", icon: Settings },
      { label: "Audit Log", href: "/audit-log", icon: FileText },
    ],
  },
];

const severityColors = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<SuperAdminStats>({
    queryKey: ["/api/super-admin/stats"],
  });

  const { data: incidents } = useQuery<SecurityIncident[]>({
    queryKey: ["/api/super-admin/security/incidents", { status: "open", limit: 5 }],
  });

  const user = { name: "Super Admin", email: "superadmin@digicomply.com" };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const incidentColumns = [
    { key: "title", header: "Incident", sortable: true },
    {
      key: "severity",
      header: "Severity",
      render: (item: SecurityIncident) => (
        <Badge className={severityColors[item.severity]}>
          {item.severity.toUpperCase()}
        </Badge>
      ),
    },
    { key: "tenantName", header: "Tenant" },
    {
      key: "createdAt",
      header: "Reported",
      render: (item: SecurityIncident) =>
        new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout
      navigation={navigation}
      user={user}
      logo={
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-600" />
          <span className="text-lg font-bold text-navy-800">DigiComply</span>
        </div>
      }
    >
      <PageShell
        title="Super Admin Dashboard"
        subtitle="Platform-wide management and oversight"
        breadcrumbs={[{ label: "Super Admin" }, { label: "Dashboard" }]}
        actions={
          <Link href="/super-admin/analytics">
            <Button variant="outline">View Analytics</Button>
          </Link>
        }
      >
        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* System Health Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-700">System Status: Operational</p>
                    <p className="text-sm text-slate-600">All services running normally</p>
                  </div>
                </div>
                <Link href="/super-admin/operations">
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Users"
                value={stats?.totalUsers?.toLocaleString() || "0"}
                trend={{ value: `${stats?.activeUsers || 0} active`, direction: "neutral" }}
                icon={Users}
                accentColor="purple"
              />
              <MetricCard
                label="Active Tenants"
                value={stats?.activeTenants || "0"}
                trend={{ value: `of ${stats?.totalTenants || 0} total`, direction: "neutral" }}
                icon={Building2}
                accentColor="blue"
              />
              <MetricCard
                label="Monthly Revenue"
                value={formatCurrency(stats?.monthlyRevenue || 0)}
                trend={{ value: "Recurring", direction: "up" }}
                icon={DollarSign}
                accentColor="green"
              />
              <MetricCard
                label="Pending Incidents"
                value={stats?.pendingIncidents || "0"}
                trend={{ value: "Requires attention", direction: stats?.pendingIncidents ? "down" : "neutral" }}
                icon={AlertTriangle}
                accentColor="red"
              />
            </div>

            {/* Security Incidents */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-red-500" />
                  Recent Security Incidents
                </h3>
                <Link href="/super-admin/security/incidents">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              {incidents && incidents.length > 0 ? (
                <DataTable
                  data={incidents}
                  columns={incidentColumns}
                  keyField="id"
                />
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="No Open Incidents"
                  description="All security incidents have been resolved."
                />
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link href="/super-admin/tenants">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <Building2 className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Manage Tenants</p>
                    <p className="text-sm text-slate-500">View organizations</p>
                  </div>
                </Link>
                <Link href="/super-admin/security">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <ShieldCheck className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Security Center</p>
                    <p className="text-sm text-slate-500">Incidents & logs</p>
                  </div>
                </Link>
                <Link href="/super-admin/operations">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <Activity className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Operations</p>
                    <p className="text-sm text-slate-500">System health</p>
                  </div>
                </Link>
                <Link href="/super-admin/analytics">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Analytics</p>
                    <p className="text-sm text-slate-500">Platform insights</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </DashboardLayout>
  );
}
```

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add client/src/pages/v3/super-admin/SuperAdminDashboard.tsx
git commit -m "feat(v3): add new super admin dashboard page"
```

---

### Task 19: Update Routes and Delete Old Super Admin Dashboard

**Files:**
- Modify: `client/src/App.tsx`
- Delete: `client/src/pages/super-admin/SuperAdminDashboard.tsx`

**Step 1: Import and update route**

```tsx
const SuperAdminDashboardV3 = lazy(() => import("@/pages/v3/super-admin/SuperAdminDashboard"));
```

Replace the `/super-admin/dashboard` route:
```tsx
<Route path="/super-admin/dashboard" component={SuperAdminDashboardV3} />
```

**Step 2: Delete old file**

```bash
rm client/src/pages/super-admin/SuperAdminDashboard.tsx
```

**Step 3: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(v3): switch super admin dashboard to new design, remove old"
```

---

## Phase 6-8: Remaining Dashboards (Agent, Ops, Sales)

Tasks 20-25 follow the same pattern:
1. Create new dashboard in `/pages/v3/<role>/`
2. Update route in App.tsx
3. Delete old dashboard file
4. Verify build and commit

Each dashboard uses `DashboardLayout`, `MetricCard`, `PageShell`, `DataTable`, and `EmptyState` components with role-specific navigation and metrics.

---

## Final Phase: Cleanup

### Task 26: Final Verification and Cleanup

**Step 1: Run full build**

```bash
cd client && npm run build
```

**Step 2: Check for any orphaned imports**

Search for any remaining imports of old page components:
```bash
grep -r "UnifiedLanding\|ClientPortalV2\|AdminDashboard\|SuperAdminDashboard" client/src --include="*.tsx" --include="*.ts"
```

Expected: No results (all old imports removed)

**Step 3: Verify all routes work**

```bash
npm run dev
```

Manually test each route:
- `/` - New landing page
- `/portal-v2` - New client dashboard
- `/admin/dashboard` - New admin dashboard
- `/super-admin/dashboard` - New super admin dashboard

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete v3 redesign implementation"
```

---

## Success Criteria Checklist

- [ ] All v3 components created (MetricCard, PageShell, AppSidebar, AppHeader, DashboardLayout, DataTable, EmptyState)
- [ ] Navy color palette added to Tailwind
- [ ] New landing page live at `/`
- [ ] Old `UnifiedLanding.tsx` deleted
- [ ] New client dashboard live at `/portal-v2`
- [ ] Old `ClientPortalV2.tsx` deleted
- [ ] New admin dashboard live at `/admin/dashboard`
- [ ] Old `AdminDashboard.tsx` deleted
- [ ] New super admin dashboard live at `/super-admin/dashboard`
- [ ] Old `SuperAdminDashboard.tsx` deleted
- [ ] Build passes with no errors
- [ ] All pages use consistent Corporate Authority design
