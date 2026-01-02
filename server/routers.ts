import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  clients: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllClients();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        mrr: z.string(),
        status: z.enum(["active", "inactive", "paused", "overdue"]).default("active"),
        startDate: z.date(),
        billingDayOfMonth: z.number().min(1).max(28).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createClient(input);
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        mrr: z.string().optional(),
        status: z.enum(["active", "inactive", "paused", "overdue"]).optional(),
        startDate: z.date().optional(),
        billingDayOfMonth: z.number().min(1).max(28).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateClient(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClient(input.id);
        return { success: true };
      }),
  }),

  setupContracts: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllSetupContracts();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSetupContractById(input.id);
      }),
    
    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSetupContractsByClientId(input.clientId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        totalAmount: z.string(),
        installments: z.number(),
        installmentAmount: z.string(),
        startDate: z.date(),
        description: z.string().optional(),
        status: z.enum(["active", "completed", "cancelled", "overdue"]).default("active"),
      }))
      .mutation(async ({ input }) => {
        const contractId = await db.createSetupContract(input);
        return { id: contractId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number().optional(),
        totalAmount: z.string().optional(),
        installments: z.number().optional(),
        installmentAmount: z.string().optional(),
        startDate: z.date().optional(),
        description: z.string().optional(),
        status: z.enum(["active", "completed", "cancelled", "overdue"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSetupContract(id, data);
        // Note: If installments or startDate changes, you may need to regenerate installments
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSetupContract(input.id);
        return { success: true };
      }),
  }),

  installments: router({
    getByContractId: protectedProcedure
      .input(z.object({ contractId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInstallmentsByContractId(input.contractId);
      }),
    
    markAsPaid: protectedProcedure
      .input(z.object({
        id: z.number(),
        paidDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        await db.updateInstallment(input.id, {
          status: "paid",
          paidDate: input.paidDate,
        });
        return { success: true };
      }),
    
    markAsPending: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateInstallment(input.id, {
          status: "pending",
          paidDate: null,
        });
        return { success: true };
      }),
    
    regenerateAll: protectedProcedure
      .mutation(async () => {
        const contracts = await db.getAllSetupContracts();
        let regeneratedCount = 0;
        
        for (const contract of contracts) {
          const existingInstallments = await db.getInstallmentsByContractId(contract.id);
          for (const inst of existingInstallments) {
            await db.deleteInstallment(inst.id);
          }
          
          const startDate = new Date(contract.startDate);
          const numberOfInstallments = contract.installments || 1;
          const amountPerInstallment = parseFloat(contract.totalAmount) / numberOfInstallments;
          
          for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            await db.createInstallment({
              contractId: contract.id,
              installmentNumber: i + 1,
              amount: amountPerInstallment.toString(),
              dueDate,
              status: 'pending'
            });
          }
          
          regeneratedCount++;
        }
        
        return { regeneratedCount };
      }),
  }),

  services: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllServices();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getServiceById(input.id);
      }),
    
    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getServicesByClientId(input.clientId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        description: z.string().min(1),
        amount: z.string(),
        serviceDate: z.date(),
        status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
        paymentStatus: z.enum(["pending", "paid", "overdue"]).default("pending"),
        isInstallment: z.boolean().default(false),
        installmentCount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createService(input);
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        amount: z.string().optional(),
        serviceDate: z.date().optional(),
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
        paymentStatus: z.enum(["pending", "paid", "overdue"]).optional(),
        isInstallment: z.boolean().optional(),
        installmentCount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateService(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteService(input.id);
        return { success: true };
      }),
  }),

  expenses: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllExpenses();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getExpenseById(input.id);
      }),
    
    getByCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await db.getExpensesByCategory(input.category);
      }),
    
    getByPeriod: protectedProcedure
      .input(z.object({ 
        month: z.number().min(1).max(12),
        year: z.number().min(2000).max(2100)
      }))
      .query(async ({ input }) => {
        return await db.getExpensesByPeriod(input.month, input.year);
      }),
    
    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        amount: z.string(),
        category: z.enum(["infrastructure", "team", "marketing", "software", "office", "other"]),
        type: z.enum(["cost", "expense"]).default("expense"),
        expenseDate: z.date().optional(),
        recurring: z.boolean().default(false),
        recurringStartDate: z.date().optional(),
        recurringEndDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        let expenseDate = input.expenseDate;
        if (input.recurring && input.recurringStartDate) {
          expenseDate = input.recurringStartDate;
        } else if (!expenseDate) {
          throw new Error("expenseDate is required for non-recurring expenses");
        }
        const id = await db.createExpense({
          ...input,
          expenseDate,
        } as any);
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        amount: z.string().optional(),
        category: z.enum(["infrastructure", "team", "marketing", "software", "office", "other"]).optional(),
        type: z.enum(["cost", "expense"]).optional(),
        expenseDate: z.date().optional(),
        recurring: z.boolean().optional(),
        recurringStartDate: z.date().optional(),
        recurringEndDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateExpense(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteExpense(input.id);
        return { success: true };
      }),
  }),

  metrics: router({
    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.number(),
        endDate: z.number(),
      }))
      .query(async ({ input }) => {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        // Update client status based on overdue installments
        await db.updateClientStatusBasedOnInstallments();
        
        // Get all active clients MRR (only status='active')
        const allClients = await db.getAllClients();
        const activeClients = allClients.filter(c => c.status === 'active');
        const totalMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        
        // Get setup installments in this period (all, not just paid)
        const installments = await db.getInstallmentsByDateRange(startDate, endDate);
        const setupRevenue = installments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        // Get services in this period (all, not just paid)
        const services = await db.getServicesByDateRange(startDate, endDate);
        const servicesRevenue = services.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        
        // Calculate MRR for the period (only count clients that were active during the period)
        const mrrForPeriod = activeClients.reduce((sum, c) => {
          const clientStartDate = new Date(c.startDate);
          // Count MRR only if client was active during the period
          if (clientStartDate <= endDate) {
            return sum + parseFloat(c.mrr);
          }
          return sum;
        }, 0);
        
        // Get expenses and costs in this period
        const expenses = await db.getExpensesByDateRange(startDate, endDate);
        const totalCosts = expenses.filter(e => e.type === 'cost').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalAllExpenses = totalCosts + totalExpenses;
        
        // Calculate totals
        const totalRevenue = mrrForPeriod + setupRevenue + servicesRevenue;
        const profit = totalRevenue - totalAllExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        
        return {
          totalMRR,
          setupRevenue,
          servicesRevenue,
          totalRevenue,
          totalCosts,
          totalExpenses,
          profit,
          profitMargin,
          activeClientsCount: activeClients.length,
        };
      }),
    
    getMonthly: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        // Update client status based on overdue installments
        await db.updateClientStatusBasedOnInstallments();
        
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
        
        // Get all active clients MRR (only status='active')
        const allClients = await db.getAllClients();
        const activeClients = allClients.filter(c => c.status === 'active');
        const totalMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        
        // Also get new clients that started in this period
        const newClientsInPeriod = allClients.filter(c => {
          const clientStartDate = new Date(c.startDate);
          return c.status === 'active' && clientStartDate >= startDate && clientStartDate <= endDate;
        });
        const newClientsRevenue = newClientsInPeriod.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        
        // Get setup installments in this month (all, not just paid)
        const installments = await db.getInstallmentsByDateRange(startDate, endDate);
        const setupRevenue = installments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        // Get services in this month (all, not just paid)
        const services = await db.getServicesByDateRange(startDate, endDate);
        const servicesRevenue = services.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        
        // Get expenses and costs in this month
        const expenses = await db.getExpensesByDateRange(startDate, endDate);
        const totalCosts = expenses.filter(e => e.type === 'cost').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalAllExpenses = totalCosts + totalExpenses;
        
        // Calculate totals
        const totalRevenue = totalMRR + setupRevenue + servicesRevenue;
        const profit = totalRevenue - totalAllExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        
        return {
          totalMRR,
          setupRevenue,
          servicesRevenue,
          totalRevenue,
          totalCosts,
          totalExpenses,
          profit,
          profitMargin,
          activeClientsCount: activeClients.length,
        };
      }),
    
    getFutureProjection: protectedProcedure.query(async () => {
      const allInstallments = await db.getInstallmentsByDateRange(
        new Date(),
        new Date(new Date().getFullYear() + 2, 11, 31)
      );
      
      const pendingInstallments = allInstallments.filter(i => i.status === 'pending');
      const totalPending = pendingInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      
      // Group by month
      const byMonth: Record<string, number> = {};
      pendingInstallments.forEach(inst => {
        const key = `${inst.dueDate.getFullYear()}-${String(inst.dueDate.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = (byMonth[key] || 0) + parseFloat(inst.amount);
      });
      
      return {
        totalPending,
        byMonth,
      };
    }),
    
    getExpensesByCategory: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
        
        const expenses = await db.getExpensesByDateRange(startDate, endDate);
        
        // Group by category
        const byCategory: Record<string, number> = {};
        expenses.forEach(exp => {
          const category = exp.category || 'Outros';
          byCategory[category] = (byCategory[category] || 0) + parseFloat(exp.amount);
        });
        
        return byCategory;
      }),
    
    getSetupPendingBreakdown: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        const now = new Date(input.year, input.month - 1, 1);
        const thisMonthEnd = new Date(input.year, input.month, 0, 23, 59, 59);
        const next3MonthsEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59);
        
        const allInstallments = await db.getInstallmentsByDateRange(now, next3MonthsEnd);
        const pendingInstallments = allInstallments.filter(i => i.status === 'pending');
        
        const thisMonth = pendingInstallments
          .filter(i => i.dueDate <= thisMonthEnd)
          .reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        const next3Months = pendingInstallments
          .filter(i => i.dueDate > thisMonthEnd && i.dueDate <= next3MonthsEnd)
          .reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        const totalFuture = pendingInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        return {
          thisMonth,
          next3Months,
          totalFuture,
        };
      }),
    
    getAlerts: protectedProcedure.query(async () => {
      const alerts = [];
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Check for installments due in next 7 days
      const allInstallments = await db.getInstallmentsByDateRange(now, sevenDaysLater);
      const pendingDue = allInstallments.filter(i => i.status === 'pending');
      
      if (pendingDue.length > 0) {
        const totalDue = pendingDue.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        alerts.push({
          type: 'warning',
          title: 'Parcelas Vencendo',
          message: `${pendingDue.length} parcela(s) vencendo nos próximos 7 dias (R$ ${totalDue.toFixed(2)})`,
        });
      }
      
      return alerts;
    }),
    
    getCashFlowProjection: protectedProcedure.query(async () => {
      const now = new Date();
      const projection = [];
      
      // Get all active clients MRR
      const allClients = await db.getAllClients();
      const activeClients = allClients.filter(c => c.status === 'active');
      const monthlyMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
      
      // Project for next 3 months
      for (let i = 0; i < 3; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        
        // Get pending installments for this month
        const installments = await db.getInstallmentsByDateRange(monthDate, monthEnd);
        const pendingInstallments = installments.filter(i => i.status === 'pending');
        const installmentsRevenue = pendingInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        // Get expenses for this month
        const expenses = await db.getExpensesByDateRange(monthDate, monthEnd);
        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
        const entries = monthlyMRR + installmentsRevenue;
        const exits = totalExpenses;
        const balance = entries - exits;
        
        projection.push({
          month: monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          entries,
          exits,
          balance,
        });
      }
      
      return projection;
    }),
    
    getRevenueHistory: protectedProcedure.query(async () => {
      const history = [];
      const now = new Date();
      
      // Get last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        
        // Get all active clients MRR (only status='active')
        const allClients = await db.getAllClients();
        const activeClients = allClients.filter(c => c.status === 'active');
        const totalMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        
        // Also get new clients that started in this period
        const newClientsInPeriod = allClients.filter(c => {
          const clientStartDate = new Date(c.startDate);
          return c.status === 'active' && clientStartDate >= monthDate && clientStartDate <= monthEnd;
        });
        const newClientsRevenue = newClientsInPeriod.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        
        // Get paid installments in this month
        const installments = await db.getInstallmentsByDateRange(monthDate, monthEnd);
        const paidInstallments = installments.filter(i => i.status === 'paid');
        const installmentsRevenue = paidInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        // Get completed services in this month
        const services = await db.getServicesByDateRange(monthDate, monthEnd);
        const servicesRevenue = services.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        
        const totalRevenue = totalMRR + installmentsRevenue + servicesRevenue;
        
        history.push({
          month: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          revenue: totalRevenue,
          mrr: totalMRR,
          setup: installmentsRevenue,
          services: servicesRevenue,
        });
      }
      
      return history;
    }),
    
    getClientDetails: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) throw new Error("Client not found");
        
        const contracts = await db.getSetupContractsByClientId(input.clientId);
        const services = await db.getServicesByClientId(input.clientId);
        
        // Get all installments for all contracts
        const allInstallments = [];
        for (const contract of contracts) {
          const inst = await db.getInstallmentsByContractId(contract.id);
          allInstallments.push(...inst);
        }
        
        const paidInstallments = allInstallments.filter(i => i.status === 'paid');
        const pendingInstallments = allInstallments.filter(i => i.status === 'pending');
        
        const totalPaidSetup = paidInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        const totalPendingSetup = pendingInstallments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        const totalServices = services.filter(s => s.status === 'completed').reduce((sum, s) => sum + parseFloat(s.amount), 0);
        
        return {
          client,
          contracts,
          services,
          installments: allInstallments,
          summary: {
            mrr: parseFloat(client.mrr),
            totalPaidSetup,
            totalPendingSetup,
            totalServices,
            totalRevenue: parseFloat(client.mrr) + totalPaidSetup + totalServices,
          },
        };
      }),
  }),

  billing: router({
    getUpcomingCharges: protectedProcedure
      .input(z.object({ daysAhead: z.number().default(7) }))
      .query(async ({ input }) => {
        const clients = await db.getAllClients();
        const today = new Date();
        const futureDate = new Date(today.getTime() + input.daysAhead * 24 * 60 * 60 * 1000);
        
        const upcomingCharges: any[] = [];
        
        clients.forEach(client => {
          if (!client.billingDayOfMonth || client.status !== 'active') return;
          
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
              daysUntilDue: Math.ceil((nextBillingDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)),
            });
          }
        });
        
        return upcomingCharges.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      }),
    
    getOverdueCharges: protectedProcedure.query(async () => {
      const clients = await db.getAllClients();
      const today = new Date();
      
      const overdueCharges: any[] = [];
      
      clients.forEach(client => {
        if (!client.billingDayOfMonth || client.status !== 'active') return;
        
        const lastBillingDate = new Date(today.getFullYear(), today.getMonth(), client.billingDayOfMonth);
        if (lastBillingDate > today) {
          lastBillingDate.setMonth(lastBillingDate.getMonth() - 1);
        }
        
        if (lastBillingDate < today) {
          const daysOverdue = Math.ceil((today.getTime() - lastBillingDate.getTime()) / (24 * 60 * 60 * 1000));
          overdueCharges.push({
            clientId: client.id,
            clientName: client.name,
            amount: parseFloat(client.mrr),
            dueDate: lastBillingDate,
            daysOverdue,
          });
        }
      });
      
      return overdueCharges.sort((a, b) => b.daysOverdue - a.daysOverdue);
    }),
  }),

  dre: router({
    getMonthly: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        const monthStart = new Date(input.year, input.month - 1, 1);
        const monthEnd = new Date(input.year, input.month, 0, 23, 59, 59);
        
        // Get all active clients MRR for this month
        const allClients = await db.getAllClients();
        const activeClients = allClients.filter(c => c.status === 'active');
        const totalMRR = activeClients.reduce((sum, c) => sum + parseFloat(c.mrr), 0);
        
        // Get setup contracts closed in this month (regime de competência)
        const allContracts = await db.getAllSetupContracts();
        const contractsClosedThisMonth = allContracts.filter(c => {
          const startDate = new Date(c.startDate);
          return startDate >= monthStart && startDate <= monthEnd && c.status !== 'cancelled';
        });
        const totalSetup = contractsClosedThisMonth.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0);
        
        // Get services completed in this month
        const services = await db.getServicesByDateRange(monthStart, monthEnd);
        const servicesRevenue = services.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        
        // Calculate gross revenue
        const grossRevenue = totalMRR + totalSetup + servicesRevenue;
        
        // Get tax rate from settings
        const settings = await db.getCompanySettings();
        const taxRate = settings ? (typeof settings.taxRate === 'string' ? parseFloat(settings.taxRate) : settings.taxRate) : 11;
        const taxes = (grossRevenue * taxRate) / 100;
        const netRevenue = grossRevenue - taxes;
        
        // Get costs for this month
        const expenseHistory = await db.getExpenseHistoryByDateRange(monthStart, monthEnd);
        const costs = expenseHistory
          .filter(e => e.type === 'cost')
          .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
        const grossMargin = netRevenue - costs;
        
        // Get operating expenses for this month
        const expenses = expenseHistory
          .filter(e => e.type === 'expense')
          .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
        const netIncome = grossMargin - expenses;
        
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
          expenses,
          netIncome,
          grossMarginPercent: grossRevenue > 0 ? (grossMargin / grossRevenue) * 100 : 0,
          netIncomePercent: grossRevenue > 0 ? (netIncome / grossRevenue) * 100 : 0,
        };
      }),
    
    updateTaxRate: protectedProcedure
      .input(z.object({
        taxRate: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => {
        await db.updateCompanySettings({ taxRate: input.taxRate.toString() as any });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
