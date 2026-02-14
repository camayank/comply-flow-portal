# DigiComply UI Audit Methodology

## End-to-End Screen & Flow Audit Guide

This document provides a comprehensive methodology for auditing UI screens, identifying gaps, understanding root causes, and implementing fixes aligned with platform requirements.

---

## Table of Contents

1. [Audit Framework Overview](#audit-framework-overview)
2. [User Role Inventory](#user-role-inventory)
3. [Audit Process by User Type](#audit-process-by-user-type)
4. [Gap Identification Framework](#gap-identification-framework)
5. [Root Cause Analysis](#root-cause-analysis)
6. [Resolution Strategies](#resolution-strategies)
7. [v3 Design System Migration Guide](#v3-design-system-migration-guide)

---

## Audit Framework Overview

### Audit Dimensions

| Dimension | What to Check | Tools |
|-----------|--------------|-------|
| **Route Coverage** | All routes in `App.tsx` have corresponding pages | Grep for routes, check imports |
| **Design Consistency** | All pages use current design system (v3) | Visual inspection, component imports |
| **Feature Completeness** | Placeholder vs real implementations | Search for "TODO", mock data, placeholder text |
| **Navigation Integrity** | All nav items link to existing pages | Check navigation configs |
| **API Integration** | Real API calls vs mock data | Search for useQuery, fetch patterns |

### Audit Checklist Template

```markdown
## [User Role] Audit - [Date]

### Routes Defined
- [ ] Route 1: `/path` → Component
- [ ] Route 2: `/path` → Component

### Pages Verified
- [ ] Page exists and renders
- [ ] Uses v3 design system
- [ ] Real API integration
- [ ] No placeholder content

### Navigation Items
- [ ] All nav items have corresponding routes
- [ ] Active state works correctly

### Gaps Found
1. Gap description
   - Severity: High/Medium/Low
   - Root cause: [category]
   - Fix: [approach]
```

---

## User Role Inventory

### Platform User Roles

| Role | Access Level | Primary Routes | Key Features |
|------|-------------|----------------|--------------|
| **Super Admin** | Platform-wide | `/super-admin/*` | Tenant management, analytics, platform config |
| **Admin** | Tenant-level | `/admin/*` | User management, blueprints, webhooks, API keys |
| **Agent** | Operations | `/agent/*` | Task execution, client interaction |
| **Client** | Self-service | `/client/*` | Dashboard, documents, compliance status |
| **Sales** | Pre-sales | `/sales/*` | Proposals, pipeline, commission |
| **HR** | Internal | `/hr/*` | Employee management, payroll |
| **Executive** | Reporting | `/executive/*` | BI dashboards, analytics |
| **Finance** | Billing | `/finance/*` | Invoicing, payments |

---

## Audit Process by User Type

### Step 1: Route Inventory

```bash
# Find all routes for a user type
grep -n "path=\"/admin" client/src/App.tsx

# Find corresponding imports
grep -n "const Admin" client/src/App.tsx
```

### Step 2: Navigation Audit

```bash
# Find navigation configuration
grep -rn "adminNavigation\|superAdminNavigation" client/src/

# Check navigation items
grep -A 50 "adminNavigation =" client/src/pages/admin/
```

### Step 3: Page-by-Page Verification

For each page:
1. **File exists?** - Check if component file exists
2. **Renders?** - No build errors
3. **Design system?** - Uses DashboardLayout, PageShell
4. **API integration?** - useQuery with real endpoints
5. **Features complete?** - No placeholder text/charts

### Step 4: Cross-Reference

```bash
# Find navigation items without corresponding routes
# Compare nav hrefs vs App.tsx routes

# Find routes without navigation items
# Compare App.tsx routes vs nav configs
```

---

## Gap Identification Framework

### Gap Categories

#### 1. Missing Pages
**Symptoms:**
- Route defined but 404 on navigation
- Import fails in App.tsx
- "File does not exist" errors

**Detection:**
```bash
# Check if page file exists
ls -la client/src/pages/[role]/[PageName].tsx

# Check import in App.tsx
grep "import.*PageName" client/src/App.tsx
```

#### 2. Design Inconsistency
**Symptoms:**
- Page doesn't match v3 design
- Missing sidebar navigation
- No breadcrumbs or page header

**Detection:**
```bash
# Check for v3 component usage
grep "DashboardLayout\|PageShell" client/src/pages/admin/PageName.tsx
```

#### 3. Placeholder Content
**Symptoms:**
- Charts showing static/fake data
- "Coming soon" text
- Mock data instead of API calls

**Detection:**
```bash
# Find placeholder patterns
grep -rn "placeholder\|coming soon\|TODO\|mock" client/src/pages/

# Check for missing useQuery
grep -L "useQuery" client/src/pages/admin/*.tsx
```

#### 4. Broken Navigation
**Symptoms:**
- Nav item points to non-existent route
- Active state doesn't work
- Menu items missing

**Detection:**
```bash
# Compare navigation hrefs with routes
diff <(grep -oP 'href="[^"]*"' navigation.tsx | sort) \
     <(grep -oP 'path="[^"]*"' App.tsx | sort)
```

#### 5. Missing API Integration
**Symptoms:**
- Static data in tables
- No loading states
- No error handling

**Detection:**
```bash
# Check for API calls
grep -n "useQuery\|useMutation\|fetch(" client/src/pages/admin/PageName.tsx
```

---

## Root Cause Analysis

### Why Gaps Occur

| Root Cause | Description | Example | Prevention |
|------------|-------------|---------|------------|
| **Incremental Development** | Features added over time without full integration | Route added but page never created | Require PR checklist |
| **Design System Evolution** | New design adopted but not fully migrated | Old pages without v3 wrapper | Migration tracking |
| **Rapid Prototyping** | Placeholder content left in production | Mock chart data | Code review for "TODO" |
| **Team Silos** | Frontend/backend out of sync | UI expects API that doesn't exist | API contract reviews |
| **Incomplete Feature Flags** | Features partially rolled out | Navigation shows disabled items | Feature flag audit |
| **Copy-Paste Errors** | Routes copied but not updated | Duplicate route paths | Automated route checks |

### Root Cause Decision Tree

```
Gap Identified
├── Page doesn't exist?
│   └── ROOT CAUSE: Route added without page creation
│       → Fix: Create page or remove route
├── Page exists but wrong design?
│   └── ROOT CAUSE: Built before v3 design system
│       → Fix: Migrate to v3 (see Migration Guide)
├── Page renders but shows placeholder?
│   └── ROOT CAUSE: API not ready when UI built
│       → Fix: Integrate real API or build API
├── Navigation item broken?
│   └── ROOT CAUSE: Route path changed without nav update
│       → Fix: Sync navigation config with routes
└── Feature partially implemented?
    └── ROOT CAUSE: Sprint ended before completion
        → Fix: Complete feature or remove from UI
```

---

## Resolution Strategies

### Strategy 1: Create Missing Page

**When:** Route exists but page file doesn't

**Steps:**
1. Identify similar existing page for reference
2. Create page with v3 design system
3. Implement basic structure
4. Add to App.tsx imports
5. Test navigation flow

**Template:**
```tsx
import { DashboardLayout, PageShell } from '@/components/v3';

const navigation = [...]; // Copy from similar page
const user = { name: "Admin", email: "admin@company.com" };

export default function NewPage() {
  return (
    <DashboardLayout navigation={navigation} user={user} logo={...}>
      <PageShell
        title="Page Title"
        subtitle="Page description"
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Page" }]}
        actions={<Button>Action</Button>}
      >
        {/* Page content */}
      </PageShell>
    </DashboardLayout>
  );
}
```

### Strategy 2: Migrate to v3 Design

**When:** Page exists but uses old design

**Steps:**
1. Add v3 imports: `import { DashboardLayout, PageShell } from '@/components/v3'`
2. Add navigation constant (copy from similar page)
3. Add user constant
4. Wrap return with DashboardLayout
5. Wrap content with PageShell
6. Move action buttons to PageShell actions prop
7. Remove old header/title section
8. Update closing tags

**Migration Pattern:**
```tsx
// BEFORE
return (
  <div className="container mx-auto p-6">
    <div className="flex justify-between">
      <h1>Title</h1>
      <Button>Action</Button>
    </div>
    {/* content */}
  </div>
);

// AFTER
return (
  <DashboardLayout navigation={nav} user={user} logo={...}>
    <PageShell
      title="Title"
      subtitle="Description"
      breadcrumbs={[...]}
      actions={<Button>Action</Button>}
    >
      {/* content */}
    </PageShell>
  </DashboardLayout>
);
```

### Strategy 3: Replace Placeholder Content

**When:** Page shows mock/fake data

**Steps:**
1. Identify what data is needed
2. Check if API endpoint exists
3. If API exists: Add useQuery hook
4. If API missing: Build API endpoint first
5. Add loading and error states
6. Test with real data

**Example:**
```tsx
// BEFORE (placeholder)
const data = [
  { month: "Jan", value: 100 },
  { month: "Feb", value: 200 },
];

// AFTER (real API)
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/analytics/revenue'],
});

if (isLoading) return <Skeleton />;
if (error) return <ErrorState />;
```

### Strategy 4: Fix Navigation

**When:** Nav items don't match routes

**Steps:**
1. List all navigation items with hrefs
2. List all routes from App.tsx
3. Find mismatches
4. Either: Add missing routes, or fix nav hrefs
5. Test each navigation item

---

## v3 Design System Migration Guide

### Required Components

```tsx
import { DashboardLayout, PageShell } from '@/components/v3';
// Optional:
import { MetricCard, DataTable, EmptyState } from '@/components/v3';
```

### Navigation Structure

```tsx
const adminNavigation = [
  {
    title: "Section Name",
    items: [
      { label: "Item 1", href: "/admin/path1", icon: Icon1 },
      { label: "Item 2", href: "/admin/path2", icon: Icon2 },
    ],
  },
  // ... more sections
];
```

### User Object

```tsx
const adminUser = {
  name: "Admin",
  email: "admin@company.com",
};
```

### Page Structure

```tsx
export default function AdminPage() {
  return (
    <DashboardLayout
      navigation={adminNavigation}
      user={adminUser}
      logo={<span className="text-xl font-bold">Logo</span>}
    >
      <PageShell
        title="Page Title"
        subtitle="Brief description"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Current Page" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline">Export</Button>
            <Button>Primary Action</Button>
          </div>
        }
      >
        {/* Page content goes here */}
      </PageShell>
    </DashboardLayout>
  );
}
```

---

## Audit Results Template

### Example: Admin Section Audit (February 2026)

#### Summary
| Metric | Value |
|--------|-------|
| Total Routes | 9 |
| Pages Existing | 7 |
| v3 Migrated | 7/7 |
| API Integrated | 5/7 |
| Gaps Found | 3 |
| Gaps Resolved | 3 |

#### Gaps Identified

| # | Page | Gap Type | Root Cause | Resolution |
|---|------|----------|------------|------------|
| 1 | AdminServicesOverview | Missing page | Route added, page never created | Remove route (duplicate of Services) |
| 2 | AdminServiceConfig | Missing page | Route added, page never created | Remove route (not needed) |
| 3 | Analytics | Placeholder charts | Recharts installed but not used | Implemented real Recharts |
| 4 | WebhookManagement | Old design | Built before v3 | Migrated to v3 |
| 5 | APIKeyManagement | Old design | Built before v3 | Migrated to v3 |

#### Files Modified
- `client/src/pages/admin/WebhookManagement.tsx`
- `client/src/pages/admin/APIKeyManagement.tsx`
- `client/src/pages/admin/AccessReviews.tsx`
- `client/src/pages/admin/BlueprintManagement.tsx`
- `client/src/pages/super-admin/Analytics.tsx`
- `client/src/pages/super-admin/SuperAdminServices.tsx` (NEW)

---

## Automation Scripts

### Route Audit Script

```bash
#!/bin/bash
# audit-routes.sh - Compare routes vs navigation

echo "=== Routes defined in App.tsx ==="
grep -oP 'path="[^"]*"' client/src/App.tsx | sort | uniq

echo ""
echo "=== Navigation items ==="
grep -rhoP 'href="[^"]*"' client/src/pages/*/nav*.ts* | sort | uniq

echo ""
echo "=== Missing pages ==="
for route in $(grep -oP '(?<=path=")[^"]*' client/src/App.tsx); do
  component=$(grep -A1 "path=\"$route\"" client/src/App.tsx | grep -oP '(?<=element={<)[^/>]+')
  if [ ! -z "$component" ]; then
    file="client/src/pages/*/${component}.tsx"
    if ! ls $file 2>/dev/null; then
      echo "MISSING: $route -> $component"
    fi
  fi
done
```

### v3 Migration Check Script

```bash
#!/bin/bash
# check-v3-migration.sh - Check which pages use v3 design

echo "=== Pages using v3 DashboardLayout ==="
grep -l "DashboardLayout" client/src/pages/**/*.tsx

echo ""
echo "=== Pages NOT using v3 ==="
for file in client/src/pages/**/*.tsx; do
  if ! grep -q "DashboardLayout" "$file"; then
    echo "$file"
  fi
done
```

---

## Maintenance Schedule

| Frequency | Task | Owner |
|-----------|------|-------|
| Weekly | Quick navigation test | QA |
| Bi-weekly | Route vs nav audit | Frontend Lead |
| Monthly | Full UI audit | Tech Lead |
| Quarterly | Design system review | Design Team |

---

## Appendix: Quick Reference Commands

```bash
# Find all routes for a role
grep "path=\"/admin" client/src/App.tsx

# Check v3 usage in a file
grep -n "DashboardLayout\|PageShell" client/src/pages/admin/PageName.tsx

# Find placeholder content
grep -rn "placeholder\|TODO\|mock" client/src/pages/

# List all page files
ls -la client/src/pages/admin/*.tsx

# Check for useQuery usage
grep -l "useQuery" client/src/pages/admin/*.tsx

# Find unused imports (run build)
npm run build 2>&1 | grep "declared but"
```

---

*Last Updated: February 2026*
*Author: DigiComply Engineering Team*
