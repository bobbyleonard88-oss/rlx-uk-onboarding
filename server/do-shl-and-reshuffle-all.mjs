import * as db from './db.ts';
import { attendees } from './attendees.ts';

const JAMES_ID = '12731251';

const slotLabels = {
  1: 'Day 1 11:00', 2: 'Day 1 11:30', 3: 'Day 1 13:15',
  4: 'Day 1 13:45', 5: 'Day 1 14:30', 6: 'Day 1 15:00',
  7: 'Day 2 10:30', 8: 'Day 2 11:00', 9: 'Day 2 13:15',
  10: 'Day 2 13:45', 11: 'Day 2 14:30', 12: 'Day 2 15:00',
};

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

// ─── STEP 1: Add Adam Binks to SHL slot 9 ───────────────────────────────────
const SHL_ID = 750001;
const adamBinks = attendees.find(a => a.firstName === 'Adam' && a.lastName === 'Binks');
if (!adamBinks) throw new Error('Adam Binks not found');

// Adam Binks already confirmed in SHL slot 9 from previous run

const shlRanking = allRankings.find(r => r.sponsorId === SHL_ID && !r.isArchived);
const shlRankedList = shlRanking?.rankingsData ? JSON.parse(shlRanking.rankingsData) : [];
const adamShlRank = shlRankedList.indexOf(adamBinks.id) + 1;

console.log(`=== Adam Binks (KPMG, rank #${adamShlRank}) already in SHL slot 9 ✅ ===\n`);

// ─── STEP 2: Reshuffle analysis for 6 remaining sponsors ────────────────────
const sponsors = [
  { id: 780001, name: 'The Martec',   jamesSlot: 1,  maxPerSlot: 1 },
  { id: 210001, name: 'Harver',       jamesSlot: 2,  maxPerSlot: 2 },
  { id: 330001, name: 'Symphony Talent', jamesSlot: 6, maxPerSlot: 1 },
  { id: 270002, name: 'Appcast',      jamesSlot: 8,  maxPerSlot: 1 },
  { id: 600001, name: 'Happydance',   jamesSlot: 10, maxPerSlot: 1 },
  { id: 690001, name: 'Amberjack',    jamesSlot: 12, maxPerSlot: 1 },
];

// Refresh meetings after adding Adam
const refreshedMeetings = await db.getAllMeetings();

// Rebuild meeting count
const meetingCount = new Map();
for (const m of refreshedMeetings) {
  if (m.attendeeId === JAMES_ID) continue;
  meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId) || 0) + 1);
}

// Rebuild delegate booked slots
const delegateBookedSlots = new Map();
for (const m of refreshedMeetings) {
  if (m.attendeeId === JAMES_ID) continue;
  if (!delegateBookedSlots.has(m.attendeeId)) delegateBookedSlots.set(m.attendeeId, new Set());
  delegateBookedSlots.get(m.attendeeId).add(m.timeSlot);
}

const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];

