import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Get all distinct attendee IDs in meetings
const [rows] = await conn.execute('SELECT DISTINCT attendeeId FROM meetings ORDER BY attendeeId');
const meetingIds = new Set(rows.map(r => r.attendeeId));
console.log('Distinct attendee IDs in meetings:', meetingIds.size);

// Parse attendees file
const content = readFileSync('./server/attendees.ts', 'utf8');
const arrayStart = content.indexOf('export const attendees: Attendee[] = [') + 'export const attendees: Attendee[] = '.length;
let depth = 0, arrayEnd = arrayStart;
for (let i = arrayStart; i < content.length; i++) {
  if (content[i] === '[') depth++;
  if (content[i] === ']') { depth--; if (depth === 0) { arrayEnd = i + 1; break; } }
}
const attendees = JSON.parse(content.slice(arrayStart, arrayEnd));
const attendeeMap = new Map(attendees.map(a => [a.id, a]));
console.log('Attendees in file:', attendees.length);

// Find IDs in meetings but NOT in attendees file
console.log('\nIn meetings but NOT in attendees file:');
let found = false;
for (const id of meetingIds) {
  if (!attendeeMap.has(id)) {
    console.log('  MISSING:', id);
    found = true;
  }
}
if (!found) console.log('  None — all meeting IDs are in the file');

// Find IDs in attendees file but NOT in meetings
console.log('\nIn attendees file but NO meetings:');
let found2 = false;
for (const a of attendees) {
  if (!meetingIds.has(a.id)) {
    console.log(`  NO MEETINGS: ${a.id} ${a.firstName} ${a.lastName} (${a.company})`);
    found2 = true;
  }
}
if (!found2) console.log('  None — all attendees have at least 1 meeting');

// Check Harver and Bright Apply specifically
console.log('\n=== HARVER MEETINGS ===');
const [harver] = await conn.execute(`
  SELECT m.attendeeId, m.timeSlot, m.attendeeNumber, m.matchScore
  FROM meetings m
  JOIN sponsors sp ON sp.id = m.sponsorId
  WHERE sp.companyName = 'Harver'
  ORDER BY m.timeSlot, m.attendeeNumber
`);
console.log('Harver meeting count:', harver.length);
harver.forEach(r => console.log(`  Slot ${r.timeSlot}, Rep ${r.attendeeNumber}, Delegate ${r.attendeeId}, Score ${r.matchScore}`));

console.log('\n=== BRIGHT APPLY MEETINGS ===');
const [bright] = await conn.execute(`
  SELECT m.attendeeId, m.timeSlot, m.attendeeNumber, m.matchScore
  FROM meetings m
  JOIN sponsors sp ON sp.id = m.sponsorId
  WHERE sp.companyName = 'Bright Apply'
  ORDER BY m.timeSlot, m.attendeeNumber
`);
console.log('Bright Apply meeting count:', bright.length);
bright.forEach(r => console.log(`  Slot ${r.timeSlot}, Rep ${r.attendeeNumber}, Delegate ${r.attendeeId}, Score ${r.matchScore}`));

await conn.end();
