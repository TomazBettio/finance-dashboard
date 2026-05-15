CREATE TABLE "movement_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "movement_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_movements" RENAME COLUMN "reason" TO "reason_id";--> statement-breakpoint
ALTER TABLE "movement_reasons" ADD CONSTRAINT "movement_reasons_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reason_id_movement_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "public"."movement_reasons"("id") ON DELETE no action ON UPDATE no action;