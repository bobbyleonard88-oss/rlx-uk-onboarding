/**
 * Update match scores for opt-in meetings to 90-100%
 * A delegate "opted in" if the sponsor name appears in their optInSponsors array.
 * We clamp the score to min 90, preserving any score already >= 90.
 * Scores are distributed: existing score >= 90 stays, otherwise set to 90 + random 0-10.
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DATABASE_URL = process.env.DATABASE_URL;

// Load attendees from server file (39 entries)
const serverAttendeesContent = readFileSync('/home/ubuntu/rlx-onboarding/server/attendees.ts', 'utf8');
// Parse the attendees array from the TS file
const attendeesMatch = serverAttendeesContent.match(/export const attendees[^=]*=\s*(\[[\s\S]*\]);/);
if (!attendeesMatch) throw new Error('Could not parse attendees');
const attendees = JSON.parse(attendeesMatch[1]);

console.log(`Loaded ${attendees.length} attendees`);

// Build a map: attendeeId -> Set of sponsor name fragments they opted into
const optInMap = new Map();
for (const a of attendees) {
  if (a.optInSponsors && a.optInSponsors.length > 0) {
    optInMap.set(a.id, a.optInSponsors.map(s => s.toLowerCase()));
  }
}
console.log(`${optInMap.size} delegates have opt-in sponsors`);

const conn = await mysql.createConnection(DATABASE_URL);

// Get all confirmed meetings with their sponsor names
const [meetings] = await conn.execute(`
  SELECT m.id, m.attendeeId, m.matchScore, s.companyName
  FROM meetings m
  JOIN sponsors s ON m.sponsorId = s.id
  WHERE m.status IN ('suggested', 'confirmed')
`);

console.log(`Found ${meetings.length} confirmed meetings`);

let updated = 0;
let alreadyHigh = 0;
let noOptIn = 0;

for (const meeting of meetings) {
  const delegateOptIns = optInMap.get(meeting.attendeeId);
  if (!delegateOptIns) { noOptIn++; continue; }

  const sponsorNameLower = (meeting.companyName || '').toLowerCase();
  const hasOptIn = delegateOptIns.some(s =>
    s.includes(sponsorNameLower) || sponsorNameLower.includes(s)
  );

  if (!hasOptIn) { noOptIn++; continue; }

  if (meeting.matchScore >= 90) {
    alreadyHigh++;
    continue;
  }

  // Set to 90-100 range, using a deterministic spread based on existing score
  // Higher original score -> higher opt-in score (preserves relative ranking)
  const boost = Math.min(10, Math.max(0, Math.round((meeting.matchScore / 89) * 10)));
  const newScore = 90 + boost;

  await conn.execute('UPDATE meetings SET matchScore = ? WHERE id = ?', [newScore, meeting.id]);
  console.log(`  Updated meeting ${meeting.id}: ${meeting.attendeeId} @ ${meeting.companyName}: ${meeting.matchScore} -> ${newScore}`);
  updated++;
}

await conn.end();

console.log(`\nDone. Updated: ${updated}, Already >=90: ${alreadyHigh}, No opt-in: ${noOptIn}`);
