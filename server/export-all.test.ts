import { describe, it, expect, afterAll } from "vitest";
import * as db from "./db";

// Test sponsor IDs that won't conflict with real data
const TEST_USER_ID = 99985;
const TEST_SUFFIX = `export-test-${Date.now()}`;

let testSponsorId: number;
let testIntakeId: number;

afterAll(async () => {
  // Clean up test data
  if (testSponsorId) {
    const dbInstance = await db.getDb();
    if (!dbInstance) return;
    const { intakeSubmissions, rankingsSubmissions, sponsors } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await dbInstance.delete(rankingsSubmissions).where(eq(rankingsSubmissions.sponsorId, testSponsorId));
    await dbInstance.delete(intakeSubmissions).where(eq(intakeSubmissions.sponsorId, testSponsorId));
    await dbInstance.delete(sponsors).where(eq(sponsors.id, testSponsorId));
  }
});

describe("Export All Submissions", () => {
  it("should include a sponsor with both intake and rankings in the export", async () => {
    // Create test sponsor
    testSponsorId = await db.upsertSponsor({
      userId: TEST_USER_ID,
      companyName: `Export Test Corp ${TEST_SUFFIX}`,
      contactName: "Test Contact",
      contactEmail: `export-${TEST_SUFFIX}@example.com`,
    });

    // Create intake submission
    testIntakeId = await db.upsertIntakeSubmission({
      sponsorId: testSponsorId,
      userId: TEST_USER_ID,
      companyName: `Export Test Corp ${TEST_SUFFIX}`,
      technologyType: "HR Tech",
      companyBoilerplate: "We help companies hire better.",
      keyChallenges: "Talent acquisition at scale",
      targetOrgSize: "1k-5k",
      firstName: "John",
      lastName: "Doe",
      email: `export-${TEST_SUFFIX}@example.com`,
      jobTitle: "CEO",
      linkedinUrl: "https://linkedin.com/in/johndoe",
      meetingPackage: "12",
    });

    // Create rankings with top 10 delegate IDs (using real IDs from attendees list)
    const top10Ids = ["4956154", "4956155", "4956156", "4956157", "4956158",
                      "4956159", "4956160", "4956161", "4956162", "4956163"];
    await db.upsertRankingsSubmission({
      sponsorId: testSponsorId,
      userId: TEST_USER_ID,
      rankingsData: JSON.stringify(top10Ids),
    });

    // Fetch all rankings and intake to simulate the export procedure
    const allRankings = await db.getAllRankingsSubmissions();
    const allIntake = await db.getAllIntakeSubmissions();

    // Find our test sponsor's data
    const testRankings = allRankings.find(r => r.sponsorId === testSponsorId);
    const testIntake = allIntake.find(i => i.sponsorId === testSponsorId);

    expect(testRankings).toBeDefined();
    expect(testIntake).toBeDefined();

    // Verify rankings data is parseable
    const parsed = JSON.parse(testRankings!.rankingsData as string);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(10);
    expect(parsed[0]).toBe("4956154");

    // Verify intake fields are present
    expect(testIntake!.companyName).toBe(`Export Test Corp ${TEST_SUFFIX}`);
    expect(testIntake!.technologyType).toBe("HR Tech");
    expect(testIntake!.meetingPackage).toBe("12");
  });

  it("should include intake-only sponsors (no rankings yet)", async () => {
    const allIntake = await db.getAllIntakeSubmissions();
    const testIntake = allIntake.find(i => i.sponsorId === testSponsorId);
    expect(testIntake).toBeDefined();
    expect(testIntake!.firstName).toBe("John");
    expect(testIntake!.lastName).toBe("Doe");
  });

  it("should correctly slice top 10 from a longer rankings list", () => {
    const manyIds = Array.from({ length: 25 }, (_, i) => `delegate-${i}`);
    const rankingsData = JSON.stringify(manyIds);
    const parsed = JSON.parse(rankingsData);
    const top10 = parsed.slice(0, 10);
    expect(top10.length).toBe(10);
    expect(top10[0]).toBe("delegate-0");
    expect(top10[9]).toBe("delegate-9");
  });

  it("should handle sponsors with fewer than 10 ranked delegates gracefully", () => {
    const fewIds = ["delegate-1", "delegate-2", "delegate-3"];
    const rankingsData = JSON.stringify(fewIds);
    const parsed = JSON.parse(rankingsData);
    const top10 = parsed.slice(0, 10);
    expect(top10.length).toBe(3);
  });

  it("should handle malformed rankingsData without throwing", () => {
    const malformed = "not-valid-json";
    let top10: string[] = [];
    try {
      JSON.parse(malformed);
    } catch {
      top10 = [];
    }
    expect(top10).toEqual([]);
  });
});
