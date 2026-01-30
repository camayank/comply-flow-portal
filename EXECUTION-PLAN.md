# DigiComply Execution Plan
## Comprehensive Implementation Strategy

**Version:** 1.0
**Date:** January 2026
**Status:** Active Execution

---

## Pre-Execution Checklist

### 1. Team Assessment

Before starting execution, complete this assessment:

| Role | Required | Current | Gap | Action |
|------|----------|---------|-----|--------|
| Backend Developer (Senior) | 3 | ? | ? | Hire/Contract |
| Backend Developer (Mid) | 2 | ? | ? | Hire/Contract |
| Frontend Developer | 2 | ? | ? | Hire/Contract |
| ML Engineer | 1 | ? | ? | Hire/Contract |
| DevOps Engineer | 1 | ? | ? | Hire/Contract |
| QA Engineer | 1 | ? | ? | Hire/Contract |
| Product Manager | 1 | ? | ? | Assign |
| Technical Lead | 1 | ? | ? | Assign |

### 2. Infrastructure Assessment

| Component | Status | Action Required |
|-----------|--------|-----------------|
| **Development Environment** | | |
| Local dev setup documented | ⬜ | Create setup guide |
| Docker compose for local | ⬜ | Create docker-compose.yml |
| Environment variables documented | ⬜ | Create .env.example |
| **Staging Environment** | | |
| Staging server provisioned | ⬜ | Provision on AWS/GCP |
| Staging database | ⬜ | Create PostgreSQL instance |
| CI/CD pipeline | ⬜ | Setup GitHub Actions |
| **Production Environment** | | |
| Production server | ⬜ | Provision with redundancy |
| Production database | ⬜ | Create with replication |
| SSL certificates | ⬜ | Setup via Let's Encrypt/AWS |
| Domain configuration | ⬜ | Configure DNS |
| **Monitoring** | | |
| Error tracking (Sentry) | ⬜ | Create account, integrate |
| APM (Datadog/New Relic) | ⬜ | Create account, integrate |
| Log aggregation | ⬜ | Setup CloudWatch/ELK |
| Uptime monitoring | ⬜ | Setup Pingdom/UptimeRobot |

### 3. Codebase Health Check

Run these commands and document results:

```bash
# 1. Check current test coverage
npm run test:coverage 2>/dev/null || echo "No test script configured"

# 2. Check TypeScript errors
npx tsc --noEmit 2>&1 | wc -l

# 3. Check ESLint issues
npx eslint . --ext .ts,.tsx 2>&1 | grep -c "error\|warning" || echo "0"

# 4. Check dependencies for vulnerabilities
npm audit 2>&1 | tail -5

# 5. Check for outdated packages
npm outdated 2>&1 | wc -l

# 6. Database migration status
# Check if all migrations are applied

# 7. Count lines of code
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
```

**Document Results:**
| Metric | Current Value | Target | Notes |
|--------|---------------|--------|-------|
| Test Coverage | ?% | 80% | |
| TypeScript Errors | ? | 0 | |
| ESLint Issues | ? | 0 | |
| Security Vulnerabilities | ? | 0 critical | |
| Outdated Packages | ? | < 10 | |
| Total Lines of Code | ? | - | Baseline |

---

## Phase 0: Immediate Actions (Week 0)

**Duration:** 1 week
**Goal:** Establish foundation for execution

### Day 1-2: Documentation & Analysis

#### Task 0.1: Create Development Setup Guide
```markdown
File: docs/DEVELOPMENT-SETUP.md

Contents:
1. Prerequisites (Node.js, PostgreSQL, etc.)
2. Clone and install dependencies
3. Environment configuration
4. Database setup and seeding
5. Running the application
6. Running tests
7. Common issues and solutions
```

