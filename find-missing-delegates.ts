/**
 * find-missing-delegates.ts
 * Compares the static attendees.ts list with the database delegate_profiles table
 * to find delegates who are in the DB but missing from the static file.
 */
import 'dotenv/config';
import * as db from './server/db';
import { attendees } from './server/attendees';

async function main() {
  const dbDelegates = await db.getAllDelegateProfiles();
  const staticIds = new Set(attendees.map(a => a.id));
  const dbIds = new Set(dbDelegates.map(d => d.attendeeId));

  console.log(`Static attendees.ts: ${attendees.length}`);
  console.log(`DB delegate_profiles: ${dbDelegates.length}`);
  
  const missingFromStatic = dbDelegates.filter(d => !staticIds.has(d.attendeeId));
  const missingFromDb = attendees.filter(a => !dbIds.has(a.id));

  if (missingFromStatic.length > 0) {
    console.log(`\n=== In DB but NOT in attendees.ts (${missingFromStatic.length}) ===`);
    for (const d of missingFromStatic) {
      console.log(`  ${d.attendeeId}: ${d.firstName} ${d.lastName} (${d.company})`);
    }
  }

  if (missingFromDb.length > 0) {
    console.log(`\n=== In attendees.ts but NOT in DB (${missingFromDb.length}) ===`);
    for (const a of missingFromDb) {
      console.log(`  ${a.id}: ${a.firstName} ${a.lastName} (${a.company})`);
    }
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
