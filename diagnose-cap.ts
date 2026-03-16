import * as db from "./server/db";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  // Get all meetings currently in the DB (from the last run)
  const allMeetings = await db.getAllMeetings();
  
  // Count meetings per delegate
  const delegateCounts = new Map<string, number>();
  for (const m of allMeetings) {
    delegateCounts.set(m.attendeeId, (delegateCounts.get(m.attendeeId) ?? 0) + 1);
  }
  
  // Distribution
  const dist = new Map<number, number>();
  for (const count of delegateCounts.values()) {
    dist.set(count, (dist.get(count) ?? 0) + 1);
  }
  
  console.log("\n=== Delegate Meeting Distribution ===");
  const sorted = [...dist.entries()].sort((a, b) => a[0] - b[0]);
  for (const [count, delegates] of sorted) {
    console.log(`  ${count} meetings: ${delegates} delegate(s)`);
  }
  
  const totalMeetings = allMeetings.length;
  const totalDelegates = delegateCounts.size;
  console.log(`\nTotal meetings saved: ${totalMeetings}`);
  console.log(`Total delegates with meetings: ${totalDelegates}`);
  console.log(`Average meetings per delegate: ${(totalMeetings / totalDelegates).toFixed(1)}`);
  
  // Show delegates at cap
  const atCap = [...delegateCounts.entries()].filter(([, c]) => c >= 8);
  console.log(`\nDelegates at cap (8+): ${atCap.length}`);
  for (const [id, count] of atCap.sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id}: ${count} meetings`);
  }
  
  // Show meetings per sponsor
  const sponsorCounts = new Map<number, number>();
  for (const m of allMeetings) {
    sponsorCounts.set(m.sponsorId, (sponsorCounts.get(m.sponsorId) ?? 0) + 1);
  }
  
  console.log("\n=== Meetings per Sponsor ===");
  const sponsors = await db.getAllSponsors();
  for (const s of sponsors) {
    const count = sponsorCounts.get(s.id) ?? 0;
    if (count > 0) console.log(`  ${s.companyName}: ${count}`);
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
