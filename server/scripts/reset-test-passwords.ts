/**
 * Reset Test User Passwords Script
 * Run with: DATABASE_URL=postgresql://... npx tsx server/scripts/reset-test-passwords.ts
 *
 * Updates passwords for existing test users to known values
 */

import { db } from '../db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const testUsers = [
  { username: 'admin', password: 'Admin@123' },
  { username: 'sales', password: 'Sales@123' },
  { username: 'salesexec', password: 'SalesExec@123' },
  { username: 'ops', password: 'Ops@123' },
  { username: 'opsexec', password: 'OpsExec@123' },
  { username: 'support', password: 'Support@123' },
  { username: 'qc', password: 'Qc@123' },
  { username: 'accounts', password: 'Accounts@123' },
  { username: 'client', password: 'Client@123' },
  { username: 'agent', password: 'Agent@123' },
];

async function resetTestPasswords() {
  console.log('🔑 Resetting test user passwords...\n');

  for (const userData of testUsers) {
    try {
      // Check if user exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, userData.username))
        .limit(1);

      if (!existing) {
        console.log(`⏭️  User "${userData.username}" not found, skipping...`);
        continue;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Update password
      await db
        .update(users)
        .set({
          password: hashedPassword,
          isActive: true, // Ensure user is active
        })
        .where(eq(users.id, existing.id));

      console.log(`✅ Reset password for: ${userData.username}`);
    } catch (error: any) {
      console.error(`❌ Error updating ${userData.username}:`, error.message);
    }
  }

  console.log('\n✨ Password reset completed!\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                     TEST USER CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('STAFF LOGIN (use "Staff Login" tab):');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('Role              │ Username    │ Password      │ Dashboard');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('Super Admin       │ admin       │ Admin@123     │ /super-admin');
  console.log('Sales Manager     │ sales       │ Sales@123     │ /sales');
  console.log('Sales Executive   │ salesexec   │ SalesExec@123 │ /sales');
  console.log('Ops Manager       │ ops         │ Ops@123       │ /operations');
  console.log('Ops Executive     │ opsexec     │ OpsExec@123   │ /operations');
  console.log('Customer Service  │ support     │ Support@123   │ /customer-service');
  console.log('QC Executive      │ qc          │ Qc@123        │ /qc-dashboard');
  console.log('Accountant        │ accounts    │ Accounts@123  │ /financial-management');
  console.log('Agent             │ agent       │ Agent@123     │ /agent');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('');
  console.log('CLIENT LOGIN (use "Client Login" tab - OTP based):');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('Email: client@complyflow.com');
  console.log('(Requires OTP - check console for code in development mode)');
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(0);
}

resetTestPasswords().catch((error) => {
  console.error('Password reset failed:', error);
  process.exit(1);
});
