/**
 * analyse-hitrate.ts
 * Shows for each sponsor:
 *   - How many of their actual meetings came from their ranked list (top-N where N = quota)
 *   - That as a % of their total meetings
 *   - What the simulation best-case would have been (how many of their top-N were
 *     available in the pool at all — i.e. not already at cap before this sponsor ran)
 *
 * Run with: npx tsx server/analyse-hitrate.ts
 */

import * as db from "./db";
import { attendees } from "./attendees";

// Meeting quota per sponsor (matches run-match-v2.ts)
const QUOTA_OVERRIDES: Record<number, number> = {
  750001: 20, // SHL
  210001: 22, // Harver
  270002: 20, // Appcast
  390001: 12, // Bright Apply
  450001: 12, // PerchPeek
};

// Processing order from run-match-v2.ts (most-constrained first)
const ORDERED_SPONSOR_IDS = [
  750001, 210001, 270002, 150001, 180001, 240001, 300001, 330001, 360001,
  540001, 600001, 690001, 720001, 780001, 810001, 810002, 840001, 870001,
  900001, 450001, 390001,
];

const DELEGATE_MAX_MEETINGS = 8;

async function main() {
  const sponsors = await db.getAllSponsors();
  const allMeetings = await db.getAllMeetings();
  const activeMeetings = allMeetings.filter(
    (m: any) => m.status === "suggested" || m.status === "confirmed"
  );

  // Build map: sponsorId -> Set of attendeeIds they actually met
  const meetingMap = new Map<number, Set<string>>();
  for (const m of activeMeetings) {
    if (!meetingMap.has(m.sponsorId)) meetingMap.set(m.sponsorId, new Set());
    meetingMap.get(m.sponsorId)!.add(m.attendeeId);
  }

  // Get intake submissions for quota lookup
  const intakeRows: Record<number, any> = {};
  for (const sponsor of sponsors) {
    const intake = await db.getIntakeSubmissionBySponsor(sponsor.id);
    if (intake) intakeRows[sponsor.id] = intake;
  }

  // Get all rankings
  const rankingsMap = new Map<number, string[]>();
  for (const sponsor of sponsors) {
    const submissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
    const latest = submissions[0];
    if (latest) {
      rankingsMap.set(sponsor.id, JSON.parse(latest.rankingsData));
    }
  }

  // ─── Simulate best-case: replay the scheduling order ───
  // Track how many meetings each delegate "would have had" if we processed
  // sponsors in the original order and only counted ranked delegates.
  // This tells us: for each sponsor, how many of their top-N ranked delegates
  // were still under the 8-meeting cap when that sponsor was processed?
  const simulatedDelegateCounts = new Map<string, number>();

  // Initialise all delegates at 0
  for (const a of attendees) {
    simulatedDelegateCounts.set(a.id, 0);
  }

  const simulatedBestCase = new Map<number, number>();

  for (const sponsorId of ORDERED_SPONSOR_IDS) {
    const intake = intakeRows[sponsorId];
    const quota =
      QUOTA_OVERRIDES[sponsorId] ??
      (intake?.meetingPackage === "20" ? 20 : 12);

    const rankedList = rankingsMap.get(sponsorId) || [];
    const topN = rankedList.slice(0, quota);

    // Count how many of their top-N are still available (under cap)
    let available = 0;
    let assigned = 0;
    for (const delegateId of topN) {
      const currentCount = simulatedDelegateCounts.get(delegateId) ?? 0;
      if (currentCount < DELEGATE_MAX_MEETINGS) {
        available++;
        if (assigned < quota) {
          // Simulate assigning this meeting
          simulatedDelegateCounts.set(delegateId, currentCount + 1);
          assigned++;
        }
      }
    }

    simulatedBestCase.set(sponsorId, available);
  }

  // ─── Build output rows ───
  const rows: {
    sponsor: string;
    sponsorId: number;
    totalMeetings: number;
    fromTopN: number;
    hitRatePct: number;
    simBestCase: number;
    simBestCasePct: number;
  }[] = [];

  for (const sponsor of sponsors) {
    const actualMeetings = meetingMap.get(sponsor.id) || new Set<string>();
    if (actualMeetings.size === 0) continue;

    const intake = intakeRows[sponsor.id];
    const quota =
      QUOTA_OVERRIDES[sponsor.id] ??
      (intake?.meetingPackage === "20" ? 20 : 12);

    const rankedList = rankingsMap.get(sponsor.id) || [];
    const topN = rankedList.slice(0, quota);
    const fromTopN = topN.filter((id) => actualMeetings.has(id)).length;
    const hitRatePct =
      actualMeetings.size > 0
        ? Math.round((fromTopN / actualMeetings.size) * 100)
        : 0;

    const simBestCase = simulatedBestCase.get(sponsor.id) ?? 0;
    const simBestCasePct =
      quota > 0 ? Math.round((simBestCase / quota) * 100) : 0;

    rows.push({
      sponsor: sponsor.companyName,
      sponsorId: sponsor.id,
      totalMeetings: actualMeetings.size,
      fromTopN,
      hitRatePct,
      simBestCase,
      simBestCasePct,
    });
  }

  // Sort by actual hit rate descending
  rows.sort((a, b) => b.hitRatePct - a.hitRatePct);

  console.log(
    "\n=== SPONSOR RANKINGS HIT RATE vs SIMULATION BEST CASE ===\n"
  );
  console.log(
    "Sponsor                        | From Top-N | % of Meetings | Sim Best Case | Sim Best Case %"
  );
  console.log(
    "-------------------------------|------------|---------------|---------------|----------------"
  );
  for (const r of rows) {
    const name = r.sponsor.padEnd(30);
    const fromTopN = `${r.fromTopN}/${r.totalMeetings}`.padStart(10);
    const pct = `${r.hitRatePct}%`.padStart(13);
    const sim = String(r.simBestCase).padStart(13);
    const simPct = `${r.simBestCasePct}%`.padStart(15);
    console.log(`${name} |${fromTopN} |${pct} |${sim} |${simPct}`);
  }

  const avg = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.hitRatePct, 0) / rows.length)
    : 0;
  const avgSim = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.simBestCasePct, 0) / rows.length)
    : 0;

  console.log(`\nAverage actual hit rate:          ${avg}%`);
  console.log(`Average simulation best case:     ${avgSim}%`);

  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
