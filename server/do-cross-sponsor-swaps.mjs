import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();
const allRankings = await db.getAllRankingsSubmissions();

// Build sponsor name map
const sponsorNames = new Map();
for (const i of allIntakes) sponsorNames.set(i.sponsorId, i.companyName);

// Build rankings map
const rankingsMap = new Map();
for (const r of allRankings) {
  if (r.rankingsData) rankingsMap.set(r.sponsorId, JSON.parse(r.rankingsData));
}

function getRankNum(sponsorId, attendeeId) {
  const list = rankingsMap.get(sponsorId) || [];
  const idx = list.indexOf(attendeeId);
  return idx >= 0 ? idx + 1 : null;
}

function findAttendee(firstName, lastName) {
  return attendees.find(a =>
    a.firstName?.toLowerCase() === firstName.toLowerCase() &&
    a.lastName?.toLowerCase() === lastName.toLowerCase()
  );
}

function findSponsor(name) {
  for (const [id, intake] of [...allIntakes.map(i => [i.sponsorId, i])]) {
    const n = allIntakes.find(i => i.sponsorId === id)?.companyName || '';
    if (n.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(n.toLowerCase())) {
      return id;
    }
  }
  return null;
}

// Build sponsor lookup from intakes
const sponsorByName = new Map();
for (const i of allIntakes) sponsorByName.set(i.companyName?.toLowerCase(), i.sponsorId);

function getSponsorId(name) {
  // Try exact match first
  for (const [k, v] of sponsorByName) {
    if (k?.includes(name.toLowerCase()) || name.toLowerCase().includes(k)) return v;
  }
  return null;
}

// Get contact info for a sponsor
function getContact(sponsorId) {
  const intake = allIntakes.find(i => i.sponsorId === sponsorId);
  return { contactEmail: intake?.email || '', contactName: `${intake?.firstName || ''} ${intake?.lastName || ''}`.trim() };
}

// Find meeting for a delegate+sponsor
function findMeeting(sponsorId, attendeeId) {
  return allMeetings.find(m => m.sponsorId === sponsorId && m.attendeeId === attendeeId);
}

// Slot occupancy
const slotOccupancy = new Map();
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

// ============================================================
// SWAP 1: Jon Warwick (Sky) — Veremark → Harver
//         James Harley (Syngenta) — Harver → Veremark
// ============================================================
const jonWarwick = findAttendee('Jon', 'Warwick');
const jamesHarley = findAttendee('James', 'Harley');
const veremarkId = getSponsorId('veremark');
const harverId = getSponsorId('harver');

console.log('=== SWAP 1: Jon Warwick ↔ James Harley (Veremark ↔ Harver) ===');
const jonVeremarkMtg = findMeeting(veremarkId, jonWarwick.id);
const jamesHarverMtg = findMeeting(harverId, jamesHarley.id);
console.log(`Jon Warwick in Veremark slot ${jonVeremarkMtg?.timeSlot} (${slotLabels[jonVeremarkMtg?.timeSlot]})`);
console.log(`James Harley in Harver slot ${jamesHarverMtg?.timeSlot} (${slotLabels[jamesHarverMtg?.timeSlot]})`);

// Check slot availability for the swap
const jonFreeInHarverSlot = !slotOccupancy.get(jamesHarverMtg.timeSlot)?.has(jonWarwick.id) || jonVeremarkMtg.timeSlot === jamesHarverMtg.timeSlot;
const jamesFreeInVeremarkSlot = !slotOccupancy.get(jonVeremarkMtg.timeSlot)?.has(jamesHarley.id) || jonVeremarkMtg.timeSlot === jamesHarverMtg.timeSlot;

// Delete both meetings
await db.deleteMeeting(jonVeremarkMtg.id);
await db.deleteMeeting(jamesHarverMtg.id);

// Add Jon to Harver
const jonHarverContact = getContact(harverId);
await db.createMeeting({
  sponsorId: harverId,
  attendeeId: jonWarwick.id,
  timeSlot: jamesHarverMtg.timeSlot,
  status: 'confirmed',
  matchScore: 72,
  matchReason: "Jon Warwick's focus on AI-driven talent intelligence, structured interviewing, and candidate quality at Sky aligns well with Harver's science-based assessment platform. His pain points around inconsistent hiring quality and need for structured decision-making tools are directly addressed by Harver's predictive assessments and data-driven approach to talent acquisition.",
  contactEmail: jonHarverContact.contactEmail,
  contactName: jonHarverContact.contactName,
});
console.log(`  ✅ Jon Warwick added to Harver slot ${jamesHarverMtg.timeSlot}`);

