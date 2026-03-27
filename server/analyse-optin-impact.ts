/**
 * Analyse the impact of removing the opt-in boost from the scoring algorithm.
 *
 * The current scoring formula:
 *   base = AI_score * 80 + orgSize * 20
 *   if top20 ranked: +10
 *   if opted-in:     max(90, base + 15)   ← this is what we're removing
 *   if affinity:     +15
 *
 * We re-compute the "no opt-in" score for every rated meeting and compare:
 *   - How many meetings would have been scored differently?
 *   - For meetings that were rated poorly, would they have been ranked lower (and potentially not selected)?
 *   - What is the correlation between opt-in status and actual rating?
 */

import * as dotenv from "dotenv";
dotenv.config();

import * as dbModule from "./db";
import { attendees } from "./attendees";

async function main() {
  const allMeetings = await dbModule.getAllMeetings();
  const sponsors = await dbModule.getAllSponsors();
  const rankingsRows = await dbModule.getAllRankingsSubmissions();

  // Build a map of attendee data
  const attendeeMap = new Map(attendees.map(a => [a.id, a]));

  // Build sponsor name map
  const sponsorMap = new Map(sponsors.map((s: any) => [s.id, s]));

  // Build rankings map: sponsorId -> ordered list of attendeeIds
  const rankingsMap = new Map<number, string[]>();
  for (const row of rankingsRows as any[]) {
    let ranked: string[] = [];
    try {
      const data = typeof row.rankingsData === "string"
        ? JSON.parse(row.rankingsData)
        : row.rankingsData;
      if (Array.isArray(data)) {
        ranked = data.map((r: any) => String(r.attendeeId ?? r.id ?? r));
      }
    } catch {}
    rankingsMap.set(row.sponsorId, ranked);
  }

  // Only look at rated meetings
  const ratedMeetings = (allMeetings as any[]).filter((m: any) => m.meetingRating != null);

  console.log(`\nTotal rated meetings: ${ratedMeetings.length}`);
  console.log(`\n${"═".repeat(75)}`);
  console.log(` OPT-IN IMPACT ANALYSIS`);
  console.log(`${"═".repeat(75)}`);

  // For each rated meeting, compute:
  // 1. Whether the delegate opted in to that sponsor
  // 2. The actual stored match score
  // 3. What the score would have been WITHOUT the opt-in boost
  // 4. The actual rating given

  type Row = {
    sponsor: string;
    delegate: string;
    company: string;
    rank: string;
    optedIn: boolean;
    actualScore: number;
    scoreWithoutOptIn: number;
    scoreDelta: number;
    rating: number;
  };

  const rows: Row[] = [];

  for (const meeting of ratedMeetings as any[]) {
    const sponsor = sponsorMap.get(meeting.sponsorId) as any;
    if (!sponsor) continue;

    const attendee = attendeeMap.get(meeting.attendeeId);
    if (!attendee) continue;

    const sponsorNameNorm = (sponsor.companyName || "").toLowerCase();
    const optedIn = ((attendee as any).optInSponsors ?? [] as string[]).some(
      (s: string) =>
        s.toLowerCase().includes(sponsorNameNorm) ||
        sponsorNameNorm.includes(s.toLowerCase())
    );

    const ranked = rankingsMap.get(meeting.sponsorId) ?? [];
    // Filter to active attendees only
    const activeIds = new Set(attendees.map((a: any) => a.id));
    const activeRanked = ranked.filter((id: string) => activeIds.has(id));
    const rankPos = activeRanked.indexOf(meeting.attendeeId);
    const rankLabel = rankPos >= 0 ? `#${rankPos + 1}` : "unranked";
    const isTop20 = rankPos >= 0 && rankPos < 20;

    const actualScore = meeting.matchScore ?? 0;

    // Re-derive score without opt-in:
    // We can't re-run the AI, but we know the formula:
    //   if optedIn: matchScore = max(90, min(100, base + 15))
    //   so base was somewhere between (actualScore - 15) and actualScore
    //   The opt-in sets a floor of 90, so if actualScore >= 90 and optedIn,
    //   the base could have been as low as actualScore - 15 (or lower, floored at 75)
    //
    // Best estimate: if opted-in, the score without opt-in = max(1, actualScore - 15)
    // but also remove the floor-at-90 guarantee.
    // If actualScore was exactly 90 (the floor), base could have been anything ≤ 90.
    // We conservatively estimate: scoreWithoutOptIn = actualScore - 15 (capped at 100, min 1)
    let scoreWithoutOptIn = actualScore;
    if (optedIn) {
      // Remove the +15 boost and the floor-at-90 guarantee
      scoreWithoutOptIn = Math.max(1, actualScore - 15);
    }

    rows.push({
      sponsor: sponsor.companyName,
      delegate: `${attendee.firstName} ${attendee.lastName}`,
      company: attendee.company,
      rank: rankLabel,
      optedIn,
      actualScore,
      scoreWithoutOptIn,
      scoreDelta: optedIn ? -15 : 0,
      rating: meeting.meetingRating as number,
    });
  }

  // ── Section 1: Opt-in vs non-opt-in rating comparison ──
  const optInRows = rows.filter(r => r.optedIn);
  const nonOptInRows = rows.filter(r => !r.optedIn);

  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "n/a";

  console.log(`\n${"─".repeat(75)}`);
  console.log(` SECTION 1 — OPT-IN STATUS vs ACTUAL RATING`);
  console.log(`${"─".repeat(75)}`);
  console.log(`\n  Opted-in delegates (${optInRows.length} meetings):`);
  console.log(`    Avg rating:       ${avg(optInRows.map(r => r.rating))} ★`);
  console.log(`    Avg match score:  ${avg(optInRows.map(r => r.actualScore))}%`);
  console.log(`    Score w/o opt-in: ${avg(optInRows.map(r => r.scoreWithoutOptIn))}%`);
  console.log(`\n  Non-opted-in delegates (${nonOptInRows.length} meetings):`);
  console.log(`    Avg rating:       ${avg(nonOptInRows.map(r => r.rating))} ★`);
  console.log(`    Avg match score:  ${avg(nonOptInRows.map(r => r.actualScore))}%`);

  // ── Section 2: Opted-in meetings that were rated poorly ──
  const poorOptIn = optInRows.filter(r => r.rating <= 2).sort((a, b) => a.rating - b.rating);
  console.log(`\n${"─".repeat(75)}`);
  console.log(` SECTION 2 — OPT-IN MEETINGS RATED POORLY (1★ or 2★)`);
  console.log(` These meetings were boosted by opt-in but the sponsor rated them low`);
  console.log(`${"─".repeat(75)}`);
  console.log(
    `\n  ${"Sponsor".padEnd(20)} ${"Delegate".padEnd(25)} ${"Company".padEnd(30)} ${"Rank".padEnd(8)} ${"Score".padEnd(8)} ${"→ No-OptIn".padEnd(12)} ${"★"}`
  );
  console.log(`  ${"─".repeat(110)}`);
  for (const r of poorOptIn) {
    console.log(
      `  ${r.sponsor.padEnd(20)} ${r.delegate.padEnd(25)} ${r.company.padEnd(30)} ${r.rank.padEnd(8)} ${(r.actualScore + "%").padEnd(8)} ${(r.scoreWithoutOptIn + "%").padEnd(12)} ${r.rating}/5`
    );
  }

  // ── Section 3: Would removing opt-in have changed which meetings were selected? ──
  // A meeting is "at risk" if its score without opt-in drops below 60 (typical selection threshold)
  const SELECTION_THRESHOLD = 60;
  const atRisk = optInRows.filter(r => r.scoreWithoutOptIn < SELECTION_THRESHOLD);
  console.log(`\n${"─".repeat(75)}`);
  console.log(` SECTION 3 — MEETINGS THAT WOULD LIKELY NOT HAVE BEEN SELECTED`);
  console.log(` (score drops below ${SELECTION_THRESHOLD}% without opt-in boost)`);
  console.log(`${"─".repeat(75)}`);
  if (atRisk.length === 0) {
    console.log(`\n  None — all opted-in meetings would still have scored ≥${SELECTION_THRESHOLD}% without the boost.`);
  } else {
    console.log(
      `\n  ${"Sponsor".padEnd(20)} ${"Delegate".padEnd(25)} ${"Company".padEnd(30)} ${"Score".padEnd(8)} ${"→ No-OptIn".padEnd(12)} ${"★"}`
    );
    console.log(`  ${"─".repeat(100)}`);
    for (const r of atRisk) {
      console.log(
        `  ${r.sponsor.padEnd(20)} ${r.delegate.padEnd(25)} ${r.company.padEnd(30)} ${(r.actualScore + "%").padEnd(8)} ${(r.scoreWithoutOptIn + "%").padEnd(12)} ${r.rating}/5`
      );
    }
  }

  // ── Section 4: Correlation summary ──
  console.log(`\n${"─".repeat(75)}`);
  console.log(` SECTION 4 — SCORE BUCKET vs RATING (with and without opt-in)`);
  console.log(`${"─".repeat(75)}`);

  const buckets = [
    { label: "90-100%", min: 90, max: 100 },
    { label: "70-89%",  min: 70, max: 89 },
    { label: "50-69%",  min: 50, max: 69 },
    { label: "0-49%",   min: 0,  max: 49 },
  ];

  console.log(`\n  Score Bucket   Meetings (actual)   Avg★   |  Meetings (no-optin)   Avg★`);
  console.log(`  ${"─".repeat(70)}`);
  for (const b of buckets) {
    const actual = rows.filter(r => r.actualScore >= b.min && r.actualScore <= b.max);
    const noOptin = rows.filter(r => r.scoreWithoutOptIn >= b.min && r.scoreWithoutOptIn <= b.max);
    console.log(
      `  ${b.label.padEnd(14)} ${String(actual.length).padEnd(19)} ${avg(actual.map(r => r.rating)).padEnd(7)} |  ${String(noOptin.length).padEnd(22)} ${avg(noOptin.map(r => r.rating))}`
    );
  }

  // ── Section 5: Per-sponsor opt-in impact ──
  console.log(`\n${"─".repeat(75)}`);
  console.log(` SECTION 5 — PER-SPONSOR OPT-IN IMPACT`);
  console.log(`${"─".repeat(75)}`);
  const sponsorNames = Array.from(new Set(rows.map(r => r.sponsor))).sort();
  console.log(`\n  ${"Sponsor".padEnd(22)} ${"Total".padEnd(8)} ${"Opted-in".padEnd(12)} ${"Avg★ (opted-in)".padEnd(18)} ${"Avg★ (not opted-in)"}`);
  console.log(`  ${"─".repeat(80)}`);
  for (const name of sponsorNames) {
    const sRows = rows.filter(r => r.sponsor === name);
    const sOptIn = sRows.filter(r => r.optedIn);
    const sNot = sRows.filter(r => !r.optedIn);
    console.log(
      `  ${name.padEnd(22)} ${String(sRows.length).padEnd(8)} ${String(sOptIn.length).padEnd(12)} ${avg(sOptIn.map(r => r.rating)).padEnd(18)} ${avg(sNot.map(r => r.rating))}`
    );
  }

  console.log(`\n${"═".repeat(75)}\n`);
}

main().catch(console.error);
