import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Get current pairings from DB
const [rows] = await db.execute(`
  SELECT TRIM(s.companyName) as sponsor, dp.firstName, dp.lastName
  FROM meetings m
  JOIN sponsors s ON m.sponsorId = s.id
  JOIN delegateProfiles dp ON m.attendeeId = dp.attendeeId
  WHERE s.companyName NOT LIKE '%Test%' AND s.companyName NOT LIKE '%Visibility%'
  AND s.companyName NOT IN ('AI Limited', 'Elevate Assess', 'Little Moment', 'NexaTalent Solutions Ltd')
`);

const dbPairings = new Set(rows.map(r => `${r.sponsor.trim()}|${r.firstName} ${r.lastName}`));

// Parse CSV
const csvContent = readFileSync('/home/ubuntu/upload/RLXUKV6-UPDATED-RLXUKV6.csv', 'utf8');
const lines = csvContent.split('\n').slice(1).filter(l => l.trim());
const csvPairings = new Set();
for (const line of lines) {
  // CSV: Vendor Company,Rep Name,Delegate Name,...
  const cols = line.split(',');
  const sponsor = cols[0]?.trim();
  const delegate = cols[2]?.trim();
  if (sponsor && delegate) {
    csvPairings.add(`${sponsor}|${delegate}`);
  }
}

console.log(`DB pairings: ${dbPairings.size}`);
console.log(`CSV pairings: ${csvPairings.size}`);

// Removed (in CSV but not DB)
const removed = [...csvPairings].filter(p => !dbPairings.has(p));
// Added (in DB but not CSV)
const added = [...dbPairings].filter(p => !csvPairings.has(p));

if (removed.length === 0) {
  console.log('\n✅ No pairings removed — all original matches preserved');
} else {
  console.log(`\n⚠️  REMOVED pairings (${removed.length}) — in CSV but not in DB:`);
  removed.forEach(p => {
    const [s, d] = p.split('|');
    console.log(`  ${s} ↔ ${d}`);
  });
}

if (added.length === 0) {
  console.log('✅ No new pairings added');
} else {
  console.log(`\n⚠️  ADDED pairings (${added.length}) — in DB but not in CSV:`);
  added.forEach(p => {
    const [s, d] = p.split('|');
    console.log(`  ${s} ↔ ${d}`);
  });
}

await db.end();
