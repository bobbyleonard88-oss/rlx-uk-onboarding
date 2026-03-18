import * as db from './db.ts';
import { attendees } from './attendees.ts';

// Find James Boyle
const james = attendees.find(a => a.firstName === 'James' && a.lastName === 'Boyle');
if (!james) { console.log('James Boyle NOT FOUND'); process.exit(1); }
console.log(`Found: ${james.firstName} ${james.lastName} (${james.company}) id:${james.id}`);

const allMeetings = await db.getAllMeetings();
const jamesMeetings = allMeetings.filter(m => m.attendeeId === james.id);
console.log(`Total meetings to remove: ${jamesMeetings.length}`);

const allSponsors = await db.getAllSponsors();
const sponsorMap = new Map(allSponsors.map(s => [s.id, s.companyName]));

// Count meetings per delegate (excluding James's meetings since they'll be removed)
const meetingCountPerDelegate = new Map();
for (const m of allMeetings) {
  if (m.attendeeId === james.id) continue;
  meetingCountPerDelegate.set(m.attendeeId, (meetingCountPerDelegate.get(m.attendeeId) || 0) + 1);
}

// Show each delegate's current meeting count
console.log('\nDelegate meeting counts (excluding James):');
const underBooked = attendees.filter(a => {
  if (a.id === james.id) return false;
  const count = meetingCountPerDelegate.get(a.id) || 0;
  return count < 8;
});
underBooked.forEach(a => {
  const count = meetingCountPerDelegate.get(a.id) || 0;
  console.log(`  ${a.firstName} ${a.lastName} (${a.company}): ${count} meetings (${8 - count} free slot${8 - count !== 1 ? 's' : ''})`);
});
console.log(`\nDelegates with < 8 meetings: ${underBooked.length}`);

const allRankings = await db.getAllRankingsSubmissions();

console.log('\n--- Best replacement options per sponsor (only delegates with < 8 meetings) ---');

const slotLabels = {
  1: 'Day 1 11:00–11:30', 2: 'Day 1 11:30–12:00', 3: 'Day 1 13:15–13:45',
  4: 'Day 1 13:45–14:15', 5: 'Day 1 14:30–15:00', 6: 'Day 1 15:00–15:30',
  7: 'Day 2 10:30–11:00', 8: 'Day 2 11:00–11:30', 9: 'Day 2 13:15–13:45',
  10: 'Day 2 13:45–14:15', 11: 'Day 2 14:30–15:00', 12: 'Day 2 15:00–15:30',
};

for (const meeting of jamesMeetings.sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0))) {
  const sponsorName = sponsorMap.get(meeting.sponsorId) ?? String(meeting.sponsorId);

  // Get this sponsor's ranking
  const ranking = allRankings.find(r => r.sponsorId === meeting.sponsorId && !r.isArchived);
  const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

  // Delegates already booked in this time slot (by any sponsor)
  const bookedInSlot = new Set(
    allMeetings
      .filter(m => m.timeSlot === meeting.timeSlot && m.attendeeId !== james.id)
      .map(m => m.attendeeId)
  );

  // Delegates already meeting this sponsor
  const bookedBySponsor = new Set(
    allMeetings
      .filter(m => m.sponsorId === meeting.sponsorId && m.attendeeId !== james.id)
      .map(m => m.attendeeId)
  );

  // Find best available: ranked, free in slot, not already with sponsor, < 8 meetings
  const candidates = [];
  for (let i = 0; i < rankedList.length; i++) {
    const delegateId = rankedList[i];
    if (delegateId === james.id) continue;
    if (bookedInSlot.has(delegateId)) continue;
    if (bookedBySponsor.has(delegateId)) continue;
    const currentCount = meetingCountPerDelegate.get(delegateId) || 0;
    if (currentCount >= 8) continue;
    const delegate = attendees.find(a => a.id === delegateId);
    if (!delegate) continue;

    candidates.push({
      id: delegateId,
      name: `${delegate.firstName} ${delegate.lastName}`,
      company: delegate.company,
      rankPos: i + 1,
      currentMeetings: currentCount,
    });
    if (candidates.length >= 3) break;
  }

  // Also check unranked delegates with < 8 meetings as fallback
  const jamesRankPos = rankedList.indexOf(james.id) + 1;
  console.log(`\n${sponsorName} | Slot ${meeting.timeSlot} (${slotLabels[meeting.timeSlot] ?? '?'}) | James was rank #${jamesRankPos || 'unranked'} | score: ${meeting.matchScore}%`);
  if (candidates.length === 0) {
    // Try unranked delegates
    const unrankedCandidates = attendees.filter(a => {
      if (a.id === james.id) return false;
      if (bookedInSlot.has(a.id)) return false;
      if (bookedBySponsor.has(a.id)) return false;
      if (rankedList.includes(a.id)) return false;
      const count = meetingCountPerDelegate.get(a.id) || 0;
      return count < 8;
    });
    if (unrankedCandidates.length === 0) {
      console.log('  ⚠️  NO AVAILABLE REPLACEMENTS — slot will remain empty');
    } else {
      console.log(`  No ranked replacements. Unranked options (${unrankedCandidates.length} available):`);
      unrankedCandidates.slice(0, 3).forEach((c, idx) => {
        const count = meetingCountPerDelegate.get(c.id) || 0;
        console.log(`  Option ${idx+1}: ${c.firstName} ${c.lastName} (${c.company}) — ${count} meetings currently`);
      });
    }
  } else {
    candidates.forEach((c, idx) => {
      console.log(`  Option ${idx+1}: ${c.name} (${c.company}) — rank #${c.rankPos} | currently ${c.currentMeetings} meetings → would be ${c.currentMeetings + 1}`);
    });
  }
}

process.exit(0);
