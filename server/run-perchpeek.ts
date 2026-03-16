/**
 * run-perchpeek.ts
 * Re-run matching for PerchPeek only (450001) with relaxed exclusions.
 * All other sponsors' meetings remain untouched.
 * Slot constraints are loaded from the existing meetings in the DB.
 */

import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";

const SPONSOR_ID = 450001;
const TARGET_MEETINGS = 12;
const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

async function main() {
  console.log("=== PerchPeek Re-Match ===");
  console.log(`Target: ${TARGET_MEETINGS} meetings, exclusion list relaxed`);

  // Load all existing meetings to build slot trackers
  const allMeetings = await db.getAllMeetings();
  const suggested = allMeetings.filter(m => m.status === 'suggested' && m.sponsorId !== SPONSOR_ID);

  // Build delegate slot tracker from existing meetings (excluding PerchPeek)
  const delegateUsedSlots = new Map<string, Set<number>>();
  const delegateMeetingCount = new Map<string, number>();
  for (const m of suggested) {
    if (!m.timeSlot) continue;
    if (!delegateUsedSlots.has(m.attendeeId)) delegateUsedSlots.set(m.attendeeId, new Set());
    delegateUsedSlots.get(m.attendeeId)!.add(m.timeSlot);
    delegateMeetingCount.set(m.attendeeId, (delegateMeetingCount.get(m.attendeeId) ?? 0) + 1);
  }

  console.log(`Loaded slot state from ${suggested.length} existing meetings (other sponsors)`);

  // PerchPeek has 1 rep
  const sponsorSlots = new Set<number>();

  // Score delegates
  console.log("Running AI scoring for PerchPeek...");
  const matches = await generateMeetingsForSponsor(SPONSOR_ID, TARGET_MEETINGS) as any[];
  console.log(`Got ${matches.length} candidates`);

  const intakeSubmission = await db.getIntakeSubmissionBySponsor(SPONSOR_ID);
  const repName = intakeSubmission
    ? `${intakeSubmission.firstName} ${intakeSubmission.lastName}`.trim()
    : 'Attendee 1';

  const matchesWithSlots: any[] = [];
  const assignedDelegates = new Set<string>();
  let repCount = 0;

  for (const match of matches) {
    if (repCount >= TARGET_MEETINGS) break;
    if (assignedDelegates.has(match.attendeeId)) continue;

    const currentDelegateCount = delegateMeetingCount.get(match.attendeeId) ?? 0;
    if (currentDelegateCount >= 8) {
      console.log(`  Delegate ${match.attendeeId} at 8-meeting cap — skipping`);
      continue;
    }

    const delegateSlots = delegateUsedSlots.get(match.attendeeId) ?? new Set<number>();
    const slot = ALL_SLOTS.find(s => !delegateSlots.has(s) && !sponsorSlots.has(s)) ?? null;

    if (slot === null) {
      console.log(`  No free slot for delegate ${match.attendeeId} — skipping`);
      continue;
    }

    // Commit
    delegateSlots.add(slot);
    sponsorSlots.add(slot);
    delegateUsedSlots.set(match.attendeeId, delegateSlots);
    delegateMeetingCount.set(match.attendeeId, currentDelegateCount + 1);
    assignedDelegates.add(match.attendeeId);
    repCount++;

    matchesWithSlots.push({ ...match, timeSlot: slot, attendeeNumber: 1, sponsorRepName: repName });
    console.log(`  Slot ${slot}: ${match.delegateInfo?.firstName} ${match.delegateInfo?.lastName} (${match.delegateInfo?.company}) — ${match.matchScore}%`);
  }

  console.log(`\nScheduled ${matchesWithSlots.length}/${TARGET_MEETINGS} meetings for PerchPeek`);

  // Save
  await db.deleteMeetingsBySponsor(SPONSOR_ID);
  for (const meeting of matchesWithSlots) {
    const safeReason = (meeting.matchReason || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n|\r/g, ' ')
      .trim();
    await db.createMeeting({
      sponsorId: SPONSOR_ID,
      attendeeId: meeting.attendeeId,
      matchScore: meeting.matchScore,
      matchReason: safeReason,
      isTopRanked: meeting.isTopRanked ? 1 : 0,
      isPriority: meeting.isPriority ? 1 : 0,
      timeSlot: meeting.timeSlot ?? null,
      attendeeNumber: 1,
      sponsorRepName: repName,
      status: 'suggested',
      notes: null,
    });
  }

  console.log("Saved to database.");

  // Validate
  const allMeetingsAfter = await db.getAllMeetings();
  const suggestedAfter = allMeetingsAfter.filter(m => m.status === 'suggested');

  const delegateSlashMap = new Map<string, Map<number, number>>();
  let delegateClashes = 0;
  for (const m of suggestedAfter) {
    if (!m.timeSlot) continue;
    if (!delegateSlashMap.has(m.attendeeId)) delegateSlashMap.set(m.attendeeId, new Map());
    const slots = delegateSlashMap.get(m.attendeeId)!;
    const cnt = (slots.get(m.timeSlot) ?? 0) + 1;
    slots.set(m.timeSlot, cnt);
    if (cnt > 1) delegateClashes++;
  }

  console.log(`\n=== VALIDATION ===`);
  console.log(`Total meetings: ${suggestedAfter.length}`);
  console.log(`Delegate slot clashes: ${delegateClashes} (should be 0)`);

  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
