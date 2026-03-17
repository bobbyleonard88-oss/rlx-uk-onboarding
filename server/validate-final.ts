/**
 * Final validation: check all constraints and client clash exclusions
 */
import * as db from "./db";
import { attendees } from "./attendees";

const SPONSOR_HARD_EXCLUSIONS: Record<number, string[]> = {
  270002: ['4956154','7258470500','200543495570','190937723960','13454401','91889321035','5140258'],
  540001: ['190937723960','13454401'],
  840001: ['17812226737','7258470500','91889321035','190937723960','13454401','12731251'],
  750001: ['76678269091','7258470500','91889321035','13454401','93174643474','200543495570','91862577670','190937723960'],
  150001: ['17812226737','200543495570','5927642','7258470500'],
  780001: [],
  300001: ['190937723960'],
};

async function main() {
  const meetings = await db.getAllMeetings();
  console.log(`Total meetings: ${meetings.length}`);

  // 1. Delegate slot clashes
  const delegateSlotMap = new Map<string, number[]>();
  for (const m of meetings) {
    const key = `${m.attendeeId}-${m.timeSlot}`;
    if (!delegateSlotMap.has(key)) delegateSlotMap.set(key, []);
    delegateSlotMap.get(key)!.push(m.id);
  }
  const delegateClashes = Array.from(delegateSlotMap.entries()).filter(([, ids]) => ids.length > 1);
  console.log(`\n1. Delegate slot clashes: ${delegateClashes.length}`);
  if (delegateClashes.length > 0) {
    for (const [key, ids] of delegateClashes) {
      console.log(`   CLASH: ${key} → meeting IDs ${ids.join(', ')}`);
    }
  }

  // 2. Sponsor rep slot clashes
  const repSlotMap = new Map<string, number[]>();
  for (const m of meetings) {
    const key = `${m.sponsorId}-${m.attendeeNumber}-${m.timeSlot}`;
    if (!repSlotMap.has(key)) repSlotMap.set(key, []);
    repSlotMap.get(key)!.push(m.id);
  }
  const repClashes = Array.from(repSlotMap.entries()).filter(([, ids]) => ids.length > 1);
  console.log(`\n2. Sponsor rep slot clashes: ${repClashes.length}`);
  if (repClashes.length > 0) {
    for (const [key, ids] of repClashes) {
      console.log(`   CLASH: ${key} → meeting IDs ${ids.join(', ')}`);
    }
  }

  // 3. Duplicate vendor-delegate pairs
  const pairMap = new Map<string, number[]>();
  for (const m of meetings) {
    const key = `${m.sponsorId}-${m.attendeeId}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(m.id);
  }
  const dupPairs = Array.from(pairMap.entries()).filter(([, ids]) => ids.length > 1);
  console.log(`\n3. Duplicate vendor-delegate pairs: ${dupPairs.length}`);
  if (dupPairs.length > 0) {
    for (const [key, ids] of dupPairs) {
      console.log(`   DUPLICATE: ${key} → meeting IDs ${ids.join(', ')}`);
    }
  }

  // 4. Delegates over 8-meeting cap
  const delegateCounts = new Map<string, number>();
  for (const m of meetings) {
    delegateCounts.set(m.attendeeId, (delegateCounts.get(m.attendeeId) || 0) + 1);
  }
  const overCap = Array.from(delegateCounts.entries()).filter(([, count]) => count > 8);
  console.log(`\n4. Delegates over 8-meeting cap: ${overCap.length}`);
  if (overCap.length > 0) {
    for (const [id, count] of overCap) {
      const delegate = attendees.find(a => a.id === id);
      const name = delegate ? `${delegate.firstName} ${delegate.lastName}` : id;
      console.log(`   OVER CAP: ${name} (${id}) → ${count} meetings`);
    }
  }

  // 5. Hard exclusion violations (client-sponsor clashes)
  console.log(`\n5. Client-sponsor clash check (hard exclusions):`);
  let clashCount = 0;
  for (const [sponsorId, excludedIds] of Object.entries(SPONSOR_HARD_EXCLUSIONS)) {
    const sId = parseInt(sponsorId);
    for (const excludedId of excludedIds) {
      const clash = meetings.find(m => m.sponsorId === sId && m.attendeeId === excludedId);
      if (clash) {
        const delegate = attendees.find(a => a.id === excludedId);
        const name = delegate ? `${delegate.firstName} ${delegate.lastName}` : excludedId;
        console.log(`   CLASH: Sponsor ${sId} + ${name} (${excludedId}) — meeting ID ${clash.id}`);
        clashCount++;
      }
    }
  }
  if (clashCount === 0) console.log(`   ✅ No client-sponsor clashes found`);

  // 6. Andrew Boyd check
  const boydMeetings = meetings.filter(m => m.attendeeId === '18336501');
  console.log(`\n6. Andrew Boyd meetings remaining: ${boydMeetings.length} (should be 0)`);

  // 7. Per-sponsor meeting counts
  console.log(`\n7. Per-sponsor meeting counts:`);
  const sponsorCounts = new Map<number, number>();
  for (const m of meetings) {
    sponsorCounts.set(m.sponsorId, (sponsorCounts.get(m.sponsorId) || 0) + 1);
  }
  const allSponsors = await db.getAllSponsors();
  const sponsorNames = new Map(allSponsors.map(s => [s.id, s.companyName]));
  const QUOTA_OVERRIDES: Record<number, number> = {
    450001: 12, 750001: 24, 870001: 12, 390001: 10,
  };
  for (const [sId, count] of Array.from(sponsorCounts.entries()).sort((a, b) => b[1] - a[1])) {
    const quota = QUOTA_OVERRIDES[sId] ?? 12;
    const name = sponsorNames.get(sId) ?? `Sponsor ${sId}`;
    const status = count === quota ? '✅' : count < quota ? '⚠️' : '❌';
    console.log(`   ${status} ${name}: ${count}/${quota}`);
  }

  console.log(`\n=== SUMMARY ===`);
  const allOk = delegateClashes.length === 0 && repClashes.length === 0 && dupPairs.length === 0 && overCap.length === 0 && clashCount === 0 && boydMeetings.length === 0;
  console.log(allOk ? '✅ ALL CONSTRAINTS PASS' : '❌ SOME CONSTRAINTS FAILED');
}

main().catch(console.error);
