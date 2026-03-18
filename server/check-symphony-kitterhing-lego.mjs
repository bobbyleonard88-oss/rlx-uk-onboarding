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

// Find Kitterhing and O'Regan
const kitterhing = attendees.find(a => a.lastName === 'Kitterhing' || a.company?.includes('Swiss Re'));
const lego = attendees.find(a => a.company?.toLowerCase().includes('lego'));

console.log(`Kitterhing: ${kitterhing?.firstName} ${kitterhing?.lastName} (${kitterhing?.company}) id=${kitterhing?.id}`);
console.log(`  Current meetings: ${meetingCount.get(kitterhing?.id) || 0}`);
console.log(`  Busy in slots: ${[...slotOccupancy.entries()].filter(([,s]) => s.has(kitterhing?.id)).map(([slot]) => slot + ' (' + slotLabels[slot] + ')').join(', ') || 'none'}`);

console.log(`\nO'Regan (LEGO): ${lego?.firstName} ${lego?.lastName} (${lego?.company}) id=${lego?.id}`);
console.log(`  Current meetings: ${meetingCount.get(lego?.id) || 0}`);
console.log(`  Busy in slots: ${[...slotOccupancy.entries()].filter(([,s]) => s.has(lego?.id)).map(([slot]) => slot + ' (' + slotLabels[slot] + ')').join(', ') || 'none'}`);

// The 3 open slots (after removing BMS, Rentokil, UAL)
const openSlots = [2, 5, 9];
const bms = attendees.find(a => a.company?.includes('BMS'));
const rentokil = attendees.find(a => a.company?.toLowerCase().includes('rentokil'));
const ual = attendees.find(a => a.company?.includes('University of the Arts'));
const removedIds = new Set([bms?.id, rentokil?.id, ual?.id].filter(Boolean));

console.log('\n=== Open slots after removing 3 flagged delegates ===');
for (const slot of openSlots) {
  const busyInSlot = slotOccupancy.get(slot) || new Set();
  const kitFree = !busyInSlot.has(kitterhing?.id);
  const legoFree = !busyInSlot.has(lego?.id);
  console.log(`  Slot ${slot} (${slotLabels[slot]}): Kitterhing ${kitFree ? '✅ FREE' : '❌ BUSY'} | O\'Regan ${legoFree ? '✅ FREE' : '❌ BUSY'}`);
}

// Find which existing Symphony delegates can be moved to free up slots for both
console.log('\n=== Reshuffle to fit BOTH Kitterhing AND O\'Regan ===');

const remainingMeetings = symphonyMeetings.filter(m => !removedIds.has(m.attendeeId));
const symphonyDelegateIds = new Set(symphonyMeetings.map(m => m.attendeeId));
const remainingSymIds = new Set([...symphonyDelegateIds].filter(id => !removedIds.has(id)));

// Check each combination: which 2 of the 3 open slots can Kitterhing and O'Regan fill?
// If they can fill 2 directly, the 3rd needs a different person
for (const kitSlot of openSlots) {
  const busyKit = slotOccupancy.get(kitSlot) || new Set();
  if (busyKit.has(kitterhing?.id)) continue;
  
  for (const legoSlot of openSlots) {
    if (legoSlot === kitSlot) continue;
    const busyLego = slotOccupancy.get(legoSlot) || new Set();
    if (busyLego.has(lego?.id)) continue;
    
    const thirdSlot = openSlots.find(s => s !== kitSlot && s !== legoSlot);
    
    // Find best person for third slot (not Kitterhing, not O'Regan, not already in Symphony, not ATS)
    const busyThird = slotOccupancy.get(thirdSlot) || new Set();
    const thirdOptions = [];
    for (let i = 0; i < rankedList.length; i++) {
      const id = rankedList[i];
      if (id === kitterhing?.id || id === lego?.id) continue;
      if (remainingSymIds.has(id) || removedIds.has(id)) continue;
      const d = attendees.find(a => a.id === id);
      if (!d) continue;
      const count = meetingCount.get(id) || 0;
      if (count >= 8) continue;
      if (busyThird.has(id)) continue;
      const atsCheck = (d.activeConfirmedProjects || '').toLowerCase() + (d.keySolutionAreasOfInterest || '').toLowerCase();
      if (['ats', 'applicant tracking'].some(k => atsCheck.includes(k))) continue;
      thirdOptions.push({ rank: i+1, delegate: d, meetings: count });
      if (thirdOptions.length >= 2) break;
    }
    
    console.log(`\n  Option: Kitterhing → slot ${kitSlot} (${slotLabels[kitSlot]}) | O'Regan → slot ${legoSlot} (${slotLabels[legoSlot]}) | slot ${thirdSlot} (${slotLabels[thirdSlot]}) needs:`);
    thirdOptions.forEach(o => console.log(`    Rank #${o.rank}: ${o.delegate.firstName} ${o.delegate.lastName} (${o.delegate.company}) — ${o.meetings} meetings`));
    if (thirdOptions.length === 0) console.log('    No clean option available for third slot');
  }
}

// Also check if reshuffling existing Symphony delegates can help
console.log('\n=== If reshuffle needed to fit both ===');
// Check if Kitterhing or O'Regan are blocked in any of the 3 open slots
for (const slot of openSlots) {
  const busyInSlot = slotOccupancy.get(slot) || new Set();
  if (busyInSlot.has(kitterhing?.id)) {
    // Find who else is in this slot that's in Symphony and could move
    for (const m of remainingMeetings) {
      if (m.timeSlot !== slot) continue;
      const d = attendees.find(a => a.id === m.attendeeId);
      if (!d) continue;
      // Can this person move to one of the other open slots?
      for (const altSlot of openSlots) {
        if (altSlot === slot) continue;
        const busyAlt = slotOccupancy.get(altSlot) || new Set();
        if (!busyAlt.has(d.id)) {
          console.log(`  Kitterhing blocked in slot ${slot} by ${d.firstName} ${d.lastName} (Symphony) — can move to slot ${altSlot} (${slotLabels[altSlot]})`);
        }
      }
    }
  }
}

process.exit(0);
