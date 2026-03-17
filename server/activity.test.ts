/**
 * Tests for sponsor activity tracking and admin impersonation token procedures
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-open-id",
    email: "admin@rlx.com",
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
    res: {} as TrpcContext["res"],
  };
}

function createSponsorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 99,
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
    res: {} as TrpcContext["res"],
  };
}

// Mock the db module to avoid real DB calls in unit tests
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSponsorByUserId: vi.fn().mockResolvedValue({
      id: 5,
      userId: 99,
      companyName: "Test Sponsor Co",
      contactName: "Test Contact",
      contactEmail: "contact@test.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    logSponsorActivity: vi.fn().mockResolvedValue(undefined),
    getAllSponsorActivityLog: vi.fn().mockResolvedValue([]),
    getLastLoginBySponsor: vi.fn().mockResolvedValue([]),
    getUserById: vi.fn().mockResolvedValue({
      id: 99,
      openId: "sponsor-open-id",
      email: "sponsor@company.com",
      name: "Sponsor User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }),
  };
});

describe("sponsor.trackActivity", () => {
  it("records a login event for a sponsor user", async () => {
    const ctx = createSponsorContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sponsor.trackActivity({ eventType: "login" });
    expect(result).toEqual({ success: true });
  });

  it("records a download event with type and label", async () => {
    const ctx = createSponsorContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sponsor.trackActivity({
      eventType: "download",
      downloadType: "schedule_csv",
      downloadLabel: "Meeting Schedule CSV",
    });
    expect(result).toEqual({ success: true });
  });
});

describe("admin.getSponsorActivityLog", () => {
  it("returns an empty array when no activity exists", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.getSponsorActivityLog({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("admin.getSponsorLastLogins", () => {
  it("returns an array of sponsor last login records", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.getSponsorLastLogins();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("admin.createImpersonationToken", () => {
  it("returns a JWT token string for a valid user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.createImpersonationToken({ targetUserId: 99 });
    expect(result).toHaveProperty("token");
    expect(typeof result.token).toBe("string");
    expect(result.token.split(".")).toHaveLength(3); // JWT has 3 parts
  });
});
