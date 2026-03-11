/**
 * Run Appcast top 3 matches with updated prompt (org size + Udder fix)
 * Clears Appcast's match cache first to force fresh AI analysis
 */
import { generateMatchesForSponsor } from '../server/matchingEngine';
import { attendees } from '../server/attendees';
import * as db from '../server/db';

const APPCAST_ID = 270002;

async function main() {
  console.log('Clearing Appcast match cache...');
  
  // Clear match cache for Appcast only
  const mysql = await import('mysql2/promise');
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  await conn.execute('DELETE FROM matchCache WHERE sponsorId = ?', [APPCAST_ID]);
  const [countRows] = await conn.execute('SELECT COUNT(*) as cnt FROM matchCache WHERE sponsorId = ?', [APPCAST_ID]) as any;
  console.log(`Cache cleared. Remaining: ${countRows[0].cnt}`);
  await conn.end();

  console.log('\nGenerating fresh matches for Appcast...');
  const matches = await generateMatchesForSponsor(APPCAST_ID);
  
  // Sort by score descending and take top 3
  const top3 = matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  console.log('\n=== APPCAST TOP 3 MATCHES ===\n');
  
  for (const match of top3) {
    const delegate = attendees.find(a => a.id === match.attendeeId);
    if (!delegate) continue;
    
    const delegateName = `${delegate.firstName} ${delegate.lastName}`;
    console.log(`--- ${delegateName} (${delegate.jobTitle}, ${delegate.company}) ---`);
    console.log(`Org size: ${delegate.companySize}`);
    console.log(`Score: ${match.matchScore}`);
    console.log(`Pain points: ${delegate.currentPainPoints}`);
    console.log(`Solution areas: ${delegate.keySolutionAreasOfInterest}`);
    console.log(`Reason: ${match.reasoning}`);
    console.log('');
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
