ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_reason_id_movement_reasons_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reason_id_movement_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "public"."movement_reasons"("id") ON DELETE set null ON UPDATE no action;