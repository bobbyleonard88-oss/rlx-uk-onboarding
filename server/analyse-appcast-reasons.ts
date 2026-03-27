/**
 * Appcast meeting detail: match reasons, opt-in status, rank, rating
 */
import * as dotenv from "dotenv";
dotenv.config();
import * as db from "./db";
import { attendees } from "./attendees";

const attendeeMap = new Map(attendees.map(a => [String(a.id), a]));

// The delegate list provided by user (rank and rep from the table)
const PROVIDED = [
  { name: "Michelle Monahan",    rank: 2,  rep: "Rep 1" },
  { name: "Carly George",        rank: 3,  rep: "Rep 1" },
  { name: "Sarah Cooper",        rank: 4,  rep: "Rep 2" },
  { name: "Rikki Fullerton",     rank: 5,  rep: "Rep 2" },
  { name: "Debbie Robinson",     rank: 7,  rep: "Rep 1" },
  { name: "Lucy Bousfield",      rank: 8,  rep: "Rep 1" },
  { name: "Nuria Munoz",         rank: 12, rep: "Rep 1" },
  { name: "Lisa Brignal",        rank: 13, rep: "Rep 1" },
  { name: "Joanna Hackett",      rank: 14, rep: "Rep 1" },
  { name: "Edwin Pene",          rank: 17, rep: "Rep 1" },
  { name: "Oliver Browne",       rank: 19, rep: "Rep 2" },
  { name: "Sonal Jain",          rank: 20, rep: "Rep 2" },
  { name: "Julie Lowe",          rank: 21, rep: "Rep 2" },
  { name: "Tush Wijeratne",      rank: 22, rep: "Rep 1" },
  { name: "Jessica Shaunie Green", rank: 31, rep: "Rep 2" },
  { name: "Martin McDermott",    rank: 32, rep: "Rep 1" },
  { name: "Salina Budaly",       rank: 33, rep: "Rep 2" },
  { name: "Anna Katyal",         rank: 34, rep: "Rep 1" },
  { name: "Mark Kunaseelan",     rank: null, rep: "Rep 2" },
];

async function main() {
  const allSponsors = await db.getAllSponsors();
  const appcast = (allSponsors as any[]).find((s: any) =>
    s.companyName.toLowerCase().includes("appcast")
  );
  if (!appcast) { console.log("Appcast not found"); process.exit(1); }

  const meetings = await db.getMeetingsBySponsor(appcast.id);
  const ratedMeetings = (meetings as any[]).filter((m: any) => m.meetingRating != null);

  // Build lookup by attendee name
  const meetingByName = new Map<string, any>();
  for (const m of ratedMeetings) {
    const att = attendeeMap.get(String(m.attendeeId));
    if (!att) continue;
    const fullName = `${(att as any).firstName} ${(att as any).lastName}`;
    meetingByName.set(fullName.toLowerCase(), { m, att });
  }

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(" APPCAST — Match Reasons & Opt-In Status");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  for (const row of PROVIDED) {
    const key = row.name.toLowerCase();
    const found = meetingByName.get(key);
    
    if (!found) {
      console.log(`❓ ${row.name} — not found in DB\n`);
      continue;
    }

    const { m, att } = found;
    const optInSponsors: string[] = (att as any).optInSponsors ?? [];
    const optedIn = optInSponsors.some((name: string) =>
      appcast.companyName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(appcast.companyName.toLowerCase())
    );

    const rankStr = row.rank ? `#${row.rank}` : "Unranked";
    const stars = "⭐".repeat(m.meetingRating);
    const optStr = optedIn ? "✅ Opted in" : "❌ Did not opt in";

    console.log(`─────────────────────────────────────────────────────────────────────────────`);
    console.log(`  ${row.name.padEnd(30)} ${(att as any).company ?? ""}`);
    console.log(`  Rank: ${rankStr}  |  Match: ${m.matchScore ?? "?"}%  |  Rating: ${stars} (${m.meetingRating}/5)  |  ${row.rep}  |  ${optStr}`);
    if (m.meetingNotes) {
      console.log(`  Notes: "${m.meetingNotes}"`);
    }
    if (m.matchReason) {
      console.log(`  Match reason: ${m.matchReason}`);
    } else {
      console.log(`  Match reason: (none stored)`);
    }
    console.log();
  }

  // Summary: how many opted in vs not, and avg rating for each group
  const optInRatings: number[] = [];
  const nonOptInRatings: number[] = [];

  for (const row of PROVIDED) {
    const key = row.name.toLowerCase();
    const found = meetingByName.get(key);
    if (!found) continue;
    const { m, att } = found;
    const optInSponsors: string[] = (att as any).optInSponsors ?? [];
    const optedIn = optInSponsors.some((name: string) =>
      appcast.companyName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(appcast.companyName.toLowerCase())
    );
    if (optedIn) optInRatings.push(m.meetingRating);
    else nonOptInRatings.push(m.meetingRating);
  }

  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "n/a";

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(" OPT-IN SUMMARY FOR APPCAST");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`  Opted in:       ${optInRatings.length} delegates  |  Avg rating: ${avg(optInRatings)} ★`);
  console.log(`  Did not opt in: ${nonOptInRatings.length} delegates  |  Avg rating: ${avg(nonOptInRatings)} ★`);
  console.log();

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
