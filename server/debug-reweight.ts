import * as dotenv from "dotenv";
dotenv.config();
import * as db from "./db";
import { attendees } from "./attendees";

const NUM_DELEGATES = 38;
const activeAttendeeIds = new Set(attendees.map(a => String(a.id)));
const attendeeMap = new Map(attendees.map(a => [String(a.id), a]));

async function main() {
  const allSponsors = await db.getAllSponsors();
  
  // Just look at one sponsor to debug
  const sponsor = (allSponsors as any[]).find((s: any) => s.companyName.includes("Appcast"));
  if (!sponsor) { console.log("No Appcast found"); process.exit(0); }
  
  const meetings = await db.getMeetingsBySponsor(sponsor.id);
  const ratedMeetings = (meetings as any[]).filter((m: any) => m.meetingRating != null);
  console.log(`Appcast rated meetings: ${ratedMeetings.length}`);
  
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
  console.log(`Ranked delegates: ${ranked.length}`);
  console.log(`First 5 ranked: ${ranked.slice(0, 5).join(", ")}`);
  
  console.log("\nAll rated meetings with scores:");
  const rows: any[] = [];
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
    const matchScore: number = m.matchScore ?? 50;
    const rankNorm = rankPos ? ((NUM_DELEGATES - rankPos + 1) / NUM_DELEGATES) * 100 : 0;
    const optinNorm = optedIn ? 100 : 0;
    const proposedScore = rankNorm * 0.55 + matchScore * 0.40 + optinNorm * 0.05;
    const pureRankScore = rankNorm * 0.70 + matchScore * 0.30;
    const currentScore = matchScore + (optedIn ? 15 : 0) + (rankPos ? ((NUM_DELEGATES - rankPos + 1) / NUM_DELEGATES) * 20 : 0);
    rows.push({ name: `${(attendee as any).firstName} ${(attendee as any).lastName}`, rankPos, matchScore, optedIn, proposedScore, pureRankScore, currentScore, rating: m.meetingRating });
  }
  
  console.log("\nSorted by CURRENT score:");
  rows.sort((a, b) => b.currentScore - a.currentScore);
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(30)} rank=${r.rankPos ?? "—"}, AI=${r.matchScore}, optIn=${r.optedIn}, curr=${r.currentScore.toFixed(1)}, prop=${r.proposedScore.toFixed(1)}, pure=${r.pureRankScore.toFixed(1)}, ★=${r.rating}`);
  }
  
  console.log("\nSorted by PROPOSED score:");
  rows.sort((a, b) => b.proposedScore - a.proposedScore);
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(30)} rank=${r.rankPos ?? "—"}, AI=${r.matchScore}, optIn=${r.optedIn}, curr=${r.currentScore.toFixed(1)}, prop=${r.proposedScore.toFixed(1)}, pure=${r.pureRankScore.toFixed(1)}, ★=${r.rating}`);
  }
  
  process.exit(0);
}
main().catch(console.error);
