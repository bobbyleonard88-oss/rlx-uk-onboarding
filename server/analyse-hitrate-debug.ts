/**
 * analyse-hitrate-debug.ts
 * Diagnostic: compare the two different analyses to understand the discrepancy.
 *
 * Earlier analysis: "top-10 hit rate" = how many of their top-10 ranked delegates
 *   they actually got meetings with (out of 10).
 *
 * Later analysis: "simulation best case" = how many of their top-N ranked delegates
 *   were still under the 8-meeting cap when that sponsor was processed in order.
 *
 * The discrepancy: the simulation best case counts delegates who were *available*
 * at the time of processing, but doesn't account for slot clashes — two sponsors
 * processed sequentially could both "claim" the same delegate in the simulation
 * because the simulation only tracks meeting counts, not slot assignments.
 *
 * This script runs a proper slot-aware simulation.
 */

import * as db from "./db";
import { attendees } from "./attendees";

const QUOTA_OVERRIDES: Record<number, number> = {
  750001: 20,
  210001: 22,
  270002: 20,
  390001: 12,
  450001: 12,
};

const ORDERED_SPONSOR_IDS = [
  750001, 210001, 270002, 150001, 180001, 240001, 300001, 330001, 360001,
  540001, 600001, 690001, 720001, 780001, 810001, 810002, 840001, 870001,
  900001, 450001, 390001,
];

const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DELEGATE_MAX_MEETINGS = 8;

