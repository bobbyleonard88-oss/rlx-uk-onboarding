/**
 * check-eligible.ts
 * 
 * For each sponsor, counts how many delegates are eligible after:
 * - Jen Candee exclusion (not taking meetings)
 * - Named existing client exclusions
 * - Capacity exclusions (delegates who've already met this sponsor)
 * 
 * This tells us the run order: most constrained (fewest eligible) should go first.
 */
import 'dotenv/config';
import * as db from './server/db';

const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
const JEN_CANDEE_ID = 'jen-candee'; // placeholder — we'll match by name

async function main() {
  const sponsors = await db.getAllSponsors();
  const allIntake = await db.getAllIntakeSubmissions();
  const delegateProfiles = await db.getAllDelegateProfiles();
  // Build a simple attendee-like array from delegate profiles
  const attendees = delegateProfiles.map(d => ({
    id: d.attendeeId,
    firstName: d.firstName || '',
    lastName: d.lastName || '',
    company: d.company || '',
  }));
  const intakeMap = new Map(allIntake.map(s => [s.sponsorId, s]));

  // Find Jen Candee's attendee ID
  const jenCandee = attendees.find(a => 
    `${a.firstName} ${a.lastName}`.toLowerCase().includes('jen candee') ||
    `${a.firstName} ${a.lastName}`.toLowerCase().includes('jennifer candee')
  );
  const excludedDelegateIds = new Set<string>(jenCandee ? [jenCandee.id] : []);
  console.log(`Jen Candee: ${jenCandee ? `found (ID: ${jenCandee.id})` : 'NOT FOUND — check name'}`);
  console.log(`Total attendees: ${attendees.length}, Eligible: ${attendees.length - excludedDelegateIds.size}\n`);

  const realSponsors = sponsors.filter(s => 
    !TEST_SPONSOR_IDS.has(s.id) && 
    s.companyName && 
    !s.companyName.toLowerCase().includes('visibility test') && 
    !s.companyName.toLowerCase().includes('mtgtest')
  );

  const results: Array<{name: string, id: number, quota: number, eligible: number, excluded: number, exclusionNames: string[]}> = [];

  for (const s of realSponsors) {
    const intake = intakeMap.get(s.id);
    const quota = intake?.meetingPackage === '20' ? 20 : 12;
    
    // Parse existing client exclusions from intake
    const exclusionText = intake?.existingClients || '';
    const exclusionLines = exclusionText
      .split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(l => l.length > 2);
    
    // Match exclusion names to attendees
    const excludedForSponsor: string[] = [];
    for (const line of exclusionLines) {
      const nameParts = line.toLowerCase().split(/\s+/);
      const matched = attendees.find(a => {
        const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
        return nameParts.some(part => part.length > 3 && fullName.includes(part));
      });
      if (matched && !excludedDelegateIds.has(matched.id)) {
        excludedForSponsor.push(`${matched.firstName} ${matched.lastName} (${matched.company})`);
      }
    }

    const totalExcluded = excludedDelegateIds.size + excludedForSponsor.length;
    const eligible = attendees.length - totalExcluded;

    results.push({
      name: s.companyName,
      id: s.id,
      quota,
      eligible,
      excluded: excludedForSponsor.length,
      exclusionNames: excludedForSponsor,
    });
  }

  // Sort by most constrained first (smallest eligible pool relative to quota)
  results.sort((a, b) => (a.eligible - a.quota) - (b.eligible - b.quota));

  console.log('Run order (most constrained first):');
  console.log('Rank | Sponsor | Quota | Eligible | Headroom | Exclusions');
  console.log('-----|---------|-------|----------|----------|----------');
  results.forEach((r, i) => {
    const headroom = r.eligible - r.quota;
    const flag = headroom < 5 ? ' ⚠️ TIGHT' : '';
    console.log(`${i+1}. ${r.name} | quota:${r.quota} | eligible:${r.eligible} | headroom:${headroom}${flag}`);
    if (r.exclusionNames.length > 0) {
      console.log(`   Excluded: ${r.exclusionNames.join(', ')}`);
    }
  });

  console.log('\nOrdered IDs for run script:');
  console.log(results.map(r => r.id).join(', '));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
