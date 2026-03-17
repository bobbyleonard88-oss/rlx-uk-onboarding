import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import { writeFileSync, readFileSync } from 'fs';
dotenv.config();

// Parse attendees from the TypeScript file
const attendeesRaw = readFileSync('/home/ubuntu/rlx-onboarding/server/attendees.ts', 'utf8');
const jsonMatch = attendeesRaw.match(/export const attendees: Attendee\[\] = (\[[\s\S]+?\]);\s*$/m);
// Extract the JSON array - find the array start and parse it
const arrayStart = attendeesRaw.indexOf('export const attendees: Attendee[] = [') + 'export const attendees: Attendee[] = '.length;
// Find the matching closing bracket
let depth = 0;
let arrayEnd = arrayStart;
for (let i = arrayStart; i < attendeesRaw.length; i++) {
  if (attendeesRaw[i] === '[') depth++;
  if (attendeesRaw[i] === ']') {
    depth--;
    if (depth === 0) { arrayEnd = i + 1; break; }
  }
}
const attendeesJson = attendeesRaw.slice(arrayStart, arrayEnd);
const attendees = JSON.parse(attendeesJson);
const attendeeMap = {};
for (const a of attendees) {
  attendeeMap[a.id] = a;
}
console.log(`Loaded ${attendees.length} attendees`);

const TIME_SLOT_LABELS = {
  1: "Wed 10:15-10:45",
  2: "Wed 10:45-11:15",
  3: "Wed 13:30-14:00",
  4: "Wed 14:00-14:30",
  5: "Wed 14:45-15:15",
  6: "Wed 15:15-15:45",
  7: "Thu 10:30-11:00",
  8: "Thu 11:00-11:30",
  9: "Thu 13:15-13:45",
  10: "Thu 13:45-14:15",
  11: "Thu 14:30-15:00",
  12: "Thu 15:00-15:30",
};

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT m.attendeeId, m.sponsorId, sp.companyName as sponsorName, 
         m.timeSlot, m.sponsorRepName, m.attendeeNumber, m.matchScore
  FROM meetings m
  LEFT JOIN sponsors sp ON sp.id = m.sponsorId
  ORDER BY m.timeSlot, sp.companyName, m.attendeeId
`);

console.log(`Total meetings: ${rows.length}`);

// Build per-sponsor CSV (for clash checking)
const lines = ['Sponsor,Delegate Name,Company,Time Slot,Slot Number,Rep Name,Match Score'];
for (const r of rows) {
  const a = attendeeMap[r.attendeeId];
  const delegateName = a ? `${a.firstName} ${a.lastName}` : `ID:${r.attendeeId}`;
  const company = a ? a.company : 'Unknown';
  const slotLabel = TIME_SLOT_LABELS[r.timeSlot] || `Slot ${r.timeSlot}`;
  const score = r.matchScore ? `${Math.round(r.matchScore)}%` : 'N/A';
  lines.push([
    r.sponsorName || r.sponsorId,
    delegateName,
    company,
    slotLabel,
    r.timeSlot,
    r.sponsorRepName || '',
    score,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
}

const csvContent = lines.join('\n');
writeFileSync('/home/ubuntu/rlx-onboarding/scripts/meetings-export.csv', csvContent);
console.log('✅ Per-sponsor CSV written to scripts/meetings-export.csv');

// Build per-delegate schedule
const delegateLines = ['Delegate Name,Company,Slot 1 (Wed 10:15),Slot 2 (Wed 10:45),Slot 3 (Wed 13:30),Slot 4 (Wed 14:00),Slot 5 (Wed 14:45),Slot 6 (Wed 15:15),Slot 7 (Thu 10:30),Slot 8 (Thu 11:00),Slot 9 (Thu 13:15),Slot 10 (Thu 13:45),Slot 11 (Thu 14:30),Slot 12 (Thu 15:00),Total Meetings'];

const byAttendee = {};
for (const r of rows) {
  if (!byAttendee[r.attendeeId]) byAttendee[r.attendeeId] = {};
  byAttendee[r.attendeeId][r.timeSlot] = r.sponsorName || r.sponsorId;
}

for (const [attendeeId, slots] of Object.entries(byAttendee)) {
  const a = attendeeMap[attendeeId];
  const name = a ? `${a.firstName} ${a.lastName}` : `ID:${attendeeId}`;
  const company = a ? a.company : 'Unknown';
  const row = [name, company];
  for (let s = 1; s <= 12; s++) {
    row.push(slots[s] || '');
  }
  row.push(Object.keys(slots).length);
  delegateLines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
}

writeFileSync('/home/ubuntu/rlx-onboarding/scripts/delegate-schedule.csv', delegateLines.join('\n'));
console.log('✅ Delegate schedule written to scripts/delegate-schedule.csv');

// Clash detection
console.log('\n--- CLASH ANALYSIS ---');
const slotMap = new Map();
const duplicateMap = new Map();

for (const r of rows) {
  const key = `${r.attendeeId}_${r.timeSlot}`;
  if (!slotMap.has(key)) slotMap.set(key, []);
  slotMap.get(key).push(r.sponsorName);

  const pairKey = `${r.attendeeId}_${r.sponsorId}`;
  if (!duplicateMap.has(pairKey)) duplicateMap.set(pairKey, []);
  duplicateMap.get(pairKey).push(r.timeSlot);
}

let clashes = 0;
for (const [k, v] of slotMap) {
  if (v.length > 1) {
    const [attendeeId, slot] = k.split('_');
    const a = attendeeMap[attendeeId];
    const name = a ? `${a.firstName} ${a.lastName}` : attendeeId;
    console.log(`CLASH: ${name} at ${TIME_SLOT_LABELS[parseInt(slot)]} → ${v.join(' + ')}`);
    clashes++;
  }
}
if (clashes === 0) console.log('✅ No delegate slot clashes');

let dups = 0;
for (const [k, v] of duplicateMap) {
  if (v.length > 1) {
    const [attendeeId, sponsorId] = k.split('_');
    const a = attendeeMap[attendeeId];
    const name = a ? `${a.firstName} ${a.lastName}` : attendeeId;
    console.log(`DUPLICATE: ${name} ↔ sponsor ${sponsorId} in slots: ${v.join(', ')}`);
    dups++;
  }
}
if (dups === 0) console.log('✅ No duplicate pairings');

console.log(`\nTotal: ${rows.length} meetings, ${clashes} clashes, ${dups} duplicates`);

await conn.end();
