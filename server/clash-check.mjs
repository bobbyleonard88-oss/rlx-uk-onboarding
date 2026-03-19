import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [meetings] = await conn.execute(`
  SELECT 
    m.id, m.timeSlot, m.attendeeId, m.sponsorId, m.attendeeNumber,
    CONCAT(d.firstName, ' ', d.lastName) as delegateName,
    d.company as delegateCompany,
    s.companyName as sponsorName
  FROM meetings m
  LEFT JOIN delegateProfiles d ON m.attendeeId = d.attendeeId
  LEFT JOIN sponsors s ON m.sponsorId = s.id
  WHERE m.isVisible = 1 AND m.status != 'declined'
  ORDER BY m.timeSlot, m.attendeeId
`);

let totalClashTypes = 0;

// 1. Delegate double-bookings (same delegate, same slot)
console.log('=== DELEGATE CLASHES (same delegate, same time slot) ===');
const delegateSlots = {};
for (const m of meetings) {
  const key = `${m.attendeeId}_${m.timeSlot}`;
  if (!delegateSlots[key]) delegateSlots[key] = [];
  delegateSlots[key].push(m);
}
let delegateClashes = 0;
for (const group of Object.values(delegateSlots)) {
  if (group.length > 1) {
    delegateClashes++;
    console.log(`  CLASH: ${group[0].delegateName} (${group[0].delegateCompany}) — ${group.length} meetings in Slot ${group[0].timeSlot}:`);
    for (const m of group) console.log(`    - ${m.sponsorName} [ID ${m.id}]`);
  }
}
if (delegateClashes === 0) console.log('  ✅ No delegate clashes');
totalClashTypes += delegateClashes;

// 2. Sponsor over-capacity (same sponsor, same slot, more than 2 meetings total)
// Each sponsor table has 2 seats, so max 2 delegates per slot is the design
console.log('\n=== SPONSOR OVER-CAPACITY (>2 meetings in same slot) ===');
const sponsorSlots = {};
for (const m of meetings) {
  const key = `${m.sponsorId}_${m.timeSlot}`;
  if (!sponsorSlots[key]) sponsorSlots[key] = [];
  sponsorSlots[key].push(m);
}
let sponsorClashes = 0;
for (const group of Object.values(sponsorSlots)) {
  if (group.length > 2) {
    sponsorClashes++;
    console.log(`  OVER-CAPACITY: ${group[0].sponsorName} — ${group.length} meetings in Slot ${group[0].timeSlot}:`);
    for (const m of group) console.log(`    - ${m.delegateName} (${m.delegateCompany}) [ID ${m.id}]`);
  }
}
if (sponsorClashes === 0) console.log('  ✅ No sponsor over-capacity');
totalClashTypes += sponsorClashes;

// 3. Multi-rep sponsor clashes: for sponsors with 2 reps, each rep can only have 1 meeting per slot
// For single-rep sponsors: 2 meetings per slot is fine (2 seats at the table)
// For multi-rep sponsors: each rep handles their own seat, so >1 per rep is a clash
console.log('\n=== MULTI-REP SPONSOR CLASHES (rep with >1 meeting in same slot) ===');

// Count how many distinct reps each sponsor has
const sponsorRepCounts = {};
for (const m of meetings) {
  if (!sponsorRepCounts[m.sponsorId]) sponsorRepCounts[m.sponsorId] = new Set();
  sponsorRepCounts[m.sponsorId].add(m.attendeeNumber);
}

const repSlots = {};
for (const m of meetings) {
  const key = `${m.sponsorId}_${m.attendeeNumber}_${m.timeSlot}`;
  if (!repSlots[key]) repSlots[key] = [];
  repSlots[key].push(m);
}

let repClashes = 0;
for (const group of Object.values(repSlots)) {
  const numReps = sponsorRepCounts[group[0].sponsorId]?.size || 1;
  // Only flag if sponsor has multiple reps AND a single rep has >1 meeting in same slot
  if (numReps > 1 && group.length > 1) {
    repClashes++;
    console.log(`  REP CLASH: ${group[0].sponsorName} Rep ${group[0].attendeeNumber} — ${group.length} meetings in Slot ${group[0].timeSlot}:`);
    for (const m of group) console.log(`    - ${m.delegateName} (${m.delegateCompany}) [ID ${m.id}]`);
  }
}
if (repClashes === 0) console.log('  ✅ No multi-rep sponsor clashes');
totalClashTypes += repClashes;

// 4. Duplicate pairings (same delegate meets same sponsor more than once)
console.log('\n=== DUPLICATE PAIRINGS (same delegate meets same sponsor twice) ===');
const pairings = {};
for (const m of meetings) {
  const key = `${m.attendeeId}_${m.sponsorId}`;
  if (!pairings[key]) pairings[key] = [];
  pairings[key].push(m);
}
let dupClashes = 0;
for (const group of Object.values(pairings)) {
  if (group.length > 1) {
    dupClashes++;
    console.log(`  DUPLICATE: ${group[0].delegateName} meets ${group[0].sponsorName} ${group.length}x (Slots: ${group.map(m => m.timeSlot).join(', ')})`);
  }
}
if (dupClashes === 0) console.log('  ✅ No duplicate pairings');
totalClashTypes += dupClashes;

console.log('\n=== SUMMARY ===');
console.log(`Total meetings checked: ${meetings.length}`);
console.log(`Delegate double-bookings: ${delegateClashes}`);
console.log(`Sponsor over-capacity (>2/slot): ${sponsorClashes}`);
console.log(`Multi-rep sponsor clashes: ${repClashes}`);
console.log(`Duplicate pairings: ${dupClashes}`);
console.log(totalClashTypes === 0 ? '\n✅ ALL CLEAR — schedule is clean, safe to publish' : `\n❌ ${totalClashTypes} issue(s) found — do not publish until resolved`);

await conn.end();
