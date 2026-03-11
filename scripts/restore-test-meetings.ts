/**
 * Restore test account meetings after wipe
 * Regenerates meetings for the 4 test sponsors and saves them with correct time slots
 */
import { generateMeetingsForSponsor } from '../server/matchingAlgorithm';
import * as db from '../server/db';

const TEST_SPONSORS = [
  { id: 30001, name: 'AI Limited', meetingCount: 12 },
  { id: 60001, name: 'Elevate Assess', meetingCount: 12 },
  { id: 90001, name: 'NexaTalent Solutions Ltd', meetingCount: 20 },
  { id: 120001, name: 'Little Moment', meetingCount: 12 },
];

function assignTimeSlots(meetings: any[], meetingCount: number): any[] {
  // For 12 meetings: 6 per day (slots 1-6 Day 1, 7-12 Day 2)
  // For 20 meetings: 10 per attendee, 5 per day per attendee
  const result = [];
  
  if (meetingCount === 20) {
    // 2 attendees, 10 meetings each
    // attendeeNumber may be null — split by position (first 10 = att1, next 10 = att2)
    const all20 = meetings.slice(0, 20);
    const att1 = all20.slice(0, 10).map(m => ({ ...m, attendeeNumber: 1 }));
    const att2 = all20.slice(10, 20).map(m => ({ ...m, attendeeNumber: 2 }));
    
    // Attendee 1: slots 1-5 (Day 1), 7-11 (Day 2)
    const day1Slots = [1, 2, 3, 4, 5];
    const day2Slots = [7, 8, 9, 10, 11];
    
    att1.forEach((m, i) => {
      result.push({ ...m, timeSlot: i < 5 ? day1Slots[i] : day2Slots[i - 5] });
    });
    att2.forEach((m, i) => {
      result.push({ ...m, timeSlot: i < 5 ? day1Slots[i] : day2Slots[i - 5] });
    });
  } else {
    // 1 attendee, 12 meetings: slots 1-12
    meetings.slice(0, 12).forEach((m, i) => {
      result.push({ ...m, attendeeNumber: 1, timeSlot: i + 1 }); // slots 1-12
    });
  }
  
  return result;
}

async function main() {
  console.log('Restoring test account meetings...\n');
  
  for (const sponsor of TEST_SPONSORS) {
    console.log(`\n[${sponsor.name}] Generating ${sponsor.meetingCount} meetings...`);
    
    try {
      // Generate matches
      const matches = await generateMeetingsForSponsor(sponsor.id, sponsor.meetingCount);
      console.log(`  Generated ${matches.length} matches`);
      
      if (matches.length === 0) {
        console.log(`  WARNING: No matches generated for ${sponsor.name}`);
        continue;
      }
      
      // Assign time slots
      const withSlots = assignTimeSlots(matches, sponsor.meetingCount);
      
      // Delete any existing meetings first
      await db.deleteMeetingsBySponsor(sponsor.id);
      
      // Save meetings to database
      let saved = 0;
      for (const meeting of withSlots) {
        await db.createMeeting({
          sponsorId: sponsor.id,
          attendeeId: meeting.attendeeId,
          matchScore: meeting.matchScore,
          matchReason: meeting.matchReason || '',
          isTopRanked: meeting.isTopRanked ? 1 : 0,
          isPriority: meeting.isPriority ? 1 : 0,
          timeSlot: meeting.timeSlot ?? null,
          attendeeNumber: meeting.attendeeNumber ?? 1,
          status: 'confirmed',
          notes: null,
          adminNotes: null,
          isVisible: 1,
        });
        saved++;
      }
      
      console.log(`  ✓ Saved ${saved} meetings for ${sponsor.name}`);
      
    } catch (err) {
      console.error(`  ✗ Error for ${sponsor.name}:`, err);
    }
  }
  
  // Verify
  const allMeetings = await db.getAllMeetings();
  const testMeetings = allMeetings.filter((m: any) => TEST_SPONSORS.some(s => s.id === m.sponsorId));
  console.log(`\n✓ Restoration complete. ${testMeetings.length} test account meetings in database.`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
