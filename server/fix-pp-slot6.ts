/**
 * Replace Cath Possamai (Amazon) in PerchPeek Slot 6
 * with a global/European delegate
 */
import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";
import { attendees } from "./attendees";

const CATH_ID = "452351"; // Cath Possamai (Amazon)
const PERCHPEEK_ID = 450001;
const SLOT = 6;

// Non-global companies to skip for PerchPeek
const NON_GLOBAL = [
  "university of the arts london",
  "the doyle collection",
  "calor gas",
  "lockton",
  "infor",
  "bms group",
  "amazon",
];

async function main() {
  console.log("Replacing Cath Possamai (Amazon) in PerchPeek Slot 6...\n");

  const allMeetings = await db.getAllMeetings();

  // Find and delete Cath's PerchPeek meeting
  const cathMeeting = allMeetings.find(
    m => m.sponsorId === PERCHPEEK_ID && m.attendeeId === CATH_ID
  );
  if (!cathMeeting) {
    console.log("Cath Possamai not found in PerchPeek — checking by slot...");
    const slotMeeting = allMeetings.find(
      m => m.sponsorId === PERCHPEEK_ID && m.timeSlot === SLOT
    );
    if (slotMeeting) {
      const d = attendees.find(a => a.id === slotMeeting.attendeeId);
      console.log(`Slot 6 has: ${d?.firstName} ${d?.lastName} (${d?.company}) id=${slotMeeting.attendeeId}`);
      await db.deleteMeeting(slotMeeting.id);
      console.log("Deleted slot 6 meeting.");
    } else {
      console.log("No meeting in Slot 6 for PerchPeek.");
      return;
    }
  } else {
    await db.deleteMeeting(cathMeeting.id);
    console.log("Deleted Cath Possamai from PerchPeek Slot 6.");
  }

  // Re-fetch to build tracking state
  const remaining = await db.getAllMeetings();
  const delegateMeetingCounts = new Map<string, number>();
  const delegateUsedSlots = new Map<string, Set<number>>();
  const existingPairs = new Set<string>();
  const perchpeekUsedSlots = new Set<number>();

  for (const m of remaining) {
    delegateMeetingCounts.set(m.attendeeId, (delegateMeetingCounts.get(m.attendeeId) || 0) + 1);
    if (!delegateUsedSlots.has(m.attendeeId)) delegateUsedSlots.set(m.attendeeId, new Set());
    if (m.timeSlot) delegateUsedSlots.get(m.attendeeId)!.add(m.timeSlot);
    existingPairs.add(`${m.sponsorId}-${m.attendeeId}`);
    if (m.sponsorId === PERCHPEEK_ID && m.timeSlot) perchpeekUsedSlots.add(m.timeSlot);
  }

  // Get fresh candidates for PerchPeek
  const candidates = await generateMeetingsForSponsor(PERCHPEEK_ID, 12);
  console.log(`\nEvaluating ${candidates.length} candidates for Slot ${SLOT}:`);

  const replacement = candidates.find(c => {
    if (existingPairs.has(`${PERCHPEEK_ID}-${c.attendeeId}`)) return false;
    if ((delegateMeetingCounts.get(c.attendeeId) || 0) >= 8) return false;
    const delegateSlots = delegateUsedSlots.get(c.attendeeId) || new Set<number>();
    if (delegateSlots.has(SLOT)) return false;

    const a = attendees.find(a => a.id === c.attendeeId);
    if (!a) return false;
    const company = (a.company || "").toLowerCase();
    const remit = ((a as any).regionalRemit || "").toLowerCase();
    const isGlobal = remit.includes("other") || remit.includes("global") ||
      remit.split(",").filter((r: string) => r.trim().length > 0).length >= 3;
    const isEuropean = remit.includes("emea") || remit.includes("europe") || remit.includes("uk");
    const isNonGlobal = NON_GLOBAL.some(ng => company.includes(ng));

    console.log(`  ${a.firstName} ${a.lastName} (${a.company}) remit="${remit}" global=${isGlobal} eu=${isEuropean} skip=${isNonGlobal} score=${c.matchScore}%`);
    return (isGlobal || isEuropean) && !isNonGlobal;
  });

  if (!replacement) {
    console.log("\n⚠️  No global/European replacement found for Slot 6. PerchPeek will have 11 meetings.");
    return;
  }

  const a = attendees.find(a => a.id === replacement.attendeeId);
  console.log(`\n✅ Replacement: ${a?.firstName} ${a?.lastName} (${a?.company}) — Score: ${replacement.matchScore}%`);

  await db.createMeeting({
    sponsorId: PERCHPEEK_ID,
    attendeeId: replacement.attendeeId,
    timeSlot: SLOT,
    attendeeNumber: 1,
    matchScore: replacement.matchScore,
    matchReason: replacement.matchReason,
    status: "suggested",
  });

  const finalMeetings = await db.getAllMeetings();
  const ppCount = finalMeetings.filter(m => m.sponsorId === PERCHPEEK_ID).length;
  const shlCount = finalMeetings.filter(m => m.sponsorId === 750001).length;
  console.log(`\nFinal — PerchPeek: ${ppCount}, SHL: ${shlCount}, Total: ${finalMeetings.length}`);
}

main().catch(console.error);
