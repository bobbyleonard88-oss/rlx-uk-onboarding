import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();

// 12 slots grouped into 6 hour blocks (2 slots each)
const HOUR_BLOCKS = [
  { id: 'H1', slots: [1, 2],   label: 'Day 1 11:00–12:00' },
  { id: 'H2', slots: [3, 4],   label: 'Day 1 13:15–14:15' },
  { id: 'H3', slots: [5, 6],   label: 'Day 1 14:30–15:30' },
  { id: 'H4', slots: [7, 8],   label: 'Day 2 10:30–11:30' },
  { id: 'H5', slots: [9, 10],  label: 'Day 2 13:15–14:15' },
  { id: 'H6', slots: [11, 12], label: 'Day 2 14:30–15:30' },
];

// For each hour block, find which delegates have meetings in each slot
// Group A = delegates with meetings in BOTH slots (they stay in meeting room all hour)
// Group B = delegates with meetings in NEITHER slot (they stay in content room all hour)
// Problem = delegates with a meeting in only ONE slot (they'd have to move mid-hour)

console.log('=== GROUP A/B ROOM FEASIBILITY ===\n');
console.log('Concept: Group A stays in meeting room all hour (both slots)');
console.log('         Group B stays in content room all hour (no meetings)');
console.log('         Problem: delegates with exactly 1 meeting in the hour must move mid-hour\n');

let totalProblematic = 0;
let totalMeetingsAffected = 0;

for (const block of HOUR_BLOCKS) {
  const [s1, s2] = block.slots;
  const slot1Meetings = allMeetings.filter(m => m.timeSlot === s1);
  const slot2Meetings = allMeetings.filter(m => m.timeSlot === s2);
  const slot1Delegates = new Set(slot1Meetings.map(m => m.attendeeId));
  const slot2Delegates = new Set(slot2Meetings.map(m => m.attendeeId));
  
  // Group A: in both slots (ideal — stays in meeting room)
  const groupA = [...slot1Delegates].filter(id => slot2Delegates.has(id));
  // Group B: in neither slot (ideal — stays in content room)
  const groupB = attendees.filter(a => !slot1Delegates.has(a.id) && !slot2Delegates.has(a.id));
  // Problematic: in exactly one slot (must move mid-hour)
  const onlySlot1 = [...slot1Delegates].filter(id => !slot2Delegates.has(id));
  const onlySlot2 = [...slot2Delegates].filter(id => !slot1Delegates.has(id));
  const problematic = [...onlySlot1, ...onlySlot2];
  
  totalProblematic += problematic.length;
  totalMeetingsAffected += onlySlot1.length + onlySlot2.length;
  
  console.log(`${block.id} — ${block.label}`);
  console.log(`  Group A (both slots, stays in meeting room): ${groupA.length} delegates`);
  console.log(`  Group B (no meetings, stays in content room): ${groupB.length} delegates`);
  console.log(`  ⚠️  Problem delegates (only 1 meeting, must move): ${problematic.length}`);
  if (problematic.length > 0) {
    for (const id of onlySlot1) {
      const a = attendees.find(att => att.id === id);
      const name = a ? `${a.firstName} ${a.lastName}` : id;
      const mtg = slot1Meetings.find(m => m.attendeeId === id);
      const sponsor = allIntakes.find(i => i.sponsorId === mtg?.sponsorId);
      console.log(`    - ${name} → meeting in slot 1 only (${sponsor?.companyName || 'unknown'}), free in slot 2`);
    }
    for (const id of onlySlot2) {
      const a = attendees.find(att => att.id === id);
      const name = a ? `${a.firstName} ${a.lastName}` : id;
      const mtg = slot2Meetings.find(m => m.attendeeId === id);
      const sponsor = allIntakes.find(i => i.sponsorId === mtg?.sponsorId);
      console.log(`    - ${name} → meeting in slot 2 only (${sponsor?.companyName || 'unknown'}), free in slot 1`);
    }
  }
  console.log('');
}

console.log('=== SUMMARY ===');
console.log(`Total delegates with exactly 1 meeting in an hour block (problem cases): ${totalProblematic} instances`);
console.log(`Total meetings: ${allMeetings.length}`);
console.log('');
console.log('These are the delegates who would need to enter/exit mid-hour under A/B.');
console.log('');
console.log('To fix each problem case, one of two things would need to happen:');
console.log('  Option 1: Move their single meeting to a different hour block (freeing them for Group B)');
console.log('  Option 2: Add a second meeting in the same hour block (moving them to Group A)');
console.log('');

// Check if any problem cases could be resolved by moving meetings between slots within the same block
console.log('=== CAN PROBLEM CASES BE RESOLVED BY RESHUFFLING WITHIN BLOCKS? ===');
console.log('(Moving a meeting from one slot to another within the same hour block)');
console.log('');

let resolvableCount = 0;
let unresolvableCount = 0;

for (const block of HOUR_BLOCKS) {
  const [s1, s2] = block.slots;
  const slot1Meetings = allMeetings.filter(m => m.timeSlot === s1);
  const slot2Meetings = allMeetings.filter(m => m.timeSlot === s2);
  const slot1Delegates = new Set(slot1Meetings.map(m => m.attendeeId));
  const slot2Delegates = new Set(slot2Meetings.map(m => m.attendeeId));
  const onlySlot1 = [...slot1Delegates].filter(id => !slot2Delegates.has(id));
  const onlySlot2 = [...slot2Delegates].filter(id => !slot1Delegates.has(id));
  
  // For each "only slot 1" delegate: could we move their meeting to slot 2?
  // Constraint: the sponsor must not already have a meeting in slot 2 with this delegate
  // (they don't — that's given). But the sponsor may already have 2 meetings in slot 2 (capacity).
  for (const delegateId of onlySlot1) {
    const mtg = slot1Meetings.find(m => m.attendeeId === delegateId);
    const sponsorSlot2Count = slot2Meetings.filter(m => m.sponsorId === mtg.sponsorId).length;
    const a = attendees.find(att => att.id === delegateId);
    const name = a ? `${a.firstName} ${a.lastName}` : delegateId;
    const sponsor = allIntakes.find(i => i.sponsorId === mtg?.sponsorId);
    if (sponsorSlot2Count < 2) {
      // Could potentially move to slot 2 — but only if delegate is free in slot 2
      // (they are free since they have no slot 2 meeting in this block)
      resolvableCount++;
    } else {
      unresolvableCount++;
      console.log(`  ❌ ${block.id}: ${name} at ${sponsor?.companyName} — sponsor already at capacity in slot 2`);
    }
  }
  for (const delegateId of onlySlot2) {
    const mtg = slot2Meetings.find(m => m.attendeeId === delegateId);
    const sponsorSlot1Count = slot1Meetings.filter(m => m.sponsorId === mtg.sponsorId).length;
    const a = attendees.find(att => att.id === delegateId);
    const name = a ? `${a.firstName} ${a.lastName}` : delegateId;
    const sponsor = allIntakes.find(i => i.sponsorId === mtg?.sponsorId);
    if (sponsorSlot1Count < 2) {
      resolvableCount++;
    } else {
      unresolvableCount++;
      console.log(`  ❌ ${block.id}: ${name} at ${sponsor?.companyName} — sponsor already at capacity in slot 1`);
    }
  }
}

if (unresolvableCount === 0) {
  console.log('  ✅ All problem cases could potentially be resolved by moving meetings within the same hour block!');
}
console.log(`\nPotentially resolvable by within-block reshuffling: ${resolvableCount}`);
console.log(`Hard conflicts (sponsor at capacity in target slot): ${unresolvableCount}`);

process.exit(0);