#### Task 0.2: Document Current API Endpoints
```bash
# Generate API documentation
# Create file: docs/API-REFERENCE.md

# List all routes from codebase
grep -r "app\.\(get\|post\|put\|patch\|delete\)" server/ --include="*.ts" | \
  sed 's/.*\(app\.[a-z]*\)(\([^,]*\).*/\1 \2/' | sort | uniq
```

#### Task 0.3: Create Database Schema Documentation
```bash
# Generate schema documentation
# Create file: docs/DATABASE-SCHEMA.md

# Extract all table definitions
grep -A 20 "pgTable(" shared/schema.ts | head -500
```

### Day 3-4: Environment Setup

#### Task 0.4: Create Docker Development Environment
```yaml
# File: docker-compose.yml

version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: digicomply
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/digicomply
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

#### Task 0.5: Create Environment Template
```bash
# File: .env.example

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/digicomply

# Authentication
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# External Services
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
EMAIL_HOST=smtp.example.com
EMAIL_USER=noreply@example.com
EMAIL_PASS=your-email-password

# SMS/WhatsApp
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Storage
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
DATADOG_API_KEY=xxx

# Feature Flags
ENABLE_AI_FEATURES=false
ENABLE_MULTI_TENANCY=false
```

### Day 5: CI/CD Pipeline Setup

#### Task 0.6: Create GitHub Actions Workflow
```yaml
# File: .github/workflows/ci.yml

name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

---

## Phase 1: Foundation (Weeks 1-12)

### Sprint 1 (Weeks 1-2): Testing Infrastructure

**Goal:** Establish testing foundation with 30% coverage

#### Week 1: Test Setup & Core Tests

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 1.1.1 | Install testing dependencies | Dev | ⬜ | Jest, Supertest |
| 1.1.2 | Configure Jest for TypeScript | Dev | ⬜ | jest.config.ts |
| 1.1.3 | Create test database setup | Dev | ⬜ | Test fixtures |
| 1.1.4 | Write auth route tests | Dev | ⬜ | 10+ tests |
| 1.1.5 | Write service request tests | Dev | ⬜ | 15+ tests |

**Test File Structure:**
```
server/
├── __tests__/
│   ├── setup.ts                 # Global test setup
│   ├── fixtures/                # Test data
│   │   ├── users.ts
│   │   ├── services.ts
│   │   └── serviceRequests.ts
│   ├── unit/                    # Unit tests
│   │   ├── id-generator.test.ts
│   │   ├── workflow-engine.test.ts
│   │   └── compliance-engine.test.ts
│   ├── integration/             # API tests
│   │   ├── auth.test.ts
│   │   ├── service-requests.test.ts
│   │   ├── payments.test.ts
│   │   └── documents.test.ts
│   └── e2e/                     # End-to-end tests
│       ├── client-journey.test.ts
│       └── ops-workflow.test.ts
```

**Sample Test (auth.test.ts):**
```typescript
// server/__tests__/integration/auth.test.ts

import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db';
import { users } from '@shared/schema';

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(users).where(/* test users */);
  });

  describe('POST /api/auth/client/send-otp', () => {
    it('should send OTP for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('should rate limit excessive requests', async () => {
      // Send 6 requests (limit is 5)
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/client/send-otp')
          .send({ email: 'test@example.com' });
      }

      const response = await request(app)
        .post('/api/auth/client/send-otp')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(429);
    });
  });

  describe('POST /api/auth/client/verify-otp', () => {
    it('should verify valid OTP', async () => {
      // Setup: Create OTP record
      // ...

      const response = await request(app)
        .post('/api/auth/client/verify-otp')
        .send({ email: 'test@example.com', otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  });
});
```

#### Week 2: API Route Tests

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 1.2.1 | Write payment route tests | Dev | ⬜ | 10+ tests |
| 1.2.2 | Write document route tests | Dev | ⬜ | 10+ tests |
| 1.2.3 | Write ticket route tests | Dev | ⬜ | 10+ tests |
| 1.2.4 | Write compliance route tests | Dev | ⬜ | 10+ tests |
| 1.2.5 | Set up coverage reporting | Dev | ⬜ | Codecov |

