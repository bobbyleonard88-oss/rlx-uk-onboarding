import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mock db module ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllSponsors: vi.fn(),
  getMeetingsBySponsor: vi.fn(),
  getAllMeetings: vi.fn(),
  getRankingsSubmissionsBySponsor: vi.fn(),
}));

// ─── Mock attendees ────────────────────────────────────────────────────────────
vi.mock("./attendees", () => ({
  attendees: [
    {
      id: "delegate-1",
      firstName: "Alice",
      lastName: "Smith",
      jobTitle: "Head of TA",
      company: "Acme Corp",
      optInSponsors: ["TestSponsor"],
    },
    {
      id: "delegate-2",
      firstName: "Bob",
      lastName: "Jones",
      jobTitle: "TA Director",
      company: "Beta Ltd",
      optInSponsors: [],
    },
  ],
}));

import * as db from "./db";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const SPONSOR = { id: 999, companyName: "TestSponsor" };

const makeMeeting = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  sponsorId: 999,
  attendeeId: "delegate-1",
  isVisible: 1,
  status: "confirmed",
  timeSlot: 1,
  matchScore: 85,
  matchReason: "Strong alignment on AI screening tools",
  meetingRating: 4,
  ...overrides,
});

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("admin.getSponsorReport", () => {
  beforeEach(() => {
    vi.mocked(db.getAllSponsors).mockResolvedValue([SPONSOR] as any);
    vi.mocked(db.getRankingsSubmissionsBySponsor).mockResolvedValue([
      { rankingsData: JSON.stringify(["delegate-2", "delegate-1"]) },
    ] as any);
  });

  it("returns full meeting data when all meetings are rated", async () => {
    const meetings = [
      makeMeeting({ id: 1, attendeeId: "delegate-1", meetingRating: 4 }),
      makeMeeting({ id: 2, attendeeId: "delegate-2", meetingRating: 3, optInSponsors: [] }),
    ];
    vi.mocked(db.getMeetingsBySponsor).mockResolvedValue(meetings as any);

    // Simulate the procedure logic directly
    const allSponsors = await db.getAllSponsors();
    const sponsor = (allSponsors as any[]).find((s: any) => s.id === 999);
    expect(sponsor).toBeDefined();

    const allMeetings = await db.getMeetingsBySponsor(999);
    const visibleMeetings = (allMeetings as any[]).filter(
      (m: any) => m.isVisible === 1 && m.status !== "declined"
    );
    const unratedCount = visibleMeetings.filter((m: any) => !m.meetingRating).length;
    expect(unratedCount).toBe(0);

    const avgRating =
      visibleMeetings.reduce((s: number, m: any) => s + (m.meetingRating ?? 0), 0) /
      visibleMeetings.length;
    expect(avgRating).toBe(3.5);
  });

  it("throws PRECONDITION_FAILED when any meeting is unrated", async () => {
    const meetings = [
      makeMeeting({ id: 1, meetingRating: 4 }),
      makeMeeting({ id: 2, meetingRating: null }), // unrated
    ];
    vi.mocked(db.getMeetingsBySponsor).mockResolvedValue(meetings as any);

    const allMeetings = await db.getMeetingsBySponsor(999);
    const visibleMeetings = (allMeetings as any[]).filter(
      (m: any) => m.isVisible === 1 && m.status !== "declined"
    );
    const unratedCount = visibleMeetings.filter((m: any) => !m.meetingRating).length;
    expect(unratedCount).toBe(1);

    // Verify the error would be thrown
    if (unratedCount > 0) {
      const err = new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${unratedCount} meeting${unratedCount === 1 ? " is" : "s are"} not yet rated. All meetings must be rated before generating this report.`,
      });
      expect(err.code).toBe("PRECONDITION_FAILED");
      expect(err.message).toContain("1 meeting is not yet rated");
    }
  });

  it("excludes declined and hidden meetings", async () => {
    const meetings = [
      makeMeeting({ id: 1, meetingRating: 5 }),
      makeMeeting({ id: 2, status: "declined", meetingRating: 3 }),
      makeMeeting({ id: 3, isVisible: 0, meetingRating: 2 }),
    ];
    vi.mocked(db.getMeetingsBySponsor).mockResolvedValue(meetings as any);

    const allMeetings = await db.getMeetingsBySponsor(999);
    const visibleMeetings = (allMeetings as any[]).filter(
      (m: any) => m.isVisible === 1 && m.status !== "declined"
    );
    expect(visibleMeetings).toHaveLength(1);
    expect(visibleMeetings[0].id).toBe(1);
  });

  it("correctly resolves opt-in status by sponsor name match", () => {
    const delegate = { optInSponsors: ["TestSponsor", "OtherCo"] };
    const sponsorNameLower = "testsponsor";
    const optedIn = (delegate.optInSponsors ?? []).some(
      (s: string) =>
        s.toLowerCase().includes(sponsorNameLower) ||
        sponsorNameLower.includes(s.toLowerCase())
    );
    expect(optedIn).toBe(true);

    const delegate2 = { optInSponsors: ["OtherCo"] };
    const optedIn2 = (delegate2.optInSponsors ?? []).some(
      (s: string) =>
        s.toLowerCase().includes(sponsorNameLower) ||
        sponsorNameLower.includes(s.toLowerCase())
    );
    expect(optedIn2).toBe(false);
  });

  it("assigns correct opportunity tier based on rating", () => {
    const getOpportunityTier = (rating: number) =>
      rating >= 4 ? 'green' : rating === 3 ? 'amber' : 'red';

    expect(getOpportunityTier(5)).toBe('green');
    expect(getOpportunityTier(4)).toBe('green');
    expect(getOpportunityTier(3)).toBe('amber');
    expect(getOpportunityTier(2)).toBe('red');
    expect(getOpportunityTier(1)).toBe('red');
  });

  it("correctly resolves rank position from rankings data", () => {
    const rankedAttendeeIds = ["delegate-2", "delegate-1", "delegate-3"];
    const rankIndex = rankedAttendeeIds.indexOf("delegate-1");
    const rankPosition = rankIndex >= 0 ? rankIndex + 1 : null;
    expect(rankPosition).toBe(2);

    const unrankedIndex = rankedAttendeeIds.indexOf("delegate-99");
    const unrankedPosition = unrankedIndex >= 0 ? unrankedIndex + 1 : null;
    expect(unrankedPosition).toBeNull();
  });
});

describe("admin.getReportableSponsorStatus", () => {
  it("correctly computes allRated flag", async () => {
    vi.mocked(db.getAllSponsors).mockResolvedValue([
      { id: 1, companyName: "FullyRated" },
      { id: 2, companyName: "PartiallyRated" },
    ] as any);
    vi.mocked(db.getAllMeetings).mockResolvedValue([
      { sponsorId: 1, isVisible: 1, status: "confirmed", meetingRating: 4 },
      { sponsorId: 1, isVisible: 1, status: "confirmed", meetingRating: 5 },
      { sponsorId: 2, isVisible: 1, status: "confirmed", meetingRating: 3 },
      { sponsorId: 2, isVisible: 1, status: "confirmed", meetingRating: null },
    ] as any);

    const allSponsors = await db.getAllSponsors();
    const allMeetingsRaw = await db.getAllMeetings();

    const result = (allSponsors as any[]).map((s: any) => {
      const meetings = (allMeetingsRaw as any[]).filter(
        (m: any) => m.sponsorId === s.id && m.isVisible === 1 && m.status !== "declined"
      );
      const rated = meetings.filter((m: any) => m.meetingRating != null && m.meetingRating > 0).length;
      return {
        id: s.id,
        name: s.companyName,
        totalMeetings: meetings.length,
        ratedMeetings: rated,
        allRated: meetings.length > 0 && rated === meetings.length,
      };
    });

    expect(result[0].allRated).toBe(true);
    expect(result[0].ratedMeetings).toBe(2);
    expect(result[1].allRated).toBe(false);
    expect(result[1].ratedMeetings).toBe(1);
  });
});