async function main() {
  const sponsors = await db.getAllSponsors();
  const allMeetings = await db.getAllMeetings();
  const activeMeetings = allMeetings.filter(
    (m: any) => m.status === "suggested" || m.status === "confirmed"
  );

  // Build map: sponsorId -> Set of attendeeIds they actually met
  const meetingMap = new Map<number, Set<string>>();
  for (const m of activeMeetings) {
    if (!meetingMap.has(m.sponsorId)) meetingMap.set(m.sponsorId, new Set());
    meetingMap.get(m.sponsorId)!.add(m.attendeeId);
  }

  const intakeRows: Record<number, any> = {};
  for (const sponsor of sponsors) {
    const intake = await db.getIntakeSubmissionBySponsor(sponsor.id);
    if (intake) intakeRows[sponsor.id] = intake;
  }

  const rankingsMap = new Map<number, string[]>();
  for (const sponsor of sponsors) {
    const submissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
    const latest = submissions[0];
    if (latest) rankingsMap.set(sponsor.id, JSON.parse(latest.rankingsData));
  }

  // ─── Slot-aware simulation ───
  // Replay scheduling in order, assigning slots properly.
  // For each sponsor, go through their ranked list in order and assign a slot
  // only if: delegate is under cap AND delegate has a free slot AND sponsor rep has a free slot.
  const delegateUsedSlots = new Map<string, Set<number>>();
  const sponsorUsedSlots = new Map<number, Map<number, Set<number>>>();
  const delegateMeetingCount = new Map<string, number>();

  // Initialise
  for (const a of attendees) {
    delegateUsedSlots.set(a.id, new Set());
    delegateMeetingCount.set(a.id, 0);
  }

  const simResults = new Map<number, number>(); // sponsorId -> how many ranked meetings they'd get

  for (const sponsorId of ORDERED_SPONSOR_IDS) {
    const intake = intakeRows[sponsorId];
    const quota =
      QUOTA_OVERRIDES[sponsorId] ??
      (intake?.meetingPackage === "20" ? 20 : 12);

    const hasTwoReps = quota > 12;
    const rep1Quota = hasTwoReps ? Math.ceil(quota / 2) : quota;
    const rep2Quota = hasTwoReps ? Math.floor(quota / 2) : 0;

    if (!sponsorUsedSlots.has(sponsorId)) {
      sponsorUsedSlots.set(sponsorId, new Map<number, Set<number>>([[1, new Set<number>()], [2, new Set<number>()]]));
    }
    const sponsorSlots = sponsorUsedSlots.get(sponsorId)!;

    const rankedList = rankingsMap.get(sponsorId) || [];
    const topN = rankedList.slice(0, quota);

    let rep1Count = 0;
    let rep2Count = 0;
    let assignedCount = 0;
    const assignedDelegates = new Set<string>();

    for (const delegateId of topN) {
      if (rep1Count >= rep1Quota && rep2Count >= rep2Quota) break;
      if (assignedDelegates.has(delegateId)) continue;

      const currentCount = delegateMeetingCount.get(delegateId) ?? 0;
      if (currentCount >= DELEGATE_MAX_MEETINGS) continue;

      const delegateSlots = delegateUsedSlots.get(delegateId) ?? new Set<number>();

      let assignedRep: number | null = null;
      let availableSlot: number | null = null;

      if (rep1Count < rep1Quota) {
        const rep1Slots = sponsorSlots.get(1)!;
        const slot = ALL_SLOTS.find(s => !delegateSlots.has(s) && !rep1Slots.has(s)) ?? null;
        if (slot !== null) { assignedRep = 1; availableSlot = slot; }
      }

      if (assignedRep === null && rep2Count < rep2Quota) {
        const rep2Slots = sponsorSlots.get(2)!;
        const slot = ALL_SLOTS.find(s => !delegateSlots.has(s) && !rep2Slots.has(s)) ?? null;
        if (slot !== null) { assignedRep = 2; availableSlot = slot; }
      }

      if (assignedRep === null || availableSlot === null) continue;

      // Commit
      delegateSlots.add(availableSlot);
      sponsorSlots.get(assignedRep)!.add(availableSlot);
      delegateUsedSlots.set(delegateId, delegateSlots);
      delegateMeetingCount.set(delegateId, currentCount + 1);
      assignedDelegates.add(delegateId);

      if (assignedRep === 1) rep1Count++;
      else rep2Count++;
      assignedCount++;
    }

    simResults.set(sponsorId, assignedCount);
  }

  // ─── Build output rows ───
  const rows: {
    sponsor: string;
    sponsorId: number;
    quota: number;
    totalMeetings: number;
    fromTopN: number;
    hitRatePct: number;
    simBestCase: number;
    simBestCasePct: number;
  }[] = [];

  for (const sponsor of sponsors) {
    const actualMeetings = meetingMap.get(sponsor.id) || new Set<string>();
    if (actualMeetings.size === 0) continue;

    const intake = intakeRows[sponsor.id];
    const quota =
      QUOTA_OVERRIDES[sponsor.id] ??
      (intake?.meetingPackage === "20" ? 20 : 12);

    const rankedList = rankingsMap.get(sponsor.id) || [];
    const topN = rankedList.slice(0, quota);
    const fromTopN = topN.filter((id) => actualMeetings.has(id)).length;
    const hitRatePct =
      actualMeetings.size > 0
        ? Math.round((fromTopN / actualMeetings.size) * 100)
        : 0;

    const simBestCase = simResults.get(sponsor.id) ?? 0;
    const simBestCasePct =
      quota > 0 ? Math.round((simBestCase / quota) * 100) : 0;

    rows.push({
      sponsor: sponsor.companyName,
      sponsorId: sponsor.id,
      quota,
      totalMeetings: actualMeetings.size,
      fromTopN,
      hitRatePct,
      simBestCase,
      simBestCasePct,
    });
  }

  rows.sort((a, b) => b.hitRatePct - a.hitRatePct);

  console.log("\n=== SPONSOR HIT RATE vs SLOT-AWARE SIMULATION BEST CASE ===\n");
  console.log(
    "Sponsor                        | From Top-N | % of Meetings | Sim Best Case | Sim Best Case %"
  );
  console.log(
    "-------------------------------|------------|---------------|---------------|----------------"
  );
  for (const r of rows) {
    const name = r.sponsor.padEnd(30);
    const fromTopN = `${r.fromTopN}/${r.totalMeetings}`.padStart(10);
    const pct = `${r.hitRatePct}%`.padStart(13);
    const sim = `${r.simBestCase}/${r.quota}`.padStart(13);
    const simPct = `${r.simBestCasePct}%`.padStart(15);
    console.log(`${name} |${fromTopN} |${pct} |${sim} |${simPct}`);
  }

  const avg = Math.round(rows.reduce((s, r) => s + r.hitRatePct, 0) / rows.length);
  const avgSim = Math.round(rows.reduce((s, r) => s + r.simBestCasePct, 0) / rows.length);
  console.log(`\nAverage actual hit rate:               ${avg}%`);
  console.log(`Average slot-aware simulation best case: ${avgSim}%`);

  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
