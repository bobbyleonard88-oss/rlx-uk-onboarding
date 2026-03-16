/**
 * run-match-v2.ts
 * Standalone script to run the full matching pipeline with correct slot constraints:
 * - 1 meeting per slot per delegate
 * - 1 meeting per slot per sponsor rep
 * - No duplicate vendor-delegate pairs
 * - Quota enforcement per sponsor
 * - Global 8-meeting cap per delegate
 */

import * as db from "./db";
import { generateMeetingsForAllSponsors } from "./matchingAlgorithm";

const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);

const SPONSOR_MEETING_COUNT_OVERRIDES: Record<number, number> = {
    450001: 12,  // PerchPeek — relaxed exclusion list, target 12
    750001: 24,  // SHL
    870001: 12,  // Wilson
    390001: 10,  // Bright Apply
};

const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DELEGATE_MAX_MEETINGS = 8;

async function main() {
  console.log("=== RLX Match All v2 ===");
  console.log("Constraints: 1 meeting/slot/delegate, 1 meeting/slot/rep, no duplicates, quota enforcement");
  console.log("");

  // Global trackers
  const delegateUsedSlots = new Map<string, Set<number>>();
  const sponsorUsedSlots = new Map<number, Map<number, Set<number>>>();
  const delegateMeetingCount = new Map<string, number>();

  const excludedForRun = new Set<number>([
    ...Array.from(ALWAYS_EXCLUDED_SPONSOR_IDS),
    ...Array.from(TEST_SPONSOR_IDS),
  ]);

  // Order sponsors by most-constrained first (highest meeting count first)
  // This ensures SHL (24), Harver (20), Appcast (20) get first pick of delegate slots
  const ORDERED_SPONSOR_IDS = [
    750001, // SHL: 24 meetings (most constrained)
    210001, // Harver: 20 meetings
    270002, // Appcast: 20 meetings
    150001, // Stepstone: 12
    180001, // Maki People: 12
    240001, // Sapia.ai: 12
    300001, // Zinc: 12
    330001, // Symphony Talent: 12
    360001, // Udder: 12
    540001, // hackajob: 12
    600001, // Happydance: 12
    690001, // Amberjack: 12
    720001, // inploi: 12
    780001, // The Martec: 12
    810001, // Veremark: 12
    810002, // Radancy: 12
    840001, // JobSync: 12
    870001, // Wilson: 12
    900001, // Poetry: 12
    450001, // PerchPeek: 10
    390001, // Bright Apply: 10 (least constrained)
  ];

  console.log("Step 1: Running AI scoring for all sponsors (most-constrained first)...");
  const allMatchResults = await generateMeetingsForAllSponsors(
    (event) => {
      if (event.type === 'scoring_start') {
        process.stdout.write(`  Scoring ${event.sponsorName}...`);
      } else if (event.type === 'scoring_complete') {
        console.log(` done (${event.meetingCount} candidates)`);
      } else if (event.type === 'sponsor_error') {
        console.log(` ERROR: ${event.error}`);
      }
    },
    excludedForRun,
    ORDERED_SPONSOR_IDS
  );

  console.log(`\nStep 2: Assigning slots and saving meetings...`);
  const savedResults: { sponsorId: number; sponsorName: string; meetingCount: number; target: number }[] = [];

  for (const [sponsorId, matches] of Array.from(allMatchResults.entries())) {
    if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsorId)) continue;
    if (TEST_SPONSOR_IDS.has(sponsorId)) continue;

    const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsorId);
    const targetMeetingCount = SPONSOR_MEETING_COUNT_OVERRIDES[sponsorId] ??
      (intakeSubmission?.meetingPackage === '20' ? 20 : 12);

    const hasTwoReps = targetMeetingCount > 12;
    const rep1Quota = hasTwoReps ? Math.ceil(targetMeetingCount / 2) : targetMeetingCount;
    const rep2Quota = hasTwoReps ? Math.floor(targetMeetingCount / 2) : 0;

    if (!sponsorUsedSlots.has(sponsorId)) {
      sponsorUsedSlots.set(sponsorId, new Map<number, Set<number>>([[1, new Set<number>()], [2, new Set<number>()]]));
    }
    const sponsorSlots = sponsorUsedSlots.get(sponsorId)!;

    const repName1 = intakeSubmission
      ? `${intakeSubmission.firstName} ${intakeSubmission.lastName}`.trim()
      : 'Attendee 1';
    const repName2 = intakeSubmission?.secondRepName?.trim() || repName1;

    const matchesWithSlots: any[] = [];
    let rep1Count = 0;
    let rep2Count = 0;
    const assignedDelegates = new Set<string>();

    for (const match of (matches as any[])) {
      if (rep1Count >= rep1Quota && rep2Count >= rep2Quota) break;

      if (assignedDelegates.has(match.attendeeId)) continue;

      const currentDelegateCount = delegateMeetingCount.get(match.attendeeId) ?? 0;
      if (currentDelegateCount >= DELEGATE_MAX_MEETINGS) continue;

      let assignedRep: number | null = null;
      let availableSlot: number | null = null;

      const delegateSlots = delegateUsedSlots.get(match.attendeeId) ?? new Set<number>();

      // Try Rep 1 first
      if (rep1Count < rep1Quota) {
        const rep1Slots = sponsorSlots.get(1)!;
        const slot = ALL_SLOTS.find(s => !delegateSlots.has(s) && !rep1Slots.has(s)) ?? null;
        if (slot !== null) {
          assignedRep = 1;
          availableSlot = slot;
        }
      }

      // Try Rep 2 if Rep 1 couldn't take it
      if (assignedRep === null && rep2Count < rep2Quota) {
        const rep2Slots = sponsorSlots.get(2)!;
        const slot = ALL_SLOTS.find(s => !delegateSlots.has(s) && !rep2Slots.has(s)) ?? null;
        if (slot !== null) {
          assignedRep = 2;
          availableSlot = slot;
        }
      }

      if (assignedRep === null || availableSlot === null) {
        continue; // No slot available — skip this delegate
      }

      // Commit
      delegateSlots.add(availableSlot);
      sponsorSlots.get(assignedRep)!.add(availableSlot);
      delegateUsedSlots.set(match.attendeeId, delegateSlots);
      delegateMeetingCount.set(match.attendeeId, currentDelegateCount + 1);
      assignedDelegates.add(match.attendeeId);

      if (assignedRep === 1) rep1Count++;
      else rep2Count++;

      const sponsorRepName = assignedRep === 2 ? repName2 : repName1;
      matchesWithSlots.push({ ...match, timeSlot: availableSlot, attendeeNumber: assignedRep, sponsorRepName });
    }

    const sponsorName = intakeSubmission?.companyName || `Sponsor ${sponsorId}`;
    console.log(`  ${sponsorName}: ${matchesWithSlots.length}/${targetMeetingCount} meetings (Rep1: ${rep1Count}/${rep1Quota}, Rep2: ${rep2Count}/${rep2Quota})`);

    // Save to database
    await db.deleteMeetingsBySponsor(sponsorId);
    for (const meeting of matchesWithSlots) {
      const safeReason = (meeting.matchReason || '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\r\n|\r/g, ' ')
        .trim();
      await db.createMeeting({
        sponsorId,
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

    savedResults.push({ sponsorId, sponsorName, meetingCount: matchesWithSlots.length, target: targetMeetingCount });
  }

  console.log("\n=== RESULTS SUMMARY ===");
  let totalMeetings = 0;
  let missingQuota = 0;
  for (const r of savedResults) {
    const status = r.meetingCount >= r.target ? "✓" : `⚠ MISSING ${r.target - r.meetingCount}`;
    console.log(`  ${r.sponsorName}: ${r.meetingCount}/${r.target} ${status}`);
    totalMeetings += r.meetingCount;
    if (r.meetingCount < r.target) missingQuota++;
  }
  console.log(`\nTotal: ${totalMeetings} meetings across ${savedResults.length} sponsors`);
  if (missingQuota > 0) {
    console.log(`WARNING: ${missingQuota} sponsors did not meet their quota`);
  } else {
    console.log("All sponsors met their quota ✓");
  }

  // Validate constraints
  console.log("\n=== CONSTRAINT VALIDATION ===");
  const allMeetings = await db.getAllMeetings();
  const suggested = allMeetings.filter(m => m.status === 'suggested');

  // Check delegate slot clashes
  const delegateSlotMap = new Map<string, Map<number, number>>();
  let delegateClashes = 0;
  for (const m of suggested) {
    if (!m.timeSlot) continue;
    if (!delegateSlotMap.has(m.attendeeId)) delegateSlotMap.set(m.attendeeId, new Map());
    const slots = delegateSlotMap.get(m.attendeeId)!;
    const count = (slots.get(m.timeSlot) || 0) + 1;
    slots.set(m.timeSlot, count);
    if (count > 1) delegateClashes++;
  }
  console.log(`Delegate slot clashes: ${delegateClashes} (should be 0)`);

  // Check sponsor rep slot clashes
  const sponsorRepSlotMap = new Map<string, number>();
  let sponsorClashes = 0;
  for (const m of suggested) {
    if (!m.timeSlot) continue;
    const key = `${m.sponsorId}-${m.attendeeNumber}-${m.timeSlot}`;
    const count = (sponsorRepSlotMap.get(key) || 0) + 1;
    sponsorRepSlotMap.set(key, count);
    if (count > 1) sponsorClashes++;
  }
  console.log(`Sponsor rep slot clashes: ${sponsorClashes} (should be 0)`);

  // Check duplicate vendor-delegate pairs
  const pairMap = new Map<string, number>();
  let duplicatePairs = 0;
  for (const m of suggested) {
    const key = `${m.sponsorId}-${m.attendeeId}`;
    const count = (pairMap.get(key) || 0) + 1;
    pairMap.set(key, count);
    if (count > 1) duplicatePairs++;
  }
  console.log(`Duplicate vendor-delegate pairs: ${duplicatePairs} (should be 0)`);

  // Check delegate meeting counts
  const delegateCounts = new Map<string, number>();
  for (const m of suggested) {
    delegateCounts.set(m.attendeeId, (delegateCounts.get(m.attendeeId) || 0) + 1);
  }
  const overCap = Array.from(delegateCounts.entries()).filter(([, count]) => count > 8);
  console.log(`Delegates over 8-meeting cap: ${overCap.length} (should be 0)`);
  if (overCap.length > 0) {
    overCap.forEach(([id, count]) => console.log(`  Delegate ${id}: ${count} meetings`));
  }

  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
