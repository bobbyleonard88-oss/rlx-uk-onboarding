/**
 * run-match-final.ts
 * 
 * Final AI matching run for all 21 real sponsors.
 * 
 * Strategy:
 * - Run 20-meeting sponsors FIRST (Harver, Appcast, SHL, Wilson) so they get first pick
 *   of the delegate pool before the 8-meeting cap fills up.
 * - Then run all 12-meeting sponsors in intake order.
 * - Delegate cap: 8 meetings max.
 * - Full AI scoring for every sponsor.
 * - All existing client hard exclusions respected.
 * - No slot conflicts (delegate or sponsor rep can't be in two places at once).
 * - Opt-in meetings go to top of ranking.
 * 
 * Run order (IDs):
 * Phase 1 (20-meeting): 210001 (Harver), 270002 (Appcast), 750001 (SHL), 870001 (Wilson)
 * Phase 2 (12-meeting): 150001, 180001, 240001, 300001, 330001, 360001, 390001, 450001,
 *                       540001, 600001, 690001, 720001, 780001, 810001, 810002, 840001, 900001
 */
import 'dotenv/config';
import * as db from './server/db';
import { generateMeetingsForAllSponsors } from './server/matchingAlgorithm';

const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
const VISIBILITY_TEST_NAMES = ['visibility test', 'mtgtest'];

// Ordered run: most-constrained (largest quota) first, Happydance last (flexible quota)
// Packages corrected:
//   SHL: 24 meetings (most constrained — goes first)
//   Harver: 20 meetings
//   Appcast: 20 meetings
//   Bright Apply: 10 meetings
//   Wilson: 12 meetings
//   Happydance: whatever is left over (runs last)

// Override meeting packages where the intake form has wrong values
const PACKAGE_OVERRIDES: Record<number, number | 'leftover'> = {
  750001: 24,        // SHL: 24 meetings
  870001: 12,        // Wilson: 12 meetings (not 20)
  390001: 10,        // Bright Apply: 10 meetings
  600001: 'leftover', // Happydance: whatever is left
};
const ORDERED_SPONSOR_IDS = [
  750001, // SHL (24 meetings) — most constrained, goes first
  210001, // Harver (20 meetings)
  270002, // Appcast (20 meetings)
  150001, // Stepstone Group UK Ltd (12)
  180001, // Maki People (12)
  240001, // Sapia.ai (12)
  300001, // Zinc (12)
  330001, // Symphony Talent (12)
  360001, // Udder (12)
  450001, // PerchPeek (12)
  540001, // hackajob (12)
  690001, // Amberjack (12)
  720001, // inploi (12)
  780001, // The Martec (12)
  810001, // Veremark (12)
  810002, // Radancy (12)
  840001, // JobSync (12)
  900001, // Poetry (12)
  870001, // Wilson (12 meetings)
  390001, // Bright Apply (10 meetings)
  // 600001 Happydance excluded for now — will be handled separately
];

// 12 time slots. Each slot is 1 hour with two 30-min meeting windows.
// A delegate can attend up to 2 meetings per slot (one in each 30-min window).
// We track slot usage as Map<attendeeId, Map<slotNumber, count>> where count can be 0, 1, or 2.
const ALL_SLOTS = [1,2,3,4,5,6,7,8,9,10,11,12];
const MAX_MEETINGS_PER_SLOT = 2; // 2 x 30-min meetings per 1-hour slot

