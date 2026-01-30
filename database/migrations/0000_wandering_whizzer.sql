CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"business_entity_id" integer,
	"service_request_id" integer,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"details" text,
	"metadata" json,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"permissions" json NOT NULL,
	"access_level" text DEFAULT 'limited',
	"ip_restrictions" json,
	"session_timeout" integer DEFAULT 3600,
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "advanced_task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"task_type" text NOT NULL,
	"category" text NOT NULL,
	"skill_level" text DEFAULT 'intermediate',
	"estimated_duration" integer,
	"estimated_effort" text,
	"priority" text DEFAULT 'medium',
	"dependencies" json,
	"prerequisite_conditions" json,
	"trigger_conditions" json,
	"instructions" text NOT NULL,
	"checklist_items" json,
	"input_fields" json,
	"validation_rules" json,
	"required_skills" json DEFAULT '[]'::json,
	"required_tools" json DEFAULT '[]'::json,
	"reference_documents" json,
	"template_files" json,
	"quality_gates" json,
	"approval_required" boolean DEFAULT false,
	"reviewer_role" text,
	"is_automatable" boolean DEFAULT false,
	"automation_script" text,
	"api_integrations" json,
	"usage_count" integer DEFAULT 0,
	"average_completion_time" integer,
	"success_rate" numeric(5, 2) DEFAULT '0.00',
	"tags" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "advanced_task_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
