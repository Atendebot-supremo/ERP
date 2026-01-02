import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("metrics API", () => {
  it("should calculate monthly metrics correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const now = new Date();
    const result = await caller.metrics.getMonthly({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });

    expect(result).toHaveProperty("totalMRR");
    expect(result).toHaveProperty("installmentsRevenue");
    expect(result).toHaveProperty("servicesRevenue");
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("totalExpenses");
    expect(result).toHaveProperty("profit");
    expect(result).toHaveProperty("profitMargin");
    expect(result).toHaveProperty("activeClientsCount");

    expect(typeof result.totalMRR).toBe("number");
    expect(typeof result.totalRevenue).toBe("number");
    expect(typeof result.profit).toBe("number");
    expect(typeof result.profitMargin).toBe("number");
  });

  it("should calculate profit correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const now = new Date();
    const result = await caller.metrics.getMonthly({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });

    const expectedProfit = result.totalRevenue - result.totalExpenses;
    expect(result.profit).toBeCloseTo(expectedProfit, 2);
  });

  it("should calculate profit margin correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const now = new Date();
    const result = await caller.metrics.getMonthly({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });

    if (result.totalRevenue > 0) {
      const expectedMargin = (result.profit / result.totalRevenue) * 100;
      expect(result.profitMargin).toBeCloseTo(expectedMargin, 1);
    } else {
      expect(result.profitMargin).toBe(0);
    }
  });

  it("should get future projection", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.metrics.getFutureProjection();

    expect(result).toHaveProperty("totalPending");
    expect(result).toHaveProperty("byMonth");
    expect(typeof result.totalPending).toBe("number");
    expect(typeof result.byMonth).toBe("object");
  });

  it("should require authentication for metrics", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const now = new Date();

    await expect(
      caller.metrics.getMonthly({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      })
    ).rejects.toThrow();
  });
});
