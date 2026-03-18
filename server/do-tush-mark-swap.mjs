import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();

function findAttendee(firstName, lastName) {
  return attendees.find(a =>
    a.firstName?.toLowerCase() === firstName.toLowerCase() &&
    a.lastName?.toLowerCase() === lastName.toLowerCase()
  );
}

function getSponsorId(name) {
  for (const i of allIntakes) {
    const n = i.companyName?.toLowerCase() || '';
    if (n.includes(name.toLowerCase()) || name.toLowerCase().includes(n)) return i.sponsorId;
  }
  return null;
}

function getContact(sponsorId) {
  const intake = allIntakes.find(i => i.sponsorId === sponsorId);
  return { contactEmail: intake?.email || '', contactName: `${intake?.firstName || ''} ${intake?.lastName || ''}`.trim() };
}

const tushWijeratne = findAttendee('Tush', 'Wijeratne');
const markCoad = findAttendee('Mark', 'Coad');
const jobsyncId = getSponsorId('jobsync');
const wilsonId = getSponsorId('wilson');

const tushJobsyncMtg = allMeetings.find(m => m.sponsorId === jobsyncId && m.attendeeId === tushWijeratne.id);
const markWilsonMtg = allMeetings.find(m => m.sponsorId === wilsonId && m.attendeeId === markCoad.id);

if (!tushJobsyncMtg) throw new Error('Tush Wijeratne not found in JobSync');
if (!markWilsonMtg) throw new Error('Mark Coad not found in Wilson');

console.log(`Tush Wijeratne in JobSync slot ${tushJobsyncMtg.timeSlot}`);
console.log(`Mark Coad in Wilson slot ${markWilsonMtg.timeSlot}`);

// Delete both
await db.deleteMeeting(tushJobsyncMtg.id);
await db.deleteMeeting(markWilsonMtg.id);

// Add Tush to Wilson
const wilsonContact = getContact(wilsonId);
await db.createMeeting({
  sponsorId: wilsonId,
  attendeeId: tushWijeratne.id,
  timeSlot: markWilsonMtg.timeSlot,
  status: 'confirmed',
  matchScore: 80,
  matchReason: "Wilson's RPO and flexible talent delivery models directly address Tush's pain points around offshoring and TA restructuring, offering scalable recruitment without adding headcount. Their tech-agnostic approach and expertise in navigating complex global talent delivery align well with WPP's transformation objectives and AI usage identification needs, making this a strong strategic conversation.",
  contactEmail: wilsonContact.contactEmail,
  contactName: wilsonContact.contactName,
});
console.log(`  ✅ Tush Wijeratne added to Wilson slot ${markWilsonMtg.timeSlot}`);

// Add Mark to JobSync
const jobsyncContact = getContact(jobsyncId);
await db.createMeeting({
  sponsorId: jobsyncId,
  attendeeId: markCoad.id,
  timeSlot: tushJobsyncMtg.timeSlot,
  status: 'confirmed',
  matchScore: 70,
  matchReason: "JobSync's focus on optimising recruitment marketing, application completion, and candidate experience aligns with Mark Coad's need to deliver consistent service while achieving financial savings and AI embedment at GSK. Its ability to sit on top of existing tech like Workday and improve volume quality applications supports GSK's large-scale hiring transformation goals.",
  contactEmail: jobsyncContact.contactEmail,
  contactName: jobsyncContact.contactName,
});
console.log(`  ✅ Mark Coad added to JobSync slot ${tushJobsyncMtg.timeSlot}`);

// Verify
const updated = await db.getAllMeetings();
const meetingCount = new Map();
for (const m of updated) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);
const over8 = [...meetingCount.entries()].filter(([,c]) => c > 8);
console.log(over8.length === 0 ? '\n✅ No delegates exceed 8 meetings' : `\n⚠️ ${over8.length} delegates over 8`);

process.exit(0);
