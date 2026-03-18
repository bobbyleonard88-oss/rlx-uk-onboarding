import * as db from './db.ts';

const allMeetings = await db.getAllMeetings();
const allSponsors = await db.getAllSponsors();

const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);

const activeSponsors = allSponsors.filter(s => 
  !ALWAYS_EXCLUDED_SPONSOR_IDS.has(s.id) && !TEST_SPONSOR_IDS.has(s.id)
);

const counts = activeSponsors.map(s => {
  const meetings = allMeetings.filter(m => m.sponsorId === s.id);
  return { name: s.companyName, id: s.id, count: meetings.length };
}).sort((a, b) => a.name.localeCompare(b.name));

console.log('Sponsor meeting counts:');
counts.forEach(c => console.log(`  ${c.id} ${c.name}: ${c.count}`));
console.log('Total:', counts.reduce((s, c) => s + c.count, 0));

process.exit(0);
