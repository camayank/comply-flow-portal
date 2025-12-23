/**
 * Admin System Migration
 * Creates admin users, roles, permissions, and system configuration
 */

exports.up = async function(knex) {
  // Roles and Permissions
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('display_name', 100).notNullable();
    table.text('description');
    table.json('permissions').notNullable().defaultTo('[]'); // Array of permission strings
    table.boolean('is_system_role').defaultTo(false); // Cannot be deleted
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['name']);
    table.index(['is_active']);
  });
  
  // System Users (Admin, Operations, QC)
  await knex.schema.createTable('system_users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('email', 200).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100);
    table.string('phone', 20);
    table.string('employee_id', 50).unique();
    table.string('department', 100);
    table.string('designation', 100);
    
    // Role and Access
    table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('RESTRICT');
    table.json('additional_permissions').defaultTo('[]'); // Extra permissions beyond role
    table.enu('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    
    // Authentication
    table.datetime('last_login_at');
    table.string('last_login_ip', 45);
    table.integer('failed_login_attempts').defaultTo(0);
    table.datetime('locked_until');
    table.string('password_reset_token', 100);
    table.datetime('password_reset_expires');
    table.boolean('force_password_change').defaultTo(false);
    
    // Profile
    table.string('avatar_url', 500);
    table.json('preferences').defaultTo('{}');
    table.string('timezone', 50).defaultTo('Asia/Kolkata');
    table.string('language', 10).defaultTo('en');
    
    table.timestamps(true, true);
    
    table.index(['email']);
    table.index(['role_id', 'status']);
    table.index(['status']);
  });
  
  // System Configuration
  await knex.schema.createTable('system_config', (table) => {
    table.increments('id').primary();
    table.string('category', 100).notNullable();
    table.string('key', 100).notNullable();
    table.text('value');
    table.string('data_type', 20).defaultTo('string'); // string, number, boolean, json
    table.text('description');
    table.boolean('is_public').defaultTo(false); // Can be read by client-side
    table.boolean('is_editable').defaultTo(true); // Can be changed via admin
    table.timestamps(true, true);
    
    table.unique(['category', 'key']);
    table.index(['category']);
    table.index(['is_public']);
  });
  
  // Notification Templates
  await knex.schema.createTable('notification_templates', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable().unique();
    table.string('code', 100).notNullable().unique();
    table.enu('type', ['email', 'sms', 'push', 'system']).notNullable();
    table.string('subject', 255); // For emails
    table.text('content').notNullable();
    table.json('variables').defaultTo('[]'); // Available template variables
    table.enu('trigger', [
      'status_change', 'document_upload', 'payment_received', 
      'deadline_reminder', 'custom', 'manual'
    ]).notNullable();
    table.json('trigger_conditions').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['type', 'is_active']);
    table.index(['trigger']);
  });
  
  // Audit Log
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned(); // Nullable for system actions
    table.string('user_type', 20).defaultTo('system_user'); // system_user, client
    table.string('action', 100).notNullable();
    table.string('entity_type', 100); // service_request, user, config, etc.
    table.integer('entity_id').unsigned();
    table.json('old_values').defaultTo('{}');
    table.json('new_values').defaultTo('{}');
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.json('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['user_id', 'created_at']);
    table.index(['entity_type', 'entity_id']);
    table.index(['action']);
    table.index(['created_at']);
  });
  
  // Task Management
  await knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.integer('service_request_id').unsigned().references('id').inTable('service_requests').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.enu('type', ['reminder', 'follow_up', 'review', 'approval', 'custom']).notNullable();
    table.enu('status', ['pending', 'in_progress', 'completed', 'cancelled']).defaultTo('pending');
    table.enu('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    table.integer('assigned_to').unsigned().references('id').inTable('system_users').onDelete('SET NULL');
    table.integer('created_by').unsigned().references('id').inTable('system_users').onDelete('SET NULL');
    table.datetime('due_at');
    table.datetime('completed_at');
    table.json('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['assigned_to', 'status']);
    table.index(['service_request_id']);
    table.index(['due_at']);
    table.index(['status', 'priority']);
  });
  
  // Notifications
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('template_id').unsigned().references('id').inTable('notification_templates').onDelete('SET NULL');
    table.integer('service_request_id').unsigned().references('id').inTable('service_requests').onDelete('CASCADE');
    table.integer('user_id').unsigned(); // Recipient
    table.string('user_type', 20).defaultTo('system_user');
    table.enu('type', ['email', 'sms', 'push', 'system']).notNullable();
    table.string('recipient_email', 200);
    table.string('recipient_phone', 20);
    table.string('subject', 255);
    table.text('content').notNullable();
    table.enu('status', ['pending', 'sent', 'failed', 'cancelled']).defaultTo('pending');
    table.datetime('scheduled_at').defaultTo(knex.fn.now());
    table.datetime('sent_at');
    table.integer('attempts').defaultTo(0);
    table.text('error_message');
    table.json('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['user_id', 'type']);
    table.index(['service_request_id']);
    table.index(['status', 'scheduled_at']);
    table.index(['sent_at']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('notification_templates');
  await knex.schema.dropTableIfExists('system_config');
  await knex.schema.dropTableIfExists('system_users');
  await knex.schema.dropTableIfExists('roles');
};