**Coverage Target by Module:**
| Module | Target | Priority |
|--------|--------|----------|
| Authentication | 90% | Critical |
| Service Requests | 80% | Critical |
| Payments | 90% | Critical |
| Documents | 70% | High |
| Compliance | 80% | High |
| Tasks | 70% | Medium |
| Notifications | 60% | Medium |

---

### Sprint 2 (Weeks 3-4): Monitoring & Observability

**Goal:** Full visibility into application health

#### Week 3: Error Tracking & Logging

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 2.1.1 | Integrate Sentry for errors | DevOps | ⬜ | All environments |
| 2.1.2 | Add structured logging | Dev | ⬜ | Winston/Pino |
| 2.1.3 | Create error boundaries (React) | Dev | ⬜ | Frontend errors |
| 2.1.4 | Set up log aggregation | DevOps | ⬜ | CloudWatch/ELK |
| 2.1.5 | Create error alerting rules | DevOps | ⬜ | Slack/Email |

**Structured Logging Implementation:**
```typescript
// server/lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'digicomply',
    environment: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Usage in routes
app.use((req, res, next) => {
  const requestId = nanoid();
  req.requestId = requestId;

  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
  }, 'Request received');

  const start = Date.now();

  res.on('finish', () => {
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
    }, 'Request completed');
  });

  next();
});
```

**Sentry Integration:**
```typescript
// server/lib/sentry.ts

import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Postgres(),
  ],
});

// Add to Express app
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler (must be after routes)
app.use(Sentry.Handlers.errorHandler());
```

#### Week 4: Performance Monitoring

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 2.2.1 | Integrate APM (Datadog/NR) | DevOps | ⬜ | Tracing |
| 2.2.2 | Add database query monitoring | Dev | ⬜ | Slow queries |
| 2.2.3 | Create performance dashboard | DevOps | ⬜ | Key metrics |
| 2.2.4 | Set up uptime monitoring | DevOps | ⬜ | Health checks |
| 2.2.5 | Create alerting rules | DevOps | ⬜ | Thresholds |

**Key Metrics to Track:**
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Response Time (P50) | < 100ms | > 200ms |
| Response Time (P95) | < 300ms | > 500ms |
| Response Time (P99) | < 1000ms | > 2000ms |
| Error Rate | < 0.1% | > 1% |
| Uptime | 99.9% | < 99.5% |
| Database Query Time (avg) | < 50ms | > 100ms |
| Memory Usage | < 70% | > 85% |
| CPU Usage | < 60% | > 80% |

---

### Sprint 3 (Weeks 5-6): Security Hardening

**Goal:** Production-ready security posture

#### Week 5: Authentication & Authorization

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 3.1.1 | Implement rate limiting | Dev | ⬜ | Per endpoint |
| 3.1.2 | Add CSRF protection | Dev | ⬜ | Forms |
| 3.1.3 | Implement session rotation | Dev | ⬜ | After login |
| 3.1.4 | Add password policies | Dev | ⬜ | Complexity |
| 3.1.5 | Implement MFA (TOTP) | Dev | ⬜ | Admin users |

**Rate Limiting Configuration:**
```typescript
// server/middleware/rate-limiter.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';

// Different limits for different endpoints
export const rateLimiters = {
  // Strict limit for auth endpoints
  auth: rateLimit({
    store: new RedisStore({ client: redis }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { error: 'Too many attempts. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Standard API limit
  api: rateLimit({
    store: new RedisStore({ client: redis }),
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Rate limit exceeded.' },
  }),

  // Strict limit for sensitive operations
  sensitive: rateLimit({
    store: new RedisStore({ client: redis }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: { error: 'Too many attempts. Try again later.' },
  }),
};
```

