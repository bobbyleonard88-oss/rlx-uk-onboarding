/**
 * Remove Andrew Boyd (18336501) from the schedule again (he was re-added by fix-exclusions.ts)
 * and find alternative replacements for each of his meetings.
 */

import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";

const BOYD_ID = '18336501';

const QUOTA_OVERRIDES: Record<number, number> = {
  450001: 12, 750001: 24, 870001: 12, 390001: 10,
  270002: 20, // Appcast 2-rep quota
};

async function main() {
  console.log("=== Removing Andrew Boyd from schedule (v2) ===\n");

  const allMeetings = await db.getAllMeetings();
  const boydMeetings = allMeetings.filter(m => m.attendeeId === BOYD_ID);
  
  console.log(`Andrew Boyd has ${boydMeetings.length} meetings:`);
  for (const m of boydMeetings) {
    console.log(`  Sponsor ${m.sponsorId}, Slot ${m.timeSlot}, Rep ${m.attendeeNumber}`);
  }

  if (boydMeetings.length === 0) {
    console.log("Andrew Boyd is not in the schedule. Nothing to do.");
    return;
  }

  // Delete Boyd's meetings
  for (const m of boydMeetings) {
    await db.deleteMeeting(m.id);
  }
  console.log(`\nDeleted ${boydMeetings.length} meetings.`);

  // Re-fetch remaining meetings for tracking
  const remainingMeetings = await db.getAllMeetings();
  
  const delegateMeetingCounts = new Map<string, number>();
  for (const m of remainingMeetings) {
    delegateMeetingCounts.set(m.attendeeId, (delegateMeetingCounts.get(m.attendeeId) || 0) + 1);
  }

  const delegateUsedSlots = new Map<string, Set<number>>();
  for (const m of remainingMeetings) {
    if (!delegateUsedSlots.has(m.attendeeId)) delegateUsedSlots.set(m.attendeeId, new Set());
    if (m.timeSlot) delegateUsedSlots.get(m.attendeeId)!.add(m.timeSlot);
  }

  const sponsorAttendeeUsedSlots = new Map<string, Set<number>>();
  for (const m of remainingMeetings) {
    const key = `${m.sponsorId}-${m.attendeeNumber}`;
    if (!sponsorAttendeeUsedSlots.has(key)) sponsorAttendeeUsedSlots.set(key, new Set());
    if (m.timeSlot) sponsorAttendeeUsedSlots.get(key)!.add(m.timeSlot);
  }

  const existingPairs = new Set<string>();
  for (const m of remainingMeetings) {
    existingPairs.add(`${m.sponsorId}-${m.attendeeId}`);
  }

  // Excluded IDs: Boyd himself + all the newly-excluded delegates
  const allExcludedIds = new Set([
    BOYD_ID,
    '76678269091',   // Adam Binks (KPMG) - Appcast/SHL
    '203946652193',  // Joanna Saunders-Hare (MUFG) - Appcast
    '9477501',       // Edwin Pene (Red Bull) - hackajob
    '1076201',       // Jon Warwick (Sky) - hackajob
    '9322701',       // Tush Wijeratne (WPP) - hackajob
    '113145184682',  // Carly George (AXA) - SHL
    '110260566550',  // Sonal Jain (Nissan) - SHL
    '191181016455',  // Nikhilesh Mathur (LSEG) - SHL
    '195183358360',  // Anna Katyal (BMS Group) - JobSync
    '128491656706',  // Yuliia Zembal (UKRSIBBANK) - Stepstone
  ]);

  let totalReplaced = 0;

  for (const meeting of boydMeetings) {
    const { sponsorId, timeSlot, attendeeNumber } = meeting;
    console.log(`\n--- Replacing Sponsor ${sponsorId}, Slot ${timeSlot}, Rep ${attendeeNumber} ---`);

    const quota = QUOTA_OVERRIDES[sponsorId] ?? 12;
    
    let candidates;
    try {
      candidates = await generateMeetingsForSponsor(sponsorId, quota);
    } catch (err) {
      console.error(`  Failed to get candidates for sponsor ${sponsorId}:`, err);
      continue;
    }

    const repKey = `${sponsorId}-${attendeeNumber}`;
    const repUsedSlots = sponsorAttendeeUsedSlots.get(repKey) || new Set<number>();

    const eligible = candidates.filter(c => {
      if (allExcludedIds.has(c.attendeeId)) return false;
      if (existingPairs.has(`${sponsorId}-${c.attendeeId}`)) return false;
      const count = delegateMeetingCounts.get(c.attendeeId) || 0;
      if (count >= 8) return false;
      const usedSlots = delegateUsedSlots.get(c.attendeeId) || new Set<number>();
      if (usedSlots.has(timeSlot!)) return false;
      if (repUsedSlots.has(timeSlot!)) return false;
      return true;
    });

    if (eligible.length === 0) {
      console.log(`  ⚠️  No eligible replacement found for Sponsor ${sponsorId} Slot ${timeSlot}`);
      continue;
    }

    const best = eligible[0];
    console.log(`  ✅ Replacement: ${best.delegateInfo.firstName} ${best.delegateInfo.lastName} (${best.delegateInfo.company}) — Score: ${best.matchScore}%`);

    await db.createMeeting({
      sponsorId,
      attendeeId: best.attendeeId,
      timeSlot: timeSlot!,
      attendeeNumber: attendeeNumber!,
      matchScore: best.matchScore,
      matchReason: best.matchReason,
      status: "suggested",
    });

    // Update tracking
    existingPairs.add(`${sponsorId}-${best.attendeeId}`);
    delegateMeetingCounts.set(best.attendeeId, (delegateMeetingCounts.get(best.attendeeId) || 0) + 1);
    if (!delegateUsedSlots.has(best.attendeeId)) delegateUsedSlots.set(best.attendeeId, new Set());
    delegateUsedSlots.get(best.attendeeId)!.add(timeSlot!);
    if (!sponsorAttendeeUsedSlots.has(repKey)) sponsorAttendeeUsedSlots.set(repKey, new Set());
    sponsorAttendeeUsedSlots.get(repKey)!.add(timeSlot!);

    totalReplaced++;
  }

  console.log(`\n=== Done: Replaced ${totalReplaced}/${boydMeetings.length} meetings ===`);
  
  const finalMeetings = await db.getAllMeetings();
  console.log(`Total meetings in schedule: ${finalMeetings.length}`);
  
  // Verify Boyd is gone
  const boydRemaining = finalMeetings.filter(m => m.attendeeId === BOYD_ID);
  console.log(`Andrew Boyd meetings remaining: ${boydRemaining.length} (should be 0)`);
}

main().catch(console.error);
