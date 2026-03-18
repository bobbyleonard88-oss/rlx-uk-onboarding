import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

const symphonyMeetings = allMeetings.filter(m => m.sponsorId === SYMPHONY_ID);
const ranking = allRankings.find(r => r.sponsorId === SYMPHONY_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

const slotOccupancy = new Map();
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const kitterhing = attendees.find(a => a.company?.includes('Swiss Re'));
const lego = attendees.find(a => a.company?.toLowerCase().includes('lego'));

// Kitterhing is free in slots: 1, 2, 7, 8, 10, 11
// O'Regan is free in slots: 2, 3, 4, 6, 12
// We need to find which slots these are relative to Symphony's schedule

const kitFreeSlots = new Set([1,2,3,4,5,6,7,8,9,10,11,12].filter(s => {
  const busy = slotOccupancy.get(s) || new Set();
  return !busy.has(kitterhing.id);
}));
const legoFreeSlots = new Set([1,2,3,4,5,6,7,8,9,10,11,12].filter(s => {
  const busy = slotOccupancy.get(s) || new Set();
  return !busy.has(lego.id);
}));

console.log(`Kitterhing free slots: ${[...kitFreeSlots].join(', ')}`);
console.log(`O'Regan free slots: ${[...legoFreeSlots].join(', ')}`);

// Flagged delegates being removed
const bms = attendees.find(a => a.company?.includes('BMS'));
const rentokil = attendees.find(a => a.company?.toLowerCase().includes('rentokil'));
const ual = attendees.find(a => a.company?.includes('University of the Arts'));
const removedIds = new Set([bms?.id, rentokil?.id, ual?.id].filter(Boolean));

// Remaining Symphony meetings after removing 3 flagged
const remainingMeetings = symphonyMeetings.filter(m => !removedIds.has(m.attendeeId));

// Print current remaining schedule with ranks
console.log('\n=== Current remaining Symphony schedule (after removing 3 flagged) ===');
for (const m of remainingMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const d = attendees.find(a => a.id === m.attendeeId);
  const rank = rankedList.indexOf(d?.id);
  const rankStr = rank >= 0 ? `#${rank+1}` : 'unranked';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${d?.firstName} ${d?.lastName} (${d?.company}) rank ${rankStr} | ${m.matchScore}%`);
}

// Strategy: find a Symphony delegate in a slot where NEITHER Kitterhing nor O'Regan are free (slots 5 or 9)
// who can be MOVED to a slot where they ARE free, opening up their current slot for Kit/Lego
// 
// Actually the reverse: find Symphony delegates currently in slots where Kit/Lego ARE free,
// who could be moved to slots 5 or 9 (the open flagged slots), freeing their current slot
// for Kit/Lego to take instead.
//
// Wait - slots 5 and 9 are the OPEN slots (flagged delegates being removed).
// We want Kit in one slot and Lego in another.
// Kit is free in slots: those not in his busy list
// Lego is free in slots: those not in his busy list
//
// So: find a Symphony delegate currently in a slot where Kit IS free,
// who can move to slot 5 or 9 (the open slots), freeing their slot for Kit.
// AND find a Symphony delegate currently in a slot where Lego IS free,
// who can move to the OTHER open slot, freeing their slot for Lego.

const openFlaggedSlots = [5, 9]; // the two remaining open slots (slot 2 is the easy one)

console.log('\n=== Reshuffle to get BOTH Kitterhing AND O\'Regan into Symphony ===');
console.log('Strategy: move a weaker Symphony delegate into one of the open flagged slots,');
console.log('freeing their current slot for Kitterhing or O\'Regan\n');

// For each open flagged slot (5 and 9), find Symphony delegates who:
// 1. Are currently in a slot where Kit or Lego is free
// 2. Can move to the open flagged slot (not already busy there for another sponsor)

for (const openSlot of openFlaggedSlots) {
  console.log(`--- Using open slot ${openSlot} (${slotLabels[openSlot]}) ---`);
  
  for (const m of remainingMeetings) {
    const d = attendees.find(a => a.id === m.attendeeId);
    if (!d) continue;
    const currentSlot = m.timeSlot;
    if (currentSlot === openSlot) continue;
    
    // Can this delegate move to the open flagged slot?
    const busyInOpenSlot = slotOccupancy.get(openSlot) || new Set();
    if (busyInOpenSlot.has(d.id)) continue; // busy with another sponsor in that slot
    
    // Does freeing their current slot help Kit or Lego?
    const kitCanTake = kitFreeSlots.has(currentSlot) && !removedIds.has(kitterhing.id);
    const legoCanTake = legoFreeSlots.has(currentSlot) && !removedIds.has(lego.id);
    
    if (!kitCanTake && !legoCanTake) continue;
    
    const rank = rankedList.indexOf(d.id);
    const rankStr = rank >= 0 ? `#${rank+1}` : 'unranked';
    
    const beneficiary = [];
    if (kitCanTake) beneficiary.push(`Kitterhing (#11)`);
    if (legoCanTake) beneficiary.push(`O'Regan/LEGO (#14)`);
    
    console.log(`  Move ${d.firstName} ${d.lastName} (rank ${rankStr}) from slot ${currentSlot} (${slotLabels[currentSlot]}) → slot ${openSlot} (${slotLabels[openSlot]})`);
    console.log(`    → Frees slot ${currentSlot} for: ${beneficiary.join(' or ')}`);
  }
  console.log('');
}

process.exit(0);
