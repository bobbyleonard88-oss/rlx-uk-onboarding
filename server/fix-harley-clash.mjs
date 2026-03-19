import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// James Harley's schedule
const jhId = '116903349643';

const [schedule] = await conn.execute(`
  SELECT m.id, m.timeSlot, s.companyName, m.sponsorId, m.attendeeNumber
  FROM meetings m JOIN sponsors s ON m.sponsorId = s.id
  WHERE m.attendeeId = ? AND m.isVisible = 1 AND m.status != 'declined'
  ORDER BY m.timeSlot
`, [jhId]);

console.log('James Harley current schedule:');
for (const r of schedule) console.log(`  Slot ${r.timeSlot}: ${r.companyName} [ID ${r.id}]`);

const usedSlots = new Set(schedule.map(r => r.timeSlot));
const freeSlots = [1,2,3,4,5,6,7,8,9,10,11,12].filter(s => !usedSlots.has(s));
console.log('His free slots:', freeSlots);

// James only has 4 meetings (slots 9,9,10,11,12) — very light schedule
// Free slots: 1,2,3,4,5,6,7,8

// Get hackajob and Symphony IDs
const hackRow = schedule.find(r => r.companyName === 'hackajob');
const sympRow = schedule.find(r => r.companyName.includes('Symphony'));

// Check hackajob slot usage
const [hackSlots] = await conn.execute(`
  SELECT timeSlot, COUNT(*) as cnt FROM meetings 
  WHERE sponsorId = ? AND isVisible = 1 AND status != 'declined'
  GROUP BY timeSlot ORDER BY timeSlot
`, [hackRow.sponsorId]);

const hackBusy = new Set(hackSlots.filter(r => r.cnt >= 2).map(r => r.timeSlot));
const hackFreeForMove = freeSlots.filter(s => !hackBusy.has(s));
console.log('\nhackajob busy slots (full):', [...hackBusy]);
console.log('Can move hackajob meeting to:', hackFreeForMove);

// Check Symphony slot usage
const [sympSlots] = await conn.execute(`
  SELECT timeSlot, COUNT(*) as cnt FROM meetings 
  WHERE sponsorId = ? AND isVisible = 1 AND status != 'declined'
  GROUP BY timeSlot ORDER BY timeSlot
`, [sympRow.sponsorId]);

const sympBusy = new Set(sympSlots.filter(r => r.cnt >= 2).map(r => r.timeSlot));
const sympFreeForMove = freeSlots.filter(s => !sympBusy.has(s));
console.log('\nSymphony busy slots (full):', [...sympBusy]);
console.log('Can move Symphony meeting to:', sympFreeForMove);

// Pick the best option — prefer moving to an earlier slot to keep schedule balanced
// Try Symphony first (it's the lower-priority meeting based on ID order)
if (sympFreeForMove.length > 0) {
  const targetSlot = sympFreeForMove[0];
  console.log(`\n→ Moving Symphony Talent meeting (ID ${sympRow.id}) from Slot 9 to Slot ${targetSlot}`);
  await conn.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [targetSlot, sympRow.id]);
  console.log('✅ Done — clash resolved');
} else if (hackFreeForMove.length > 0) {
  const targetSlot = hackFreeForMove[0];
  console.log(`\n→ Moving hackajob meeting (ID ${hackRow.id}) from Slot 9 to Slot ${targetSlot}`);
  await conn.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [targetSlot, hackRow.id]);
  console.log('✅ Done — clash resolved');
} else {
  console.log('\n❌ No valid slot found to move either meeting — manual intervention needed');
}

// Verify
const [updated] = await conn.execute(`
  SELECT m.id, m.timeSlot, s.companyName
  FROM meetings m JOIN sponsors s ON m.sponsorId = s.id
  WHERE m.attendeeId = ? AND m.isVisible = 1 AND m.status != 'declined'
  ORDER BY m.timeSlot
`, [jhId]);
console.log('\nJames Harley updated schedule:');
for (const r of updated) console.log(`  Slot ${r.timeSlot}: ${r.companyName} [ID ${r.id}]`);

await conn.end();
