import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;
const JAMES_ID = '12731251';
const CATH_ID = '452351'; // Cath Possamai - Amazon (customer)

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();
const allIntakes = await db.getAllIntakeSubmissions();

const symphonyMeetings = allMeetings.filter(m => m.sponsorId === SYMPHONY_ID);
const ranking = allRankings.find(r => r.sponsorId === SYMPHONY_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

// Get Symphony's intake for customer/exclusion data
const symphonyIntake = allIntakes.find(i => i.sponsorId === SYMPHONY_ID);
let customers = [];
let excluded = [];
if (symphonyIntake?.formData) {
  const fd = JSON.parse(symphonyIntake.formData);
  customers = fd.existingCustomers || fd.customers || [];
  excluded = fd.excludedDelegates || fd.exclusions || [];
  console.log('Symphony customers:', customers);
  console.log('Symphony exclusions:', excluded);
}

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

const slotOccupancy = new Map();
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const symphonyDelegateIds = new Set(symphonyMeetings.map(m => m.attendeeId));

// Flagged delegates to remove
const flaggedIds = new Set();
const bms = attendees.find(a => a.company?.includes('BMS'));
const rentokil = attendees.find(a => a.company?.toLowerCase().includes('rentokil'));
const ual = attendees.find(a => a.company?.includes('University of the Arts'));
if (bms) flaggedIds.add(bms.id);
if (rentokil) flaggedIds.add(rentokil.id);
if (ual) flaggedIds.add(ual.id);

const removedIds = new Set([...flaggedIds, CATH_ID]); // exclude Cath too
const remainingSymIds = new Set([...symphonyDelegateIds].filter(id => !flaggedIds.has(id)));

// ATS keywords to flag
const atsKeywords = ['ats', 'applicant tracking', 'onboarding platform', 'background screening'];

function isATSFocused(d) {
  const projects = (d.activeConfirmedProjects || '').toLowerCase();
  const areas = (d.keySolutionAreasOfInterest || '').toLowerCase();
  return atsKeywords.some(k => projects.includes(k) || areas.includes(k));
}

function isCustomerOrExcluded(d) {
  const name = `${d.firstName} ${d.lastName}`.toLowerCase();
  const company = (d.company || '').toLowerCase();
  return customers.some(c => c.toLowerCase().includes(company) || company.includes(c.toLowerCase())) ||
         excluded.some(e => e.toLowerCase().includes(name) || name.includes(e.toLowerCase()));
}

function getBestForSlot(slot, excludeIds) {
  const busyInSlot = slotOccupancy.get(slot) || new Set();
  const results = [];
  for (let i = 0; i < rankedList.length; i++) {
    const id = rankedList[i];
    if (id === JAMES_ID) continue;
    if (excludeIds.has(id)) continue;
    const d = attendees.find(a => a.id === id);
    if (!d) continue;
    const count = meetingCount.get(id) || 0;
    if (count >= 8) continue;
    if (busyInSlot.has(id)) continue;
    const atsFocus = isATSFocused(d);
    const custExcl = isCustomerOrExcluded(d);
    const flags = [atsFocus ? '⚠️ ATS focus' : null, custExcl ? '🚫 customer/excluded' : null].filter(Boolean).join(', ');
    results.push({ rank: i+1, delegate: d, meetings: count, flags, clean: !atsFocus && !custExcl });
    if (results.filter(r => r.clean).length >= 3 && results.length >= 5) break;
    if (results.length >= 8) break;
  }
  return results;
}

const flaggedSlots = [
  { slot: 5, label: 'Anna Katyal (BMS Group)', rank: 27 },
  { slot: 9, label: 'Sarah Cooper (Rentokil)', rank: 34 },
  { slot: 2, label: 'Mark Kunaseelan (UAL)', rank: 'unranked' },
];

console.log('\n════════════════════════════════════════════════════════════');
console.log('BEST OPTIONS (excluding Cath Possamai/Amazon as customer)');
console.log('════════════════════════════════════════════════════════════');

for (const fs of flaggedSlots) {
  console.log(`\nSlot ${fs.slot} (${slotLabels[fs.slot]}) — replacing ${fs.label} (rank #${fs.rank}):`);
  const options = getBestForSlot(fs.slot, new Set([...remainingSymIds, ...removedIds]));
  options.forEach(o => {
    const status = o.clean ? '✅' : o.flags;
    console.log(`  Rank #${o.rank}: ${o.delegate.firstName} ${o.delegate.lastName} (${o.delegate.company}) — ${o.meetings} meetings ${status}`);
    console.log(`    Areas: ${o.delegate.keySolutionAreasOfInterest}`);
  });
}

// Reshuffle: same logic but without Cath
console.log('\n════════════════════════════════════════════════════════════');
console.log('RESHUFFLE OPTIONS (without Cath Possamai)');
console.log('════════════════════════════════════════════════════════════');

const remainingMeetings = symphonyMeetings.filter(m => !flaggedIds.has(m.attendeeId));
const openSlots = flaggedSlots.map(f => f.slot);

for (const openSlot of openSlots) {
  const fs = flaggedSlots.find(f => f.slot === openSlot);
  console.log(`\nOpen slot ${openSlot} (${slotLabels[openSlot]}):`);
  let foundAny = false;
  
  for (const existingMeeting of remainingMeetings) {
    const existingDelegate = attendees.find(a => a.id === existingMeeting.attendeeId);
    if (!existingDelegate) continue;
    const existingRank = rankedList.indexOf(existingDelegate.id);
    const existingSlot = existingMeeting.timeSlot;
    if (existingSlot === openSlot) continue;
    
    const busyInOpenSlot = slotOccupancy.get(openSlot) || new Set();
    if (busyInOpenSlot.has(existingDelegate.id)) continue;
    
    const busyInExistingSlot = slotOccupancy.get(existingSlot) || new Set();
    const higherRanked = [];
    for (let i = 0; i < rankedList.length; i++) {
      const id = rankedList[i];
      if (existingRank >= 0 && i >= existingRank) break;
      if (id === JAMES_ID || id === CATH_ID) continue;
      if (remainingSymIds.has(id) || removedIds.has(id)) continue;
      const d = attendees.find(a => a.id === id);
      if (!d) continue;
      const count = meetingCount.get(id) || 0;
      if (count >= 8) continue;
      if (busyInExistingSlot.has(id)) continue;
      if (isCustomerOrExcluded(d)) continue;
      if (isATSFocused(d)) continue;
      higherRanked.push({ rank: i+1, delegate: d, meetings: count });
      if (higherRanked.length >= 2) break;
    }
    
    if (higherRanked.length > 0) {
      foundAny = true;
      const existingRankStr = existingRank >= 0 ? `#${existingRank+1}` : 'unranked';
      console.log(`  Move ${existingDelegate.firstName} ${existingDelegate.lastName} (rank ${existingRankStr}) slot ${existingSlot} → slot ${openSlot}`);
      console.log(`    → Opens slot ${existingSlot} (${slotLabels[existingSlot]}) for:`);
      higherRanked.forEach(h => {
        console.log(`      Rank #${h.rank}: ${h.delegate.firstName} ${h.delegate.lastName} (${h.delegate.company}) — ${h.meetings} meetings`);
        console.log(`        Areas: ${h.delegate.keySolutionAreasOfInterest}`);
      });
    }
  }
  if (!foundAny) console.log('  No beneficial reshuffle options.');
}

process.exit(0);
