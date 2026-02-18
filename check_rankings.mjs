import Database from 'better-sqlite3';

const db = new Database('./storage/data.db');

// Get all rankings submissions
const rankings = db.prepare('SELECT * FROM rankings_submissions').all();

console.log('Total rankings submissions:', rankings.length);
console.log('\nRankings data:');
rankings.forEach((r, i) => {
  console.log(`\n${i + 1}. Sponsor: ${r.sponsorName || 'Unknown'}`);
  console.log(`   Email: ${r.email}`);
  if (r.rankingsData) {
    const ranked = JSON.parse(r.rankingsData);
    console.log(`   Ranked ${ranked.length} delegates`);
    console.log(`   Top 5: ${ranked.slice(0, 5).join(', ')}`);
  }
});

db.close();
