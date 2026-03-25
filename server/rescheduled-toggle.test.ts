import { describe, it, expect, afterAll } from "vitest";
import * as db from "./db";

const TEST_USER_ID = 99987;
const TEST_SUFFIX = `rescheduled-test-${Date.now()}`;
let testSponsorId: number;
let testMeetingId: number;

afterAll(async () => {
  if (testSponsorId) {
    const dbInstance = await db.getDb();
    if (!dbInstance) return;
    const { meetings, sponsors } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    if (testMeetingId) {
      await dbInstance.delete(meetings).where(eq(meetings.id, testMeetingId));
    }
    await dbInstance.delete(sponsors).where(eq(sponsors.id, testSponsorId));
  }
});

describe("Rescheduled Meeting Toggle", () => {
  it("should create a meeting with isRescheduled defaulting to 0", async () => {
    testSponsorId = await db.upsertSponsor({
      userId: TEST_USER_ID,
      companyName: `Rescheduled Test Corp ${TEST_SUFFIX}`,
      contactName: "Test Contact",
      contactEmail: `rescheduled-${TEST_SUFFIX}@example.com`,
    });

    testMeetingId = await db.createMeeting({
      sponsorId: testSponsorId,
      attendeeId: `delegate-rescheduled-${TEST_SUFFIX}`,
      matchScore: 75,
      matchReason: "Test match",
      isTopRanked: 0,
      isPriority: 0,
      timeSlot: 2,
      attendeeNumber: 1,
      status: "confirmed",
      notes: null,
    });

    expect(testMeetingId).toBeGreaterThan(0);

    const meeting = await db.getMeetingById(testMeetingId);
    expect(meeting).toBeDefined();
    // isRescheduled defaults to 0 (not rescheduled)
    expect(meeting!.isRescheduled ?? 0).toBe(0);
  });

  it("should mark a meeting as rescheduled", async () => {
    if (!testMeetingId) {
      console.log("Skipping — no test meeting created");
      return;
    }

    await db.toggleMeetingRescheduled(testMeetingId, true);

    const updated = await db.getMeetingById(testMeetingId);
    expect(updated).toBeDefined();
    expect(updated!.isRescheduled).toBe(1);
  });

  it("should unmark a meeting as rescheduled", async () => {
    if (!testMeetingId) {
      console.log("Skipping — no test meeting created");
      return;
    }

    await db.toggleMeetingRescheduled(testMeetingId, false);

    const updated = await db.getMeetingById(testMeetingId);
    expect(updated).toBeDefined();
    expect(updated!.isRescheduled).toBe(0);
  });

  it("should toggle back to rescheduled again", async () => {
    if (!testMeetingId) {
      console.log("Skipping — no test meeting created");
      return;
    }

    await db.toggleMeetingRescheduled(testMeetingId, true);

    const updated = await db.getMeetingById(testMeetingId);
    expect(updated!.isRescheduled).toBe(1);
  });

  it("getRescheduledMeetings should include the starred meeting", async () => {
    if (!testMeetingId) {
      console.log("Skipping — no test meeting created");
      return;
    }

    const rescheduled = await db.getRescheduledMeetings();
    expect(Array.isArray(rescheduled)).toBe(true);

    const found = rescheduled.find((m: any) => m.id === testMeetingId);
    expect(found).toBeDefined();
    expect(found!.isRescheduled).toBe(1);
  });
});
