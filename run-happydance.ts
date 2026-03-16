/**
 * Run Happydance matching with leftover delegate capacity
 * Happydance sponsor ID: 600001
 */
import * as dotenv from "dotenv";
dotenv.config();

import * as db from "./server/db";
import { generateMeetingsForSponsor } from "./server/matchingAlgorithm";

const HAPPYDANCE_ID = 600001;
const DELEGATE_CAP = 8;
const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MAX_MEETINGS_PER_SLOT = 2;

async function main() {
  console.log("=== Happydance Leftover Matching ===");
  console.log(`Starting at: ${new Date().toISOString()}`);

  // Load current meeting counts from DB (from the 20-sponsor run)
  const allMeetings = await db.getAllMeetings();
  const delegateMeetingCount = new Map<string, number>();
  const delegateSlotCounts = new Map<string, Map<number, number>>();

  for (const m of allMeetings) {
    delegateMeetingCount.set(m.attendeeId, (delegateMeetingCount.get(m.attendeeId) ?? 0) + 1);
    if (!delegateSlotCounts.has(m.attendeeId)) {
      delegateSlotCounts.set(m.attendeeId, new Map<number, number>());
    }
    if (m.timeSlot != null) {
      const slotMap = delegateSlotCounts.get(m.attendeeId)!;
      slotMap.set(m.timeSlot, (slotMap.get(m.timeSlot) ?? 0) + 1);
    }
  }

  // Count available capacity
  const available = [...delegateMeetingCount.entries()].filter(([, c]) => c < DELEGATE_CAP).length;
  // Also count delegates with 0 meetings
  const { attendees: allAttendees } = await import("./server/attendees");
  for (const a of allAttendees) {
    if (!delegateMeetingCount.has(String(a.id))) {
      delegateMeetingCount.set(String(a.id), 0);
    }
  }
  const totalAvailable = [...delegateMeetingCount.entries()].filter(([, c]) => c < DELEGATE_CAP).length;
  console.log(`Delegates with spare capacity: ${totalAvailable}`);

  // How many meetings can Happydance get?
  const maxMeetings = totalAvailable; // at most 1 meeting per available delegate
  console.log(`Happydance can get up to ${maxMeetings} meetings`);

  // Run AI scoring for Happydance — request maxMeetings
  console.log(`\nRunning AI scoring for Happydance (up to ${maxMeetings} meetings)...`);
  const matches = await generateMeetingsForSponsor(HAPPYDANCE_ID, maxMeetings);
  console.log(`AI returned ${(matches as any[]).length} candidates`);

  // Get sponsor intake for rep names
  const sponsorIntake = await db.getIntakeSubmissionBySponsor(HAPPYDANCE_ID);
  const repName1 = sponsorIntake?.firstName && sponsorIntake?.lastName
    ? `${sponsorIntake.firstName} ${sponsorIntake.lastName}`.trim()
    : 'Attendee 1';
  const repName2 = sponsorIntake?.secondRepName?.trim() || repName1;
  const hasTwoAttendees = !!(sponsorIntake?.secondRepName?.trim());
  const halfCount = Math.ceil(maxMeetings / 2);

  // Assign slots respecting existing usage
  const matchesWithSlots: any[] = [];
  for (let i = 0; i < (matches as any[]).length; i++) {
    if (matchesWithSlots.length >= maxMeetings) break;

    const match = (matches as any[])[i];
    const currentDelegateCount = delegateMeetingCount.get(match.attendeeId) ?? 0;
    if (currentDelegateCount >= DELEGATE_CAP) continue;

    const attendeeNumber = hasTwoAttendees ? (i < halfCount ? 1 : 2) : 1;
    const sponsorRepName = attendeeNumber === 2 ? repName2 : repName1;

    if (!delegateSlotCounts.has(match.attendeeId)) {
      delegateSlotCounts.set(match.attendeeId, new Map<number, number>());
    }
    const delegateSlotMap = delegateSlotCounts.get(match.attendeeId)!;

    const availableSlot = ALL_SLOTS.find(
      slot => (delegateSlotMap.get(slot) ?? 0) < MAX_MEETINGS_PER_SLOT
    ) ?? null;

    if (availableSlot !== null) {
      delegateSlotMap.set(availableSlot, (delegateSlotMap.get(availableSlot) ?? 0) + 1);
      delegateMeetingCount.set(match.attendeeId, currentDelegateCount + 1);
    }

    matchesWithSlots.push({ ...match, timeSlot: availableSlot, attendeeNumber, sponsorRepName });
  }

  // Save to DB
  await db.deleteMeetingsBySponsor(HAPPYDANCE_ID);
  for (const meeting of matchesWithSlots) {
    const safeReason = (meeting.matchReason || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n|\r/g, ' ')
      .trim();
    await db.createMeeting({
      sponsorId: HAPPYDANCE_ID,
      attendeeId: meeting.attendeeId,
      matchScore: meeting.matchScore,
      matchReason: safeReason,
      isTopRanked: meeting.isTopRanked ? 1 : 0,
      isPriority: meeting.isPriority ? 1 : 0,
      timeSlot: meeting.timeSlot ?? null,
      attendeeNumber: meeting.attendeeNumber ?? 1,
      sponsorRepName: meeting.sponsorRepName ?? null,
      status: 'suggested',
      notes: null,
    });
  }

  console.log(`\n✓ Happydance: ${matchesWithSlots.length} meetings saved`);
  console.log(`Finished at: ${new Date().toISOString()}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
