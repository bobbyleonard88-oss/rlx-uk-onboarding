import 'dotenv/config';
import * as db from './server/db';

async function main() {
  const meetings = await db.getAllMeetings();
  // Filter out test sponsors
  const TEST_IDS = new Set([30001, 60001, 90001, 120001]);
  const real = meetings.filter(m => !TEST_IDS.has(m.sponsorId));

  // Count per delegate
  const delegateCounts = new Map<string, number>();
  for (const m of real) {
    delegateCounts.set(m.attendeeId, (delegateCounts.get(m.attendeeId) ?? 0) + 1);
  }

  // Distribution
  const dist = new Map<number, number>();
  for (const count of delegateCounts.values()) {
    dist.set(count, (dist.get(count) ?? 0) + 1);
  }

  console.log('Delegate meeting count distribution:');
  for (const [count, delegates] of [...dist.entries()].sort((a,b) => a[0]-b[0])) {
    console.log(`  ${count} meetings: ${delegates} delegates`);
  }
  console.log(`Total delegates with meetings: ${delegateCounts.size}`);
  console.log(`At cap (8): ${[...delegateCounts.values()].filter(c => c >= 8).length} delegates`);
  console.log(`Under cap (< 8): ${[...delegateCounts.values()].filter(c => c < 8).length} delegates`);
  console.log(`Total meetings: ${real.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
