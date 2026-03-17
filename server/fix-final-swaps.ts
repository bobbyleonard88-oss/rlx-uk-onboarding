/**
 * Two targeted fixes:
 * 1. Remove Cath Possamai (Amazon) from SHL — SHL will have 21 meetings
 * 2. Replace Mark Kunaseelan (University of the Arts London) on PerchPeek
 *    with a global/European delegate
 */

import * as db from "./db";
import { generateMeetingsForSponsor } from "./matchingAlgorithm";
import { attendees } from "./attendees";

const CATH_POSSAMAI_ID = "4956154";   // Amazon
const MARK_KUNASEELAN_ID = "93176107633"; // University of the Arts London

const SHL_ID = 750001;
const PERCHPEEK_ID = 450001;

// Companies that are clearly NOT global/European — skip for PerchPeek replacement
const NON_GLOBAL_COMPANIES = [
  "university of the arts london",
  "the doyle collection",
  "calor gas",
  "lockton",
  "infor",
  "bms group",
];

async function main() {
  console.log("=== Final targeted swaps ===\n");

  const allMeetings = await db.getAllMeetings();

  // --- Fix 1: Remove Cath Possamai from SHL ---
  const cathMeeting = allMeetings.find(
    m => m.sponsorId === SHL_ID && m.attendeeId === CATH_POSSAMAI_ID
  );
  if (cathMeeting) {
    await db.deleteMeeting(cathMeeting.id);
    console.log(`✅ Removed Cath Possamai (Amazon) from SHL — SHL now has 21 meetings.`);
  } else {
    console.log("ℹ️  Cath Possamai not found in SHL meetings (already removed?)");
  }

  // --- Fix 2: Replace Mark Kunaseelan on PerchPeek ---
  const markMeeting = allMeetings.find(
    m => m.sponsorId === PERCHPEEK_ID && m.attendeeId === MARK_KUNASEELAN_ID
  );
  if (!markMeeting) {
    console.log("ℹ️  Mark Kunaseelan not found in PerchPeek meetings");
    return;
  }

  const slotToFill = markMeeting.timeSlot!;
  console.log(`\nReplacing Mark Kunaseelan in PerchPeek Slot ${slotToFill}...`);

  // Delete his meeting
  await db.deleteMeeting(markMeeting.id);

  // Re-fetch remaining meetings for tracking
  const remaining = await db.getAllMeetings();

  const delegateMeetingCounts = new Map<string, number>();
  for (const m of remaining) {
    delegateMeetingCounts.set(m.attendeeId, (delegateMeetingCounts.get(m.attendeeId) || 0) + 1);
  }

  const delegateUsedSlots = new Map<string, Set<number>>();
  for (const m of remaining) {
    if (!delegateUsedSlots.has(m.attendeeId)) delegateUsedSlots.set(m.attendeeId, new Set());
    if (m.timeSlot) delegateUsedSlots.get(m.attendeeId)!.add(m.timeSlot);
  }

  const existingPairs = new Set<string>();
  for (const m of remaining) {
    existingPairs.add(`${m.sponsorId}-${m.attendeeId}`);
  }

  const perchpeekUsedSlots = new Set<number>(
    remaining.filter(m => m.sponsorId === PERCHPEEK_ID).map(m => m.timeSlot!)
  );

  // Get fresh candidates for PerchPeek
  const candidates = await generateMeetingsForSponsor(PERCHPEEK_ID, 12);

  console.log("\nEvaluating candidates for global/European fit:");
  for (const c of candidates) {
    const a = attendees.find(a => a.id === c.attendeeId);
    if (!a) continue;
    const company = (a.company || "").toLowerCase();
    const remit = (a.regionalRemit || "").toLowerCase();
    const isGlobal = remit.includes("other") || remit.includes("global") ||
      remit.split(",").filter((r: string) => r.trim().length > 0).length >= 3;
    const isEuropean = remit.includes("emea") || remit.includes("europe") || remit.includes("uk");
    const isNonGlobal = NON_GLOBAL_COMPANIES.some(ng => company.includes(ng));
    console.log(`  ${a.firstName} ${a.lastName} (${a.company}) | remit: ${remit || "unknown"} | global: ${isGlobal} | eu: ${isEuropean} | non-global: ${isNonGlobal} | score: ${c.matchScore}%`);
  }

  // Find best eligible replacement: global or European, not already in schedule, slot available
  const replacement = candidates.find(c => {
    if (existingPairs.has(`${PERCHPEEK_ID}-${c.attendeeId}`)) return false;
    if ((delegateMeetingCounts.get(c.attendeeId) || 0) >= 8) return false;
    const delegateSlots = delegateUsedSlots.get(c.attendeeId) || new Set<number>();
    if (delegateSlots.has(slotToFill)) return false;
    if (perchpeekUsedSlots.has(slotToFill)) return false;

    const a = attendees.find(a => a.id === c.attendeeId);
    if (!a) return false;
    const company = (a.company || "").toLowerCase();
    const remit = (a.regionalRemit || "").toLowerCase();
    const isGlobal = remit.includes("other") || remit.includes("global") ||
      remit.split(",").filter((r: string) => r.trim().length > 0).length >= 3;
    const isEuropean = remit.includes("emea") || remit.includes("europe") || remit.includes("uk");
    const isNonGlobal = NON_GLOBAL_COMPANIES.some(ng => company.includes(ng));

    return (isGlobal || isEuropean) && !isNonGlobal;
  });

  if (!replacement) {
    console.log("\n⚠️  No global/European replacement found. PerchPeek will have 11 meetings.");
    return;
  }

  const a = attendees.find(a => a.id === replacement.attendeeId);
  console.log(`\n✅ Replacement: ${a?.firstName} ${a?.lastName} (${a?.company}) — Score: ${replacement.matchScore}%`);

  await db.createMeeting({
    sponsorId: PERCHPEEK_ID,
    attendeeId: replacement.attendeeId,
    timeSlot: slotToFill,
    attendeeNumber: 1,
    matchScore: replacement.matchScore,
    matchReason: replacement.matchReason,
    status: "suggested",
  });

  const finalMeetings = await db.getAllMeetings();
  const perchpeekCount = finalMeetings.filter(m => m.sponsorId === PERCHPEEK_ID).length;
  const shlCount = finalMeetings.filter(m => m.sponsorId === 750001).length;
  console.log(`\nFinal counts — PerchPeek: ${perchpeekCount}, SHL: ${shlCount}`);
  console.log(`Total meetings: ${finalMeetings.length}`);
}

main().catch(console.error);
