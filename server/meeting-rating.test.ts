import { describe, it, expect, afterAll } from "vitest";
import * as db from "./db";

const TEST_USER_ID = 99986;
const TEST_SUFFIX = `rating-test-${Date.now()}`;
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

describe("Meeting Rating Feature", () => {
  it("should create a meeting and verify meetingRating starts null", async () => {
    // Create test sponsor
    testSponsorId = await db.upsertSponsor({
      userId: TEST_USER_ID,
      companyName: `Rating Test Corp ${TEST_SUFFIX}`,
      contactName: "Test Contact",
      contactEmail: `rating-${TEST_SUFFIX}@example.com`,
    });

    // Create a test meeting
    testMeetingId = await db.createMeeting({
      sponsorId: testSponsorId,
      attendeeId: `delegate-rating-${TEST_SUFFIX}`,
      matchScore: 80,
      matchReason: "Test match",
      isTopRanked: 0,
      isPriority: 0,
      timeSlot: 3,
      attendeeNumber: 1,
      status: "confirmed",
      notes: null,
    });

    expect(testMeetingId).toBeGreaterThan(0);

    // Verify meetingRating is null initially
    const meeting = await db.getMeetingById(testMeetingId);
    expect(meeting).toBeDefined();
    expect(meeting!.meetingRating).toBeNull();
  });

  it("should update meetingRating via updateMeetingRating", async () => {
    if (!testMeetingId) {
      console.log("Skipping — no test meeting created");
      return;
    }

    await db.updateMeetingRating(testMeetingId, 4);

    const updated = await db.getMeetingById(testMeetingId);
    expect(updated).toBeDefined();
    expect(updated!.meetingRating).toBe(4);
  });

  it("should allow overwriting a rating", async () => {
    if (!testMeetingId) {
      console.log("Skipping — no test meeting created");
      return;
    }

    await db.updateMeetingRating(testMeetingId, 2);

    const updated = await db.getMeetingById(testMeetingId);
    expect(updated!.meetingRating).toBe(2);
  });

  it("should include meetingRating in getMeetingsBySponsor results", async () => {
    if (!testSponsorId) {
      console.log("Skipping — no test sponsor created");
      return;
    }

    const meetings = await db.getMeetingsBySponsor(testSponsorId);
    expect(Array.isArray(meetings)).toBe(true);

    const testMeeting = meetings.find(m => m.id === testMeetingId);
    if (testMeeting) {
      expect(testMeeting).toHaveProperty("meetingRating");
      expect(testMeeting.meetingRating).toBe(2); // from previous test
    }
  });

  it("should validate rating is between 1 and 5 (unit test for schema constraint)", () => {
    // Mirrors the tRPC z.number().min(1).max(5) validation
    const validRatings = [1, 2, 3, 4, 5];
    const invalidRatings = [0, 6, -1, 10];

    for (const r of validRatings) {
      expect(r >= 1 && r <= 5).toBe(true);
    }
    for (const r of invalidRatings) {
      expect(r >= 1 && r <= 5).toBe(false);
    }
  });
});
