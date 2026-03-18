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

const symphonyDelegateIds = new Set(symphonyMeetings.map(m => m.attendeeId));

const ual = attendees.find(a => a.company?.includes('University of the Arts'));
const ualMeeting = symphonyMeetings.find(m => m.attendeeId === ual?.id);

console.log(`UAL: ${ual?.firstName} ${ual?.lastName} (${ual?.company}) in slot ${ualMeeting?.timeSlot}`);

const openSlot = 2; // slot 2 freed if we remove UAL
const busyInSlot2 = slotOccupancy.get(openSlot) || new Set();

// ATS keywords
const atsKeywords = ['ats', 'applicant tracking', 'onboarding platform'];
function isATSFocused(d) {
  const t = ((d.activeConfirmedProjects || '') + (d.keySolutionAreasOfInterest || '')).toLowerCase();
  return atsKeywords.some(k => t.includes(k));
}

console.log('\n=== DIRECT OPTIONS for slot 2 (if UAL removed) ===');
let shown = 0;
for (let i = 0; i < rankedList.length; i++) {
  const id = rankedList[i];
  if (symphonyDelegateIds.has(id)) continue;
  const d = attendees.find(a => a.id === id);
  if (!d) continue;
  const count = meetingCount.get(id) || 0;
  if (count >= 8) continue;
  if (busyInSlot2.has(id)) continue;
  const ats = isATSFocused(d);
  const flag = ats ? ' ⚠️ ATS' : ' ✅';
  console.log(`  Rank #${i+1}: ${d.firstName} ${d.lastName} (${d.company}) — ${count} meetings${flag}`);
  console.log(`    Areas: ${d.keySolutionAreasOfInterest}`);
  shown++;
  if (shown >= 5) break;
}

console.log('\n=== RESHUFFLE OPTIONS (move existing Symphony delegate to slot 2, free their slot for higher-ranked) ===');

for (const m of symphonyMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  if (m.timeSlot === openSlot) continue;
  const existingDelegate = attendees.find(a => a.id === m.attendeeId);
  if (!existingDelegate) continue;
  if (existingDelegate.id === ual?.id) continue; // skip UAL itself

  // Can this delegate move to slot 2?
  if (busyInSlot2.has(existingDelegate.id)) continue;

  const existingSlot = m.timeSlot;
  const busyInExistingSlot = slotOccupancy.get(existingSlot) || new Set();
  const existingRank = rankedList.indexOf(existingDelegate.id);

  // Find higher-ranked delegates free in existingSlot
  const higherRanked = [];
  for (let i = 0; i < rankedList.length; i++) {
    const id = rankedList[i];
    if (existingRank >= 0 && i >= existingRank) break;
    if (symphonyDelegateIds.has(id)) continue;
    const d = attendees.find(a => a.id === id);
    if (!d) continue;
    const count = meetingCount.get(id) || 0;
    if (count >= 8) continue;
    if (busyInExistingSlot.has(id)) continue;
    if (isATSFocused(d)) continue;
    higherRanked.push({ rank: i+1, delegate: d, meetings: count });
    if (higherRanked.length >= 2) break;
  }

  if (higherRanked.length > 0) {
    const existingRankStr = existingRank >= 0 ? `#${existingRank+1}` : 'unranked';
    console.log(`\n  Move ${existingDelegate.firstName} ${existingDelegate.lastName} (rank ${existingRankStr}) from slot ${existingSlot} (${slotLabels[existingSlot]}) → slot 2`);
    console.log(`    → Opens slot ${existingSlot} (${slotLabels[existingSlot]}) for:`);
    higherRanked.forEach(h => {
      console.log(`      Rank #${h.rank}: ${h.delegate.firstName} ${h.delegate.lastName} (${h.delegate.company}) — ${h.meetings} meetings`);
      console.log(`        Areas: ${h.delegate.keySolutionAreasOfInterest}`);
    });
  }
}

process.exit(0);
