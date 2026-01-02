import { eq, desc, and, gte, lte, sql, lt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  clients, 
  InsertClient,
  setupContracts,
  InsertSetupContract,
  installments,
  InsertInstallment,
  services,
  InsertService,
  expenses,
  InsertExpense,
  expenseHistory,
  InsertExpenseHistory,
  companySettings,
  InsertCompanySettings,
  CompanySettings
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== CLIENTS ==========

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data) as any;
  return Number(result.insertId);
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, id));
}

// ========== SETUP CONTRACTS ==========

export async function getAllSetupContracts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(setupContracts).orderBy(desc(setupContracts.createdAt));
}

export async function getSetupContractsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(setupContracts).where(eq(setupContracts.clientId, clientId)).orderBy(desc(setupContracts.createdAt));
}

export async function getSetupContractById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(setupContracts).where(eq(setupContracts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSetupContract(data: InsertSetupContract) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(setupContracts).values(data) as any;
  const contractId = result.insertId ? Number(result.insertId) : (Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : undefined);
  
  if (!contractId || isNaN(contractId)) {
    console.error('Failed to get contract ID:', { result, contractId });
    throw new Error(`Failed to create setup contract: invalid ID ${contractId}`);
  }
  
  // Generate installments automatically
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
      status: 'pending'
    });
  }
  
  return contractId;
}

export async function updateSetupContract(id: number, data: Partial<InsertSetupContract>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(setupContracts).set(data).where(eq(setupContracts.id, id));
}

export async function deleteSetupContract(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(setupContracts).where(eq(setupContracts.id, id));
}

// ========== INSTALLMENTS ==========

export async function getInstallmentsByContractId(contractId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(installments).where(eq(installments.contractId, contractId)).orderBy(installments.installmentNumber);
}

export async function getInstallmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(installments).where(eq(installments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createInstallment(data: InsertInstallment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(installments).values(data) as any;
  return Number(result.insertId);
}

export async function updateInstallment(id: number, data: Partial<InsertInstallment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(installments).set(data).where(eq(installments.id, id));
}

export async function deleteInstallment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(installments).where(eq(installments.id, id));
}

export async function getInstallmentsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(installments)
    .where(and(
      gte(installments.dueDate, startDate),
      lte(installments.dueDate, endDate)
    ))
    .orderBy(installments.dueDate);
}

// ========== SERVICES ==========

export async function getAllServices() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services).orderBy(desc(services.serviceDate));
}

export async function getServicesByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services).where(eq(services.clientId, clientId)).orderBy(desc(services.serviceDate));
}

export async function getServiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createService(data: InsertService) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(services).values(data) as any;
  return Number(result.insertId);
}

export async function updateService(id: number, data: Partial<InsertService>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(services).set(data).where(eq(services.id, id));
}

export async function deleteService(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(services).where(eq(services.id, id));
}

export async function getServicesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services)
    .where(and(
      gte(services.serviceDate, startDate),
      lte(services.serviceDate, endDate),
      eq(services.status, 'completed')
    ))
    .orderBy(services.serviceDate);
}

// ========== EXPENSES ==========

export async function getAllExpenses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(data) as any;
  return Number(result.insertId);
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
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
          month: currentMonth,
        });
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    } else if (exp.expenseDate) {
      await db.insert(expenseHistory).values({
        expenseId: id,
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        month: exp.expenseDate,
      });
    }
  }
  
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses)
    .where(and(
      gte(expenses.expenseDate, startDate),
      lte(expenses.expenseDate, endDate)
    ))
    .orderBy(expenses.expenseDate);
}

export async function getExpensesByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).where(eq(expenses.category, category as any)).orderBy(desc(expenses.expenseDate));
}

export async function getExpensesByPeriod(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return await db.select().from(expenses)
    .where(and(
      gte(expenses.expenseDate, startDate),
      lte(expenses.expenseDate, endDate)
    ))
    .orderBy(desc(expenses.expenseDate));
}

export async function getCompanySettings(): Promise<CompanySettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companySettings).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCompanySettings(data: Partial<InsertCompanySettings>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getCompanySettings();
  if (existing) {
    await db.update(companySettings).set(data).where(eq(companySettings.id, existing.id));
  } else {
    await db.insert(companySettings).values(data as InsertCompanySettings);
  }
}

export async function getExpenseHistoryByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenseHistory)
    .where(and(
      gte(expenseHistory.month, startDate),
      lte(expenseHistory.month, endDate)
    ))
    .orderBy(expenseHistory.month);
}

// ========== CLIENT STATUS UPDATE ==========

export async function updateClientStatusBasedOnInstallments() {
  const db = await getDb();
  if (!db) return;
  
  // Get all overdue installments (past due date and not paid)
  const now = new Date();
  const overdueInstallments = await db.select().from(installments)
    .where(and(
      lt(installments.dueDate, now),
      ne(installments.status, 'paid')
    ));
  
  // Get unique client IDs from overdue installments
  const overdueClientIds = new Set<number>();
  for (const inst of overdueInstallments) {
    overdueClientIds.add(inst.contractId);
  }
  
  // Get contracts for these installments to find client IDs
  const allContracts = await db.select().from(setupContracts);
  const clientIdsWithOverdue = new Set<number>();
  
  const contractIdArray = Array.from(overdueClientIds);
  for (const contractId of contractIdArray) {
    const contract = allContracts.find(c => c.id === contractId);
    if (contract) {
      clientIdsWithOverdue.add(contract.clientId);
    }
  }
  
  // Update status to 'overdue' for clients with overdue installments
  const clientIdArray = Array.from(clientIdsWithOverdue);
  for (const clientId of clientIdArray) {
    await db.update(clients)
      .set({ status: 'overdue' })
      .where(eq(clients.id, clientId));
  }
  
  // Update status back to 'active' for clients with no overdue installments
  const allClients = await db.select().from(clients);
  for (const client of allClients) {
    if (client.status === 'overdue' && !clientIdsWithOverdue.has(client.id)) {
      await db.update(clients)
        .set({ status: 'active' })
        .where(eq(clients.id, client.id));
    }
  }
}
