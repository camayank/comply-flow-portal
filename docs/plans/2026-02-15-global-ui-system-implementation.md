# Global UI System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a unified layout system with proper footer logic, V3 design tokens, and migrate top 20 pages for consistent global UI.

**Architecture:** Layout Component Hierarchy with PublicLayout (footer), DashboardLayout (no footer), MinimalLayout, and PrintLayout. Footer removed from App.tsx and placed inside PublicLayout only.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, wouter router

**Design Doc:** `docs/plans/2026-02-15-global-ui-system-design.md`

---

## Phase 1: Foundation

### Task 1: Create Layout Directory Structure

**Files:**
- Create: `client/src/layouts/index.ts`
- Create: `client/src/layouts/types.ts`

**Step 1: Create layouts directory and types**

```bash
mkdir -p client/src/layouts
```

**Step 2: Create types file**

Create `client/src/layouts/types.ts`:

```typescript
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
```

**Step 3: Create barrel export**

Create `client/src/layouts/index.ts`:

```typescript
export * from './types';
export { PublicLayout } from './PublicLayout';
export { DashboardLayout } from './DashboardLayout';
export { MinimalLayout } from './MinimalLayout';
export { PrintLayout } from './PrintLayout';
export { UnifiedLayoutProvider, useLayout } from './UnifiedLayoutProvider';
```

**Step 4: Commit**

```bash
git add client/src/layouts/
git commit -m "feat(layouts): Create layout directory structure and types"
```

---

### Task 2: Create Layout Rules Configuration

**Files:**
- Create: `client/src/config/layoutRules.ts`

**Step 1: Create layout rules config**

Create `client/src/config/layoutRules.ts`:

```typescript
import { LayoutType } from '@/layouts/types';

export const LAYOUT_RULES: Record<Exclude<LayoutType, 'dashboard'>, string[]> = {
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
    '/compliance-scorecard',
    '/10k',
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
  ],
  print: [
    '/executive-summary',
    '/compliance-report',
    '/investor-summary',
  ],
};

export function getLayoutForRoute(path: string): LayoutType {
  // Check public routes
  if (LAYOUT_RULES.public.some(route => path === route || path.startsWith(route + '/'))) {
    return 'public';
  }

  // Check minimal routes
  if (LAYOUT_RULES.minimal.some(route => path === route || path.startsWith(route + '/'))) {
    return 'minimal';
  }

  // Check print routes
  if (LAYOUT_RULES.print.some(route => path === route || path.startsWith(route + '/'))) {
    return 'print';
  }

  // Check for delivery routes (minimal)
  if (path.startsWith('/delivery/')) {
    return 'minimal';
  }

  // Check for invoice/receipt routes (print)
  if (path.startsWith('/invoice/') || path.startsWith('/receipt/')) {
    return 'print';
  }

  // Default to dashboard for all authenticated routes
  return 'dashboard';
}

export function isPublicRoute(path: string): boolean {
  return getLayoutForRoute(path) === 'public';
}
```

**Step 2: Commit**

```bash
git add client/src/config/layoutRules.ts
git commit -m "feat(config): Add layout rules configuration"
```

---

### Task 3: Add V3 Color Tokens to CSS

**Files:**
- Modify: `client/src/index.css`

**Step 1: Read current CSS file**

```bash
head -100 client/src/index.css
```

**Step 2: Add V3 semantic tokens after existing :root variables**

Add to `client/src/index.css` inside `:root`:

```css
    /* V3 Surface tokens */
    --surface: 210 40% 98%;
    --surface-raised: 0 0% 100%;
    --surface-overlay: 222 47% 11%;
    --surface-sunken: 210 40% 96%;

    /* V3 Border tokens */
    --border-subtle: 214 32% 91%;
    --border-strong: 215 20% 65%;

    /* V3 Text tokens */
    --text-primary: 222 47% 11%;
    --text-secondary: 215 16% 47%;
    --text-muted: 215 20% 65%;
    --text-disabled: 215 20% 75%;

    /* Interactive tokens */
    --interactive-hover: 210 40% 96%;
    --interactive-active: 222 47% 11%;
```

**Step 3: Add dark mode overrides**

