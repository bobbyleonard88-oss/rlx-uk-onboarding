import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

// Remaining issues after first pass:
// Amberjack: missing=6, doubled=8
// Appcast: missing=12 (multi-rep, just needs a meeting in slot 12)
// Poetry: missing=10, doubled=3
// SHL: missing=8 (multi-rep, just needs a meeting in slot 8)
// The Martec: missing=1, doubled=10
// Udder: missing=3, doubled=9
// Veremark: missing=5, doubled=12
// Wilson: missing=8, doubled=3
// Zinc: missing=11, doubled=1

// Strategy: for each doubled slot, find the excess meeting and move it to ANY slot
// where (a) the sponsor has no meeting yet, and (b) the delegate is free

const [allMeetings] = await db.execute(`SELECT id, sponsorId, timeSlot, attendeeId, attendeeNumber FROM meetings`);
const [sponsors] = await db.execute(`SELECT id, companyName FROM sponsors`);

const sponsorMap = {};
for (const s of sponsors) sponsorMap[s.id] = s.companyName.trim();

let totalFixed = 0;
const fixLog = [];

async function fixSponsor(sponsorId) {
  const meetings = allMeetings.filter(m => m.sponsorId === sponsorId);
  const totalMeetings = meetings.length;
  const maxPerSlot = totalMeetings > 12 ? 2 : 1;

  const slotMap = {};
  for (const m of meetings) {
    if (!slotMap[m.timeSlot]) slotMap[m.timeSlot] = [];
    slotMap[m.timeSlot].push(m);
  }

  const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
  const missingSlots = allSlots.filter(s => !slotMap[s] || slotMap[s].length < maxPerSlot);
  const doubledSlots = allSlots.filter(s => slotMap[s] && slotMap[s].length > maxPerSlot);

  for (const doubledSlot of doubledSlots) {
    const toMove = slotMap[doubledSlot].slice(maxPerSlot);
    for (const meeting of toMove) {
      // Get all slots this delegate is already in (across ALL sponsors)
      const [delegateMeetings] = await db.execute(
        `SELECT timeSlot FROM meetings WHERE attendeeId = ? AND id != ?`,
        [meeting.attendeeId, meeting.id]
      );
      const delegateSlots = new Set(delegateMeetings.map(m => m.timeSlot));

      // Find any slot where sponsor has no meeting AND delegate is free
      let targetSlot = null;
      for (const candidate of missingSlots) {
        if (!delegateSlots.has(candidate)) {
          targetSlot = candidate;
          break;
        }
      }

      if (targetSlot !== null) {
        await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [targetSlot, meeting.id]);
        // Update allMeetings in memory
        const idx = allMeetings.findIndex(m => m.id === meeting.id);
        if (idx >= 0) allMeetings[idx].timeSlot = targetSlot;
        fixLog.push(`${sponsorMap[sponsorId]}: moved meeting ${meeting.id} (delegate ${meeting.attendeeId}) from slot ${doubledSlot} → slot ${targetSlot}`);
        totalFixed++;
        // Update slotMap
        slotMap[doubledSlot] = slotMap[doubledSlot].filter(m => m.id !== meeting.id);
        if (!slotMap[targetSlot]) slotMap[targetSlot] = [];
        slotMap[targetSlot].push(meeting);
        // Remove targetSlot from missingSlots
        const mIdx = missingSlots.indexOf(targetSlot);
        if (mIdx >= 0) missingSlots.splice(mIdx, 1);
      } else {
        // Last resort: find ANY slot where delegate is free, even if sponsor already has a meeting there
        // (only for multi-rep sponsors where 2 per slot is allowed)
        fixLog.push(`⚠️  ${sponsorMap[sponsorId]}: STILL cannot move meeting ${meeting.id} from slot ${doubledSlot} — no clean slot available`);
      }
    }
  }
}

// Fix all remaining problem sponsors
const problemSponsors = [
  // Amberjack
  ...sponsors.filter(s => s.companyName.includes('Amberjack')).map(s => s.id),
  // Appcast
  ...sponsors.filter(s => s.companyName.includes('Appcast')).map(s => s.id),
  // Poetry
  ...sponsors.filter(s => s.companyName.includes('Poetry')).map(s => s.id),
  // SHL
  ...sponsors.filter(s => s.companyName.trim() === 'SHL').map(s => s.id),
  // The Martec
  ...sponsors.filter(s => s.companyName.includes('Martec')).map(s => s.id),
  // Udder
  ...sponsors.filter(s => s.companyName.includes('Udder')).map(s => s.id),
  // Veremark
  ...sponsors.filter(s => s.companyName.includes('Veremark')).map(s => s.id),
  // Wilson
  ...sponsors.filter(s => s.companyName.includes('Wilson')).map(s => s.id),
  // Zinc
  ...sponsors.filter(s => s.companyName.includes('Zinc')).map(s => s.id),
];

for (const sponsorId of problemSponsors) {
  await fixSponsor(sponsorId);
}

console.log(`\nFixed ${totalFixed} additional slot assignments:`);
fixLog.forEach(l => console.log(' ', l));

// Final verification
console.log('\n--- Final verification ---');
const [finalMeetings] = await db.execute(`SELECT id, sponsorId, timeSlot FROM meetings`);
let allClear = true;
for (const sponsor of sponsors) {
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
