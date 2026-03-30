import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Per-sponsor hit rate analysis
const [sponsors] = await conn.execute('SELECT id, companyName FROM sponsors ORDER BY companyName');
const [rankings] = await conn.execute('SELECT sponsorId, rankingsData FROM rankingsSubmissions');
const [meetings] = await conn.execute('SELECT sponsorId, attendeeId, isTopRanked, matchScore, meetingRating FROM meetings WHERE isVisible = 1');

const rankMap = {};
for (const r of rankings) {
  rankMap[r.sponsorId] = JSON.parse(r.rankingsData);
}

const meetingMap = {};
for (const m of meetings) {
  if (!meetingMap[m.sponsorId]) meetingMap[m.sponsorId] = [];
  meetingMap[m.sponsorId].push(m);
}

// Active attendee IDs from attendees.ts — parse JSON-style id fields
const attendeesContent = readFileSync('server/attendees.ts', 'utf8');
// Extract the array portion
const arrayStart = attendeesContent.indexOf('[');
const arrayStr = attendeesContent.slice(arrayStart);
// Extract all "id": "..." values
const idMatches = [...arrayStr.matchAll(/"id":\s*"([^"]+)"/g)];
const activeIds = new Set(idMatches.map(m => m[1]));
console.log('Active attendees:', activeIds.size);
console.log('Sample IDs:', [...activeIds].slice(0, 3));

// Sample from rankings to verify overlap
const sampleRanking = Object.values(rankMap)[0] || [];
const sampleOverlap = sampleRanking.filter(id => activeIds.has(id));
console.log(`Sample ranking has ${sampleRanking.length} entries, ${sampleOverlap.length} match active attendees`);

const results = [];
for (const s of sponsors) {
  const ranked = rankMap[s.id] || [];
  const mts = meetingMap[s.id] || [];
  const scheduledIds = new Set(mts.map(m => m.attendeeId));
  const N = mts.length;

  // Effective top-N accounting for cancellations: slide up
  const activeRanked = ranked.filter(id => activeIds.has(id));
  const topN = activeRanked.slice(0, N);
  const hits = topN.filter(id => scheduledIds.has(id)).length;
  const hitRate = N > 0 ? Math.round((hits / N) * 100) : 0;

  const rated = mts.filter(m => m.meetingRating != null);
  const avgRating = rated.length > 0 ? (rated.reduce((s, m) => s + m.meetingRating, 0) / rated.length).toFixed(2) : 'n/a';
  const avgScore = mts.length > 0 ? Math.round(mts.reduce((s, m) => s + (m.matchScore || 0), 0) / mts.length) : 0;

  results.push({
    sponsor: s.companyName.trim(),
    slots: N,
    ranked: ranked.length,
    activeRanked: activeRanked.length,
    topNHits: hits,
    hitRate: hitRate + '%',
    avgMatchScore: avgScore,
    avgRating
  });
}

results.sort((a, b) => parseInt(b.hitRate) - parseInt(a.hitRate));
console.log('\n=== TOP-N RANKING HIT RATES (with cancellation slide-up) ===');
console.table(results.filter(r => r.slots > 0 && !r.sponsor.includes('Test') && !r.sponsor.includes('Visibility')));

// Overall summary (real sponsors only)
const real = results.filter(r => r.slots > 0 && !r.sponsor.includes('Test') && !r.sponsor.includes('Visibility'));
const totalSlots = real.reduce((s, r) => s + r.slots, 0);
const totalHits = real.reduce((s, r) => s + r.topNHits, 0);
console.log(`\nOverall hit rate: ${totalHits}/${totalSlots} = ${Math.round(totalHits/totalSlots*100)}%`);

await conn.end();
