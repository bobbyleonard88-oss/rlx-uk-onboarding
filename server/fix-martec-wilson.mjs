import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

const fixLog = [];

async function forceFixSponsor(sponsorName, doubledSlot, missingSlot) {
  const [sponsorRows] = await db.execute(`SELECT id FROM sponsors WHERE companyName LIKE ?`, [`%${sponsorName}%`]);
  if (!sponsorRows.length) { console.log(`${sponsorName}: not found`); return; }
  const sponsorId = sponsorRows[0].id;

  // Get both meetings in the doubled slot
  const [doubledMeetings] = await db.execute(`
    SELECT m.id, m.attendeeId, m.matchScore,
           CONCAT(d.firstName, ' ', d.lastName) as delegateName
    FROM meetings m
    LEFT JOIN delegateProfiles d ON m.attendeeId = CAST(d.id AS CHAR)
    WHERE m.sponsorId = ? AND m.timeSlot = ?
    ORDER BY m.matchScore ASC
  `, [sponsorId, doubledSlot]);

  if (doubledMeetings.length < 2) { console.log(`${sponsorName}: less than 2 in slot ${doubledSlot}`); return; }

  // Try to move the lower-scoring one to ANY free slot (across all 12)
  // where: (a) sponsor has no meeting yet, and (b) delegate is free
  const [sponsorAllMeetings] = await db.execute(`SELECT timeSlot FROM meetings WHERE sponsorId = ?`, [sponsorId]);
  const sponsorSlots = new Set(sponsorAllMeetings.map(r => r.timeSlot));

  for (const meeting of doubledMeetings) {
    // Get all slots this delegate is booked in
    const [delegateMeetings] = await db.execute(`SELECT timeSlot FROM meetings WHERE attendeeId = ? AND id != ?`, [meeting.attendeeId, meeting.id]);
    const delegateSlots = new Set(delegateMeetings.map(r => r.timeSlot));

    // Find any slot where sponsor is free AND delegate is free
    const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
    let targetSlot = null;
    for (const s of allSlots) {
      if (!sponsorSlots.has(s) && !delegateSlots.has(s)) {
        targetSlot = s;
        break;
      }
    }

    if (targetSlot !== null) {
      await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [targetSlot, meeting.id]);
      fixLog.push(`✅ ${sponsorName}: moved meeting ${meeting.id} (${meeting.delegateName || meeting.attendeeId}, score ${meeting.matchScore}) from slot ${doubledSlot} → slot ${targetSlot}`);
      console.log(`✅ ${sponsorName}: moved ${meeting.delegateName || meeting.attendeeId} from slot ${doubledSlot} → slot ${targetSlot}`);
      return;
    }
  }

  console.log(`⚠️  ${sponsorName}: still unresolvable — both delegates fully booked`);
  fixLog.push(`⚠️  ${sponsorName}: unresolvable`);
}

await forceFixSponsor('The Martec', 10, 1);
await forceFixSponsor('Wilson', 3, 8);

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

console.log('\nChanges:');
fixLog.forEach(l => console.log(' ', l));

await db.end();
