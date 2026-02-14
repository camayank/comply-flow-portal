CREATE TABLE "ai_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"model_code" varchar(50) NOT NULL,
	"model_version" varchar(20),
	"prediction_type" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"input_features" jsonb,
	"prediction_value" jsonb NOT NULL,
	"confidence" numeric(5, 4),
	"explanation" jsonb,
	"actual_outcome" jsonb,
	"outcome_recorded_at" timestamp,
	"was_accurate" boolean,
	"recommended_action" text,
	"action_taken" varchar(100),
	"action_taken_at" timestamp,
	"action_taken_by" integer,
	"latency_ms" integer,
	"token_usage" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_execution_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"trigger_data" jsonb,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"duration_ms" integer,
	"actions_executed" jsonb,
	"error_message" text,
	"error_stack" text,
	"retry_count" integer DEFAULT 0,
	"next_retry_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"rule_code" varchar(50) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"trigger_type" varchar(50) NOT NULL,
	"trigger_entity" varchar(50) NOT NULL,
	"trigger_conditions" jsonb DEFAULT '{}'::jsonb,
	"trigger_fields" jsonb,
	"schedule_cron" varchar(100),
	"schedule_timezone" varchar(50) DEFAULT 'Asia/Kolkata',
	"filter_conditions" jsonb DEFAULT '[]'::jsonb,
	"actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"execution_order" integer DEFAULT 0,
	"stop_on_error" boolean DEFAULT false,
	"retry_on_error" boolean DEFAULT true,
	"max_retries" integer DEFAULT 3,
	"execution_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"last_executed_at" timestamp,
	"last_error" text,
	"last_error_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blueprint_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"workflow_step_id" uuid,
	"checklist_code" varchar(50) NOT NULL,
	"checklist_name" varchar(255) NOT NULL,
	"description" text,
	"checklist_type" varchar(50) DEFAULT 'QC',
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"minimum_completion_pct" integer DEFAULT 100,
	"requires_signoff" boolean DEFAULT false,
	"signoff_role" varchar(100),
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blueprint_compliance_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"description" text,
	"rule_type" varchar(50) NOT NULL,
	"deadline_formula" text,
	"base_date_type" varchar(50),
	"offset_days" integer DEFAULT 0,
	"offset_months" integer DEFAULT 0,
	"adjustment_rule" varchar(50),
	"penalty_type" varchar(50),
	"penalty_formula" text,
	"flat_amount" numeric(12, 2),
	"daily_amount" numeric(10, 2),
	"interest_rate_annual" numeric(5, 2),
	"penalty_slabs" jsonb DEFAULT '[]'::jsonb,
	"max_penalty" numeric(15, 2),
	"max_penalty_days" integer,
	"applies_when" jsonb DEFAULT '{}'::jsonb,
	"exempt_when" jsonb DEFAULT '{}'::jsonb,
	"notification_days_before" jsonb DEFAULT '[30,15,7,3,1]'::jsonb,
	"notification_template_id" uuid,
	"legal_reference" text,
	"circular_reference" varchar(255),
	"effective_from" date,
	"effective_until" date,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blueprint_document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"document_code" varchar(50) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"is_mandatory" boolean DEFAULT false,
	"mandatory_conditions" jsonb,
	"accepted_formats" jsonb DEFAULT '["pdf","jpg","jpeg","png"]'::jsonb,
	"max_size_mb" integer DEFAULT 10,
	"min_resolution_dpi" integer,
	"validation_rules" jsonb DEFAULT '[]'::jsonb,
	"required_fields" jsonb DEFAULT '[]'::jsonb,
	"ai_extraction_enabled" boolean DEFAULT false,
	"extraction_fields" jsonb DEFAULT '[]'::jsonb,
	"extraction_template_id" uuid,
	"verification_required" boolean DEFAULT false,
	"verification_method" varchar(50),
	"verification_api_endpoint" text,
	"required_at_step" varchar(50),
	"due_before_days" integer,
	"sample_document_url" text,
	"template_document_url" text,
	"instructions_url" text,
	"retention_days" integer,
	"is_confidential" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blueprint_pricing_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"tier_code" varchar(50) NOT NULL,
	"tier_name" varchar(100) NOT NULL,
	"description" text,
	"base_price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"criteria" jsonb DEFAULT '{}'::jsonb,
	"included_features" jsonb DEFAULT '[]'::jsonb,
	"excluded_features" jsonb DEFAULT '[]'::jsonb,
	"document_limit" integer,
	"revision_limit" integer,
	"urgent_multiplier" numeric(3, 2) DEFAULT '1.5',
	"super_urgent_multiplier" numeric(3, 2) DEFAULT '2.0',
	"bulk_discount_rules" jsonb DEFAULT '[]'::jsonb,
	"loyalty_discount_pct" numeric(5, 2) DEFAULT '0',
	"effective_from" date DEFAULT CURRENT_DATE,
	"effective_until" date,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blueprint_workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"step_code" varchar(50) NOT NULL,
	"step_name" varchar(255) NOT NULL,
	"description" text,
	"step_type" varchar(50) NOT NULL,
	"default_assignee_role" varchar(100),
	"assignment_strategy" varchar(50) DEFAULT 'ROUND_ROBIN',
	"required_skills" jsonb DEFAULT '[]'::jsonb,
	"sla_hours" integer,
	"sla_business_hours_only" boolean DEFAULT true,
	"warning_threshold_pct" integer DEFAULT 75,
	"escalation_after_hours" integer,
	"escalation_chain" jsonb DEFAULT '[]'::jsonb,
	"required_documents" jsonb DEFAULT '[]'::jsonb,
	"required_fields" jsonb DEFAULT '[]'::jsonb,
	"required_approvals" jsonb DEFAULT '[]'::jsonb,
	"auto_actions" jsonb DEFAULT '[]'::jsonb,
	"webhooks" jsonb DEFAULT '[]'::jsonb,
	"email_template_id" uuid,
	"sms_template_id" uuid,
	"allowed_next_steps" jsonb DEFAULT '[]'::jsonb,
	"default_next_step" varchar(50),
	"completion_criteria" jsonb DEFAULT '{}'::jsonb,
	"entry_conditions" jsonb DEFAULT '[]'::jsonb,
	"exit_conditions" jsonb DEFAULT '[]'::jsonb,
	"skip_conditions" jsonb DEFAULT '[]'::jsonb,
	"form_layout_id" uuid,
	"instructions" text,
	"checklist_items" jsonb DEFAULT '[]'::jsonb,
	"is_milestone" boolean DEFAULT false,
	"is_client_visible" boolean DEFAULT true,
	"requires_client_approval" boolean DEFAULT false,
	"can_be_skipped" boolean DEFAULT false,
	"can_be_repeated" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_service_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"client_id" integer NOT NULL,
	"entity_id" integer,
	"blueprint_id" uuid NOT NULL,
	"pricing_tier_id" uuid,
	"subscription_type" varchar(50) DEFAULT 'RECURRING',
	"start_date" date NOT NULL,
	"end_date" date,
	"renewal_date" date,
	"agreed_price" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'INR',
	"discount_pct" numeric(5, 2) DEFAULT '0',
	"billing_frequency" varchar(20),
	"status" varchar(50) DEFAULT 'ACTIVE',
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"config_overrides" jsonb DEFAULT '{}'::jsonb,
	"assigned_team" jsonb,
	"primary_account_manager" integer,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"client_id" integer,
	"entity_id" integer,
	"blueprint_id" uuid,
	"compliance_rule_id" uuid,
	"task_id" integer,
	"period_type" varchar(20) NOT NULL,
	"period_code" varchar(20),
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"fiscal_year" varchar(10),
	"original_due_date" date NOT NULL,
	"adjusted_due_date" date,
	"extended_due_date" date,
	"extension_reason" text,
	"extension_approved_by" integer,
	"status" varchar(50) DEFAULT 'UPCOMING',
	"filed_date" date,
	"filing_reference" varchar(255),
	"filing_proof_url" text,
	"days_overdue" integer DEFAULT 0,
	"penalty_amount" numeric(15, 2) DEFAULT '0',
	"interest_amount" numeric(15, 2) DEFAULT '0',
	"total_liability" numeric(15, 2) DEFAULT '0',
	"penalty_paid" boolean DEFAULT false,
	"penalty_paid_date" date,
	"penalty_paid_reference" varchar(255),
	"tax_liability" numeric(15, 2),
	"tax_paid" numeric(15, 2),
	"auto_generated" boolean DEFAULT true,
	"notifications_sent" jsonb DEFAULT '[]'::jsonb,
	"last_notification_date" timestamp,
	"notes" text,
	"completed_by" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"field_code" varchar(50) NOT NULL,
	"field_label" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"options" jsonb,
	"options_source" varchar(50),
	"options_api_endpoint" text,
	"lookup_entity" varchar(50),
	"lookup_display_field" varchar(50),
	"lookup_value_field" varchar(50),
	"lookup_filters" jsonb,
	"formula_expression" text,
	"formula_dependencies" jsonb,
	"is_required" boolean DEFAULT false,
	"is_unique" boolean DEFAULT false,
	"validation_rules" jsonb DEFAULT '[]'::jsonb,
	"min_value" numeric(15, 4),
	"max_value" numeric(15, 4),
	"min_length" integer,
	"max_length" integer,
	"pattern" varchar(500),
	"pattern_message" varchar(255),
	"default_value" text,
	"default_value_type" varchar(20) DEFAULT 'STATIC',
	"placeholder" text,
	"help_text" text,
	"tooltip_text" text,
	"display_format" varchar(100),
	"input_mask" varchar(100),
	"display_order" integer DEFAULT 0,
	"group_name" varchar(100),
	"is_active" boolean DEFAULT true,
	"visible_on_create" boolean DEFAULT true,
	"visible_on_edit" boolean DEFAULT true,
	"visible_on_view" boolean DEFAULT true,
	"visible_on_list" boolean DEFAULT false,
	"visible_on_export" boolean DEFAULT true,
	"editable_by_roles" jsonb DEFAULT '[]'::jsonb,
	"viewable_by_roles" jsonb DEFAULT '[]'::jsonb,
	"track_history" boolean DEFAULT false,
	"is_encrypted" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_field_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_value_id" uuid NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"changed_by" integer,
	"changed_at" timestamp DEFAULT now(),
	"change_reason" text
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_definition_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"value" jsonb,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deadline_formulas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"base_date_type" varchar(50) NOT NULL,
	"offset_days" integer DEFAULT 0,
	"offset_months" integer DEFAULT 0,
	"offset_years" integer DEFAULT 0,
	"adjustment_rule" varchar(50) DEFAULT 'NEXT_WORKING_DAY',
	"exclude_weekends" boolean DEFAULT true,
	"exclude_holidays" boolean DEFAULT true,
	"applicable_periods" jsonb DEFAULT '["MONTHLY","QUARTERLY","ANNUAL"]'::jsonb,
	"applicable_jurisdictions" jsonb DEFAULT '[]'::jsonb,
	"example_calculation" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "deadline_formulas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "document_extraction_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_code" varchar(50) NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"description" text,
	"fields" jsonb NOT NULL,
	"validation_rules" jsonb DEFAULT '[]'::jsonb,
	"ocr_provider" varchar(50) DEFAULT 'GOOGLE_VISION',
	"ocr_config" jsonb DEFAULT '{}'::jsonb,
	"pre_processing" jsonb DEFAULT '[]'::jsonb,
	"post_processing" jsonb DEFAULT '[]'::jsonb,
	"sample_document_url" text,
	"annotated_sample_url" text,
	"total_extractions" integer DEFAULT 0,
	"avg_confidence" numeric(5, 4),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "document_extraction_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
