/**
 * Re-run AI matching for 7 sponsors with the new 90%+ opt-in scoring.
 * Clears existing meetings for each sponsor and regenerates.
 */
import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const SPONSORS = [
  { id: 540001, name: 'hackajob',                 quota: 12 },
  { id: 600001, name: 'Happydance Careers Websites', quota: 12 },
  { id: 210001, name: 'Harver',                   quota: 20 },
  { id: 720001, name: 'inploi',                   quota: 12 },
  { id: 810002, name: 'Radancy',                  quota: 12 },
  { id: 390001, name: 'Bright Apply',             quota: 12 },
  { id: 330001, name: 'Symphony Talent',          quota: 12 },
];

async function main() {
  // Import the matching algorithm (ESM)
  const { generateMeetingsForSponsor } = await import('../server/matchingAlgorithm.ts').catch(async () => {
    // Try compiled version
    return await import('../server/matchingAlgorithm.js');
  });

  const conn = await createConnection(DATABASE_URL);

  for (const sponsor of SPONSORS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${sponsor.name} (ID: ${sponsor.id}, quota: ${sponsor.quota})`);
    console.log('='.repeat(60));

    try {
      // Step 1: Delete existing meetings for this sponsor
      const [deleteResult] = await conn.execute(
        'DELETE FROM meetings WHERE sponsorId = ?',
        [sponsor.id]
      );
      console.log(`  Cleared ${deleteResult.affectedRows} existing meetings`);

      // Step 2: Run matching algorithm
      console.log(`  Running AI matching...`);
      const matches = await generateMeetingsForSponsor(sponsor.id, sponsor.quota);
      console.log(`  Generated ${matches.length} matches`);

      // Step 3: Insert new meetings
      let inserted = 0;
      for (const match of matches) {
        const notes = JSON.stringify({
          matchScore: match.matchScore,
          matchReason: match.matchReason,
          isPriority: match.isPriority,
          isTopRanked: match.isTopRanked,
          isTop20: match.isTop20,
        });

        await conn.execute(
          `INSERT INTO meetings (sponsorId, attendeeId, timeSlot, attendeeNumber, sponsorRepName, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            sponsor.id,
            match.attendeeId,
            match.timeSlot ?? null,
            1,
            null,
            notes,
          ]
        );
        inserted++;
        
        const optInNote = match.matchReason?.includes('opted in') ? ' [OPT-IN]' : '';
        console.log(`  + ${match.delegateInfo.firstName} ${match.delegateInfo.lastName} (${match.delegateInfo.company}) — ${match.matchScore}%${optInNote}`);
      }
      console.log(`  ✓ Inserted ${inserted} meetings for ${sponsor.name}`);

    } catch (err) {
      console.error(`  ✗ Error processing ${sponsor.name}:`, err.message);
    }
  }

  await conn.end();
  console.log('\n✓ All done!');
}

main().catch(console.error);
