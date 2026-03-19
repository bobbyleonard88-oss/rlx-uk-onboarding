import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

const fixLog = [];

// ============================================================
// STEP 1: Fix SHL — remove 2 lowest scoring meetings, fill slot 8
// ============================================================
console.log('=== STEP 1: Fix SHL ===');
const [shlSponsor] = await db.execute(`SELECT id FROM sponsors WHERE companyName = 'SHL'`);
const shlId = shlSponsor[0].id;

const [shlMeetings] = await db.execute(`
  SELECT m.id, m.timeSlot, m.attendeeId, m.matchScore,
         CONCAT(d.firstName, ' ', d.lastName) as delegateName
  FROM meetings m
  LEFT JOIN delegateProfiles d ON m.attendeeId = CAST(d.id AS CHAR)
  WHERE m.sponsorId = ?
  ORDER BY m.matchScore ASC, m.id ASC
`, [shlId]);

// Get 2 lowest scoring — but don't remove from slot 8 (it's empty, we need to fill it)
// Also avoid removing the only meeting in a slot (would create another gap)
const slotCounts = {};
for (const m of shlMeetings) slotCounts[m.timeSlot] = (slotCounts[m.timeSlot] || 0) + 1;

// Find candidates to remove: meetings in slots that have 2 (so removing one still leaves 1)
const removeCandidates = shlMeetings.filter(m => slotCounts[m.timeSlot] >= 2);
// Sort by match score ascending (lowest first)
removeCandidates.sort((a, b) => (a.matchScore || 0) - (b.matchScore || 0));

const toRemove = removeCandidates.slice(0, 2);
console.log('Removing 2 lowest scoring SHL meetings:');
for (const m of toRemove) {
  console.log(`  Meeting ${m.id}: ${m.delegateName || m.attendeeId} (score: ${m.matchScore}) in slot ${m.timeSlot}`);
  await db.execute(`DELETE FROM meetings WHERE id = ?`, [m.id]);
  fixLog.push(`SHL: removed meeting ${m.id} (${m.delegateName || m.attendeeId}, score ${m.matchScore}, slot ${m.timeSlot})`);
  slotCounts[m.timeSlot]--;
}

// Now move one meeting from a doubled slot into slot 8
const [shlRemaining] = await db.execute(`SELECT id, timeSlot, attendeeId FROM meetings WHERE sponsorId = ? ORDER BY timeSlot`, [shlId]);
const newSlotCounts = {};
for (const m of shlRemaining) newSlotCounts[m.timeSlot] = (newSlotCounts[m.timeSlot] || 0) + 1;

// Find a slot with 2 meetings where one delegate is free in slot 8
const [slot8Delegates] = await db.execute(`SELECT attendeeId FROM meetings WHERE timeSlot = 8`);
const slot8Set = new Set(slot8Delegates.map(r => r.attendeeId));

let shlSlot8Fixed = false;
for (const m of shlRemaining) {
  if (newSlotCounts[m.timeSlot] >= 2 && !slot8Set.has(m.attendeeId)) {
    await db.execute(`UPDATE meetings SET timeSlot = 8 WHERE id = ?`, [m.id]);
    fixLog.push(`SHL: moved meeting ${m.id} (delegate ${m.attendeeId}) from slot ${m.timeSlot} → slot 8`);
    console.log(`  Moved meeting ${m.id} from slot ${m.timeSlot} to slot 8`);
    shlSlot8Fixed = true;
    break;
  }
}
if (!shlSlot8Fixed) console.log('  ⚠️ Could not fill SHL slot 8 automatically');

// ============================================================
// STEP 2: Fix Appcast — fill slot 12
// ============================================================
console.log('\n=== STEP 2: Fix Appcast slot 12 ===');
const [appcastSponsor] = await db.execute(`SELECT id FROM sponsors WHERE companyName LIKE '%Appcast%'`);
const appcastId = appcastSponsor[0].id;

