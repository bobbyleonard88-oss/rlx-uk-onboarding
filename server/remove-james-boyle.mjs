import * as db from './db.ts';
import { attendees } from './attendees.ts';

const JAMES_ID = '12731251';

const james = attendees.find(a => a.id === JAMES_ID);
console.log(`James Boyle: ${james ? james.firstName + ' ' + james.lastName + ' (' + james.company + ')' : 'NOT FOUND in attendees list'}`);

const allMeetings = await db.getAllMeetings();
const jamesMeetings = allMeetings.filter(m => m.attendeeId === JAMES_ID);

console.log(`\nFound ${jamesMeetings.length} meetings to delete:`);
jamesMeetings.forEach(m => {
  const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};
  console.log(`  Meeting id=${m.id} | sponsor=${m.sponsorId} | slot=${m.timeSlot} (${slotLabels[m.timeSlot]}) | status=${m.status}`);
});

if (jamesMeetings.length === 0) {
  console.log('No meetings to delete.');
  process.exit(0);
}

console.log('\nDeleting...');
for (const m of jamesMeetings) {
  await db.deleteMeeting(m.id);
  console.log(`  ✅ Deleted meeting id=${m.id}`);
}

// Verify
const remaining = (await db.getAllMeetings()).filter(m => m.attendeeId === JAMES_ID);
console.log(`\nRemaining James Boyle meetings: ${remaining.length}`);
if (remaining.length === 0) {
  console.log('✅ All James Boyle meetings deleted successfully.');
}

process.exit(0);
