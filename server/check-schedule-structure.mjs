import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();

// Real slot structure — slots 4, 6, 10, 12 are content/gaps (not used for meetings)
const TIME_SLOTS = [
  { id: 1,  day: 1, time: '11:00–11:30', hour: 'H1', hourLabel: 'Day 1 Hour 1 (11:00–12:00)' },
  { id: 2,  day: 1, time: '11:30–12:00', hour: 'H1', hourLabel: 'Day 1 Hour 1 (11:00–12:00)' },
  { id: 3,  day: 1, time: '13:15–13:45', hour: 'H2', hourLabel: 'Day 1 Hour 2 (13:15–14:15)' },
  // slot 4 = 13:45–14:15 — also used for meetings
  { id: 4,  day: 1, time: '13:45–14:15', hour: 'H2', hourLabel: 'Day 1 Hour 2 (13:15–14:15)' },
  { id: 5,  day: 1, time: '14:30–15:00', hour: 'H3', hourLabel: 'Day 1 Hour 3 (14:30–15:30)' },
  // slot 6 = 15:00–15:30 — also used
  { id: 6,  day: 1, time: '15:00–15:30', hour: 'H3', hourLabel: 'Day 1 Hour 3 (14:30–15:30)' },
  { id: 7,  day: 2, time: '10:30–11:00', hour: 'H4', hourLabel: 'Day 2 Hour 1 (10:30–11:30)' },
  { id: 8,  day: 2, time: '11:00–11:30', hour: 'H4', hourLabel: 'Day 2 Hour 1 (10:30–11:30)' },
  { id: 9,  day: 2, time: '13:15–13:45', hour: 'H5', hourLabel: 'Day 2 Hour 2 (13:15–14:15)' },
  // slot 10 = 13:45–14:15
  { id: 10, day: 2, time: '13:45–14:15', hour: 'H5', hourLabel: 'Day 2 Hour 2 (13:15–14:15)' },
  { id: 11, day: 2, time: '14:30–15:00', hour: 'H6', hourLabel: 'Day 2 Hour 3 (14:30–15:30)' },
  // slot 12 = 15:00–15:30
  { id: 12, day: 2, time: '15:00–15:30', hour: 'H6', hourLabel: 'Day 2 Hour 3 (14:30–15:30)' },
];

// Count meetings per slot
const meetingsPerSlot = {};
for (const slot of TIME_SLOTS) {
  meetingsPerSlot[slot.id] = allMeetings.filter(m => m.timeSlot === slot.id);
}

console.log('=== CURRENT SCHEDULE STRUCTURE ===\n');
console.log('Total meetings:', allMeetings.length);
console.log('Total delegates:', attendees.length);
console.log('Total sponsors:', allIntakes.length);

console.log('\n=== MEETINGS PER SLOT ===');
for (const slot of TIME_SLOTS) {
  const meetings = meetingsPerSlot[slot.id];
  const delegateIds = [...new Set(meetings.map(m => m.attendeeId))];
  console.log(`Slot ${slot.id} (${slot.time}): ${meetings.length} meetings, ${delegateIds.length} unique delegates`);
}

// Per-hour-block analysis
console.log('\n=== MEETINGS PER HOUR BLOCK ===');
const hourBlocks = ['H1','H2','H3','H4','H5','H6'];
for (const hour of hourBlocks) {
  const blockSlots = TIME_SLOTS.filter(s => s.hour === hour);
  const blockMeetings = blockSlots.flatMap(s => meetingsPerSlot[s.id]);
  const delegateIds = [...new Set(blockMeetings.map(m => m.attendeeId))];
  const label = blockSlots[0].hourLabel;
  console.log(`\n${hour} — ${label}`);
  console.log(`  Total meetings: ${blockMeetings.length}`);
  console.log(`  Unique delegates in meetings: ${delegateIds.length}/${attendees.length}`);
  console.log(`  Delegates NOT in any meeting this hour: ${attendees.length - delegateIds.length}`);
  
  // Breakdown by slot
  for (const slot of blockSlots) {
    const m = meetingsPerSlot[slot.id];
    console.log(`  Slot ${slot.id} (${slot.time}): ${m.length} meetings`);
  }
  
  // How many delegates have meetings in BOTH slots?
  const slot1Delegates = new Set(meetingsPerSlot[blockSlots[0].id].map(m => m.attendeeId));
  const slot2Delegates = new Set(meetingsPerSlot[blockSlots[1].id].map(m => m.attendeeId));
  const bothSlots = [...slot1Delegates].filter(id => slot2Delegates.has(id));
  const onlySlot1 = [...slot1Delegates].filter(id => !slot2Delegates.has(id));
  const onlySlot2 = [...slot2Delegates].filter(id => !slot1Delegates.has(id));
  console.log(`  Delegates with meetings in BOTH slots (back-to-back): ${bothSlots.length}`);
  console.log(`  Delegates with meeting in slot 1 only: ${onlySlot1.length}`);
  console.log(`  Delegates with meeting in slot 2 only: ${onlySlot2.length}`);
  console.log(`  Delegates free this entire hour: ${attendees.length - delegateIds.length}`);
}

