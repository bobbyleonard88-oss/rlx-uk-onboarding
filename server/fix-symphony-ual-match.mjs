import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();

const ual = attendees.find(a => a.company?.includes('University of the Arts'));
const ualMeeting = allMeetings.find(m => m.sponsorId === SYMPHONY_ID && m.attendeeId === ual?.id);

console.log('=== UAL Delegate Full Profile ===');
console.log(`Name: ${ual?.firstName} ${ual?.lastName}`);
console.log(`Company: ${ual?.company}`);
console.log(`Role: ${ual?.jobTitle}`);
console.log(`ATS: ${ual?.ats}`);
console.log(`Active Projects: ${ual?.activeConfirmedProjects}`);
console.log(`Key Areas: ${ual?.keySolutionAreasOfInterest}`);
console.log(`Pain Points: ${ual?.currentPainPoints}`);
console.log(`Primary Objective: ${ual?.primaryMeetingObjective}`);
console.log(`Project Stage: ${ual?.currentProjectStage}`);
console.log(`\nCurrent match score: ${ualMeeting?.matchScore}%`);
console.log(`Current match reason: ${ualMeeting?.matchReason || 'none stored'}`);

// Get Symphony intake
const symphonyIntake = allIntakes.find(i => i.sponsorId === SYMPHONY_ID);
if (symphonyIntake?.formData) {
  const fd = JSON.parse(symphonyIntake.formData);
  console.log('\n=== Symphony Talent Profile ===');
  console.log(`Attendee: ${fd.attendeeName || fd.name}`);
  console.log(`Products/Services: ${fd.productsServices || fd.offerings || JSON.stringify(fd).substring(0, 500)}`);
}

process.exit(0);
