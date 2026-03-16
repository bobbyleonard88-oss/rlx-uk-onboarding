/**
 * run-match-all.mjs
 * 
 * Standalone script to run AI matching for ALL sponsors and save to the production database.
 * Run with: node run-match-all.mjs
 * 
 * This bypasses the browser/HTTP entirely — no Cloudflare timeout, no SSE needed.
 * It uses the same matching algorithm as the web app.
 */

import { config } from 'dotenv';
config();

// We need to import the TypeScript modules via tsx
import { createRequire } from 'module';
import { execSync, spawn } from 'child_process';
import { writeFileSync } from 'fs';

// Write a small TS runner script that we'll execute with tsx
const tsScript = `
import 'dotenv/config';
import * as db from './server/db.js';
import { generateMeetingsForAllSponsors } from './server/matchingAlgorithm.js';

const ALL_SLOTS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
const DELEGATE_MAX_MEETINGS = 8;

async function main() {
  console.log('\\n=== RLX Match All — Direct Sandbox Run ===');
  console.log('Starting at:', new Date().toISOString());
  console.log('');

  // Get all sponsors to check for test accounts
  const allSponsors = await db.getAllSponsors();
  const allUsers = await db.getAllUsers();
  
  // Build a set of test account sponsor IDs (users with "test" in their email or name)
  const testUserIds = new Set(
    allUsers
      .filter(u => 
        (u.email && u.email.toLowerCase().includes('test')) ||
        (u.name && u.name.toLowerCase().includes('test'))
      )
      .map(u => u.id)
  );
  const testSponsorIds = new Set(
    allSponsors
      .filter(s => s.userId && testUserIds.has(s.userId))
      .map(s => s.id)
  );
  console.log(\`Found \${testSponsorIds.size} test sponsor(s) to exclude\`);

  // Track global slot usage across all sponsors (same logic as the web app)
  const delegateUsedSlots = new Map<string, Set<number>>();
  const delegateMeetingCount = new Map<string, number>();
  const sponsorUsedSlots = new Map<number, Map<number, Set<number>>>();

  let completedCount = 0;
  let errorCount = 0;

  // Run AI matching for all sponsors
  const allMatchResults = await generateMeetingsForAllSponsors(
    (event) => {
      if (event.type === 'start') {
        console.log(\`\\nMatching \${event.totalSponsors} sponsors...\`);
      } else if (event.type === 'scoring_start') {
        process.stdout.write(\`  [\${event.completedSponsors! + 1}/\${event.totalSponsors}] \${event.sponsorName} — AI scoring...\`);
      } else if (event.type === 'scoring_complete') {
        process.stdout.write(\` done (\${event.meetingCount} matches)\\n\`);
      } else if (event.type === 'sponsor_error') {
        process.stdout.write(\` ERROR: \${event.error}\\n\`);
      }
    },
    testSponsorIds
  );

  console.log(\`\\nAI scoring complete for \${allMatchResults.size} sponsors. Saving to database...\\n\`);

  // Get all intake submissions for rep name resolution
  const allIntake = await db.getAllIntakeSubmissions();
  const intakeMap = new Map(allIntake.map(s => [s.sponsorId, s]));

  // Save meetings for each sponsor (same slot-assignment logic as the web app)
  for (const [sponsorId, matches] of allMatchResults) {
    const intakeSubmission = intakeMap.get(sponsorId);
    const meetingCount = intakeSubmission?.meetingPackage === "20" ? 20 : 12;
    const sponsor = allSponsors.find(s => s.id === sponsorId);
    const sponsorName = sponsor?.companyName || \`Sponsor \${sponsorId}\`;

    try {
      const halfCount = Math.ceil(meetingCount / 2);
      const hasTwoAttendees = meetingCount > 12;

      if (!sponsorUsedSlots.has(sponsorId)) {
        sponsorUsedSlots.set(sponsorId, new Map([[1, new Set<number>()], [2, new Set<number>()]]));
      }
      const sponsorSlots = sponsorUsedSlots.get(sponsorId)!;

      const repName1 = intakeSubmission
        ? \`\${intakeSubmission.firstName} \${intakeSubmission.lastName}\`.trim()
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

      // Delete existing meetings and save new ones
      await db.deleteMeetingsBySponsor(sponsorId);
      for (const meeting of matchesWithSlots) {
        const safeReason = (meeting.matchReason || '')
          .replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '')
          .replace(/\\r\\n|\\r/g, ' ')
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
      console.log(\`  ✓ \${sponsorName}: \${matchesWithSlots.length} meetings saved\`);
    } catch (err) {
      errorCount++;
      console.error(\`  ✗ \${sponsorName}: SAVE FAILED — \${err}\`);
    }
  }

  console.log(\`\\n=== COMPLETE ===\`);
  console.log(\`Finished at: \${new Date().toISOString()}\`);
  console.log(\`Sponsors matched: \${completedCount}\`);
  if (errorCount > 0) console.log(\`Errors: \${errorCount}\`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
`;

writeFileSync('/home/ubuntu/rlx-onboarding/run-match-all-inner.ts', tsScript);
console.log('Inner script written. Run with: cd /home/ubuntu/rlx-onboarding && npx tsx run-match-all-inner.ts');
