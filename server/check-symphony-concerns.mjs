import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;
const JAMES_ID = '12731251';

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

const symphonyMeetings = allMeetings.filter(m => m.sponsorId === SYMPHONY_ID);
const ranking = allRankings.find(r => r.sponsorId === SYMPHONY_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

console.log('=== Symphony Talent Schedule ===');
console.log(`Total meetings: ${symphonyMeetings.length}\n`);

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

for (const m of symphonyMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const d = attendees.find(a => a.id === m.attendeeId);
  if (!d) { console.log(`  Slot ${m.timeSlot}: UNKNOWN (${m.attendeeId})`); continue; }
  const rank = rankedList.indexOf(d.id);
  const rankStr = rank >= 0 ? `#${rank+1}` : 'unranked';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${d.firstName} ${d.lastName} (${d.company}) | rank ${rankStr} | ${m.matchScore}%`);
  console.log(`    ATS: ${d.ats || 'N/A'} | Projects: ${d.activeConfirmedProjects || 'N/A'}`);
  console.log(`    Pain Points: ${d.currentPainPoints || 'N/A'}`);
  console.log(`    Key Areas: ${d.keySolutionAreasOfInterest || 'N/A'}`);
  console.log('');
}

// Highlight the three flagged companies
const flagged = ['BMS Group', 'Rentokil', 'University of the Arts London'];
console.log('\n=== Flagged Delegates Deep Dive ===');
for (const company of flagged) {
  const d = attendees.find(a => a.company?.toLowerCase().includes(company.toLowerCase()));
  if (!d) { console.log(`${company}: NOT FOUND`); continue; }
  const m = symphonyMeetings.find(mt => mt.attendeeId === d.id);
  const rank = rankedList.indexOf(d.id);
  console.log(`\n--- ${d.firstName} ${d.lastName} (${d.company}) ---`);
  console.log(`  In Symphony schedule: ${m ? 'YES, slot ' + m.timeSlot + ' (' + slotLabels[m.timeSlot] + ')' : 'NO'}`);
  console.log(`  Symphony rank: ${rank >= 0 ? '#' + (rank+1) : 'unranked'}`);
  console.log(`  ATS: ${d.ats}`);
  console.log(`  CRM: ${d.crm}`);
  console.log(`  Assessment: ${d.assessmentTool}`);
  console.log(`  Active Projects: ${d.activeConfirmedProjects}`);
  console.log(`  Key Areas: ${d.keySolutionAreasOfInterest}`);
  console.log(`  Pain Points: ${d.currentPainPoints}`);
  console.log(`  Primary Objective: ${d.primaryMeetingObjective}`);
  console.log(`  Project Stage: ${d.currentProjectStage}`);
}

// Find better alternatives for the flagged slots
console.log('\n=== Better Alternatives (no ATS focus) ===');
const symphonyDelegateIds = new Set(symphonyMeetings.map(m => m.attendeeId));
const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

// Get the slots occupied by flagged delegates
for (const company of flagged) {
  const d = attendees.find(a => a.company?.toLowerCase().includes(company.toLowerCase()));
  if (!d) continue;
  const m = symphonyMeetings.find(mt => mt.attendeeId === d.id);
  if (!m) continue;
  
  const busyInSlot = new Set(allMeetings.filter(mt => mt.timeSlot === m.timeSlot).map(mt => mt.attendeeId));
  
  console.log(`\nIf we remove ${d.firstName} ${d.lastName} from slot ${m.timeSlot} (${slotLabels[m.timeSlot]}):`);
  let shown = 0;
  for (let i = 0; i < rankedList.length; i++) {
    const id = rankedList[i];
    if (id === JAMES_ID || symphonyDelegateIds.has(id)) continue;
    const alt = attendees.find(a => a.id === id);
    if (!alt) continue;
    const count = meetingCount.get(id) || 0;
    if (count >= 8) continue;
    if (busyInSlot.has(id)) continue;
    // Check if their focus is NOT primarily ATS
    const atsKeywords = ['ats', 'applicant tracking', 'onboarding platform'];
    const projects = (alt.activeConfirmedProjects || '').toLowerCase();
    const areas = (alt.keySolutionAreasOfInterest || '').toLowerCase();
    const isATSFocused = atsKeywords.some(k => projects.includes(k) || areas.includes(k));
    const flag = isATSFocused ? ' ⚠️ ATS focus' : ' ✅';
    console.log(`  Rank #${i+1}: ${alt.firstName} ${alt.lastName} (${alt.company}) — ${count} meetings${flag}`);
    console.log(`    Areas: ${alt.keySolutionAreasOfInterest}`);
    shown++;
    if (shown >= 3) break;
  }
}

process.exit(0);
