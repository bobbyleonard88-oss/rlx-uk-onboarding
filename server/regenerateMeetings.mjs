/**
 * Script: regenerateMeetings.mjs
 * Clears and regenerates meetings for all real sponsors using the correct
 * 12-slot structure (6 per day, 2×30-min per 1-hour block).
 *
 * Run with: node server/regenerateMeetings.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Load env
import { config } from "dotenv";
config();

// We call the tRPC HTTP API directly so we can reuse the existing auth + logic
const BASE_URL = "http://localhost:3000";

// Admin session cookie — we need to authenticate as admin
// We'll use the internal API via a direct import instead

async function main() {
  console.log("Loading matching algorithm and DB helpers...");
  
  // Dynamic imports (ESM-compatible)
  const { generateMeetingsForSponsor } = await import("./matchingAlgorithm.ts");
  const db = await import("./db.ts");

  const allSponsors = await db.getAllSponsors();
  console.log(`Found ${allSponsors.length} sponsors total`);

  // Slot assignment: 12-meeting package (1 attendee) → slots 1-6 Day 1, 7-12 Day 2
  //                  20-meeting package (2 attendees) → 10 per attendee
  const DAY1_SLOTS_COUNT = 6;
  const DAY2_START = 7;

  function assignSlots(matches, meetingCount) {
    const is20 = meetingCount === 20;
    return matches.map((match, index) => {
      const attendeeNumber = is20 ? (index < 10 ? 1 : 2) : 1;
      const attendeeIndex = is20 ? (index < 10 ? index : index - 10) : index;

      let timeSlot = null;
      if (is20) {
        if (attendeeIndex < 5) timeSlot = attendeeIndex + 1;
        else if (attendeeIndex < 10) timeSlot = (attendeeIndex - 5) + DAY2_START;
      } else {
        if (attendeeIndex < DAY1_SLOTS_COUNT) timeSlot = attendeeIndex + 1;
        else if (attendeeIndex < DAY1_SLOTS_COUNT * 2) timeSlot = (attendeeIndex - DAY1_SLOTS_COUNT) + DAY2_START;
      }

      return { ...match, timeSlot, attendeeNumber };
    });
  }

  let successCount = 0;
  let failCount = 0;

  for (const sponsor of allSponsors) {
    const intake = await db.getIntakeSubmissionBySponsor(sponsor.id);
    if (!intake) {
      console.log(`  ⚠️  Sponsor ${sponsor.id} (${sponsor.companyName}) — no intake form, skipping`);
      continue;
    }

    const meetingCount = intake.meetingPackage === "20" ? 20 : 12;
    console.log(`\n→ Sponsor ${sponsor.id}: ${sponsor.companyName} (${meetingCount} meetings)`);

    try {
      // 1. Clear existing meetings
      await db.deleteMeetingsBySponsor(sponsor.id);
      console.log(`  ✓ Cleared existing meetings`);

      // 2. Generate new matches
      const matches = await generateMeetingsForSponsor(sponsor.id, meetingCount);
      console.log(`  ✓ Generated ${matches.length} matches`);

      // 3. Assign time slots
      const matchesWithSlots = assignSlots(matches, meetingCount);

      // 4. Save to database
      for (const meeting of matchesWithSlots) {
        await db.createMeeting({
          sponsorId: sponsor.id,
          attendeeId: meeting.attendeeId,
          matchScore: meeting.matchScore,
          matchReason: meeting.matchReason,
          isTopRanked: meeting.isTopRanked ? 1 : 0,
          isPriority: meeting.isPriority ? 1 : 0,
          timeSlot: meeting.timeSlot ?? null,
          attendeeNumber: meeting.attendeeNumber ?? 1,
          status: "suggested",
          notes: null,
        });
      }
      console.log(`  ✓ Saved ${matchesWithSlots.length} meetings with slots`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Failed for sponsor ${sponsor.id}: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n✅ Done: ${successCount} sponsors regenerated, ${failCount} failed`);
}

main().catch(console.error);
