/**
 * calc-cap.ts
 * 
 * Calculates the minimum per-delegate meeting cap needed for all sponsors to hit their quota.
 * Total meetings needed = sum of all sponsor quotas
 * 39 eligible delegates (40 minus Jen Candee)
 */
import 'dotenv/config';
import * as db from './server/db';

const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);

async function main() {
  const sponsors = await db.getAllSponsors();
  const allIntake = await db.getAllIntakeSubmissions();
  const intakeMap = new Map(allIntake.map(s => [s.sponsorId, s]));

  const realSponsors = sponsors.filter(s => !TEST_SPONSOR_IDS.has(s.id) && s.companyName && !s.companyName.toLowerCase().includes('visibility test') && !s.companyName.toLowerCase().includes('mtgtest'));

  let totalMeetingsNeeded = 0;
  for (const s of realSponsors) {
    const intake = intakeMap.get(s.id);
    const pkg = intake?.meetingPackage ?? '12';
    const target = pkg === '20' ? 20 : 12;
    totalMeetingsNeeded += target;
    console.log(`${s.companyName}: ${target} meetings (ID: ${s.id})`);
  }

  const ELIGIBLE_DELEGATES = 39; // 40 minus Jen Candee
  const minCapNeeded = Math.ceil(totalMeetingsNeeded / ELIGIBLE_DELEGATES);

  console.log(`\n--- Summary ---`);
  console.log(`Real sponsors: ${realSponsors.length}`);
  console.log(`Total meetings needed: ${totalMeetingsNeeded}`);
  console.log(`Eligible delegates: ${ELIGIBLE_DELEGATES}`);
  console.log(`Average meetings per delegate: ${(totalMeetingsNeeded / ELIGIBLE_DELEGATES).toFixed(1)}`);
  console.log(`Minimum cap needed: ${minCapNeeded}`);
  console.log(`Recommended cap (with buffer): ${minCapNeeded + 2}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
