import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();

// Find hackajob
const hack = allIntakes.find(i => JSON.stringify(i).toLowerCase().includes('hackajob'));
console.log('hackajob sponsorId:', hack?.sponsorId, '| company:', hack?.companyName);

// Find Jules Anderson
const jules = attendees.find(a => a.firstName?.toLowerCase().includes('jules') || a.lastName?.toLowerCase().includes('anderson'));
console.log('Jules:', jules?.firstName, jules?.lastName, '|', jules?.company, '| id:', jules?.id);

// Find Gilead delegates
const gilead = attendees.filter(a => a.company?.toLowerCase().includes('gilead'));
console.log('Gilead delegates:', gilead.map(a => `${a.firstName} ${a.lastName} (${a.company}) id=${a.id}`));

// Show hackajob meetings
if (hack?.sponsorId) {
  const hackMeetings = allMeetings.filter(m => m.sponsorId === hack.sponsorId);
  console.log(`\nhackajob meetings (${hackMeetings.length}):`);
  for (const m of hackMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
    const d = attendees.find(a => a.id === m.attendeeId);
    console.log(`  Slot ${m.timeSlot}: ${d?.firstName} ${d?.lastName} (${d?.company})`);
  }
}

process.exit(0);
