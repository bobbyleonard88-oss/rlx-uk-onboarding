import * as db from './db.ts';
import { attendees } from './attendees.ts';

const HACKAJOB_ID = 540001;
const VEREMARK_ID = 810001;

const allIntakes = await db.getAllIntakeSubmissions();
const allRankings = await db.getAllRankingsSubmissions();

const hackIntake = allIntakes.find(i => i.sponsorId === HACKAJOB_ID);
const veremarkIntake = allIntakes.find(i => i.sponsorId === VEREMARK_ID);

const rikki = attendees.find(a => a.company?.toLowerCase().includes('serco'));
const jules = attendees.find(a => a.company?.toLowerCase().includes('gilead'));

const hackRanking = allRankings.find(r => r.sponsorId === HACKAJOB_ID);
const hackRankedList = hackRanking?.rankingsData ? JSON.parse(hackRanking.rankingsData) : [];
const veremarkRanking = allRankings.find(r => r.sponsorId === VEREMARK_ID);
const veremarkRankedList = veremarkRanking?.rankingsData ? JSON.parse(veremarkRanking.rankingsData) : [];

console.log('=== RIKKI FULLERTON (Serco) ===');
console.log(`Role: ${rikki?.jobTitle}`);
console.log(`ATS: ${rikki?.ats}`);
console.log(`Active Projects: ${rikki?.activeConfirmedProjects}`);
console.log(`Key Areas: ${rikki?.keySolutionAreasOfInterest}`);
console.log(`Pain Points: ${rikki?.currentPainPoints}`);
console.log(`Primary Objective: ${rikki?.primaryMeetingObjective}`);
console.log(`hackajob rank: #${hackRankedList.indexOf(rikki?.id) + 1}`);

console.log('\n=== JULES ANDERSON (Gilead Science) ===');
console.log(`Role: ${jules?.jobTitle}`);
console.log(`ATS: ${jules?.ats}`);
console.log(`Active Projects: ${jules?.activeConfirmedProjects}`);
console.log(`Key Areas: ${jules?.keySolutionAreasOfInterest}`);
console.log(`Pain Points: ${jules?.currentPainPoints}`);
console.log(`Primary Objective: ${jules?.primaryMeetingObjective}`);
console.log(`Veremark rank: #${veremarkRankedList.indexOf(jules?.id) + 1}`);

console.log('\n=== HACKAJOB PROFILE ===');
if (hackIntake?.formData) {
  const fd = JSON.parse(hackIntake.formData);
  console.log(JSON.stringify(fd, null, 2).substring(0, 1500));
}

console.log('\n=== VEREMARK PROFILE ===');
if (veremarkIntake?.formData) {
  const fd = JSON.parse(veremarkIntake.formData);
  console.log(JSON.stringify(fd, null, 2).substring(0, 1500));
}

process.exit(0);
