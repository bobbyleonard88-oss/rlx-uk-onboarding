/**
 * Re-weight Simulation — Proper Counterfactual
 *
 * For each sponsor that has rated meetings, we:
 * 1. Score ALL 38 delegates under each formula
 * 2. Select the top N (same N as their actual meeting count)
 * 3. Check which of those top-N delegates were actually rated
 * 4. Average the actual ratings of the selected delegates we have data for
 *
 * This tells us: "If we had used this formula, which meetings would we have had,
 * and based on the ratings we DO have, what would the average have been?"
 *
 * Formulas tested:
 *   Current:  AI score (base) + opt-in boost (+15) + rank bonus (up to +20)
 *   Proposed: rank 55% + AI 40% + opt-in 5%  (rankings primary)
 *   PureRank: rank 70% + AI 30%  (no opt-in at all)
 *
 * Note: For delegates with no AI score on record, we use 50 as a neutral baseline.
 * For delegates not in a sponsor's ranking, rankNorm = 0 (they'd only be selected
 * if AI score is high enough).
 */
import * as dotenv from "dotenv";
dotenv.config();
import * as db from "./db";
import { attendees } from "./attendees";

const NUM_DELEGATES = 38;
const activeAttendeeIds = new Set(attendees.map(a => String(a.id)));
const attendeeMap = new Map(attendees.map(a => [String(a.id), a]));

// Sponsor quotas (meeting counts)
const SPONSOR_QUOTAS: Record<number, number> = {
  750001: 24, // SHL
  210001: 20, // Harver
  270002: 20, // Appcast
  870001: 12, // Wilson
  390001: 10, // Bright Apply
  450001: 12, // PerchPeek
};
const DEFAULT_QUOTA = 12;

function avg(arr: number[]): string {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "n/a";
}

