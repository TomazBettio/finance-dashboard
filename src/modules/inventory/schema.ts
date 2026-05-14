import { pgTable, serial, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { tenants } from "../core/schema";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 255 }),
  basePrice: integer("base_price").notNull().default(0), // stored in cents
  
  // The core of the dynamic feature:
  // Clients can add their own fields here like { "expiration_date": "...", "color": "red" }
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryStock = pgTable("inventory_stock", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: varchar("location", { length: 255 }), // e.g., 'Aisle 5', 'Warehouse A'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
