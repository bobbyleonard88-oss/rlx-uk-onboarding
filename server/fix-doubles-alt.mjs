import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

// For each doubled sponsor, instead of moving the "problem" delegate,
// try moving the OTHER meeting in the doubled slot to the missing slot
// (if that other delegate is free in the missing slot)

const problems = [
  { name: 'Amberjack', sponsorId: null, doubledSlot: 8, missingSlot: 6, keepMeetingId: 663492 },
  { name: 'Poetry', sponsorId: null, doubledSlot: 3, missingSlot: 10, keepMeetingId: 663572 },
  { name: 'The Martec', sponsorId: null, doubledSlot: 10, missingSlot: 1, keepMeetingId: 663518 },
  { name: 'Udder', sponsorId: null, doubledSlot: 9, missingSlot: 3, keepMeetingId: 663456 },
  { name: 'Wilson', sponsorId: null, doubledSlot: 3, missingSlot: 8, keepMeetingId: 840009 },
  { name: 'Zinc', sponsorId: null, doubledSlot: 1, missingSlot: 11, keepMeetingId: 663430 },
];

// Resolve sponsor IDs
const [allSponsors] = await db.execute(`SELECT id, companyName FROM sponsors`);
for (const p of problems) {
  const s = allSponsors.find(s => s.companyName.trim().toLowerCase().includes(p.name.toLowerCase()));
  if (s) p.sponsorId = s.id;
}

const fixLog = [];

for (const p of problems) {
  if (!p.sponsorId) { console.log(`${p.name}: sponsor not found`); continue; }

  // Get all meetings in the doubled slot for this sponsor
  const [doubledMeetings] = await db.execute(
    `SELECT id, attendeeId FROM meetings WHERE sponsorId = ? AND timeSlot = ?`,
    [p.sponsorId, p.doubledSlot]
  );

  // The "other" meeting is the one that's NOT the keepMeetingId
  const otherMeeting = doubledMeetings.find(m => m.id !== p.keepMeetingId);
  if (!otherMeeting) { console.log(`${p.name}: no other meeting found in slot ${p.doubledSlot}`); continue; }

  // Check if this other delegate is free in the missing slot
  const [delegateInMissingSlot] = await db.execute(
    `SELECT id FROM meetings WHERE attendeeId = ? AND timeSlot = ?`,
    [otherMeeting.attendeeId, p.missingSlot]
  );

  if (delegateInMissingSlot.length === 0) {
    // Free! Move it
    await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [p.missingSlot, otherMeeting.id]);
    fixLog.push(`✅ ${p.name}: moved meeting ${otherMeeting.id} (delegate ${otherMeeting.attendeeId}) from slot ${p.doubledSlot} → slot ${p.missingSlot}`);
    console.log(`✅ ${p.name}: moved other meeting from slot ${p.doubledSlot} → slot ${p.missingSlot}`);
  } else {
    // Also blocked — try a deeper chain: move the blocker for THIS delegate
    const blocker = delegateInMissingSlot[0];
    const [blockerFull] = await db.execute(`SELECT sponsorId, timeSlot FROM meetings WHERE id = ?`, [blocker.id]);
    const blockerSponsorId = blockerFull[0].sponsorId;

    // Find a free slot for the blocker's sponsor
    const [blockerSponsorSlots] = await db.execute(`SELECT timeSlot FROM meetings WHERE sponsorId = ?`, [blockerSponsorId]);
    const blockerSponsorSlotSet = new Set(blockerSponsorSlots.map(r => r.timeSlot));
    const [delegateSlots] = await db.execute(`SELECT timeSlot FROM meetings WHERE attendeeId = ? AND id != ?`, [otherMeeting.attendeeId, blocker.id]);
    const delegateSlotSet = new Set(delegateSlots.map(r => r.timeSlot));

    const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
    let chainTarget = null;
    for (const s of allSlots) {
      if (!blockerSponsorSlotSet.has(s) && !delegateSlotSet.has(s) && s !== p.missingSlot) {
        chainTarget = s;
        break;
      }
    }

    if (chainTarget !== null) {
      await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [chainTarget, blocker.id]);
      await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [p.missingSlot, otherMeeting.id]);
      fixLog.push(`✅ ${p.name}: chain-swap — blocker meeting ${blocker.id} slot ${p.missingSlot}→${chainTarget}, then other meeting ${otherMeeting.id} slot ${p.doubledSlot}→${p.missingSlot}`);
      console.log(`✅ ${p.name}: chain-swap success`);
    } else {
      fixLog.push(`⚠️  ${p.name}: STILL cannot resolve — both delegates blocked in slot ${p.missingSlot}`);
      console.log(`⚠️  ${p.name}: unresolvable`);
    }
  }
}

// Final verification
console.log('\n=== Final Verification ===');
const [finalMeetings] = await db.execute(`SELECT id, sponsorId, timeSlot FROM meetings`);
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
if (allClear) console.log('✅ ALL CLEAR');

console.log('\nChanges made:');
fixLog.forEach(l => console.log(' ', l));

await db.end();