CREATE TABLE "holiday_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" uuid,
	"calendar_type" varchar(50) DEFAULT 'BANK',
	"year" integer NOT NULL,
	"holidays" jsonb NOT NULL,
	"weekend_days" jsonb DEFAULT '[0,6]'::jsonb,
	"saturday_rules" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "intelligent_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" integer NOT NULL,
	"detected_type" varchar(100),
	"classification_confidence" numeric(5, 4),
	"alternative_types" jsonb,
	"extraction_template_id" uuid,
	"extraction_status" varchar(50) DEFAULT 'PENDING',
	"extracted_data" jsonb,
	"extraction_confidence" numeric(5, 4),
	"field_confidences" jsonb,
	"raw_ocr_output" jsonb,
	"extracted_at" timestamp,
	"quality_score" numeric(5, 4),
	"quality_issues" jsonb,
	"verification_status" varchar(50) DEFAULT 'UNVERIFIED',
	"verification_method" varchar(50),
	"verified_by" integer,
	"verified_at" timestamp,
	"verification_notes" text,
	"corrections" jsonb,
	"cross_reference_status" varchar(50),
	"cross_reference_results" jsonb,
	"tampering_score" numeric(5, 4),
	"tampering_indicators" jsonb,
	"document_hash" varchar(64),
	"file_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" uuid NOT NULL,
	"blueprint_id" uuid,
	"rule_type" varchar(50) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"description" text,
	"deadline_offset_days" integer,
	"exemption_criteria" jsonb,
	"additional_documents" jsonb,
	"additional_forms" jsonb,
	"rate_override" numeric(5, 2),
	"form_override" varchar(100),
	"applies_when" jsonb DEFAULT '{}'::jsonb,
	"legal_reference" text,
	"notification_reference" varchar(255),
	"effective_from" date,
	"effective_until" date,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(50),
	"parent_id" uuid,
	"level" varchar(20) NOT NULL,
	"path" text,
	"gst_state_code" varchar(2),
	"tin_prefix" varchar(4),
	"state_code" varchar(5),
	"default_currency" varchar(3) DEFAULT 'INR',
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata',
	"locale" varchar(10) DEFAULT 'en-IN',
	"date_format" varchar(20) DEFAULT 'DD/MM/YYYY',
	"tax_authority_name" varchar(255),
	"tax_authority_website" text,
	"helpline_number" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "jurisdictions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "page_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"layout_type" varchar(50) NOT NULL,
	"layout_name" varchar(255) NOT NULL,
	"layout_code" varchar(50) NOT NULL,
	"description" text,
	"layout_definition" jsonb NOT NULL,
	"conditions" jsonb,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "penalty_rules_master" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"penalty_type" varchar(50) NOT NULL,
	"flat_amount" numeric(12, 2),
	"daily_amount" numeric(10, 2),
	"interest_rate_annual" numeric(5, 2),
	"compounding_frequency" varchar(20),
	"slabs" jsonb DEFAULT '[]'::jsonb,
	"max_penalty" numeric(15, 2),
	"max_penalty_days" integer,
	"min_penalty" numeric(12, 2),
	"minimum_tax_liability" numeric(15, 2),
	"conditions" jsonb DEFAULT '{}'::jsonb,
	"legal_section" varchar(255),
	"circular_reference" varchar(255),
	"effective_from" date,
	"effective_until" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "penalty_rules_master_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "professional_tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" uuid NOT NULL,
	"salary_slabs" jsonb NOT NULL,
	"employer_registration_threshold" integer,
	"employer_annual_fee" numeric(10, 2),
	"exempted_categories" jsonb DEFAULT '[]'::jsonb,
	"filing_frequency" varchar(20),
	"due_day" integer,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(50),
	"description" text,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"service_type" varchar(50) DEFAULT 'RECURRING',
	"frequency" varchar(20),
	"governing_act" varchar(255),
	"section_reference" varchar(100),
	"rule_reference" varchar(100),
	"form_number" varchar(50),
	"filing_portal" varchar(255),
	"applicable_entity_types" jsonb DEFAULT '["pvt_ltd","llp","opc"]'::jsonb,
	"workflow_definition" jsonb DEFAULT '{"steps":[],"transitions":[],"parallelSteps":[],"conditionalBranches":[]}'::jsonb NOT NULL,
	"default_sla_hours" integer DEFAULT 48,
	"escalation_rules" jsonb DEFAULT '[]'::jsonb,
	"document_requirements" jsonb DEFAULT '[]'::jsonb,
	"output_documents" jsonb DEFAULT '[]'::jsonb,
	"base_pricing" jsonb DEFAULT '{}'::jsonb,
	"pricing_model" varchar(50) DEFAULT 'FIXED',
	"deadline_formula" varchar(500),
	"penalty_rules" jsonb DEFAULT '[]'::jsonb,
	"compliance_checkpoints" jsonb DEFAULT '[]'::jsonb,
	"ai_extraction_enabled" boolean DEFAULT false,
	"ai_extraction_template_id" uuid,
	"ai_risk_scoring_enabled" boolean DEFAULT false,
	"ai_risk_model_id" uuid,
	"version" integer DEFAULT 1,
	"previous_version_id" uuid,
	"effective_from" date DEFAULT CURRENT_DATE,
	"effective_until" date,
	"change_log" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'DRAFT',
	"is_active" boolean DEFAULT true,
	"is_system_default" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"search_keywords" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_blueprints_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "smart_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" integer,
	"client_id" integer,
	"recommendation_type" varchar(50) NOT NULL,
	"category" varchar(100),
	"title" varchar(255) NOT NULL,
	"description" text,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"related_entities" jsonb,
	"suggested_action" varchar(50),
	"action_data" jsonb,
	"action_url" text,
	"priority" varchar(20) DEFAULT 'MEDIUM',
	"confidence" numeric(5, 4),
	"impact_score" numeric(5, 2),
	"potential_revenue" numeric(15, 2),
	"potential_savings" numeric(15, 2),
	"risk_reduction" numeric(5, 2),
	"status" varchar(50) DEFAULT 'PENDING',
	"viewed_at" timestamp,
	"actioned_at" timestamp,
	"action_result" varchar(50),
	"dismiss_reason" text,
	"expires_at" timestamp,
	"source_model" varchar(100),
	"generated_by" varchar(50) DEFAULT 'AI',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "entity_id" integer;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "service_type" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "period_label" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "periodicity" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_action_taken_by_users_id_fk" FOREIGN KEY ("action_taken_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_log" ADD CONSTRAINT "automation_execution_log_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_checklists" ADD CONSTRAINT "blueprint_checklists_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_checklists" ADD CONSTRAINT "blueprint_checklists_workflow_step_id_blueprint_workflow_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."blueprint_workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_compliance_rules" ADD CONSTRAINT "blueprint_compliance_rules_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_document_types" ADD CONSTRAINT "blueprint_document_types_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_pricing_tiers" ADD CONSTRAINT "blueprint_pricing_tiers_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_workflow_steps" ADD CONSTRAINT "blueprint_workflow_steps_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_subscriptions" ADD CONSTRAINT "client_service_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_subscriptions" ADD CONSTRAINT "client_service_subscriptions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_subscriptions" ADD CONSTRAINT "client_service_subscriptions_entity_id_business_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_subscriptions" ADD CONSTRAINT "client_service_subscriptions_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_subscriptions" ADD CONSTRAINT "client_service_subscriptions_pricing_tier_id_blueprint_pricing_tiers_id_fk" FOREIGN KEY ("pricing_tier_id") REFERENCES "public"."blueprint_pricing_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_subscriptions" ADD CONSTRAINT "client_service_subscriptions_primary_account_manager_users_id_fk" FOREIGN KEY ("primary_account_manager") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_subscriptions" ADD CONSTRAINT "client_service_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_entity_id_business_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_compliance_rule_id_blueprint_compliance_rules_id_fk" FOREIGN KEY ("compliance_rule_id") REFERENCES "public"."blueprint_compliance_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_extension_approved_by_users_id_fk" FOREIGN KEY ("extension_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_history" ADD CONSTRAINT "custom_field_history_field_value_id_custom_field_values_id_fk" FOREIGN KEY ("field_value_id") REFERENCES "public"."custom_field_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_history" ADD CONSTRAINT "custom_field_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_definition_id_custom_field_definitions_id_fk" FOREIGN KEY ("field_definition_id") REFERENCES "public"."custom_field_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligent_documents" ADD CONSTRAINT "intelligent_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligent_documents" ADD CONSTRAINT "intelligent_documents_extraction_template_id_document_extraction_templates_id_fk" FOREIGN KEY ("extraction_template_id") REFERENCES "public"."document_extraction_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligent_documents" ADD CONSTRAINT "intelligent_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdiction_rules" ADD CONSTRAINT "jurisdiction_rules_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdiction_rules" ADD CONSTRAINT "jurisdiction_rules_blueprint_id_service_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."service_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdictions" ADD CONSTRAINT "jurisdictions_parent_id_jurisdictions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_tax_rates" ADD CONSTRAINT "professional_tax_rates_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_blueprints" ADD CONSTRAINT "service_blueprints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_blueprints" ADD CONSTRAINT "service_blueprints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_blueprints" ADD CONSTRAINT "service_blueprints_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_recommendations" ADD CONSTRAINT "smart_recommendations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_recommendations" ADD CONSTRAINT "smart_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_recommendations" ADD CONSTRAINT "smart_recommendations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_aip_tenant" ON "ai_predictions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_aip_type" ON "ai_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "idx_aip_entity" ON "ai_predictions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_aip_created" ON "ai_predictions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ael_rule" ON "automation_execution_log" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_ael_status" ON "automation_execution_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ael_started" ON "automation_execution_log" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_ar_tenant" ON "automation_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ar_trigger" ON "automation_rules" USING btree ("trigger_entity","trigger_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ar_rule_code" ON "automation_rules" USING btree ("tenant_id","rule_code");--> statement-breakpoint
