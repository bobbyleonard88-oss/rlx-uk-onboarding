import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get Appcast rankings (rankingsData is an array-like object)
const [rankRows] = await conn.execute(
  'SELECT rankingsData FROM rankingsSubmissions WHERE sponsorId = 270002 ORDER BY submittedAt DESC LIMIT 1'
);
const rankedIds = Object.values(JSON.parse(rankRows[0].rankingsData));
console.log('Total ranked delegates:', rankedIds.length);

// Get meeting package (slot count)
const [intake] = await conn.execute(
  'SELECT meetingPackage FROM intakeSubmissions WHERE sponsorId = 270002 ORDER BY submittedAt DESC LIMIT 1'
);
const slots = intake.length ? parseInt(intake[0].meetingPackage) : 20;
console.log('Meeting slots:', slots);

// Get actual confirmed/suggested visible meetings
const [meetings] = await conn.execute(
  "SELECT attendeeId, timeSlot FROM meetings WHERE sponsorId = 270002 AND (status = 'confirmed' OR status = 'suggested') AND isVisible = 1"
);
console.log('Actual scheduled meetings:', meetings.length);

const scheduledIds = meetings.map(m => m.attendeeId);

// Top-N = number of slots
const topN = slots;
const topNList = rankedIds.slice(0, topN);
const topNSet = new Set(topNList);

const hits = scheduledIds.filter(id => topNSet.has(id));
const misses = topNList.filter(id => !scheduledIds.includes(id));

console.log('\n=== APPCAST TOP-' + topN + ' HIT RATE ===');
console.log('Meetings from top-' + topN + ' ranked: ' + hits.length + '/' + meetings.length + ' (' + ((hits.length / meetings.length) * 100).toFixed(0) + '%)');
console.log('Top-ranked delegates missed: ' + misses.length);

// Check which missed ones cancelled
const attendeesRaw = readFileSync('/home/ubuntu/rlx-onboarding/server/attendees.ts', 'utf8');
let cancelledMisses = 0;
let activeMisses = 0;
for (const id of misses) {
  const isActive = attendeesRaw.includes('"' + id + '"') || attendeesRaw.includes("'" + id + "'");
  if (!isActive) cancelledMisses++;
  else activeMisses++;
}
console.log('  Of those missed: ' + cancelledMisses + ' cancelled before event, ' + activeMisses + ' active (scheduling gap)');

// Show hits with rank positions
console.log('\n--- Delegates met who were in top-' + topN + ' rankings ---');
for (const id of hits) {
  const pos = rankedIds.indexOf(id);
  console.log('  Rank #' + (pos + 1) + ' → attendee ' + id);
}

// Show missed top picks with cancellation status
console.log('\n--- Top-' + topN + ' picks NOT scheduled ---');
for (const id of misses) {
  const pos = rankedIds.indexOf(id);
  const isActive = attendeesRaw.includes('"' + id + '"') || attendeesRaw.includes("'" + id + "'");
  console.log('  Rank #' + (pos + 1) + ' → attendee ' + id + ' [' + (isActive ? 'ACTIVE - scheduling gap' : 'CANCELLED') + ']');
}

await conn.end();
