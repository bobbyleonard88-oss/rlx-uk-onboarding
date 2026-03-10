/**
 * Standalone script to regenerate match reasons for all confirmed meetings.
 * Run with: npx tsx scripts/regen-reasons.ts
 */
import 'dotenv/config';
import { regenerateAllMatchReasons } from '../server/matchingEngine';

async function main() {
  console.log('Starting match reason regeneration...');
  const updated = await regenerateAllMatchReasons();
  console.log(`Done. Updated ${updated} match reasons.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
