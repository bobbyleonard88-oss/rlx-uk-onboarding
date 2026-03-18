import * as db from './db.ts';
import { attendees } from './attendees.ts';

const HACKAJOB_ID = 540001;

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

const hackajobMeetings = allMeetings.filter(m => m.sponsorId === HACKAJOB_ID);
const ranking = allRankings.find(r => r.sponsorId === HACKAJOB_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

const slotOccupancy = new Map();
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const hackajobDelegateIds = new Set(hackajobMeetings.map(m => m.attendeeId));

// Find Gilead
const gilead = attendees.find(a => a.company?.toLowerCase().includes('gilead science'));
const gileadMeeting = hackajobMeetings.find(m => m.attendeeId === gilead?.id);
const gileadRank = rankedList.indexOf(gilead?.id);

console.log(`Gilead: ${gilead?.firstName} ${gilead?.lastName} (${gilead?.company})`);
console.log(`  Rank: #${gileadRank + 1}, Slot: ${gileadMeeting?.timeSlot} (${slotLabels[gileadMeeting?.timeSlot]}), Score: ${gileadMeeting?.matchScore}%`);

// Print current hackajob schedule
console.log('\n=== Current hackajob schedule ===');
for (const m of hackajobMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const d = attendees.find(a => a.id === m.attendeeId);
  const rank = rankedList.indexOf(d?.id);
  const rankStr = rank >= 0 ? `#${rank+1}` : 'unranked';
  const isGilead = d?.id === gilead?.id ? ' ← GILEAD' : '';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${d?.firstName} ${d?.lastName} (${d?.company}) rank ${rankStr} | ${m.matchScore}%${isGilead}`);
}

const openSlot = gileadMeeting?.timeSlot; // slot freed if Gilead removed
const busyInOpenSlot = slotOccupancy.get(openSlot) || new Set();

console.log(`\n=== DIRECT OPTIONS for slot ${openSlot} (${slotLabels[openSlot]}) if Gilead removed ===`);
let shown = 0;
for (let i = 0; i < rankedList.length; i++) {
  const id = rankedList[i];
  if (hackajobDelegateIds.has(id)) continue;
  const d = attendees.find(a => a.id === id);
  if (!d) continue;
  const count = meetingCount.get(id) || 0;
  if (count >= 8) continue;
  if (busyInOpenSlot.has(id)) continue;
  console.log(`  Rank #${i+1}: ${d.firstName} ${d.lastName} (${d.company}) — ${count} meetings`);
  console.log(`    Areas: ${d.keySolutionAreasOfInterest}`);
  shown++;
  if (shown >= 5) break;
}
if (shown === 0) console.log('  No direct options available');

console.log(`\n=== RESHUFFLE OPTIONS (move existing hackajob delegate to slot ${openSlot}, free their slot for higher-ranked) ===`);

for (const m of hackajobMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  if (m.timeSlot === openSlot) continue;
  const existingDelegate = attendees.find(a => a.id === m.attendeeId);
  if (!existingDelegate) continue;
  if (existingDelegate.id === gilead?.id) continue;

  // Can this delegate move to the open slot?
  if (busyInOpenSlot.has(existingDelegate.id)) continue;

  const existingSlot = m.timeSlot;
  const busyInExistingSlot = slotOccupancy.get(existingSlot) || new Set();
  const existingRank = rankedList.indexOf(existingDelegate.id);

  // Find higher-ranked delegates free in existingSlot (not already in hackajob)
  const higherRanked = [];
  for (let i = 0; i < rankedList.length; i++) {
    const id = rankedList[i];
    if (existingRank >= 0 && i >= existingRank) break;
    if (hackajobDelegateIds.has(id)) continue;
    const d = attendees.find(a => a.id === id);
    if (!d) continue;
    const count = meetingCount.get(id) || 0;
    if (count >= 8) continue;
    if (busyInExistingSlot.has(id)) continue;
    higherRanked.push({ rank: i+1, delegate: d, meetings: count });
    if (higherRanked.length >= 2) break;
  }

  if (higherRanked.length > 0) {
    const existingRankStr = existingRank >= 0 ? `#${existingRank+1}` : 'unranked';
    console.log(`\n  Move ${existingDelegate.firstName} ${existingDelegate.lastName} (rank ${existingRankStr}) from slot ${existingSlot} (${slotLabels[existingSlot]}) → slot ${openSlot} (${slotLabels[openSlot]})`);
    console.log(`    → Opens slot ${existingSlot} (${slotLabels[existingSlot]}) for:`);
    higherRanked.forEach(h => {
      console.log(`      Rank #${h.rank}: ${h.delegate.firstName} ${h.delegate.lastName} (${h.delegate.company}) — ${h.meetings} meetings`);
      console.log(`        Areas: ${h.delegate.keySolutionAreasOfInterest}`);
    });
  }
}

process.exit(0);
