import * as db from './db.ts';
import { attendees } from './attendees.ts';

const MARTEC_ID = 780001;
const AMBERJACK_ID = 690001;

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

function getRank(sponsorId, delegateId) {
  const ranking = allRankings.find(r => r.sponsorId === sponsorId);
  const list = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];
  const pos = list.indexOf(delegateId);
  return pos >= 0 ? pos + 1 : null;
}

// Find delegates
const markBrooker = attendees.find(a => a.firstName === 'Mark' && a.lastName === 'Brooker');
const carlyGeorge = attendees.find(a => a.firstName === 'Carly' && a.lastName === 'George');
if (!markBrooker) throw new Error('Mark Brooker not found');
if (!carlyGeorge) throw new Error('Carly George not found');

console.log(`Mark Brooker: ${markBrooker.id} (${markBrooker.company})`);
console.log(`Carly George: ${carlyGeorge.id} (${carlyGeorge.company})`);

// Find Mark Brooker's Martec meeting (slot 4)
const markMartecMeeting = allMeetings.find(m => m.sponsorId === MARTEC_ID && m.attendeeId === markBrooker.id);
if (!markMartecMeeting) throw new Error('Mark Brooker has no Martec meeting');
console.log(`Mark Brooker's Martec meeting: id=${markMartecMeeting.id}, slot=${markMartecMeeting.timeSlot}`);

// Verify Carly George is free in slot 4
const carlySlot4 = allMeetings.find(m => m.attendeeId === carlyGeorge.id && m.timeSlot === markMartecMeeting.timeSlot);
if (carlySlot4) throw new Error(`Carly George is busy in slot ${markMartecMeeting.timeSlot} with sponsor ${carlySlot4.sponsorId}`);

// Verify Carly has < 8 meetings
const carlyCount = allMeetings.filter(m => m.attendeeId === carlyGeorge.id).length;
console.log(`Carly George has ${carlyCount} meetings`);
if (carlyCount >= 8) throw new Error('Carly George at max meetings');

// Verify Mark Brooker is free in slot 12 for Amberjack
const markSlot12 = allMeetings.find(m => m.attendeeId === markBrooker.id && m.timeSlot === 12);
if (markSlot12) throw new Error(`Mark Brooker is busy in slot 12 with sponsor ${markSlot12.sponsorId}`);

// Verify Amberjack doesn't already have Mark Brooker
const markAmberjack = allMeetings.find(m => m.sponsorId === AMBERJACK_ID && m.attendeeId === markBrooker.id);
if (markAmberjack) throw new Error('Mark Brooker already in Amberjack');

// Step 1: Delete Mark Brooker from The Martec
console.log('\nStep 1: Removing Mark Brooker from The Martec slot 4...');
await db.deleteMeeting(markMartecMeeting.id);
console.log('✅ Done');

// Step 2: Add Carly George (AXA) to The Martec slot 4
const carlyMartecRank = getRank(MARTEC_ID, carlyGeorge.id);
console.log(`\nStep 2: Adding Carly George (AXA, rank #${carlyMartecRank ?? 'unranked'}) to The Martec slot ${markMartecMeeting.timeSlot}...`);
await db.createMeeting({
  sponsorId: MARTEC_ID,
  attendeeId: carlyGeorge.id,
  timeSlot: markMartecMeeting.timeSlot,
  matchScore: 80,
  status: 'confirmed',
  contactName: null,
  contactEmail: null,
});
console.log('✅ Done');

// Step 3: Add Mark Brooker (BT Group) to Amberjack slot 12
const markAmberjackRank = getRank(AMBERJACK_ID, markBrooker.id);
console.log(`\nStep 3: Adding Mark Brooker (BT Group, rank #${markAmberjackRank ?? 'unranked'}) to Amberjack slot 12...`);
await db.createMeeting({
  sponsorId: AMBERJACK_ID,
  attendeeId: markBrooker.id,
  timeSlot: 12,
  matchScore: 90,
  status: 'confirmed',
  contactName: null,
  contactEmail: null,
});
console.log('✅ Done');

// Verify final meeting counts
const finalMeetings = await db.getAllMeetings();
const markFinalCount = finalMeetings.filter(m => m.attendeeId === markBrooker.id).length;
const carlyFinalCount = finalMeetings.filter(m => m.attendeeId === carlyGeorge.id).length;
console.log(`\nFinal counts: Mark Brooker = ${markFinalCount} meetings, Carly George = ${carlyFinalCount} meetings`);

console.log('\n✅ All done!');
console.log('  The Martec slot 4: Carly George (AXA)');
console.log('  Amberjack slot 12: Mark Brooker (BT Group)');

process.exit(0);
