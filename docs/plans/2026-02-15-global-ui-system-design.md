# DigiComply Global UI System - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a unified, globally consistent UI system across all 98 pages with proper layout hierarchy, footer logic, and V3 design system adoption.

**Architecture:** Layout Component Hierarchy pattern with PublicLayout (footer), DashboardLayout (no footer), MinimalLayout (focus mode), and PrintLayout (no chrome).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, V3 Design System

**Approved:** 2026-02-15

---

## 1. Problem Statement

### Current Issues
- **Design System Fragmentation:** 4 pages use V3, 94 pages use legacy mixed patterns
- **Footer Chaos:** Footer renders on all pages with complex route-matching logic
- **Color Inconsistency:** V3 uses hardcoded slate colors, legacy uses CSS variables
- **Navigation Sprawl:** 7 separate navigation config files
- **Accessibility Gaps:** Missing aria-current, keyboard navigation issues
- **Mobile Experience:** No bottom navigation, inconsistent touch targets

### Success Criteria
- [ ] Footer appears ONLY on public pages
- [ ] All authenticated pages use DashboardLayout (no footer)
- [ ] Top 20 high-traffic pages migrated to V3
- [ ] Unified color token system
- [ ] Single navigation configuration
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Mobile bottom navigation for dashboards

---

## 2. Layout Architecture

### 2.1 Layout Hierarchy

```
client/src/layouts/
├── UnifiedLayoutProvider.tsx    # Context provider for layout state
├── PublicLayout.tsx             # Landing, Login, Register (WITH Footer)
├── DashboardLayout.tsx          # All authenticated portals (NO Footer)
├── MinimalLayout.tsx            # Onboarding, Payment, Focus modes
├── PrintLayout.tsx              # Reports, Invoices (no chrome)
└── index.ts                     # Barrel exports
```

### 2.2 Layout Selection Rules

```typescript
// config/layoutRules.ts
export type LayoutType = 'public' | 'dashboard' | 'minimal' | 'print';

export const LAYOUT_RULES: Record<LayoutType, string[]> = {
  public: [
    '/',
    '/landing',
    '/login',
    '/signin',
    '/register',
    '/client-registration',
    '/signup',
    '/platform-demo',
    '/design-system',
    '/pricing',
    '/features',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ],
  minimal: [
    '/onboarding-flow',
    '/smart-start',
    '/whatsapp-onboarding',
    '/payment-gateway',
    '/esign-agreements',
    '/confirmation',
    '/select-role',
    '/role-selection',
    '/delivery/*',
  ],
  print: [
    '/executive-summary',
    '/compliance-report',
    '/investor-summary',
    '/invoice/*',
    '/receipt/*',
  ],
  dashboard: [], // Default - all other authenticated routes
};

export function getLayoutForRoute(path: string): LayoutType {
  for (const [layout, routes] of Object.entries(LAYOUT_RULES)) {
    if (layout === 'dashboard') continue;
    for (const route of routes) {
      if (route.endsWith('/*')) {
        if (path.startsWith(route.slice(0, -2))) return layout as LayoutType;
      } else if (path === route) {
        return layout as LayoutType;
      }
    }
  }
  return 'dashboard';
}
```

### 2.3 Layout Components

#### PublicLayout.tsx
```tsx
import { Footer } from '@/components/Footer';
import { PublicHeader } from '@/components/headers/PublicHeader';

interface PublicLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function PublicLayout({
  children,
  showHeader = true,
  showFooter = true
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showHeader && <PublicHeader />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
```

#### DashboardLayout.tsx (V3 - Enhanced)
```tsx
import { AppSidebar } from '@/components/v3/AppSidebar';
import { AppHeader } from '@/components/v3/AppHeader';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';
import { getNavigationForRole } from '@/config/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  title,
  breadcrumbs,
  actions
}: DashboardLayoutProps) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = getNavigationForRole(user?.role);

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
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
          />
          <div className="absolute left-0 top-0 h-full">
            <AppSidebar
              sections={navigation}
              collapsed={false}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <AppHeader
          user={user}
          title={title}
          breadcrumbs={breadcrumbs}
          actions={actions}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6"
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          role={user?.role}
          className="lg:hidden"
        />
      </div>
    </div>
  );
}
```

#### MinimalLayout.tsx
```tsx
import { MinimalHeader } from '@/components/headers/MinimalHeader';

interface MinimalLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function MinimalLayout({
  children,
  showHeader = true,
  showBackButton = false,
  onBack
}: MinimalLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {showHeader && (
        <MinimalHeader
          showBackButton={showBackButton}
          onBack={onBack}
        />
      )}
      <main className="max-w-2xl mx-auto py-8 px-4 sm:py-12 sm:px-6">
        {children}
      </main>
    </div>
  );
}
```

