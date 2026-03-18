
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// 1. Total meeting count
const [total] = await conn.execute('SELECT COUNT(*) as cnt FROM meetings');
console.log(JSON.stringify({check: 'total_meetings', value: total[0].cnt}));

// 2. Delegate double-bookings
const [dblDel] = await conn.execute(`
  SELECT attendeeId, timeSlot, COUNT(*) as cnt 
  FROM meetings 
  GROUP BY attendeeId, timeSlot 
  HAVING cnt > 1
`);
console.log(JSON.stringify({check: 'delegate_double_bookings', value: dblDel.length, detail: dblDel.slice(0,5)}));

// 3. Sponsor rep double-bookings (sponsor with >2 meetings in same slot = problem for 2-rep sponsors)
const [dblSponsor] = await conn.execute(`
  SELECT sponsorId, timeSlot, COUNT(*) as cnt 
  FROM meetings 
  GROUP BY sponsorId, timeSlot 
  HAVING cnt > 2
`);
console.log(JSON.stringify({check: 'sponsor_rep_overload', value: dblSponsor.length, detail: dblSponsor.slice(0,5)}));

// 4. Slot distribution
const [slotDist] = await conn.execute(`
  SELECT timeSlot, COUNT(*) as cnt 
  FROM meetings 
  GROUP BY timeSlot 
  ORDER BY timeSlot
`);
console.log(JSON.stringify({check: 'slot_distribution', value: slotDist}));

// 5. Sponsors with meetings
const [sponsorCounts] = await conn.execute(`
  SELECT s.companyName as name, COUNT(m.id) as meetingCount
  FROM sponsors s
  LEFT JOIN meetings m ON m.sponsorId = s.id
  GROUP BY s.id, s.companyName
  ORDER BY s.companyName
`);
const zeroMeetings = sponsorCounts.filter(s => s.meetingCount === 0);
console.log(JSON.stringify({check: 'sponsors_with_zero_meetings', value: zeroMeetings.length, detail: zeroMeetings}));
console.log(JSON.stringify({check: 'all_sponsor_meeting_counts', value: sponsorCounts}));

// 6. Per-hour overlap
const [meetings] = await conn.execute('SELECT attendeeId, timeSlot FROM meetings ORDER BY attendeeId, timeSlot');
const HOUR_PAIRS = [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]];
const HOUR_NAMES = {
  '1,2': 'Day 1 Hour 1 (11:00-12:00)',
  '3,4': 'Day 1 Hour 2 (13:15-14:15)',
  '5,6': 'Day 1 Hour 3 (14:30-15:30)',
  '7,8': 'Day 2 Hour 4 (10:30-11:30)',
  '9,10': 'Day 2 Hour 5 (13:15-14:15)',
  '11,12': 'Day 2 Hour 6 (14:30-15:30)',
};
const overlapResults = [];
for (const [s1, s2] of HOUR_PAIRS) {
  const inS1 = new Set(meetings.filter(m => m.timeSlot === s1).map(m => m.attendeeId));
  const inS2 = new Set(meetings.filter(m => m.timeSlot === s2).map(m => m.attendeeId));
  const both = [...inS1].filter(a => inS2.has(a)).length;
  const total = new Set([...inS1, ...inS2]).size;
  const pct = total > 0 ? Math.round(both / total * 100) : 0;
  overlapResults.push({hour: HOUR_NAMES[s1+','+s2], slot1_delegates: inS1.size, slot2_delegates: inS2.size, both, total_unique: total, overlap_pct: pct});
}
const avgOverlap = Math.round(overlapResults.reduce((a,b) => a + b.overlap_pct, 0) / overlapResults.length);
console.log(JSON.stringify({check: 'per_hour_overlap', value: overlapResults, avg: avgOverlap}));

// 7. Opt-in language check
const [optInRemaining] = await conn.execute("SELECT COUNT(*) as cnt FROM meetings WHERE matchReason LIKE '%opted in to meet%'");
console.log(JSON.stringify({check: 'optin_language_remaining', value: optInRemaining[0].cnt}));

// 8. Kirsten Barnes link check
const [kirsten] = await conn.execute("SELECT u.email, s.companyName as sponsorName, s.contactEmail FROM users u JOIN sponsors s ON s.userId = u.id WHERE u.email LIKE '%kirsten%'");
console.log(JSON.stringify({check: 'kirsten_account_link', value: kirsten}));

// 9. Duplicate pairings (same sponsor-delegate meeting twice)
const [dupPairings] = await conn.execute(`
  SELECT sponsorId, attendeeId, COUNT(*) as cnt 
  FROM meetings 
  GROUP BY sponsorId, attendeeId 
  HAVING cnt > 1
`);
console.log(JSON.stringify({check: 'duplicate_pairings', value: dupPairings.length, detail: dupPairings.slice(0,5)}));

await conn.end();
