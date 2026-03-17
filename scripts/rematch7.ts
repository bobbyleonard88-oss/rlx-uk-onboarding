/**
 * Re-run AI matching for 7 sponsors with the new 90%+ opt-in scoring.
 * Clears existing meetings for each sponsor and regenerates with slot assignment.
 * Run with: npx tsx scripts/rematch7.ts
 */

import * as db from '../server/db';
import { generateMeetingsForSponsor } from '../server/matchingAlgorithm';

const SPONSORS = [
  { id: 540001, name: 'hackajob',                   quota: 12 },
  { id: 600001, name: 'Happydance Careers Websites', quota: 12 },
  { id: 210001, name: 'Harver',                     quota: 20 },
  { id: 720001, name: 'inploi',                     quota: 12 },
  { id: 810002, name: 'Radancy',                    quota: 12 },
  { id: 390001, name: 'Bright Apply',               quota: 10 }, // actual cap is 10
  { id: 330001, name: 'Symphony Talent',            quota: 12 },
];

// All valid time slots
const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

async function main() {
  console.log('=== Re-matching 7 sponsors with 90%+ opt-in scoring ===\n');

  // Load ALL existing meetings so we can respect delegate slot conflicts across sponsors
  const allExistingMeetings = await db.getAllMeetings();
  
  // Build slot usage maps from meetings NOT belonging to the 7 sponsors being re-run
  const targetSponsorIds = new Set(SPONSORS.map(s => s.id));
  const otherMeetings = allExistingMeetings.filter(m => !targetSponsorIds.has(m.sponsorId));
  
  // delegateUsedSlots: delegateId → Set<timeSlot>
  const delegateUsedSlots = new Map<string, Set<number>>();
  for (const m of otherMeetings) {
    if (m.timeSlot) {
      if (!delegateUsedSlots.has(m.attendeeId)) delegateUsedSlots.set(m.attendeeId, new Set());
      delegateUsedSlots.get(m.attendeeId)!.add(m.timeSlot);
    }
  }

  // delegateMeetingCount: delegateId → total meetings from other sponsors
  const delegateMeetingCount = new Map<string, number>();
  for (const m of otherMeetings) {
    delegateMeetingCount.set(m.attendeeId, (delegateMeetingCount.get(m.attendeeId) || 0) + 1);
  }

  const DELEGATE_MAX_MEETINGS = 8;

  for (const sponsor of SPONSORS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${sponsor.name} (ID: ${sponsor.id}, quota: ${sponsor.quota})`);
    console.log('─'.repeat(60));

    try {
      // Step 1: Generate matches via AI
      console.log(`  Running AI matching...`);
      const matches = await generateMeetingsForSponsor(sponsor.id, sponsor.quota);
      console.log(`  AI returned ${matches.length} candidates`);

      // Step 2: Assign time slots
      // sponsorUsedSlots: repNumber → Set<timeSlot>
      const sponsorUsedSlots = new Map<number, Set<number>>();
      const assignedMeetings: Array<{
        attendeeId: string;
        matchScore: number;
        matchReason: string;
        isPriority: boolean;
        isTopRanked: boolean;
        isTop20: boolean;
        timeSlot: number | null;
        attendeeNumber: number;
      }> = [];

      // Determine number of reps for this sponsor (2 reps for 20-meeting sponsors, 1 for 12)
      const numReps = sponsor.quota >= 20 ? 2 : 1;
      for (let r = 1; r <= numReps; r++) {
        sponsorUsedSlots.set(r, new Set());
      }

      for (const match of matches) {
        const delegateCount = delegateMeetingCount.get(match.attendeeId) || 0;
        if (delegateCount >= DELEGATE_MAX_MEETINGS) {
          console.log(`  SKIP (at cap): ${match.delegateInfo.firstName} ${match.delegateInfo.lastName}`);
          continue;
        }

        const delegateSlots = delegateUsedSlots.get(match.attendeeId) || new Set();

        // Find an available slot for this delegate
        let assignedSlot: number | null = null;
        let assignedRep = 1;

        for (let rep = 1; rep <= numReps; rep++) {
          const repSlots = sponsorUsedSlots.get(rep)!;
          for (const slot of ALL_SLOTS) {
            if (!repSlots.has(slot) && !delegateSlots.has(slot)) {
              assignedSlot = slot;
              assignedRep = rep;
              break;
            }
          }
          if (assignedSlot !== null) break;
        }

        if (assignedSlot === null) {
          console.log(`  SKIP (no slot): ${match.delegateInfo.firstName} ${match.delegateInfo.lastName}`);
          continue;
        }

        // Reserve the slot
        sponsorUsedSlots.get(assignedRep)!.add(assignedSlot);
        if (!delegateUsedSlots.has(match.attendeeId)) delegateUsedSlots.set(match.attendeeId, new Set());
        delegateUsedSlots.get(match.attendeeId)!.add(assignedSlot);
        delegateMeetingCount.set(match.attendeeId, delegateCount + 1);

        const optInTag = match.matchReason?.includes('opted in') ? ' [OPT-IN]' : '';
        console.log(`  + ${match.delegateInfo.firstName} ${match.delegateInfo.lastName} (${match.delegateInfo.company}) — ${match.matchScore}% slot ${assignedSlot} rep${assignedRep}${optInTag}`);

        assignedMeetings.push({
          attendeeId: match.attendeeId,
          matchScore: match.matchScore,
          matchReason: match.matchReason,
          isPriority: match.isPriority,
          isTopRanked: match.isTopRanked,
          isTop20: match.isTop20,
          timeSlot: assignedSlot,
          attendeeNumber: assignedRep,
        });
      }

      // Step 3: Delete existing meetings for this sponsor
      await db.deleteMeetingsBySponsor(sponsor.id);
      console.log(`  Cleared existing meetings`);

      // Step 4: Save new meetings
      for (const meeting of assignedMeetings) {
        await db.createMeeting({
          sponsorId: sponsor.id,
          attendeeId: meeting.attendeeId,
          matchScore: meeting.matchScore,
          matchReason: meeting.matchReason,
          isTopRanked: meeting.isTopRanked ? 1 : 0,
          isPriority: meeting.isPriority ? 1 : 0,
          timeSlot: meeting.timeSlot,
          attendeeNumber: meeting.attendeeNumber,
          status: 'suggested',
          notes: null,
        });
      }

      console.log(`  ✓ Saved ${assignedMeetings.length} meetings for ${sponsor.name}`);

    } catch (err: any) {
      console.error(`  ✗ Error processing ${sponsor.name}:`, err.message || err);
    }
  }

  console.log('\n✓ All done!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