**Password Policy:**
```typescript
// server/lib/password-policy.ts

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // Days
  preventReuse: number; // Last N passwords
}

export const defaultPolicy: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
  preventReuse: 5,
};

export function validatePassword(password: string, policy = defaultPolicy): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain number');
  }
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special character');
  }

  return { valid: errors.length === 0, errors };
}
```

#### Week 6: Data Security

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 3.2.1 | Encrypt sensitive data at rest | Dev | ⬜ | PII fields |
| 3.2.2 | Implement field-level encryption | Dev | ⬜ | Credentials |
| 3.2.3 | Add SQL injection prevention | Dev | ⬜ | Audit queries |
| 3.2.4 | Implement XSS prevention | Dev | ⬜ | Input sanitization |
| 3.2.5 | Security headers (Helmet) | Dev | ⬜ | CSP, HSTS |

**Security Headers:**
```typescript
// server/middleware/security.ts

import helmet from 'helmet';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
];
```

---

### Sprint 4 (Weeks 7-8): Disaster Recovery

**Goal:** Zero data loss capability

#### Week 7: Backup Strategy

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 4.1.1 | Implement automated DB backups | DevOps | ⬜ | Hourly/Daily |
| 4.1.2 | Set up backup to S3/GCS | DevOps | ⬜ | Cross-region |
| 4.1.3 | Implement point-in-time recovery | DevOps | ⬜ | WAL archiving |
| 4.1.4 | Create backup verification script | DevOps | ⬜ | Automated test |
| 4.1.5 | Document backup procedures | DevOps | ⬜ | Runbook |

**Backup Script:**
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
S3_BUCKET="s3://digicomply-backups"
DB_NAME="digicomply"

# Create backup
echo "Creating backup..."
pg_dump $DATABASE_URL -Fc > "$BACKUP_DIR/backup_$TIMESTAMP.dump"

# Compress
echo "Compressing..."
gzip "$BACKUP_DIR/backup_$TIMESTAMP.dump"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "$BACKUP_DIR/backup_$TIMESTAMP.dump.gz" \
  "$S3_BUCKET/daily/backup_$TIMESTAMP.dump.gz"

# Cleanup old local backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +7 -delete

# Verify backup
echo "Verifying backup..."
pg_restore --list "$BACKUP_DIR/backup_$TIMESTAMP.dump.gz" > /dev/null

echo "Backup completed: backup_$TIMESTAMP.dump.gz"
```

#### Week 8: Recovery Procedures

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 4.2.1 | Create recovery runbook | DevOps | ⬜ | Step-by-step |
| 4.2.2 | Test full recovery procedure | DevOps | ⬜ | Document time |
| 4.2.3 | Set up database replication | DevOps | ⬜ | Read replicas |
| 4.2.4 | Create failover procedure | DevOps | ⬜ | Automated |
| 4.2.5 | Document RTO/RPO | DevOps | ⬜ | SLA |

**Recovery Targets:**
| Metric | Target | Current |
|--------|--------|---------|
| Recovery Time Objective (RTO) | < 1 hour | ? |
| Recovery Point Objective (RPO) | < 1 hour | ? |
| Backup Frequency | Hourly | ? |
| Backup Retention | 30 days | ? |
| Cross-Region Replication | Yes | ? |

---

### Sprint 5 (Weeks 9-10): Performance Optimization

**Goal:** Sub-200ms response times

#### Week 9: Database Optimization

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 5.1.1 | Analyze slow queries | Dev | ⬜ | EXPLAIN ANALYZE |
| 5.1.2 | Add missing indexes | Dev | ⬜ | Based on analysis |
| 5.1.3 | Implement query caching | Dev | ⬜ | Redis |
| 5.1.4 | Optimize N+1 queries | Dev | ⬜ | Use joins |
| 5.1.5 | Add connection pooling | DevOps | ⬜ | PgBouncer |

**Index Analysis Script:**
```sql
-- Find missing indexes
SELECT
  schemaname || '.' || relname AS table,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;

