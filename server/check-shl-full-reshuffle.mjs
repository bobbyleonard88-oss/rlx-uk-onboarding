import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SHL_ID = 750001;
const JAMES_ID = '12731251';

const slotLabels = {
  1: 'Day 1 11:00', 2: 'Day 1 11:30', 3: 'Day 1 13:15',
  4: 'Day 1 13:45', 5: 'Day 1 14:30', 6: 'Day 1 15:00',
  7: 'Day 2 10:30', 8: 'Day 2 11:00', 9: 'Day 2 13:15',
  10: 'Day 2 13:45', 11: 'Day 2 14:30', 12: 'Day 2 15:00',
};

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

// SHL's current meetings (excluding James)
const shlMeetings = allMeetings.filter(m => m.sponsorId === SHL_ID && m.attendeeId !== JAMES_ID);
const shlDelegateIds = new Set(shlMeetings.map(m => m.attendeeId));

// SHL's ranking
const shlRanking = allRankings.find(r => r.sponsorId === SHL_ID && !r.isArchived);
const rankedList = shlRanking?.rankingsData ? JSON.parse(shlRanking.rankingsData) : [];
const rankMap = new Map(rankedList.map((id, i) => [id, i + 1]));

// Count meetings per delegate (excluding James)
const meetingCount = new Map();
for (const m of allMeetings) {
  if (m.attendeeId === JAMES_ID) continue;
  meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId) || 0) + 1);
}

// For each delegate, which slots are they booked in (across ALL sponsors)
const delegateBookedSlots = new Map();
for (const m of allMeetings) {
  if (m.attendeeId === JAMES_ID) continue;
  if (!delegateBookedSlots.has(m.attendeeId)) delegateBookedSlots.set(m.attendeeId, new Set());
  delegateBookedSlots.get(m.attendeeId).add(m.timeSlot);
}

// SHL's current slot usage (can have 2 per slot due to 2 reps)
const shlSlotCount = new Map();
for (const m of shlMeetings) {
  shlSlotCount.set(m.timeSlot, (shlSlotCount.get(m.timeSlot) || 0) + 1);
}

// Slots where SHL has capacity (< 2 meetings) — after removing James, slot 9 has 0
const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
const shlSlotCapacity = new Map(allSlots.map(s => [s, 2 - (shlSlotCount.get(s) || 0)]));

console.log('SHL slot capacity (after removing James):');
allSlots.forEach(s => {
  const cap = shlSlotCapacity.get(s);
  if (cap > 0) console.log(`  Slot ${s} (${slotLabels[s]}): ${cap} open spot(s)`);
});

// Find all delegates ranked by SHL but NOT currently meeting SHL
// who have < 8 meetings and could fit into an available SHL slot
console.log('\n=== Candidates ranked by SHL not currently meeting them (< 8 meetings) ===\n');

const newCandidates = [];
for (let i = 0; i < rankedList.length; i++) {
  const id = rankedList[i];
  if (id === JAMES_ID) continue;
  if (shlDelegateIds.has(id)) continue; // already meeting SHL
  const d = attendees.find(a => a.id === id);
  if (!d) continue;
  const count = meetingCount.get(id) || 0;
  if (count >= 8) continue; // at max

  const bookedSlots = delegateBookedSlots.get(id) ?? new Set();
  // Which SHL open slots is this delegate free in?
  const availableSlots = allSlots.filter(s => shlSlotCapacity.get(s) > 0 && !bookedSlots.has(s));

  if (availableSlots.length > 0) {
    newCandidates.push({
      id, name: `${d.firstName} ${d.lastName}`, company: d.company,
      rank: i + 1, count, availableSlots,
    });
  }
}

newCandidates.forEach(c => {
  console.log(`  Rank #${c.rank}: ${c.name} (${c.company}) — ${c.count} meetings`);
  console.log(`    Can slot into: ${c.availableSlots.map(s => `slot ${s} (${slotLabels[s]})`).join(', ')}`);
});

if (newCandidates.length === 0) {
  console.log('  None found.');
}

// Now: reshuffle — can we move an existing SHL delegate to a different slot 
// to open up a slot for a higher-ranked person?
console.log('\n=== Reshuffle: swap an existing SHL delegate to open a slot for someone higher-ranked ===\n');

// For each existing SHL delegate, find if they could move to a different slot
// (one where SHL has capacity AND the delegate is free)
// This would open their current slot for a new candidate

let reshuffleFound = false;

for (const existing of shlMeetings) {
  const existingRank = rankMap.get(existing.attendeeId) ?? 999;
  const existingDelegate = attendees.find(a => a.id === existing.attendeeId);
  const existingName = existingDelegate ? `${existingDelegate.firstName} ${existingDelegate.lastName}` : existing.attendeeId;
  const existingSlot = existing.timeSlot;

  // Find other slots where this delegate could go (SHL has capacity, delegate is free)
  const delegateSlots = delegateBookedSlots.get(existing.attendeeId) ?? new Set();
  const alternativeSlots = allSlots.filter(s => 
    s !== existingSlot &&
    shlSlotCapacity.get(s) > 0 &&
    !delegateSlots.has(s)
  );

  if (alternativeSlots.length === 0) continue;

  // If we move this delegate to an alternative slot, slot `existingSlot` gains 1 capacity
  // Who could then fill that freed slot?
  for (const altSlot of alternativeSlots) {
    // Temporarily: slot existingSlot now has +1 capacity
    const newCandidatesForFreedSlot = [];
    for (let i = 0; i < rankedList.length; i++) {
      const id = rankedList[i];
      if (id === JAMES_ID) continue;
      if (id === existing.attendeeId) continue;
      if (shlDelegateIds.has(id)) continue;
      const d = attendees.find(a => a.id === id);
      if (!d) continue;
      const count = meetingCount.get(id) || 0;
      if (count >= 8) continue;
      const bookedSlots = delegateBookedSlots.get(id) ?? new Set();
      if (bookedSlots.has(existingSlot)) continue; // busy in freed slot

      // Only show if this candidate is higher-ranked than the existing delegate
      if (i + 1 >= existingRank) continue;

      newCandidatesForFreedSlot.push({
        id, name: `${d.firstName} ${d.lastName}`, company: d.company,
        rank: i + 1, count,
      });
      if (newCandidatesForFreedSlot.length >= 3) break;
    }

    if (newCandidatesForFreedSlot.length > 0) {
      reshuffleFound = true;
      console.log(`Move: ${existingName} (rank #${existingRank}) from slot ${existingSlot} (${slotLabels[existingSlot]}) → slot ${altSlot} (${slotLabels[altSlot]})`);
      console.log(`  Opens slot ${existingSlot} for higher-ranked candidates:`);
      newCandidatesForFreedSlot.forEach(c => {
        console.log(`    → Rank #${c.rank}: ${c.name} (${c.company}) — ${c.count} meetings`);
      });
      console.log('');
    }
  }
}

if (!reshuffleFound) {
  console.log('No beneficial reshuffle found — every higher-ranked delegate is either at max meetings, already meeting SHL, or busy in all freed slots.');
}

process.exit(0);