CREATE TABLE "agent_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"announcement_type" text DEFAULT 'general',
	"priority" text DEFAULT 'medium',
	"target_audience" json,
	"is_active" boolean DEFAULT true,
	"valid_until" timestamp,
	"read_by_agents" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"details" json,
	"ip_address" text,
	"device_info" text,
	"user_agent" text,
	"session_id" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"admin_user_id" integer,
	"message_type" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"attachments" json,
	"status" text DEFAULT 'open',
	"priority" text DEFAULT 'medium',
	"is_read" boolean DEFAULT false,
	"response_time" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"agent_code" text NOT NULL,
	"territory" text,
	"commission_rate" numeric(5, 2) DEFAULT '15.00',
	"lead_conversion_rate" numeric(5, 2),
	"total_commission_earned" numeric(10, 2) DEFAULT '0',
	"leads_generated" integer DEFAULT 0,
	"leads_converted" integer DEFAULT 0,
	"performance_rating" numeric(3, 2),
	"is_active" boolean DEFAULT true,
	"onboarded_at" timestamp DEFAULT now(),
	"last_activity" timestamp,
	CONSTRAINT "agent_partners_agent_code_unique" UNIQUE("agent_code")
);
--> statement-breakpoint
CREATE TABLE "agent_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"period" text NOT NULL,
	"period_date" timestamp NOT NULL,
	"leads_submitted" integer DEFAULT 0,
	"leads_contacted" integer DEFAULT 0,
	"leads_converted" integer DEFAULT 0,
	"leads_lost" integer DEFAULT 0,
	"conversion_rate" numeric(5, 2),
	"total_commission_earned" numeric(10, 2) DEFAULT '0.00',
	"top_services" json,
	"average_lead_value" numeric(10, 2),
	"response_time" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"agent_code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"assigned_territory" text,
	"joining_date" timestamp DEFAULT now(),
	"role" text DEFAULT 'agent',
	"is_active" boolean DEFAULT true,
	"device_restrictions" json,
	"performance_rating" numeric(3, 2),
	"total_commission_earned" numeric(10, 2) DEFAULT '0.00',
	"pending_payouts" numeric(10, 2) DEFAULT '0.00',
	"cleared_payouts" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agent_profiles_agent_code_unique" UNIQUE("agent_code")
);
--> statement-breakpoint
CREATE TABLE "agent_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_agent_id" integer NOT NULL,
	"sub_agent_id" integer NOT NULL,
	"referral_code" text NOT NULL,
	"referral_status" text DEFAULT 'active',
	"override_commission_rate" numeric(5, 2) DEFAULT '5.00',
	"total_override_earned" numeric(10, 2) DEFAULT '0.00',
	"onboarded_at" timestamp DEFAULT now(),
	"last_activity_at" timestamp,
	CONSTRAINT "agent_referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "ai_document_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"document_type" text NOT NULL,
	"category" text NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt_template" text NOT NULL,
	"required_variables" json NOT NULL,
	"output_format" text DEFAULT 'html',
	"include_formatting" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_number" text NOT NULL,
	"title" text NOT NULL,
	"document_type" text NOT NULL,
	"category" text NOT NULL,
	"generated_by" text DEFAULT 'ai' NOT NULL,
	"ai_prompt" text,
	"ai_model" text DEFAULT 'claude-sonnet-4',
	"content" text NOT NULL,
	"content_format" text DEFAULT 'html',
	"variables" json,
	"template_id" integer,
	"service_request_id" integer,
	"client_id" integer,
	"entity_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1,
	"pdf_url" text,
	"docx_url" text,
	"original_url" text,
	"requires_signature" boolean DEFAULT false,
	"signature_status" text DEFAULT 'unsigned',
	"signatory_count" integer DEFAULT 0,
	"signed_count" integer DEFAULT 0,
	"approval_required" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_by" integer NOT NULL,
	"last_edited_by" integer,
	"last_edited_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_documents_document_number_unique" UNIQUE("document_number")
);
--> statement-breakpoint
CREATE TABLE "api_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"portal_type" text NOT NULL,
	"api_endpoint" text NOT NULL,
	"http_method" text NOT NULL,
	"request_payload" json,
	"response_payload" json,
	"status_code" integer,
	"success" boolean NOT NULL,
	"error_message" text,
	"error_category" text,
	"retry_attempt" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"response_time" integer,
	"initiated_by" integer,
	"related_filing_id" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "article_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"change_log" text,
	"version_type" text DEFAULT 'minor',
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"created_by" integer NOT NULL,
	"reviewed_by" integer,
	"approved_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"attendance_date" timestamp NOT NULL,
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"total_hours" numeric(4, 2),
	"break_hours" numeric(4, 2) DEFAULT '0.00',
	"overtime_hours" numeric(4, 2) DEFAULT '0.00',
	"status" text NOT NULL,
	"work_location" text DEFAULT 'office',
	"late_minutes" integer DEFAULT 0,
	"early_leave_minutes" integer DEFAULT 0,
	"productive_hours" numeric(4, 2),
	"tasks_completed" integer DEFAULT 0,
	"notes" text,
	"is_holiday" boolean DEFAULT false,
	"holiday_type" text,
	"approved_by" integer,
	"approved_at" timestamp,
	"system_generated" boolean DEFAULT false,
	"ip_address" text,
	"device_info" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"old_value" json,
	"new_value" json,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budget_plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_name" text NOT NULL,
	"fiscal_year" text NOT NULL,
	"plan_type" text NOT NULL,
	"revenue_target" numeric(12, 2) NOT NULL,
	"client_acquisition_target" integer DEFAULT 0,
	"retention_target" numeric(5, 2) DEFAULT '0.00',
	"service_targets" json,
	"operating_expenses" numeric(12, 2) DEFAULT '0.00',
	"marketing_budget" numeric(12, 2) DEFAULT '0.00',
	"technology_budget" numeric(12, 2) DEFAULT '0.00',
	"staff_costs" numeric(12, 2) DEFAULT '0.00',
	"gross_profit_target" numeric(12, 2) DEFAULT '0.00',
	"net_profit_target" numeric(12, 2) DEFAULT '0.00',
	"profit_margin_target" numeric(5, 2) DEFAULT '0.00',
	"status" text DEFAULT 'draft',
	"approved_by" integer,
	"approved_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"entity_type" text NOT NULL,
	"cin" text,
	"gstin" text,
	"pan" text,
	"registration_date" timestamp,
	"compliance_score" integer DEFAULT 100,
	"alternate_phone" text,
	"state" text,
	"city" text,
	"address" text,
	"industry_type" text,
	"lead_source" text,
	"acquisition_date" timestamp DEFAULT now(),
	"total_services_availed" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0.00',
	"last_service_date" timestamp,
	"client_status" text DEFAULT 'active',
	"relationship_manager" text,
	"communication_preference" json,
	"documents" json,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "business_entities_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "career_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"path_name" text NOT NULL,
	"department" text NOT NULL,
	"from_role" text NOT NULL,
	"to_role" text NOT NULL,
	"minimum_experience" integer NOT NULL,
	"required_skills" json,
	"required_certifications" json,
	"required_performance_rating" numeric(3, 2),
	"development_programs" json,
	"approximate_timeframe" integer,
	"salary_growth_percentage" numeric(5, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "career_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"career_path_id" integer NOT NULL,
	"current_stage" text,
	"progress_percentage" integer DEFAULT 0,
	"skills_achieved" json,
	"skills_remaining" json,
	"certifications_completed" json,
	"certifications_required" json,
	"performance_metric" numeric(3, 2),
	"mentor_id" integer,
	"target_promotion_date" timestamp,
	"estimated_readiness" timestamp,
	"development_plan" text,
	"mentor_notes" text,
	"manager_assessment" text,
	"self_assessment" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"business_entity_id" integer,
	"service_request_id" integer,
	"communication_type" text NOT NULL,
	"direction" text NOT NULL,
	"subject" text,
	"summary" text NOT NULL,
	"full_content" text,
	"contacted_by" integer,
	"contacted_person" text,
	"contact_method" text,
	"scheduled_at" timestamp,
	"actual_at" timestamp NOT NULL,
	"duration" integer,
	"purpose" text,
	"priority" text DEFAULT 'medium',
	"sentiment" text DEFAULT 'neutral',
	"outcome" text,
	"action_items" json,
	"next_follow_up_date" timestamp,
	"tags" json,
	"attachments" json,
	"related_documents" json,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"business_entity_id" integer NOT NULL,
	"contract_type" text NOT NULL,
	"contract_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"renewal_type" text DEFAULT 'manual',
	"renewal_period" integer,
	"notice_period" integer DEFAULT 30,
	"contract_value" numeric(12, 2) NOT NULL,
	"billing_cycle" text DEFAULT 'monthly',
	"payment_terms" integer DEFAULT 30,
	"late_fee_percentage" numeric(5, 2) DEFAULT '0.00',
	"included_services" json NOT NULL,
	"service_level" text DEFAULT 'standard',
	"max_service_requests" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_by_client" boolean DEFAULT false,
	"signed_by_company" boolean DEFAULT false,
	"client_signed_at" timestamp,
	"company_signed_at" timestamp,
	"contract_document" text,
	"signed_document" text,
	"amendments" json,
	"specific_terms" json,
	"sla_terms" json,
	"cancellation_clause" text,
	"created_by" integer NOT NULL,
	"approved_by" integer,
	"last_reviewed_at" timestamp,
	"next_review_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE "client_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"delivery_confirmation_id" integer,
	"client_id" integer NOT NULL,
	"overall_rating" integer NOT NULL,
	"service_quality" integer,
	"timeliness" integer,
	"communication" integer,
	"documentation" integer,
	"positive_aspects" text,
	"improvement_suggestions" text,
	"additional_comments" text,
	"nps_score" integer,
	"would_recommend" boolean,
	"referral_potential" text,
	"service_category" text,
	"specific_service" text,
	"requests_follow_up" boolean DEFAULT false,
	"follow_up_type" text,
	"follow_up_completed" boolean DEFAULT false,
	"has_issues" boolean DEFAULT false,
	"issues_description" text,
	"issue_resolved" boolean DEFAULT false,
	"resolution_notes" text,
	"feedback_channel" text DEFAULT 'portal',
	"is_anonymous" boolean DEFAULT false,
	"ip_address" text,
	"user_agent" text,
	"submitted_at" timestamp DEFAULT now(),
	"acknowledged_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_health_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"business_entity_id" integer NOT NULL,
	"overall_health_score" integer DEFAULT 100,
	"engagement_score" integer DEFAULT 100,
	"satisfaction_score" integer DEFAULT 100,
	"payment_health_score" integer DEFAULT 100,
	"communication_score" integer DEFAULT 100,
	"compliance_score" integer DEFAULT 100,
	"churn_risk" text DEFAULT 'low',
	"risk_factors" json,
	"last_interaction_date" timestamp,
	"days_inactive" integer DEFAULT 0,
	"missed_deadlines" integer DEFAULT 0,
	"overdue_payments" integer DEFAULT 0,
	"total_logins" integer DEFAULT 0,
	"avg_response_time" integer,
	"documents_submitted_on_time" integer DEFAULT 0,
	"total_documents_required" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0.00',
	"average_order_value" numeric(10, 2) DEFAULT '0.00',
	"payment_delays" integer DEFAULT 0,
	"outstanding_amount" numeric(10, 2) DEFAULT '0.00',
	"predicted_lifetime_value" numeric(12, 2) DEFAULT '0.00',
	"churn_probability" numeric(5, 4) DEFAULT '0.0000',
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_loyalty_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"program_id" text NOT NULL,
	"current_tier" text DEFAULT 'bronze',
	"total_points" integer DEFAULT 0,
	"available_points" integer DEFAULT 0,
	"lifetime_points" integer DEFAULT 0,
	"next_tier" text,
	"points_to_next_tier" integer DEFAULT 0,
	"revenue_to_next_tier" numeric(10, 2) DEFAULT '0.00',
	"enrolled_date" timestamp DEFAULT now(),
	"last_activity" timestamp,
	"total_redemptions" integer DEFAULT 0,
	"total_referrals" integer DEFAULT 0,
	"current_benefits" json,
	"used_benefits" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"business_entity_id" integer NOT NULL,
	"value_segment" text NOT NULL,
	"risk_level" text DEFAULT 'low',
	"loyalty_tier" text DEFAULT 'bronze',
	"lifetime_value" numeric(12, 2) DEFAULT '0.00',
	"avg_monthly_value" numeric(12, 2) DEFAULT '0.00',
	"payment_behavior" text DEFAULT 'prompt',
	"credit_limit" numeric(12, 2) DEFAULT '0.00',
	"relationship_length" integer DEFAULT 0,
	"service_utilization" numeric(5, 2) DEFAULT '0.00',
	"satisfaction_score" integer DEFAULT 0,
	"engagement_level" text DEFAULT 'medium',
	"expansion_potential" text DEFAULT 'medium',
	"upsell_readiness" text DEFAULT 'neutral',
	"referral_potential" text DEFAULT 'medium',
	"industry_influence" text DEFAULT 'low',
	"reference_potential" boolean DEFAULT false,
	"strategic_value" text DEFAULT 'standard',
	"portfolio_manager" integer NOT NULL,
	"last_review_date" timestamp,
	"next_review_date" timestamp,
	"portfolio_notes" text,
	"retention_strategy" json,
	"growth_strategy" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_entity_id" integer,
	"service_request_id" integer,
	"title" text NOT NULL,
	"description" text,
	"task_type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'medium',
	"due_date" timestamp,
	"completed_at" timestamp,
	"required_documents" json,
	"template_url" text,
	"assigned_by" integer,
	"reminders_sent" integer DEFAULT 0,
	"next_reminder_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commission_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"lead_id" integer,
	"service_request_id" integer,
	"service_code" text NOT NULL,
	"client_name" text NOT NULL,
	"commission_type" text DEFAULT 'direct',
	"commission_rate" numeric(5, 2),
	"service_value" numeric(10, 2),
	"commission_amount" numeric(10, 2),
	"status" text DEFAULT 'pending',
	"earned_date" timestamp DEFAULT now(),
	"payout_date" timestamp,
	"dispute_reason" text,
	"dispute_status" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"rule_id" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_required" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by" integer,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "compliance_jurisdiction_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"compliance_rule_id" integer NOT NULL,
	"state" text NOT NULL,
	"override_field" text NOT NULL,
	"override_value" json NOT NULL,
	"description" text,
	"effective_from" timestamp DEFAULT now(),
	"effective_until" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_penalty_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"compliance_rule_id" integer NOT NULL,
	"penalty_type" text NOT NULL,
	"calculation_type" text NOT NULL,
	"calculation_formula" json NOT NULL,
	"grace_period_days" integer DEFAULT 0,
	"min_penalty" numeric(12, 2),
	"max_penalty" numeric(12, 2),
	"compounding_allowed" boolean DEFAULT false,
	"notes" text,
	"legal_reference" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_required_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"compliance_rule_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_name" text NOT NULL,
	"is_mandatory" boolean DEFAULT true,
	"description" text,
	"format" json,
	"validity_period" text,
	"order" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" text NOT NULL,
	"regulation_category" text NOT NULL,
	"compliance_name" text NOT NULL,
	"form_number" text,
	"description" text,
	"periodicity" text NOT NULL,
	"due_date_calculation_type" text NOT NULL,
	"due_date_formula" json NOT NULL,
	"applicable_entity_types" json,
	"turnover_threshold_min" numeric(15, 2),
	"turnover_threshold_max" numeric(15, 2),
	"employee_count_min" integer,
	"employee_count_max" integer,
	"state_specific" boolean DEFAULT false,
	"applicable_states" json,
	"priority_level" text DEFAULT 'medium' NOT NULL,
	"penalty_risk_level" text DEFAULT 'medium' NOT NULL,
	"is_active" boolean DEFAULT true,
	"effective_from" timestamp DEFAULT now(),
	"effective_until" timestamp,
	"version" integer DEFAULT 1,
	"replaces_rule_id" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "compliance_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "compliance_state_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"state" text NOT NULL,
	"risk_score" numeric(5, 2) NOT NULL,
	"penalty_exposure" numeric(12, 2) NOT NULL,
	"overdue_items" integer NOT NULL,
	"snapshot_data" json,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_state_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"rule_name" text NOT NULL,
	"domain" text NOT NULL,
	"applicable_entity_types" json,
	"turnover_min" numeric(15, 2),
	"turnover_max" numeric(15, 2),
	"employee_count_min" integer,
	"requires_gst" boolean DEFAULT false,
	"requires_pf" boolean DEFAULT false,
	"requires_esi" boolean DEFAULT false,
	"state_specific" boolean DEFAULT false,
	"applicable_states" json,
	"frequency" text NOT NULL,
	"due_date_logic" text NOT NULL,
	"grace_days" integer DEFAULT 0,
	"penalty_per_day" numeric(10, 2),
	"max_penalty" numeric(12, 2),
	"criticality_score" integer NOT NULL,
	"amber_threshold_days" integer DEFAULT 7 NOT NULL,
	"red_threshold_days" integer DEFAULT 0 NOT NULL,
	"required_documents" json,
	"depends_on_rules" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_until" timestamp,
	"description" text,
	"help_text" text,
	"reference_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "compliance_state_rules_rule_id_unique" UNIQUE("rule_id")
);
--> statement-breakpoint
CREATE TABLE "compliance_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"overall_state" text NOT NULL,
	"overall_risk_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total_penalty_exposure" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_overdue_items" integer DEFAULT 0 NOT NULL,
	"total_upcoming_items" integer DEFAULT 0 NOT NULL,
	"next_critical_deadline" timestamp,
	"next_critical_action" text,
	"days_until_next_deadline" integer,
	"domain_states" json,
	"requirement_states" json,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"calculation_version" text DEFAULT '1.0.0' NOT NULL,
	"data_completeness_score" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_entity_id" integer,
	"compliance_rule_id" integer,
	"service_id" text NOT NULL,
	"service_type" text,
	"entity_name" text,
	"compliance_type" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"health_score" integer DEFAULT 100,
	"last_completed" timestamp,
	"next_due_date" timestamp,
	"reminders_sent" integer DEFAULT 0,
	"penalty_risk" boolean DEFAULT false,
	"estimated_penalty" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"workflow_stage" text NOT NULL,
	"current_reviewer_id" integer NOT NULL,
	"reviewer_role" text NOT NULL,
	"status" text DEFAULT 'pending',
	"feedback" text,
	"changes_requested" json,
	"requested_at" timestamp DEFAULT now(),
	"response_at" timestamp,
	"deadline" timestamp,
	"escalation_level" integer DEFAULT 0,
	"escalated_to" integer,
	"escalated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_search_index" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"search_vector" text,
	"keywords" text,
	"tags" json DEFAULT '[]'::json,
	"category" text,
	"search_score" numeric(5, 2) DEFAULT '0.00',
	"popularity_score" numeric(5, 2) DEFAULT '0.00',
	"freshness_score" numeric(5, 2) DEFAULT '1.00',
	"last_indexed_at" timestamp DEFAULT now(),
	"content_updated_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "dashboard_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_date" timestamp DEFAULT now(),
	"total_leads" integer DEFAULT 0,
	"converted_leads" integer DEFAULT 0,
	"conversion_rate" numeric(5, 2) DEFAULT '0.00',
	"active_clients" integer DEFAULT 0,
	"services_in_progress" integer DEFAULT 0,
	"services_completed" integer DEFAULT 0,
	"pending_qc_items" integer DEFAULT 0,
	"pending_deliveries" integer DEFAULT 0,
	"employee_utilization" numeric(5, 2) DEFAULT '0.00',
	"average_service_time" integer DEFAULT 0,
	"client_satisfaction_score" numeric(3, 2) DEFAULT '0.00',
	"sla_breaches" integer DEFAULT 0,
	"monthly_recurring_revenue" numeric(12, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "delivery_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"quality_review_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"delivery_method" text NOT NULL,
	"delivered_by" integer NOT NULL,
	"delivered_at" timestamp DEFAULT now(),
	"client_confirmed_at" timestamp,
	"confirmation_method" text,
	"client_signature" text,
	"status" text DEFAULT 'ready_for_delivery' NOT NULL,
	"delivery_notes" text,
	"client_instructions" text,
	"handoff_document" json,
	"deliverables" json NOT NULL,
	"access_instructions" text,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"follow_up_notes" text,
	"satisfaction_rating" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"details" text,
	"metadata" json,
	"ip_address" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_signatories" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"signature_required" text NOT NULL,
	"order" integer DEFAULT 1,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp,
	"signed_at" timestamp,
	"signature_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"signature_number" text NOT NULL,
	"signatory_id" integer,
	"signatory_name" text NOT NULL,
	"signatory_email" text,
	"signatory_role" text,
	"signature_type" text NOT NULL,
	"dsc_certificate_id" text,
	"dsc_serial_number" text,
	"dsc_issuer" text,
	"dsc_valid_from" timestamp,
	"dsc_valid_to" timestamp,
	"signature_image_url" text,
	"signature_data" text,
	"ip_address" text,
	"device_info" text,
	"location" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"signed_at" timestamp,
	"verified_at" timestamp,
	"verified_by" integer,
	"page_number" integer DEFAULT 1,
	"position_x" integer,
	"position_y" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "document_signatures_signature_number_unique" UNIQUE("signature_number")
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_type" text NOT NULL,
	"category" text,
	"file_url" text NOT NULL,
	"version" text DEFAULT '1.0',
	"is_active" boolean DEFAULT true,
	"download_count" integer DEFAULT 0,
	"required_fields" json,
	"instructions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_vault" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_entity_id" integer,
	"service_request_id" integer,
	"document_type" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"file_url" text NOT NULL,
	"version" integer DEFAULT 1,
	"parent_document_id" integer,
	"download_count" integer DEFAULT 0,
	"is_official" boolean DEFAULT false,
	"approval_status" text DEFAULT 'pending',
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"expiry_date" timestamp,
	"reminder_sent" boolean DEFAULT false,
	"tags" json,
	"access_level" text DEFAULT 'private' NOT NULL,
	"encryption_key" text,
	"checksum_hash" text,
	"ocr_data" json,
	"ai_verification_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"last_accessed" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"content_format" text DEFAULT 'html',
	"changes" text,
	"edited_by" integer NOT NULL,
	"edited_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text,
	"service_order_id" integer,
	"service_request_id" integer,
	"entity_id" integer NOT NULL,
	"doctype" text NOT NULL,
	"filename" text NOT NULL,
	"path" text NOT NULL,
	"size_bytes" integer,
	"mime_type" text,
	"uploader" text NOT NULL,
	"status" text DEFAULT 'pending_review',
	"rejection_reason" text,
	"notes" text,
	"review_notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"version" integer DEFAULT 1,
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "documents_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "due_date_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_key" text NOT NULL,
	"jurisdiction" text DEFAULT 'IN',
	"rule_json" text NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"goal_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"priority" text DEFAULT 'medium',
	"target_value" numeric(15, 2),
	"current_value" numeric(15, 2) DEFAULT '0.00',
	"unit" text,
	"start_date" timestamp NOT NULL,
	"target_date" timestamp NOT NULL,
	"status" text DEFAULT 'active',
	"progress" integer DEFAULT 0,
	"milestones" json,
	"resources" json,
	"barriers" text,
	"support_needed" text,
	"manager_id" integer,
	"linked_to_review" integer,
	"measurement_criteria" text,
	"achievement_notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"skill_category" text NOT NULL,
	"skill_name" text NOT NULL,
	"proficiency_level" integer DEFAULT 1 NOT NULL,
	"experience_years" numeric(4, 1) DEFAULT '0.0',
	"last_assessed" timestamp,
	"assessed_by" integer,
	"certification_level" text,
	"is_verified" boolean DEFAULT false,
	"verification_date" timestamp,
	"skill_tags" json,
	"practical_experience" text,
	"development_plan" text,
	"target_proficiency" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enhanced_faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"difficulty" text DEFAULT 'beginner',
	"answer_format" text DEFAULT 'text',
	"video_url" text,
	"related_articles" json DEFAULT '[]'::json,
	"view_count" integer DEFAULT 0,
	"helpful_votes" integer DEFAULT 0,
	"unhelpful_votes" integer DEFAULT 0,
	"avg_rating" numeric(3, 2),
	"tags" json DEFAULT '[]'::json,
	"keywords" text,
	"searchable_content" text,
	"status" text DEFAULT 'published',
	"approved_by" integer,
	"last_reviewed_at" timestamp,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"service_key" text NOT NULL,
	"periodicity_override" text,
	"jurisdiction" text DEFAULT 'IN',
	"meta_json" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "escalation_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"escalation_rule_id" integer NOT NULL,
	"service_request_id" integer NOT NULL,
	"tier_executed" integer NOT NULL,
	"severity" text NOT NULL,
	"actions_executed" json,
	"notifications_sent" json,
	"previous_assignee" integer,
	"new_assignee" integer,
	"reassignment_reason" text,
	"triggered_at" timestamp DEFAULT now(),
	"executed_at" timestamp DEFAULT now(),
	"acknowledged" boolean DEFAULT false,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved" boolean DEFAULT false,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution_notes" text
);
--> statement-breakpoint
CREATE TABLE "escalation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_key" text NOT NULL,
	"rule_name" text NOT NULL,
	"service_key" text,
	"status_code" text,
	"priority" text,
	"trigger_type" text NOT NULL,
	"trigger_hours" integer,
	"trigger_condition" json,
	"escalation_tiers" json,
	"auto_reassign" boolean DEFAULT false,
	"reassign_to_role" text,
	"create_incident" boolean DEFAULT false,
	"notify_client" boolean DEFAULT false,
	"client_notification_template" text,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "escalation_rules_rule_key_unique" UNIQUE("rule_key")
);
--> statement-breakpoint
CREATE TABLE "faq_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_category_id" integer,
	"service_id" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"tags" json,
	"view_count" integer DEFAULT 0,
	"is_helpful" integer DEFAULT 0,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"period_date" timestamp NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0.00',
	"recurring_revenue" numeric(12, 2) DEFAULT '0.00',
	"one_time_revenue" numeric(12, 2) DEFAULT '0.00',
	"upsell_revenue" numeric(12, 2) DEFAULT '0.00',
	"invoices_generated" integer DEFAULT 0,
	"invoices_paid" integer DEFAULT 0,
	"total_invoiced" numeric(12, 2) DEFAULT '0.00',
	"total_collected" numeric(12, 2) DEFAULT '0.00',
	"outstanding_amount" numeric(12, 2) DEFAULT '0.00',
	"new_clients_acquired" integer DEFAULT 0,
	"clients_churned" integer DEFAULT 0,
	"active_clients" integer DEFAULT 0,
	"avg_revenue_per_client" numeric(12, 2) DEFAULT '0.00',
	"services_completed" integer DEFAULT 0,
	"avg_service_value" numeric(12, 2) DEFAULT '0.00',
	"profit_margin" numeric(5, 2) DEFAULT '0.00',
	"collection_efficiency" numeric(5, 2) DEFAULT '0.00',
	"avg_payment_days" integer DEFAULT 0,
	"overdue_rate" numeric(5, 2) DEFAULT '0.00',
	"revenue_growth" numeric(5, 2) DEFAULT '0.00',
	"client_growth" numeric(5, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "government_filings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"entity_id" integer,
	"portal_type" text NOT NULL,
	"filing_type" text NOT NULL,
	"period" text,
	"assessment_year" text,
	"financial_year" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"arn_number" text,
	"acknowledgment_number" text,
	"srn_number" text,
	"due_date" timestamp,
	"submitted_at" timestamp,
	"acknowledged_at" timestamp,
	"filing_data" json,
	"response_data" json,
	"sheet_row_id" text,
	"last_synced_at" timestamp,
	"sync_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "handover_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer,
	"task_id" integer,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"handover_reason" text,
	"handover_notes" text,
	"completed_tasks" json,
	"pending_tasks" json,
	"context_notes" text,
	"handover_date" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"is_accepted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "id_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"year" text NOT NULL,
	"month" text,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"prefix" text NOT NULL,
	"last_generated_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "incentive_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_name" text NOT NULL,
	"description" text,
	"program_type" text NOT NULL,
	"qualification_criteria" json,
	"reward_structure" json,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"participating_agents" json,
	"winners_record" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"portal_type" text NOT NULL,
	"portal_name" text NOT NULL,
	"username" text,
	"api_key" text,
	"client_secret" text,
	"token_data" json,
	"sheet_id" text,
	"service_account_email" text,
	"is_active" boolean DEFAULT true,
	"last_used" timestamp,
	"expires_at" timestamp,
	"auto_refresh" boolean DEFAULT true,
	"refresh_schedule" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"portal_type" text NOT NULL,
	"payload" json NOT NULL,
	"priority" integer DEFAULT 5,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"last_attempt_at" timestamp,
	"next_attempt_at" timestamp,
	"result" json,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "internal_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"content" text NOT NULL,
	"mentions" json,
	"attachments" json,
	"is_private" boolean DEFAULT true,
	"parent_comment_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"client_id" integer NOT NULL,
	"business_entity_id" integer NOT NULL,
	"contract_id" integer,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"billing_period_start" timestamp,
	"billing_period_end" timestamp,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00',
	"discount_amount" numeric(12, 2) DEFAULT '0.00',
	"total_amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0.00',
	"outstanding_amount" numeric(12, 2) NOT NULL,
	"line_items" json NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"paid_at" timestamp,
	"last_reminder_sent" timestamp,
	"reminder_count" integer DEFAULT 0,
	"currency" text DEFAULT 'INR',
	"exchange_rate" numeric(10, 4) DEFAULT '1.0000',
	"notes" text,
	"terms" text,
	"document_path" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "knowledge_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"user_id" integer,
	"session_id" text,
	"event_type" text NOT NULL,
	"search_query" text,
	"referrer" text,
	"time_on_page" integer,
	"user_role" text,
	"device_type" text,
	"ip_address" text,
	"scroll_depth" integer,
	"actions_performed" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'article' NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"meta_description" text,
	"keywords" text,
	"difficulty" text DEFAULT 'beginner',
	"estimated_read_time" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_version" integer,
	"author_id" integer NOT NULL,
	"reviewer_id" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"review_notes" text,
	"view_count" integer DEFAULT 0,
	"helpful_votes" integer DEFAULT 0,
	"unhelpful_votes" integer DEFAULT 0,
	"search_score" numeric(5, 2) DEFAULT '0.00',
	"related_articles" json DEFAULT '[]'::json,
	"prerequisites" json DEFAULT '[]'::json,
	"attachments" json,
	"published_at" timestamp,
	"last_reviewed_at" timestamp,
	"next_review_due" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "knowledge_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" integer,
	"level" integer DEFAULT 1,
	"display_order" integer DEFAULT 0,
	"icon" text,
	"color" text,
	"is_public" boolean DEFAULT true,
	"required_role" text,
	"article_count" integer DEFAULT 0,
	"total_views" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "knowledge_gaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"description" text,
	"category" text,
	"priority" text DEFAULT 'medium',
	"impact_level" text DEFAULT 'medium',
	"effort_estimate" text,
	"identified_by" integer,
	"identification_source" text,
	"related_searches" json DEFAULT '[]'::json,
	"frequency_count" integer DEFAULT 1,
	"status" text DEFAULT 'identified',
	"assigned_to" integer,
	"assigned_at" timestamp,
	"resolved_at" timestamp,
	"resolved_by_article_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_automation" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"automation_type" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"executed_at" timestamp,
	"status" text DEFAULT 'scheduled',
	"message_channel" text,
	"message_content" text,
	"response_received" boolean DEFAULT false,
	"next_action_scheduled" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"agent_id" integer,
	"client_name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text NOT NULL,
	"state" text,
	"entity_type" text,
	"required_services" json,
	"service_interested" text NOT NULL,
	"lead_source" text NOT NULL,
	"pre_sales_executive" text,
	"lead_stage" text DEFAULT 'new',
	"status" text DEFAULT 'new',
	"priority" text DEFAULT 'medium',
	"kyc_documents" json,
	"lead_location" json,
	"estimated_value" numeric(10, 2),
	"conversion_probability" integer,
	"last_contact_date" timestamp,
	"next_followup_date" timestamp,
	"remarks" text,
	"notes" text,
	"interaction_history" json,
	"converted_at" timestamp,
	"closed_at" timestamp,
	"lost_reason" text,
	"assigned_to" integer,
	"transfer_approval_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leads_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "leave_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_number" text NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"from_date" timestamp NOT NULL,
	"to_date" timestamp NOT NULL,
	"total_days" numeric(4, 2) NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'normal',
	"applied_date" timestamp DEFAULT now(),
	"approved_by" integer,
	"approved_date" timestamp,
	"rejection_reason" text,
	"emergency_contact" text,
	"alternate_contact_number" text,
	"address_during_leave" text,
	"work_handover_notes" text,
	"delegated_to" integer,
	"supporting_documents" json,
	"manager_comments" text,
	"hr_comments" text,
	"is_half_day" boolean DEFAULT false,
	"half_day_period" text,
	"leave_balance_after" numeric(4, 2),
	"approval_workflow_status" json,
	"notifications_sent" json,
	"cancelled_by" integer,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leave_applications_application_number_unique" UNIQUE("application_number")
);
--> statement-breakpoint
CREATE TABLE "leave_balance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"total_allocated" numeric(4, 2) NOT NULL,
	"utilized" numeric(4, 2) DEFAULT '0.00',
	"pending" numeric(4, 2) DEFAULT '0.00',
	"available" numeric(4, 2) NOT NULL,
	"carried_forward" numeric(4, 2) DEFAULT '0.00',
	"expired" numeric(4, 2) DEFAULT '0.00',
	"encashed" numeric(4, 2) DEFAULT '0.00',
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_name" text NOT NULL,
	"description" text,
	"max_days_per_year" integer,
	"max_consecutive_days" integer,
	"min_notice_days" integer DEFAULT 1,
	"is_carry_forward" boolean DEFAULT false,
	"max_carry_forward_days" integer,
	"is_paid" boolean DEFAULT true,
	"requires_approval" boolean DEFAULT true,
	"requires_documents" boolean DEFAULT false,
	"applicable_gender" text DEFAULT 'all',
	"minimum_service_months" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"approval_workflow" json,
	"auto_approval_conditions" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leave_types_type_name_unique" UNIQUE("type_name")
);
--> statement-breakpoint
CREATE TABLE "loyalty_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"program_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"points_per_rupee" numeric(5, 2) DEFAULT '0.00',
	"bonus_points_services" json,
	"referral_bonus" integer DEFAULT 0,
	"redemption_threshold" integer DEFAULT 100,
	"redemption_value" numeric(5, 2) DEFAULT '1.00',
	"tiers" json,
	"tier_upgrade_threshold" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "loyalty_programs_program_id_unique" UNIQUE("program_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"file_type" text,
	"file_url" text NOT NULL,
	"file_size" integer,
	"download_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"target_audience" text,
	"last_updated" timestamp DEFAULT now(),
	"uploaded_by" integer,
	"tags" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"service_request_id" integer,
	"sender_id" integer NOT NULL,
	"receiver_id" integer,
	"message_type" text DEFAULT 'text',
	"content" text,
	"attachments" json,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"is_system_message" boolean DEFAULT false,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_key" text NOT NULL,
	"service_request_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"recipient_email" text,
	"recipient_phone" text,
	"channel" text NOT NULL,
	"template_key" text NOT NULL,
	"payload_json" text NOT NULL,
	"dedupe_fingerprint" text,
	"scheduled_at" timestamp NOT NULL,
	"status" text DEFAULT 'QUEUED',
	"error" text,
	"provider_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_key" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"scope_json" text NOT NULL,
	"schedule_json" text,
	"logic_json" text,
	"filters_json" text,
	"channels_json" text NOT NULL,
	"template_key" text NOT NULL,
	"dedupe_window_mins" integer DEFAULT 120,
	"respect_quiet_hours" boolean DEFAULT true,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_rules_rule_key_unique" UNIQUE("rule_key")
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"template_key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"variables" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"category" text DEFAULT 'general',
	"priority" text DEFAULT 'normal',
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"action_url" text,
	"action_text" text,
	"channel_preferences" json,
	"sent_channels" json,
	"metadata" json,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operations_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"assigned_to" integer,
	"assigned_by" integer,
	"task_name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'to_do',
	"priority" text DEFAULT 'medium',
	"estimated_hours" integer,
	"actual_hours" integer,
	"due_date" timestamp,
	"completed_at" timestamp,
	"dependencies" json,
	"is_parallel" boolean DEFAULT true,
	"qa_required" boolean DEFAULT false,
	"qa_status" text DEFAULT 'pending',
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"rework_count" integer DEFAULT 0,
	"internal_notes" text,
	"checklist_completed" json,
	"attachments" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operations_team" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"department" text NOT NULL,
	"role" text NOT NULL,
	"joining_date" timestamp NOT NULL,
	"specialization" json,
	"workload_capacity" integer DEFAULT 10,
	"current_workload" integer DEFAULT 0,
	"performance_rating" numeric(3, 2),
	"target_achievement" numeric(5, 2),
	"manager_id" integer,
	"salary" numeric(10, 2),
	"incentives" numeric(10, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "operations_team_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "operations_team_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ops_knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"service_type" text,
	"tags" json,
	"attachments" json,
	"quick_links" json,
	"view_count" integer DEFAULT 0,
	"last_viewed" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_store" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"otp" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"service_request_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"transaction_id" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "payments_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "performance_dashboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_type" text NOT NULL,
	"period" text NOT NULL,
	"period_date" timestamp NOT NULL,
	"metric_data" json NOT NULL,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"period" text NOT NULL,
	"period_date" timestamp NOT NULL,
	"tasks_completed" integer DEFAULT 0,
	"tasks_on_time" integer DEFAULT 0,
	"tasks_reworked" integer DEFAULT 0,
	"total_hours_worked" integer DEFAULT 0,
	"avg_task_completion_time" integer,
	"sla_compliance_rate" numeric(5, 2),
	"error_rate" numeric(5, 2),
	"service_type_metrics" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"review_period" text NOT NULL,
	"review_type" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'draft',
	"overall_rating" numeric(3, 2),
	"technical_competency" numeric(3, 2),
	"quality_of_work" numeric(3, 2),
	"productivity" numeric(3, 2),
	"communication" numeric(3, 2),
	"teamwork" numeric(3, 2),
	"leadership" numeric(3, 2),
	"innovation" numeric(3, 2),
	"punctuality" numeric(3, 2),
	"achievements" text,
	"strengths_identified" text,
	"areas_for_improvement" text,
	"training_recommendations" json,
	"career_development_plan" text,
	"promotion_readiness" text,
	"previous_goals_achieved" json,
	"new_goals" json,
	"kpi_targets" json,
	"manager_comments" text,
	"employee_self_assessment" text,
	"employee_comments" text,
	"development_discussion" text,
	"salary_recommendation" numeric(10, 2),
	"bonus_recommendation" numeric(10, 2),
	"action_plan" text,
	"follow_up_date" timestamp,
	"submitted_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_sales_management" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"services_availed" json,
	"upsell_opportunity_identified" boolean DEFAULT false,
	"feedback_status" text DEFAULT 'pending',
	"feedback_link" text,
	"feedback_rating" integer,
	"feedback_comments" text,
	"upsell_notes" text,
	"upsell_status" text DEFAULT 'none',
	"compliance_deadlines" json,
	"reconnect_date" timestamp,
	"relationship_notes" text,
	"lifetime_value" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qc_delivery_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"assigned_qc_manager" text,
	"qc_status" text DEFAULT 'pending',
	"delivery_status" text DEFAULT 'pending',
	"client_delivery_date" timestamp,
	"qc_notes" text,
	"delivery_notes" text,
	"client_feedback" text,
	"delivery_method" text,
	"documents_delivered" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_type" text NOT NULL,
	"checklist_name" text NOT NULL,
	"version" text DEFAULT '1.0',
	"checklist_items" json NOT NULL,
	"mandatory_items" json,
	"scoring_criteria" json,
	"approval_threshold" integer DEFAULT 80,
	"escalation_threshold" integer DEFAULT 60,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"category" text,
	"description" text,
	"created_by" integer,
	"approved_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"quality_review_id" integer,
	"time_to_qc" integer,
	"qc_duration" integer,
	"time_to_delivery" integer,
	"total_processing_time" integer,
	"overall_quality_score" integer,
	"document_quality" integer,
	"process_adherence" integer,
	"client_communication" integer,
	"defect_count" integer DEFAULT 0,
	"rework_count" integer DEFAULT 0,
	"escalation_count" integer DEFAULT 0,
	"sla_compliance" boolean DEFAULT true,
	"sla_variance" integer,
	"reviewer_efficiency" integer,
	"first_pass_success" boolean DEFAULT true,
	"client_satisfaction" integer,
	"nps_score" integer,
	"performance_category" text,
	"improvement_areas" json,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" text,
	"service_request_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"quality_score" integer,
	"checklist" json NOT NULL,
	"checklist_completed" boolean DEFAULT false,
	"documents_reviewed" json,
	"document_issues" json,
	"review_notes" text,
	"internal_comments" text,
	"client_facing_notes" text,
	"approval_level" integer DEFAULT 1,
	"approved_by" json,
	"rejection_reason" text,
	"rework_instructions" text,
	"review_started_at" timestamp,
	"review_completed_at" timestamp,
	"sla_deadline" timestamp,
	"issues_found" json,
	"critical_issues" integer DEFAULT 0,
	"minor_issues" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quality_reviews_review_id_unique" UNIQUE("review_id")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"total_referrals" integer DEFAULT 0,
	"successful_referrals" integer DEFAULT 0,
	"total_credits_earned" numeric(12, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referral_code" text NOT NULL,
	"referee_email" text NOT NULL,
	"referee_client_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"credit_amount" numeric(12, 2) DEFAULT '0.00',
	"first_service_amount" numeric(12, 2),
	"credit_percentage" integer DEFAULT 10,
	"is_credited" boolean DEFAULT false,
	"credited_at" timestamp,
	"referred_at" timestamp DEFAULT now(),
	"registered_at" timestamp,
	"onboarded_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "relationship_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"business_entity_id" integer,
	"event_type" text NOT NULL,
	"event_title" text NOT NULL,
	"event_description" text,
	"category" text DEFAULT 'general',
	"sentiment" text DEFAULT 'neutral',
	"importance" text DEFAULT 'medium',
	"service_request_id" integer,
	"trigger_event" text,
	"channel" text DEFAULT 'portal',
	"initiated_by" text DEFAULT 'client',
	"handled_by" integer,
	"participant_ids" json,
	"outcome" text,
	"action_items" json,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"follow_up_completed" boolean DEFAULT false,
	"duration" integer,
	"attachments" json,
	"tags" json,
	"event_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "response_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_code" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"variables" json,
	"usage_count" integer DEFAULT 0,
	"last_used" timestamp,
	"is_active" boolean DEFAULT true,
	"department" text DEFAULT 'customer_service',
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "response_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
CREATE TABLE "retainership_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"monthly_fee" integer NOT NULL,
	"yearly_fee" integer,
	"discount_percentage" integer DEFAULT 0,
	"max_services" integer,
	"included_services" json NOT NULL,
	"features" json NOT NULL,
	"dedicated_support" boolean DEFAULT false,
	"priority_handling" boolean DEFAULT false,
	"custom_reporting" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "retainership_plans_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "sales_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"sales_executive" text NOT NULL,
	"qualified_lead_status" text,
	"proposal_status" text,
	"proposal_amount" numeric(10, 2),
	"required_services" json,
	"next_followup_date" timestamp,
	"interaction_log" json,
	"final_remark" text,
	"documents_link" text,
	"payment_received" text DEFAULT 'pending',
	"payment_pending" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_catalogue" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_code" text NOT NULL,
	"service_name" text NOT NULL,
	"description" text,
	"category" text,
	"documents_required" json,
	"standard_sla_hours" integer DEFAULT 72,
	"estimated_cost" numeric(10, 2),
	"complexity" text DEFAULT 'medium',
	"is_active" boolean DEFAULT true,
	"workflow_template_id" integer,
	"custom_fields" json,
	"dependencies" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_catalogue_service_code_unique" UNIQUE("service_code")
);
--> statement-breakpoint
CREATE TABLE "service_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_definition_id" integer NOT NULL,
	"configuration_name" text NOT NULL,
	"configuration_data" json NOT NULL,
	"pricing_overrides" json,
	"sla_overrides" json,
	"workflow_overrides" json,
	"client_types" json DEFAULT '[]'::json,
	"entity_types" json DEFAULT '[]'::json,
	"jurisdictions" json DEFAULT '["IN"]'::json,
	"version" text DEFAULT '1.0',
	"parent_configuration_id" integer,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"detailed_description" text,
	"category" text NOT NULL,
	"subcategory" text,
	"business_line" text,
	"service_type" text DEFAULT 'standard',
	"base_price" numeric(10, 2),
	"pricing_model" text DEFAULT 'fixed',
	"currency" text DEFAULT 'INR',
	"tax_category" text,
	"discount_eligible" boolean DEFAULT true,
	"is_configurable" boolean DEFAULT false,
	"configuration_schema" json,
	"default_configuration" json,
	"variations" json,
	"average_duration" integer,
	"sla_hours" integer NOT NULL,
	"complexity_level" text DEFAULT 'medium',
	"resource_requirements" json,
	"prerequisites" json DEFAULT '[]'::json,
	"service_dependencies" json DEFAULT '[]'::json,
	"document_requirements" json,
	"client_eligibility" json,
	"workflow_template_id" integer,
	"is_automated" boolean DEFAULT false,
	"automation_level" text DEFAULT 'manual',
	"quality_checklist" json,
	"compliance_requirements" json,
	"deliverables" json,
	"average_rating" numeric(3, 2),
	"completion_rate" numeric(5, 2) DEFAULT '0.00',
	"on_time_delivery_rate" numeric(5, 2) DEFAULT '0.00',
	"client_satisfaction_score" numeric(3, 2),
	"tags" json DEFAULT '[]'::json,
	"keywords" text,
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"last_modified_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_definitions_service_code_unique" UNIQUE("service_code")
);
--> statement-breakpoint
CREATE TABLE "service_doc_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_key" text NOT NULL,
	"doctype" text NOT NULL,
	"label" text NOT NULL,
	"client_uploads" boolean DEFAULT true,
	"versioned" boolean DEFAULT true,
	"is_deliverable" boolean DEFAULT false,
	"is_internal" boolean DEFAULT false,
	"step_key" text,
	"mandatory" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_entity_id" integer,
	"service_id" text NOT NULL,
	"service_name" text NOT NULL,
	"status" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"duration" integer,
	"total_amount" integer,
	"deliverables" json,
	"client_satisfaction" integer,
	"feedback_notes" text,
	"certificates" json,
	"compliance_impact" text,
	"renewal_required" boolean DEFAULT false,
	"next_renewal_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_code" text NOT NULL,
	"metric_date" timestamp NOT NULL,
	"requests_received" integer DEFAULT 0,
	"requests_completed" integer DEFAULT 0,
	"requests_pending" integer DEFAULT 0,
	"requests_cancelled" integer DEFAULT 0,
	"average_completion_time" numeric(8, 2),
	"on_time_delivery_count" integer DEFAULT 0,
	"late_delivery_count" integer DEFAULT 0,
	"sla_breaches" integer DEFAULT 0,
	"quality_score" numeric(5, 2),
	"rework_required" integer DEFAULT 0,
	"client_satisfaction_total" integer DEFAULT 0,
	"client_satisfaction_count" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0.00',
	"average_order_value" numeric(10, 2),
	"total_hours_spent" numeric(8, 2),
	"resource_efficiency" numeric(5, 2),
	"month_over_month_growth" numeric(5, 2),
	"trend_direction" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_request_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"workflow_step_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to" integer,
	"assigned_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_minutes" integer,
	"completed_by" integer,
	"completion_notes" text,
	"checklist_progress" json,
	"collected_documents" json,
	"blocked_reason" text,
	"blocked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" text,
	"user_id" integer,
	"business_entity_id" integer,
	"service_id" text NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"progress" integer DEFAULT 0,
	"current_milestone" text,
	"milestone_history" json,
	"uploaded_docs" json,
	"document_hash" text,
	"signature_data" json,
	"payment_id" text,
	"total_amount" integer NOT NULL,
	"sla_deadline" timestamp,
	"expected_completion" timestamp,
	"actual_completion" timestamp,
	"assigned_team_member" integer,
	"depends_on_service" integer,
	"priority" text DEFAULT 'medium',
	"client_notes" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_requests_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "service_workflow_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_key" text NOT NULL,
	"status_code" text NOT NULL,
	"status_name" text NOT NULL,
	"status_description" text,
	"status_category" text DEFAULT 'process' NOT NULL,
	"is_terminal" boolean DEFAULT false,
	"display_order" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#6b7280',
	"icon" text,
	"auto_progress" boolean DEFAULT false,
	"auto_progress_delay_hours" integer,
	"requires_approval" boolean DEFAULT false,
	"requires_document" boolean DEFAULT false,
	"sla_hours" integer,
	"trigger_tasks" boolean DEFAULT true,
	"trigger_notification" boolean DEFAULT true,
	"default_assignee_role" text,
	"escalate_to_role" text,
	"client_visible" boolean DEFAULT true,
	"client_status_label" text,
	"client_message" text,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_workflow_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_key" text NOT NULL,
	"status_code" text NOT NULL,
	"step_order" integer DEFAULT 0 NOT NULL,
	"step_name" text NOT NULL,
	"step_description" text,
	"step_type" text DEFAULT 'task' NOT NULL,
	"assignee_role" text,
	"assignee_user_id" integer,
	"required_documents" json,
	"required_fields" json,
	"checklist_items" json,
	"estimated_minutes" integer,
	"sla_minutes" integer,
	"depends_on_steps" json,
	"blocks_steps" json,
	"internal_instructions" text,
	"client_instructions" text,
	"can_auto_complete" boolean DEFAULT false,
	"auto_complete_trigger" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"deadline" text,
	"description" text,
	"required_docs" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "services_service_id_unique" UNIQUE("service_id")
);
--> statement-breakpoint
CREATE TABLE "services_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_key" text NOT NULL,
	"name" text NOT NULL,
	"periodicity" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "services_catalog_service_key_unique" UNIQUE("service_key")
);
--> statement-breakpoint
CREATE TABLE "sheet_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"sheet_id" text NOT NULL,
	"sync_direction" text NOT NULL,
	"sync_type" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_succeeded" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"conflicts_detected" integer DEFAULT 0,
	"conflicts_resolved" integer DEFAULT 0,
	"conflict_resolution_strategy" text,
	"last_sync_checkpoint" text,
	"data_checksum" text,
	"error_details" json,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "skills_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"skill_name" text NOT NULL,
	"category" text NOT NULL,
	"sub_category" text,
	"description" text,
	"level_descriptions" json,
	"assessment_criteria" json,
	"related_skills" json,
	"industry_relevance" json,
	"market_demand" text DEFAULT 'medium',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "skills_master_skill_name_unique" UNIQUE("skill_name")
);
--> statement-breakpoint
CREATE TABLE "sla_breach_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"breach_type" text NOT NULL,
	"breach_severity" text NOT NULL,
	"sla_hours" integer NOT NULL,
	"actual_hours" integer NOT NULL,
	"breach_hours" integer NOT NULL,
	"status_at_breach" text NOT NULL,
	"assignee_at_breach" integer,
	"root_cause_category" text,
	"root_cause_details" text,
	"was_client_fault" boolean DEFAULT false,
	"was_external_fault" boolean DEFAULT false,
	"remediation_required" boolean DEFAULT false,
	"remediation_status" text DEFAULT 'pending',
	"remediation_actions" json,
	"client_notified" boolean DEFAULT false,
	"client_notified_at" timestamp,
	"compensation_offered" boolean DEFAULT false,
	"compensation_details" text,
	"breached_at" timestamp DEFAULT now(),
	"reported_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sla_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"approved_by" integer,
	"exception_type" text NOT NULL,
	"reason" text NOT NULL,
	"requested_extension_hours" integer NOT NULL,
	"approved_extension_hours" integer,
	"status" text DEFAULT 'pending',
	"valid_from" timestamp,
	"valid_until" timestamp,
	"approval_notes" text,
	"created_at" timestamp DEFAULT now(),
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sla_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_code" text NOT NULL,
	"task_type" text,
	"standard_hours" integer NOT NULL,
	"escalation_tiers" json,
	"client_notification_hours" integer DEFAULT 24,
	"exception_rules" json,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sla_timers" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"service_code" text NOT NULL,
	"standard_hours" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"paused_at" timestamp,
	"total_paused_minutes" integer DEFAULT 0,
	"pause_reasons" json,
	"status" text DEFAULT 'on_track' NOT NULL,
	"escalation_level" text,
	"last_escalation_at" timestamp,
	"completed_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "smart_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"suggestion_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"suggested_services" json,
	"potential_savings" integer DEFAULT 0,
	"confidence_score" integer DEFAULT 0,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"valid_until" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "state_calculation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"calculation_version" text NOT NULL,
	"calculation_time_ms" integer NOT NULL,
	"rules_applied" integer NOT NULL,
	"previous_state" text,
	"new_state" text NOT NULL,
	"state_changed" boolean DEFAULT false NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"warnings_count" integer DEFAULT 0 NOT NULL,
	"errors" json,
	"warnings" json,
	"triggered_by" text NOT NULL,
	"input_data_hash" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_transition_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"service_key" text NOT NULL,
	"business_entity_id" integer,
	"from_status_code" text,
	"to_status_code" text NOT NULL,
	"from_status_name" text,
	"to_status_name" text NOT NULL,
	"changed_by" integer NOT NULL,
	"changed_by_name" text,
	"changed_by_role" text,
	"changed_at" timestamp DEFAULT now(),
	"transition_reason" text,
	"notes" text,
	"duration_in_previous_status" integer,
	"is_automatic" boolean DEFAULT false,
	"trigger_source" text,
	"was_approval_required" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"tasks_created" json,
	"notifications_sent" json,
	"request_snapshot" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "status_transition_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_key" text NOT NULL,
	"from_status_code" text NOT NULL,
	"to_status_code" text NOT NULL,
	"transition_name" text NOT NULL,
	"transition_description" text,
	"allowed_roles" json,
	"requires_approval" boolean DEFAULT false,
	"approver_roles" json,
	"conditions_json" json,
	"validation_message" text,
	"on_transition_tasks" json,
	"on_transition_notifications" json,
	"on_transition_webhook" text,
	"button_label" text,
	"button_color" text DEFAULT 'primary',
	"confirmation_required" boolean DEFAULT false,
	"confirmation_message" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"client_id" integer NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text,
	"client_phone" text,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" integer,
	"assigned_by" integer,
	"assigned_at" timestamp,
	"sla_status" text DEFAULT 'on_track',
	"first_response_due" timestamp,
	"first_responded_at" timestamp,
	"resolution_due" timestamp,
	"resolution_sla_hours" integer DEFAULT 24,
	"escalation_level" integer DEFAULT 0,
	"escalated_at" timestamp,
	"escalated_to" integer,
	"escalation_reason" text,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"rated_at" timestamp,
	"service_request_id" integer,
	"business_entity_id" integer,
	"source" text DEFAULT 'portal',
	"tags" json,
	"attachments" json,
	"internal_notes" text,
	"resolution" text,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"closed_at" timestamp,
	"closed_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "system_configuration" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" text NOT NULL,
	"config_value" json NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"is_encrypted" boolean DEFAULT false,
	"last_modified_by" integer,
	"last_modified" timestamp DEFAULT now(),
	CONSTRAINT "system_configuration_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "system_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_name" text NOT NULL,
	"api_endpoint" text,
	"auth_type" text,
	"credentials" text,
	"is_active" boolean DEFAULT true,
	"last_sync" timestamp,
	"sync_status" text DEFAULT 'healthy',
	"error_details" text,
	"rate_limits" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_type" text NOT NULL,
	"trigger_conditions" json,
	"recipients" json,
	"channels" json,
	"message_template" text,
	"is_active" boolean DEFAULT true,
	"priority" text DEFAULT 'medium',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"field_changed" text,
	"old_value" text,
	"new_value" text,
	"comment" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"assigned_to" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"assignment_type" text DEFAULT 'manual',
	"priority" text DEFAULT 'medium',
	"estimated_workload" integer,
	"assignment_notes" text,
	"assigned_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"is_accepted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"depends_on_task_id" integer NOT NULL,
	"dependency_type" text DEFAULT 'blocks',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"service_request_id" integer NOT NULL,
	"task_instance_id" text NOT NULL,
	"execution_context" json,
	"input_data" json,
	"output_data" json,
	"status" text DEFAULT 'pending',
	"progress" integer DEFAULT 0,
	"current_step" text,
	"assigned_to" integer,
	"assigned_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"quality_checks_passed" json,
	"validation_errors" json,
	"review_required" boolean DEFAULT false,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"actual_duration" integer,
	"effort_spent" numeric(6, 2),
	"resources_used" json,
	"issues_encountered" json,
	"resolution_notes" text,
	"escalation_level" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "task_executions_task_instance_id_unique" UNIQUE("task_instance_id")
);
--> statement-breakpoint
CREATE TABLE "task_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"task_type" text NOT NULL,
	"initiator_id" integer NOT NULL,
	"assignee_id" integer,
	"assignee_role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"progress" integer DEFAULT 0,
	"due_date" timestamp,
	"start_date" timestamp,
	"completed_at" timestamp,
	"estimated_hours" integer,
	"actual_hours" integer,
	"requires_approval" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"requires_checklist" boolean DEFAULT false,
	"checklist" json,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" text,
	"next_occurrence" timestamp,
	"service_request_id" integer,
	"business_entity_id" integer,
	"parent_task_id" integer,
	"template_id" integer,
	"tags" json,
	"attachments" json,
	"metadata" json,
	"reopen_count" integer DEFAULT 0,
	"last_reminder_sent" timestamp,
	"reminder_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "task_items_task_number_unique" UNIQUE("task_number")
);
--> statement-breakpoint
CREATE TABLE "task_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"notify_on_update" boolean DEFAULT true,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"reminder_type" text NOT NULL,
	"days_offset" integer,
	"reminder_time" timestamp,
	"sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"channels" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_task_id" integer NOT NULL,
	"child_task_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"template_name" text NOT NULL,
	"task_list" json NOT NULL,
	"default_deadlines" json,
	"qa_required" boolean DEFAULT false,
	"instructions" text,
	"required_documents" json,
	"checklist_items" json,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" text NOT NULL,
	"team_lead" integer,
	"metric_period" text NOT NULL,
	"period_date" timestamp NOT NULL,
	"team_size" integer NOT NULL,
	"average_experience" numeric(4, 2),
	"total_capacity" integer,
	"total_utilization" numeric(5, 2),
	"average_performance" numeric(3, 2),
	"turnover_rate" numeric(5, 2),
	"absenteeism_rate" numeric(5, 2),
	"training_hours" integer DEFAULT 0,
	"skills_gap_index" numeric(3, 2),
	"team_satisfaction" numeric(3, 2),
	"collaboration_score" numeric(3, 2),
	"innovation_index" numeric(3, 2),
	"cost_per_employee" numeric(10, 2),
	"revenue_per_employee" numeric(10, 2),
	"customer_satisfaction_impact" numeric(3, 2),
	"key_insights" json,
	"recommended_actions" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"assigned_from" integer,
	"assigned_to" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"message" text NOT NULL,
	"message_type" text DEFAULT 'reply',
	"author_id" integer NOT NULL,
	"author_name" text NOT NULL,
	"author_role" text NOT NULL,
	"is_internal" boolean DEFAULT false,
	"attachments" json,
	"template_used" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"enrollment_date" timestamp DEFAULT now(),
	"start_date" timestamp,
	"completion_date" timestamp,
	"status" text DEFAULT 'enrolled' NOT NULL,
	"progress" integer DEFAULT 0,
	"attendance_rate" numeric(5, 2),
	"assessment_score" numeric(5, 2),
	"passing_score" numeric(5, 2) DEFAULT '70.00',
	"attempts" integer DEFAULT 1,
	"feedback" text,
	"instructor_notes" text,
	"certification_issued" boolean DEFAULT false,
	"certification_number" text,
	"certification_expiry_date" timestamp,
	"skills_gained" json,
	"post_training_assessment" json,
	"is_priority" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"level" text NOT NULL,
	"duration" integer NOT NULL,
	"format" text NOT NULL,
	"provider" text,
	"cost" numeric(10, 2) DEFAULT '0.00',
	"max_participants" integer,
	"prerequisites" json,
	"learning_objectives" json,
	"curriculum" json,
	"assessment_method" text,
	"certification_offered" boolean DEFAULT false,
	"certification_validity_months" integer,
	"target_skills" json,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "training_programs_program_code_unique" UNIQUE("program_code")
);
--> statement-breakpoint
CREATE TABLE "upsell_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"business_entity_id" integer NOT NULL,
	"opportunity_type" text NOT NULL,
	"suggested_services" json NOT NULL,
	"current_services" json,
	"confidence_score" integer DEFAULT 0,
	"priority" text DEFAULT 'medium',
	"potential_revenue" numeric(10, 2) DEFAULT '0.00',
	"trigger_event" text,
	"trigger_data" json,
	"identified_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'identified',
	"contact_attempts" integer DEFAULT 0,
	"last_contact_date" timestamp,
	"next_follow_up_date" timestamp,
	"proposal_sent" boolean DEFAULT false,
	"proposal_sent_date" timestamp,
	"proposal_value" numeric(10, 2) DEFAULT '0.00',
	"proposal_id" integer,
	"conversion_date" timestamp,
	"actual_revenue" numeric(10, 2) DEFAULT '0.00',
	"lost_reason" text,
	"automated_follow_up" boolean DEFAULT true,
	"max_follow_up_attempts" integer DEFAULT 3,
	"assigned_to" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_retainership_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"next_billing_date" timestamp,
	"services_used" integer DEFAULT 0,
	"total_savings" integer DEFAULT 0,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"fingerprint" text,
	"csrf_token" text,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_activity" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "user_task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"task_type" text NOT NULL,
	"default_assignee_role" text,
	"default_priority" text DEFAULT 'medium',
	"default_duration_hours" integer,
	"requires_approval" boolean DEFAULT false,
	"checklist" json,
	"tags" json,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"full_name" text,
	"role" text DEFAULT 'client' NOT NULL,
	"department" text,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"two_factor_secret" text,
	"is_two_factor_enabled" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0.00',
	"total_earned" numeric(12, 2) DEFAULT '0.00',
	"total_spent" numeric(12, 2) DEFAULT '0.00',
	"total_referral_earnings" numeric(12, 2) DEFAULT '0.00',
	"lifetime_referrals" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallet_credits_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_before" numeric(12, 2),
	"balance_after" numeric(12, 2),
	"description" text NOT NULL,
	"related_referral_id" integer,
	"related_service_request_id" integer,
	"related_invoice_id" integer,
	"metadata" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_item_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_item_queue_id" integer NOT NULL,
	"service_request_id" integer,
	"activity_type" text NOT NULL,
	"activity_description" text NOT NULL,
	"previous_value" json,
	"new_value" json,
	"performed_by" integer,
	"performed_by_name" text,
	"performed_by_role" text,
	"is_system_generated" boolean DEFAULT false,
	"trigger_source" text,
	"occurred_at" timestamp DEFAULT now(),
	"client_visible" boolean DEFAULT false,
	"client_message" text
);
--> statement-breakpoint
CREATE TABLE "work_item_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_item_type" text NOT NULL,
	"reference_id" integer NOT NULL,
	"service_request_id" integer,
	"service_key" text,
	"entity_id" integer,
	"entity_name" text,
	"current_status" text NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"assigned_to" integer,
	"assigned_to_name" text,
	"assigned_to_role" text,
	"sla_deadline" timestamp,
	"sla_status" text DEFAULT 'on_track',
	"sla_hours_remaining" integer,
	"escalation_level" integer DEFAULT 0,
	"last_escalated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"last_activity_at" timestamp DEFAULT now(),
	"age_hours" integer DEFAULT 0,
	"client_visible" boolean DEFAULT false,
	"client_status_label" text,
	"due_date" timestamp,
	"service_type_name" text,
	"period_label" text
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"workflow_template_id" integer NOT NULL,
	"current_step" integer DEFAULT 0,
	"execution_data" json,
	"bottleneck_detected" boolean DEFAULT false,
	"average_step_time" json,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"status" text DEFAULT 'in_progress'
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" text NOT NULL,
	"service_code" text NOT NULL,
	"workflow_steps" json NOT NULL,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"global_template" boolean DEFAULT true,
	"custom_forms" json,
	"approval_nodes" json,
	"escalation_rules" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_templates_admin" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"template_json" text NOT NULL,
	"is_published" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workload_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"metric_date" timestamp NOT NULL,
	"total_capacity" integer NOT NULL,
	"allocated_hours" integer DEFAULT 0,
	"actual_hours" integer DEFAULT 0,
	"utilization_rate" numeric(5, 2),
	"overload_indicator" boolean DEFAULT false,
	"burnout_risk" text DEFAULT 'low',
	"active_projects" integer DEFAULT 0,
	"average_task_complexity" numeric(3, 2),
	"stress_level" integer,
	"work_life_balance" integer,
	"overtime_hours" integer DEFAULT 0,
	"breaks_taken" integer DEFAULT 0,
	"focus_time_hours" numeric(4, 2),
	"meeting_hours" numeric(4, 2),
	"interruption_count" integer DEFAULT 0,
	"productivity_score" numeric(3, 2),
	"quality_score" numeric(3, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "access_restrictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"user_id" integer,
	"restriction_type" varchar(50) NOT NULL,
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "access_review_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"current_role" varchar(50),
	"current_permissions" jsonb,
	"access_history" jsonb,
	"decision" varchar(20),
	"new_role" varchar(50),
	"new_permissions" jsonb,
	"comments" text,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "access_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"review_period_start" date NOT NULL,
	"review_period_end" date NOT NULL,
	"review_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"reviewer_id" integer,
	"due_date" date,
	"completed_at" timestamp,
	"summary" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"recommendation_type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"recommendation" text NOT NULL,
	"reasoning" text,
	"confidence" numeric(3, 2),
	"priority" varchar(20) DEFAULT 'medium',
	"action_url" text,
	"is_dismissed" boolean DEFAULT false,
	"dismissed_at" timestamp,
	"dismiss_reason" varchar(100),
	"is_acted_upon" boolean DEFAULT false,
	"acted_upon_at" timestamp,
	"outcome" varchar(50),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 60,
	"rate_limit_per_day" integer DEFAULT 10000,
	"allowed_ips" jsonb,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	"revoked_by" integer
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"api_key_id" integer,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"request_body" jsonb,
	"response_status" integer,
	"response_time_ms" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_name" varchar(200) NOT NULL,
	"account_number" varchar(50),
	"bank_name" varchar(200),
	"ifsc_code" varchar(20),
	"branch" varchar(200),
	"account_id" integer,
	"opening_balance" numeric(15, 2) DEFAULT '0',
	"current_balance" numeric(15, 2) DEFAULT '0',
	"last_reconciled_date" date,
	"last_reconciled_balance" numeric(15, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_account_id" integer NOT NULL,
	"transaction_date" date NOT NULL,
	"value_date" date,
	"description" text,
	"reference" varchar(100),
	"debit_amount" numeric(15, 2) DEFAULT '0',
	"credit_amount" numeric(15, 2) DEFAULT '0',
	"balance" numeric(15, 2),
	"is_reconciled" boolean DEFAULT false,
	"reconciled_with_type" varchar(50),
	"reconciled_with_id" integer,
	"reconciled_at" timestamp,
	"reconciled_by" integer,
	"imported_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_code" varchar(20) NOT NULL,
	"account_name" varchar(200) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"parent_account_id" integer,
	"description" text,
	"currency" varchar(3) DEFAULT 'INR',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_churn_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"risk_score" numeric(5, 2) NOT NULL,
	"risk_level" varchar(20),
	"risk_factors" jsonb,
	"recommended_actions" jsonb,
	"model_version" varchar(20),
	"previous_score" numeric(5, 2),
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communication_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"subject" varchar(500),
	"participant_ids" jsonb NOT NULL,
	"last_message_at" timestamp,
	"message_count" integer DEFAULT 0,
	"unread_count" jsonb DEFAULT '{}'::jsonb,
	"is_closed" boolean DEFAULT false,
	"closed_at" timestamp,
	"closed_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_dashboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"user_id" integer,
	"name" varchar(200) NOT NULL,
	"description" text,
	"layout" jsonb NOT NULL,
	"widgets" jsonb NOT NULL,
	"refresh_interval" integer DEFAULT 300,
	"is_default" boolean DEFAULT false,
	"is_shared" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"report_type" varchar(50) NOT NULL,
	"data_source" varchar(100) NOT NULL,
	"columns" jsonb NOT NULL,
	"filters" jsonb,
	"grouping" jsonb,
	"sorting" jsonb,
	"chart_config" jsonb,
	"is_shared" boolean DEFAULT false,
	"shared_with" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_engagement_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_category" varchar(50),
	"event_data" jsonb,
	"session_id" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_health_scores_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"entity_id" integer,
	"overall_score" numeric(5, 2) NOT NULL,
	"engagement_score" numeric(5, 2),
	"compliance_score" numeric(5, 2),
	"payment_score" numeric(5, 2),
	"support_score" numeric(5, 2),
	"product_usage_score" numeric(5, 2),
	"trend" varchar(20),
	"risk_level" varchar(20),
	"factors" jsonb,
	"recommendations" jsonb,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_classifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"classification" varchar(50) NOT NULL,
	"handling_requirements" text,
	"retention_days" integer,
	"encryption_required" boolean DEFAULT false,
	"masking_required" boolean DEFAULT false,
	"masking_pattern" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_deletion_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"requested_by" integer,
	"subject_email" varchar(255) NOT NULL,
	"subject_name" varchar(255),
	"request_type" varchar(50) NOT NULL,
	"scope" jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"verification_token" varchar(255),
	"verified_at" timestamp,
	"processing_started_at" timestamp,
	"completed_at" timestamp,
	"rejection_reason" text,
	"export_url" text,
	"export_expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version_id" integer,
	"user_id" integer NOT NULL,
	"annotation_type" varchar(50) NOT NULL,
	"content" text,
	"position" jsonb,
	"color" varchar(7),
	"is_resolved" boolean DEFAULT false,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_extractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"extraction_type" varchar(50),
	"extracted_data" jsonb NOT NULL,
	"confidence" numeric(3, 2),
	"status" varchar(20) DEFAULT 'pending',
	"verified_by" integer,
	"verified_at" timestamp,
	"corrections" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_generation_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"entity_type" varchar(50),
	"entity_id" integer,
	"variables_data" jsonb NOT NULL,
	"generated_document_id" integer,
	"status" varchar(20) DEFAULT 'pending',
	"error_message" text,
	"requested_by" integer,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "document_retention_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"document_category" varchar(100),
	"retention_days" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"notify_days_before_action" integer DEFAULT 30,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_search_index" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"content_text" text NOT NULL,
	"extracted_entities" jsonb,
	"language" varchar(10) DEFAULT 'english',
	"ocr_confidence" numeric(5, 2),
	"indexed_at" timestamp DEFAULT now(),
	CONSTRAINT "document_search_index_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "document_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"share_type" varchar(20) NOT NULL,
	"shared_with_user_id" integer,
	"shared_with_email" varchar(255),
	"access_level" varchar(20) NOT NULL,
	"share_token" varchar(255),
	"expires_at" timestamp,
	"password_hash" varchar(255),
	"access_count" integer DEFAULT 0,
	"last_accessed_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	CONSTRAINT "document_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "document_templates_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"category" varchar(100),
	"template_type" varchar(50) NOT NULL,
	"template_content" text NOT NULL,
	"variables" jsonb,
	"preview_image" text,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate" numeric(10, 6) NOT NULL,
	"effective_date" date NOT NULL,
	"source" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "field_security_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"role_level" integer NOT NULL,
	"access_type" varchar(20) NOT NULL,
	"conditions" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "immutable_audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"log_hash" varchar(64) NOT NULL,
	"previous_hash" varchar(64),
	"tenant_id" uuid,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(100),
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(100),
	"request_id" varchar(100),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50),
	"config_schema" jsonb NOT NULL,
	"default_config" jsonb,
	"auth_type" varchar(50),
	"documentation_url" text,
	"icon_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_number" varchar(50) NOT NULL,
	"entry_date" date NOT NULL,
	"description" text,
	"reference_type" varchar(50),
	"reference_id" integer,
	"status" varchar(20) DEFAULT 'draft',
	"total_debit" numeric(15, 2) DEFAULT '0',
	"total_credit" numeric(15, 2) DEFAULT '0',
	"created_by" integer,
	"posted_by" integer,
	"posted_at" timestamp,
	"reversed_by" integer,
	"reversed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit_amount" numeric(15, 2) DEFAULT '0',
	"credit_amount" numeric(15, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'INR',
	"exchange_rate" numeric(10, 6) DEFAULT '1',
	"base_debit_amount" numeric(15, 2) DEFAULT '0',
	"base_credit_amount" numeric(15, 2) DEFAULT '0',
	"narration" text
);
--> statement-breakpoint
CREATE TABLE "kanban_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"columns" jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kpi_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"kpi_id" integer NOT NULL,
	"tenant_id" uuid,
	"alert_type" varchar(20) NOT NULL,
	"current_value" numeric(15, 2) NOT NULL,
	"threshold_value" numeric(15, 2) NOT NULL,
	"message" text,
	"is_acknowledged" boolean DEFAULT false,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kpi_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(50),
	"calculation_query" text NOT NULL,
	"unit" varchar(50),
	"target_value" numeric(15, 2),
	"warning_threshold" numeric(15, 2),
	"critical_threshold" numeric(15, 2),
	"threshold_direction" varchar(10) DEFAULT 'above',
	"refresh_interval_minutes" integer DEFAULT 60,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kpi_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kpi_id" integer NOT NULL,
	"tenant_id" uuid,
	"value" numeric(15, 2) NOT NULL,
	"metadata" jsonb,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"factors" jsonb,
	"model_version" varchar(20),
	"previous_score" numeric(5, 2),
	"score_delta" numeric(5, 2),
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ml_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"version" varchar(20) NOT NULL,
	"description" text,
	"config" jsonb,
	"metrics" jsonb,
	"feature_importance" jsonb,
	"is_active" boolean DEFAULT false,
	"trained_at" timestamp,
	"training_data_size" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_type" varchar(100) NOT NULL,
	"email_enabled" boolean DEFAULT true,
	"sms_enabled" boolean DEFAULT false,
	"whatsapp_enabled" boolean DEFAULT false,
	"push_enabled" boolean DEFAULT true,
	"in_app_enabled" boolean DEFAULT true,
	"frequency" varchar(20) DEFAULT 'immediate',
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"quiet_hours_timezone" varchar(50) DEFAULT 'Asia/Kolkata',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_queue" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"user_id" integer,
	"notification_type" varchar(100) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"template_id" integer,
	"template_data" jsonb,
	"priority" varchar(20) DEFAULT 'normal',
	"status" varchar(20) DEFAULT 'pending',
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"external_id" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nps_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"client_id" integer NOT NULL,
	"score" integer NOT NULL,
	"category" varchar(20),
	"feedback" text,
	"touchpoint" varchar(100),
	"service_request_id" integer,
	"follow_up_status" varchar(20) DEFAULT 'pending',
	"follow_up_notes" text,
	"follow_up_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "playbook_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"playbook_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"current_stage" integer DEFAULT 1,
	"stage_progress" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'active',
	"assigned_to" integer,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"paused_at" timestamp,
	"pause_reason" text
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"target_date" date,
	"completed_date" date,
	"status" varchar(20) DEFAULT 'pending',
	"sequence_order" integer,
	"deliverables" jsonb
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"milestone_id" integer,
	"parent_task_id" integer,
	"task_id" varchar(50) NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"assignee_id" integer,
	"start_date" date,
	"due_date" date,
	"completed_date" date,
	"estimated_hours" numeric(10, 2),
	"actual_hours" numeric(10, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'todo',
	"priority" varchar(20) DEFAULT 'medium',
	"labels" jsonb DEFAULT '[]'::jsonb,
	"dependencies" jsonb DEFAULT '[]'::jsonb,
	"blocked_reason" text,
	"sequence_order" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"project_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"client_id" integer,
	"entity_id" integer,
	"project_manager_id" integer,
	"start_date" date,
	"target_end_date" date,
	"actual_end_date" date,
	"budget_hours" numeric(10, 2),
	"budget_amount" numeric(15, 2),
	"actual_hours" numeric(10, 2) DEFAULT '0',
	"actual_amount" numeric(15, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'planning',
	"priority" varchar(20) DEFAULT 'medium',
	"template_id" integer,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "renewal_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"client_id" integer NOT NULL,
	"entity_id" integer,
	"contract_type" varchar(50),
	"current_value" numeric(15, 2),
	"renewal_value" numeric(15, 2),
	"renewal_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'upcoming',
	"probability" integer,
	"risk_factors" jsonb,
	"owner_id" integer,
	"notes" text,
	"renewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"schedule_type" varchar(20) NOT NULL,
	"schedule_config" jsonb NOT NULL,
	"recipients" jsonb NOT NULL,
	"format" varchar(20) DEFAULT 'pdf',
	"include_filters" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"last_run_at" timestamp,
	"last_run_status" varchar(20),
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"allocation_percentage" numeric(5, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"role" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"incident_id" varchar(50) NOT NULL,
	"incident_type" varchar(100) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"affected_users" jsonb,
	"affected_data" jsonb,
	"affected_systems" jsonb,
	"detection_method" varchar(100),
	"containment_actions" text,
	"eradication_actions" text,
	"recovery_actions" text,
	"lessons_learned" text,
	"status" varchar(20) DEFAULT 'open',
	"assigned_to" integer,
	"detected_at" timestamp NOT NULL,
	"contained_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "security_incidents_incident_id_unique" UNIQUE("incident_id")
);
--> statement-breakpoint
CREATE TABLE "session_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(100) NOT NULL,
	"session_timeout_minutes" integer DEFAULT 60,
	"max_concurrent_sessions" integer DEFAULT 5,
	"require_mfa" boolean DEFAULT false,
	"mfa_methods" jsonb DEFAULT '["totp"]'::jsonb,
	"trusted_devices_enabled" boolean DEFAULT true,
	"trusted_device_expiry_days" integer DEFAULT 30,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "success_playbooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_conditions" jsonb NOT NULL,
	"stages" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tax_type" varchar(50) NOT NULL,
	"tax_code" varchar(20) NOT NULL,
	"tax_name" varchar(100) NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"account_id" integer,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"tax_config_id" integer,
	"base_amount" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" integer,
	"period_month" integer,
	"period_year" integer,
	"filing_status" varchar(20) DEFAULT 'pending',
	"filed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" integer,
	"name" varchar(200) NOT NULL,
	"config" jsonb NOT NULL,
	"credentials_encrypted" text,
	"status" varchar(20) DEFAULT 'active',
	"last_sync_at" timestamp,
	"last_sync_status" varchar(20),
	"last_sync_error" text,
	"sync_frequency_minutes" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"token" varchar(255) NOT NULL,
	"invited_by" integer,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"domain" varchar(255),
	"logo_url" text,
	"primary_color" varchar(7) DEFAULT '#1e40af',
	"secondary_color" varchar(7) DEFAULT '#3b82f6',
	"favicon_url" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"features" jsonb DEFAULT '{}'::jsonb,
	"billing_plan" varchar(50) DEFAULT 'starter',
	"billing_email" varchar(255),
	"stripe_customer_id" varchar(255),
	"subscription_status" varchar(20) DEFAULT 'active',
	"max_users" integer DEFAULT 10,
	"max_entities" integer DEFAULT 5,
	"max_storage_gb" integer DEFAULT 10,
	"current_storage_bytes" bigserial DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"suspended_at" timestamp,
	"suspended_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"sender_id" integer,
	"message_type" varchar(20) NOT NULL,
	"content" text,
	"attachments" jsonb,
	"template_id" integer,
	"is_internal" boolean DEFAULT false,
	"read_by" jsonb DEFAULT '[]'::jsonb,
	"edited_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"project_id" integer,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"description" text,
	"billable" boolean DEFAULT true,
	"billed_at" timestamp,
	"invoice_id" integer,
	"approved" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_permission_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"permission_code" varchar(100) NOT NULL,
	"granted" boolean NOT NULL,
	"expires_at" timestamp,
	"granted_by" integer,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint_id" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_id" varchar(100),
	"payload" jsonb NOT NULL,
	"response_status" integer,
	"response_body" text,
	"response_time_ms" integer,
	"attempt_count" integer DEFAULT 1,
	"next_retry_at" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(255),
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"headers" jsonb,
	"retry_policy" jsonb DEFAULT '{"maxRetries":3,"backoffMultiplier":2}'::jsonb,
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "access_restrictions" ADD CONSTRAINT "access_restrictions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_restrictions" ADD CONSTRAINT "access_restrictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_review_items" ADD CONSTRAINT "access_review_items_review_id_access_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."access_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_review_items" ADD CONSTRAINT "access_review_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_reviews" ADD CONSTRAINT "access_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_reviews" ADD CONSTRAINT "access_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("parent_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_churn_scores" ADD CONSTRAINT "client_churn_scores_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_dashboards" ADD CONSTRAINT "custom_dashboards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_dashboards" ADD CONSTRAINT "custom_dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_reports" ADD CONSTRAINT "custom_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_reports" ADD CONSTRAINT "custom_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_engagement_events" ADD CONSTRAINT "customer_engagement_events_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health_scores_v2" ADD CONSTRAINT "customer_health_scores_v2_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health_scores_v2" ADD CONSTRAINT "customer_health_scores_v2_entity_id_business_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_generation_jobs" ADD CONSTRAINT "document_generation_jobs_template_id_document_templates_v2_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_generation_jobs" ADD CONSTRAINT "document_generation_jobs_generated_document_id_documents_id_fk" FOREIGN KEY ("generated_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_generation_jobs" ADD CONSTRAINT "document_generation_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_retention_policies" ADD CONSTRAINT "document_retention_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_search_index" ADD CONSTRAINT "document_search_index_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates_v2" ADD CONSTRAINT "document_templates_v2_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates_v2" ADD CONSTRAINT "document_templates_v2_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_security_rules" ADD CONSTRAINT "field_security_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immutable_audit_log" ADD CONSTRAINT "immutable_audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immutable_audit_log" ADD CONSTRAINT "immutable_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_boards" ADD CONSTRAINT "kanban_boards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_boards" ADD CONSTRAINT "kanban_boards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_alerts" ADD CONSTRAINT "kpi_alerts_kpi_id_kpi_definitions_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpi_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_alerts" ADD CONSTRAINT "kpi_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_alerts" ADD CONSTRAINT "kpi_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_definitions" ADD CONSTRAINT "kpi_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_kpi_id_kpi_definitions_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpi_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_follow_up_by_users_id_fk" FOREIGN KEY ("follow_up_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_groups" ADD CONSTRAINT "permission_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_groups" ADD CONSTRAINT "permission_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_executions" ADD CONSTRAINT "playbook_executions_playbook_id_success_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."success_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_executions" ADD CONSTRAINT "playbook_executions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_executions" ADD CONSTRAINT "playbook_executions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_parent_task_id_project_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."project_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_entity_id_business_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_id_users_id_fk" FOREIGN KEY ("project_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_opportunities" ADD CONSTRAINT "renewal_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_opportunities" ADD CONSTRAINT "renewal_opportunities_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_opportunities" ADD CONSTRAINT "renewal_opportunities_entity_id_business_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_opportunities" ADD CONSTRAINT "renewal_opportunities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_report_id_custom_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."custom_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_policies" ADD CONSTRAINT "session_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_playbooks" ADD CONSTRAINT "success_playbooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_playbooks" ADD CONSTRAINT "success_playbooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_configurations" ADD CONSTRAINT "tax_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_configurations" ADD CONSTRAINT "tax_configurations_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_tax_config_id_tax_configurations_id_fk" FOREIGN KEY ("tax_config_id") REFERENCES "public"."tax_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_template_id_integration_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."integration_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_thread_id_communication_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."communication_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_project_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_user" ON "ai_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_entity" ON "ai_recommendations" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_api_keys_tenant" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_api_usage_api_key" ON "api_usage_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "idx_api_usage_created" ON "api_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_coa_tenant_code" ON "chart_of_accounts" USING btree ("tenant_id","account_code");--> statement-breakpoint
CREATE INDEX "idx_churn_scores_client" ON "client_churn_scores" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_churn_scores_risk" ON "client_churn_scores" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_comm_threads_entity" ON "communication_threads" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_engagement_events_client" ON "customer_engagement_events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_engagement_events_type" ON "customer_engagement_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_engagement_events_time" ON "customer_engagement_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_customer_health_client" ON "customer_health_scores_v2" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_customer_health_risk" ON "customer_health_scores_v2" USING btree ("risk_level");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_data_class_entity_field" ON "data_classifications" USING btree ("entity_type","field_name");--> statement-breakpoint
CREATE INDEX "idx_doc_annotations_document" ON "document_annotations" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_currency_date" ON "exchange_rates" USING btree ("from_currency","to_currency","effective_date");--> statement-breakpoint
CREATE INDEX "idx_immutable_audit_hash" ON "immutable_audit_log" USING btree ("log_hash");--> statement-breakpoint
CREATE INDEX "idx_immutable_audit_entity" ON "immutable_audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_immutable_audit_user" ON "immutable_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_immutable_audit_time" ON "immutable_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_kpi_values_kpi" ON "kpi_values" USING btree ("kpi_id");--> statement-breakpoint
CREATE INDEX "idx_kpi_values_time" ON "kpi_values" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "idx_lead_scores_lead" ON "lead_scores" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notification_prefs_user_type" ON "notification_preferences" USING btree ("user_id","notification_type");--> statement-breakpoint
CREATE INDEX "idx_notification_queue_status" ON "notification_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notification_queue_user" ON "notification_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_queue_scheduled" ON "notification_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_tax_transactions_period" ON "tax_transactions" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenants_slug" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_tenants_domain" ON "tenants" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_thread_messages_thread" ON "thread_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_user_perm_overrides_user" ON "user_permission_overrides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_endpoint" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_status" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_retry" ON "webhook_deliveries" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_endpoints_tenant" ON "webhook_endpoints" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_endpoints_active" ON "webhook_endpoints" USING btree ("is_active");