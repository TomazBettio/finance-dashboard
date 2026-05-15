import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log('Running patch...');
  await sql`
    CREATE TABLE IF NOT EXISTS "movement_reasons" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer NOT NULL REFERENCES "public"."tenants"("id"),
      "name" varchar(255) NOT NULL,
      "type" "movement_type" NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `;
  
  try {
    await sql`ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "reason";`;
    await sql`ALTER TABLE "stock_movements" ADD COLUMN "reason_id" integer REFERENCES "public"."movement_reasons"("id");`;
  } catch(e) {
    console.log(e);
  }

  console.log('Done');
  process.exit(0);
}

main();