// Add James to Veremark
const jamesVeremarkContact = getContact(veremarkId);
await db.createMeeting({
  sponsorId: veremarkId,
  attendeeId: jamesHarley.id,
  timeSlot: jonVeremarkMtg.timeSlot,
  status: 'confirmed',
  matchScore: 55,
  matchReason: "James Harley at Syngenta is building out a global executive hiring function and maturing their TA processes. Veremark's background screening and verification platform is relevant to his interest in improving candidate vetting quality and compliance across international hiring. The fit is moderate — James's primary focus is on executive CRM and sourcing strategy, but screening efficiency is a supporting need.",
  contactEmail: jamesVeremarkContact.contactEmail,
  contactName: jamesVeremarkContact.contactName,
});
console.log(`  ✅ James Harley added to Veremark slot ${jonVeremarkMtg.timeSlot}`);

// ============================================================
// SWAP 2: Jules Anderson (Gilead) — JobSync → Happydance
//         Andrew Boyd (Convatec) — Happydance → JobSync
// ============================================================
const julesAnderson = findAttendee('Jules', 'Anderson');
const andrewBoyd = findAttendee('Andrew', 'Boyd');
const jobsyncId = getSponsorId('jobsync');
const happydanceId = getSponsorId('happydance');

console.log('\n=== SWAP 2: Jules Anderson ↔ Andrew Boyd (JobSync ↔ Happydance) ===');
const julesJobsyncMtg = findMeeting(jobsyncId, julesAnderson.id);
const andrewHappydanceMtg = findMeeting(happydanceId, andrewBoyd.id);
console.log(`Jules Anderson in JobSync slot ${julesJobsyncMtg?.timeSlot} (${slotLabels[julesJobsyncMtg?.timeSlot]})`);
console.log(`Andrew Boyd in Happydance slot ${andrewHappydanceMtg?.timeSlot} (${slotLabels[andrewHappydanceMtg?.timeSlot]})`);

await db.deleteMeeting(julesJobsyncMtg.id);
await db.deleteMeeting(andrewHappydanceMtg.id);

// Add Jules to Happydance
const julesHappydanceContact = getContact(happydanceId);
await db.createMeeting({
  sponsorId: happydanceId,
  attendeeId: julesAnderson.id,
  timeSlot: andrewHappydanceMtg.timeSlot,
  status: 'confirmed',
  matchScore: 85,
  matchReason: "Jules Anderson's active project for a new candidate experience tech system and AI-enabled careers site aligns perfectly with Happydance's high-performance careers website platform. Her focus on employer branding, personalized candidate journeys, and Workday integration maps directly to Happydance's core offering, making this a strong strategic fit for Gilead Science's talent attraction goals.",
  contactEmail: julesHappydanceContact.contactEmail,
  contactName: julesHappydanceContact.contactName,
});
console.log(`  ✅ Jules Anderson added to Happydance slot ${andrewHappydanceMtg.timeSlot}`);

// Add Andrew to JobSync
const andrewJobsyncContact = getContact(jobsyncId);
await db.createMeeting({
  sponsorId: jobsyncId,
  attendeeId: andrewBoyd.id,
  timeSlot: julesJobsyncMtg.timeSlot,
  status: 'confirmed',
  matchScore: 55,
  matchReason: "Andrew Boyd at Convatec is focused on improving recruitment processes and candidate pipeline quality. JobSync's recruitment marketing optimisation and application completion tools offer relevant efficiency gains for a mid-size organisation like Convatec. The fit is moderate — Andrew's specific priorities weren't captured in the intake, but JobSync's broad talent attraction capabilities are a reasonable match.",
  contactEmail: andrewJobsyncContact.contactEmail,
  contactName: andrewJobsyncContact.contactName,
});
console.log(`  ✅ Andrew Boyd added to JobSync slot ${julesJobsyncMtg.timeSlot}`);

