import { pgTable, serial, varchar, timestamp, integer, jsonb, pgEnum, unique, index } from "drizzle-orm/pg-core";
import { tenants } from "../core/schema";

export const movementTypeEnum = pgEnum("movement_type", ["entry", "exit"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 255 }),
  basePrice: integer("base_price").notNull().default(0), // stored in cents

  // The core of the dynamic feature:
  // Clients can add their own fields here like { "expiration_date": "...", "color": "red" }
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("products_tenant_sku_unique").on(t.tenantId, t.sku),
  index("products_tenant_id_idx").on(t.tenantId),
]);

export const inventoryStock = pgTable("inventory_stock", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("inventory_stock_tenant_id_idx").on(t.tenantId),
]);

export const movementReasons = pgTable("movement_reasons", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: movementTypeEnum("type").notNull(), // 'entry' or 'exit'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("movement_reasons_tenant_id_idx").on(t.tenantId),
]);

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(), // always positive; direction given by type
  reasonId: integer("reason_id").references(() => movementReasons.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("stock_movements_tenant_id_idx").on(t.tenantId),
]);
