import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();
const allIntakes = await db.getAllIntakeSubmissions();

// Find Veremark
const veremarkIntake = allIntakes.find(i => i.companyName?.toLowerCase().includes('veremark'));
const VEREMARK_ID = veremarkIntake?.sponsorId;
console.log(`Veremark sponsorId: ${VEREMARK_ID}`);

const veremarkRanking = allRankings.find(r => r.sponsorId === VEREMARK_ID);
const veremarkRankedList = veremarkRanking?.rankingsData ? JSON.parse(veremarkRanking.rankingsData) : [];

// Find Jules Anderson (Gilead)
const jules = attendees.find(a => a.company?.toLowerCase().includes('gilead'));
console.log(`Jules: ${jules?.firstName} ${jules?.lastName} (${jules?.company}) id=${jules?.id}`);

// Jules rank for Veremark
const julesVeremarkRank = veremarkRankedList.indexOf(jules?.id);
console.log(`Jules rank for Veremark: ${julesVeremarkRank >= 0 ? '#' + (julesVeremarkRank + 1) + ' of ' + veremarkRankedList.length : 'unranked'}`);

// Is Jules free in slot 7?
const slotOccupancy = new Map();
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const busySlot7 = slotOccupancy.get(7) || new Set();
console.log(`Jules free in slot 7 (Day2 10:30): ${!busySlot7.has(jules?.id) ? '✅ YES' : '❌ NO — busy with another sponsor'}`);

// Also check Jules' current meetings
const julesMeetings = allMeetings.filter(m => m.attendeeId === jules?.id);
const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};
console.log(`\nJules' current meetings (${julesMeetings.length}):`);
for (const m of julesMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const intake = allIntakes.find(i => i.sponsorId === m.sponsorId);
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${intake?.companyName || m.sponsorId}`);
}

// Show Veremark's current meetings
const veremarkMeetings = allMeetings.filter(m => m.sponsorId === VEREMARK_ID);
console.log(`\nVeremark current meetings (${veremarkMeetings.length}):`);
for (const m of veremarkMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const d = attendees.find(a => a.id === m.attendeeId);
  const rank = veremarkRankedList.indexOf(d?.id);
  const rankStr = rank >= 0 ? `#${rank+1}` : 'unranked';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${d?.firstName} ${d?.lastName} (${d?.company}) rank ${rankStr}`);
}

process.exit(0);
