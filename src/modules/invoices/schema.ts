import { pgTable, serial, varchar, timestamp, integer, jsonb, text, pgEnum, index } from "drizzle-orm/pg-core";
import { tenants } from "../core/schema";
import { orders } from "../sales/schema";
import { products } from "../inventory/schema";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "pending",
  "authorized",
  "cancelled",
  "denied",
]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  orderId: integer("order_id").references(() => orders.id), // nullable: NF pode existir sem pedido

  // Identificação da NF-e
  number: integer("number").notNull(),
  series: varchar("series", { length: 3 }).notNull().default("1"),
  accessKey: varchar("access_key", { length: 44 }).unique(), // chave de acesso 44 dígitos

  status: invoiceStatusEnum("status").notNull().default("draft"),
  natureOfOperation: varchar("nature_of_operation", { length: 60 }).notNull().default("Venda de Mercadoria"),

  issueDate: timestamp("issue_date"),

  // Destinatário
  customerDocument: varchar("customer_document", { length: 18 }).notNull(), // CPF ou CNPJ
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerStateRegistration: varchar("customer_state_registration", { length: 14 }), // Inscrição Estadual
  customerAddressStreet: varchar("customer_address_street", { length: 60 }),
  customerAddressNumber: varchar("customer_address_number", { length: 60 }),
  customerAddressComplement: varchar("customer_address_complement", { length: 60 }),
  customerAddressNeighborhood: varchar("customer_address_neighborhood", { length: 60 }),
  customerAddressCity: varchar("customer_address_city", { length: 60 }),
  customerAddressState: varchar("customer_address_state", { length: 2 }),
  customerAddressZipCode: varchar("customer_address_zip_code", { length: 8 }),

  // Totais em centavos
  totalProducts: integer("total_products").notNull().default(0),
  totalDiscount: integer("total_discount").notNull().default(0),
  totalShipping: integer("total_shipping").notNull().default(0),
  totalInsurance: integer("total_insurance").notNull().default(0),
  totalOther: integer("total_other").notNull().default(0),
  totalTax: integer("total_tax").notNull().default(0),
  totalInvoice: integer("total_invoice").notNull().default(0),

  // Autorização SEFAZ
  authorizationProtocol: varchar("authorization_protocol", { length: 60 }),
  authorizedAt: timestamp("authorized_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: varchar("cancellation_reason", { length: 255 }),

  xmlContent: text("xml_content"),

  notes: varchar("notes", { length: 2000 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("invoices_tenant_id_idx").on(t.tenantId),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  productId: integer("product_id").references(() => products.id),

  // Snapshot do produto
  productName: varchar("product_name", { length: 120 }).notNull(),
  productCode: varchar("product_code", { length: 60 }), // SKU / código interno
  ncm: varchar("ncm", { length: 8 }),     // Nomenclatura Comum do Mercosul
  cfop: varchar("cfop", { length: 4 }).notNull(), // Código Fiscal de Operações e Prestações
  unit: varchar("unit", { length: 6 }).notNull().default("UN"),

  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // cents
  discount: integer("discount").notNull().default(0),   // cents
  total: integer("total").notNull().default(0),         // cents

  // Alíquotas como inteiros (12.5% → 1250). Valores em centavos.
  icmsRate: integer("icms_rate").notNull().default(0),
  icmsValue: integer("icms_value").notNull().default(0),
  ipiRate: integer("ipi_rate").notNull().default(0),
  ipiValue: integer("ipi_value").notNull().default(0),
  pisRate: integer("pis_rate").notNull().default(0),
  pisValue: integer("pis_value").notNull().default(0),
  cofinsRate: integer("cofins_rate").notNull().default(0),
  cofinsValue: integer("cofins_value").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
