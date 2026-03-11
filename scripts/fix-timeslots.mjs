/**
 * Fix existing meeting time slots to split evenly across Day 1 (slots 1-6) and Day 2 (slots 7-12)
 * 
 * Old system: slots 1-6 only (all Day 1)
 * New system: slots 1-6 = Day 1, slots 7-12 = Day 2
 * 
 * For 12-meeting sponsors: first 6 meetings → slots 1-6 (Day 1), next 6 → slots 7-12 (Day 2)
 * For 20-meeting sponsors: each attendee gets 5 Day 1 + 5 Day 2
 */
import 'dotenv/config';
import mysql2 from 'mysql2/promise';

const conn = await mysql2.createConnection(process.env.DATABASE_URL);

// Get all confirmed meetings ordered by sponsor, attendee number, then current slot
const [rows] = await conn.execute(
  'SELECT id, sponsorId, attendeeNumber, timeSlot FROM meetings WHERE status = "confirmed" ORDER BY sponsorId, attendeeNumber, timeSlot'
);

// Group by sponsor + attendee number
const groups = new Map();
for (const row of rows) {
  const key = `${row.sponsorId}-${row.attendeeNumber || 1}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

let updated = 0;
for (const [key, meetings] of groups.entries()) {
  const total = meetings.length;
  const halfCount = Math.ceil(total / 2);
  
  console.log(`Group ${key}: ${total} meetings, ${halfCount} per day`);
  
  for (let i = 0; i < meetings.length; i++) {
    const meeting = meetings[i];
    let newSlot;
    
    if (i < halfCount) {
      // Day 1: slots 1-6
      newSlot = i + 1;
    } else {
      // Day 2: slots 7-12
      newSlot = (i - halfCount) + 7;
    }
    
    if (newSlot !== meeting.timeSlot) {
      await conn.execute('UPDATE meetings SET timeSlot = ? WHERE id = ?', [newSlot, meeting.id]);
      console.log(`  Meeting ${meeting.id}: slot ${meeting.timeSlot} → ${newSlot}`);
      updated++;
    } else {
      console.log(`  Meeting ${meeting.id}: slot ${meeting.timeSlot} (unchanged)`);
    }
  }
}

await conn.end();
console.log(`\nDone — updated ${updated} meeting time slots`);
