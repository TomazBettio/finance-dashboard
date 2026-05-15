import { pgTable, serial, varchar, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "../core/schema";
import { products } from "../inventory/schema";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "pix",
  "bank_transfer",
  "other",
]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),

  customerName: varchar("customer_name", { length: 255 }),
  customerDocument: varchar("customer_document", { length: 18 }), // CPF ou CNPJ
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 20 }),

  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),

  // All monetary values stored in cents
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  shipping: integer("shipping").notNull().default(0),
  total: integer("total").notNull().default(0),

  notes: varchar("notes", { length: 1000 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  productId: integer("product_id").references(() => products.id),

  // Snapshot of product data at time of sale
  productName: varchar("product_name", { length: 255 }).notNull(),
  productSku: varchar("product_sku", { length: 255 }),

  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // cents
  discount: integer("discount").notNull().default(0),   // cents
  subtotal: integer("subtotal").notNull().default(0),   // cents

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
