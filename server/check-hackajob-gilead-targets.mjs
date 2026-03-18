import * as db from './db.ts';
import { attendees } from './attendees.ts';

const HACKAJOB_ID = 540001;

// Sam's target companies (those attending the event)
const TARGET_COMPANIES = [
  'PepsiCo', 'Aon', 'Serco', 'Munich Re', 'easyJet', 'Syngenta', 'Ramboll', 'Lockton', 'Nissan'
  // Expleo, Hitachi, CBRE, Macquarie, Pearson, Palo Alto, Western Union, Latham not attending
];

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();
const allIntakes = await db.getAllIntakeSubmissions();

const hackajobMeetings = allMeetings.filter(m => m.sponsorId === HACKAJOB_ID);
const hackRanking = allRankings.find(r => r.sponsorId === HACKAJOB_ID);
const hackRankedList = hackRanking?.rankingsData ? JSON.parse(hackRanking.rankingsData) : [];

const hackajobDelegateIds = new Set(hackajobMeetings.map(m => m.attendeeId));

const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

const slotOccupancy = new Map();
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

// Gilead slot is 8
const gileadSlot = 8;
const busyInGileadSlot = slotOccupancy.get(gileadSlot) || new Set();

// Build sponsor name map
const sponsorNames = new Map();
for (const intake of allIntakes) {
  sponsorNames.set(intake.sponsorId, intake.companyName || `Sponsor ${intake.sponsorId}`);
}

console.log("=== Sam's target delegates — hackajob rank & current sponsor rank ===\n");

for (const targetCompany of TARGET_COMPANIES) {
  const delegate = attendees.find(a => a.company?.toLowerCase().includes(targetCompany.toLowerCase()));
  if (!delegate) {
    console.log(`${targetCompany}: NOT IN ATTENDEES LIST`);
    continue;
  }

  const hackRank = hackRankedList.indexOf(delegate.id);
  const hackRankStr = hackRank >= 0 ? `#${hackRank + 1}` : 'unranked by hackajob';
  const alreadyInHack = hackajobDelegateIds.has(delegate.id);
  const meetings = meetingCount.get(delegate.id) || 0;
  const freeInGileadSlot = !busyInGileadSlot.has(delegate.id);

  // Find which sponsor they're currently meeting and what rank they are for that sponsor
  const delegateMeetings = allMeetings.filter(m => m.attendeeId === delegate.id && m.sponsorId !== HACKAJOB_ID);
  
  const sponsorRankings = [];
  for (const m of delegateMeetings) {
    const sRanking = allRankings.find(r => r.sponsorId === m.sponsorId);
    const sRankedList = sRanking?.rankingsData ? JSON.parse(sRanking.rankingsData) : [];
    const sRank = sRankedList.indexOf(delegate.id);
    const sRankStr = sRank >= 0 ? `#${sRank + 1} of ${sRankedList.length}` : 'unranked';
    const sponsorName = sponsorNames.get(m.sponsorId) || `Sponsor ${m.sponsorId}`;
    sponsorRankings.push({ sponsorName, rank: sRank, rankStr: sRankStr, slot: m.timeSlot, sponsorId: m.sponsorId });
  }

  // Sort by rank descending (highest rank number = lowest priority for that sponsor)
  sponsorRankings.sort((a, b) => b.rank - a.rank);

  const status = alreadyInHack ? '✅ ALREADY IN hackajob' : (freeInGileadSlot ? '🟡 FREE in slot 8' : '❌ BUSY in slot 8');
  
  console.log(`${targetCompany} — ${delegate.firstName} ${delegate.lastName}`);
  console.log(`  hackajob rank: ${hackRankStr} | ${meetings} meetings | ${status}`);
  
  if (!alreadyInHack && sponsorRankings.length > 0) {
    console.log(`  Current sponsor meetings (ranked lowest first):`);
    for (const sr of sponsorRankings.slice(0, 3)) {
      const lowFlag = sr.rank >= 20 ? ' ⚠️ LOW PRIORITY' : '';
      console.log(`    ${sr.sponsorName}: rank ${sr.rankStr} in slot ${sr.slot} (${slotLabels[sr.slot]})${lowFlag}`);
    }
  }
  console.log('');
}

process.exit(0);
