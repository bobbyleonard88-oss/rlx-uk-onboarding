import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

const symphonyMeetings = allMeetings.filter(m => m.sponsorId === SYMPHONY_ID);
const ranking = allRankings.find(r => r.sponsorId === SYMPHONY_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

const kitterhing = attendees.find(a => a.company?.includes('Swiss Re'));
const lego = attendees.find(a => a.company?.toLowerCase().includes('lego'));
const natalie = attendees.find(a => a.lastName === 'McGuinness' && a.company?.includes('Busy Bees'));
const jamesHarley = attendees.find(a => a.firstName === 'James' && a.lastName === 'Harley');

console.log(`Kitterhing: ${kitterhing?.firstName} ${kitterhing?.lastName} id=${kitterhing?.id}`);
console.log(`O'Regan (LEGO): ${lego?.firstName} ${lego?.lastName} id=${lego?.id}`);
console.log(`Natalie McGuinness: ${natalie?.firstName} ${natalie?.lastName} id=${natalie?.id}`);
console.log(`James Harley: ${jamesHarley?.firstName} ${jamesHarley?.lastName} id=${jamesHarley?.id}`);

// Step 1: Move Natalie McGuinness from slot 10 → slot 5
const natalieMeeting = symphonyMeetings.find(m => m.attendeeId === natalie?.id);
if (!natalieMeeting) throw new Error('Natalie McGuinness not found in Symphony meetings');
if (natalieMeeting.timeSlot !== 10) throw new Error(`Expected Natalie in slot 10, found slot ${natalieMeeting.timeSlot}`);

console.log(`\nStep 1: Moving Natalie McGuinness from slot 10 → slot 5 (id: ${natalieMeeting.id})`);
await db.updateMeeting(natalieMeeting.id, { timeSlot: 5 });
console.log('  ✅ Done');

// Step 2: Move James Harley from slot 6 → slot 9
const harleyMeeting = symphonyMeetings.find(m => m.attendeeId === jamesHarley?.id);
if (!harleyMeeting) throw new Error('James Harley not found in Symphony meetings');
if (harleyMeeting.timeSlot !== 6) throw new Error(`Expected James Harley in slot 6, found slot ${harleyMeeting.timeSlot}`);

console.log(`\nStep 2: Moving James Harley from slot 6 → slot 9 (id: ${harleyMeeting.id})`);
await db.updateMeeting(harleyMeeting.id, { timeSlot: 9 });
console.log('  ✅ Done');

// Step 3: Add Kitterhing into slot 10
const kitRank = rankedList.indexOf(kitterhing.id);
const kitScore = kitRank >= 0 ? Math.max(30, 100 - kitRank) : 50;

console.log(`\nStep 3: Adding Kitterhing (Swiss Re, rank #${kitRank+1}) into slot 10`);
const kitMeeting = await db.createMeeting({
  sponsorId: SYMPHONY_ID,
  attendeeId: kitterhing.id,
  timeSlot: 10,
  status: 'confirmed',
  matchScore: kitScore,
  contactEmail: 'craig.barnett@symphonytalent.com',
  contactName: 'Craig Barnett',
});
console.log(`  ✅ Created meeting id: ${kitMeeting?.id || 'done'}`);

// Step 4: Add O'Regan (LEGO) into slot 6
const legoRank = rankedList.indexOf(lego.id);
const legoScore = legoRank >= 0 ? Math.max(30, 100 - legoRank) : 50;

console.log(`\nStep 4: Adding O'Regan (LEGO, rank #${legoRank+1}) into slot 6`);
const legoMeeting = await db.createMeeting({
  sponsorId: SYMPHONY_ID,
  attendeeId: lego.id,
  timeSlot: 6,
  status: 'confirmed',
  matchScore: legoScore,
  contactEmail: 'craig.barnett@symphonytalent.com',
  contactName: 'Craig Barnett',
});
console.log(`  ✅ Created meeting id: ${legoMeeting?.id || 'done'}`);

// Verify final schedule
const updatedMeetings = (await db.getAllMeetings()).filter(m => m.sponsorId === SYMPHONY_ID);
const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

console.log('\n=== Final Symphony Talent Schedule ===');
for (const m of updatedMeetings.sort((a,b) => a.timeSlot - b.timeSlot)) {
  const d = attendees.find(a => a.id === m.attendeeId);
  const rank = rankedList.indexOf(d?.id);
  const rankStr = rank >= 0 ? `#${rank+1}` : 'unranked';
  const isNew = [kitterhing.id, lego.id].includes(d?.id) ? ' ← NEW' : '';
  const isMoved = [natalie?.id, jamesHarley?.id].includes(d?.id) ? ' ← MOVED' : '';
  console.log(`  Slot ${m.timeSlot} (${slotLabels[m.timeSlot]}): ${d?.firstName} ${d?.lastName} (${d?.company}) rank ${rankStr}${isNew}${isMoved}`);
}

console.log(`\nTotal meetings: ${updatedMeetings.length}`);

process.exit(0);
