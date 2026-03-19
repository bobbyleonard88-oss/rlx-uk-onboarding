import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

// The Martec: doubled slot 10, missing slot 1
// Delegate 76678269091 (score 72) is free in slots 5,6,8,11
// Delegate 174442448959 (score 97) is free in slots 5,6,11,12
// Strategy: move lower-scoring delegate (76678269091) from slot 10 to one of their free slots (e.g. 5)
// BUT we need to check: is The Martec already in slot 5? Yes — so we need to swap:
//   Step 1: move The Martec's slot 5 meeting to slot 1 (sponsor's missing slot)
//           — but that delegate must be free in slot 1
//   Step 2: move the doubled delegate from slot 10 to slot 5

async function threeWayFix(sponsorName, doubledSlot, missingSlot, delegateToMove, delegateToMoveFreeSlots) {
  const [sponsorRows] = await db.execute(`SELECT id FROM sponsors WHERE companyName LIKE ?`, [`%${sponsorName}%`]);
  const sponsorId = sponsorRows[0].id;

  // For each free slot of the delegate to move, check if we can do a 3-way:
  // 1. Find the meeting currently in that free slot for this sponsor
  // 2. Check if THAT delegate is free in the missingSlot
  // 3. If yes: move that meeting to missingSlot, then move our delegate to that free slot

  for (const intermediateSlot of delegateToMoveFreeSlots) {
    // Get the sponsor's meeting in intermediateSlot
    const [intermediate] = await db.execute(
      `SELECT m.id, m.attendeeId, CONCAT(d.firstName, ' ', d.lastName) as name
       FROM meetings m
       LEFT JOIN delegateProfiles d ON m.attendeeId = CAST(d.id AS CHAR)
       WHERE m.sponsorId = ? AND m.timeSlot = ?`,
      [sponsorId, intermediateSlot]
    );
    if (!intermediate.length) continue; // sponsor has no meeting in this slot

    const intDelegate = intermediate[0];
    // Check if this intermediate delegate is free in missingSlot
    const [intInMissing] = await db.execute(
      `SELECT id FROM meetings WHERE attendeeId = ? AND timeSlot = ?`,
      [intDelegate.attendeeId, missingSlot]
    );
    if (intInMissing.length > 0) continue; // blocked

    // Also check: the delegate we're moving must be free in intermediateSlot (already confirmed via free slots)
    // And the intermediate delegate must be free in missingSlot (just confirmed)

    // Get the doubled meeting to move
    const [doubledMeeting] = await db.execute(
      `SELECT m.id, m.attendeeId, m.matchScore, CONCAT(d.firstName, ' ', d.lastName) as name
       FROM meetings m
       LEFT JOIN delegateProfiles d ON m.attendeeId = CAST(d.id AS CHAR)
       WHERE m.sponsorId = ? AND m.timeSlot = ? AND m.attendeeId = ?`,
      [sponsorId, doubledSlot, delegateToMove]
    );
    if (!doubledMeeting.length) continue;

    // Execute the 3-way swap:
    // Step 1: move intermediate meeting from intermediateSlot → missingSlot
    await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [missingSlot, intDelegate.id]);
    // Step 2: move doubled meeting from doubledSlot → intermediateSlot
    await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [intermediateSlot, doubledMeeting[0].id]);

    console.log(`✅ ${sponsorName}: 3-way swap`);
    console.log(`   ${intDelegate.name || intDelegate.attendeeId}: slot ${intermediateSlot} → slot ${missingSlot}`);
    console.log(`   ${doubledMeeting[0].name || doubledMeeting[0].attendeeId} (score ${doubledMeeting[0].matchScore}): slot ${doubledSlot} → slot ${intermediateSlot}`);
    return true;
  }

  console.log(`⚠️  ${sponsorName}: 3-way swap failed — no valid intermediate slot found`);
  return false;
}

// The Martec: move delegate 76678269091 (lower score 72), free in [5,6,8,11]
await threeWayFix('Martec', 10, 1, '76678269091', [5, 6, 8, 11]);

// Wilson: move lower-scoring delegate 9322701 (score 80), free in [1,2,10,11]
// (92953690026 has score 98 so keep them, move 9322701)
await threeWayFix('Wilson', 3, 8, '9322701', [1, 2, 10, 11]);

// Final verification
console.log('\n=== Final Verification ===');
const [finalMeetings] = await db.execute(`SELECT id, sponsorId, timeSlot FROM meetings`);
const [allSponsors] = await db.execute(`SELECT id, companyName FROM sponsors`);

let allClear = true;
for (const sponsor of allSponsors) {
  const meetings = finalMeetings.filter(m => m.sponsorId === sponsor.id);
  if (meetings.length === 0) continue;
  const maxPerSlot = meetings.length > 12 ? 2 : 1;
  const slotCounts = {};
  for (const m of meetings) slotCounts[m.timeSlot] = (slotCounts[m.timeSlot] || 0) + 1;
  const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
  const missing = allSlots.filter(s => !slotCounts[s]);
  const doubled = Object.entries(slotCounts).filter(([,c]) => c > maxPerSlot);
  if (missing.length > 0 || doubled.length > 0) {
    allClear = false;
    console.log(`⚠️  ${sponsor.companyName.trim()} (${meetings.length}): missing=[${missing.join(',')}], doubled=[${doubled.map(([s,c]) => `${s}(${c}x)`).join(',')}]`);
  }
}
if (allClear) console.log('✅ ALL CLEAR — every real sponsor has clean slot distribution');

await db.end();
