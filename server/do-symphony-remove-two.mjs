import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;

const allMeetings = await db.getAllMeetings();
const symphonyMeetings = allMeetings.filter(m => m.sponsorId === SYMPHONY_ID);

const bms = attendees.find(a => a.company?.includes('BMS'));
const rentokil = attendees.find(a => a.company?.toLowerCase().includes('rentokil'));

console.log(`BMS: ${bms?.firstName} ${bms?.lastName} (${bms?.company}) id=${bms?.id}`);
console.log(`Rentokil: ${rentokil?.firstName} ${rentokil?.lastName} (${rentokil?.company}) id=${rentokil?.id}`);

const bmsMeeting = symphonyMeetings.find(m => m.attendeeId === bms?.id);
const rentokillMeeting = symphonyMeetings.find(m => m.attendeeId === rentokil?.id);

if (!bmsMeeting) throw new Error('BMS meeting not found in Symphony');
if (!rentokillMeeting) throw new Error('Rentokil meeting not found in Symphony');

console.log(`\nRemoving Anna Katyal (BMS) from slot ${bmsMeeting.timeSlot} (meeting id: ${bmsMeeting.id})`);
await db.deleteMeeting(bmsMeeting.id);
console.log('  ✅ Done');

console.log(`Removing Sarah Cooper (Rentokil) from slot ${rentokillMeeting.timeSlot} (meeting id: ${rentokillMeeting.id})`);
await db.deleteMeeting(rentokillMeeting.id);
console.log('  ✅ Done');

// Verify final schedule
const updatedMeetings = (await db.getAllMeetings()).filter(m => m.sponsorId === SYMPHONY_ID);
const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

const allRankings = await db.getAllRankingsSubmissions();
const ranking = allRankings.find(r => r.sponsorId === SYMPHONY_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

console.log('\n=== Final Symphony Talent Schedule ===');
for (const m of updatedMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const d = attendees.find(a => a.id === m.attendeeId);
  const rank = rankedList.indexOf(d?.id);
  const rankStr = rank >= 0 ? `#${rank+1}` : 'unranked';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${d?.firstName} ${d?.lastName} (${d?.company}) rank ${rankStr}`);
}
console.log(`\nTotal meetings: ${updatedMeetings.length}`);

process.exit(0);