async function main() {
  console.log('\n=== RLX Match All — Final Optimised Run ===');
  console.log('Starting at:', new Date().toISOString());
  console.log('Strategy: 20-meeting sponsors first, then 12-meeting sponsors');
  console.log('Delegate cap: 8 meetings max');
  console.log('');

  const allSponsors = await db.getAllSponsors();
  const allIntake = await db.getAllIntakeSubmissions();
  const intakeMap = new Map(allIntake.map(s => [s.sponsorId, s]));

  // Validate all expected sponsor IDs exist
  const sponsorMap = new Map(allSponsors.map(s => [s.id, s]));
  for (const id of ORDERED_SPONSOR_IDS) {
    if (!sponsorMap.has(id)) {
      console.error(`ERROR: Sponsor ID ${id} not found in database! Aborting.`);
      process.exit(1);
    }
  }
  console.log(`All ${ORDERED_SPONSOR_IDS.length} sponsor IDs validated.\n`);

  // Build the exclusion set: everything EXCEPT our ordered list
  const allRealSponsorIds = allSponsors
    .filter(s => 
      !TEST_SPONSOR_IDS.has(s.id) && 
      s.companyName &&
      !VISIBILITY_TEST_NAMES.some(n => s.companyName!.toLowerCase().includes(n))
    )
    .map(s => s.id);

  const excludeFromRun = new Set([
    ...Array.from(TEST_SPONSOR_IDS),
    ...allRealSponsorIds.filter(id => !ORDERED_SPONSOR_IDS.includes(id)),
  ]);

  // Run AI matching for all sponsors in the ordered sequence
  const allMatchResults = await generateMeetingsForAllSponsors(
    (event) => {
      if (event.type === 'start') {
        console.log(`Matching ${event.totalSponsors} sponsors in optimised order...`);
      } else if (event.type === 'scoring_start') {
        const intake = intakeMap.get(event.sponsorId ?? 0);
        const pkg = intake?.meetingPackage === '20' ? '20' : '12';
        process.stdout.write(`  [${(event.completedSponsors ?? 0) + 1}/${event.totalSponsors}] ${event.sponsorName} (${pkg} meetings) — AI scoring...`);
      } else if (event.type === 'scoring_complete') {
        process.stdout.write(` done (${event.meetingCount} candidates)\n`);
      } else if (event.type === 'sponsor_error') {
        process.stdout.write(` ERROR: ${event.error}\n`);
      }
    },
    excludeFromRun,
    ORDERED_SPONSOR_IDS // Pass the ordered list so sponsors run in this exact sequence
  );

  console.log(`\nAI scoring complete for ${allMatchResults.size} sponsors. Saving to database...\n`);

  // Slot assignment model:
  // - 12 time slots, each 1 hour with 2 x 30-min rounds
  // - All 21 sponsors run simultaneously in every slot
  // - A delegate can meet 2 sponsors per slot (one per round)
  // - A delegate cannot meet the same sponsor twice
  // - Delegate hard cap: 8 meetings total
  //
  // delegateSlotCounts: attendeeId -> Map<slotNumber, roundsUsed> (max 2 per slot)
  // sponsorDelegateSlotRound: sponsorId -> Map<attendeeId, {slot, round}> (prevent duplicate sponsor-delegate)
  const delegateSlotCounts = new Map<string, Map<number, number>>(); // attendeeId -> slot -> count (0|1|2)
  const delegateMeetingCount = new Map<string, number>(); // attendeeId -> total meetings
  // No sponsor rep slot conflict — all sponsors available every slot

  let completedCount = 0;
  let errorCount = 0;
  const summary: Array<{name: string, target: number, got: number}> = [];

  // Process in the ordered sequence
  for (const sponsorId of ORDERED_SPONSOR_IDS) {
    const matches = allMatchResults.get(sponsorId);
    if (!matches) {
      console.error(`  ✗ Sponsor ${sponsorId}: No match results returned`);
      errorCount++;
      continue;
    }

    const intake = intakeMap.get(sponsorId);
    const sponsor = sponsorMap.get(sponsorId)!;
    const sponsorName = sponsor.companyName || `Sponsor ${sponsorId}`;

    // Determine meeting count: use override if set, else read from intake, else default 12
    const pkgOverride = PACKAGE_OVERRIDES[sponsorId];
    let meetingCount: number;
    if (pkgOverride === 'leftover') {
      // Happydance: count how many delegate slots are still available (not yet at cap 8)
      const availableSlots = [...delegateMeetingCount.entries()].filter(([, c]) => c < 8).length;
      // Also count delegates who haven't appeared in delegateMeetingCount yet (0 meetings)
      // We need total eligible delegates minus those already at cap
      const allDelegateIds = new Set<string>();
      for (const [id] of delegateSlotCounts) allDelegateIds.add(id);
      const totalWithRoom = 39 - [...delegateMeetingCount.values()].filter(c => c >= 8).length;
      meetingCount = Math.min(totalWithRoom, 12); // cap at 12 even for leftover
      console.log(`  [Happydance] Leftover mode: ${totalWithRoom} delegate slots available, targeting ${meetingCount} meetings`);
    } else if (typeof pkgOverride === 'number') {
      meetingCount = pkgOverride;
    } else {
      meetingCount = intake?.meetingPackage === '20' ? 20 : 12;
    }

    try {
      const halfCount = Math.ceil(meetingCount / 2);
      const hasTwoAttendees = meetingCount > 12;

      const repName1 = intake
        ? `${intake.firstName} ${intake.lastName}`.trim()
        : 'Attendee 1';
      const repName2 = intake?.secondRepName?.trim() || repName1;

      const matchesWithSlots: any[] = [];
      for (let i = 0; i < (matches as any[]).length; i++) {
        // Stop once we've filled the sponsor's quota
        if (matchesWithSlots.length >= meetingCount) break;

        const match = (matches as any[])[i];
        const currentDelegateCount = delegateMeetingCount.get(match.attendeeId) ?? 0;
        if (currentDelegateCount >= 8) continue; // Hard cap at 8

        const attendeeNumber = hasTwoAttendees ? (i < halfCount ? 1 : 2) : 1;
        const sponsorRepName = attendeeNumber === 2 ? repName2 : repName1;

        // Find a slot where this delegate has < 2 meetings (2 rounds per slot)
        // No sponsor-rep conflict — all sponsors run simultaneously
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

      // Delete all existing meetings for this sponsor and save new ones
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
      const got = matchesWithSlots.length;
      const flag = got < meetingCount ? ` *** SHORT BY ${meetingCount - got}` : '';
      console.log(`  ✓ ${sponsorName}: ${got}/${meetingCount} meetings saved${flag}`);
      summary.push({ name: sponsorName, target: meetingCount, got });
    } catch (err) {
      errorCount++;
      console.error(`  ✗ ${sponsorName}: SAVE FAILED — ${err}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log(`Sponsors matched: ${completedCount}`);
  if (errorCount > 0) console.log(`Errors: ${errorCount}`);

  const short = summary.filter(s => s.got < s.target);
  if (short.length === 0) {
    console.log(`\n✅ ALL SPONSORS HIT THEIR QUOTA!`);
  } else {
    console.log(`\n⚠️  ${short.length} sponsor(s) still short:`);
    for (const s of short) {
      console.log(`   ${s.name}: ${s.got}/${s.target}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
