import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as coreSchema from '@/modules/core/schema';
import * as inventorySchema from '@/modules/inventory/schema';
import * as salesSchema from '@/modules/sales/schema';
import * as invoicesSchema from '@/modules/invoices/schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dynamic-saas';

// prepare: false required for PgBouncer transaction pool mode (Vercel)
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, {
  schema: { ...coreSchema, ...inventorySchema, ...salesSchema, ...invoicesSchema },
});
