// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, desc, and, gte, lte, lt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  mrr: decimal("mrr", { precision: 10, scale: 2 }).notNull().default("0.00"),
  status: mysqlEnum("status", ["active", "inactive", "paused", "overdue"]).default("active").notNull(),
  billingDayOfMonth: int("billingDayOfMonth"),
  // Dia do mês para cobrança (1-28)
  startDate: timestamp("startDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var setupContracts = mysqlTable("setup_contracts", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  installments: int("installments").notNull(),
  installmentAmount: decimal("installmentAmount", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "completed", "cancelled", "overdue"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var installments = mysqlTable("installments", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  installmentNumber: int("installmentNumber").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var services = mysqlTable("services", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var expenses = mysqlTable("expenses", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var expenseHistory = mysqlTable("expense_history", {
  id: int("id").autoincrement().primaryKey(),
  expenseId: int("expenseId"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: mysqlEnum("category", ["infrastructure", "team", "marketing", "software", "office", "other"]).notNull(),
  type: mysqlEnum("type", ["cost", "expense"]).default("expense").notNull(),
  month: timestamp("month").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("11.00").notNull(),
  // Taxa de impostos em %
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}
async function getClientById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createClient(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return Number(result.insertId);
}
async function updateClient(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}
async function deleteClient(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, id));
}
async function getAllSetupContracts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(setupContracts).orderBy(desc(setupContracts.createdAt));
}
async function getSetupContractsByClientId(clientId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(setupContracts).where(eq(setupContracts.clientId, clientId)).orderBy(desc(setupContracts.createdAt));
}
async function getSetupContractById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(setupContracts).where(eq(setupContracts.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createSetupContract(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(setupContracts).values(data);
  const contractId = result.insertId ? Number(result.insertId) : Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : void 0;
  if (!contractId || isNaN(contractId)) {
    console.error("Failed to get contract ID:", { result, contractId });
    throw new Error(`Failed to create setup contract: invalid ID ${contractId}`);
  }
  const startDate = new Date(data.startDate);
  const numberOfInstallments = data.installments || 1;
  const amountPerInstallment = parseFloat(data.totalAmount) / numberOfInstallments;
  for (let i = 0; i < numberOfInstallments; i++) {
    const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
    await createInstallment({
      contractId,
      installmentNumber: i + 1,
      amount: amountPerInstallment.toString(),
      dueDate,
      status: "pending"
    });
  }
  return contractId;
}
async function updateSetupContract(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(setupContracts).set(data).where(eq(setupContracts.id, id));
}
async function deleteSetupContract(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(setupContracts).where(eq(setupContracts.id, id));
}
async function getInstallmentsByContractId(contractId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(installments).where(eq(installments.contractId, contractId)).orderBy(installments.installmentNumber);
}
async function createInstallment(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(installments).values(data);
  return Number(result.insertId);
}
async function updateInstallment(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(installments).set(data).where(eq(installments.id, id));
}
async function deleteInstallment(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(installments).where(eq(installments.id, id));
}
async function getInstallmentsByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(installments).where(and(
    gte(installments.dueDate, startDate),
    lte(installments.dueDate, endDate)
  )).orderBy(installments.dueDate);
}
async function getAllServices() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services).orderBy(desc(services.serviceDate));
}
async function getServicesByClientId(clientId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services).where(eq(services.clientId, clientId)).orderBy(desc(services.serviceDate));
}
async function getServiceById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createService(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(services).values(data);
  return Number(result.insertId);
}
async function updateService(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(services).set(data).where(eq(services.id, id));
}
async function deleteService(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(services).where(eq(services.id, id));
}
async function getServicesByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services).where(and(
    gte(services.serviceDate, startDate),
    lte(services.serviceDate, endDate),
    eq(services.status, "completed")
  )).orderBy(services.serviceDate);
}
async function getAllExpenses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}
async function getExpenseById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createExpense(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(data);
  return Number(result.insertId);
}
async function updateExpense(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}
async function deleteExpense(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expense = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (expense.length > 0) {
    const exp = expense[0];
    if (exp.recurring && exp.recurringStartDate) {
      const startDate = new Date(exp.recurringStartDate);
      const endDate = exp.recurringEndDate ? new Date(exp.recurringEndDate) : new Date(startDate.getFullYear() + 10, 11, 31);
      let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (currentMonth <= endDate) {
        await db.insert(expenseHistory).values({
          expenseId: id,
          description: exp.description,
          amount: exp.amount,
          category: exp.category,
          month: currentMonth
        });
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    } else if (exp.expenseDate) {
      await db.insert(expenseHistory).values({
        expenseId: id,
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        month: exp.expenseDate
      });
    }
  }
  await db.delete(expenses).where(eq(expenses.id, id));
}
async function getExpensesByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).where(and(
    gte(expenses.expenseDate, startDate),
    lte(expenses.expenseDate, endDate)
  )).orderBy(expenses.expenseDate);
}
async function getExpensesByCategory(category) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).where(eq(expenses.category, category)).orderBy(desc(expenses.expenseDate));
}
async function getExpensesByPeriod(month, year) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return await db.select().from(expenses).where(and(
    gte(expenses.expenseDate, startDate),
    lte(expenses.expenseDate, endDate)
  )).orderBy(desc(expenses.expenseDate));
}
async function getCompanySettings() {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(companySettings).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateCompanySettings(data) {
  const db = await getDb();
  if (!db) return;
  const existing = await getCompanySettings();
  if (existing) {
    await db.update(companySettings).set(data).where(eq(companySettings.id, existing.id));
  } else {
    await db.insert(companySettings).values(data);
  }
}
async function getExpenseHistoryByDateRange(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenseHistory).where(and(
    gte(expenseHistory.month, startDate),
    lte(expenseHistory.month, endDate)
  )).orderBy(expenseHistory.month);
}
async function updateClientStatusBasedOnInstallments() {
  const db = await getDb();
  if (!db) return;
  const now = /* @__PURE__ */ new Date();
  const overdueInstallments = await db.select().from(installments).where(and(
    lt(installments.dueDate, now),
    ne(installments.status, "paid")
  ));
  const overdueClientIds = /* @__PURE__ */ new Set();
  for (const inst of overdueInstallments) {
    overdueClientIds.add(inst.contractId);
  }
  const allContracts = await db.select().from(setupContracts);
  const clientIdsWithOverdue = /* @__PURE__ */ new Set();
  const contractIdArray = Array.from(overdueClientIds);
  for (const contractId of contractIdArray) {
    const contract = allContracts.find((c) => c.id === contractId);
    if (contract) {
      clientIdsWithOverdue.add(contract.clientId);
    }
  }
  const clientIdArray = Array.from(clientIdsWithOverdue);
  for (const clientId of clientIdArray) {
    await db.update(clients).set({ status: "overdue" }).where(eq(clients.id, clientId));
  }
  const allClients = await db.select().from(clients);
  for (const client of allClients) {
    if (client.status === "overdue" && !clientIdsWithOverdue.has(client.id)) {
      await db.update(clients).set({ status: "active" }).where(eq(clients.id, client.id));
    }
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  clients: router({
    list: protectedProcedure.query(async () => {
      return await getAllClients();
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getClientById(input.id);
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(1),
      email: z2.string().email().optional(),
      phone: z2.string().optional(),
      company: z2.string().optional(),
      mrr: z2.string(),
      status: z2.enum(["active", "inactive", "paused", "overdue"]).default("active"),
      startDate: z2.date(),
      billingDayOfMonth: z2.number().min(1).max(28).optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const id = await createClient(input);
      return { id };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).optional(),
      email: z2.string().email().optional(),
      phone: z2.string().optional(),
      company: z2.string().optional(),
      mrr: z2.string().optional(),
      status: z2.enum(["active", "inactive", "paused", "overdue"]).optional(),
      startDate: z2.date().optional(),
      billingDayOfMonth: z2.number().min(1).max(28).optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClient(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteClient(input.id);
      return { success: true };
    })
  }),
  setupContracts: router({
    list: protectedProcedure.query(async () => {
      return await getAllSetupContracts();
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getSetupContractById(input.id);
    }),
    getByClientId: protectedProcedure.input(z2.object({ clientId: z2.number() })).query(async ({ input }) => {
      return await getSetupContractsByClientId(input.clientId);
    }),
    create: protectedProcedure.input(z2.object({
      clientId: z2.number(),
      totalAmount: z2.string(),
      installments: z2.number(),
      installmentAmount: z2.string(),
      startDate: z2.date(),
      description: z2.string().optional(),
      status: z2.enum(["active", "completed", "cancelled", "overdue"]).default("active")
    })).mutation(async ({ input }) => {
      const contractId = await createSetupContract(input);
      return { id: contractId };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      clientId: z2.number().optional(),
      totalAmount: z2.string().optional(),
      installments: z2.number().optional(),
      installmentAmount: z2.string().optional(),
      startDate: z2.date().optional(),
      description: z2.string().optional(),
      status: z2.enum(["active", "completed", "cancelled", "overdue"]).optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSetupContract(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteSetupContract(input.id);
      return { success: true };
    })
  }),
  installments: router({
    getByContractId: protectedProcedure.input(z2.object({ contractId: z2.number() })).query(async ({ input }) => {
      return await getInstallmentsByContractId(input.contractId);
    }),
    markAsPaid: protectedProcedure.input(z2.object({
      id: z2.number(),
      paidDate: z2.date()
    })).mutation(async ({ input }) => {
      await updateInstallment(input.id, {
        status: "paid",
        paidDate: input.paidDate
      });
      return { success: true };
    }),
    markAsPending: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await updateInstallment(input.id, {
        status: "pending",
        paidDate: null
      });
      return { success: true };
    }),
    regenerateAll: protectedProcedure.mutation(async () => {
      const contracts = await getAllSetupContracts();
      let regeneratedCount = 0;
      for (const contract of contracts) {
        const existingInstallments = await getInstallmentsByContractId(contract.id);
        for (const inst of existingInstallments) {
          await deleteInstallment(inst.id);
        }
        const startDate = new Date(contract.startDate);
        const numberOfInstallments = contract.installments || 1;
        const amountPerInstallment = parseFloat(contract.totalAmount) / numberOfInstallments;
        for (let i = 0; i < numberOfInstallments; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          await createInstallment({
            contractId: contract.id,
            installmentNumber: i + 1,
            amount: amountPerInstallment.toString(),
            dueDate,
            status: "pending"
          });
        }
        regeneratedCount++;
      }
      return { regeneratedCount };
    })
  }),
  services: router({
    list: protectedProcedure.query(async () => {
      return await getAllServices();
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getServiceById(input.id);
    }),
    getByClientId: protectedProcedure.input(z2.object({ clientId: z2.number() })).query(async ({ input }) => {
      return await getServicesByClientId(input.clientId);
    }),
    create: protectedProcedure.input(z2.object({
      clientId: z2.number(),
      description: z2.string().min(1),
      amount: z2.string(),
      serviceDate: z2.date(),
      status: z2.enum(["pending", "completed", "cancelled"]).default("pending"),
      paymentStatus: z2.enum(["pending", "paid", "overdue"]).default("pending"),
      isInstallment: z2.boolean().default(false),
      installmentCount: z2.number().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const id = await createService(input);
      return { id };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      description: z2.string().min(1).optional(),
      amount: z2.string().optional(),
      serviceDate: z2.date().optional(),
      status: z2.enum(["pending", "completed", "cancelled"]).optional(),
      paymentStatus: z2.enum(["pending", "paid", "overdue"]).optional(),
      isInstallment: z2.boolean().optional(),
      installmentCount: z2.number().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateService(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteService(input.id);
      return { success: true };
    })
  }),
  expenses: router({
    list: protectedProcedure.query(async () => {
      return await getAllExpenses();
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getExpenseById(input.id);
    }),
    getByCategory: protectedProcedure.input(z2.object({ category: z2.string() })).query(async ({ input }) => {
      return await getExpensesByCategory(input.category);
    }),
    getByPeriod: protectedProcedure.input(z2.object({
      month: z2.number().min(1).max(12),
      year: z2.number().min(2e3).max(2100)
    })).query(async ({ input }) => {
      return await getExpensesByPeriod(input.month, input.year);
    }),
    create: protectedProcedure.input(z2.object({
      description: z2.string().min(1),
      amount: z2.string(),
      category: z2.enum(["infrastructure", "team", "marketing", "software", "office", "other"]),
      type: z2.enum(["cost", "expense"]).default("expense"),
      expenseDate: z2.date().optional(),
      recurring: z2.boolean().default(false),
      recurringStartDate: z2.date().optional(),
      recurringEndDate: z2.date().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      let expenseDate = input.expenseDate;
      if (input.recurring && input.recurringStartDate) {
        expenseDate = input.recurringStartDate;
      } else if (!expenseDate) {
        throw new Error("expenseDate is required for non-recurring expenses");
      }
      const id = await createExpense({
        ...input,
        expenseDate
      });
      return { id };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      description: z2.string().min(1).optional(),
      amount: z2.string().optional(),
      category: z2.enum(["infrastructure", "team", "marketing", "software", "office", "other"]).optional(),
      type: z2.enum(["cost", "expense"]).optional(),
      expenseDate: z2.date().optional(),
      recurring: z2.boolean().optional(),
      recurringStartDate: z2.date().optional(),
      recurringEndDate: z2.date().optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateExpense(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteExpense(input.id);
      return { success: true };
    })
  }),
  metrics: router({
    getMonthly: protectedProcedure.input(z2.object({
      year: z2.number(),
      month: z2.number()
    })).query(async ({ input }) => {
      await updateClientStatusBasedOnInstallments();
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
      const allClients = await getAllClients();
      const activeClients = allClients.filter((c) => c.status === "active");
      const totalMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
      const newClientsInPeriod = allClients.filter((c) => {
        const clientStartDate = new Date(c.startDate);
        return c.status === "active" && clientStartDate >= startDate && clientStartDate <= endDate;
      });
      const newClientsRevenue = newClientsInPeriod.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
      const installments2 = await getInstallmentsByDateRange(startDate, endDate);
      const setupRevenue = installments2.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const services2 = await getServicesByDateRange(startDate, endDate);
      const paidServices = services2.filter((s) => s.paymentStatus === "paid");
      const servicesRevenue = paidServices.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      const expenses2 = await getExpensesByDateRange(startDate, endDate);
      const totalCosts = expenses2.filter((e) => e.type === "cost").reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalExpenses = expenses2.filter((e) => e.type === "expense").reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalAllExpenses = totalCosts + totalExpenses;
      const totalRevenue = totalMRR + setupRevenue + servicesRevenue;
      const profit = totalRevenue - totalAllExpenses;
      const profitMargin = totalRevenue > 0 ? profit / totalRevenue * 100 : 0;
      return {
        totalMRR,
        setupRevenue,
        servicesRevenue,
        totalRevenue,
        totalCosts,
        totalExpenses,
        profit,
        profitMargin,
        activeClientsCount: activeClients.length
      };
    }),
    getFutureProjection: protectedProcedure.query(async () => {
      const allInstallments = await getInstallmentsByDateRange(
        /* @__PURE__ */ new Date(),
        new Date((/* @__PURE__ */ new Date()).getFullYear() + 2, 11, 31)
      );
      const pendingInstallments = allInstallments.filter((i) => i.status === "pending");
      const totalPending = pendingInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const byMonth = {};
      pendingInstallments.forEach((inst) => {
        const key = `${inst.dueDate.getFullYear()}-${String(inst.dueDate.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] || 0) + parseFloat(inst.amount);
      });
      return {
        totalPending,
        byMonth
      };
    }),
    getExpensesByCategory: protectedProcedure.input(z2.object({
      year: z2.number(),
      month: z2.number()
    })).query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
      const expenses2 = await getExpensesByDateRange(startDate, endDate);
      const byCategory = {};
      expenses2.forEach((exp) => {
        const category = exp.category || "Outros";
        byCategory[category] = (byCategory[category] || 0) + parseFloat(exp.amount);
      });
      return byCategory;
    }),
    getSetupPendingBreakdown: protectedProcedure.input(z2.object({
      year: z2.number(),
      month: z2.number()
    })).query(async ({ input }) => {
      const now = new Date(input.year, input.month - 1, 1);
      const thisMonthEnd = new Date(input.year, input.month, 0, 23, 59, 59);
      const next3MonthsEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59);
      const allInstallments = await getInstallmentsByDateRange(now, next3MonthsEnd);
      const pendingInstallments = allInstallments.filter((i) => i.status === "pending");
      const thisMonth = pendingInstallments.filter((i) => i.dueDate <= thisMonthEnd).reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const next3Months = pendingInstallments.filter((i) => i.dueDate > thisMonthEnd && i.dueDate <= next3MonthsEnd).reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const totalFuture = pendingInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      return {
        thisMonth,
        next3Months,
        totalFuture
      };
    }),
    getAlerts: protectedProcedure.query(async () => {
      const alerts = [];
      const now = /* @__PURE__ */ new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
      const allInstallments = await getInstallmentsByDateRange(now, sevenDaysLater);
      const pendingDue = allInstallments.filter((i) => i.status === "pending");
      if (pendingDue.length > 0) {
        const totalDue = pendingDue.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        alerts.push({
          type: "warning",
          title: "Parcelas Vencendo",
          message: `${pendingDue.length} parcela(s) vencendo nos pr\xF3ximos 7 dias (R$ ${totalDue.toFixed(2)})`
        });
      }
      return alerts;
    }),
    getCashFlowProjection: protectedProcedure.query(async () => {
      const now = /* @__PURE__ */ new Date();
      const projection = [];
      const allClients = await getAllClients();
      const activeClients = allClients.filter((c) => c.status === "active");
      const monthlyMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
      for (let i = 0; i < 3; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        const installments2 = await getInstallmentsByDateRange(monthDate, monthEnd);
        const pendingInstallments = installments2.filter((i2) => i2.status === "pending");
        const installmentsRevenue = pendingInstallments.reduce((sum, i2) => sum + parseFloat(i2.amount), 0);
        const expenses2 = await getExpensesByDateRange(monthDate, monthEnd);
        const totalExpenses = expenses2.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const entries = monthlyMRR + installmentsRevenue;
        const exits = totalExpenses;
        const balance = entries - exits;
        projection.push({
          month: monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          entries,
          exits,
          balance
        });
      }
      return projection;
    }),
    getRevenueHistory: protectedProcedure.query(async () => {
      const history = [];
      const now = /* @__PURE__ */ new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        const allClients = await getAllClients();
        const activeClients = allClients.filter((c) => c.status === "active");
        const totalMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        const newClientsInPeriod = allClients.filter((c) => {
          const clientStartDate = new Date(c.startDate);
          return c.status === "active" && clientStartDate >= monthDate && clientStartDate <= monthEnd;
        });
        const newClientsRevenue = newClientsInPeriod.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        const installments2 = await getInstallmentsByDateRange(monthDate, monthEnd);
        const paidInstallments = installments2.filter((i2) => i2.status === "paid");
        const installmentsRevenue = paidInstallments.reduce((sum, i2) => sum + parseFloat(i2.amount), 0);
        const services2 = await getServicesByDateRange(monthDate, monthEnd);
        const servicesRevenue = services2.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const totalRevenue = totalMRR + installmentsRevenue + servicesRevenue;
        history.push({
          month: monthDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          revenue: totalRevenue,
          mrr: totalMRR,
          setup: installmentsRevenue,
          services: servicesRevenue
        });
      }
      return history;
    }),
    getClientDetails: protectedProcedure.input(z2.object({ clientId: z2.number() })).query(async ({ input }) => {
      const client = await getClientById(input.clientId);
      if (!client) throw new Error("Client not found");
      const contracts = await getSetupContractsByClientId(input.clientId);
      const services2 = await getServicesByClientId(input.clientId);
      const allInstallments = [];
      for (const contract of contracts) {
        const inst = await getInstallmentsByContractId(contract.id);
        allInstallments.push(...inst);
      }
      const paidInstallments = allInstallments.filter((i) => i.status === "paid");
      const pendingInstallments = allInstallments.filter((i) => i.status === "pending");
      const totalPaidSetup = paidInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const totalPendingSetup = pendingInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const totalServices = services2.filter((s) => s.status === "completed").reduce((sum, s) => sum + parseFloat(s.amount), 0);
      return {
        client,
        contracts,
        services: services2,
        installments: allInstallments,
        summary: {
          mrr: parseFloat(client.mrr),
          totalPaidSetup,
          totalPendingSetup,
          totalServices,
          totalRevenue: parseFloat(client.mrr) + totalPaidSetup + totalServices
        }
      };
    })
  }),
  billing: router({
    getUpcomingCharges: protectedProcedure.input(z2.object({ daysAhead: z2.number().default(7) })).query(async ({ input }) => {
      const clients2 = await getAllClients();
      const today = /* @__PURE__ */ new Date();
      const futureDate = new Date(today.getTime() + input.daysAhead * 24 * 60 * 60 * 1e3);
      const upcomingCharges = [];
      clients2.forEach((client) => {
        if (!client.billingDayOfMonth || client.status !== "active") return;
        const nextBillingDate = new Date(today.getFullYear(), today.getMonth(), client.billingDayOfMonth);
        if (nextBillingDate < today) {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
        if (nextBillingDate <= futureDate && nextBillingDate >= today) {
          upcomingCharges.push({
            clientId: client.id,
            clientName: client.name,
            amount: parseFloat(client.mrr),
            dueDate: nextBillingDate,
            daysUntilDue: Math.ceil((nextBillingDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1e3))
          });
        }
      });
      return upcomingCharges.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }),
    getOverdueCharges: protectedProcedure.query(async () => {
      const clients2 = await getAllClients();
      const today = /* @__PURE__ */ new Date();
      const overdueCharges = [];
      clients2.forEach((client) => {
        if (!client.billingDayOfMonth || client.status !== "active") return;
        const lastBillingDate = new Date(today.getFullYear(), today.getMonth(), client.billingDayOfMonth);
        if (lastBillingDate > today) {
          lastBillingDate.setMonth(lastBillingDate.getMonth() - 1);
        }
        if (lastBillingDate < today) {
          const daysOverdue = Math.ceil((today.getTime() - lastBillingDate.getTime()) / (24 * 60 * 60 * 1e3));
          overdueCharges.push({
            clientId: client.id,
            clientName: client.name,
            amount: parseFloat(client.mrr),
            dueDate: lastBillingDate,
            daysOverdue
          });
        }
      });
      return overdueCharges.sort((a, b) => b.daysOverdue - a.daysOverdue);
    })
  }),
  dre: router({
    getMonthly: protectedProcedure.input(z2.object({
      year: z2.number(),
      month: z2.number()
    })).query(async ({ input }) => {
      const monthStart = new Date(input.year, input.month - 1, 1);
      const monthEnd = new Date(input.year, input.month, 0, 23, 59, 59);
      const allClients = await getAllClients();
      const activeClients = allClients.filter((c) => c.status === "active");
      const totalMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
      const allContracts = await getAllSetupContracts();
      const contractsClosedThisMonth = allContracts.filter((c) => {
        const startDate = new Date(c.startDate);
        return startDate >= monthStart && startDate <= monthEnd && c.status !== "cancelled";
      });
      const totalSetup = contractsClosedThisMonth.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0);
      const services2 = await getServicesByDateRange(monthStart, monthEnd);
      const servicesRevenue = services2.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      const grossRevenue = totalMRR + totalSetup + servicesRevenue;
      const settings = await getCompanySettings();
      const taxRate = settings ? typeof settings.taxRate === "string" ? parseFloat(settings.taxRate) : settings.taxRate : 11;
      const taxes = grossRevenue * taxRate / 100;
      const netRevenue = grossRevenue - taxes;
      const expenseHistory2 = await getExpenseHistoryByDateRange(monthStart, monthEnd);
      const costs = expenseHistory2.filter((e) => e.type === "cost").reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const grossMargin = netRevenue - costs;
      const expenses2 = expenseHistory2.filter((e) => e.type === "expense").reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const netIncome = grossMargin - expenses2;
      return {
        grossRevenue,
        mrr: totalMRR,
        setup: totalSetup,
        services: servicesRevenue,
        taxRate,
        taxes,
        netRevenue,
        costs,
        grossMargin,
        expenses: expenses2,
        netIncome,
        grossMarginPercent: grossRevenue > 0 ? grossMargin / grossRevenue * 100 : 0,
        netIncomePercent: grossRevenue > 0 ? netIncome / grossRevenue * 100 : 0
      };
    }),
    updateTaxRate: protectedProcedure.input(z2.object({
      taxRate: z2.number().min(0).max(100)
    })).mutation(async ({ input }) => {
      await updateCompanySettings({ taxRate: input.taxRate.toString() });
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
