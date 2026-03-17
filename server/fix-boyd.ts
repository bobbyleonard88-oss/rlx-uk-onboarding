/**
 * Script to:
 * 1. Show Andrew Boyd's current meetings
 * 2. Remove him from the schedule
 * 3. Find best replacement delegates for each sponsor/slot
 * 4. Insert replacement meetings
 */

import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";

const BOYD_ID = "18336501";

async function main() {
  console.log("=== Andrew Boyd Meeting Replacement ===\n");

  // 1. Get Boyd's current meetings
  const allMeetings = await db.getAllMeetings();
  const boydMeetings = allMeetings.filter(m => m.attendeeId === BOYD_ID);
  
  console.log(`Andrew Boyd has ${boydMeetings.length} meetings:`);
  for (const m of boydMeetings) {
    console.log(`  - Sponsor ${m.sponsorId} | Slot ${m.timeSlot} | Attendee ${m.attendeeNumber} | Score ${m.matchScore}%`);
  }

  if (boydMeetings.length === 0) {
    console.log("No meetings found for Andrew Boyd.");
    return;
  }

  // 2. Group by sponsor — we need to re-run matching for each affected sponsor
  const affectedSponsorIdsSet = new Set(boydMeetings.map(m => m.sponsorId));
  const affectedSponsorIds = Array.from(affectedSponsorIdsSet);
  console.log(`\nAffected sponsors: ${affectedSponsorIds.join(", ")}`);

  // 3. Delete Boyd's meetings
  console.log("\nDeleting Andrew Boyd's meetings...");
  for (const m of boydMeetings) {
    await db.deleteMeeting(m.id);
  }
  console.log(`Deleted ${boydMeetings.length} meetings.`);

  // 4. For each affected sponsor, find the best replacement delegate
  // We need to find a delegate who:
  //   - Is NOT already scheduled with this sponsor
  //   - Has a free slot matching the one Boyd vacated
  //   - Has not reached the 8-meeting cap
  //   - Is not hard-excluded from this sponsor
  //   - Has the highest match score

  const { attendees } = await import("./attendees");
  const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Re-fetch all meetings after deletion
  const remainingMeetings = await db.getAllMeetings();
  
  // Build delegate meeting counts
  const delegateMeetingCounts = new Map<string, number>();
  for (const m of remainingMeetings) {
    delegateMeetingCounts.set(m.attendeeId, (delegateMeetingCounts.get(m.attendeeId) || 0) + 1);
  }

  // Build delegate used slots
  const delegateUsedSlots = new Map<string, Set<number>>();
  for (const m of remainingMeetings) {
    if (!delegateUsedSlots.has(m.attendeeId)) delegateUsedSlots.set(m.attendeeId, new Set());
    if (m.timeSlot) delegateUsedSlots.get(m.attendeeId)!.add(m.timeSlot);
  }

  // Build sponsor+attendee used slots
  const sponsorAttendeeUsedSlots = new Map<string, Set<number>>();
  for (const m of remainingMeetings) {
    const key = `${m.sponsorId}-${m.attendeeNumber}`;
    if (!sponsorAttendeeUsedSlots.has(key)) sponsorAttendeeUsedSlots.set(key, new Set());
    if (m.timeSlot) sponsorAttendeeUsedSlots.get(key)!.add(m.timeSlot);
  }

  // Build set of existing sponsor-delegate pairs (to avoid duplicates)
  const existingPairs = new Set<string>();
  for (const m of remainingMeetings) {
    existingPairs.add(`${m.sponsorId}-${m.attendeeId}`);
  }

  let totalReplaced = 0;

  for (const meeting of boydMeetings) {
    const { sponsorId, timeSlot, attendeeNumber, matchScore } = meeting;
    console.log(`\n--- Finding replacement for Sponsor ${sponsorId}, Slot ${timeSlot}, Rep ${attendeeNumber} ---`);

    // Get scored candidates for this sponsor (re-run AI matching)
    const QUOTA_OVERRIDES: Record<number, number> = {
      450001: 12, 750001: 24, 870001: 12, 390001: 10,
    };
    const quota = QUOTA_OVERRIDES[sponsorId] ?? 12;
    
    let candidates;
    try {
      candidates = await generateMeetingsForSponsor(sponsorId, quota);
    } catch (err) {
      console.error(`  Failed to get candidates for sponsor ${sponsorId}:`, err);
      continue;
    }

    // Filter candidates: not already paired with this sponsor, not at capacity, has the required slot free
    const repKey = `${sponsorId}-${attendeeNumber}`;
    const repUsedSlots = sponsorAttendeeUsedSlots.get(repKey) || new Set<number>();

    const eligible = candidates.filter(c => {
      if (c.attendeeId === BOYD_ID) return false; // exclude Boyd himself
      if (existingPairs.has(`${sponsorId}-${c.attendeeId}`)) return false; // already paired
      const count = delegateMeetingCounts.get(c.attendeeId) || 0;
      if (count >= 8) return false; // at capacity
      const usedSlots = delegateUsedSlots.get(c.attendeeId) || new Set<number>();
      if (usedSlots.has(timeSlot!)) return false; // delegate busy in this slot
      if (repUsedSlots.has(timeSlot!)) return false; // rep busy in this slot (shouldn't happen since we freed it)
      return true;
    });

    if (eligible.length === 0) {
      console.log(`  No eligible replacement found for Sponsor ${sponsorId} Slot ${timeSlot}`);
      continue;
    }

    // Pick the best scoring candidate
    const best = eligible[0];
    console.log(`  Best replacement: ${best.delegateInfo.firstName} ${best.delegateInfo.lastName} (${best.delegateInfo.company}) — Score: ${best.matchScore}%`);

    // Insert the replacement meeting
    await db.createMeeting({
      sponsorId,
      attendeeId: best.attendeeId,
      timeSlot: timeSlot!,
      attendeeNumber: attendeeNumber!,
      matchScore: best.matchScore,
      matchReason: best.matchReason,
      status: "suggested",
    });

    // Update tracking maps
    existingPairs.add(`${sponsorId}-${best.attendeeId}`);
    delegateMeetingCounts.set(best.attendeeId, (delegateMeetingCounts.get(best.attendeeId) || 0) + 1);
    if (!delegateUsedSlots.has(best.attendeeId)) delegateUsedSlots.set(best.attendeeId, new Set());
    delegateUsedSlots.get(best.attendeeId)!.add(timeSlot!);
    if (!sponsorAttendeeUsedSlots.has(repKey)) sponsorAttendeeUsedSlots.set(repKey, new Set());
    sponsorAttendeeUsedSlots.get(repKey)!.add(timeSlot!);

    totalReplaced++;
  }

  console.log(`\n=== Done: Replaced ${totalReplaced}/${boydMeetings.length} meetings ===`);

  // Final validation
  const finalMeetings = await db.getAllMeetings();
  const boydRemaining = finalMeetings.filter(m => m.attendeeId === BOYD_ID);
  console.log(`Andrew Boyd remaining meetings: ${boydRemaining.length} (should be 0)`);
  console.log(`Total meetings in schedule: ${finalMeetings.length}`);
}

main().catch(console.error);
