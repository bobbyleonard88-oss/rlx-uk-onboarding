/**
 * Tests for admin.loginAsSponsor procedure
 * Verifies that:
 * 1. Non-existent sponsors throw a clear error
 * 2. Sponsors without a linked userId throw a clear error
 * 3. The procedure is admin-only (non-admin callers are rejected)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests don't need a real database
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSponsorById: vi.fn(),
    getUserById: vi.fn(),
  };
});

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAdminCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-open-id",
    email: "admin@recruitmentevents.co",
    name: "Admin User",
    loginMethod: "email",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "sponsor-open-id",
    email: "sponsor@company.com",
    name: "Sponsor User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("admin.loginAsSponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when called by a non-admin user", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.admin.loginAsSponsor({ sponsorId: 1 })).rejects.toThrow();
  });

  it("throws when sponsor is not found", async () => {
    vi.mocked(db.getSponsorById).mockResolvedValue(null);
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.admin.loginAsSponsor({ sponsorId: 9999 })).rejects.toThrow("Sponsor not found");
  });

  it("throws when sponsor has no linked userId", async () => {
    vi.mocked(db.getSponsorById).mockResolvedValue({
      id: 1,
      userId: null,
      companyName: "Acme Corp",
      contactName: "John",
      contactEmail: "john@acme.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.admin.loginAsSponsor({ sponsorId: 1 })).rejects.toThrow(
      "Sponsor has no linked user account yet"
    );
  });

  it("returns a token and sponsorName when sponsor has a linked user", async () => {
    vi.mocked(db.getSponsorById).mockResolvedValue({
      id: 1,
      userId: 42,
      companyName: "Acme Corp",
      contactName: "John",
      contactEmail: "john@acme.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(db.getUserById).mockResolvedValue({
      id: 42,
      openId: "sponsor-open-id-42",
      name: "John Sponsor",
      email: "john@acme.com",
      role: "user",
      loginMethod: "email",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.loginAsSponsor({ sponsorId: 1 });

    expect(result).toHaveProperty("token");
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(10);
    expect(result.sponsorName).toBe("Acme Corp");
  });
});