// Find delegates free in slot 12 who haven't met Appcast yet
const [appcastDelegates] = await db.execute(`SELECT attendeeId FROM meetings WHERE sponsorId = ?`, [appcastId]);
const appcastDelegateSet = new Set(appcastDelegates.map(r => r.attendeeId));
const [slot12Delegates] = await db.execute(`SELECT attendeeId FROM meetings WHERE timeSlot = 12`);
const slot12Set = new Set(slot12Delegates.map(r => r.attendeeId));

// Get all delegates with their match scores for Appcast (from matchCache if available)
const [allDelegates] = await db.execute(`SELECT id, firstName, lastName, company FROM delegateProfiles ORDER BY id`);
const available = allDelegates.filter(d => !appcastDelegateSet.has(String(d.id)) && !slot12Set.has(String(d.id)));

if (available.length > 0) {
  // Pick the first available (ideally highest match score — use first for now)
  const pick = available[0];
  // Check how many meetings Appcast has in slot 12 currently
  const [appcastSlot12] = await db.execute(`SELECT COUNT(*) as cnt FROM meetings WHERE sponsorId = ? AND timeSlot = 12`, [appcastId]);
  const needed = 2 - appcastSlot12[0].cnt;
  
  for (let i = 0; i < Math.min(needed, available.length); i++) {
    const delegate = available[i];
    await db.execute(`
      INSERT INTO meetings (sponsorId, attendeeId, timeSlot, attendeeNumber, status, matchScore, matchReason)
      VALUES (?, ?, 12, 1, 'confirmed', NULL, NULL)
    `, [appcastId, String(delegate.id)]);
    fixLog.push(`Appcast: added new meeting for delegate ${delegate.id} (${delegate.firstName} ${delegate.lastName}) in slot 12`);
    console.log(`  Added ${delegate.firstName} ${delegate.lastName} to Appcast slot 12`);
  }
} else {
  console.log('  ⚠️ No available delegates for Appcast slot 12');
}

// ============================================================
// STEP 3: Chain-swap for the 6 remaining doubled sponsors
// ============================================================
console.log('\n=== STEP 3: Chain-swaps for remaining doubled sponsors ===');

// For each: find the doubled meeting's delegate, find which slot blocks them,
// then try to move THAT blocking meeting to free up the target slot
const chainProblems = [
  { name: 'Amberjack', meetingId: 663492, doubledSlot: 8, missingSlot: 6, blockingSponsors: ['Sapia.ai'] },
  { name: 'Poetry', meetingId: 663572, doubledSlot: 3, missingSlot: 10, blockingSponsors: ['SHL'] },
  { name: 'The Martec', meetingId: 663518, doubledSlot: 10, missingSlot: 1, blockingSponsors: ['Appcast'] },
  { name: 'Udder', meetingId: 663456, doubledSlot: 9, missingSlot: 3, blockingSponsors: ['Radancy'] },
  { name: 'Wilson', meetingId: 840009, doubledSlot: 3, missingSlot: 8, blockingSponsors: ['Maki People'] },
  { name: 'Zinc', meetingId: 663430, doubledSlot: 1, missingSlot: 11, blockingSponsors: ['hackajob'] },
];