-- Find unused indexes
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname !~ '^(pk_|unique_)'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Recommended Indexes:**
```sql
-- High-priority indexes based on common queries

-- Service requests by status and date
CREATE INDEX CONCURRENTLY idx_service_requests_status_created
ON service_requests (status, created_at DESC);

-- Service requests by business entity
CREATE INDEX CONCURRENTLY idx_service_requests_entity
ON service_requests (business_entity_id, status);

-- Compliance tracking by entity and due date
CREATE INDEX CONCURRENTLY idx_compliance_tracking_entity_due
ON compliance_tracking (business_entity_id, due_date);

-- Documents by service request
CREATE INDEX CONCURRENTLY idx_documents_service_request
ON documents_uploads (service_request_id, status);

-- Tasks by assignee and status
CREATE INDEX CONCURRENTLY idx_tasks_assignee_status
ON task_items (assignee_id, status, due_date);

-- Payments by service request
CREATE INDEX CONCURRENTLY idx_payments_service_request
ON payments (service_request_id, status);

-- Audit logs by entity
CREATE INDEX CONCURRENTLY idx_audit_logs_entity
ON audit_logs (entity_type, entity_id, created_at DESC);
```

#### Week 10: Application Optimization

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 5.2.1 | Implement Redis caching | Dev | ⬜ | Session, queries |
| 5.2.2 | Add response compression | Dev | ⬜ | Gzip/Brotli |
| 5.2.3 | Optimize bundle size | Dev | ⬜ | Code splitting |
| 5.2.4 | Implement lazy loading | Dev | ⬜ | React.lazy |
| 5.2.5 | Add CDN for static assets | DevOps | ⬜ | CloudFront |

**Caching Strategy:**
```typescript
// server/lib/cache.ts

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

interface CacheOptions {
  ttl?: number; // seconds
  tags?: string[];
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 3600; // Default 1 hour
    await redis.setex(key, ttl, JSON.stringify(value));

    // Track tags for invalidation
    if (options.tags) {
      for (const tag of options.tags) {
        await redis.sadd(`tag:${tag}`, key);
      }
    }
  },

  async invalidateByTag(tag: string): Promise<void> {
    const keys = await redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.del(`tag:${tag}`);
    }
  },

  async invalidate(key: string): Promise<void> {
    await redis.del(key);
  },
};

// Usage example
async function getServiceRequests(entityId: number) {
  const cacheKey = `service_requests:entity:${entityId}`;

  // Try cache first
  const cached = await cache.get<ServiceRequest[]>(cacheKey);
  if (cached) return cached;

  // Fetch from database
  const requests = await db.select()
    .from(serviceRequests)
    .where(eq(serviceRequests.businessEntityId, entityId));

  // Cache for 5 minutes
  await cache.set(cacheKey, requests, {
    ttl: 300,
    tags: [`entity:${entityId}`],
  });

  return requests;
}
```

---

### Sprint 6 (Weeks 11-12): Documentation & API Polish

**Goal:** Production-ready documentation

#### Week 11: API Documentation

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 6.1.1 | Set up OpenAPI/Swagger | Dev | ⬜ | Auto-generate |
| 6.1.2 | Document all endpoints | Dev | ⬜ | 200+ endpoints |
| 6.1.3 | Add request/response examples | Dev | ⬜ | All endpoints |
| 6.1.4 | Create Postman collection | Dev | ⬜ | For testing |
| 6.1.5 | Set up API versioning | Dev | ⬜ | v1, v2 |

**OpenAPI Setup:**
```typescript
// server/lib/openapi.ts

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DigiComply API',
      version: '2.0.0',
      description: 'Enterprise Compliance Management Platform API',
    },
    servers: [
      { url: 'https://api.digicomply.in', description: 'Production' },
      { url: 'https://staging-api.digicomply.in', description: 'Staging' },
      { url: 'http://localhost:5000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
        },
      },
    },
  },
  apis: ['./server/routes/*.ts', './server/**/*-routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
}
```

