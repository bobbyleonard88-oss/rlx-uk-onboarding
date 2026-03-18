import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;
const JAMES_ID = '12731251';

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

const symphonyMeetings = allMeetings.filter(m => m.sponsorId === SYMPHONY_ID);
const ranking = allRankings.find(r => r.sponsorId === SYMPHONY_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

// Build meeting count map
const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

// Build slot occupancy map
const slotOccupancy = new Map(); // slot -> Set of attendeeIds
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const symphonyDelegateIds = new Set(symphonyMeetings.map(m => m.attendeeId));

// The three flagged delegates to remove
const flaggedCompanies = ['BMS Group', 'Rentokil', 'University of the Arts London'];
const flaggedDelegates = flaggedCompanies.map(c => {
  const d = attendees.find(a => a.company?.toLowerCase().includes(c.toLowerCase()));
  const m = d ? symphonyMeetings.find(mt => mt.attendeeId === d.id) : null;
  return { delegate: d, meeting: m, company: c };
}).filter(f => f.delegate && f.meeting);

console.log(`Flagged slots to free up: ${flaggedDelegates.map(f => f.meeting.timeSlot + ' (' + slotLabels[f.meeting.timeSlot] + ')').join(', ')}\n`);

// For each flagged slot, find:
// 1. Direct replacements (ranked delegates free in that slot, under 8 meetings)
// 2. Reshuffle options (move an existing lower-ranked Symphony delegate to the freed slot, opening their slot for a higher-ranked delegate)

function getBestAvailable(openSlot, excludeIds, label) {
  const busyInSlot = slotOccupancy.get(openSlot) || new Set();
  const results = [];
  for (let i = 0; i < rankedList.length; i++) {
    const id = rankedList[i];
    if (id === JAMES_ID) continue;
    if (excludeIds.has(id)) continue; // already in Symphony or being removed
    const d = attendees.find(a => a.id === id);
    if (!d) continue;
    const count = meetingCount.get(id) || 0;
    if (count >= 8) continue;
    if (busyInSlot.has(id)) continue;
    results.push({ rank: i+1, delegate: d, meetings: count });
    if (results.length >= 5) break;
  }
  return results;
}

// We're removing all 3 flagged delegates, so build the new "excluded from Symphony" set
const removedIds = new Set(flaggedDelegates.map(f => f.delegate.id));
const remainingSymIds = new Set([...symphonyDelegateIds].filter(id => !removedIds.has(id)));

// The 3 open slots after removal
const openSlots = flaggedDelegates.map(f => f.meeting.timeSlot);

console.log('════════════════════════════════════════════════════════════');
console.log('DIRECT REPLACEMENTS (no reshuffling needed)');
console.log('════════════════════════════════════════════════════════════');

for (const f of flaggedDelegates) {
  const slot = f.meeting.timeSlot;
  console.log(`\nSlot ${slot} (${slotLabels[slot]}) — removing ${f.delegate.firstName} ${f.delegate.lastName} (${f.company}, rank #${rankedList.indexOf(f.delegate.id) >= 0 ? rankedList.indexOf(f.delegate.id)+1 : 'unranked'}):`);
  const options = getBestAvailable(slot, new Set([...remainingSymIds, ...removedIds]), 'direct');
  if (options.length === 0) {
    console.log('  No direct replacements available.');
  } else {
    options.forEach(o => {
      console.log(`  Rank #${o.rank}: ${o.delegate.firstName} ${o.delegate.lastName} (${o.delegate.company}) — ${o.meetings} meetings`);
      console.log(`    Areas: ${o.delegate.keySolutionAreasOfInterest}`);
    });
  }
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('RESHUFFLE OPTIONS (move existing Symphony delegate to freed slot → bring in higher-ranked)');
console.log('════════════════════════════════════════════════════════════');

// For each remaining Symphony delegate, check if moving them to one of the 3 open slots
// frees up their current slot for a higher-ranked delegate
const remainingMeetings = symphonyMeetings.filter(m => !removedIds.has(m.attendeeId));

for (const openSlot of openSlots) {
  const f = flaggedDelegates.find(fd => fd.meeting.timeSlot === openSlot);
  console.log(`\nOpen slot ${openSlot} (${slotLabels[openSlot]}) — if we use it for a reshuffle:`);
  
  let foundAny = false;
  for (const existingMeeting of remainingMeetings) {
    const existingDelegate = attendees.find(a => a.id === existingMeeting.attendeeId);
    if (!existingDelegate) continue;
    
    const existingRank = rankedList.indexOf(existingDelegate.id);
    const existingSlot = existingMeeting.timeSlot;
    if (existingSlot === openSlot) continue; // already in this slot
    
    // Check if this delegate can move to the open slot
    const busyInOpenSlot = slotOccupancy.get(openSlot) || new Set();
    if (busyInOpenSlot.has(existingDelegate.id)) continue; // busy elsewhere in this slot
    
    // What higher-ranked delegates are free in existingSlot?
    const busyInExistingSlot = slotOccupancy.get(existingSlot) || new Set();
    const higherRanked = [];
    for (let i = 0; i < rankedList.length; i++) {
      const id = rankedList[i];
      if (i >= existingRank && existingRank >= 0) break; // only look at higher ranks
      if (id === JAMES_ID) continue;
      if (remainingSymIds.has(id) || removedIds.has(id)) continue;
      const d = attendees.find(a => a.id === id);
      if (!d) continue;
      const count = meetingCount.get(id) || 0;
      if (count >= 8) continue;
      if (busyInExistingSlot.has(id)) continue;
      higherRanked.push({ rank: i+1, delegate: d, meetings: count });
      if (higherRanked.length >= 2) break;
    }
    
    if (higherRanked.length > 0) {
      foundAny = true;
      const existingRankStr = existingRank >= 0 ? `#${existingRank+1}` : 'unranked';
      console.log(`  Move ${existingDelegate.firstName} ${existingDelegate.lastName} (rank ${existingRankStr}) from slot ${existingSlot} → slot ${openSlot}`);
      console.log(`    → Opens slot ${existingSlot} (${slotLabels[existingSlot]}) for:`);
      higherRanked.forEach(h => {
        console.log(`      Rank #${h.rank}: ${h.delegate.firstName} ${h.delegate.lastName} (${h.delegate.company}) — ${h.meetings} meetings`);
        console.log(`        Areas: ${h.delegate.keySolutionAreasOfInterest}`);
      });
    }
  }
  if (!foundAny) console.log('  No beneficial reshuffle options for this slot.');
}

process.exit(0);
