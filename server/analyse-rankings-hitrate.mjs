/**
 * analyse-rankings-hitrate.mjs
 * For each sponsor: compare their submitted top-N rankings against
 * the delegates they actually got meetings with.
 * Reports: how many of their top-10 ranked delegates they actually met.
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../drizzle/sqlite.db");
const db = new Database(dbPath);

// Get all sponsors with their names
const sponsors = db.prepare(`
  SELECT s.id, s.company_name
  FROM sponsors s
  ORDER BY s.id
`).all();

// Get all rankings submissions
const rankings = db.prepare(`
  SELECT sponsor_id, rankings_data
  FROM rankings_submissions
  ORDER BY created_at ASC
`).all();

// Get all meetings (confirmed/suggested)
const meetings = db.prepare(`
  SELECT sponsor_id, attendee_id, time_slot
  FROM meetings
  WHERE status IN ('suggested', 'confirmed')
`).all();

// Build a map: sponsorId -> Set of attendee IDs they actually met
const meetingMap = new Map();
for (const m of meetings) {
  if (!meetingMap.has(m.sponsor_id)) meetingMap.set(m.sponsor_id, new Set());
  meetingMap.get(m.sponsor_id).add(m.attendee_id);
}

// Build a map: sponsorId -> latest rankings array
const rankingsMap = new Map();
for (const r of rankings) {
  try {
    const arr = JSON.parse(r.rankings_data);
    rankingsMap.set(r.sponsor_id, arr);
  } catch {}
}

console.log("\n=== SPONSOR RANKINGS HIT RATE ANALYSIS ===");
console.log("(How many of their top-10 ranked delegates they actually got meetings with)\n");

const rows = [];

for (const sponsor of sponsors) {
  const rankedList = rankingsMap.get(sponsor.id) || [];
  const actualMeetings = meetingMap.get(sponsor.id) || new Set();
  
  const top10 = rankedList.slice(0, 10);
  const top10Hits = top10.filter(id => actualMeetings.has(id));
  const totalMeetings = actualMeetings.size;
  
  rows.push({
    sponsor: sponsor.company_name,
    totalMeetings,
    top10Ranked: top10.length,
    top10Hits: top10Hits.length,
    hitRate: top10.length > 0 ? Math.round((top10Hits.length / top10.length) * 100) : 0,
    missedTop10: top10.filter(id => !actualMeetings.has(id)),
  });
}

// Sort by hit rate descending
rows.sort((a, b) => b.hitRate - a.hitRate);

console.log("Sponsor                  | Meetings | Top-10 Ranked | Top-10 Met | Hit Rate");
console.log("-------------------------|----------|---------------|------------|----------");
for (const r of rows) {
  const name = r.sponsor.padEnd(24);
  const meetings = String(r.totalMeetings).padStart(8);
  const ranked = String(r.top10Ranked).padStart(13);
  const met = String(r.top10Hits).padStart(10);
  const rate = `${r.hitRate}%`.padStart(9);
  console.log(`${name} |${meetings} |${ranked} |${met} |${rate}`);
}

// Summary
const withRankings = rows.filter(r => r.top10Ranked > 0);
const avgHitRate = withRankings.length > 0
  ? Math.round(withRankings.reduce((s, r) => s + r.hitRate, 0) / withRankings.length)
  : 0;

console.log(`\nAverage hit rate (sponsors with rankings): ${avgHitRate}%`);
console.log(`Sponsors with rankings submitted: ${withRankings.length}/${rows.length}`);

// Show who missed the most top-10 picks
console.log("\n=== SPONSORS WITH LOWEST HIT RATES ===");
const bottom = rows.filter(r => r.top10Ranked > 0).slice(-5);
for (const r of bottom.reverse()) {
  console.log(`\n${r.sponsor} (${r.hitRate}% — ${r.top10Hits}/${r.top10Ranked} top-10 met, ${r.totalMeetings} total meetings)`);
  if (r.missedTop10.length > 0) {
    console.log(`  Missed top-10 IDs: ${r.missedTop10.join(", ")}`);
  }
}

db.close();
