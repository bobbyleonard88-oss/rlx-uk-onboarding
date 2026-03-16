/**
 * topup-matches.ts
 * 
 * Re-runs AI matching for sponsors that are short of their target meeting count.
 * Seeds the slot/cap tracker from existing meetings so no double-booking occurs.
 * Raises the per-delegate cap to 12 to allow later sponsors to fill up.
 */
import 'dotenv/config';
import * as db from './server/db';
import { generateMeetingsForAllSponsors } from './server/matchingAlgorithm';

const ALL_SLOTS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
const DELEGATE_MAX_MEETINGS = 12; // Raised from 8 to allow later sponsors to fill up
const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);

// Sponsors to top up (IDs confirmed from check-packages output)
// We'll re-run ALL real sponsors but only save for those that are short
// Actually, we'll only run the short ones to save time.
const SHORT_SPONSOR_IDS = new Set([
  270002, // Appcast - short 2 (on 20-meeting package)
  720001, // inploi - short 1
  750001, // SHL - short 1 (on 20-meeting package)
  780001, // The Martec - short 4
  810001, // Veremark - short 3
  810002, // Radancy - short 3
  840001, // JobSync - short 4
  870001, // Wilson - short 7 (on 20-meeting package)
  900001, // Poetry - short 7
]);

async function main() {
  console.log('\n=== RLX Top-Up Matching Run ===');
  console.log('Starting at:', new Date().toISOString());
  console.log(`Delegate cap raised to: ${DELEGATE_MAX_MEETINGS}`);
  console.log('');

  const allSponsors = await db.getAllSponsors();
  const allIntake = await db.getAllIntakeSubmissions();
  const intakeMap = new Map(allIntake.map(s => [s.sponsorId, s]));

  // Seed slot tracker from ALL existing meetings (not just short sponsors)
  // so we don't double-book delegates who already have meetings
  const existingMeetings = await db.getAllMeetings();
  const delegateUsedSlots = new Map<string, Set<number>>();
  const delegateMeetingCount = new Map<string, number>();
  const sponsorUsedSlots = new Map<number, Map<number, Set<number>>>();

  for (const m of existingMeetings) {
    if (TEST_SPONSOR_IDS.has(m.sponsorId)) continue;
    // Skip meetings for the short sponsors — we'll replace them entirely
    if (SHORT_SPONSOR_IDS.has(m.sponsorId)) continue;

    // Track delegate slot usage
    if (m.timeSlot !== null && m.timeSlot !== undefined) {
      const slots = delegateUsedSlots.get(m.attendeeId) ?? new Set<number>();
      slots.add(m.timeSlot);
      delegateUsedSlots.set(m.attendeeId, slots);
    }
    // Track delegate meeting count
    delegateMeetingCount.set(m.attendeeId, (delegateMeetingCount.get(m.attendeeId) ?? 0) + 1);

    // Track sponsor slot usage
    if (m.timeSlot !== null && m.timeSlot !== undefined) {
      if (!sponsorUsedSlots.has(m.sponsorId)) {
        sponsorUsedSlots.set(m.sponsorId, new Map([[1, new Set<number>()], [2, new Set<number>()]]));
      }
      const attendeeNum = m.attendeeNumber ?? 1;
      const sponsorSlots = sponsorUsedSlots.get(m.sponsorId)!;
      const attendeeSlots = sponsorSlots.get(attendeeNum) ?? new Set<number>();
      attendeeSlots.add(m.timeSlot);
      sponsorSlots.set(attendeeNum, attendeeSlots);
    }
  }

  console.log('Seeded slot tracker from existing meetings.');
  console.log(`Delegates with existing meetings: ${delegateMeetingCount.size}`);
  console.log(`Delegates at or near new cap (>=10): ${[...delegateMeetingCount.values()].filter(c => c >= 10).length}`);
  console.log('');

  // Run AI matching for only the short sponsors
  const shortSponsorIdsForExclusion = new Set([
    ...Array.from(TEST_SPONSOR_IDS),
    // Exclude all sponsors EXCEPT the short ones from the matching run
    ...allSponsors
      .filter(s => !TEST_SPONSOR_IDS.has(s.id) && !SHORT_SPONSOR_IDS.has(s.id))
      .map(s => s.id),
  ]);

  const allMatchResults = await generateMeetingsForAllSponsors(
    (event) => {
      if (event.type === 'start') {
        console.log(`Matching ${event.totalSponsors} short sponsors...`);
      } else if (event.type === 'scoring_start') {
        process.stdout.write(`  [${(event.completedSponsors ?? 0) + 1}/${event.totalSponsors}] ${event.sponsorName} — AI scoring...`);
      } else if (event.type === 'scoring_complete') {
        process.stdout.write(` done (${event.meetingCount} candidates)\n`);
      } else if (event.type === 'sponsor_error') {
        process.stdout.write(` ERROR: ${event.error}\n`);
      }
    },
    shortSponsorIdsForExclusion
  );

  console.log(`\nAI scoring complete for ${allMatchResults.size} sponsors. Saving to database...\n`);

  let completedCount = 0;
  let errorCount = 0;

  for (const [sponsorId, matches] of allMatchResults) {
    const intakeSubmission = intakeMap.get(sponsorId);
    const meetingCount = intakeSubmission?.meetingPackage === '20' ? 20 : 12;
    const sponsor = allSponsors.find(s => s.id === sponsorId);
    const sponsorName = sponsor?.companyName || `Sponsor ${sponsorId}`;

    try {
      const halfCount = Math.ceil(meetingCount / 2);
      const hasTwoAttendees = meetingCount > 12;

      if (!sponsorUsedSlots.has(sponsorId)) {
        sponsorUsedSlots.set(sponsorId, new Map([[1, new Set<number>()], [2, new Set<number>()]]));
      }
      const sponsorSlots = sponsorUsedSlots.get(sponsorId)!;

      const repName1 = intakeSubmission
        ? `${intakeSubmission.firstName} ${intakeSubmission.lastName}`.trim()
        : 'Attendee 1';
      const repName2 = intakeSubmission?.secondRepName?.trim() || repName1;

      const matchesWithSlots: any[] = [];
      for (let i = 0; i < (matches as any[]).length; i++) {
        const match = (matches as any[])[i];
        const currentDelegateCount = delegateMeetingCount.get(match.attendeeId) ?? 0;
        if (currentDelegateCount >= DELEGATE_MAX_MEETINGS) continue;

        const attendeeNumber = hasTwoAttendees ? (i < halfCount ? 1 : 2) : 1;
        const sponsorRepName = attendeeNumber === 2 ? repName2 : repName1;

        const delegateSlots = delegateUsedSlots.get(match.attendeeId) ?? new Set<number>();
        const sponsorAttendeeSlots = sponsorSlots.get(attendeeNumber) ?? new Set<number>();

        const availableSlot = ALL_SLOTS.find(
          slot => !delegateSlots.has(slot) && !sponsorAttendeeSlots.has(slot)
        ) ?? null;

        if (availableSlot !== null) {
          delegateSlots.add(availableSlot);
          sponsorAttendeeSlots.add(availableSlot);
          delegateUsedSlots.set(match.attendeeId, delegateSlots);
          sponsorSlots.set(attendeeNumber, sponsorAttendeeSlots);
          delegateMeetingCount.set(match.attendeeId, currentDelegateCount + 1);
        }

        matchesWithSlots.push({ ...match, timeSlot: availableSlot, attendeeNumber, sponsorRepName });
      }

      // Delete existing meetings for this sponsor and save new ones
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

      completedCount++;
      const target = meetingCount;
      const got = matchesWithSlots.length;
      const flag = got < target ? ` *** STILL SHORT BY ${target - got}` : '';
      console.log(`  ✓ ${sponsorName}: ${got}/${target} meetings saved${flag}`);
    } catch (err) {
      errorCount++;
      console.error(`  ✗ ${sponsorName}: SAVE FAILED — ${err}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log(`Sponsors updated: ${completedCount}`);
  if (errorCount > 0) console.log(`Errors: ${errorCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
