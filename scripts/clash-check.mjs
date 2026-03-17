import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const TIME_SLOT_LABELS = {
  1: "Day 1 · 10:15–10:45", 2: "Day 1 · 10:45–11:15",
  3: "Day 1 · 13:30–14:00", 4: "Day 1 · 14:00–14:30",
  5: "Day 1 · 14:45–15:15", 6: "Day 1 · 15:15–15:45",
  7: "Day 2 · 10:30–11:00", 8: "Day 2 · 11:00–11:30",
  9: "Day 2 · 13:15–13:45", 10: "Day 2 · 13:45–14:15",
  11: "Day 2 · 14:30–15:00", 12: "Day 2 · 15:00–15:30",
};

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT m.attendeeId, m.sponsorId, sp.companyName as sponsorName, 
         m.timeSlot, m.sponsorRepName, m.attendeeNumber, m.matchScore
  FROM meetings m
  LEFT JOIN sponsors sp ON sp.id = m.sponsorId
  ORDER BY m.attendeeId, m.timeSlot
`);

console.log(`Total meetings in database: ${rows.length}\n`);

// 1. Delegate slot clashes
const slotMap = new Map();
const duplicateMap = new Map();
const sponsorSlotMap = new Map();
const repSlotMap = new Map();

for (const r of rows) {
  // Delegate slot clash
  const key = `${r.attendeeId}_${r.timeSlot}`;
  if (!slotMap.has(key)) slotMap.set(key, []);
  slotMap.get(key).push(r.sponsorName || r.sponsorId);

  // Duplicate pairing
  const pairKey = `${r.attendeeId}_${r.sponsorId}`;
  if (!duplicateMap.has(pairKey)) duplicateMap.set(pairKey, []);
  duplicateMap.get(pairKey).push(r.timeSlot);

  // Sponsor per slot (max 2 reps)
  const sKey = `${r.sponsorId}_${r.timeSlot}`;
  if (!sponsorSlotMap.has(sKey)) sponsorSlotMap.set(sKey, []);
  sponsorSlotMap.get(sKey).push(r.attendeeId);

  // Rep double booking
  if (r.sponsorRepName) {
    const rKey = `${r.sponsorRepName}_${r.timeSlot}`;
    if (!repSlotMap.has(rKey)) repSlotMap.set(rKey, []);
    repSlotMap.get(rKey).push({ attendeeId: r.attendeeId, sponsorName: r.sponsorName });
  }
}

let clashes = 0;
for (const [k, v] of slotMap) {
  if (v.length > 1) {
    const [attendeeId, slot] = k.split('_');
    console.log(`DELEGATE CLASH: attendee ${attendeeId} at ${TIME_SLOT_LABELS[parseInt(slot)] || 'Slot ' + slot} → ${v.join(' + ')}`);
    clashes++;
  }
}
if (clashes === 0) console.log('✅ No delegate slot clashes');

let dups = 0;
for (const [k, v] of duplicateMap) {
  if (v.length > 1) {
    const [attendeeId, sponsorId] = k.split('_');
    console.log(`DUPLICATE PAIRING: attendee ${attendeeId} ↔ sponsor ${sponsorId} in slots: ${v.map(s => TIME_SLOT_LABELS[s] || 'Slot ' + s).join(', ')}`);
    dups++;
  }
}
if (dups === 0) console.log('✅ No duplicate pairings');

let overCap = 0;
for (const [k, v] of sponsorSlotMap) {
  if (v.length > 2) {
    const [sponsorId, slot] = k.split('_');
    console.log(`SPONSOR OVER CAPACITY: sponsor ${sponsorId} at ${TIME_SLOT_LABELS[parseInt(slot)] || 'Slot ' + slot} → ${v.length} meetings (max 2)`);
    overCap++;
  }
}
if (overCap === 0) console.log('✅ No sponsor over-capacity slots');

let repClash = 0;
for (const [k, v] of repSlotMap) {
  if (v.length > 1) {
    const [repName, slot] = k.split('_');
    console.log(`REP DOUBLE BOOKING: ${repName} at ${TIME_SLOT_LABELS[parseInt(slot)] || 'Slot ' + slot} → ${v.length} meetings`);
    repClash++;
  }
}
if (repClash === 0) console.log('✅ No rep double-bookings');

console.log(`\n--- SUMMARY ---`);
console.log(`Delegate slot clashes: ${clashes}`);
console.log(`Duplicate pairings: ${dups}`);
console.log(`Sponsor over-capacity slots: ${overCap}`);
console.log(`Rep double-bookings: ${repClash}`);
console.log(clashes + dups + overCap + repClash === 0 ? '\n✅ ALL CLEAN — no issues found' : '\n❌ Issues found — see above');

await conn.end();
