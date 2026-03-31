import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get full ranked list
const [rankRows] = await conn.execute(
  'SELECT rankingsData FROM rankingsSubmissions WHERE sponsorId = 270002 ORDER BY submittedAt DESC LIMIT 1'
);
const rankedIds = Object.values(JSON.parse(rankRows[0].rankingsData));

// Load attendees to check active status
const attendeesRaw = readFileSync('/home/ubuntu/rlx-onboarding/server/attendees.ts', 'utf8');

const isActive = (id) =>
  attendeesRaw.includes('"' + id + '"') || attendeesRaw.includes("'" + id + "'");

// Original top-20
const originalTop20 = rankedIds.slice(0, 20);
const cancelled = originalTop20.filter(id => !isActive(id));

console.log('Original top-20 cancelled delegates (' + cancelled.length + '):');
cancelled.forEach(id => {
  const pos = rankedIds.indexOf(id);
  console.log('  Rank #' + (pos + 1) + ' → ' + id);
});

// After removing cancelled delegates, who slides into the effective top-20?
const activeRanked = rankedIds.filter(id => isActive(id));
const effectiveTop20 = activeRanked.slice(0, 20);

// Which ones are NEW to the top-20 (not in original top-20)?
const originalTop20Set = new Set(originalTop20);
const replacements = effectiveTop20.filter(id => !originalTop20Set.has(id));

console.log('\nDelegates who slid into effective top-20 after cancellations (' + replacements.length + '):');
replacements.forEach(id => {
  const originalPos = rankedIds.indexOf(id);
  console.log('  Originally ranked #' + (originalPos + 1) + ' → ' + id + ' → slides into effective top-20');
});

// Did Appcast actually meet these replacement delegates?
const [meetings] = await conn.execute(
  "SELECT attendeeId FROM meetings WHERE sponsorId = 270002 AND (status = 'confirmed' OR status = 'suggested') AND isVisible = 1"
);
const scheduledIds = new Set(meetings.map(m => m.attendeeId));

console.log('\n--- Did Appcast meet the replacement delegates? ---');
for (const id of replacements) {
  const originalPos = rankedIds.indexOf(id);
  const met = scheduledIds.has(id);
  console.log('  Rank #' + (originalPos + 1) + ' → ' + id + ': ' + (met ? 'YES - met' : 'NO - not scheduled'));
}

await conn.end();
