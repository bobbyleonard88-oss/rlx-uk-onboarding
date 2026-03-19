import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();
const allRankings = await db.getAllRankingsSubmissions();

function getSponsorId(name) {
  for (const i of allIntakes) {
    const n = i.companyName?.toLowerCase() || '';
    if (n.includes(name.toLowerCase()) || name.toLowerCase().includes(n)) return i.sponsorId;
  }
  return null;
}

const veremarkId = getSponsorId('veremark');
const veremarkRankings = JSON.parse(allRankings.find(r => r.sponsorId === veremarkId)?.rankingsData || '[]');

// Current Veremark meetings
const veremarkMeetings = allMeetings.filter(m => m.sponsorId === veremarkId);
const currentAttendeeIds = new Set(veremarkMeetings.map(m => m.attendeeId));

// Meeting counts per delegate
const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

// Slot occupancy
const slotOccupancy = new Map();
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

// Find James Harley's slot at Veremark
const jamesHarley = attendees.find(a => a.firstName === 'James' && a.lastName === 'Harley');
const jamesVeremarkMtg = veremarkMeetings.find(m => m.attendeeId === jamesHarley.id);
const jamesSlot = jamesVeremarkMtg?.timeSlot;
const jamesRankIdx = veremarkRankings.indexOf(String(jamesHarley.id));
const jamesRank = jamesRankIdx >= 0 ? jamesRankIdx + 1 : 'unranked';

console.log(`James Harley (Syngenta) is in Veremark slot ${jamesSlot} (${slotLabels[jamesSlot]}), rank #${jamesRank}, score ${jamesVeremarkMtg?.matchScore}%`);
console.log(`\nVeremark has ${veremarkMeetings.length} meetings total`);

// Show current Veremark schedule with ranks
console.log('\n=== CURRENT VEREMARK SCHEDULE ===');
const sortedMtgs = [...veremarkMeetings].sort((a,b) => a.timeSlot - b.timeSlot);
for (const m of sortedMtgs) {
  const a = attendees.find(x => x.id === m.attendeeId);
  const rankIdx = veremarkRankings.indexOf(String(m.attendeeId));
  const rank = rankIdx >= 0 ? `#${rankIdx+1}` : 'unranked';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${a?.firstName} ${a?.lastName} (${a?.company}) — rank ${rank}, score ${m.matchScore}%`);
}

// Find all delegates ranked higher than James (#13) by Veremark who are NOT already in Veremark's schedule
console.log('\n=== DELEGATES RANKED BETTER THAN SYNGENTA (#13) NOT IN VEREMARK SCHEDULE ===');
const betterOptions = [];
for (let i = 0; i < Math.min(jamesRankIdx, veremarkRankings.length); i++) {
  const aId = veremarkRankings[i];
  if (currentAttendeeIds.has(aId)) continue; // already in schedule
  const a = attendees.find(x => String(x.id) === String(aId));
  if (!a) continue;
  const count = meetingCount.get(a.id) || 0;
  if (count >= 8) continue; // full
  // Check which slots they're free in
  const freeSlots = [];
  for (let s = 1; s <= 12; s++) {
    if (!slotOccupancy.get(s)?.has(a.id)) freeSlots.push(s);
  }
  betterOptions.push({ rank: i+1, attendee: a, count, freeSlots });
}

for (const opt of betterOptions.slice(0, 10)) {
  const freeSlotsStr = opt.freeSlots.map(s => `${s}(${slotLabels[s]})`).join(', ');
  console.log(`  Rank #${opt.rank}: ${opt.attendee.firstName} ${opt.attendee.lastName} (${opt.attendee.company}) — ${opt.count}/8 meetings — free in slots: ${freeSlotsStr}`);
}

// Check if any of these are free in James's slot specifically
console.log(`\n=== OPTIONS FREE IN JAMES'S SLOT (slot ${jamesSlot}) ===`);
const directOptions = betterOptions.filter(o => o.freeSlots.includes(jamesSlot));
for (const opt of directOptions.slice(0, 5)) {
  console.log(`  Rank #${opt.rank}: ${opt.attendee.firstName} ${opt.attendee.lastName} (${opt.attendee.company}) — ${opt.count}/8 meetings`);
}

// Reshuffle: can we move a lower-ranked Veremark delegate to James's slot, freeing a better slot?
console.log('\n=== RESHUFFLE OPTIONS (move weaker delegate to free a better slot) ===');
// Find Veremark delegates ranked lower than James who could move to James's slot
const lowerRankedInVeremark = sortedMtgs.filter(m => {
  const rankIdx = veremarkRankings.indexOf(String(m.attendeeId));
  return rankIdx > jamesRankIdx || rankIdx < 0; // lower rank or unranked
}).filter(m => m.attendeeId !== jamesHarley.id);

for (const weakMtg of lowerRankedInVeremark) {
  const weakA = attendees.find(x => x.id === weakMtg.attendeeId);
  const weakRankIdx = veremarkRankings.indexOf(String(weakMtg.attendeeId));
  const weakRank = weakRankIdx >= 0 ? `#${weakRankIdx+1}` : 'unranked';
  
  // Can this delegate move to James's slot?
  const canMoveToJamesSlot = !slotOccupancy.get(jamesSlot)?.has(weakA.id) || weakMtg.timeSlot === jamesSlot;
  if (!canMoveToJamesSlot) continue;
  
  // What better-ranked delegates are free in weakMtg's current slot?
  const freedSlot = weakMtg.timeSlot;
  const upgrades = betterOptions.filter(o => o.freeSlots.includes(freedSlot));
  
  if (upgrades.length > 0) {
    console.log(`\n  Move ${weakA.firstName} ${weakA.lastName} (${weakRank}) from slot ${freedSlot} → slot ${jamesSlot}`);
    console.log(`  Opens slot ${freedSlot} (${slotLabels[freedSlot]}) for:`);
    for (const u of upgrades.slice(0, 3)) {
      console.log(`    → Rank #${u.rank}: ${u.attendee.firstName} ${u.attendee.lastName} (${u.attendee.company})`);
    }
  }
}

process.exit(0);
