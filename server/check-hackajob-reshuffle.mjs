import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SPONSOR_ID = 540001;
const SPONSOR_NAME = 'hackajob';
const JAMES_ID = '12731251';
const JAMES_SLOT = 7; // Day 2 10:30–11:00

const slotLabels = {
  1: 'Day 1 11:00', 2: 'Day 1 11:30', 3: 'Day 1 13:15',
  4: 'Day 1 13:45', 5: 'Day 1 14:30', 6: 'Day 1 15:00',
  7: 'Day 2 10:30', 8: 'Day 2 11:00', 9: 'Day 2 13:15',
  10: 'Day 2 13:45', 11: 'Day 2 14:30', 12: 'Day 2 15:00',
};

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

// Sponsor's current meetings (excluding James)
const sponsorMeetings = allMeetings.filter(m => m.sponsorId === SPONSOR_ID && m.attendeeId !== JAMES_ID);
const sponsorDelegateIds = new Set(sponsorMeetings.map(m => m.attendeeId));

// Sponsor's ranking
const sponsorRanking = allRankings.find(r => r.sponsorId === SPONSOR_ID && !r.isArchived);
const rankedList = sponsorRanking?.rankingsData ? JSON.parse(sponsorRanking.rankingsData) : [];
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

// Sponsor's slot usage (can have 2 per slot if 2 reps)
const sponsorSlotCount = new Map();
for (const m of sponsorMeetings) {
  sponsorSlotCount.set(m.timeSlot, (sponsorSlotCount.get(m.timeSlot) || 0) + 1);
}

// Determine max meetings per slot for this sponsor (1 rep = 1 per slot, 2 reps = 2 per slot)
// hackajob has 1 rep so max 1 per slot
const MAX_PER_SLOT = 1;
const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
const sponsorSlotCapacity = new Map(allSlots.map(s => [s, MAX_PER_SLOT - (sponsorSlotCount.get(s) || 0)]));

console.log(`=== ${SPONSOR_NAME} Current Meetings (excluding James Boyle) ===\n`);
sponsorMeetings.sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0)).forEach(m => {
  const d = attendees.find(a => a.id === m.attendeeId);
  const name = d ? `${d.firstName} ${d.lastName} (${d.company})` : m.attendeeId;
  const rank = rankMap.get(m.attendeeId);
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${name} — rank #${rank ?? 'unranked'} | score: ${m.matchScore}%`);
});

console.log('\nSlot capacity after removing James:');
allSlots.forEach(s => {
  const cap = sponsorSlotCapacity.get(s);
  if (cap > 0) console.log(`  Slot ${s} (${slotLabels[s]}): ${cap} open spot(s)`);
});

// Direct candidates: ranked by sponsor, not currently meeting them, < 8 meetings, free in an open slot
console.log(`\n=== Direct candidates (not currently meeting ${SPONSOR_NAME}, < 8 meetings) ===\n`);

const directCandidates = [];
for (let i = 0; i < rankedList.length; i++) {
  const id = rankedList[i];
  if (id === JAMES_ID) continue;
  if (sponsorDelegateIds.has(id)) continue;
  const d = attendees.find(a => a.id === id);
  if (!d) continue;
  const count = meetingCount.get(id) || 0;
  if (count >= 8) continue;

  const bookedSlots = delegateBookedSlots.get(id) ?? new Set();
  const availableSlots = allSlots.filter(s => sponsorSlotCapacity.get(s) > 0 && !bookedSlots.has(s));

  if (availableSlots.length > 0) {
    directCandidates.push({
      id, name: `${d.firstName} ${d.lastName}`, company: d.company,
      rank: i + 1, count, availableSlots,
    });
  }
}

directCandidates.forEach(c => {
  console.log(`  Rank #${c.rank}: ${c.name} (${c.company}) — ${c.count} meetings`);
  console.log(`    Can slot into: ${c.availableSlots.map(s => `slot ${s} (${slotLabels[s]})`).join(', ')}`);
});
if (directCandidates.length === 0) console.log('  None found.');

// Reshuffle: move an existing delegate to a different slot, opening a slot for someone higher-ranked
console.log(`\n=== Reshuffle: move existing ${SPONSOR_NAME} delegate to open a slot for someone higher-ranked ===\n`);

let reshuffleFound = false;

for (const existing of sponsorMeetings) {
  const existingRank = rankMap.get(existing.attendeeId) ?? 999;
  const existingDelegate = attendees.find(a => a.id === existing.attendeeId);
  const existingName = existingDelegate ? `${existingDelegate.firstName} ${existingDelegate.lastName} (${existingDelegate.company})` : existing.attendeeId;
  const existingSlot = existing.timeSlot;

  // Find other slots where this delegate could go
  const delegateSlots = delegateBookedSlots.get(existing.attendeeId) ?? new Set();
  const alternativeSlots = allSlots.filter(s =>
    s !== existingSlot &&
    sponsorSlotCapacity.get(s) > 0 &&
    !delegateSlots.has(s)
  );

  if (alternativeSlots.length === 0) continue;

  for (const altSlot of alternativeSlots) {
    // Moving existing to altSlot: frees existingSlot, fills altSlot
    // Who can now go into existingSlot?
    const newCandidatesForFreedSlot = [];
    for (let i = 0; i < rankedList.length; i++) {
      const id = rankedList[i];
      if (id === JAMES_ID) continue;
      if (id === existing.attendeeId) continue;
      if (sponsorDelegateIds.has(id)) continue;
      const d = attendees.find(a => a.id === id);
      if (!d) continue;
      const count = meetingCount.get(id) || 0;
      if (count >= 8) continue;
      const bookedSlots = delegateBookedSlots.get(id) ?? new Set();
      if (bookedSlots.has(existingSlot)) continue;
      // Only worthwhile if higher-ranked than existing
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
  console.log('No beneficial reshuffle found.');
}

process.exit(0);