for (const sponsor of sponsors) {
  const sponsorMeetings = refreshedMeetings.filter(m => m.sponsorId === sponsor.id && m.attendeeId !== JAMES_ID);
  const sponsorDelegateIds = new Set(sponsorMeetings.map(m => m.attendeeId));

  const ranking = allRankings.find(r => r.sponsorId === sponsor.id && !r.isArchived);
  const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];
  const rankMap = new Map(rankedList.map((id, i) => [id, i + 1]));

  // Slot capacity
  const slotCount = new Map();
  for (const m of sponsorMeetings) slotCount.set(m.timeSlot, (slotCount.get(m.timeSlot) || 0) + 1);
  const slotCapacity = new Map(allSlots.map(s => [s, sponsor.maxPerSlot - (slotCount.get(s) || 0)]));

  // Open slots (including James's freed slot)
  const openSlots = allSlots.filter(s => slotCapacity.get(s) > 0);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${sponsor.name} | James was in slot ${sponsor.jamesSlot} (${slotLabels[sponsor.jamesSlot]})`);
  console.log(`Open slots: ${openSlots.map(s => `${s}(${slotLabels[s]})`).join(', ')}`);

  // Current schedule
  console.log('\nCurrent schedule:');
  sponsorMeetings.sort((a,b) => (a.timeSlot??0)-(b.timeSlot??0)).forEach(m => {
    const d = attendees.find(a => a.id === m.attendeeId);
    const name = d ? `${d.firstName} ${d.lastName} (${d.company})` : m.attendeeId;
    const rank = rankMap.get(m.attendeeId);
    console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${name} — rank #${rank ?? 'unranked'} | ${m.matchScore}%`);
  });

  // Direct candidates for open slots
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
    const availSlots = openSlots.filter(s => !bookedSlots.has(s));
    if (availSlots.length > 0) {
      directCandidates.push({ id, name: `${d.firstName} ${d.lastName}`, company: d.company, rank: i+1, count, availSlots });
      if (directCandidates.length >= 3) break;
    }
  }

  if (directCandidates.length > 0) {
    console.log('\nDirect replacements for open slot(s):');
    directCandidates.forEach(c => {
      console.log(`  Rank #${c.rank}: ${c.name} (${c.company}) — ${c.count} meetings | fits: ${c.availSlots.map(s=>`slot ${s}`).join(', ')}`);
    });
  } else {
    console.log('\nNo direct replacements available.');
  }

  // Reshuffle: move existing lower-ranked delegate to open slot, freeing their slot for higher-ranked
  const reshuffles = [];
  const currentScheduleSorted = sponsorMeetings.map(m => ({
    ...m, rank: rankMap.get(m.attendeeId) ?? 999,
    delegate: attendees.find(a => a.id === m.attendeeId),
  }));

  for (const existing of currentScheduleSorted) {
    const existingRank = existing.rank;
    const existingSlot = existing.timeSlot;
    const existingName = existing.delegate 
      ? `${existing.delegate.firstName} ${existing.delegate.lastName} (${existing.delegate.company})`
      : existing.attendeeId;

    const existingBusySlots = delegateBookedSlots.get(existing.attendeeId) ?? new Set();
    const altSlots = openSlots.filter(s => s !== existingSlot && !existingBusySlots.has(s));
    if (altSlots.length === 0) continue;

    for (const altSlot of altSlots) {
      // Moving existing to altSlot frees existingSlot
      const newCandidates = [];
      for (let i = 0; i < rankedList.length; i++) {
        const id = rankedList[i];
        if (id === JAMES_ID || id === existing.attendeeId) continue;
        if (sponsorDelegateIds.has(id)) continue;
        const d = attendees.find(a => a.id === id);
        if (!d) continue;
        const count = meetingCount.get(id) || 0;
        if (count >= 8) continue;
        const bookedSlots = delegateBookedSlots.get(id) ?? new Set();
        if (bookedSlots.has(existingSlot)) continue;
        if (i + 1 >= existingRank) continue; // only if higher-ranked
        newCandidates.push({ id, name: `${d.firstName} ${d.lastName}`, company: d.company, rank: i+1, count });
        if (newCandidates.length >= 2) break;
      }
      if (newCandidates.length > 0) {
        reshuffles.push({ existingName, existingRank, existingSlot, altSlot, newCandidates });
      }
    }
  }

  if (reshuffles.length > 0) {
    console.log('\nReshuffle options (move existing → open slot, bring in higher-ranked):');
    // Deduplicate: show best gain per existing delegate
    const seen = new Set();
    reshuffles
      .sort((a,b) => (a.newCandidates[0]?.rank ?? 999) - (b.newCandidates[0]?.rank ?? 999))
      .forEach(r => {
        const key = `${r.existingName}-${r.existingSlot}`;
        if (seen.has(key)) return;
        seen.add(key);
        console.log(`  Move ${r.existingName} (rank #${r.existingRank === 999 ? 'unranked' : r.existingRank}) slot ${r.existingSlot} → slot ${r.altSlot} (${slotLabels[r.altSlot]})`);
        r.newCandidates.forEach(c => {
          console.log(`    → Brings in rank #${c.rank}: ${c.name} (${c.company}) — ${c.count} meetings`);
        });
      });
  } else {
    console.log('\nNo beneficial reshuffle found.');
  }
}

process.exit(0);
