-- Migration: Create remaining super admin tables (tenants, security_incidents)
-- Note: The tenants table here uses serial ID to match the foreign key in pricing_rules

CREATE TABLE IF NOT EXISTS "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'trial',
	"plan" text DEFAULT 'starter',
	"settings" json,
	"limits" json,
	"billing_info" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_number" text NOT NULL,
	"severity" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'open',
	"title" text NOT NULL,
	"description" text,
	"affected_users" json,
	"affected_tenants" json,
	"timeline" json,
	"investigation" json,
	"root_cause" text,
	"resolution" text,
	"lessons_learned" text,
	"reported_by" integer,
	"assigned_to" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"closed_at" timestamp,
	CONSTRAINT "security_incidents_incident_number_unique" UNIQUE("incident_number")
);
--> statement-breakpoint
-- Add foreign key constraints for security_incidents
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Add missing foreign key for pricing_rules
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Create indexes for tenants table
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tenants_slug" ON "tenants" ("slug");
CREATE INDEX IF NOT EXISTS "idx_tenants_status" ON "tenants" ("status");