#### PrintLayout.tsx
```tsx
interface PrintLayoutProps {
  children: React.ReactNode;
}

export function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <div className="min-h-screen bg-white print:bg-white">
      <main className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0">
        {children}
      </main>
    </div>
  );
}
```

---

## 3. Footer Redesign

### 3.1 Current State (Remove)
```tsx
// App.tsx - CURRENT (TO BE REMOVED)
<Router>
  <Suspense fallback={<Loading />}>
    <Switch>
      {/* routes */}
    </Switch>
  </Suspense>
  <Footer /> {/* Renders on ALL pages - REMOVE THIS */}
</Router>
```

### 3.2 New State
```tsx
// App.tsx - NEW
<Router>
  <LayoutProvider>
    <Suspense fallback={<Loading />}>
      <Switch>
        {/* routes - each wrapped with appropriate layout */}
      </Switch>
    </Suspense>
  </LayoutProvider>
</Router>
```

### 3.3 Footer Simplification
```tsx
// Footer.tsx - SIMPLIFIED
// REMOVE: DASHBOARD_ROUTES array
// REMOVE: isDashboardRoute logic
// REMOVE: lg:ml-60 conditional offset
// REMOVE: useLocation for route checking

// Footer is now ONLY rendered inside PublicLayout
// No conditional logic needed - always full width
export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Full footer content - no conditionals */}
    </footer>
  );
}
```

---

## 4. Color System Unification

### 4.1 CSS Variable Additions

Add to `client/src/index.css`:

```css
@layer base {
  :root {
    /* Existing semantic colors... */

    /* NEW: V3 Surface tokens */
    --surface: 210 40% 98%;              /* slate-50 */
    --surface-raised: 0 0% 100%;         /* white */
    --surface-overlay: 222 47% 11%;      /* slate-900 */
    --surface-sunken: 210 40% 96%;       /* slate-100 */

    /* NEW: V3 Border tokens */
    --border-subtle: 214 32% 91%;        /* slate-200 */
    --border-default: 214 32% 85%;       /* slate-300 */
    --border-strong: 215 20% 65%;        /* slate-400 */

    /* NEW: V3 Text tokens */
    --text-primary: 222 47% 11%;         /* slate-900 */
    --text-secondary: 215 16% 47%;       /* slate-500 */
    --text-muted: 215 20% 65%;           /* slate-400 */
    --text-disabled: 215 20% 75%;        /* slate-300 */

    /* NEW: Interactive tokens */
    --interactive-hover: 210 40% 96%;    /* slate-100 */
    --interactive-active: 222 47% 11%;   /* slate-900 */
    --interactive-selected: 217 91% 60%; /* blue-500 */
  }

  .dark {
    /* Dark mode overrides */
    --surface: 222 47% 11%;
    --surface-raised: 223 47% 14%;
    --surface-overlay: 0 0% 100%;
    --surface-sunken: 223 47% 8%;

    --border-subtle: 217 19% 27%;
    --border-default: 217 19% 35%;
    --border-strong: 215 20% 50%;

    --text-primary: 210 40% 98%;
    --text-secondary: 215 20% 65%;
    --text-muted: 215 16% 47%;
    --text-disabled: 217 19% 35%;

    --interactive-hover: 223 47% 14%;
    --interactive-active: 210 40% 98%;
  }
}
```

### 4.2 Tailwind Config Updates

Add to `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      // Existing colors...

      // V3 semantic tokens
      surface: {
        DEFAULT: 'hsl(var(--surface))',
        raised: 'hsl(var(--surface-raised))',
        overlay: 'hsl(var(--surface-overlay))',
        sunken: 'hsl(var(--surface-sunken))',
      },
      'text-color': {
        primary: 'hsl(var(--text-primary))',
        secondary: 'hsl(var(--text-secondary))',
        muted: 'hsl(var(--text-muted))',
        disabled: 'hsl(var(--text-disabled))',
      },
    },
    borderColor: {
      subtle: 'hsl(var(--border-subtle))',
      strong: 'hsl(var(--border-strong))',
    },
  },
}
```

### 4.3 V3 Component Migration

```tsx
// BEFORE
<div className="bg-slate-50">
<div className="bg-white border-slate-200">
<span className="text-slate-500">

// AFTER
<div className="bg-surface">
<div className="bg-surface-raised border-subtle">
<span className="text-text-secondary">
```

---

## 5. Navigation Consolidation

### 5.1 Unified Navigation Config

