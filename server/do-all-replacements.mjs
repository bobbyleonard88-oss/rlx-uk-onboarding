import * as db from './db.ts';
import { attendees } from './attendees.ts';

const JAMES_ID = '12731251';

const slotLabels = {
  1: 'Day 1 11:00', 2: 'Day 1 11:30', 3: 'Day 1 13:15',
  4: 'Day 1 13:45', 5: 'Day 1 14:30', 6: 'Day 1 15:00',
  7: 'Day 2 10:30', 8: 'Day 2 11:00', 9: 'Day 2 13:15',
  10: 'Day 2 13:45', 11: 'Day 2 14:30', 12: 'Day 2 15:00',
};

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

function getDelegate(firstName, lastName) {
  const d = attendees.find(a => a.firstName === firstName && a.lastName === lastName);
  if (!d) throw new Error(`Delegate not found: ${firstName} ${lastName}`);
  return d;
}

function getRank(sponsorId, delegateId) {
  const ranking = allRankings.find(r => r.sponsorId === sponsorId && !r.isArchived);
  const list = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];
  const pos = list.indexOf(delegateId);
  return pos >= 0 ? pos + 1 : null;
}

function getMeeting(sponsorId, delegateId) {
  return allMeetings.find(m => m.sponsorId === sponsorId && m.attendeeId === delegateId);
}

function countMeetings(delegateId) {
  return allMeetings.filter(m => m.attendeeId === delegateId && m.attendeeId !== JAMES_ID).length;
}

function isBusyInSlot(delegateId, slot) {
  return allMeetings.some(m => m.attendeeId === delegateId && m.timeSlot === slot);
}

async function addMeeting(sponsorId, delegate, slot, score) {
  const rank = getRank(sponsorId, delegate.id);
  console.log(`  Adding ${delegate.firstName} ${delegate.lastName} (rank #${rank ?? 'unranked'}) to slot ${slot} (${slotLabels[slot]})...`);
  await db.createMeeting({
    sponsorId,
    attendeeId: delegate.id,
    timeSlot: slot,
    matchScore: score,
    status: 'confirmed',
    contactName: null,
    contactEmail: null,
  });
  console.log(`  ✅ Done`);
}

async function moveMeeting(meetingId, newSlot, delegateName) {
  console.log(`  Moving ${delegateName} to slot ${newSlot} (${slotLabels[newSlot]})...`);
  await db.updateMeeting(meetingId, { timeSlot: newSlot });
  console.log(`  ✅ Done`);
}

// ─── 1. THE MARTEC — Reshuffle ───────────────────────────────────────────────
// Move Jessica Shaunie Green (slot 4 → slot 1), add Mark Brooker (BT Group) to slot 4
console.log('\n═══ 1. The Martec (780001) ═══');
const MARTEC_ID = 780001;
const jessica = getDelegate('Jessica', 'Shaunie Green') ?? attendees.find(a => a.firstName === 'Jessica' && a.lastName?.includes('Shaunie'));
const jessicaActual = attendees.find(a => a.firstName === 'Jessica' && (a.lastName === 'Shaunie Green' || a.lastName === 'Green'));
if (!jessicaActual) {
  // Try partial match
  const j = attendees.find(a => a.firstName === 'Jessica' && a.company?.toLowerCase().includes('calor'));
  if (!j) throw new Error('Jessica Shaunie Green not found');
  console.log(`  Found Jessica: ${j.firstName} ${j.lastName} (${j.company})`);
  const jMeeting = getMeeting(MARTEC_ID, j.id);
  if (!jMeeting) throw new Error('Jessica has no Martec meeting');
  if (jMeeting.timeSlot !== 4) throw new Error(`Expected Jessica in slot 4, got ${jMeeting.timeSlot}`);
  await moveMeeting(jMeeting.id, 1, `${j.firstName} ${j.lastName}`);
  
  const markBrooker = getDelegate('Mark', 'Brooker');
  if (isBusyInSlot(markBrooker.id, 4)) throw new Error('Mark Brooker busy in slot 4');
  await addMeeting(MARTEC_ID, markBrooker, 4, 90);
} else {
  console.log(`  Found Jessica: ${jessicaActual.firstName} ${jessicaActual.lastName} (${jessicaActual.company})`);
  const jMeeting = getMeeting(MARTEC_ID, jessicaActual.id);
  if (!jMeeting) throw new Error('Jessica has no Martec meeting');
  if (jMeeting.timeSlot !== 4) throw new Error(`Expected Jessica in slot 4, got ${jMeeting.timeSlot}`);
  await moveMeeting(jMeeting.id, 1, `${jessicaActual.firstName} ${jessicaActual.lastName}`);
  
  const markBrooker = getDelegate('Mark', 'Brooker');
  if (isBusyInSlot(markBrooker.id, 4)) throw new Error('Mark Brooker busy in slot 4');
  await addMeeting(MARTEC_ID, markBrooker, 4, 90);
}

