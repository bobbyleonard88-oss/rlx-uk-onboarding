import * as db from './db.ts';
import { attendees } from './attendees.ts';

const HACKAJOB_ID = 540001;
const JAMES_ID = '12731251';

const allMeetings = await db.getAllMeetings();

// Find Nikhilesh Mathur
const nikhilesh = attendees.find(a => a.firstName === 'Nikhilesh' && a.lastName === 'Mathur');
if (!nikhilesh) throw new Error('Nikhilesh not found');
console.log(`Nikhilesh: ${nikhilesh.id} (${nikhilesh.company})`);

// Find Lucy Bousfield
const lucy = attendees.find(a => a.firstName === 'Lucy' && a.lastName === 'Bousfield');
if (!lucy) throw new Error('Lucy not found');
console.log(`Lucy: ${lucy.id} (${lucy.company})`);

// Find Nikhilesh's hackajob meeting (slot 4)
const nikhileshMeeting = allMeetings.find(m => m.sponsorId === HACKAJOB_ID && m.attendeeId === nikhilesh.id);
if (!nikhileshMeeting) throw new Error('Nikhilesh hackajob meeting not found');
console.log(`Nikhilesh meeting id: ${nikhileshMeeting.id}, slot: ${nikhileshMeeting.timeSlot}`);
if (nikhileshMeeting.timeSlot !== 4) throw new Error(`Expected slot 4, got ${nikhileshMeeting.timeSlot}`);

// Verify slot 7 is free for hackajob (James's old slot)
const slot7Hackajob = allMeetings.filter(m => m.sponsorId === HACKAJOB_ID && m.timeSlot === 7 && m.attendeeId !== JAMES_ID);
if (slot7Hackajob.length > 0) throw new Error(`Slot 7 not free for hackajob: ${slot7Hackajob.map(m => m.attendeeId)}`);
console.log('Slot 7 is free for hackajob ✓');

// Verify Lucy is free in slot 4
const lucySlot4 = allMeetings.find(m => m.attendeeId === lucy.id && m.timeSlot === 4);
if (lucySlot4) throw new Error(`Lucy is busy in slot 4 with sponsor ${lucySlot4.sponsorId}`);
console.log('Lucy is free in slot 4 ✓');

// Verify Lucy has < 8 meetings
const lucyMeetings = allMeetings.filter(m => m.attendeeId === lucy.id && m.attendeeId !== JAMES_ID);
console.log(`Lucy currently has ${lucyMeetings.length} meetings`);
if (lucyMeetings.length >= 8) throw new Error('Lucy already at 8 meetings');

// Step 1: Move Nikhilesh from slot 4 → slot 7
console.log('\nStep 1: Moving Nikhilesh from slot 4 → slot 7...');
await db.updateMeeting(nikhileshMeeting.id, { timeSlot: 7 });
console.log('Done ✓');

// Step 2: Add Lucy Bousfield to hackajob slot 4
// Need to find the match score for Lucy with hackajob from the rankings
const allRankings = await db.getAllRankingsSubmissions();
const hackajobRanking = allRankings.find(r => r.sponsorId === HACKAJOB_ID && !r.isArchived);
const rankedList = hackajobRanking?.rankingsData ? JSON.parse(hackajobRanking.rankingsData) : [];
const lucyRankPos = rankedList.indexOf(lucy.id);
console.log(`Lucy's rank position in hackajob rankings: #${lucyRankPos + 1}`);

// Use a score based on rank position (rank #8 → ~80%)
const matchScore = 80;

console.log('\nStep 2: Adding Lucy Bousfield to hackajob slot 4...');
const newMeeting = await db.createMeeting({
  sponsorId: HACKAJOB_ID,
  attendeeId: lucy.id,
  timeSlot: 4,
  matchScore,
  status: 'confirmed',
  contactName: null,
  contactEmail: null,
});
console.log(`Created meeting id: ${newMeeting?.id ?? 'unknown'} ✓`);

// Verify final state
const finalHackajobMeetings = await db.getMeetingsBySponsor(HACKAJOB_ID);
console.log('\nFinal hackajob schedule:');
finalHackajobMeetings.sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0)).forEach(m => {
  const d = attendees.find(a => a.id === m.attendeeId);
  const name = d ? `${d.firstName} ${d.lastName}` : m.attendeeId;
  const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${name} — score: ${m.matchScore}%`);
});

process.exit(0);
