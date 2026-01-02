import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clientes da agência SaaS
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  mrr: decimal("mrr", { precision: 10, scale: 2 }).notNull().default("0.00"),
  status: mysqlEnum("status", ["active", "inactive", "paused", "overdue"]).default("active").notNull(),
  billingDayOfMonth: int("billingDayOfMonth"), // Dia do mês para cobrança (1-28)
  startDate: timestamp("startDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Contratos de setup parcelado
 */
export const setupContracts = mysqlTable("setup_contracts", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  installments: int("installments").notNull(),
  installmentAmount: decimal("installmentAmount", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "completed", "cancelled", "overdue"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SetupContract = typeof setupContracts.$inferSelect;
export type InsertSetupContract = typeof setupContracts.$inferInsert;

/**
 * Parcelas dos contratos de setup
 */
export const installments = mysqlTable("installments", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  installmentNumber: int("installmentNumber").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Installment = typeof installments.$inferSelect;
export type InsertInstallment = typeof installments.$inferInsert;

/**
 * Serviços pontuais customizados
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  serviceDate: timestamp("serviceDate").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "overdue"]).default("pending").notNull(),
  isInstallment: boolean("isInstallment").default(false).notNull(),
  installmentCount: int("installmentCount"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Despesas mensais categorizadas
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: mysqlEnum("category", ["infrastructure", "team", "marketing", "software", "office", "other"]).notNull(),
  type: mysqlEnum("type", ["cost", "expense"]).default("expense").notNull(),
  expenseDate: timestamp("expenseDate"),
  recurring: boolean("recurring").default(false).notNull(),
  recurringStartDate: timestamp("recurringStartDate"),
  recurringEndDate: timestamp("recurringEndDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Histórico de despesas (preserva dados históricos mesmo após deletar a despesa)
 */
export const expenseHistory = mysqlTable("expense_history", {
  id: int("id").autoincrement().primaryKey(),
  expenseId: int("expenseId"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: mysqlEnum("category", ["infrastructure", "team", "marketing", "software", "office", "other"]).notNull(),
  type: mysqlEnum("type", ["cost", "expense"]).default("expense").notNull(),
  month: timestamp("month").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExpenseHistory = typeof expenseHistory.$inferSelect;
export type InsertExpenseHistory = typeof expenseHistory.$inferInsert;

/**
 * Configurações da empresa
 */
export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("11.00").notNull(), // Taxa de impostos em %
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;
