/**
 * Migration: Add lead traceability columns and case notes tables
 *
 * Adds lead_id columns to:
 * - users
 * - business_entities
 * - service_requests
 * - payments
 *
 * Adds filing status columns to service_requests for government portal tracking.
 *
 * Creates new tables:
 * - case_notes: Internal ops team collaboration notes
 * - client_activities: Unified timeline for client activity tracking
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function runAddLeadTraceabilityMigration() {
  console.log('🔄 Running add-lead-traceability migration...');

  try {
    // =========================================================================
    // PART 1: Add lead_id columns to existing tables
    // =========================================================================

    // 1.1 Add lead_id to users table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'lead_id'
        ) THEN
          ALTER TABLE users ADD COLUMN lead_id VARCHAR(50);
          CREATE INDEX IF NOT EXISTS idx_users_lead_id ON users(lead_id);
        END IF;
      END $$;
    `);
    console.log('  ✅ users.lead_id column ready');

    // 1.2 Add lead_id to business_entities table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'business_entities' AND column_name = 'lead_id'
        ) THEN
          ALTER TABLE business_entities ADD COLUMN lead_id VARCHAR(50);
          CREATE INDEX IF NOT EXISTS idx_business_entities_lead_id ON business_entities(lead_id);
        END IF;
      END $$;
    `);
    console.log('  ✅ business_entities.lead_id column ready');

    // 1.3 Add lead_id to service_requests table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'lead_id'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN lead_id VARCHAR(50);
          CREATE INDEX IF NOT EXISTS idx_service_requests_lead_id ON service_requests(lead_id);
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.lead_id column ready');

    // 1.4 Add lead_id to payments table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payments' AND column_name = 'lead_id'
        ) THEN
          ALTER TABLE payments ADD COLUMN lead_id VARCHAR(50);
          CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
        END IF;
      END $$;
    `);
    console.log('  ✅ payments.lead_id column ready');

    // =========================================================================
    // PART 2: Add filing status columns to service_requests
    // =========================================================================

    // 2.1 Add filing_stage column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'filing_stage'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN filing_stage TEXT DEFAULT 'not_filed';
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.filing_stage column ready');

    // 2.2 Add filing_date column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'filing_date'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN filing_date TIMESTAMP;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.filing_date column ready');

    // 2.3 Add filing_portal column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'filing_portal'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN filing_portal TEXT;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.filing_portal column ready');

    // 2.4 Add arn_number column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'arn_number'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN arn_number TEXT;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.arn_number column ready');

    // 2.5 Add query_details column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'query_details'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN query_details TEXT;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.query_details column ready');

    // 2.6 Add query_raised_at column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'query_raised_at'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN query_raised_at TIMESTAMP;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.query_raised_at column ready');

    // 2.7 Add response_submitted_at column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'response_submitted_at'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN response_submitted_at TIMESTAMP;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.response_submitted_at column ready');

    // 2.8 Add final_status column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'final_status'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN final_status TEXT;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.final_status column ready');

    // 2.9 Add final_status_date column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'final_status_date'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN final_status_date TIMESTAMP;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.final_status_date column ready');

    // 2.10 Add certificate_url column
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service_requests' AND column_name = 'certificate_url'
        ) THEN
          ALTER TABLE service_requests ADD COLUMN certificate_url TEXT;
        END IF;
      END $$;
    `);
    console.log('  ✅ service_requests.certificate_url column ready');

    // =========================================================================
    // PART 3: Create case_notes table
    // =========================================================================

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'case_notes'
        ) THEN
          CREATE TABLE case_notes (
            id SERIAL PRIMARY KEY,
            service_request_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_client_visible BOOLEAN DEFAULT FALSE,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Add indexes for query performance
          CREATE INDEX IF NOT EXISTS idx_case_notes_service_request_id ON case_notes(service_request_id);
          CREATE INDEX IF NOT EXISTS idx_case_notes_author_id ON case_notes(author_id);
          CREATE INDEX IF NOT EXISTS idx_case_notes_created_at ON case_notes(created_at);
          CREATE INDEX IF NOT EXISTS idx_case_notes_is_deleted ON case_notes(is_deleted);
        END IF;
      END $$;
    `);
    console.log('  ✅ case_notes table ready');

    // =========================================================================
    // PART 4: Create client_activities table
    // =========================================================================

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'client_activities'
        ) THEN
          CREATE TABLE client_activities (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            service_request_id INTEGER,
            activity_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            old_value TEXT,
            new_value TEXT,
            metadata JSON,
            performed_by INTEGER,
            performed_by_name TEXT,
            is_client_visible BOOLEAN DEFAULT FALSE,
            is_system_generated BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Add indexes for query performance
          CREATE INDEX IF NOT EXISTS idx_client_activities_client_id ON client_activities(client_id);
          CREATE INDEX IF NOT EXISTS idx_client_activities_service_request_id ON client_activities(service_request_id);
          CREATE INDEX IF NOT EXISTS idx_client_activities_activity_type ON client_activities(activity_type);
          CREATE INDEX IF NOT EXISTS idx_client_activities_created_at ON client_activities(created_at);
          CREATE INDEX IF NOT EXISTS idx_client_activities_performed_by ON client_activities(performed_by);
          CREATE INDEX IF NOT EXISTS idx_client_activities_is_client_visible ON client_activities(is_client_visible);
        END IF;
      END $$;
    `);
    console.log('  ✅ client_activities table ready');

    console.log('✅ add-lead-traceability migration completed successfully');
    return true;
  } catch (error) {
    console.error('❌ add-lead-traceability migration failed:', error);
    return false;
  }
}

/**
 * Helper function to add a case note
 */
export async function addCaseNote(
  serviceRequestId: number,
  authorId: number,
  content: string,
  isClientVisible: boolean = false
) {
  const result = await db.execute(sql`
    INSERT INTO case_notes (service_request_id, author_id, content, is_client_visible)
    VALUES (${serviceRequestId}, ${authorId}, ${content}, ${isClientVisible})
    RETURNING id, created_at
  `);
  return result.rows[0];
}

/**
 * Helper function to log a client activity
 */
export async function logClientActivity(
  clientId: number,
  activityType: string,
  title: string,
  options: {
    serviceRequestId?: number;
    description?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
    performedBy?: number;
    performedByName?: string;
    isClientVisible?: boolean;
    isSystemGenerated?: boolean;
  } = {}
) {
  const {
    serviceRequestId,
    description,
    oldValue,
    newValue,
    metadata,
    performedBy,
    performedByName,
    isClientVisible = false,
    isSystemGenerated = false
  } = options;

  const result = await db.execute(sql`
    INSERT INTO client_activities (
      client_id,
      service_request_id,
      activity_type,
      title,
      description,
      old_value,
      new_value,
      metadata,
      performed_by,
      performed_by_name,
      is_client_visible,
      is_system_generated
    )
    VALUES (
      ${clientId},
      ${serviceRequestId ?? null},
      ${activityType},
      ${title},
      ${description ?? null},
      ${oldValue ?? null},
      ${newValue ?? null},
      ${metadata ? JSON.stringify(metadata) : null}::json,
      ${performedBy ?? null},
      ${performedByName ?? null},
      ${isClientVisible},
      ${isSystemGenerated}
    )
    RETURNING id, created_at
  `);
  return result.rows[0];
}
