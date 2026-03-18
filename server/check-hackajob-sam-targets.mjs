import * as db from './db.ts';
import { attendees } from './attendees.ts';

const HACKAJOB_ID = 540001;
const JAMES_ID = '12731251';

// Sam's target companies
const targetCompanies = [
  'Expleo Group', 'Hitachi', 'CBRE', 'PepsiCo', 'Aon',
  'Munich Re', 'Latham & Watkins', 'easyJet', 'Macquarie',
  'Pearson', 'Palo Alto Networks', 'Syngenta', 'Ramboll',
  'Western Union', 'Lockton', 'Nissan Motor Corporation'
];

const slotLabels = {
  1: 'Day 1 11:00', 2: 'Day 1 11:30', 3: 'Day 1 13:15',
  4: 'Day 1 13:45', 5: 'Day 1 14:30', 6: 'Day 1 15:00',
  7: 'Day 2 10:30', 8: 'Day 2 11:00', 9: 'Day 2 13:15',
  10: 'Day 2 13:45', 11: 'Day 2 14:30', 12: 'Day 2 15:00',
};

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

// hackajob's current meetings (excluding James)
const hackajobMeetings = allMeetings.filter(m => m.sponsorId === HACKAJOB_ID && m.attendeeId !== JAMES_ID);
const hackajobDelegateIds = new Set(hackajobMeetings.map(m => m.attendeeId));

// hackajob's ranking
const hackajobRanking = allRankings.find(r => r.sponsorId === HACKAJOB_ID && !r.isArchived);
const rankedList = hackajobRanking?.rankingsData ? JSON.parse(hackajobRanking.rankingsData) : [];
const rankMap = new Map(rankedList.map((id, i) => [id, i + 1]));

// Count meetings per delegate (excluding James)
const meetingCount = new Map();
for (const m of allMeetings) {
  if (m.attendeeId === JAMES_ID) continue;
  meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId) || 0) + 1);
}

// Delegate booked slots
const delegateBookedSlots = new Map();
for (const m of allMeetings) {
  if (m.attendeeId === JAMES_ID) continue;
  if (!delegateBookedSlots.has(m.attendeeId)) delegateBookedSlots.set(m.attendeeId, new Set());
  delegateBookedSlots.get(m.attendeeId).add(m.timeSlot);
}

// hackajob slot usage (1 rep = 1 per slot)
const hackajobSlotCount = new Map();
for (const m of hackajobMeetings) {
  hackajobSlotCount.set(m.timeSlot, (hackajobSlotCount.get(m.timeSlot) || 0) + 1);
}
const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
// After removing James, slot 7 is now taken by Nikhilesh
const hackajobSlotCapacity = new Map(allSlots.map(s => [s, 1 - (hackajobSlotCount.get(s) || 0)]));

console.log('=== Sam\'s Target Companies — Status in hackajob Schedule ===\n');

// Find delegates from target companies
const targetDelegates = [];
for (const company of targetCompanies) {
  const matches = attendees.filter(a => 
    a.company?.toLowerCase().includes(company.toLowerCase()) ||
    company.toLowerCase().includes(a.company?.toLowerCase() ?? '')
  );
  if (matches.length === 0) {
    console.log(`${company}: ❌ No delegate found in attendees list`);
  } else {
    for (const d of matches) {
      const rank = rankMap.get(d.id);
      const inSchedule = hackajobDelegateIds.has(d.id);
      const count = meetingCount.get(d.id) || 0;
      const bookedSlots = delegateBookedSlots.get(d.id) ?? new Set();
      const availableHackajobSlots = allSlots.filter(s => hackajobSlotCapacity.get(s) > 0 && !bookedSlots.has(s));
      
      let status;
      if (d.id === JAMES_ID) {
        status = '❌ James Boyle — CANCELLED';
      } else if (inSchedule) {
        const meeting = hackajobMeetings.find(m => m.attendeeId === d.id);
        status = `✅ Already in schedule (slot ${meeting?.timeSlot}, ${slotLabels[meeting?.timeSlot]})`;
      } else if (rank === undefined) {
        status = `⚠️  Not ranked by hackajob`;
      } else if (count >= 8) {
        status = `⚠️  Rank #${rank} — at max 8 meetings, no capacity`;
      } else if (availableHackajobSlots.length === 0) {
        status = `⚠️  Rank #${rank} — ${count} meetings but busy in all hackajob open slots`;
      } else {
        status = `🎯 Rank #${rank} — ${count} meetings, available in: ${availableHackajobSlots.map(s => `slot ${s} (${slotLabels[s]})`).join(', ')}`;
      }
      console.log(`${company} — ${d.firstName} ${d.lastName}: ${status}`);
      if (!inSchedule && rank !== undefined && count < 8) {
        targetDelegates.push({ d, rank, count, availableHackajobSlots, company });
      }
    }
  }
}

