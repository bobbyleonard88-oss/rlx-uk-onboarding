import { attendees } from './attendees.ts';
import * as db from './db.ts';

const phidelma = attendees.find(a => 
  a.firstName.toLowerCase().includes('phil') || 
  a.lastName.toLowerCase().includes('mak') ||
  a.company?.toLowerCase().includes('ey') ||
  a.company?.toLowerCase().includes('ernst')
);
console.log('Found:', phidelma ? `${phidelma.firstName} ${phidelma.lastName} (${phidelma.company}) id:${phidelma.id}` : 'NOT FOUND');

const allMeetings = await db.getAllMeetings();
if (phidelma) {
  const meetings = allMeetings.filter(m => m.attendeeId === phidelma.id);
  console.log('Meetings:', meetings.length, meetings.map(m => ({sponsorId: m.sponsorId, slot: m.timeSlot, status: m.status})));
}

// Also show all attendees at EY
const eyAttendees = attendees.filter(a => a.company?.toLowerCase().includes('ey') || a.company?.toLowerCase().includes('ernst'));
console.log('EY attendees:', eyAttendees.map(a => `${a.firstName} ${a.lastName} (${a.company}) id:${a.id}`));

process.exit(0);
