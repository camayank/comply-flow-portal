/**
 * Service Catalog Migration
 * Creates core service definitions and workflow templates
 */

exports.up = async function(knex) {
  // Service Categories
  await knex.schema.createTable('service_categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('code', 20).notNullable().unique();
    table.text('description');
    table.string('icon', 50).defaultTo('briefcase');
    table.string('color', 20).defaultTo('#3B82F6');
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['is_active', 'sort_order']);
  });
  
  // Core Services
  await knex.schema.createTable('services', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().references('id').inTable('service_categories').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('code', 50).notNullable().unique();
    table.text('description');
    table.text('requirements');
    table.text('deliverables');
    table.decimal('base_price', 10, 2).defaultTo(0);
    table.string('currency', 3).defaultTo('INR');
    table.integer('estimated_days').defaultTo(7);
    table.integer('sla_hours').defaultTo(48);
    table.json('pricing_tiers').defaultTo('{}'); // JSON for different pricing models
    table.json('required_documents').defaultTo('[]');
    table.json('optional_documents').defaultTo('[]');
    table.boolean('requires_consultation').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['category_id', 'is_active']);
    table.index(['is_active', 'sort_order']);
  });
  
  // Workflow Templates
  await knex.schema.createTable('workflow_templates', (table) => {
    table.increments('id').primary();
    table.integer('service_id').unsigned().references('id').inTable('services').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('description');
    table.json('steps').notNullable(); // Array of workflow steps
    table.json('conditions').defaultTo('{}'); // Conditional logic
    table.json('automation_rules').defaultTo('{}'); // Automation configuration
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['service_id', 'is_active']);
    table.index(['is_default']);
  });
  
  // Service Requests (Main entity)
  await knex.schema.createTable('service_requests', (table) => {
    table.increments('id').primary();
    table.string('request_number', 50).notNullable().unique();
    table.integer('service_id').unsigned().references('id').inTable('services').onDelete('RESTRICT');
    table.integer('workflow_template_id').unsigned().references('id').inTable('workflow_templates').onDelete('SET NULL');
    
    // Client Information
    table.string('client_name', 200).notNullable();
    table.string('client_email', 200).notNullable();
    table.string('client_phone', 20);
    table.string('client_company', 200);
    table.text('client_address');
    table.string('client_gstin', 15);
    table.string('client_pan', 10);
    
    // Request Details
    table.text('description');
    table.json('requirements').defaultTo('{}');
    table.decimal('quoted_price', 10, 2);
    table.decimal('final_price', 10, 2);
    table.string('currency', 3).defaultTo('INR');
    table.date('expected_delivery_date');
    table.date('actual_delivery_date');
    
    // Status and Workflow
    table.enu('status', [
      'draft', 'submitted', 'under_review', 'approved', 'in_progress',
      'pending_client', 'pending_documents', 'quality_check', 
      'completed', 'delivered', 'cancelled', 'on_hold'
    ]).defaultTo('draft');
    table.enu('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    table.string('current_step', 100);
    table.integer('assigned_to').unsigned(); // User ID
    table.integer('quality_reviewer').unsigned(); // User ID for QC
    
    // Payment and Commercial
    table.enu('payment_status', [
      'pending', 'partial', 'paid', 'refunded', 'cancelled'
    ]).defaultTo('pending');
    table.decimal('amount_paid', 10, 2).defaultTo(0);
    table.json('payment_history').defaultTo('[]');
    
    // Metadata
    table.json('metadata').defaultTo('{}');
    table.text('internal_notes');
    table.text('client_feedback');
    table.integer('client_rating').checkBetween([1, 5]);
    
    table.timestamps(true, true);
    
    table.index(['status', 'priority']);
    table.index(['assigned_to']);
    table.index(['service_id', 'status']);
    table.index(['client_email']);
    table.index(['created_at']);
  });
  
  // Service Request Steps (Workflow execution)
  await knex.schema.createTable('service_request_steps', (table) => {
    table.increments('id').primary();
    table.integer('service_request_id').unsigned().references('id').inTable('service_requests').onDelete('CASCADE');
    table.string('step_name', 100).notNullable();
    table.text('step_description');
    table.enu('step_status', ['pending', 'in_progress', 'completed', 'skipped', 'failed']).defaultTo('pending');
    table.integer('assigned_to').unsigned();
    table.integer('step_order').notNullable();
    table.datetime('started_at');
    table.datetime('completed_at');
    table.datetime('due_at');
    table.text('notes');
    table.json('step_data').defaultTo('{}'); // Step-specific data
    table.timestamps(true, true);
    
    table.index(['service_request_id', 'step_order']);
    table.index(['assigned_to', 'step_status']);
    table.index(['step_status', 'due_at']);
  });
  
  // Documents and Files
  await knex.schema.createTable('service_documents', (table) => {
    table.increments('id').primary();
    table.integer('service_request_id').unsigned().references('id').inTable('service_requests').onDelete('CASCADE');
    table.string('document_type', 100).notNullable(); // 'requirement', 'deliverable', 'support'
    table.string('original_name', 255).notNullable();
    table.string('stored_name', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('mime_type', 100).notNullable();
    table.integer('file_size').unsigned().notNullable();
    table.string('file_hash', 64); // SHA-256 hash
    table.boolean('is_required').defaultTo(false);
    table.boolean('is_client_visible').defaultTo(true);
    table.integer('uploaded_by').unsigned().notNullable();
    table.text('description');
    table.json('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['service_request_id', 'document_type']);
    table.index(['uploaded_by']);
    table.index(['file_hash']);
  });
  
  // Communication Log
  await knex.schema.createTable('service_communications', (table) => {
    table.increments('id').primary();
    table.integer('service_request_id').unsigned().references('id').inTable('service_requests').onDelete('CASCADE');
    table.enu('type', ['email', 'sms', 'call', 'meeting', 'internal_note', 'status_change']).notNullable();
    table.enu('direction', ['inbound', 'outbound', 'internal']).notNullable();
    table.string('subject', 255);
    table.text('content').notNullable();
    table.string('from_email', 200);
    table.string('to_email', 200);
    table.string('from_phone', 20);
    table.string('to_phone', 20);
    table.integer('created_by').unsigned();
    table.boolean('is_client_visible').defaultTo(false);
    table.json('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['service_request_id', 'type']);
    table.index(['created_by']);
    table.index(['created_at']);
  });
  
  // Quality Control
  await knex.schema.createTable('quality_reviews', (table) => {
    table.increments('id').primary();
    table.integer('service_request_id').unsigned().references('id').inTable('service_requests').onDelete('CASCADE');
    table.integer('reviewer_id').unsigned().notNullable();
    table.enu('review_type', ['interim', 'final', 'post_delivery']).notNullable();
    table.enu('status', ['pending', 'approved', 'rejected', 'needs_revision']).defaultTo('pending');
    table.integer('quality_score').checkBetween([1, 10]);
    table.json('checklist_items').defaultTo('[]');
    table.text('comments');
    table.text('recommendations');
    table.datetime('reviewed_at');
    table.timestamps(true, true);
    
    table.index(['service_request_id', 'review_type']);
    table.index(['reviewer_id', 'status']);
    table.index(['reviewed_at']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('quality_reviews');
  await knex.schema.dropTableIfExists('service_communications');
  await knex.schema.dropTableIfExists('service_documents');
  await knex.schema.dropTableIfExists('service_request_steps');
  await knex.schema.dropTableIfExists('service_requests');
  await knex.schema.dropTableIfExists('workflow_templates');
  await knex.schema.dropTableIfExists('services');
  await knex.schema.dropTableIfExists('service_categories');
};