# Security Review Action Items

This document consolidates the remediation inputs that emerged from the four completed installments of the security review. Each subsection captures the outstanding work that the engineering team should plan and execute.

## Part 1 – Server bootstrap & core security controls
- Add `sessionAuthMiddleware` and the appropriate `requireMinimumRole` checks to every admin configuration endpoint so only authenticated admins can create or edit catalog data, workflow templates, or document metadata.【F:server/admin-config-routes.ts†L1-L135】【F:server/routes.ts†L1107-L1164】
- Replace the production Content-Security-Policy with a strict configuration that removes `'unsafe-inline'` and `'unsafe-eval'`, keeping the relaxed directives only for development tooling.【F:server/security-middleware.ts†L6-L43】
- Rework the CSRF protection so it no longer depends on the non-existent `req.session`; either introduce a real session store or move to a double-submit token strategy that the middleware can enforce consistently.【F:server/security-middleware.ts†L45-L75】
- Export a single validated environment object and fail fast on schema errors instead of returning an untyped `process.env`, preventing misconfigurations from slipping through.【F:server/env.ts†L36-L86】【F:server/index.ts†L1-L32】
- Require a deterministic `CREDENTIAL_ENCRYPTION_KEY` in every environment so encrypted credentials remain readable across restarts and deployments.【F:server/encryption.ts†L4-L39】

## Part 2 – Authentication & session lifecycle
- Add brute-force resistance (rate limits, CAPTCHAs, device/IP tracking) to the OTP issuance flow and stop logging or echoing raw one-time codes in responses.【F:server/auth-routes.ts†L45-L111】
- Hash or otherwise protect OTPs at rest so the `otpStore` table never stores reusable secrets in plaintext form.【F:server/auth-routes.ts†L8-L41】
- Bind logout, session verification, and password change flows to the HTTP-only session cookie (and rotate tokens on sensitive actions) instead of trusting any `sessionToken` string supplied in the request body.【F:server/auth-routes.ts†L118-L214】【F:server/auth-routes.ts†L246-L331】

## Part 3 – Document storage & file management
- Mount the `/api/files` router behind the standard session middleware and verify that the caller owns or is authorized to access the referenced service request before proceeding.【F:server/routes.ts†L1148-L1187】【F:server/file-management-routes.ts†L1-L201】
- Enforce per-document authorization on download, status change, and deletion handlers so that only permitted users can retrieve or modify another client’s uploads.【F:server/file-management-routes.ts†L67-L200】
- Record the authenticated user (rather than a hard-coded `'client'`) when creating audit trails for uploads, enabling downstream reviews to attribute actions correctly.【F:server/file-management-routes.ts†L38-L86】

## Part 4 – Workflow automation, tasks, and notifications
- Require authentication and role-based authorization for every workflow automation, task management, and notification administration route before exposing the functionality publicly.【F:server/routes.ts†L1183-L1204】【F:server/workflow-automation-routes.ts†L8-L162】【F:server/task-management-routes.ts†L27-L358】【F:server/notification-routes.ts†L11-L360】
- Stop trusting caller-supplied identifiers (such as `userId` or arbitrary task payloads) and derive identity from the active session when mutating workflow or task state.【F:server/task-management-routes.ts†L193-L358】
- Import the notification engine dependencies explicitly and guard log output so untrusted payloads cannot trigger log injection or crash the process at startup.【F:server/notification-routes.ts†L11-L220】【F:server/workflow-automation-routes.ts†L96-L157】

## Follow-up verification
- After implementing the above inputs, schedule verification passes to confirm that the fixes close the documented gaps and that no new regressions were introduced.【F:SECURITY_REVIEW_STATUS.md†L3-L13】