Add to `client/src/index.css` inside `.dark`:

```css
    /* V3 Surface tokens - dark */
    --surface: 222 47% 11%;
    --surface-raised: 223 47% 14%;
    --surface-overlay: 0 0% 100%;
    --surface-sunken: 223 47% 8%;

    /* V3 Border tokens - dark */
    --border-subtle: 217 19% 27%;
    --border-strong: 215 20% 50%;

    /* V3 Text tokens - dark */
    --text-primary: 210 40% 98%;
    --text-secondary: 215 20% 65%;
    --text-muted: 215 16% 47%;
    --text-disabled: 217 19% 35%;

    /* Interactive tokens - dark */
    --interactive-hover: 223 47% 14%;
    --interactive-active: 210 40% 98%;
```

**Step 4: Commit**

```bash
git add client/src/index.css
git commit -m "feat(styles): Add V3 semantic color tokens"
```

---

### Task 4: Update Tailwind Config with Semantic Tokens

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Read current Tailwind config**

```bash
cat tailwind.config.ts
```

**Step 2: Add semantic color extensions**

Add to `tailwind.config.ts` in `theme.extend.colors`:

```typescript
      // V3 semantic surface colors
      surface: {
        DEFAULT: 'hsl(var(--surface))',
        raised: 'hsl(var(--surface-raised))',
        overlay: 'hsl(var(--surface-overlay))',
        sunken: 'hsl(var(--surface-sunken))',
      },
      // V3 semantic text colors
      'text-color': {
        primary: 'hsl(var(--text-primary))',
        secondary: 'hsl(var(--text-secondary))',
        muted: 'hsl(var(--text-muted))',
        disabled: 'hsl(var(--text-disabled))',
      },
      // Interactive states
      interactive: {
        hover: 'hsl(var(--interactive-hover))',
        active: 'hsl(var(--interactive-active))',
      },
```

**Step 3: Add border color extensions**

Add to `tailwind.config.ts` in `theme.extend`:

```typescript
    borderColor: {
      subtle: 'hsl(var(--border-subtle))',
      strong: 'hsl(var(--border-strong))',
    },
```

**Step 4: Verify Tailwind compiles**

```bash
cd client && npx tailwindcss --help
```

**Step 5: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(tailwind): Add V3 semantic token extensions"
```

---

### Task 5: Create UnifiedLayoutProvider

**Files:**
- Create: `client/src/layouts/UnifiedLayoutProvider.tsx`

**Step 1: Create the provider component**

Create `client/src/layouts/UnifiedLayoutProvider.tsx`:

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getLayoutForRoute, isPublicRoute } from '@/config/layoutRules';
import { LayoutType } from './types';

interface LayoutContextValue {
  layoutType: LayoutType;
  isPublic: boolean;
  isAuthenticated: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface UnifiedLayoutProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function UnifiedLayoutProvider({
  children,
  isAuthenticated = false,
}: UnifiedLayoutProviderProps) {
  const [location] = useLocation();
  const layoutType = getLayoutForRoute(location);
  const isPublic = isPublicRoute(location);

  return (
    <LayoutContext.Provider
      value={{
        layoutType,
        isPublic,
        isAuthenticated,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within UnifiedLayoutProvider');
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add client/src/layouts/UnifiedLayoutProvider.tsx
git commit -m "feat(layouts): Create UnifiedLayoutProvider context"
```

---

### Task 6: Create PublicHeader Component

**Files:**
- Create: `client/src/components/headers/PublicHeader.tsx`
- Create: `client/src/components/headers/index.ts`

**Step 1: Create headers directory**

```bash
mkdir -p client/src/components/headers
```

**Step 2: Create PublicHeader**

Create `client/src/components/headers/PublicHeader.tsx`:

```typescript
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PublicHeaderProps {
  className?: string;
}

export function PublicHeader({ className }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={cn("sticky top-0 z-50 bg-white border-b border-border", className)}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <span className="text-xl font-bold text-foreground">DigiComply</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/features">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
            </Link>
            <Link href="/pricing">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </Link>
            <Link href="/about">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-accent"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link href="/features">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Features
                </a>
              </Link>
              <Link href="/pricing">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Pricing
                </a>
              </Link>
              <Link href="/about">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  About
                </a>
              </Link>
              <div className="flex gap-3 pt-4 border-t border-border">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="flex-1">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="flex-1">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
```

