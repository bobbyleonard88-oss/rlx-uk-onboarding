import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import dotenv from 'dotenv';
dotenv.config();

// Load attendees
const require = createRequire(import.meta.url);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Find Appcast sponsor ID
const [sponsors] = await conn.execute(
  "SELECT id, companyName FROM sponsors WHERE companyName LIKE '%appcast%' OR companyName LIKE '%Appcast%'"
);
console.log('Appcast sponsor rows:', sponsors);

if (!sponsors.length) {
  console.log('No Appcast sponsor found');
  await conn.end();
  process.exit(0);
}

const sponsorId = sponsors[0].id;
console.log(`\nUsing sponsorId: ${sponsorId} (${sponsors[0].companyName})\n`);

// 2. Get their rankings submission
const [rankings] = await conn.execute(
  "SELECT rankedAttendeeIds, totalSlots FROM rankingsSubmissions WHERE sponsorId = ? ORDER BY submittedAt DESC LIMIT 1",
  [sponsorId]
);

if (!rankings.length) {
  console.log('No rankings submission found for Appcast');
  await conn.end();
  process.exit(0);
}

const rankedIds = JSON.parse(rankings[0].rankedAttendeeIds);
const totalSlots = rankings[0].totalSlots;
console.log(`Total slots: ${totalSlots}`);
console.log(`Total ranked delegates: ${rankedIds.length}`);
console.log(`Top ${totalSlots} ranked IDs:`, rankedIds.slice(0, totalSlots));

// 3. Get their actual confirmed/suggested meetings
const [meetings] = await conn.execute(
  "SELECT attendeeId, status, isVisible, timeSlot FROM meetings WHERE sponsorId = ? AND (status = 'confirmed' OR status = 'suggested') AND isVisible = 1",
  [sponsorId]
);
console.log(`\nActual meetings (confirmed/suggested, visible): ${meetings.length}`);

const scheduledAttendeeIds = meetings.map(m => m.attendeeId);
console.log('Scheduled attendee IDs:', scheduledAttendeeIds);

// 4. Cross-reference: how many scheduled delegates appear in top-N ranked list
const topN = Math.min(totalSlots, rankedIds.length);
const topNSet = new Set(rankedIds.slice(0, topN));

const hitCount = scheduledAttendeeIds.filter(id => topNSet.has(id)).length;
const hitRate = meetings.length > 0 ? ((hitCount / meetings.length) * 100).toFixed(1) : 0;

console.log(`\n=== APPCAST HIT RATE ANALYSIS ===`);
console.log(`Meeting slots: ${meetings.length}`);
console.log(`Top-${topN} ranked delegates: ${topN}`);
console.log(`Scheduled delegates who were in top-${topN}: ${hitCount}`);
console.log(`Hit rate: ${hitCount}/${meetings.length} = ${hitRate}%`);

// 5. Show which top-ranked delegates they DID meet
console.log('\n--- Delegates met who were in top rankings ---');
for (const id of scheduledAttendeeIds) {
  const rankPos = rankedIds.indexOf(id);
  if (rankPos !== -1) {
    console.log(`  Attendee ${id} → ranked #${rankPos + 1}`);
  }
}

// 6. Show top-ranked delegates they MISSED
console.log('\n--- Top-ranked delegates NOT scheduled (missed) ---');
let missedCount = 0;
for (let i = 0; i < topN; i++) {
  const id = rankedIds[i];
  if (!scheduledAttendeeIds.includes(id)) {
    console.log(`  Attendee ${id} → ranked #${i + 1} — NOT in schedule`);
    missedCount++;
  }
}
console.log(`Total missed from top-${topN}: ${missedCount}`);

// 7. Check cancellation status of missed top-ranked delegates
console.log('\n--- Checking if missed top-ranked delegates cancelled ---');
const missedIds = rankedIds.slice(0, topN).filter(id => !scheduledAttendeeIds.includes(id));

// Load attendees.ts to check active status
const attendeesRaw = readFileSync('/home/ubuntu/rlx-onboarding/server/attendees.ts', 'utf8');
for (const id of missedIds) {
  // Check if attendee appears in attendees.ts as active
  const isActive = attendeesRaw.includes(`id: "${id}"`) || attendeesRaw.includes(`id: '${id}'`);
  console.log(`  ${id}: ${isActive ? 'ACTIVE (in attendees.ts)' : 'CANCELLED/REMOVED (not in attendees.ts)'}`);
}

await conn.end();
