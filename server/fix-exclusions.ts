/**
 * Replace meetings for newly hard-excluded delegates:
 * Appcast: Adam Binks (76678269091), Joanna Saunders-Hare (203946652193)
 * hackajob: Edwin Pene (9477501), Jon Warwick (1076201), Tush Wijeratne (9322701)
 * SHL: Carly George (113145184682), Sonal Jain (110260566550), Nikhilesh Mathur (191181016455)
 * JobSync: Anna Katyal (195183358360)
 * Stepstone: Yuliia Zembal (128491656706)
 */

import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";

// Map of sponsorId -> attendeeIds to remove
const EXCLUSIONS_TO_FIX: Record<number, string[]> = {
  270002: ['76678269091', '203946652193'],          // Appcast
  540001: ['9477501', '1076201', '9322701'],         // hackajob
  750001: ['113145184682', '110260566550', '191181016455'], // SHL
  840001: ['195183358360'],                           // JobSync
  150001: ['128491656706'],                           // Stepstone
};

const QUOTA_OVERRIDES: Record<number, number> = {
  450001: 12, 750001: 24, 870001: 12, 390001: 10,
  270002: 20, // Appcast 2-rep quota
};

async function main() {
  console.log("=== Replacing Newly-Excluded Delegate Meetings ===\n");

  const allMeetings = await db.getAllMeetings();
  
  // Find all meetings to remove
  const meetingsToRemove: typeof allMeetings = [];
  for (const [sponsorIdStr, attendeeIds] of Object.entries(EXCLUSIONS_TO_FIX)) {
    const sponsorId = parseInt(sponsorIdStr);
    for (const attendeeId of attendeeIds) {
      const match = allMeetings.find(m => m.sponsorId === sponsorId && m.attendeeId === attendeeId);
      if (match) {
        meetingsToRemove.push(match);
        console.log(`Found: Sponsor ${sponsorId} + ${attendeeId} → Meeting ID ${match.id}, Slot ${match.timeSlot}, Rep ${match.attendeeNumber}`);
      } else {
        console.log(`Not found in schedule: Sponsor ${sponsorId} + ${attendeeId} (may not have been matched)`);
      }
    }
  }

  console.log(`\nTotal meetings to replace: ${meetingsToRemove.length}`);

  if (meetingsToRemove.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Delete the affected meetings first
  console.log("\nDeleting affected meetings...");
  for (const m of meetingsToRemove) {
    await db.deleteMeeting(m.id);
  }
  console.log(`Deleted ${meetingsToRemove.length} meetings.`);

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

  // All excluded IDs (so replacements don't pick them)
  const allExcludedIds = new Set(Object.values(EXCLUSIONS_TO_FIX).flat());

  let totalReplaced = 0;

  for (const meeting of meetingsToRemove) {
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
      if (allExcludedIds.has(c.attendeeId)) return false; // newly excluded
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

  console.log(`\n=== Done: Replaced ${totalReplaced}/${meetingsToRemove.length} meetings ===`);
  
  const finalMeetings = await db.getAllMeetings();
  console.log(`Total meetings in schedule: ${finalMeetings.length}`);
  
  // Verify none of the excluded delegates remain
  console.log("\nVerifying exclusions...");
  for (const [sponsorIdStr, attendeeIds] of Object.entries(EXCLUSIONS_TO_FIX)) {
    const sponsorId = parseInt(sponsorIdStr);
    for (const attendeeId of attendeeIds) {
      const remaining = finalMeetings.find(m => m.sponsorId === sponsorId && m.attendeeId === attendeeId);
      if (remaining) {
        console.log(`  ❌ STILL PRESENT: Sponsor ${sponsorId} + ${attendeeId}`);
      } else {
        console.log(`  ✅ Removed: Sponsor ${sponsorId} + ${attendeeId}`);
      }
    }
  }
}

main().catch(console.error);