**Step 3: Create barrel export**

Create `client/src/components/headers/index.ts`:

```typescript
export { PublicHeader } from './PublicHeader';
export { MinimalHeader } from './MinimalHeader';
```

**Step 4: Commit**

```bash
git add client/src/components/headers/
git commit -m "feat(headers): Create PublicHeader component"
```

---

### Task 7: Create MinimalHeader Component

**Files:**
- Create: `client/src/components/headers/MinimalHeader.tsx`

**Step 1: Create MinimalHeader**

Create `client/src/components/headers/MinimalHeader.tsx`:

```typescript
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimalHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export function MinimalHeader({
  showBackButton = false,
  onBack,
  className,
}: MinimalHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header className={cn("bg-white border-b border-border", className)}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Back button or spacer */}
          <div className="w-10">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <span className="text-xl font-bold text-foreground">DigiComply</span>
            </a>
          </Link>

          {/* Spacer for symmetry */}
          <div className="w-10" />
        </div>
      </div>
    </header>
  );
}
```

**Step 2: Update barrel export**

Update `client/src/components/headers/index.ts`:

```typescript
export { PublicHeader } from './PublicHeader';
export { MinimalHeader } from './MinimalHeader';
```

**Step 3: Commit**

```bash
git add client/src/components/headers/
git commit -m "feat(headers): Create MinimalHeader component"
```

---

### Task 8: Create PublicLayout Component

**Files:**
- Create: `client/src/layouts/PublicLayout.tsx`

**Step 1: Create PublicLayout**

Create `client/src/layouts/PublicLayout.tsx`:

```typescript
import { PublicLayoutProps } from './types';
import { PublicHeader } from '@/components/headers/PublicHeader';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';

export function PublicLayout({
  children,
  showHeader = true,
  showFooter = true,
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-lg"
      >
        Skip to main content
      </a>

      {showHeader && <PublicHeader />}

      <main id="main-content" className="flex-1">
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/layouts/PublicLayout.tsx
git commit -m "feat(layouts): Create PublicLayout with footer"
```

---

### Task 9: Create Enhanced DashboardLayout

**Files:**
- Create: `client/src/layouts/DashboardLayout.tsx`

**Step 1: Create DashboardLayout**

Create `client/src/layouts/DashboardLayout.tsx`:

```typescript
import { useState } from 'react';
import { DashboardLayoutProps, Breadcrumb } from './types';
import { AppSidebar } from '@/components/v3/AppSidebar';
import { AppHeader } from '@/components/v3/AppHeader';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

// Temporary inline navigation until Task 14
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
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Will be replaced with getNavigationForRole(user?.role) in Task 14
  const navigation = DEFAULT_NAVIGATION;

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
          user={user}
          notificationCount={0}
          onMenuClick={() => setMobileMenuOpen(true)}
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
```

**Step 2: Commit**

```bash
git add client/src/layouts/DashboardLayout.tsx
git commit -m "feat(layouts): Create DashboardLayout without footer"
```

---

### Task 10: Create MinimalLayout Component

**Files:**
- Create: `client/src/layouts/MinimalLayout.tsx`

**Step 1: Create MinimalLayout**

Create `client/src/layouts/MinimalLayout.tsx`:

```typescript
import { MinimalLayoutProps } from './types';
import { MinimalHeader } from '@/components/headers/MinimalHeader';

export function MinimalLayout({
  children,
  showHeader = true,
  showBackButton = false,
  onBack,
}: MinimalLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-lg"
      >
        Skip to main content
      </a>

      {showHeader && (
        <MinimalHeader
          showBackButton={showBackButton}
          onBack={onBack}
        />
      )}

      <main
        id="main-content"
        className="max-w-2xl mx-auto py-8 px-4 sm:py-12 sm:px-6"
      >
        {children}
      </main>

      {/* NO Footer - focus mode */}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/layouts/MinimalLayout.tsx
git commit -m "feat(layouts): Create MinimalLayout for focus modes"
```

---

### Task 11: Create PrintLayout Component

