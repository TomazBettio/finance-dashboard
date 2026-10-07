import { pgTable, serial, varchar, timestamp, integer, jsonb, boolean, pgEnum, unique, index } from "drizzle-orm/pg-core";
import { tenants } from "../core/schema";

export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "text",
  "number",
  "date",
  "boolean",
  "select",
]);

export const customFieldDefinitions = pgTable(
  "custom_field_definitions",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
    entity: varchar("entity", { length: 32 }).notNull(),
    key: varchar("key", { length: 64 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    type: customFieldTypeEnum("type").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    required: boolean("required").notNull().default(false),
    showInTable: boolean("show_in_table").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("custom_field_definitions_tenant_entity_key_unique").on(t.tenantId, t.entity, t.key),
    index("custom_field_definitions_tenant_id_idx").on(t.tenantId),
  ],
);
