/**
 * Migration: Add ID Sequences Table
 *
 * Creates the centralized ID sequence management table for generating
 * unique, human-readable IDs across all entities.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function runMigration() {
  console.log('🔄 Running migration: add-id-sequences');

  try {
    // Create the id_sequences table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS id_sequences (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        year VARCHAR(4) NOT NULL,
        month VARCHAR(2),
        prefix VARCHAR(10) NOT NULL,
        current_sequence INTEGER NOT NULL DEFAULT 0,
        last_generated_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created id_sequences table');

    // Create unique index for entity_type + year + month combination
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_id_sequences_unique
      ON id_sequences(entity_type, year, COALESCE(month, ''))
    `);
    console.log('✅ Created unique index on id_sequences');

    // Create index for fast lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_id_sequences_type
      ON id_sequences(entity_type)
    `);
    console.log('✅ Created type index on id_sequences');

    // Seed initial sequences based on existing data
    await seedExistingSequences();

    console.log('✅ Migration completed: add-id-sequences');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function seedExistingSequences() {
  console.log('🌱 Seeding existing sequences...');

  try {
    // Get max client ID
    const clientResult = await db.execute(sql`
      SELECT MAX(CAST(SUBSTRING(client_id FROM 2) AS INTEGER)) as max_seq
      FROM business_entities
      WHERE client_id ~ '^C[0-9]+$'
    `);
    const maxClient = (clientResult.rows[0] as any)?.max_seq || 0;

    if (maxClient > 0) {
      await db.execute(sql`
        INSERT INTO id_sequences (entity_type, year, prefix, current_sequence)
        VALUES ('CLIENT', 'ALL', 'C', ${maxClient})
        ON CONFLICT (entity_type, year, COALESCE(month, ''))
        DO UPDATE SET current_sequence = GREATEST(id_sequences.current_sequence, ${maxClient})
      `);
      console.log(`  - Client sequence set to ${maxClient}`);
    }

    // Get max lead ID
    const leadResult = await db.execute(sql`
      SELECT MAX(CAST(SUBSTRING(lead_id FROM 2) AS INTEGER)) as max_seq
      FROM leads
      WHERE lead_id ~ '^L[0-9]+$'
    `);
    const maxLead = (leadResult.rows[0] as any)?.max_seq || 0;

    if (maxLead > 0) {
      const year = new Date().getFullYear().toString().slice(-2);
      await db.execute(sql`
        INSERT INTO id_sequences (entity_type, year, prefix, current_sequence)
        VALUES ('LEAD', ${year}, 'L', ${maxLead})
        ON CONFLICT (entity_type, year, COALESCE(month, ''))
        DO UPDATE SET current_sequence = GREATEST(id_sequences.current_sequence, ${maxLead})
      `);
      console.log(`  - Lead sequence set to ${maxLead}`);
    }

    // Get max service request count for the current year
    const srResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM service_requests
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    `);
    const maxSR = (srResult.rows[0] as any)?.count || 0;

    if (maxSR > 0) {
      const year = new Date().getFullYear().toString().slice(-2);
      await db.execute(sql`
        INSERT INTO id_sequences (entity_type, year, prefix, current_sequence)
        VALUES ('SERVICE_REQUEST', ${year}, 'SR', ${maxSR})
        ON CONFLICT (entity_type, year, COALESCE(month, ''))
        DO UPDATE SET current_sequence = GREATEST(id_sequences.current_sequence, ${maxSR})
      `);
      console.log(`  - Service Request sequence set to ${maxSR}`);
    }

    console.log('✅ Existing sequences seeded');
  } catch (error) {
    console.warn('⚠️ Could not seed existing sequences:', error);
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
