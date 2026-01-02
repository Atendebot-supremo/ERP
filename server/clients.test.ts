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

describe("clients API", () => {
  it("should create a client successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const clientData = {
      name: "Test Client",
      email: "client@example.com",
      phone: "+55 11 99999-9999",
      company: "Test Company",
      mrr: "1500.00",
      status: "active" as const,
      startDate: new Date("2025-01-01"),
      notes: "Test notes",
    };

    const result = await caller.clients.create(clientData);

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list clients", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const clients = await caller.clients.list();

    expect(Array.isArray(clients)).toBe(true);
  });

  it("should require authentication for client operations", async () => {
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

    await expect(caller.clients.list()).rejects.toThrow();
  });
});
