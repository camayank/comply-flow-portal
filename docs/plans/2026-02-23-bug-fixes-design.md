# Bug Fixes Design Document

**Date:** 2026-02-23
**Author:** Claude Sonnet 4.5
**Status:** Approved
**Approach:** Minimal Quick Fixes

## Executive Summary

This document outlines the design for fixing 6 user-reported issues affecting the DigiComply platform. The chosen approach prioritizes minimal, surgical changes to quickly restore functionality without architectural refactoring.

## Issues to Fix

1. Remove 15-minute rate limiting from login page
2. Add sign-out button to role-specific screens (sales, operations, etc.)
3. Fix sales pages (Lead Pipeline, etc.) opening without sidebar
4. Prevent pages from refreshing on tab/window change
5. Fix Financial Management Dashboard crash (`budgetPlans.map is not a function`)
6. Remove OTP system, keep only email/password login

## Architecture & Scope

### Overall Strategy
Apply minimal, isolated fixes to each issue. No database migrations, no architectural refactoring, no shared utility changes. Each fix is independent and can be tested/rolled back separately.

### Files to Modify

| Issue | File(s) | Change Type |
|-------|---------|-------------|
| Rate Limiting | `server/routes/auth.ts` | Remove middleware |
| Sign-out Button | `client/src/layouts/DashboardLayout.tsx` | Verify/add logout |
| Sales Sidebar | `client/src/features/sales/pages/*.tsx` | Add layout wrapper |
| Page Refresh | `client/src/lib/queryClient.ts` | Config change |
| Dashboard Crash | `client/src/features/finance/pages/Dashboard.tsx` | Null safety |
| OTP Removal | `server/routes/auth.ts`, `client/src/features/auth/pages/Login.tsx` | Comment code |

### Impact Assessment
- **Risk Level:** Low - all changes are isolated
- **Database Changes:** None required
- **API Breaking Changes:** None
- **Deployment:** Standard deployment, no downtime
- **Rollback:** Individual file-level revert possible

## Detailed Implementation

### Issue 1: Remove Rate Limiting from Login

**Current State:**
`authLimiter` middleware restricts login to 10 attempts per 15 minutes per IP address.

**Problem:**
Legitimate users (offices with shared IPs, users with typos) are getting locked out.

**Solution:**
Remove `authLimiter` from the login endpoint only.

**Code Change:**
```typescript
// File: server/routes/auth.ts (line ~137)

// BEFORE:
router.post('/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {

// AFTER:
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
```

**Rationale:**
- Keep `authLimiter` on `/register`, `/password/reset`, etc.
- Login endpoint still validates credentials server-side
- Can add back with higher limits if abuse occurs

**Testing:**
- Attempt 15+ rapid login attempts - should not get 429 error
- Verify other auth endpoints still rate-limited

---

### Issue 2: Sign-out Button Missing

**Current State:**
Some role-specific screens don't show logout button.

**Investigation Steps:**
1. Check if `DashboardLayout` has logout button in header/user menu
2. Verify which pages are affected (sales, operations, QC)
3. Determine if layout is missing or pages don't use it

**Expected Fix (Option A - Layout has logout):**
```typescript
// Affected pages already import DashboardLayout
import { DashboardLayout } from '@/layouts';

export default function SomePage() {
  return (
    <DashboardLayout>
      {/* page content */}
    </DashboardLayout>
  );
}
```

**Expected Fix (Option B - Layout missing logout):**
```typescript
// File: client/src/layouts/DashboardLayout.tsx
// Add logout button to header/user dropdown menu
import { useAuth } from '@/hooks/use-auth';

const { logout } = useAuth();

// In header component:
<Button onClick={logout}>
  <LogOut className="h-4 w-4 mr-2" />
  Sign Out
</Button>
```

**Testing:**
- Navigate to sales, operations, QC pages
- Verify logout button visible and functional
- Click logout - should redirect to login page

---

### Issue 3: Sales Pages Opening Without Sidebar

**Current State:**
Sales pages (LeadPipeline, LeadManagement) render content directly without layout wrapper.

**Root Cause:**
Pages don't use `DashboardLayout` wrapper component.

**Solution:**
Wrap page content with `DashboardLayout`.

**Code Change:**
```typescript
// File: client/src/features/sales/pages/LeadPipeline.tsx (line ~1156)

// BEFORE:
export default function LeadPipeline() {
  // ... component logic ...

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* content */}
    </div>
  );
}

// AFTER:
import { DashboardLayout } from '@/layouts';

export default function LeadPipeline() {
  // ... component logic ...

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* content */}
      </div>
    </DashboardLayout>
  );
}
```

**Apply to:**
- `client/src/features/sales/pages/LeadPipeline.tsx`
- `client/src/features/sales/pages/LeadManagement.tsx`
- Any other sales pages missing sidebar

**Testing:**
- Navigate to `/lead-pipeline`, `/lead-management`
- Verify sidebar appears with navigation
- Verify sidebar navigation works

---

### Issue 4: Pages Refreshing on Tab Change

**Current State:**
React Query default behavior refetches data when window regains focus.

**Problem:**
Users lose scroll position, form state when switching browser tabs.

**Solution:**
Disable `refetchOnWindowFocus` globally in React Query config.

**Code Change:**
```typescript
// File: client/src/lib/queryClient.ts

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // ADD: Prevent refetch on tab switch
      refetchOnReconnect: false,     // ADD: Prevent refetch on reconnect
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});
```

**Rationale:**
- Users can manually refresh via browser or refresh buttons
- Preserves user state and scroll position
- Reduces unnecessary API calls

**Testing:**
- Open any page (e.g., lead pipeline)
- Scroll down, switch to another tab
- Switch back - verify page didn't reload/refetch
- Verify manual refresh still works