**Files:**
- Create: `client/src/layouts/PrintLayout.tsx`

**Step 1: Create PrintLayout**

Create `client/src/layouts/PrintLayout.tsx`:

```typescript
import { PrintLayoutProps } from './types';

export function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <div className="min-h-screen bg-white print:bg-white">
      <main className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0 print:max-w-none">
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Update barrel export**

Update `client/src/layouts/index.ts`:

```typescript
export * from './types';
export { PublicLayout } from './PublicLayout';
export { DashboardLayout } from './DashboardLayout';
export { MinimalLayout } from './MinimalLayout';
export { PrintLayout } from './PrintLayout';
export { UnifiedLayoutProvider, useLayout } from './UnifiedLayoutProvider';
```

**Step 3: Commit**

```bash
git add client/src/layouts/
git commit -m "feat(layouts): Create PrintLayout and update exports"
```

---

### Task 12: Simplify Footer Component

**Files:**
- Modify: `client/src/components/Footer.tsx`

**Step 1: Read current Footer**

```bash
head -50 client/src/components/Footer.tsx
```

**Step 2: Remove route detection logic**

Remove from `client/src/components/Footer.tsx`:
- Remove `DASHBOARD_ROUTES` array
- Remove `useLocation` import and usage
- Remove `isDashboardRoute` logic
- Remove conditional `lg:ml-60` class

**Step 3: Simplify footer className**

Change footer element from:
```tsx
<footer className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white ${isDashboardRoute ? 'lg:ml-60' : ''}`}>
```

To:
```tsx
<footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
```

**Step 4: Commit**

```bash
git add client/src/components/Footer.tsx
git commit -m "refactor(footer): Remove route detection, simplify for PublicLayout only"
```

---

### Task 13: Update App.tsx to Remove Footer

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Read current App.tsx structure**

```bash
grep -n "Footer" client/src/App.tsx
```

**Step 2: Remove Footer import and usage**

Remove from `client/src/App.tsx`:
- Remove `import { Footer } from '@/components/Footer';`
- Remove `<Footer />` component from JSX

**Step 3: Add UnifiedLayoutProvider**

Add import:
```typescript
import { UnifiedLayoutProvider } from '@/layouts';
```

Wrap Router content:
```tsx
<UnifiedLayoutProvider isAuthenticated={!!user}>
  {/* existing router content */}
</UnifiedLayoutProvider>
```

**Step 4: Verify app runs**

```bash
npm run dev
```

**Step 5: Commit**

```bash
git add client/src/App.tsx
git commit -m "refactor(app): Remove Footer from App, add UnifiedLayoutProvider"
```

---

### Task 14: Create Unified Navigation Config

**Files:**
- Create: `client/src/config/navigation.ts`

**Step 1: Create navigation config**

Create `client/src/config/navigation.ts`:

