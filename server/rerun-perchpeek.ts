/**
 * Re-run PerchPeek matching with the new global business bonus.
 * Clears all 12 existing PerchPeek meetings and replaces with new best matches.
 */

import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";

const PERCHPEEK_ID = 450001;
const QUOTA = 12;
const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

async function main() {
  console.log("=== Re-running PerchPeek matching with global business bonus ===\n");

  // Delete all existing PerchPeek meetings
  await db.deleteMeetingsBySponsor(PERCHPEEK_ID);
  console.log("Cleared existing PerchPeek meetings.");

  // Get all remaining meetings for tracking
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

  const existingPairs = new Set<string>();
  for (const m of remainingMeetings) {
    existingPairs.add(`${m.sponsorId}-${m.attendeeId}`);
  }

  // Get candidates with new global business bonus
  console.log("Generating candidates with global business bonus...");
  const candidates = await generateMeetingsForSponsor(PERCHPEEK_ID, QUOTA);
  
  console.log(`\nTop 15 candidates after global bonus:`);
  for (const c of candidates.slice(0, 15)) {
    console.log(`  ${c.delegateInfo.firstName} ${c.delegateInfo.lastName} (${c.delegateInfo.company}) — Score: ${c.matchScore}%`);
  }

  // Assign slots
  const sponsorUsedSlots = new Set<number>();
  let saved = 0;

  for (const candidate of candidates) {
    if (saved >= QUOTA) break;
    
    // Skip if already paired
    if (existingPairs.has(`${PERCHPEEK_ID}-${candidate.attendeeId}`)) continue;
    
    // Skip if at capacity
    if ((delegateMeetingCounts.get(candidate.attendeeId) || 0) >= 8) continue;
    
    const delegateSlots = delegateUsedSlots.get(candidate.attendeeId) || new Set<number>();
    
    // Find first available slot
    const availableSlot = ALL_SLOTS.find(slot => 
      !sponsorUsedSlots.has(slot) && !delegateSlots.has(slot)
    );
    
    if (availableSlot === undefined) continue;
    
    await db.createMeeting({
      sponsorId: PERCHPEEK_ID,
      attendeeId: candidate.attendeeId,
      timeSlot: availableSlot,
      attendeeNumber: 1,
      matchScore: candidate.matchScore,
      matchReason: candidate.matchReason,
      status: "suggested",
    });

    // Update tracking
    sponsorUsedSlots.add(availableSlot);
    existingPairs.add(`${PERCHPEEK_ID}-${candidate.attendeeId}`);
    delegateMeetingCounts.set(candidate.attendeeId, (delegateMeetingCounts.get(candidate.attendeeId) || 0) + 1);
    if (!delegateUsedSlots.has(candidate.attendeeId)) delegateUsedSlots.set(candidate.attendeeId, new Set());
    delegateUsedSlots.get(candidate.attendeeId)!.add(availableSlot);

    console.log(`  ✅ Saved: ${candidate.delegateInfo.firstName} ${candidate.delegateInfo.lastName} → Slot ${availableSlot}, Score: ${candidate.matchScore}%`);
    saved++;
  }

  console.log(`\n=== Done: Saved ${saved}/${QUOTA} PerchPeek meetings ===`);
  
  const finalMeetings = await db.getAllMeetings();
  console.log(`Total meetings in schedule: ${finalMeetings.length}`);
}

main().catch(console.error);