function avgNum(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

async function main() {
  const allSponsors = await db.getAllSponsors();

  // Collect all rated meetings across all sponsors for reference
  type RatedMeeting = {
    sponsorId: number;
    attendeeId: string;
    matchScore: number;
    rating: number;
  };
  const allRatedMeetings: RatedMeeting[] = [];

  // Per-sponsor data
  type SponsorSim = {
    sponsorId: number;
    sponsorName: string;
    quota: number;
    // All 38 delegates scored
    allScores: {
      attendeeId: string;
      name: string;
      rankPos: number | null;
      matchScore: number;
      optedIn: boolean;
      currentScore: number;
      proposedScore: number;
      pureRankScore: number;
      actualRating: number | null; // null if not rated
    }[];
  };
  const sponsorSims: SponsorSim[] = [];

  for (const sponsor of allSponsors as any[]) {
    const meetings = await db.getMeetingsBySponsor(sponsor.id);
    const ratedMeetings = (meetings as any[]).filter((m: any) => m.meetingRating != null);
    if (ratedMeetings.length === 0) continue;

    // Build rating lookup for this sponsor
    const ratingByAttendee = new Map<string, number>();
    const matchScoreByAttendee = new Map<string, number>();
    for (const m of ratedMeetings) {
      ratingByAttendee.set(String(m.attendeeId), m.meetingRating);
      matchScoreByAttendee.set(String(m.attendeeId), m.matchScore ?? 50);
      allRatedMeetings.push({
        sponsorId: sponsor.id,
        attendeeId: String(m.attendeeId),
        matchScore: m.matchScore ?? 50,
        rating: m.meetingRating,
      });
    }

    // Also get match scores for unrated meetings (so we can score all delegates)
    const allMeetings = (meetings as any[]);
    const matchScoreAll = new Map<string, number>();
    for (const m of allMeetings) {
      matchScoreAll.set(String(m.attendeeId), m.matchScore ?? 50);
    }

    // Get rankings for this sponsor
    const submissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
    const latestSubmission = (submissions as any[]).find((s: any) => s.isReviewed === 1) ?? (submissions as any[])[0];
    let ranked: string[] = [];
    if (latestSubmission?.rankingsData) {
      try {
        const parsed = typeof latestSubmission.rankingsData === "string"
          ? JSON.parse(latestSubmission.rankingsData)
          : latestSubmission.rankingsData;
        ranked = (Array.isArray(parsed) ? parsed : parsed.rankings ?? [])
          .map((id: any) => String(id))
          .filter((id: string) => activeAttendeeIds.has(id));
      } catch {}
    }

    const quota = SPONSOR_QUOTAS[sponsor.id] ?? DEFAULT_QUOTA;

    // Score ALL 38 delegates
    const allScores: SponsorSim["allScores"] = [];
    for (const attendee of attendees) {
      const aid = String(attendee.id);
      const optInSponsors: string[] = (attendee as any).optInSponsors ?? [];
      const optedIn = optInSponsors.some((name: string) =>
        sponsor.companyName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(sponsor.companyName.toLowerCase())
      );
      const rankIndex = ranked.indexOf(aid);
      const rankPos = rankIndex >= 0 ? rankIndex + 1 : null;

      // Use actual match score if we have it, otherwise 50 (neutral)
      const matchScore = matchScoreAll.get(aid) ?? 50;

      // Current: AI + opt-in boost + rank bonus
      const optinBoost = optedIn ? 15 : 0;
      const rankBonus = rankPos ? ((NUM_DELEGATES - rankPos + 1) / NUM_DELEGATES) * 20 : 0;
      const currentScore = matchScore + optinBoost + rankBonus;

      // Proposed: rank 55% + AI 40% + opt-in 5%
      const rankNorm = rankPos ? ((NUM_DELEGATES - rankPos + 1) / NUM_DELEGATES) * 100 : 0;
      const optinNorm = optedIn ? 100 : 0;
      const proposedScore = rankNorm * 0.55 + matchScore * 0.40 + optinNorm * 0.05;

      // Pure rank: rank 70% + AI 30%
      const pureRankScore = rankNorm * 0.70 + matchScore * 0.30;

      allScores.push({
        attendeeId: aid,
        name: `${(attendee as any).firstName} ${(attendee as any).lastName}`,
        rankPos,
        matchScore,
        optedIn,
        currentScore,
        proposedScore,
        pureRankScore,
        actualRating: ratingByAttendee.get(aid) ?? null,
      });
    }

    sponsorSims.push({
      sponsorId: sponsor.id,
      sponsorName: sponsor.companyName,
      quota,
      allScores,
    });
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" RE-WEIGHT SIMULATION (counterfactual across all 38 delegates)");
  console.log(`  Sponsors with rated meetings: ${sponsorSims.length}`);
  console.log(`  Total rated meetings: ${allRatedMeetings.length}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // For each formula, select top-N delegates per sponsor and collect their ratings
  type FormulaResult = {
    selectedWithRatings: number[];
    selectedTotal: number;
    ratedCount: number;
    droppedMeetings: { sponsor: string; name: string; rankPos: number | null; matchScore: number; optedIn: boolean; rating: number }[];
    addedUnrated: { sponsor: string; name: string; rankPos: number | null; matchScore: number; optedIn: boolean }[];
  };

  function simulate(scoreKey: "currentScore" | "proposedScore" | "pureRankScore"): FormulaResult {
    const selectedWithRatings: number[] = [];
    let selectedTotal = 0;
    let ratedCount = 0;
    const droppedMeetings: FormulaResult["droppedMeetings"] = [];
    const addedUnrated: FormulaResult["addedUnrated"] = [];

    for (const sim of sponsorSims) {
      const sorted = [...sim.allScores].sort((a, b) => b[scoreKey] - a[scoreKey]);
      const topN = sorted.slice(0, sim.quota);
      const topNIds = new Set(topN.map(d => d.attendeeId));

      // Which rated meetings survive?
      const currentRated = sim.allScores.filter(d => d.actualRating !== null);
      for (const d of currentRated) {
        if (topNIds.has(d.attendeeId)) {
          selectedWithRatings.push(d.actualRating!);
          ratedCount++;
        } else {
          droppedMeetings.push({
            sponsor: sim.sponsorName,
            name: d.name,
            rankPos: d.rankPos,
            matchScore: d.matchScore,
            optedIn: d.optedIn,
            rating: d.actualRating!,
          });
        }
      }

      // Which new (unrated) delegates would be added?
      for (const d of topN) {
        if (d.actualRating === null) {
          addedUnrated.push({
            sponsor: sim.sponsorName,
            name: d.name,
            rankPos: d.rankPos,
            matchScore: d.matchScore,
            optedIn: d.optedIn,
          });
        }
      }

      selectedTotal += sim.quota;
    }

    return { selectedWithRatings, selectedTotal, ratedCount, droppedMeetings, addedUnrated };
  }

  const current = simulate("currentScore");
  const proposed = simulate("proposedScore");
  const pureRank = simulate("pureRankScore");

  const currentAvg = avgNum(current.selectedWithRatings);
  const proposedAvg = avgNum(proposed.selectedWithRatings);
  const pureRankAvg = avgNum(pureRank.selectedWithRatings);

  console.log("─────────────────────────────────────────────────────────────");
  console.log(" SCENARIO COMPARISON");
  console.log(" (avg rating = average of rated meetings that survive each formula's selection)");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  Actual 2026 (AI + opt-in boost):           ${currentAvg.toFixed(2)} ★  (${current.ratedCount} rated meetings kept)`);
  console.log(`  Proposed (Rank 55% + AI 40% + optin 5%):   ${proposedAvg.toFixed(2)} ★  (${proposed.ratedCount} rated kept, ${proposed.droppedMeetings.length} dropped, ${proposed.addedUnrated.length} new unrated)`);
  console.log(`  Pure rankings (Rank 70% + AI 30%):          ${pureRankAvg.toFixed(2)} ★  (${pureRank.ratedCount} rated kept, ${pureRank.droppedMeetings.length} dropped, ${pureRank.addedUnrated.length} new unrated)`);

  // Show what gets dropped under proposed
  if (proposed.droppedMeetings.length > 0) {
    const droppedAvg = avgNum(proposed.droppedMeetings.map(d => d.rating));
    console.log(`\n  Avg rating of meetings DROPPED by proposed formula: ${droppedAvg.toFixed(2)} ★`);
    console.log(`\n  Meetings dropped under proposed formula:`);
    console.log(`  ${"Sponsor".padEnd(22)} ${"Delegate".padEnd(25)} ${"Rank".padEnd(8)} ${"AI%".padEnd(6)} ${"OptIn".padEnd(7)} ★`);
    console.log(`  ${"─".repeat(78)}`);
    for (const r of proposed.droppedMeetings) {
      const rankStr = r.rankPos ? `#${r.rankPos}` : "—";
      const optStr = r.optedIn ? "Yes" : "No";
      console.log(`  ${r.sponsor.padEnd(22)} ${r.name.padEnd(25)} ${rankStr.padEnd(8)} ${r.matchScore.toFixed(0).padEnd(6)} ${optStr.padEnd(7)} ${r.rating}★`);
    }
  }

  // Show new unrated meetings that would be added
  if (proposed.addedUnrated.length > 0) {
    console.log(`\n  New meetings that would be ADDED (no rating data):`);
    console.log(`  ${"Sponsor".padEnd(22)} ${"Delegate".padEnd(25)} ${"Rank".padEnd(8)} ${"AI%".padEnd(6)} ${"OptIn"}`);
    console.log(`  ${"─".repeat(72)}`);
    for (const r of proposed.addedUnrated.slice(0, 15)) {
      const rankStr = r.rankPos ? `#${r.rankPos}` : "—";
      const optStr = r.optedIn ? "Yes" : "No";
      console.log(`  ${r.sponsor.padEnd(22)} ${r.name.padEnd(25)} ${rankStr.padEnd(8)} ${r.matchScore.toFixed(0).padEnd(6)} ${optStr}`);
    }
    if (proposed.addedUnrated.length > 15) {
      console.log(`  ... and ${proposed.addedUnrated.length - 15} more`);
    }
  }

  // Rating distribution shift
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(" RATING DISTRIBUTION (of rated meetings that survive each formula)");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  ${"Stars".padEnd(8)} ${"Current".padEnd(12)} ${"Proposed".padEnd(12)} ${"Change"}`);
  for (let star = 5; star >= 1; star--) {
    const c = current.selectedWithRatings.filter(r => r === star).length;
    const p = proposed.selectedWithRatings.filter(r => r === star).length;
    const diff = p - c;
    const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? "—" : `${diff}`;
    console.log(`  ${star + "★".padEnd(7)} ${String(c).padEnd(12)} ${String(p).padEnd(12)} ${diffStr}`);
  }

  // Summary
  const improvement = proposedAvg - currentAvg;
  const improvStr = improvement > 0 ? `+${improvement.toFixed(2)}` : improvement.toFixed(2);
  const pureImprovement = pureRankAvg - currentAvg;
  const pureImprovStr = pureImprovement > 0 ? `+${pureImprovement.toFixed(2)}` : pureImprovement.toFixed(2);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(" SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Actual 2026 average:          ${currentAvg.toFixed(2)} ★`);
  console.log(`  Proposed formula average:     ${proposedAvg.toFixed(2)} ★  (${improvStr} vs actual)`);
  console.log(`  Pure rankings average:        ${pureRankAvg.toFixed(2)} ★  (${pureImprovStr} vs actual)`);
  console.log("\n  Note: averages are based only on meetings where we have actual ratings.");
  console.log("  The new meetings added under each formula have no rating data,");
  console.log("  so the true average could be higher or lower depending on those outcomes.");
  console.log("═══════════════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