```typescript
import {
  Home,
  FileText,
  Calendar,
  Folder,
  Settings,
  Users,
  BarChart3,
  Shield,
  Briefcase,
  CheckSquare,
  MessageSquare,
  Bell,
  CreditCard,
  Building2,
  Layers,
  Activity,
  Target,
  PieChart,
  LucideIcon,
} from 'lucide-react';

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
  | 'ops_manager'
  | 'ops_executive'
  | 'qc'
  | 'qc_executive'
  | 'sales'
  | 'sales_manager'
  | 'sales_executive'
  | 'hr'
  | 'customer_service'
  | 'accountant';

const CLIENT_NAV: NavSection[] = [
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
];

const AGENT_NAV: NavSection[] = [
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
];

const OPERATIONS_NAV: NavSection[] = [
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
];

const QC_NAV: NavSection[] = [
  {
    items: [
      { label: 'Review Queue', href: '/qc', icon: CheckSquare },
      { label: 'Delivery', href: '/qc-delivery-handoff', icon: FileText },
      { label: 'Metrics', href: '/quality-metrics', icon: BarChart3 },
    ],
  },
];

const SALES_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/sales', icon: Home },
      { label: 'Leads', href: '/leads', icon: Users },
      { label: 'Pipeline', href: '/lead-pipeline', icon: Activity },
      { label: 'Proposals', href: '/proposals', icon: FileText },
    ],
  },
];

const ADMIN_NAV: NavSection[] = [
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
];

const SUPER_ADMIN_NAV: NavSection[] = [
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
    ],
  },
];

const HR_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/hr', icon: Home },
      { label: 'Employees', href: '/hr/employees', icon: Users },
      { label: 'Performance', href: '/hr/performance', icon: BarChart3 },
    ],
  },
];

const CUSTOMER_SERVICE_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/customer-service', icon: Home },
      { label: 'Tickets', href: '/support', icon: MessageSquare },
      { label: 'Playbooks', href: '/playbooks', icon: FileText },
      { label: 'Renewals', href: '/renewals', icon: Activity },
    ],
  },
];

const ACCOUNTANT_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/financials', icon: Home },
      { label: 'Analytics', href: '/revenue-analytics', icon: BarChart3 },
      { label: 'Executive', href: '/executive-dashboard', icon: PieChart },
    ],
  },
];

const NAVIGATION_MAP: Record<string, NavSection[]> = {
  client: CLIENT_NAV,
  agent: AGENT_NAV,
  operations: OPERATIONS_NAV,
  ops_manager: OPERATIONS_NAV,
  ops_executive: OPERATIONS_NAV,
  qc: QC_NAV,
  qc_executive: QC_NAV,
  sales: SALES_NAV,
  sales_manager: SALES_NAV,
  sales_executive: SALES_NAV,
  admin: ADMIN_NAV,
  super_admin: SUPER_ADMIN_NAV,
  hr: HR_NAV,
  customer_service: CUSTOMER_SERVICE_NAV,
  accountant: ACCOUNTANT_NAV,
};

export function getNavigationForRole(role?: string): NavSection[] {
  if (!role) return CLIENT_NAV;
  const normalizedRole = role.toLowerCase();
  return NAVIGATION_MAP[normalizedRole] || CLIENT_NAV;
}
```

**Step 2: Commit**

```bash
git add client/src/config/navigation.ts
git commit -m "feat(config): Create unified navigation configuration"
```

---

### Task 15: Create MobileBottomNav Component

**Files:**
- Create: `client/src/components/navigation/MobileBottomNav.tsx`
- Create: `client/src/components/navigation/index.ts`

**Step 1: Create navigation directory**

```bash
mkdir -p client/src/components/navigation
```

**Step 2: Create MobileBottomNav**

Create `client/src/components/navigation/MobileBottomNav.tsx`:

```typescript
import { Link, useLocation } from 'wouter';
import { Home, Briefcase, FileText, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MobileBottomNavProps {
  role?: string;
  className?: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
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
  const [location] = useLocation();
  const normalizedRole = role?.toLowerCase() || 'default';
  const items = NAV_ITEMS[normalizedRole] || NAV_ITEMS.default;

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 bg-white border-t border-border z-40 pb-safe",
        className
      )}
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 min-w-[64px] transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 3: Create barrel export**

Create `client/src/components/navigation/index.ts`:

```typescript
export { MobileBottomNav } from './MobileBottomNav';
```

**Step 4: Commit**

```bash
git add client/src/components/navigation/
git commit -m "feat(navigation): Create MobileBottomNav component"
```

---

### Task 16: Update DashboardLayout with Navigation and MobileBottomNav

**Files:**
- Modify: `client/src/layouts/DashboardLayout.tsx`

**Step 1: Update imports and integration**

Update `client/src/layouts/DashboardLayout.tsx`:

```typescript
import { useState } from 'react';
import { DashboardLayoutProps } from './types';
import { AppSidebar } from '@/components/v3/AppSidebar';
import { AppHeader } from '@/components/v3/AppHeader';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { getNavigationForRole } from '@/config/navigation';
import { useAuth } from '@/hooks/use-auth';

export function DashboardLayout({
  children,
  title,
  breadcrumbs,
  actions,
}: DashboardLayoutProps) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = getNavigationForRole(user?.role);

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
          user={user}
          notificationCount={0}
          onMenuClick={() => setMobileMenuOpen(true)}
          showMobileMenu={true}
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

**Step 2: Commit**

