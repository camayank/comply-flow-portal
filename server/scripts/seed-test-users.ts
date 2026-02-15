/**
 * Seed Test Users Script
 * Run with: npx tsx server/scripts/seed-test-users.ts
 *
 * Creates test users for all roles with username/password login
 */

import { db } from '../db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const testUsers = [
  {
    username: 'admin',
    email: 'admin@complyflow.com',
    password: 'Admin@123',
    fullName: 'System Administrator',
    role: 'super_admin',
    department: 'admin',
  },
  {
    username: 'sales',
    email: 'sales@complyflow.com',
    password: 'Sales@123',
    fullName: 'Sales Manager',
    role: 'sales_manager',
    department: 'sales',
  },
  {
    username: 'salesexec',
    email: 'salesexec@complyflow.com',
    password: 'SalesExec@123',
    fullName: 'Rahul Sharma',
    role: 'sales_executive',
    department: 'sales',
  },
  {
    username: 'ops',
    email: 'ops@complyflow.com',
    password: 'Ops@123',
    fullName: 'Operations Manager',
    role: 'ops_manager',
    department: 'operations',
  },
  {
    username: 'opsexec',
    email: 'opsexec@complyflow.com',
    password: 'OpsExec@123',
    fullName: 'Priya Verma',
    role: 'ops_executive',
    department: 'operations',
  },
  {
    username: 'support',
    email: 'support@complyflow.com',
    password: 'Support@123',
    fullName: 'Support Team',
    role: 'customer_service',
    department: 'operations',
  },
  {
    username: 'qc',
    email: 'qc@complyflow.com',
    password: 'Qc@123',
    fullName: 'Quality Controller',
    role: 'qc_executive',
    department: 'operations',
  },
  {
    username: 'accounts',
    email: 'accounts@complyflow.com',
    password: 'Accounts@123',
    fullName: 'Finance Team',
    role: 'accountant',
    department: 'finance',
  },
  {
    username: 'client',
    email: 'client@complyflow.com',
    password: 'Client@123',
    fullName: 'Demo Client',
    role: 'client',
    department: null,
  },
  {
    username: 'agent',
    email: 'agent@complyflow.com',
    password: 'Agent@123',
    fullName: 'Partner Agent',
    role: 'agent',
    department: null,
  },
];

async function seedTestUsers() {
  console.log('🌱 Seeding test users...\n');

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, userData.username))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  User "${userData.username}" already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Insert user
      const [newUser] = await db.insert(users).values({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        role: userData.role,
        department: userData.department,
        isActive: true,
      }).returning();

      console.log(`✅ Created: ${userData.username} (${userData.role})`);
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation
        console.log(`⏭️  User "${userData.username}" already exists (duplicate key), skipping...`);
      } else {
        console.error(`❌ Error creating ${userData.username}:`, error.message);
      }
    }
  }

  console.log('\n✨ Seed completed!\n');
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
  console.log('(Requires OTP - check email service/console for code)');
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(0);
}

seedTestUsers().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
