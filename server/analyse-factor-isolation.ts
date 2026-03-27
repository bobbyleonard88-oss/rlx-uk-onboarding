/**
 * Factor Isolation Analysis
 * For each rated meeting, determine which factor was the PRIMARY driver:
 *   - Opt-in: delegate explicitly opted in to meet this sponsor
 *   - Ranking: sponsor ranked this delegate in their top-N (quota)
 *   - AI Match: neither opted in nor in top-N — pure AI scoring decision
 *
 * Then show average rating for each group.
 */

import * as db from "./db";
import { attendees } from "./attendees";

async function main() {
  const allSponsors = await db.getAllSponsors();
  const allAttendees = attendees;
  const attendeeMap = new Map(allAttendees.map((a: any) => [String(a.id), a]));
  const activeAttendeeIds = new Set(allAttendees.map((a: any) => String(a.id)));

  // Collect all rated meetings across all sponsors
  type MeetingRow = {
    sponsor: string;
    delegate: string;
    company: string;
    rank: string;
    matchScore: number;
    optedIn: boolean;
    inTopN: boolean;
    rating: number;
    factor: "Opt-in" | "Ranking" | "AI Match";
  };

  const allRows: MeetingRow[] = [];

  for (const sponsor of allSponsors as any[]) {
    const meetings = await db.getMeetingsBySponsor(sponsor.id);
    const ratedMeetings = (meetings as any[]).filter((m: any) => m.meetingRating != null);
    if (ratedMeetings.length === 0) continue;

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

    const quota = sponsor.meetingQuota ?? 12;

    for (const m of ratedMeetings) {
      const attendee = attendeeMap.get(String(m.attendeeId));
      if (!attendee) continue;

      const optInSponsors: string[] = (attendee as any).optInSponsors ?? [];
      const optedIn = optInSponsors.some((name: string) =>
        sponsor.companyName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(sponsor.companyName.toLowerCase())
      );

      const rankIndex = ranked.indexOf(String(m.attendeeId));
      const rankPos = rankIndex >= 0 ? rankIndex + 1 : null;
      const inTopN = rankPos !== null && rankPos <= quota;
      const matchScore = m.matchScore ?? 0;

      let factor: "Opt-in" | "Ranking" | "AI Match";
      if (optedIn) factor = "Opt-in";
      else if (inTopN) factor = "Ranking";
      else factor = "AI Match";

      allRows.push({
        sponsor: sponsor.companyName,
        delegate: `${(attendee as any).firstName} ${(attendee as any).lastName}`,
        company: (attendee as any).company ?? "",
        rank: rankPos ? `#${rankPos}` : "unranked",
        matchScore,
        optedIn,
        inTopN,
        rating: m.meetingRating,
        factor,
      });
    }
  }

  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "n/a";

  const byFactor = (f: "Opt-in" | "Ranking" | "AI Match") =>
    allRows.filter(r => r.factor === f).map(r => r.rating);

  // Also pure combinations
  const optinAndRanked = allRows.filter(r => r.optedIn && r.inTopN).map(r => r.rating);
  const optinOnly = allRows.filter(r => r.optedIn && !r.inTopN).map(r => r.rating);
  const rankingOnly = allRows.filter(r => !r.optedIn && r.inTopN).map(r => r.rating);
  const aiOnly = allRows.filter(r => !r.optedIn && !r.inTopN).map(r => r.rating);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(" FACTOR ISOLATION — Average Rating by Primary Driver");
  console.log(`  Total rated meetings: ${allRows.length}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log(" Primary driver (priority: Opt-in > Ranking > AI):");
  console.log("─────────────────────────────────────────────────────────────");
  for (const f of ["Opt-in", "Ranking", "AI Match"] as const) {
    const ratings = byFactor(f);
    const a = avg(ratings);
    console.log(`  ${f.padEnd(12)} ${ratings.length} meetings   avg ${a} ★`);
  }

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(" All combinations (non-exclusive):");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  Opted-in + In top-N   ${optinAndRanked.length} meetings   avg ${avg(optinAndRanked)} ★`);
  console.log(`  Opted-in only         ${optinOnly.length} meetings   avg ${avg(optinOnly)} ★`);
  console.log(`  Ranking only          ${rankingOnly.length} meetings   avg ${avg(rankingOnly)} ★`);
  console.log(`  Pure AI (neither)     ${aiOnly.length} meetings   avg ${avg(aiOnly)} ★`);

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(" Avg match score by factor:");
  console.log("─────────────────────────────────────────────────────────────");
  for (const f of ["Opt-in", "Ranking", "AI Match"] as const) {
    const rows = allRows.filter(r => r.factor === f);
    const avgScore = rows.length
      ? (rows.reduce((a, b) => a + b.matchScore, 0) / rows.length).toFixed(1)
      : "n/a";
    console.log(`  ${f.padEnd(12)} avg match score: ${avgScore}%`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
