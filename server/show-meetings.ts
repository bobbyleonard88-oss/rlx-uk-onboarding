import * as db from "./db";
import { attendees } from "./attendees";

async function main() {
  const meetings = await db.getAllMeetings();
  const get = (id: string) => attendees.find(a => a.id === id);

  const pp = meetings.filter(m => m.sponsorId === 450001).sort((a, b) => (a.timeSlot||0)-(b.timeSlot||0));
  console.log("PERCHPEEK MEETINGS:");
  for (const m of pp) {
    const d = get(m.attendeeId);
    console.log(`  Slot ${m.timeSlot} | ${d ? d.firstName+' '+d.lastName : m.attendeeId} | ${d?.company || 'Unknown'} | ${m.matchScore}%`);
  }

  const shl = meetings.filter(m => m.sponsorId === 750001).sort((a, b) => {
    if ((a.attendeeNumber||1) !== (b.attendeeNumber||1)) return (a.attendeeNumber||1)-(b.attendeeNumber||1);
    return (a.timeSlot||0)-(b.timeSlot||0);
  });
  console.log(`\nSHL MEETINGS (${shl.length}):`);
  for (const m of shl) {
    const d = get(m.attendeeId);
    console.log(`  Slot ${m.timeSlot} Rep ${m.attendeeNumber} | ${d ? d.firstName+' '+d.lastName : m.attendeeId} | ${d?.company || 'Unknown'} | ${m.matchScore}%`);
  }
}
main().catch(console.error);