CREATE INDEX "idx_bc_blueprint" ON "blueprint_checklists" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "idx_bcr_blueprint" ON "blueprint_compliance_rules" USING btree ("blueprint_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bcr_rule_code" ON "blueprint_compliance_rules" USING btree ("blueprint_id","rule_code");--> statement-breakpoint
CREATE INDEX "idx_bcr_rule_type" ON "blueprint_compliance_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "idx_bdt_blueprint" ON "blueprint_document_types" USING btree ("blueprint_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bdt_doc_code" ON "blueprint_document_types" USING btree ("blueprint_id","document_code");--> statement-breakpoint
CREATE INDEX "idx_bpt_blueprint" ON "blueprint_pricing_tiers" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "idx_bpt_tier_code" ON "blueprint_pricing_tiers" USING btree ("blueprint_id","tier_code");--> statement-breakpoint
CREATE INDEX "idx_bws_blueprint" ON "blueprint_workflow_steps" USING btree ("blueprint_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bws_step_code" ON "blueprint_workflow_steps" USING btree ("blueprint_id","step_code");--> statement-breakpoint
CREATE INDEX "idx_css_client" ON "client_service_subscriptions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_css_entity" ON "client_service_subscriptions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_css_blueprint" ON "client_service_subscriptions" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "idx_css_status" ON "client_service_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cc_tenant_status" ON "compliance_calendar" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_cc_client" ON "compliance_calendar" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cc_entity" ON "compliance_calendar" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_cc_due_date" ON "compliance_calendar" USING btree ("adjusted_due_date");--> statement-breakpoint
CREATE INDEX "idx_cc_blueprint" ON "compliance_calendar" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "idx_cc_period" ON "compliance_calendar" USING btree ("fiscal_year","period_type");--> statement-breakpoint
CREATE INDEX "idx_cfd_tenant_entity" ON "custom_field_definitions" USING btree ("tenant_id","entity_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cfd_field_code" ON "custom_field_definitions" USING btree ("tenant_id","entity_type","field_code");--> statement-breakpoint
CREATE INDEX "idx_cfv_entity" ON "custom_field_values" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_cfv_field" ON "custom_field_values" USING btree ("field_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cfv_unique" ON "custom_field_values" USING btree ("field_definition_id","entity_id");--> statement-breakpoint
CREATE INDEX "idx_det_doc_type" ON "document_extraction_templates" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_hc_year" ON "holiday_calendars" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_hc_jurisdiction" ON "holiday_calendars" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_id_document" ON "intelligent_documents" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_id_status" ON "intelligent_documents" USING btree ("extraction_status");--> statement-breakpoint
CREATE INDEX "idx_id_verification" ON "intelligent_documents" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_jr_jurisdiction" ON "jurisdiction_rules" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_jr_blueprint" ON "jurisdiction_rules" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "idx_jr_rule_type" ON "jurisdiction_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_j_code" ON "jurisdictions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_j_parent" ON "jurisdictions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_j_level" ON "jurisdictions" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_pl_tenant_entity" ON "page_layouts" USING btree ("tenant_id","entity_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pl_layout_code" ON "page_layouts" USING btree ("tenant_id","entity_type","layout_code");--> statement-breakpoint
CREATE INDEX "idx_bp_tenant" ON "service_blueprints" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_bp_category" ON "service_blueprints" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bp_code" ON "service_blueprints" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_bp_status" ON "service_blueprints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bp_active" ON "service_blueprints" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_sr_tenant" ON "smart_recommendations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sr_user" ON "smart_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sr_client" ON "smart_recommendations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_sr_status" ON "smart_recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sr_priority" ON "smart_recommendations" USING btree ("priority");