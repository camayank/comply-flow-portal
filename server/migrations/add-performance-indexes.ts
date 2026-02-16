/**
 * Performance Indexes Migration
 *
 * Adds composite indexes for scaling to 5000+ clients/year
 * Run: npx tsx server/migrations/add-performance-indexes.ts
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addPerformanceIndexes() {
  console.log('Adding performance indexes for scale...\n');

  const indexes = [
    // Service Requests - Most heavily queried table
    {
      name: 'idx_service_requests_status_priority',
      sql: `CREATE INDEX IF NOT EXISTS idx_service_requests_status_priority
            ON service_requests(status, priority)
            WHERE status NOT IN ('completed', 'cancelled')`,
      description: 'Active requests by status and priority (ops work queue)'
    },
    {
      name: 'idx_service_requests_assigned_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_status
            ON service_requests(assigned_team_member, status)
            WHERE assigned_team_member IS NOT NULL`,
      description: 'Team member workload queries'
    },
    {
      name: 'idx_service_requests_entity_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_service_requests_entity_status
            ON service_requests(business_entity_id, status)`,
      description: 'Client portal - my services'
    },
    {
      name: 'idx_service_requests_user_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_service_requests_user_created
            ON service_requests(user_id, created_at DESC)`,
      description: 'User service history'
    },
    {
      name: 'idx_service_requests_sla_deadline',
      sql: `CREATE INDEX IF NOT EXISTS idx_service_requests_sla_deadline
            ON service_requests(sla_deadline)
            WHERE status NOT IN ('completed', 'cancelled') AND sla_deadline IS NOT NULL`,
      description: 'SLA monitoring queries'
    },
    {
      name: 'idx_service_requests_due_date',
      sql: `CREATE INDEX IF NOT EXISTS idx_service_requests_due_date
            ON service_requests(due_date)
            WHERE status NOT IN ('completed', 'cancelled') AND due_date IS NOT NULL`,
      description: 'Deadline tracking'
    },

    // Users - Role-based queries
    {
      name: 'idx_users_role_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_role_active
            ON users(role, is_active)
            WHERE is_active = true`,
      description: 'Active users by role'
    },
    {
      name: 'idx_users_department_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_department_active
            ON users(department, is_active)
            WHERE department IS NOT NULL AND is_active = true`,
      description: 'Team member queries'
    },

    // Business Entities - Client queries
    {
      name: 'idx_business_entities_owner_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_business_entities_owner_status
            ON business_entities(owner_id, client_status)`,
      description: 'Client portal - my businesses'
    },
    {
      name: 'idx_business_entities_client_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_business_entities_client_id
            ON business_entities(client_id)`,
      description: 'Client lookup by readable ID'
    },

    // Compliance Tracking - Calendar and alerts
    {
      name: 'idx_compliance_tracking_user_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_compliance_tracking_user_status
            ON compliance_tracking(user_id, status)`,
      description: 'Client compliance dashboard'
    },
    {
      name: 'idx_compliance_tracking_entity_due',
      sql: `CREATE INDEX IF NOT EXISTS idx_compliance_tracking_entity_due
            ON compliance_tracking(business_entity_id, due_date)
            WHERE status IN ('pending', 'overdue')`,
      description: 'Upcoming compliance deadlines'
    },
    {
      name: 'idx_compliance_tracking_due_date_priority',
      sql: `CREATE INDEX IF NOT EXISTS idx_compliance_tracking_due_date_priority
            ON compliance_tracking(due_date, priority)
            WHERE status IN ('pending', 'overdue')`,
      description: 'Compliance calendar queries'
    },

    // Commissions - Agent portal
    {
      name: 'idx_commissions_agent_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_commissions_agent_status
            ON commissions(agent_id, status)`,
      description: 'Agent commission dashboard'
    },
    {
      name: 'idx_commissions_status_payable',
      sql: `CREATE INDEX IF NOT EXISTS idx_commissions_status_payable
            ON commissions(status, payable_on)
            WHERE status IN ('pending', 'approved')`,
      description: 'Pending payouts'
    },

    // SLA Timers - Operations monitoring
    {
      name: 'idx_sla_timers_status_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_sla_timers_status_active
            ON sla_timers(status, is_active)
            WHERE is_active = true`,
      description: 'Active SLA monitoring'
    },
    {
      name: 'idx_sla_timers_service_request',
      sql: `CREATE INDEX IF NOT EXISTS idx_sla_timers_service_request
            ON sla_timers(service_request_id)
            WHERE is_active = true`,
      description: 'SLA lookup by request'
    },

    // Payments - Financial queries
    {
      name: 'idx_payments_status_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_payments_status_created
            ON payments(status, created_at DESC)`,
      description: 'Payment status tracking'
    },
    {
      name: 'idx_payments_service_request',
      sql: `CREATE INDEX IF NOT EXISTS idx_payments_service_request
            ON payments(service_request_id)`,
      description: 'Payment by service request'
    },

    // Activity Logs - Audit trail
    {
      name: 'idx_activity_logs_entity_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_created
            ON activity_logs(entity_type, entity_id, created_at DESC)`,
      description: 'Activity timeline queries'
    },

    // Leads - Sales pipeline
    {
      name: 'idx_leads_stage_assigned',
      sql: `CREATE INDEX IF NOT EXISTS idx_leads_stage_assigned
            ON leads(stage, assigned_to)
            WHERE stage NOT IN ('converted', 'lost')`,
      description: 'Active leads pipeline'
    },
    {
      name: 'idx_leads_source_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_leads_source_created
            ON leads(source, created_at DESC)`,
      description: 'Lead source analytics'
    },

    // Notifications - Delivery tracking
    {
      name: 'idx_notifications_user_read',
      sql: `CREATE INDEX IF NOT EXISTS idx_notifications_user_read
            ON notifications(user_id, is_read, created_at DESC)`,
      description: 'User notification inbox'
    },

    // User Sessions - Security
    {
      name: 'idx_user_sessions_user_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
            ON user_sessions(user_id, is_active)
            WHERE is_active = true`,
      description: 'Active session lookup'
    },
    {
      name: 'idx_user_sessions_token',
      sql: `CREATE INDEX IF NOT EXISTS idx_user_sessions_token
            ON user_sessions(session_token)
            WHERE is_active = true`,
      description: 'Token validation'
    },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const index of indexes) {
    try {
      await db.execute(sql.raw(index.sql));
      console.log(`✅ ${index.name}`);
      console.log(`   ${index.description}\n`);
      successCount++;
    } catch (error: any) {
      // Index might already exist or table might not exist
      if (error.message?.includes('already exists')) {
        console.log(`⏭️  ${index.name} (already exists)\n`);
        successCount++;
      } else if (error.message?.includes('does not exist')) {
        console.log(`⚠️  ${index.name} (table not found, skipping)\n`);
      } else {
        console.log(`❌ ${index.name}: ${error.message}\n`);
        errorCount++;
      }
    }
  }

  console.log('─'.repeat(50));
  console.log(`\nIndexes created: ${successCount}/${indexes.length}`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
  }
  console.log('\nPerformance indexes migration complete!');
}

// Run migration
addPerformanceIndexes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
