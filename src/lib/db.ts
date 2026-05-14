import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as coreSchema from '@/modules/core/schema';
import * as inventorySchema from '@/modules/inventory/schema';

// Connection string
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dynamic-saas';

// Disable prefetch as it is not supported for "Transaction" pool mode in PgBouncer (often used in Vercel)
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema: { ...coreSchema, ...inventorySchema } });
