import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

// Get all sponsors
const [sponsors] = await db.execute(`SELECT id, companyName FROM sponsors ORDER BY companyName`);

// Get all meetings
const [allMeetings] = await db.execute(`SELECT id, sponsorId, timeSlot, attendeeId, attendeeNumber FROM meetings ORDER BY sponsorId, timeSlot`);

const issues = [];

for (const sponsor of sponsors) {
  const meetings = allMeetings.filter(m => m.sponsorId === sponsor.id);
  const totalMeetings = meetings.length;
  
  // Count meetings per slot
  const slotCounts = {};
  for (const m of meetings) {
    slotCounts[m.timeSlot] = (slotCounts[m.timeSlot] || 0) + 1;
  }
  
  const usedSlots = Object.keys(slotCounts).map(Number);
  const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
  const missingSlots = allSlots.filter(s => !usedSlots.includes(s));
  
  // Multi-rep sponsors (>12 meetings) can have 2 per slot; single-rep max 1 per slot
  const maxPerSlot = totalMeetings > 12 ? 2 : 1;
  const doubledSlots = Object.entries(slotCounts)
    .filter(([slot, count]) => count > maxPerSlot)
    .map(([slot, count]) => ({ slot: Number(slot), count }));
  
  if (missingSlots.length > 0 || doubledSlots.length > 0) {
    issues.push({
      sponsor: sponsor.companyName.trim(),
      id: sponsor.id,
      totalMeetings,
      missingSlots,
      doubledSlots,
      slotCounts
    });
  }
}

if (issues.length === 0) {
  console.log('ALL CLEAR - No doubled or missing slots found across all sponsors.');
} else {
  console.log(`ISSUES FOUND: ${issues.length} sponsors have problems\n`);
  for (const issue of issues) {
    console.log(`${issue.sponsor} (${issue.totalMeetings} meetings):`);
    if (issue.missingSlots.length > 0) console.log(`  Missing slots: ${issue.missingSlots.join(', ')}`);
    if (issue.doubledSlots.length > 0) console.log(`  Doubled slots: ${issue.doubledSlots.map(d => `slot ${d.slot} (${d.count}x)`).join(', ')}`);
    console.log();
  }
}

await db.end();