Create `client/src/config/navigation.ts`:

```typescript
import { LucideIcon, Home, FileText, Calendar, Folder, Settings, Users, BarChart3, Shield, Briefcase, CheckSquare, MessageSquare, Bell, CreditCard, Building2, Layers, Activity, Target, PieChart } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export type UserRole =
  | 'client'
  | 'agent'
  | 'admin'
  | 'super_admin'
  | 'operations'
  | 'qc'
  | 'sales'
  | 'hr'
  | 'customer_service'
  | 'accountant';

export const NAVIGATION: Record<UserRole, NavSection[]> = {
  client: [
    {
      items: [
        { label: 'Dashboard', href: '/portal-v2', icon: Home },
        { label: 'Services', href: '/services', icon: Briefcase },
        { label: 'My Requests', href: '/service-requests', icon: FileText },
        { label: 'Compliance', href: '/compliance-calendar', icon: Calendar },
        { label: 'Documents', href: '/vault', icon: Folder },
      ],
    },
    {
      title: 'AI Tools',
      items: [
        { label: 'AutoComply', href: '/autocomply', icon: Activity },
        { label: 'DigiScore', href: '/digiscore', icon: Target },
        { label: 'TaxTracker', href: '/taxtracker', icon: PieChart },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Messages', href: '/messages', icon: MessageSquare },
        { label: 'Notifications', href: '/notifications', icon: Bell },
        { label: 'Billing', href: '/portal-v2/account/billing', icon: CreditCard },
        { label: 'Settings', href: '/portal-v2/account/security', icon: Settings },
      ],
    },
  ],

  agent: [
    {
      items: [
        { label: 'Dashboard', href: '/agent', icon: Home },
        { label: 'My Leads', href: '/agent/leads', icon: Users },
        { label: 'Commissions', href: '/agent/commissions', icon: CreditCard },
        { label: 'Performance', href: '/agent/performance', icon: BarChart3 },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'KYC', href: '/agent/kyc', icon: Shield },
        { label: 'Profile', href: '/agent/profile', icon: Settings },
      ],
    },
  ],

  operations: [
    {
      items: [
        { label: 'Dashboard', href: '/operations', icon: Home },
        { label: 'Work Queue', href: '/work-queue', icon: Layers },
        { label: 'Documents', href: '/document-review', icon: FileText },
        { label: 'Escalations', href: '/escalations', icon: Activity },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Metrics', href: '/quality-metrics', icon: BarChart3 },
      ],
    },
  ],

  qc: [
    {
      items: [
        { label: 'Review Queue', href: '/qc', icon: CheckSquare },
        { label: 'Delivery', href: '/qc-delivery-handoff', icon: FileText },
        { label: 'Metrics', href: '/quality-metrics', icon: BarChart3 },
      ],
    },
  ],

  sales: [
    {
      items: [
        { label: 'Dashboard', href: '/sales', icon: Home },
        { label: 'Leads', href: '/leads', icon: Users },
        { label: 'Pipeline', href: '/lead-pipeline', icon: Activity },
        { label: 'Proposals', href: '/proposals', icon: FileText },
      ],
    },
  ],

  admin: [
    {
      items: [
        { label: 'Dashboard', href: '/admin', icon: Home },
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Services', href: '/admin/services', icon: Briefcase },
        { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'Platform',
      items: [
        { label: 'Blueprints', href: '/admin/blueprints', icon: Layers },
        { label: 'Configuration', href: '/config', icon: Settings },
        { label: 'Bulk Upload', href: '/bulk-upload', icon: FileText },
      ],
    },
    {
      title: 'Developer',
      items: [
        { label: 'API Keys', href: '/admin/api-keys', icon: Shield },
        { label: 'Webhooks', href: '/admin/webhooks', icon: Activity },
        { label: 'Audit Log', href: '/audit-log', icon: FileText },
      ],
    },
  ],

  super_admin: [
    {
      items: [
        { label: 'Dashboard', href: '/super-admin', icon: Home },
        { label: 'Tenants', href: '/super-admin/tenants', icon: Building2 },
        { label: 'Pricing', href: '/super-admin/pricing', icon: CreditCard },
        { label: 'Analytics', href: '/super-admin/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Platform',
      items: [
        { label: 'Services', href: '/super-admin/services', icon: Briefcase },
        { label: 'Commissions', href: '/super-admin/commissions', icon: PieChart },
        { label: 'Security', href: '/super-admin/security', icon: Shield },
        { label: 'Operations', href: '/super-admin/operations', icon: Activity },
      ],
    },
  ],

  hr: [
    {
      items: [
        { label: 'Dashboard', href: '/hr', icon: Home },
        { label: 'Employees', href: '/hr/employees', icon: Users },
        { label: 'Performance', href: '/hr/performance', icon: BarChart3 },
      ],
    },
  ],

  customer_service: [
    {
      items: [
        { label: 'Dashboard', href: '/customer-service', icon: Home },
        { label: 'Tickets', href: '/support', icon: MessageSquare },
        { label: 'Playbooks', href: '/playbooks', icon: FileText },
        { label: 'Renewals', href: '/renewals', icon: Activity },
      ],
    },
  ],

  accountant: [
    {
      items: [
        { label: 'Dashboard', href: '/financials', icon: Home },
        { label: 'Analytics', href: '/revenue-analytics', icon: BarChart3 },
        { label: 'Executive', href: '/executive-dashboard', icon: PieChart },
      ],
    },
  ],
};

export function getNavigationForRole(role?: string): NavSection[] {
  if (!role) return [];
  const normalizedRole = role.toLowerCase().replace(/_/g, '_') as UserRole;
  return NAVIGATION[normalizedRole] || [];
}
```

