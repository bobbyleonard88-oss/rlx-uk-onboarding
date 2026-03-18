import * as db from './db.ts';
import { attendees } from './attendees.ts';

const HACKAJOB_ID = 540001;
const VEREMARK_ID = 810001;

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();

const rikki = attendees.find(a => a.company?.toLowerCase().includes('serco'));
const jules = attendees.find(a => a.company?.toLowerCase().includes('gilead'));

const hackIntake = allIntakes.find(i => i.sponsorId === HACKAJOB_ID);
const veremarkIntake = allIntakes.find(i => i.sponsorId === VEREMARK_ID);

// Find existing meetings to remove
const rikkiVeremarkMeeting = allMeetings.find(m => m.sponsorId === VEREMARK_ID && m.attendeeId === rikki?.id);
const julesHackajobMeeting = allMeetings.find(m => m.sponsorId === HACKAJOB_ID && m.attendeeId === jules?.id);

if (!rikkiVeremarkMeeting) throw new Error('Rikki not found in Veremark meetings');
if (!julesHackajobMeeting) throw new Error('Jules not found in hackajob meetings');

console.log(`Rikki Fullerton (Serco): Veremark slot ${rikkiVeremarkMeeting.timeSlot} (id: ${rikkiVeremarkMeeting.id})`);
console.log(`Jules Anderson (Gilead): hackajob slot ${julesHackajobMeeting.timeSlot} (id: ${julesHackajobMeeting.id})`);

// Step 1: Remove Rikki from Veremark slot 7
console.log('\nStep 1: Removing Rikki from Veremark slot 7...');
await db.deleteMeeting(rikkiVeremarkMeeting.id);
console.log('  ✅ Done');

// Step 2: Remove Jules from hackajob slot 8
console.log('Step 2: Removing Jules from hackajob slot 8...');
await db.deleteMeeting(julesHackajobMeeting.id);
console.log('  ✅ Done');

// Step 3: Add Rikki to hackajob slot 8 (score 72%, reason about tech modernisation)
console.log('Step 3: Adding Rikki to hackajob slot 8 (score 72%)...');
await db.createMeeting({
  sponsorId: HACKAJOB_ID,
  attendeeId: rikki.id,
  timeSlot: 8,
  status: 'confirmed',
  matchScore: 72,
  matchReason: "Rikki is a Talent Acquisition Director at Serco with a team of 40+ managing vetting and onboarding, actively looking to introduce advanced technology to improve efficiency and reduce processing time. hackajob's tech-enabled talent marketplace aligns with her interest in AI capabilities and recruiter efficiency tools. The primary fit is around technology modernisation in the talent acquisition function — Serco's scale and complexity make them a strong target for hackajob's platform.",
  contactEmail: hackIntake?.contactEmail || '',
  contactName: hackIntake?.contactName || '',
});
console.log('  ✅ Done');

// Step 4: Add Jules to Veremark slot 7 (score 68%, reason about screening efficiency)
console.log('Step 4: Adding Jules to Veremark slot 7 (score 68%)...');
await db.createMeeting({
  sponsorId: VEREMARK_ID,
  attendeeId: jules.id,
  timeSlot: 7,
  status: 'confirmed',
  matchScore: 68,
  matchReason: "Jules is a Director of Talent Acquisition at Gilead Science with active projects around AI-enabled tech, candidate experience, and Workday optimisation. Veremark's background screening and vetting platform connects directly to Jules' interest in screening efficiency and CRM functionality — two of her stated pain points. The fit is genuine but partial: Jules' primary objectives lean toward AI, internal mobility, and candidate experience platforms, which are adjacent rather than central to Veremark's core offering.",
  contactEmail: veremarkIntake?.contactEmail || '',
  contactName: veremarkIntake?.contactName || '',
});
console.log('  ✅ Done');

// Verify
const updatedMeetings = await db.getAllMeetings();
const hackFinal = updatedMeetings.filter(m => m.sponsorId === HACKAJOB_ID);
const veremarkFinal = updatedMeetings.filter(m => m.sponsorId === VEREMARK_ID);

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

console.log('\n=== hackajob final schedule ===');
for (const m of hackFinal.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const d = attendees.find(a => a.id === m.attendeeId);
  const isNew = d?.id === rikki.id ? ' ← NEW (Serco)' : '';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${d?.firstName} ${d?.lastName} (${d?.company}) ${m.matchScore}%${isNew}`);
}

console.log('\n=== Veremark final schedule (slot 7) ===');
const slot7 = veremarkFinal.find(m => m.timeSlot === 7);
const d7 = attendees.find(a => a.id === slot7?.attendeeId);
console.log(`  Slot 7 (Day2 10:30): ${d7?.firstName} ${d7?.lastName} (${d7?.company}) ${slot7?.matchScore}% ← NEW (Gilead)`);

console.log(`\nhackajob total meetings: ${hackFinal.length}`);
console.log(`Veremark total meetings: ${veremarkFinal.length}`);

process.exit(0);