---

### Issue 5: Financial Dashboard Crash

**Current State:**
`budgetPlans.map()` throws error when API returns undefined/null.

**Error:**
```
TypeError: budgetPlans.map is not a function
at Dashboard.tsx:582
```

**Root Cause:**
API returns unexpected shape or fails, but code assumes array.

**Solution:**
Add defensive array check before mapping.

**Code Change:**
```typescript
// File: client/src/features/finance/pages/Dashboard.tsx

// Line ~156 - Query remains same:
const { data: budgetPlans = [] } = useQuery<BudgetPlan[]>({
  queryKey: ['/api/financial/budget-plans'],
});

// Line ~582 - BEFORE:
{budgetPlans.map((plan: BudgetPlan) => (
  <div key={plan.id} className="p-4 border rounded-lg">
    {/* ... */}
  </div>
))}

// Line ~582 - AFTER:
{(Array.isArray(budgetPlans) ? budgetPlans : []).map((plan: BudgetPlan) => (
  <div key={plan.id} className="p-4 border rounded-lg">
    {/* ... */}
  </div>
))}
```

**Additional Improvement (if API exists):**
Ensure server returns proper structure:
```typescript
// Server should return:
res.json({ success: true, data: [] });  // Not undefined
```

**Testing:**
- Navigate to `/financial-management` after login
- Should load without crash
- Should show empty state or budget plans
- Test with no data, partial data, full data

---

### Issue 6: Remove OTP System

**Current State:**
OTP verification is implemented for client authentication.

**Requirement:**
Remove OTP, use only email/password login.

**Solution:**
Comment out OTP endpoints and remove OTP UI from login flow.

**Code Changes:**

**A. Server Routes:**
```typescript
// File: server/routes/auth.ts (lines ~206-325)

/*
 * TEMPORARILY DISABLED - OTP System
 * Can be re-enabled by uncommenting this block
 */
/*
router.post('/send-otp', otpLimiter, asyncHandler(async (req: Request, res: Response) => {
  // ... entire send-otp implementation (keep as-is)
}));

router.post('/verify-otp', otpLimiter, asyncHandler(async (req: Request, res: Response) => {
  // ... entire verify-otp implementation (keep as-is)
}));
*/
```

**B. Client Login Page:**
```typescript
// File: client/src/features/auth/pages/Login.tsx

// REMOVE:
// - OTP input field
// - "Send OTP" button
// - OTP verification step
// - Calls to /api/v1/auth/send-otp
// - Calls to /api/v1/auth/verify-otp

// KEEP ONLY:
// - Email input
// - Password input
// - Login button
// - Call to /api/v1/auth/login (existing endpoint)
```

**What to Keep:**
- Database table `otp_store` (dormant, no migration)
- Helper functions `generateOTP()`, `hashOTP()` (unused)
- Email/SMS services (may be used elsewhere)

**Rationale:**
- Commenting allows quick restoration
- No database migration = zero downtime
- Clean user experience with simple login

**Testing:**
- Navigate to `/login`
- Should see only email/password fields
- Submit valid credentials - should login successfully
- Submit invalid credentials - should show error
- No OTP step should appear

---

## Testing Strategy

### Pre-Deployment Testing

**Manual Test Cases:**

| Test | Expected Result |
|------|-----------------|
| Login 20 times rapidly | No rate limit error |
| Navigate to sales pages | Logout button visible |
| Open lead pipeline | Sidebar with navigation present |
| Switch browser tabs 5 times | Page doesn't reload |
| Visit financial dashboard | Page loads without crash |
| Login with email/password | Successful login, no OTP |

**Error Scenarios:**

| Scenario | Expected Behavior |
|----------|-------------------|
| Invalid login credentials | Show error, don't block IP |
| Financial API returns null | Show empty state, don't crash |
| Logout from any page | Redirect to login |
| Network disconnects | Don't auto-refetch on reconnect |

### Post-Deployment Verification

1. Monitor error logs for new crashes
2. Check user login success rates
3. Verify no complaints about missing logout
4. Confirm sidebar appears on all pages
5. Check for unexpected refetch behavior

## Rollback Plan

Each fix is independent and can be rolled back individually:

```bash
# Rollback rate limiting change
git checkout HEAD -- server/routes/auth.ts

# Rollback query client config
git checkout HEAD -- client/src/lib/queryClient.ts

# Rollback sales layout changes
git checkout HEAD -- client/src/features/sales/pages/LeadPipeline.tsx

# Rollback financial dashboard fix
git checkout HEAD -- client/src/features/finance/pages/Dashboard.tsx

# Rollback OTP removal
git checkout HEAD -- server/routes/auth.ts client/src/features/auth/pages/Login.tsx
```

## Dependencies

- **No new packages required**
- **No environment variable changes**
- **No database migrations**
- **Works with existing:** React Query v4, Express, bcrypt, wouter

## Future Improvements

These issues should be tracked for future sprints:

1. Implement smart rate limiting (per-user, not per-IP)
2. Create unified logout component across all layouts
3. Audit all pages to ensure consistent layout usage
4. Add error boundaries to all major components
5. Consider OTP as optional 2FA (not primary auth)
6. Add proper API response validation/error handling

## Success Criteria

- ✅ Users can login without rate limit blocks
- ✅ Logout button visible on all authenticated pages
- ✅ Sales pages show sidebar with navigation
- ✅ Pages maintain state when switching tabs
- ✅ Financial dashboard loads without errors
- ✅ Login works with email/password only
- ✅ Zero production incidents from these changes

## Timeline

- **Design:** Complete
- **Implementation:** 1-2 hours
- **Testing:** 1 hour
- **Deployment:** Standard release cycle
- **Total:** ~3 hours development time