```bash
git add client/src/layouts/DashboardLayout.tsx
git commit -m "feat(layouts): Integrate navigation config and MobileBottomNav"
```

---

### Task 17: Add aria-current to AppSidebar

**Files:**
- Modify: `client/src/components/v3/AppSidebar.tsx`

**Step 1: Read current AppSidebar**

```bash
cat client/src/components/v3/AppSidebar.tsx
```

**Step 2: Add aria-current to nav links**

Find the nav link element and add `aria-current`:

```tsx
<Link
  href={item.href}
>
  <a
    className={cn(...)}
    aria-current={isActive ? 'page' : undefined}
  >
```

**Step 3: Commit**

```bash
git add client/src/components/v3/AppSidebar.tsx
git commit -m "fix(a11y): Add aria-current to AppSidebar navigation"
```

---

### Task 18: Wrap Login Page with PublicLayout

**Files:**
- Modify: `client/src/pages/Login.tsx`

**Step 1: Read current Login page**

```bash
head -50 client/src/pages/Login.tsx
```

**Step 2: Wrap with PublicLayout**

Add import and wrap:

```typescript
import { PublicLayout } from '@/layouts';

export default function Login() {
  return (
    <PublicLayout>
      {/* existing login content */}
    </PublicLayout>
  );
}
```

**Step 3: Commit**

```bash
git add client/src/pages/Login.tsx
git commit -m "feat(login): Wrap with PublicLayout"
```

---

### Task 19: Wrap Landing Page with PublicLayout

**Files:**
- Modify: `client/src/pages/v3/LandingPage.tsx`

**Step 1: Read current LandingPage**

```bash
head -50 client/src/pages/v3/LandingPage.tsx
```

**Step 2: Wrap with PublicLayout**

Add import and wrap:

```typescript
import { PublicLayout } from '@/layouts';

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* existing landing content */}
    </PublicLayout>
  );
}
```

**Step 3: Commit**

```bash
git add client/src/pages/v3/LandingPage.tsx
git commit -m "feat(landing): Wrap with PublicLayout"
```

---

### Task 20: Wrap Client Registration with PublicLayout

**Files:**
- Modify: `client/src/pages/ClientRegistration.tsx`

**Step 1: Read current file**

```bash
head -50 client/src/pages/ClientRegistration.tsx
```

**Step 2: Wrap with PublicLayout**

```typescript
import { PublicLayout } from '@/layouts';

// Wrap return with:
return (
  <PublicLayout>
    {/* existing content */}
  </PublicLayout>
);
```

**Step 3: Commit**

```bash
git add client/src/pages/ClientRegistration.tsx
git commit -m "feat(registration): Wrap with PublicLayout"
```

---

## Phase 2: Page Migrations (Tasks 21-40)

### Task 21: Migrate ServiceCatalogBrowser to use new DashboardLayout

**Files:**
- Modify: `client/src/pages/ServiceCatalogBrowser.tsx`

**Step 1: Read current file**

```bash
head -100 client/src/pages/ServiceCatalogBrowser.tsx
```

**Step 2: Import new DashboardLayout**

```typescript
import { DashboardLayout } from '@/layouts';
```

**Step 3: Wrap content with DashboardLayout**

Replace existing layout wrapper with:
```tsx
return (
  <DashboardLayout title="Service Catalog">
    {/* existing page content without old layout wrapper */}
  </DashboardLayout>
);
```

**Step 4: Remove old layout imports**

Remove any imports of old DashboardLayout from v3 or common.

**Step 5: Verify page renders**

```bash
# Navigate to /services in browser
```

**Step 6: Commit**

```bash
git add client/src/pages/ServiceCatalogBrowser.tsx
git commit -m "refactor(services): Migrate to unified DashboardLayout"
```

---

### Task 22-40: Migrate Remaining Tier 1-2 Pages

For each page in the priority list, follow the same pattern:

1. Read current file
2. Import `{ DashboardLayout } from '@/layouts'`
3. Wrap content with `<DashboardLayout title="Page Title">`
4. Remove old layout imports
5. Verify page renders
6. Commit with message: `refactor(<page>): Migrate to unified DashboardLayout`