---

## 6. Mobile Bottom Navigation

Create `client/src/components/navigation/MobileBottomNav.tsx`:

```typescript
import { NavLink } from '@/components/ui/nav-link';
import { Home, Briefcase, FileText, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  role?: string;
  className?: string;
}

const NAV_ITEMS = {
  client: [
    { label: 'Home', href: '/portal-v2', icon: Home },
    { label: 'Services', href: '/services', icon: Briefcase },
    { label: 'Requests', href: '/service-requests', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'Account', href: '/portal-v2/account', icon: User },
  ],
  agent: [
    { label: 'Home', href: '/agent', icon: Home },
    { label: 'Leads', href: '/agent/leads', icon: Briefcase },
    { label: 'Earnings', href: '/agent/commissions', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'Profile', href: '/agent/profile', icon: User },
  ],
  operations: [
    { label: 'Home', href: '/operations', icon: Home },
    { label: 'Queue', href: '/work-queue', icon: Briefcase },
    { label: 'Review', href: '/document-review', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'More', href: '/escalations', icon: User },
  ],
  default: [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Tasks', href: '/tasks', icon: FileText },
    { label: 'Alerts', href: '/notifications', icon: Bell },
    { label: 'Account', href: '/settings', icon: User },
  ],
};

export function MobileBottomNav({ role, className }: MobileBottomNavProps) {
  const items = NAV_ITEMS[role?.toLowerCase() as keyof typeof NAV_ITEMS] || NAV_ITEMS.default;

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 bg-surface-raised border-t border-subtle z-40 safe-area-pb",
        className
      )}
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center px-3 py-2 min-w-[64px] text-text-secondary hover:text-text-primary"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" aria-hidden />
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

---

## 7. Accessibility Requirements

### 7.1 Skip Links
Add to all layouts:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded"
>
  Skip to main content
</a>
```

### 7.2 Navigation ARIA
```tsx
// Sidebar
<nav aria-label="Main navigation">
  <a
    href={item.href}
    aria-current={isActive ? 'page' : undefined}
  >
```

### 7.3 Modal/Overlay Escape Key
```tsx
<div
  role="dialog"
  aria-modal="true"
  onKeyDown={(e) => e.key === 'Escape' && onClose()}
  tabIndex={-1}
>
```

### 7.4 Status Indicators
```tsx
// Use icon + text, not color alone
<span className="flex items-center gap-1.5 text-success">
  <CheckCircle className="h-4 w-4" aria-hidden />
  <span>Active</span>
</span>
```

---

## 8. Page Migration Priority

### Tier 1 - Critical Path (Week 1-2)
| Page | Route | Current | Action |
|------|-------|---------|--------|
| Client Dashboard | `/portal-v2` | V3 | Enhance |
| Service Catalog | `/services` | Legacy | Migrate |
| Operations Queue | `/operations` | Legacy | Migrate |
| Admin Dashboard | `/admin` | V3 | Enhance |
| Login | `/login` | Legacy | Migrate |
| Landing Page | `/` | V3 | Enhance |

### Tier 2 - High Usage (Week 3-4)
| Page | Route | Current | Action |
|------|-------|---------|--------|
| Compliance Calendar | `/compliance-calendar` | Legacy | Migrate |
| Document Vault | `/vault` | Legacy | Migrate |
| Service Requests | `/service-requests` | Legacy | Migrate |
| Agent Dashboard | `/agent` | Legacy | Migrate |
| QC Dashboard | `/qc` | Legacy | Migrate |
| Sales Dashboard | `/sales` | Legacy | Migrate |
| Lead Pipeline | `/lead-pipeline` | Legacy | Migrate |
| Notification Center | `/notifications` | Legacy | Migrate |