// Now: for each target delegate who could potentially be added,
// find which current hackajob delegate they could replace (lower ranked)
console.log('\n=== Reshuffle Options: Replace lower-ranked hackajob delegates with target companies ===\n');

// Current hackajob schedule with ranks
const currentSchedule = hackajobMeetings.map(m => ({
  ...m,
  rank: rankMap.get(m.attendeeId) ?? 999,
  delegate: attendees.find(a => a.id === m.attendeeId),
})).sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0));

console.log('Current hackajob schedule (ranked):');
currentSchedule.forEach(m => {
  const name = m.delegate ? `${m.delegate.firstName} ${m.delegate.lastName} (${m.delegate.company})` : m.attendeeId;
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${name} — rank #${m.rank === 999 ? 'unranked' : m.rank} | score: ${m.matchScore}%`);
});

console.log('\n--- Swap opportunities ---\n');

let swapFound = false;
for (const target of targetDelegates.sort((a, b) => a.rank - b.rank)) {
  const targetName = `${target.d.firstName} ${target.d.lastName} (${target.company})`;
  
  // Find lower-ranked current delegates that could be swapped out
  // The target delegate must be able to fit in the freed slot OR another open slot
  for (const existing of currentSchedule) {
    if (existing.rank <= target.rank) continue; // only replace lower-ranked
    
    const existingName = existing.delegate 
      ? `${existing.delegate.firstName} ${existing.delegate.lastName} (${existing.delegate?.company})`
      : existing.attendeeId;
    
    // Can the target go into the existing slot?
    const targetBusySlots = delegateBookedSlots.get(target.d.id) ?? new Set();
    const targetCanTakeExistingSlot = !targetBusySlots.has(existing.timeSlot);
    
    // Can the existing delegate be moved elsewhere (to an open hackajob slot)?
    const existingBusySlots = delegateBookedSlots.get(existing.attendeeId) ?? new Set();
    const existingAlternativeSlots = allSlots.filter(s =>
      s !== existing.timeSlot &&
      hackajobSlotCapacity.get(s) > 0 &&
      !existingBusySlots.has(s)
    );
    
    if (targetCanTakeExistingSlot) {
      // Direct swap: target takes existing slot, existing is removed (or moved if possible)
      swapFound = true;
      const moveOption = existingAlternativeSlots.length > 0 
        ? ` (${existingName} can move to slot ${existingAlternativeSlots[0]} — ${slotLabels[existingAlternativeSlots[0]]})`
        : ` (${existingName} would be dropped from schedule)`;
      console.log(`🔄 Replace ${existingName} (rank #${existing.rank === 999 ? 'unranked' : existing.rank}) in slot ${existing.timeSlot} (${slotLabels[existing.timeSlot]})`);
      console.log(`   with ${targetName} (rank #${target.rank})${moveOption}`);
      console.log('');
    } else if (existingAlternativeSlots.length > 0) {
      // Move existing to alt slot, target takes freed slot (but target is busy in existing slot)
      // Check if target is free in the freed slot after existing moves
      // Actually: if existing moves to altSlot, existing's current slot is freed
      // Can target go there? We already checked: targetCanTakeExistingSlot = false means target is busy there
      // So this path doesn't work directly
    }
  }
}

if (!swapFound) {
  console.log('No direct swap opportunities found.');
  console.log('\nNote: Some target delegates may be busy in all slots where hackajob has lower-ranked delegates.');
}

process.exit(0);