**Endpoint Documentation Example:**
```typescript
/**
 * @openapi
 * /api/service-requests:
 *   post:
 *     summary: Create a new service request
 *     tags: [Service Requests]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - businessEntityId
 *             properties:
 *               serviceId:
 *                 type: string
 *                 example: "gst-registration"
 *               businessEntityId:
 *                 type: integer
 *                 example: 123
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Service request created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceRequest'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
app.post('/api/service-requests', sessionAuthMiddleware, async (req, res) => {
  // ...
});
```

#### Week 12: User Documentation & Runbooks

| Task ID | Task | Owner | Status | Notes |
|---------|------|-------|--------|-------|
| 6.2.1 | Create user guides (by role) | PM | ⬜ | 9 guides |
| 6.2.2 | Create admin runbooks | DevOps | ⬜ | Operations |
| 6.2.3 | Create troubleshooting guide | Dev | ⬜ | Common issues |
| 6.2.4 | Record video tutorials | PM | ⬜ | Key flows |
| 6.2.5 | Create onboarding checklist | PM | ⬜ | New users |

---

## Phase 1 Completion Checklist

Before moving to Phase 2, verify all items:

### Testing
- [ ] Jest configured and running
- [ ] Test coverage > 70%
- [ ] CI pipeline runs tests
- [ ] Coverage reports generated

### Monitoring
- [ ] Sentry integrated (errors)
- [ ] APM integrated (performance)
- [ ] Logs aggregated
- [ ] Alerts configured
- [ ] Uptime monitoring active

### Security
- [ ] Rate limiting implemented
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Password policies enforced
- [ ] Sensitive data encrypted
- [ ] SQL injection prevented
- [ ] XSS prevention in place

### Disaster Recovery
- [ ] Automated backups running
- [ ] Backups verified restorable
- [ ] Recovery runbook documented
- [ ] RTO/RPO documented
- [ ] Failover procedure tested

### Performance
- [ ] Database indexes optimized
- [ ] Redis caching implemented
- [ ] Response times < 200ms (P95)
- [ ] Bundle size optimized
- [ ] CDN configured

### Documentation
- [ ] API documentation complete
- [ ] Swagger/OpenAPI available
- [ ] User guides created
- [ ] Runbooks documented
- [ ] Onboarding materials ready

---

## Success Metrics for Phase 1

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | > 70% | Jest coverage report |
| TypeScript Errors | 0 | tsc --noEmit |
| Security Vulnerabilities | 0 critical | npm audit |
| Response Time (P95) | < 300ms | APM dashboard |
| Error Rate | < 0.5% | Sentry dashboard |
| Uptime | > 99.9% | Uptime monitor |
| Documentation Coverage | 100% endpoints | OpenAPI spec |

---

## Next: Phase 2 Preview (Multi-Tenancy)

After Phase 1 completion, Phase 2 will focus on:

1. **Database Multi-Tenancy**
   - Add tenant_id to all tables
   - Implement row-level security
   - Create tenant management APIs

2. **Tenant Configuration**
   - Separate SLA settings per tenant
   - Separate notification configs
   - Custom workflows per tenant

3. **White-Label Support**
   - Custom branding (logo, colors)
   - Custom domains
   - Email template customization

4. **Tenant Billing**
   - Usage tracking
   - Per-tenant invoicing
   - Subscription management

---

## Appendix: Command Reference

### Development Commands
```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build for production
npm run build
```

### Database Commands
```bash
# Run migrations
npm run db:migrate

# Generate migration
npm run db:generate

# Seed database
npm run db:seed

# Reset database
npm run db:reset
```

### Deployment Commands
```bash
# Build Docker image
docker build -t digicomply:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Backup Commands
```bash
# Manual backup
./scripts/backup-database.sh

# Restore from backup
./scripts/restore-database.sh backup_20260130.dump.gz

# Verify backup
pg_restore --list backup.dump.gz
```
