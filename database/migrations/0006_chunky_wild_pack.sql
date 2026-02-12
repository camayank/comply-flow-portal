CREATE TABLE "workflow_automation_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_rule_id" integer,
	"workflow_name" text,
	"trigger" text NOT NULL,
	"entity_id" integer,
	"status" text DEFAULT 'success',
	"actions_executed" integer DEFAULT 0,
	"executed_at" timestamp DEFAULT now(),
	"details" json
);
--> statement-breakpoint
CREATE TABLE "workflow_automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"conditions" json,
	"actions" json NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
