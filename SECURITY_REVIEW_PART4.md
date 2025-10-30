# Security Review – Part 4

## Workflow automation APIs
- All `/api/workflows/*` routes are mounted without any authentication or role checks, so any unauthenticated caller can list existing automations, create arbitrary rules, or fire triggers against real production entities.【F:server/workflow-automation-routes.ts†L8-L162】
- The manual trigger endpoint accepts attacker-controlled payloads and logs them verbatim, inviting both information leakage and log injection if structured logging ships those entries to downstream aggregators.【F:server/workflow-automation-routes.ts†L115-L157】

## Task management surface
- The task suite (`/api/tasks` and every nested action) is fully exposed to the public internet with no session middleware, so outsiders can enumerate tasks, read activity logs, and mutate reminders or assignments for any record.【F:server/task-management-routes.ts†L27-L358】
- State-changing handlers trust caller-supplied `userId` values and merge request bodies straight into the persisted record, enabling privilege escalation, data tampering, and injection of forged audit history entries.【F:server/task-management-routes.ts†L193-L358】

## Notification administration endpoints
- Every `/api/admin/notification-*` and supporting event hook is registered without authentication, letting unauthenticated users seed templates, toggle rules, run manual notifications, and alter service request statuses at will.【F:server/notification-routes.ts†L11-L360】
- The file references `serviceTemplateSeeder`, `notificationEngine`, and multiple table objects without importing them, which will crash the process at runtime and leaves the build without type coverage for these critical flows.【F:server/notification-routes.ts†L12-L220】

### Recommended actions
1. Wrap all of the above routers with `sessionAuthMiddleware` and appropriate role/ownership validation before exposing them publicly.
2. Lock sensitive mutations (rule management, task edits, workflow triggers) behind signed requests that derive identity from the active session rather than trusting body parameters.
3. Fix the missing imports in `notification-routes.ts` so the module actually loads, and add automated tests to ensure the service fails closed if those dependencies are absent.