// ─── 2. HARVER — Direct: Mark Coad (GSK) to slot 2 ──────────────────────────
console.log('\n═══ 2. Harver (210001) ═══');
const HARVER_ID = 210001;
const markCoad = getDelegate('Mark', 'Coad');
if (isBusyInSlot(markCoad.id, 2)) throw new Error('Mark Coad busy in slot 2');
if (countMeetings(markCoad.id) >= 8) throw new Error('Mark Coad at max meetings');
await addMeeting(HARVER_ID, markCoad, 2, 88);

// ─── 3. SYMPHONY TALENT — Direct: James Harley (Syngenta) to slot 6 ─────────
console.log('\n═══ 3. Symphony Talent (330001) ═══');
const SYMPHONY_ID = 330001;
const jamesHarley = getDelegate('James', 'Harley');
if (isBusyInSlot(jamesHarley.id, 6)) throw new Error('James Harley busy in slot 6');
if (countMeetings(jamesHarley.id) >= 8) throw new Error('James Harley at max meetings');
await addMeeting(SYMPHONY_ID, jamesHarley, 6, 78);

// ─── 4. APPCAST — Direct: Lucy Bousfield (Aon) to slot 11 ───────────────────
console.log('\n═══ 4. Appcast (270002) ═══');
const APPCAST_ID = 270002;
const lucyBousfield = getDelegate('Lucy', 'Bousfield');
if (isBusyInSlot(lucyBousfield.id, 11)) throw new Error('Lucy Bousfield busy in slot 11');
if (countMeetings(lucyBousfield.id) >= 8) throw new Error('Lucy Bousfield at max meetings');
await addMeeting(APPCAST_ID, lucyBousfield, 11, 80);

// ─── 5. HAPPYDANCE — Reshuffle: Move Yuliia Zembal (slot 1 → slot 10), add Ciaran O'Regan (LEGO) to slot 1 ───
console.log('\n═══ 5. Happydance (600001) ═══');
const HAPPYDANCE_ID = 600001;
const yuliia = getDelegate('Yuliia', 'Zembal');
const yuliiaMeeting = getMeeting(HAPPYDANCE_ID, yuliia.id);
if (!yuliiaMeeting) throw new Error('Yuliia has no Happydance meeting');
if (yuliiaMeeting.timeSlot !== 1) throw new Error(`Expected Yuliia in slot 1, got ${yuliiaMeeting.timeSlot}`);
if (isBusyInSlot(yuliia.id, 10)) throw new Error('Yuliia busy in slot 10');
await moveMeeting(yuliiaMeeting.id, 10, 'Yuliia Zembal');

const ciaranORegan = attendees.find(a => a.firstName === 'Ciaran' && a.lastName?.includes('Regan'));
if (!ciaranORegan) throw new Error('Ciaran O\'Regan not found');
console.log(`  Found Ciaran: ${ciaranORegan.firstName} ${ciaranORegan.lastName} (${ciaranORegan.company})`);
if (isBusyInSlot(ciaranORegan.id, 1)) throw new Error('Ciaran busy in slot 1');
if (countMeetings(ciaranORegan.id) >= 8) throw new Error('Ciaran at max meetings');
await addMeeting(HAPPYDANCE_ID, ciaranORegan, 1, 86);

// ─── 6. AMBERJACK — Direct: Mark Brooker (BT Group) to slot 12 ──────────────
console.log('\n═══ 6. Amberjack (690001) ═══');
const AMBERJACK_ID = 690001;
const markBrookerAmberjack = getDelegate('Mark', 'Brooker');
// Refresh meeting count after adding to Martec above
const refreshedMeetings = await db.getAllMeetings();
const markBrookerCount = refreshedMeetings.filter(m => m.attendeeId === markBrookerAmberjack.id).length;
if (markBrookerCount >= 8) throw new Error(`Mark Brooker now at ${markBrookerCount} meetings — at max`);
const markBrookerSlot12 = refreshedMeetings.find(m => m.attendeeId === markBrookerAmberjack.id && m.timeSlot === 12);
if (markBrookerSlot12) throw new Error(`Mark Brooker busy in slot 12 with sponsor ${markBrookerSlot12.sponsorId}`);
await addMeeting(AMBERJACK_ID, markBrookerAmberjack, 12, 90);

console.log('\n\n✅ All 6 changes complete!\n');

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('Summary:');
console.log('  The Martec: Jessica Shaunie Green moved slot 4→1, Mark Brooker (BT Group) added to slot 4');
console.log('  Harver: Mark Coad (GSK) added to slot 2');
console.log('  Symphony Talent: James Harley (Syngenta) added to slot 6');
console.log('  Appcast: Lucy Bousfield (Aon) added to slot 11');
console.log('  Happydance: Yuliia Zembal moved slot 1→10, Ciaran O\'Regan (LEGO) added to slot 1');
console.log('  Amberjack: Mark Brooker (BT Group) added to slot 12');

process.exit(0);
