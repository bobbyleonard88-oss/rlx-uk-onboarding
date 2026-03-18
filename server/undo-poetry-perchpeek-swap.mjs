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

const adamBinks = findAttendee('Adam', 'Binks');
const sarahCooper = findAttendee('Sarah', 'Cooper');
const perchpeekId = getSponsorId('perchpeek');
const poetryId = getSponsorId('poetry');

// Find current meetings (post-swap state)
const adamPoetryMtg = allMeetings.find(m => m.sponsorId === poetryId && m.attendeeId === adamBinks.id);
const sarahPerchpeekMtg = allMeetings.find(m => m.sponsorId === perchpeekId && m.attendeeId === sarahCooper.id);

if (!adamPoetryMtg) throw new Error('Adam Binks not found in Poetry meetings');
if (!sarahPerchpeekMtg) throw new Error('Sarah Cooper not found in PerchPeek meetings');

console.log(`Adam Binks in Poetry slot ${adamPoetryMtg.timeSlot}`);
console.log(`Sarah Cooper in PerchPeek slot ${sarahPerchpeekMtg.timeSlot}`);

// Delete both
await db.deleteMeeting(adamPoetryMtg.id);
await db.deleteMeeting(sarahPerchpeekMtg.id);

// Restore Adam to PerchPeek (original slot, original score 80%)
const perchpeekContact = getContact(perchpeekId);
await db.createMeeting({
  sponsorId: perchpeekId,
  attendeeId: adamBinks.id,
  timeSlot: sarahPerchpeekMtg.timeSlot,
  status: 'confirmed',
  matchScore: 80,
  matchReason: "Adam Binks at KPMG is focused on global talent acquisition transformation, recruiter efficiency, and AI use cases in TA. PerchPeek's global mobility and relocation platform is relevant to KPMG's international hiring and employee mobility needs at scale, particularly given the firm's global footprint and complex cross-border talent flows.",
  contactEmail: perchpeekContact.contactEmail,
  contactName: perchpeekContact.contactName,
});
console.log(`  ✅ Adam Binks restored to PerchPeek slot ${sarahPerchpeekMtg.timeSlot}`);

// Restore Sarah to Poetry (original slot, original score)
const poetryContact = getContact(poetryId);
await db.createMeeting({
  sponsorId: poetryId,
  attendeeId: sarahCooper.id,
  timeSlot: adamPoetryMtg.timeSlot,
  status: 'confirmed',
  matchScore: 72,
  matchReason: "Sarah Cooper leads global TA operations at Rentokil Initial across multiple international markets. Poetry's AI-powered hiring content and recruiter enablement platform addresses her need for consistent, on-brand recruitment communications at scale across a large, distributed organisation. The fit is solid — Poetry can help standardise recruiter output and reduce time-to-hire across Rentokil's global TA function.",
  contactEmail: poetryContact.contactEmail,
  contactName: poetryContact.contactName,
});
console.log(`  ✅ Sarah Cooper restored to Poetry slot ${adamPoetryMtg.timeSlot}`);

// Verify
const updated = await db.getAllMeetings();
const perchFinal = updated.filter(m => m.sponsorId === perchpeekId);
const poetryFinal = updated.filter(m => m.sponsorId === poetryId);
console.log(`\nPerchPeek: ${perchFinal.length} meetings`);
console.log(`Poetry: ${poetryFinal.length} meetings`);

const meetingCount = new Map();
for (const m of updated) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);
const over8 = [...meetingCount.entries()].filter(([,c]) => c > 8);
console.log(over8.length === 0 ? '✅ No delegates exceed 8 meetings' : `⚠️ ${over8.length} delegates over 8`);

process.exit(0);