for (const p of chainProblems) {
  // Get the doubled meeting
  const [mRows] = await db.execute(`SELECT id, attendeeId, timeSlot, sponsorId FROM meetings WHERE id = ?`, [p.meetingId]);
  if (!mRows.length) { console.log(`${p.name}: meeting ${p.meetingId} not found`); continue; }
  const meeting = mRows[0];

  // Find the blocking meeting: this delegate in the missing slot
  const [blockingRows] = await db.execute(`
    SELECT m.id, m.sponsorId, m.timeSlot, s.companyName
    FROM meetings m JOIN sponsors s ON m.sponsorId = s.id
    WHERE m.attendeeId = ? AND m.timeSlot = ?
  `, [meeting.attendeeId, p.missingSlot]);

  if (!blockingRows.length) {
    // Slot is now free — just move directly
    await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [p.missingSlot, p.meetingId]);
    fixLog.push(`${p.name}: moved meeting ${p.meetingId} from slot ${p.doubledSlot} → slot ${p.missingSlot} (direct)`);
    console.log(`  ${p.name}: direct move slot ${p.doubledSlot} → ${p.missingSlot}`);
    continue;
  }

  const blocker = blockingRows[0];
  // Try to move the blocking meeting to a free slot for that sponsor
  const [blockerSponsorMeetings] = await db.execute(`SELECT timeSlot FROM meetings WHERE sponsorId = ?`, [blocker.sponsorId]);
  const blockerSponsorSlots = new Set(blockerSponsorMeetings.map(r => r.timeSlot));
  const [delegateAllMeetings] = await db.execute(`SELECT timeSlot FROM meetings WHERE attendeeId = ? AND id != ?`, [meeting.attendeeId, blocker.id]);
  const delegateSlots = new Set(delegateAllMeetings.map(r => r.timeSlot));

  // Find a slot where: blocker's sponsor has no meeting AND delegate is free
  const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
  let chainTarget = null;
  for (const s of allSlots) {
    if (!blockerSponsorSlots.has(s) && !delegateSlots.has(s) && s !== p.missingSlot) {
      chainTarget = s;
      break;
    }
  }

  if (chainTarget !== null) {
    await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [chainTarget, blocker.id]);
    await db.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [p.missingSlot, p.meetingId]);
    fixLog.push(`${p.name}: chain-swap — moved ${blocker.companyName.trim()} meeting ${blocker.id} from slot ${p.missingSlot} → slot ${chainTarget}, then moved ${p.name} meeting ${p.meetingId} from slot ${p.doubledSlot} → slot ${p.missingSlot}`);
    console.log(`  ${p.name}: chain-swap success — ${blocker.companyName.trim()} slot ${p.missingSlot}→${chainTarget}, ${p.name} slot ${p.doubledSlot}→${p.missingSlot}`);
  } else {
    fixLog.push(`⚠️  ${p.name}: chain-swap FAILED — no free slot for ${blocker.companyName.trim()}`);
    console.log(`  ⚠️  ${p.name}: chain-swap failed`);
  }
}

// ============================================================
// FINAL VERIFICATION
// ============================================================
console.log('\n=== Final Verification ===');
const [finalMeetings] = await db.execute(`SELECT id, sponsorId, timeSlot FROM meetings`);
const [allSponsors] = await db.execute(`SELECT id, companyName FROM sponsors`);

let allClear = true;
for (const sponsor of allSponsors) {
  const meetings = finalMeetings.filter(m => m.sponsorId === sponsor.id);
  if (meetings.length === 0) continue;
  const maxPerSlot = meetings.length > 12 ? 2 : 1;
  const slotCounts = {};
  for (const m of meetings) slotCounts[m.timeSlot] = (slotCounts[m.timeSlot] || 0) + 1;
  const allSlots = [1,2,3,4,5,6,7,8,9,10,11,12];
  const missing = allSlots.filter(s => !slotCounts[s]);
  const doubled = Object.entries(slotCounts).filter(([,c]) => c > maxPerSlot);
  if (missing.length > 0 || doubled.length > 0) {
    allClear = false;
    console.log(`⚠️  ${sponsor.companyName.trim()} (${meetings.length} meetings): missing=[${missing.join(',')}], doubled=[${doubled.map(([s,c]) => `${s}(${c}x)`).join(',')}]`);
  }
}
if (allClear) console.log('✅ ALL CLEAR — every real sponsor has clean slot distribution');

console.log('\n=== Summary of all changes ===');
fixLog.forEach(l => console.log(' ', l));

await db.end();
