# Database Migration Workflow

## Overview

This project uses **Drizzle ORM** with a proper migration workflow to ensure database changes are versioned, reviewable, and rollback-safe.

## ⚠️ Important Rules

1. **NEVER use `npm run db:push` in production** - This bypasses migrations and is destructive
2. **ALWAYS generate and review migrations** before applying to production
3. **ALWAYS commit migration files** to version control
4. **ALWAYS test migrations on staging** before production deployment

## Development Workflow

### 1. Making Schema Changes

Edit the schema file:
```bash
# Edit shared/schema.ts to add/modify tables
```

### 2. Generate Migration

```bash
npm run db:generate
```

This creates a new migration file in `database/migrations/` with:
- Timestamp-based filename (e.g., `0003_add_user_preferences.sql`)
- Up migration (SQL to apply changes)
- Down migration metadata

### 3. Review the Migration

**CRITICAL**: Open the generated SQL file and verify:
- [ ] Column types are correct
- [ ] Indexes are appropriate
- [ ] Foreign key constraints match your intent
- [ ] Data migrations (if any) are safe
- [ ] No accidental data loss (check DROP statements)

Example review:
```sql
-- database/migrations/0003_add_user_preferences.sql
ALTER TABLE "users" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb;
CREATE INDEX "user_preferences_idx" ON "users"("preferences");
```

### 4. Apply Migration (Development)

```bash
npm run db:migrate
```

This:
- Runs all pending migrations in order
- Updates the `__drizzle_migrations` tracking table
- Cannot be rolled back automatically (manual SQL required)

### 5. Test Your Changes

```bash
# Run tests to verify schema changes work
npm test

# Start dev server and test features
npm run dev
```

## Production Deployment Workflow

### Pre-Deployment Checklist

- [ ] All migrations tested on staging environment
- [ ] Migration SQL reviewed by senior developer
- [ ] Backup of production database created
- [ ] Rollback plan documented
- [ ] Downtime window scheduled (if needed)

### Deployment Steps

1. **Create Database Backup**
```bash
# On production server
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Run Migrations**
```bash
NODE_ENV=production npm run db:migrate
```

3. **Verify Migration**
```bash
# Check migration tracking table
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

4. **Deploy Application Code**
```bash
npm run build
npm start
```

### Rollback Procedure

If migration fails or causes issues:

1. **Stop the application** immediately
2. **Restore from backup**:
```bash
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```
3. **Investigate** the failed migration
4. **Fix** the schema/migration
5. **Test** on staging again

## Migration Best Practices

### ✅ DO

- Generate migrations for ALL schema changes
- Review generated SQL before applying
- Test migrations on staging first
- Keep migrations small and focused
- Include descriptive commit messages
- Document complex data migrations
- Create backups before production migrations

### ❌ DON'T

- Use `db:push` in production
- Edit migration files after they've been applied
- Delete old migration files
- Skip migration review
- Deploy without testing migrations
- Combine unrelated schema changes
- Ignore migration warnings

## Common Migration Scenarios

### Adding a Column

```typescript
// shared/schema.ts
export const users = pgTable('users', {
  // ... existing columns
  phoneNumber: text('phone_number'), // NEW
});
```

```bash
npm run db:generate  # Creates migration
npm run db:migrate   # Applies migration
```

### Adding an Index

```typescript
// shared/schema.ts
export const users = pgTable('users', {
  email: text('email').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email), // NEW INDEX
}));
```

### Renaming a Column (DANGEROUS)

⚠️ **Requires data migration**:

```sql
-- Option 1: Safe (no downtime)
ALTER TABLE users ADD COLUMN full_name text;
UPDATE users SET full_name = name WHERE name IS NOT NULL;
-- Deploy app code that writes to both columns
-- After verification, drop old column

-- Option 2: Direct (requires downtime)
ALTER TABLE users RENAME COLUMN name TO full_name;
```

### Adding NOT NULL Constraint

⚠️ **Requires data migration**:

```sql
-- Step 1: Add column as nullable
ALTER TABLE users ADD COLUMN department text;

-- Step 2: Backfill existing rows
UPDATE users SET department = 'General' WHERE department IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN department SET NOT NULL;
```

## Troubleshooting

### Migration Fails with "column already exists"

**Cause**: Migration was partially applied or run multiple times

**Fix**:
```bash
# Check migration status
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"

# Manually mark migration as complete (ONLY if you verified the changes exist)
psql $DATABASE_URL -c "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('migration_hash', NOW());"
```

### "Cannot find module" error during generate

**Cause**: Schema imports are broken

**Fix**:
```bash
# Ensure schema file has no syntax errors
npm run typecheck

# Try generating again
npm run db:generate
```

### Migration creates unwanted indexes

**Cause**: Drizzle auto-generates indexes for foreign keys

**Fix**: Edit generated migration to remove unwanted CREATE INDEX statements

## Emergency Recovery

If production database is corrupted:

1. **Immediately** switch to read-only mode
2. **Restore** from most recent backup
3. **Replay** transactions from write-ahead log if available
4. **Communicate** with stakeholders about data loss window
5. **Document** incident for post-mortem

## Migration Tracking

All migrations are tracked in the `__drizzle_migrations` table:

```sql
SELECT
  id,
  hash,
  created_at
FROM __drizzle_migrations
ORDER BY created_at DESC;
```

## Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run db:generate` | Create migration from schema changes | After editing shared/schema.ts |
| `npm run db:migrate` | Apply pending migrations | After reviewing generated SQL |
| `npm run db:studio` | Open Drizzle Studio GUI | Inspect database in browser |
| `npm run db:push` | Direct schema sync (NO MIGRATIONS) | **Development only**, never production |

## Example PR Template

When submitting schema changes:

```markdown
## Database Migration

**Migration File**: `database/migrations/0005_add_audit_logs.sql`

**Changes**:
- Added `audit_logs` table with columns: id, user_id, action, metadata, created_at
- Added index on (user_id, created_at) for query performance
- Added foreign key to users table

**Rollback Plan**:
```sql
DROP TABLE IF EXISTS audit_logs CASCADE;
```

**Testing**:
- [x] Migration runs successfully on dev
- [x] Migration runs successfully on staging
- [x] Tests pass with new schema
- [x] Rollback tested on dev

**Performance Impact**: Minimal (new table, no ALTER on existing tables)

**Downtime Required**: None
```

## Additional Resources

- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Zero-Downtime Migrations](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
