import * as db from "./db";
import { attendees } from "./attendees";

async function main() {
  const allSponsors = await db.getAllSponsors();
  const appcast = allSponsors.find((s: any) =>
    s.companyName.toLowerCase().includes("appcast")
  );
  if (!appcast) { console.log("Appcast not found"); process.exit(1); }

  const sponsorId = appcast.id;

  // Get all meetings for Appcast
  const meetings = await db.getMeetingsBySponsor(sponsorId);

  // Get rankings for Appcast — use the most recent reviewed submission
  const submissions = await db.getRankingsSubmissionsBySponsor(sponsorId);
  const latestSubmission = (submissions as any[]).find((s: any) => s.isReviewed === 1) ?? (submissions as any[])[0];
  const rankingsData: string[] = latestSubmission ? JSON.parse(latestSubmission.rankingsData) : [];

  // Build rank lookup (index + 1 = rank position)
  const rankMap = new Map<string, number>();
  rankingsData.forEach((id: string, idx: number) => {
    rankMap.set(String(id), idx + 1);
  });

  // Build attendee name + company lookup
  const attendeeMap = new Map<string, { name: string; company: string }>();
  attendees.forEach((a: any) => {
    attendeeMap.set(String(a.id), {
      name: `${a.firstName} ${a.lastName}`,
      company: a.company ?? a.companyName ?? "",
    });
  });

  console.log(`\nAppcast (ID: ${sponsorId}) — Match Score vs Rank vs Rating\n`);
  console.log(
    "Delegate".padEnd(30),
    "Company".padEnd(30),
    "Rank".padEnd(8),
    "Match%".padEnd(10),
    "Rating".padEnd(8),
    "Rep"
  );
  console.log("─".repeat(105));

  const rows = meetings
    .filter((m: any) => m.meetingRating != null)
    .map((m: any) => ({
      name: attendeeMap.get(String(m.attendeeId))?.name ?? String(m.attendeeId),
      company: attendeeMap.get(String(m.attendeeId))?.company ?? "",
      rank: rankMap.get(String(m.attendeeId)) ?? null,
      score: m.matchScore ?? null,
      rating: m.meetingRating,
      rep: m.attendeeNumber === 2 ? "Rep 2" : "Rep 1",
    }))
    .sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));

  rows.forEach((r: any) => {
    const rankStr = r.rank != null ? `#${r.rank}` : "unranked";
    const scoreStr = r.score != null ? `${r.score}%` : "n/a";
    const ratingStr = `${r.rating}/5`;
    console.log(
      r.name.padEnd(30),
      r.company.padEnd(30),
      rankStr.padEnd(8),
      scoreStr.padEnd(10),
      ratingStr.padEnd(8),
      r.rep
    );
  });

  // Also show unrated meetings
  console.log("\n--- Meetings NOT yet rated ---");
  const unrated = meetings.filter((m: any) => m.meetingRating == null);
  unrated.forEach((m: any) => {
    const entry = attendeeMap.get(String(m.attendeeId));
    const name = entry?.name ?? String(m.attendeeId);
    const rank = rankMap.get(String(m.attendeeId));
    const rankStr = rank != null ? `#${rank}` : "unranked";
    const scoreStr = m.matchScore != null ? `${m.matchScore}%` : "n/a";
    console.log(`  ${name.padEnd(28)} rank: ${rankStr.padEnd(10)} match: ${scoreStr}`);
  });

  // Summary stats
  const rated = rows as any[];
  if (rated.length > 0) {
    const avgRating = rated.reduce((s: number, r: any) => s + r.rating, 0) / rated.length;
    const avgScore = rated.filter((r: any) => r.score != null).reduce((s: number, r: any) => s + r.score, 0) /
      rated.filter((r: any) => r.score != null).length;
    const rankedMeetings = rated.filter((r: any) => r.rank != null);
    const avgRank = rankedMeetings.length > 0
      ? rankedMeetings.reduce((s: number, r: any) => s + r.rank, 0) / rankedMeetings.length
      : null;

    console.log(`\nSummary:`);
    console.log(`  Rated meetings:    ${rated.length}`);
    console.log(`  Avg star rating:   ${avgRating.toFixed(2)}/5`);
    console.log(`  Avg match score:   ${avgScore.toFixed(1)}%`);
    if (avgRank) console.log(`  Avg rank position: #${avgRank.toFixed(1)}`);
  }
}

main().catch(console.error);
