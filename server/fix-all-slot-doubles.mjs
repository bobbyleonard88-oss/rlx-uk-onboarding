import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

// Get all sponsors
const [sponsors] = await db.execute(`SELECT id, companyName FROM sponsors ORDER BY companyName`);

// Get all meetings
const [allMeetings] = await db.execute(`
  SELECT m.id, m.sponsorId, m.timeSlot, m.attendeeId, m.attendeeNumber
  FROM meetings m
  ORDER BY m.sponsorId, m.timeSlot
`);

let totalFixed = 0;
const fixLog = [];

for (const sponsor of sponsors) {
  const meetings = allMeetings.filter(m => m.sponsorId === sponsor.id);
  const totalMeetings = meetings.length;
  if (totalMeetings === 0) continue;

  // Multi-rep sponsors can have 2 per slot; single-rep max 1 per slot
  const maxPerSlot = totalMeetings > 12 ? 2 : 1;

  // Count meetings per slot
  const slotMap = {}; // slot -> [meeting ids]
  for (const m of meetings) {
    if (!slotMap[m.timeSlot]) slotMap[m.timeSlot] = [];
    slotMap[m.timeSlot].push(m);
  }

  const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
  const missingSlots = allSlots.filter(s => !slotMap[s] || slotMap[s].length === 0);
  const doubledSlots = allSlots.filter(s => slotMap[s] && slotMap[s].length > maxPerSlot);

  if (missingSlots.length === 0 && doubledSlots.length === 0) continue;

  // For each doubled slot, take the excess meeting(s) and move to a missing slot
  // We need to check the delegate isn't already booked in the target slot
  const missingQueue = [...missingSlots];

  for (const doubledSlot of doubledSlots) {
    const slotMeetings = slotMap[doubledSlot];
    // Keep the first maxPerSlot, move the rest
    const toMove = slotMeetings.slice(maxPerSlot);

    for (const meeting of toMove) {
      // Find a missing slot where this delegate has no other meeting
      const [delegateMeetings] = await db.execute(
        `SELECT timeSlot FROM meetings WHERE attendeeId = ? AND id != ?`,
        [meeting.attendeeId, meeting.id]
      );
      const delegateSlots = new Set(delegateMeetings.map(m => m.timeSlot));

      let targetSlot = null;
      for (let i = 0; i < missingQueue.length; i++) {
        const candidate = missingQueue[i];
        if (!delegateSlots.has(candidate)) {
          targetSlot = candidate;
          missingQueue.splice(i, 1);
          break;
        }
      }

      if (targetSlot !== null) {
        await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [targetSlot, meeting.id]);
        fixLog.push(`${sponsor.companyName.trim()}: moved meeting ${meeting.id} (delegate ${meeting.attendeeId}) from slot ${doubledSlot} → slot ${targetSlot}`);
        totalFixed++;
        // Update local slotMap
        slotMap[doubledSlot] = slotMap[doubledSlot].filter(m => m.id !== meeting.id);
        if (!slotMap[targetSlot]) slotMap[targetSlot] = [];
        slotMap[targetSlot].push(meeting);
      } else {
        fixLog.push(`⚠️  ${sponsor.companyName.trim()}: COULD NOT move meeting ${meeting.id} from slot ${doubledSlot} — delegate already booked in all missing slots`);
      }
    }
  }
}

console.log(`\nFixed ${totalFixed} slot assignments:\n`);
fixLog.forEach(l => console.log(' ', l));

// Final verification
console.log('\n--- Final verification ---');
const [finalMeetings] = await db.execute(`SELECT id, sponsorId, timeSlot FROM meetings ORDER BY sponsorId, timeSlot`);
const [finalSponsors] = await db.execute(`SELECT id, companyName FROM sponsors ORDER BY companyName`);

let allClear = true;
for (const sponsor of finalSponsors) {
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
    console.log(`⚠️  ${sponsor.companyName.trim()}: missing=${missing.join(',')}, doubled=${doubled.map(([s,c]) => `${s}(${c}x)`).join(',')}`);
  }
}
if (allClear) console.log('✅ ALL CLEAR — every real sponsor has exactly 1 meeting per slot (or 2 for multi-rep)');

await db.end();
