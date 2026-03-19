import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();

// 12 slots grouped into 6 hour blocks (2 slots each)
const HOUR_BLOCKS = [
  { id: 'H1', slots: [1, 2],  label: 'Day 1 11:00–12:00' },
  { id: 'H2', slots: [3, 4],  label: 'Day 1 13:15–14:15' },
  { id: 'H3', slots: [5, 6],  label: 'Day 1 14:30–15:30' },
  { id: 'H4', slots: [7, 8],  label: 'Day 2 10:30–11:30' },
  { id: 'H5', slots: [9, 10], label: 'Day 2 13:15–14:15' },
  { id: 'H6', slots: [11, 12],label: 'Day 2 14:30–15:30' },
];

// For each delegate, how many meetings do they have total?
const delegateMeetings = {};
for (const m of allMeetings) {
  if (!delegateMeetings[m.attendeeId]) delegateMeetings[m.attendeeId] = [];
  delegateMeetings[m.attendeeId].push(m);
}

// For each sponsor, how many meetings do they have total?
const sponsorMeetings = {};
for (const m of allMeetings) {
  if (!sponsorMeetings[m.sponsorId]) sponsorMeetings[m.sponsorId] = [];
  sponsorMeetings[m.sponsorId].push(m);
}

console.log('=== GROUP A/B FEASIBILITY: SAME PAIRINGS, JUST REARRANGE SLOTS ===\n');
console.log('Question: Can we keep all 279 meetings but redistribute them across 12 slots');
console.log('so that no delegate has meetings in both slots of the same hour block?\n');

// Key constraint: each delegate has at most 8 meetings across 12 slots
// For Group A/B: each delegate can be in at most 1 slot per hour block
// With 6 hour blocks × 1 slot each = max 6 meetings per delegate
// But 24 delegates have 8 meetings — they need 8 slots, but with A/B they can only use 6!

console.log('=== CRITICAL CONSTRAINT: DELEGATE MEETING COUNTS ===');
const meetingCounts = {};
for (const [id, meetings] of Object.entries(delegateMeetings)) {
  meetingCounts[id] = meetings.length;
}
const counts = Object.values(meetingCounts).sort((a,b) => b-a);
const dist = {};
for (const c of counts) dist[c] = (dist[c] || 0) + 1;
for (const [k,v] of Object.entries(dist).sort((a,b) => Number(b)-Number(a))) {
  console.log(`  ${k} meetings: ${v} delegates`);
}

console.log('\n--- KEY INSIGHT ---');
console.log('With Group A/B: each delegate can attend at most 1 slot per hour block');
console.log('6 hour blocks × 1 slot = MAX 6 meetings per delegate');
console.log('');
const over6 = Object.entries(meetingCounts).filter(([,c]) => c > 6);
console.log(`Delegates with MORE than 6 meetings (cannot fit in A/B without losing meetings):`);
console.log(`  ${over6.length} delegates have 7 or 8 meetings`);
for (const [id, count] of over6) {
  const a = attendees.find(att => att.id === id);
  const name = a ? `${a.firstName} ${a.lastName}` : id;
  console.log(`  - ${name}: ${count} meetings`);
}

console.log('\n--- SPONSOR CONSTRAINT ---');
console.log('With Group A/B: each sponsor can only have meetings in 1 slot per hour block');
console.log('6 hour blocks × 1 slot = MAX 6 meetings per sponsor (or 12 with 2 reps)');
const sponsorCounts = {};
for (const [id, meetings] of Object.entries(sponsorMeetings)) {
  sponsorCounts[id] = meetings.length;
}
const allIntakes = await db.getAllIntakeSubmissions();
const over12 = Object.entries(sponsorCounts).filter(([,c]) => c > 12);
const over6s = Object.entries(sponsorCounts).filter(([,c]) => c > 6 && c <= 12);
console.log(`Sponsors with >12 meetings (impossible even with 2 reps): ${over12.length}`);
for (const [id, count] of over12) {
  const intake = allIntakes.find(i => i.sponsorId === id);
  console.log(`  - ${intake?.companyName || id}: ${count} meetings`);
}
console.log(`Sponsors with 7–12 meetings (need 2 reps to fit in A/B): ${over6s.length}`);
for (const [id, count] of over6s) {
  const intake = allIntakes.find(i => i.sponsorId === id);
  console.log(`  - ${intake?.companyName || id}: ${count} meetings`);
}

console.log('\n=== CONCLUSION ===');
console.log(`Total delegates: ${attendees.length}`);
console.log(`Delegates with ≤6 meetings (can fit in A/B): ${Object.values(meetingCounts).filter(c => c <= 6).length}`);
console.log(`Delegates with 7-8 meetings (CANNOT fit without reducing meetings): ${over6.length}`);
console.log('');
console.log('VERDICT: Group A/B is NOT feasible without reducing meeting counts.');
console.log(`${over6.length} delegates have 7 or 8 meetings, but A/B allows max 6 per delegate.`);
console.log('To implement A/B, you would need to either:');
console.log('  a) Reduce these delegates from 7-8 meetings to 6 (losing ~50+ meetings total)');
console.log('  b) Allow exceptions for high-meeting delegates (partial A/B)');
console.log('  c) Use a different grouping — e.g. 3 slots per block instead of 2');

process.exit(0);