// ============================================================
// SWAP 3: Adam Binks (KPMG) — PerchPeek → Poetry
//         Sarah Cooper (Rentokil) — Poetry → PerchPeek
// ============================================================
const adamBinks = findAttendee('Adam', 'Binks');
const sarahCooper = findAttendee('Sarah', 'Cooper');
const perchpeekId = getSponsorId('perchpeek');
const poetryId = getSponsorId('poetry');

console.log('\n=== SWAP 3: Adam Binks ↔ Sarah Cooper (PerchPeek ↔ Poetry) ===');
const adamPerchpeekMtg = findMeeting(perchpeekId, adamBinks.id);
const sarahPoetryMtg = findMeeting(poetryId, sarahCooper.id);
console.log(`Adam Binks in PerchPeek slot ${adamPerchpeekMtg?.timeSlot} (${slotLabels[adamPerchpeekMtg?.timeSlot]})`);
console.log(`Sarah Cooper in Poetry slot ${sarahPoetryMtg?.timeSlot} (${slotLabels[sarahPoetryMtg?.timeSlot]})`);

await db.deleteMeeting(adamPerchpeekMtg.id);
await db.deleteMeeting(sarahPoetryMtg.id);

// Add Adam to Poetry
const adamPoetryContact = getContact(poetryId);
await db.createMeeting({
  sponsorId: poetryId,
  attendeeId: adamBinks.id,
  timeSlot: sarahPoetryMtg.timeSlot,
  status: 'confirmed',
  matchScore: 85,
  matchReason: "Poetry's AI-powered hiring content and recruiter enablement platform directly addresses Adam Binks' pain points around recruiter efficiency and AI use cases in talent acquisition at KPMG. His need for consistent, on-brand hiring content at scale across a complex global organisation maps precisely to Poetry's core value proposition, and KPMG's multi-ATS environment is exactly the kind of integration challenge Poetry is built to solve.",
  contactEmail: adamPoetryContact.contactEmail,
  contactName: adamPoetryContact.contactName,
});
console.log(`  ✅ Adam Binks added to Poetry slot ${sarahPoetryMtg.timeSlot}`);

// Add Sarah to PerchPeek (updated score/reason reflecting global mobility relevance)
const sarahPerchpeekContact = getContact(perchpeekId);
await db.createMeeting({
  sponsorId: perchpeekId,
  attendeeId: sarahCooper.id,
  timeSlot: adamPerchpeekMtg.timeSlot,
  status: 'confirmed',
  matchScore: 58,
  matchReason: "Sarah Cooper leads TA operations globally at Rentokil Initial, overseeing talent acquisition processes across multiple international markets. While her primary active project is ATS selection, her operational remit includes managing global mobility and cross-border hiring workflows — areas where PerchPeek's relocation and mobility platform can add genuine value. The fit is moderate: Sarah is well-positioned to evaluate global mobility tools as part of Rentokil's broader TA technology stack review.",
  contactEmail: sarahPerchpeekContact.contactEmail,
  contactName: sarahPerchpeekContact.contactName,
});
console.log(`  ✅ Sarah Cooper added to PerchPeek slot ${adamPerchpeekMtg.timeSlot}`);

// ============================================================
// VERIFY FINAL STATE
// ============================================================
const updatedMeetings = await db.getAllMeetings();
const affected = [veremarkId, harverId, jobsyncId, happydanceId, perchpeekId, poetryId];

console.log('\n=== VERIFICATION ===');
for (const sponsorId of affected) {
  const mtgs = updatedMeetings.filter(m => m.sponsorId === sponsorId);
  console.log(`${sponsorNames.get(sponsorId)}: ${mtgs.length} meetings`);
}

// Check no one exceeds 8 meetings
const meetingCount = new Map();
for (const m of updatedMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);
const over8 = [...meetingCount.entries()].filter(([,c]) => c > 8);
if (over8.length > 0) {
  console.log('\n⚠️  DELEGATES OVER 8 MEETINGS:');
  for (const [id, count] of over8) {
    const d = attendees.find(a => a.id === id);
    console.log(`  ${d?.firstName} ${d?.lastName}: ${count} meetings`);
  }
} else {
  console.log('\n✅ No delegates exceed 8 meetings');
}

process.exit(0);
