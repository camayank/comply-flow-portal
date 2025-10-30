/**
 * Additional Tables Migration
 * Creates user sessions and file management tables required for the platform
 */

exports.up = async function(knex) {
  // User Sessions for authentication
  await knex.schema.createTable('user_sessions', (table) => {
    table.increments('id').primary();
    table.string('session_id', 64).notNullable().unique();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('system_users').onDelete('CASCADE');
    table.string('fingerprint', 64).notNullable();
    table.string('ip_address', 45).notNullable();
    table.string('user_agent', 500);
    table.string('csrf_token', 64).notNullable();
    table.datetime('expires_at').notNullable();
    table.datetime('last_activity').notNullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['session_id']);
    table.index(['expires_at']);
    table.index(['last_activity']);
  });
  
  // Add any missing indexes for performance
  await knex.schema.alterTable('service_requests', (table) => {
    table.index(['client_email']);
    table.index(['request_number']);
  });
  
  await knex.schema.alterTable('service_documents', (table) => {
    table.index(['service_request_id', 'document_type']);
    table.index(['uploaded_by']);
  });
  
  await knex.schema.alterTable('audit_logs', (table) => {
    table.index(['user_id', 'created_at']);
    table.index(['entity_type', 'entity_id']);
    table.index(['action']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_sessions');
  
  // Note: We don't drop indexes in down migration as they might be needed
  // and dropping them could affect performance
};