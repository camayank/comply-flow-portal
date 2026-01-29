#!/usr/bin/env node
/**
 * Database Migration Runner
 * 
 * Runs SQL migrations in order to set up the robust backend
 */

import { pool } from './db';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = await fs.readdir(migrationsDir);
    
    // Sort migrations by filename (001_, 002_, etc.)
    const migrations = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrations.length} migration files:\n`);
    migrations.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log();

    // Run each migration
    for (const file of migrations) {
      console.log(`📝 Running: ${file}...`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      try {
        await pool.query(sql);
        console.log(`✅ Completed: ${file}\n`);
      } catch (error: any) {
        // Check if error is just "table already exists"
        if (error.code === '42P07') {
          console.log(`⚠️  Tables already exist in ${file}, skipping...\n`);
        } else {
          console.error(`❌ Failed: ${file}`);
          console.error(`   Error: ${error.message}\n`);
          throw error;
        }
      }
    }

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('clients', 'client_compliance_state', 'compliance_actions', 'client_documents', 'client_activities')
      ORDER BY tablename
    `);

    console.log(`\n✅ Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    // Check if demo client exists
    const clientCheck = await pool.query(
      "SELECT id, business_name, gstin FROM clients WHERE user_id = 'dev-user-123'"
    );

    if (clientCheck.rows.length > 0) {
      const client = clientCheck.rows[0];
      console.log(`\n✅ Demo client exists:`);
      console.log(`   - ID: ${client.id}`);
      console.log(`   - Name: ${client.business_name}`);
      console.log(`   - GSTIN: ${client.gstin}`);
    } else {
      console.log(`\n⚠️  No demo client found (will be created by seed migration)`);
    }

    console.log('\n🎉 Database migrations completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('   1. Restart the server: npm run dev');
    console.log('   2. Visit: http://localhost:5000/portal-v2');
    console.log('   3. Backend will use real database calculations\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
