import { pgTable, serial, varchar, timestamp, integer, pgEnum, unique, index, boolean } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "member"]);

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
    role: membershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("memberships_user_tenant_unique").on(t.userId, t.tenantId),
    index("memberships_user_id_idx").on(t.userId),
    index("memberships_tenant_id_idx").on(t.tenantId),
  ],
);

// moduleKey é texto validado pelo registry de módulos (src/modules/registry.ts), não pgEnum.
export const tenantModules = pgTable(
  "tenant_modules",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
    moduleKey: varchar("module_key", { length: 64 }).notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("tenant_modules_tenant_module_unique").on(t.tenantId, t.moduleKey),
    index("tenant_modules_tenant_id_idx").on(t.tenantId),
  ],
);
