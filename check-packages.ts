import 'dotenv/config';
import * as db from './server/db';

async function main() {
  const sponsors = await db.getAllSponsors();
  const allIntake = await db.getAllIntakeSubmissions();
  const meetings = await db.getAllMeetings();
  const TEST_IDS = new Set([30001, 60001, 90001, 120001]);

  const intakeMap = new Map(allIntake.map(s => [s.sponsorId, s]));
  const meetingCountMap = new Map<number, number>();
  for (const m of meetings) {
    if (!TEST_IDS.has(m.sponsorId)) {
      meetingCountMap.set(m.sponsorId, (meetingCountMap.get(m.sponsorId) ?? 0) + 1);
    }
  }

  const realSponsors = sponsors.filter(s => !TEST_IDS.has(s.id));
  console.log('Sponsor | Package | Target | Actual | Short');
  console.log('--------|---------|--------|--------|------');
  for (const s of realSponsors) {
    const intake = intakeMap.get(s.id);
    const pkg = intake?.meetingPackage ?? '12';
    const target = pkg === '20' ? 20 : 12;
    const actual = meetingCountMap.get(s.id) ?? 0;
    const short = target - actual;
    const flag = short > 0 ? ` *** SHORT BY ${short}` : '';
    console.log(`${s.companyName} | ${pkg} | ${target} | ${actual} | ${short}${flag}`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
