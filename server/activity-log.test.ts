import { describe, it, expect, afterAll } from "vitest";
import * as db from "./db";

const TEST_ADMIN_ID = 99991;
const TEST_ADMIN_NAME = "Test Admin (Activity Log)";

afterAll(async () => {
  // Clean up test entries
  const dbInstance = await db.getDb();
  if (!dbInstance) return;
  const { adminActivityLog } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await dbInstance.delete(adminActivityLog).where(eq(adminActivityLog.adminId, TEST_ADMIN_ID));
});

describe("Admin Activity Log", () => {
  it("should insert a log entry and retrieve it", async () => {
    await db.logAdminActivity({
      adminId: TEST_ADMIN_ID,
      adminName: TEST_ADMIN_NAME,
      action: "reviewed",
      entityType: "submission",
      entityId: "42",
      entityName: "Acme Corp",
      details: "Rankings marked as reviewed",
    });

    const logs = await db.getAdminActivityLog(10);
    const entry = logs.find(
      (l) => l.adminId === TEST_ADMIN_ID && l.action === "reviewed"
    );

    expect(entry).toBeDefined();
    expect(entry?.adminName).toBe(TEST_ADMIN_NAME);
    expect(entry?.entityName).toBe("Acme Corp");
    expect(entry?.entityType).toBe("submission");
    expect(entry?.details).toBe("Rankings marked as reviewed");
  });

  it("should return entries in descending order (newest first)", async () => {
    // Insert two more entries
    await db.logAdminActivity({
      adminId: TEST_ADMIN_ID,
      adminName: TEST_ADMIN_NAME,
      action: "archived",
      entityType: "sponsor",
      entityId: "1",
      entityName: "First Corp",
      details: null,
    });

    await db.logAdminActivity({
      adminId: TEST_ADMIN_ID,
      adminName: TEST_ADMIN_NAME,
      action: "published_meetings",
      entityType: "sponsor",
      entityId: "2",
      entityName: "Second Corp",
      details: "5 meetings published",
    });

    const logs = await db.getAdminActivityLog(50);
    const testLogs = logs.filter((l) => l.adminId === TEST_ADMIN_ID);

    // Should be newest first
    expect(testLogs.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < testLogs.length; i++) {
      expect(new Date(testLogs[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(testLogs[i].createdAt).getTime()
      );
    }
  });

  it("should respect the limit parameter", async () => {
    const logs = await db.getAdminActivityLog(1);
    expect(logs.length).toBeLessThanOrEqual(1);
  });

  it("should store all action types correctly", async () => {
    const actions = ["cleared_meetings", "meetings_made_visible", "meetings_hidden", "unarchived"];

    for (const action of actions) {
      await db.logAdminActivity({
        adminId: TEST_ADMIN_ID,
        adminName: TEST_ADMIN_NAME,
        action,
        entityType: "sponsor",
        entityId: "99",
        entityName: "Test Sponsor",
        details: `Test: ${action}`,
      });
    }

    const logs = await db.getAdminActivityLog(200);
    const testLogs = logs.filter((l) => l.adminId === TEST_ADMIN_ID);
    const storedActions = testLogs.map((l) => l.action);

    for (const action of actions) {
      expect(storedActions).toContain(action);
    }
  });
});