// Group A/B feasibility
console.log('\n=== GROUP A/B FEASIBILITY ANALYSIS ===');
console.log('Goal: In each hour block, split delegates into Group A (in meetings) and Group B (free)');
console.log('This requires: each delegate has meetings in at most ONE of the two slots per hour block\n');

let totalConflicts = 0;
let totalMeetingsToMove = 0;

for (const hour of hourBlocks) {
  const blockSlots = TIME_SLOTS.filter(s => s.hour === hour);
  const slot1 = blockSlots[0];
  const slot2 = blockSlots[1];
  const slot1Meetings = meetingsPerSlot[slot1.id];
  const slot2Meetings = meetingsPerSlot[slot2.id];
  const slot1Delegates = new Set(slot1Meetings.map(m => m.attendeeId));
  const slot2Delegates = new Set(slot2Meetings.map(m => m.attendeeId));
  const conflicts = [...slot1Delegates].filter(id => slot2Delegates.has(id));
  
  if (conflicts.length > 0) {
    totalConflicts += conflicts.length;
    totalMeetingsToMove += conflicts.length; // Each conflict = 1 meeting needs to move
    console.log(`${hour} (${slot1.time} + ${slot2.time}): ${conflicts.length} delegates in BOTH slots`);
    for (const id of conflicts) {
      const a = attendees.find(att => att.id === id);
      const name = a ? `${a.firstName} ${a.lastName}` : id;
      console.log(`  - ${name}`);
    }
  } else {
    console.log(`${hour} (${slot1.time} + ${slot2.time}): ✅ No conflicts — all delegates in at most 1 slot`);
  }
}

console.log(`\nTotal delegates with back-to-back meetings in same hour: ${totalConflicts}`);
console.log(`Minimum meetings that would need to move: ${totalMeetingsToMove}`);
console.log(`Total meetings: ${allMeetings.length}`);
console.log(`% of meetings requiring movement: ${((totalMeetingsToMove / allMeetings.length) * 100).toFixed(1)}%`);

// Sponsor capacity analysis
console.log('\n=== SPONSOR CAPACITY CONSTRAINTS ===');
const sponsorSlotCounts = {};
for (const m of allMeetings) {
  const key = `${m.sponsorId}-${m.timeSlot}`;
  sponsorSlotCounts[key] = (sponsorSlotCounts[key] || 0) + 1;
}
const maxPerSlot = Math.max(...Object.values(sponsorSlotCounts));
const slotsWithMultiple = Object.entries(sponsorSlotCounts).filter(([,v]) => v > 1);
console.log(`Max meetings a single sponsor has in one slot: ${maxPerSlot}`);
console.log(`Sponsor-slot combinations with >1 meeting (multiple reps): ${slotsWithMultiple.length}`);

// For Group A/B: how many sponsors have meetings in BOTH slots of an hour block?
console.log('\nSponsors with meetings in both slots of an hour block (constraint for reshuffling):');
let sponsorBlockConflicts = 0;
for (const hour of hourBlocks) {
  const blockSlots = TIME_SLOTS.filter(s => s.hour === hour);
  const slot1Sponsors = new Set(meetingsPerSlot[blockSlots[0].id].map(m => m.sponsorId));
  const slot2Sponsors = new Set(meetingsPerSlot[blockSlots[1].id].map(m => m.sponsorId));
  const bothSlotSponsors = [...slot1Sponsors].filter(id => slot2Sponsors.has(id));
  sponsorBlockConflicts += bothSlotSponsors.length;
  console.log(`  ${hour}: ${bothSlotSponsors.length} sponsors in both slots`);
}
console.log(`Total sponsor-block conflicts: ${sponsorBlockConflicts}`);

// Staggered timing analysis
console.log('\n=== APPROACH 2: STAGGERED TIMING ANALYSIS ===');
console.log('Current structure per hour block:');
console.log('  Slot A: 30 min meeting');
console.log('  Slot B: 30 min meeting (back-to-back)');
console.log('\nProposed staggered structure:');
console.log('  Slot A: 30 min meeting');
console.log('  30 min gap (content session / free time)');
console.log('  Slot B: 30 min meeting');
console.log('\nImpact on total event time:');
const totalGapsAdded = 6; // 6 hour blocks × 1 gap each
console.log(`  Current total meeting time per day: ~3 hours (6 slots × 30 min)`);
console.log(`  Added gap time: ${totalGapsAdded * 30} minutes (${totalGapsAdded} gaps × 30 min)`);
console.log(`  New total event time: ~6 hours per day (if gaps added within day)`);
console.log(`  OR: reduce meeting slots from 12 to 8 (remove one slot per hour block)`);

process.exit(0);
