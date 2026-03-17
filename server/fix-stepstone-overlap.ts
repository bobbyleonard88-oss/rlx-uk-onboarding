/**
 * Reduce Appcast-Stepstone overlap from 6 to 3
 * Swap out the 3 weakest overlapping Stepstone meetings:
 *   - id=663531 Ciaran O'Regan (LEGO) slot=12 score=46%  ← weakest
 *   - id=663527 Mark Coad (GSK) slot=6 score=57%
 *   - id=663526 Anna Katyal (BMS) slot=5 score=64%
 */
import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";
import { attendees } from "./attendees";

const STEPSTONE_ID = 810001;
const APPCAST_ID = 390001;

// The 3 meetings to replace (meeting DB ids and their slots)
const SWAPS = [
  { meetingId: 663531, slot: 12 },
  { meetingId: 663527, slot: 6 },
  { meetingId: 663526, slot: 5 },
];

async function main() {
  console.log("=== Reducing Appcast-Stepstone overlap: 6 → 3 ===\n");

  const allMeetings = await db.getAllMeetings();

  // Build Appcast delegate set
  const appcastIds = new Set(
    allMeetings.filter(m => m.sponsorId === APPCAST_ID).map(m => m.attendeeId)
  );
  console.log(`Appcast has ${appcastIds.size} delegates to avoid.\n`);

  // Delete the 3 overlap meetings
  for (const swap of SWAPS) {
    const meeting = allMeetings.find(m => m.id === swap.meetingId);
    if (meeting) {
      const d = attendees.find(a => a.id === meeting.attendeeId);
      console.log(`Removing: ${d?.firstName} ${d?.lastName} (${d?.company}) from Stepstone Slot ${swap.slot} [score ${meeting.matchScore}%]`);
      await db.deleteMeeting(swap.meetingId);
    } else {
      console.log(`Meeting id=${swap.meetingId} not found — may already be removed.`);
    }
  }

  // Re-fetch to build fresh tracking state
  const remaining = await db.getAllMeetings();
  const delegateMeetingCounts = new Map<string, number>();
  const delegateUsedSlots = new Map<string, Set<number>>();
  const existingPairs = new Set<string>();
  const stepstoneUsedSlots = new Set<number>(
    remaining.filter(m => m.sponsorId === STEPSTONE_ID).map(m => m.timeSlot!)
  );

  for (const m of remaining) {
    delegateMeetingCounts.set(m.attendeeId, (delegateMeetingCounts.get(m.attendeeId) || 0) + 1);
    if (!delegateUsedSlots.has(m.attendeeId)) delegateUsedSlots.set(m.attendeeId, new Set());
    if (m.timeSlot) delegateUsedSlots.get(m.attendeeId)!.add(m.timeSlot);
    existingPairs.add(`${m.sponsorId}-${m.attendeeId}`);
  }

  // Get fresh candidates for Stepstone
  const candidates = await generateMeetingsForSponsor(STEPSTONE_ID, 12);
  console.log(`\nGot ${candidates.length} Stepstone candidates from AI.`);

  // Fill each slot with best non-Appcast candidate
  let filled = 0;
  for (const swap of SWAPS) {
    const slot = swap.slot;
    const replacement = candidates.find(c => {
      if (appcastIds.has(c.attendeeId)) return false; // must not be in Appcast
      if (existingPairs.has(`${STEPSTONE_ID}-${c.attendeeId}`)) return false; // not already in Stepstone
      if ((delegateMeetingCounts.get(c.attendeeId) || 0) >= 8) return false; // under cap
      const delegateSlots = delegateUsedSlots.get(c.attendeeId) || new Set<number>();
      if (delegateSlots.has(slot)) return false; // delegate free in this slot
      return true;
    });

    if (!replacement) {
      console.log(`\n⚠️  No non-Appcast replacement found for Slot ${slot}. Stepstone will have 11 meetings.`);
      continue;
    }

    const a = attendees.find(a => a.id === replacement.attendeeId);
    console.log(`\n✅ Slot ${slot}: ${a?.firstName} ${a?.lastName} (${a?.company}) — Score: ${replacement.matchScore}%`);

    await db.createMeeting({
      sponsorId: STEPSTONE_ID,
      attendeeId: replacement.attendeeId,
      timeSlot: slot,
      attendeeNumber: 1,
      matchScore: replacement.matchScore,
      matchReason: replacement.matchReason,
      status: "suggested",
    });

    // Update tracking so next iteration sees this delegate as used
    existingPairs.add(`${STEPSTONE_ID}-${replacement.attendeeId}`);
    delegateMeetingCounts.set(replacement.attendeeId, (delegateMeetingCounts.get(replacement.attendeeId) || 0) + 1);
    if (!delegateUsedSlots.has(replacement.attendeeId)) delegateUsedSlots.set(replacement.attendeeId, new Set());
    delegateUsedSlots.get(replacement.attendeeId)!.add(slot);
    stepstoneUsedSlots.add(slot);
    filled++;
  }

  // Final validation
  const finalMeetings = await db.getAllMeetings();
  const stepstoneFinal = finalMeetings.filter(m => m.sponsorId === STEPSTONE_ID);
  const appcastFinal = finalMeetings.filter(m => m.sponsorId === APPCAST_ID);
  const appcastFinalIds = new Set(appcastFinal.map(m => m.attendeeId));
  const overlapFinal = stepstoneFinal.filter(m => appcastFinalIds.has(m.attendeeId));

  console.log(`\n=== Final state ===`);
  console.log(`Stepstone meetings: ${stepstoneFinal.length}`);
  console.log(`Appcast meetings: ${appcastFinal.length}`);
  console.log(`Remaining overlap: ${overlapFinal.length}`);
  console.log(`Total meetings: ${finalMeetings.length}`);

  if (overlapFinal.length > 0) {
    console.log("Remaining overlapping delegates:");
    for (const m of overlapFinal) {
      const d = attendees.find(a => a.id === m.attendeeId);
      console.log(`  ${d?.firstName} ${d?.lastName} (${d?.company}) Slot ${m.timeSlot} Score ${m.matchScore}%`);
    }
  }
}

main().catch(console.error);