**Pages to migrate (in order):**
- Task 22: `/operations` - OperationsWorkQueue
- Task 23: `/compliance-calendar` - ClientComplianceCalendar
- Task 24: `/vault` - DocumentVault
- Task 25: `/service-requests` - ServiceRequestsHub
- Task 26: `/agent` - MobileAgentPortal
- Task 27: `/qc` - QCDashboard
- Task 28: `/sales` - SalesDashboard
- Task 29: `/lead-pipeline` - LeadPipeline
- Task 30: `/notifications` - NotificationCenter
- Task 31: `/smart-start` - SmartStart (use MinimalLayout)
- Task 32: `/financials` - FinancialManagementDashboard
- Task 33: `/admin/users` - AdminUserManagement
- Task 34: `/config` - ConfigurationManager

---

## Phase 3: Final Integration

### Task 41: Update V3 Components to Use Semantic Tokens

**Files:**
- Modify: `client/src/components/v3/MetricCard.tsx`
- Modify: `client/src/components/v3/AppHeader.tsx`
- Modify: `client/src/components/v3/AppSidebar.tsx`
- Modify: `client/src/components/v3/DataTable.tsx`
- Modify: `client/src/components/v3/PageShell.tsx`

**Step 1: Update each V3 component**

Replace hardcoded colors with semantic tokens:

```tsx
// BEFORE
bg-slate-50 → bg-surface
bg-white → bg-surface-raised
border-slate-200 → border-subtle
text-slate-500 → text-text-secondary
text-slate-900 → text-text-primary
hover:bg-slate-100 → hover:bg-interactive-hover
```

**Step 2: Commit each file**

```bash
git add client/src/components/v3/MetricCard.tsx
git commit -m "refactor(v3): Update MetricCard to use semantic tokens"
```

---

### Task 42: Remove Old Navigation Config Files

**Files:**
- Delete: `client/src/config/admin-navigation.ts`
- Delete: `client/src/config/agent-navigation.ts`
- Delete: `client/src/config/client-navigation.ts`
- Delete: `client/src/config/operations-navigation.ts`
- Delete: `client/src/config/qc-navigation.ts`
- Delete: `client/src/config/hr-navigation.ts`
- Delete: `client/src/config/super-admin-navigation.ts`

**Step 1: Verify new navigation works**

Test each portal in browser.

**Step 2: Delete old files**

```bash
rm client/src/config/admin-navigation.ts
rm client/src/config/agent-navigation.ts
# etc.
```

**Step 3: Update any imports**

Search for imports of old navigation files and update to use `@/config/navigation`.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(config): Remove legacy navigation configs"
```

---

### Task 43: Add Loading Skeletons to DashboardLayout

**Files:**
- Create: `client/src/components/skeletons/DashboardSkeleton.tsx`
- Modify: `client/src/layouts/DashboardLayout.tsx`

**Step 1: Create skeleton component**

```typescript
export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-muted rounded w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
      <div className="h-64 bg-muted rounded" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/skeletons/
git commit -m "feat(skeletons): Add DashboardSkeleton component"
```

---

### Task 44: Final Testing and Verification

**Step 1: Test all layouts**

- [ ] Public pages show footer
- [ ] Dashboard pages have NO footer
- [ ] Minimal pages (onboarding) have NO footer
- [ ] Print pages have NO chrome

**Step 2: Test all roles**

- [ ] Client portal navigation works
- [ ] Agent portal navigation works
- [ ] Admin portal navigation works
- [ ] Operations portal navigation works

**Step 3: Test mobile**

- [ ] Bottom nav appears on mobile
- [ ] Sidebar hidden on mobile
- [ ] Touch targets are 44px+

**Step 4: Test accessibility**

- [ ] Skip links work
- [ ] Escape closes mobile menu
- [ ] aria-current on active nav items

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: Complete global UI system migration"
```

---

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Foundation | Tasks 1-20 | 2-3 days |
| Phase 2: Migrations | Tasks 21-40 | 3-4 days |
| Phase 3: Integration | Tasks 41-44 | 1-2 days |
| **Total** | **44 tasks** | **6-9 days** |

---

*Plan created: 2026-02-15*
*Design doc: docs/plans/2026-02-15-global-ui-system-design.md*
