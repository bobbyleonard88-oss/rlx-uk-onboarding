import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SHL_ID = 750001;
const JAMES_ID = '12731251';
const JAMES_SLOT = 9; // Day 2 13:15–13:45

const slotLabels = {
  1: 'Day 1 11:00–11:30', 2: 'Day 1 11:30–12:00', 3: 'Day 1 13:15–13:45',
  4: 'Day 1 13:45–14:15', 5: 'Day 1 14:30–15:00', 6: 'Day 1 15:00–15:30',
  7: 'Day 2 10:30–11:00', 8: 'Day 2 11:00–11:30', 9: 'Day 2 13:15–13:45',
  10: 'Day 2 13:45–14:15', 11: 'Day 2 14:30–15:00', 12: 'Day 2 15:00–15:30',
};

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

// SHL's current meetings (excluding James)
const shlMeetings = allMeetings.filter(m => m.sponsorId === SHL_ID && m.attendeeId !== JAMES_ID);
const shlDelegateIds = new Set(shlMeetings.map(m => m.attendeeId));

// SHL's ranking
const shlRanking = allRankings.find(r => r.sponsorId === SHL_ID && !r.isArchived);
const rankedList = shlRanking?.rankingsData ? JSON.parse(shlRanking.rankingsData) : [];

// Rank map for SHL
const rankMap = new Map(rankedList.map((id, i) => [id, i + 1]));

console.log('=== SHL Current Meetings (excluding James Boyle) ===\n');
shlMeetings.sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0)).forEach(m => {
  const d = attendees.find(a => a.id === m.attendeeId);
  const name = d ? `${d.firstName} ${d.lastName} (${d.company})` : m.attendeeId;
  const rank = rankMap.get(m.attendeeId);
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${name} — rank #${rank ?? 'unranked'} | score: ${m.matchScore}%`);
});

// Now: who is ranked higher than #30 (Adam Binks) but NOT currently in SHL's meetings?
// And are they available in slot 9?
console.log('\n=== Delegates ranked above #30 by SHL, not currently meeting SHL ===\n');

// All delegates booked in slot 9 (by any sponsor)
const bookedInSlot9 = new Set(
  allMeetings.filter(m => m.timeSlot === JAMES_SLOT && m.attendeeId !== JAMES_ID).map(m => m.attendeeId)
);

// Count meetings per delegate
const meetingCount = new Map();
for (const m of allMeetings) {
  if (m.attendeeId === JAMES_ID) continue;
  meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId) || 0) + 1);
}

// Check top-ranked non-SHL delegates
const candidates = [];
for (let i = 0; i < rankedList.length && i < 29; i++) {
  const id = rankedList[i];
  if (shlDelegateIds.has(id)) continue; // already meeting SHL
  const d = attendees.find(a => a.id === id);
  if (!d) continue;
  const count = meetingCount.get(id) || 0;
  const freeInSlot9 = !bookedInSlot9.has(id);
  const atMaxMeetings = count >= 8;

  // Find which slots this delegate IS booked in (so we know if reshuffling is possible)
  const delegateMeetings = allMeetings.filter(m => m.attendeeId === id && m.sponsorId !== SHL_ID);
  const delegateSlots = delegateMeetings.map(m => m.timeSlot);

  candidates.push({
    id, name: `${d.firstName} ${d.lastName}`, company: d.company,
    rank: i + 1, count, freeInSlot9, atMaxMeetings, delegateSlots,
  });
}

candidates.forEach(c => {
  const slotStatus = c.freeInSlot9 
    ? `✅ FREE in slot 9` 
    : `❌ Busy in slot 9`;
  const maxStatus = c.atMaxMeetings ? ` | ⚠️ at max 8 meetings` : ` | ${c.count} meetings`;
  const busySlots = c.delegateSlots.length > 0 ? ` | busy slots: ${c.delegateSlots.join(',')}` : '';
  console.log(`  Rank #${c.rank}: ${c.name} (${c.company}) — ${slotStatus}${maxStatus}${busySlots}`);
});

// KEY QUESTION: Can we move an existing SHL delegate OUT of slot 9 to free it up?
// Then put a higher-ranked person in slot 9 instead
console.log('\n=== Reshuffle Analysis: Move existing SHL delegate out of slot 9 ===\n');
console.log('(Find an SHL delegate in slot 9 who can be moved to another free slot,');
console.log(' freeing slot 9 for a higher-ranked replacement)\n');

const shlInSlot9 = shlMeetings.filter(m => m.timeSlot === JAMES_SLOT);
// Note: James is in slot 9 — so after removing James, slot 9 is EMPTY for SHL
// The question is: is there a higher-ranked delegate who is busy in slot 9 (with another sponsor)
// but free in a slot where SHL currently has no meeting?

// Find SHL's used slots (after removing James)
const shlUsedSlots = new Set(shlMeetings.map(m => m.timeSlot));
const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
const shlFreeSlots = allSlots.filter(s => !shlUsedSlots.has(s));
console.log(`SHL's free slots after removing James: ${shlFreeSlots.map(s => `${s} (${slotLabels[s]})`).join(', ')}`);

console.log('\nHigher-ranked delegates (rank < 30) who are busy in slot 9 but free in an SHL-free slot:\n');

let reshuffleOptions = [];
for (let i = 0; i < rankedList.length && i < 29; i++) {
  const id = rankedList[i];
  if (shlDelegateIds.has(id)) continue;
  const d = attendees.find(a => a.id === id);
  if (!d) continue;
  const count = meetingCount.get(id) || 0;
  if (count >= 8) continue; // already at max — can't add them

  // Is this delegate busy in slot 9?
  const busyInSlot9 = bookedInSlot9.has(id);
  if (!busyInSlot9) continue; // already handled above (they can go directly into slot 9)

  // Which of SHL's free slots is this delegate free in?
  const delegateBookedSlots = new Set(
    allMeetings.filter(m => m.attendeeId === id).map(m => m.timeSlot)
  );
  const availableInShlFreeSlot = shlFreeSlots.filter(s => !delegateBookedSlots.has(s));

  if (availableInShlFreeSlot.length > 0) {
    reshuffleOptions.push({
      id, name: `${d.firstName} ${d.lastName}`, company: d.company,
      rank: i + 1, count,
      busyInSlot9WithSponsor: allMeetings.find(m => m.attendeeId === id && m.timeSlot === JAMES_SLOT)?.sponsorId,
      availableInShlFreeSlot,
    });
  }
}

if (reshuffleOptions.length === 0) {
  console.log('No reshuffle options found — all higher-ranked delegates are either:\n  - already meeting SHL\n  - at max 8 meetings\n  - busy in slot 9 AND busy in all of SHL\'s free slots');
} else {
  reshuffleOptions.forEach(r => {
    const sponName = r.busyInSlot9WithSponsor;
    console.log(`  Rank #${r.rank}: ${r.name} (${r.company}) — ${r.count} meetings`);
    console.log(`    → Busy in slot 9 (with sponsor ${sponName})`);
    console.log(`    → Could meet SHL in: ${r.availableInShlFreeSlot.map(s => `slot ${s} (${slotLabels[s]})`).join(' or ')}`);
    console.log('');
  });
}

process.exit(0);