### Tier 3 - Important (Week 5-6)
| Page | Route | Current | Action |
|------|-------|---------|--------|
| Client Registration | `/register` | Legacy | Migrate |
| Smart Start | `/smart-start` | Legacy | Migrate |
| Financial Dashboard | `/financials` | Legacy | Migrate |
| Super Admin Dashboard | `/super-admin` | V3 | Enhance |
| User Management | `/admin/users` | Legacy | Migrate |
| Configuration | `/config` | Legacy | Migrate |

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create layouts directory structure
- [ ] Implement UnifiedLayoutProvider
- [ ] Implement PublicLayout, DashboardLayout, MinimalLayout, PrintLayout
- [ ] Move Footer inside PublicLayout only
- [ ] Update App.tsx to use layouts
- [ ] Add CSS variable tokens for V3 colors
- [ ] Update Tailwind config with semantic tokens

### Phase 2: Core Components (Week 2)
- [ ] Create MobileBottomNav component
- [ ] Create PublicHeader and MinimalHeader
- [ ] Enhance AppHeader with breadcrumbs
- [ ] Consolidate navigation configs
- [ ] Add skip links to all layouts
- [ ] Fix modal Escape key handling

### Phase 3: Tier 1 Migration (Week 2-3)
- [ ] Migrate Service Catalog to V3
- [ ] Migrate Operations Queue to V3
- [ ] Migrate Login page to V3
- [ ] Enhance existing V3 dashboards

### Phase 4: Tier 2 Migration (Week 4)
- [ ] Migrate Compliance Calendar
- [ ] Migrate Document Vault
- [ ] Migrate Service Requests
- [ ] Migrate Agent Dashboard
- [ ] Migrate QC Dashboard
- [ ] Migrate Sales Dashboard
- [ ] Migrate Lead Pipeline
- [ ] Migrate Notification Center

### Phase 5: Tier 3 & Polish (Week 5-6)
- [ ] Migrate remaining Tier 3 pages
- [ ] Update V3 components to use semantic tokens
- [ ] Add loading skeletons
- [ ] Responsive testing
- [ ] Accessibility audit
- [ ] Performance optimization

---

## 10. Testing Strategy

### Unit Tests
- Layout selection logic
- Navigation config helpers
- Color token compilation

### Integration Tests
- Footer visibility per route
- Layout switching on navigation
- Mobile bottom nav rendering

### E2E Tests
- Complete user flows per role
- Mobile responsive behavior
- Keyboard navigation

### Accessibility Tests
- axe-core automated scans
- Manual screen reader testing
- Keyboard-only navigation

---

## 11. Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Pages using V3 | 4 (4%) | 20 (20%) |
| Design system consistency | 68/100 | 85/100 |
| Mobile UX score | 65/100 | 80/100 |
| Accessibility score | 70/100 | 90/100 |
| Footer on dashboard pages | Yes | No |
| Navigation configs | 7 files | 1 file |

---

## 12. Rollback Plan

If issues arise during migration:
1. Layout system is additive - old pages continue working
2. Keep legacy DashboardLayout as fallback
3. Feature flag for new layouts: `USE_UNIFIED_LAYOUTS=true`
4. Per-page opt-in initially, then opt-out

---

## Appendix A: File Structure After Migration

```
client/src/
├── layouts/
│   ├── UnifiedLayoutProvider.tsx
│   ├── PublicLayout.tsx
│   ├── DashboardLayout.tsx
│   ├── MinimalLayout.tsx
│   ├── PrintLayout.tsx
│   └── index.ts
├── components/
│   ├── v3/
│   │   ├── AppSidebar.tsx
│   │   ├── AppHeader.tsx
│   │   ├── PageShell.tsx
│   │   ├── MetricCard.tsx
│   │   ├── DataTable.tsx
│   │   └── EmptyState.tsx
│   ├── headers/
│   │   ├── PublicHeader.tsx
│   │   └── MinimalHeader.tsx
│   ├── navigation/
│   │   ├── MobileBottomNav.tsx
│   │   ├── Breadcrumbs.tsx
│   │   └── NavLink.tsx
│   ├── Footer.tsx (simplified)
│   └── ui/ (unchanged)
├── config/
│   ├── navigation.ts
│   ├── layoutRules.ts
│   └── routes.ts
└── styles/
    └── globals.css (with new tokens)
```

---

*Design approved: 2026-02-15*
*Author: AI Product & UX Expert*
