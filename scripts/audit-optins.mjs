/**
 * Opt-in badge accuracy audit
 * Uses the EXACT same logic as server/routers.ts line 84-86:
 *   s.toLowerCase().includes(sponsorNameLower) || sponsorNameLower.includes(s.toLowerCase())
 */
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const src = readFileSync('/home/ubuntu/rlx-onboarding/server/attendees.ts', 'utf8');
const match = src.match(/export const attendees[^=]*=\s*(\[[\s\S]*\]);/);
const attendees = eval(match[1]);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT m.attendeeId, m.sponsorId, s.companyName
  FROM meetings m
  JOIN sponsors s ON m.sponsorId = s.id
  WHERE m.isVisible = 1
    AND m.sponsorId NOT IN (270001, 510003, 30001, 60001, 90001, 120001)
  ORDER BY s.companyName, m.timeSlot
`);
await conn.end();

// Exact same logic as server
function hasDelegateOptIn(delegate, sponsorName) {
  const sponsorNameLower = (sponsorName ?? '').toLowerCase();
  return (delegate?.optInSponsors ?? []).some(s =>
    s.toLowerCase().includes(sponsorNameLower) || sponsorNameLower.includes(s.toLowerCase())
  );
}

const sponsorSummary = new Map();
let totalIssues = 0;

for (const row of rows) {
  const { attendeeId, companyName } = row;
  const delegate = attendees.find(a => a.id === attendeeId);

  if (!sponsorSummary.has(companyName)) {
    sponsorSummary.set(companyName, { total: 0, optInCount: 0, wrongBadge: [] });
  }
  const summary = sponsorSummary.get(companyName);
  summary.total++;

  if (!delegate) {
    // Delegate not found — badge would not show (no optInSponsors)
    continue;
  }

  const optIn = hasDelegateOptIn(delegate, companyName);
  if (optIn) {
    summary.optInCount++;
  } else {
    summary.wrongBadge.push(`${delegate.firstName} ${delegate.lastName} (${delegate.company})`);
  }
}

console.log('\n=== OPT-IN BADGE AUDIT (exact server logic) ===\n');

for (const [sponsor, data] of [...sponsorSummary.entries()].sort()) {
  if (data.wrongBadge.length > 0) {
    // Check if badge is actually being shown — only matters if hasDelegateOptIn returns true
    // The wrongBadge list here means hasDelegateOptIn returns FALSE for these delegates
    // So the badge would NOT be shown for them — this is actually CORRECT behaviour
    // We want to find cases where hasDelegateOptIn returns TRUE but delegate didn't opt in
    // That would be a false positive in the matching logic
  }
  // Actually: wrongBadge = delegates where optIn=false (badge correctly hidden)
  // We need to find: delegates where optIn=true but they didn't explicitly list this sponsor
  // Let's re-examine: check delegates where optIn=true and print their actual opt-in list
}

// Re-run: find false positives (badge shown but delegate didn't explicitly opt in to this sponsor)
console.log('Checking for FALSE POSITIVES (badge shown incorrectly)...\n');
let falsePositives = 0;

for (const row of rows) {
  const { attendeeId, companyName } = row;
  const delegate = attendees.find(a => a.id === attendeeId);
  if (!delegate) continue;

  const sponsorNameLower = companyName.toLowerCase();
  const opts = delegate.optInSponsors ?? [];
  
  // Check each opt-in entry individually
  const matchingEntries = opts.filter(s =>
    s.toLowerCase().includes(sponsorNameLower) || sponsorNameLower.includes(s.toLowerCase())
  );

  if (matchingEntries.length > 0) {
    // Badge WOULD be shown — check if this is a legitimate match
    // A legitimate match: the opt-in entry clearly refers to this sponsor
    // A false positive: the opt-in entry matches due to substring overlap with unrelated sponsor
    
    // Flag suspicious matches where the matched entry is very short (< 4 chars) or generic
    for (const entry of matchingEntries) {
      const entryLower = entry.toLowerCase();
      // Flag if the match is only because sponsorName contains a very short opt-in string
      if (entryLower.length < 4 && sponsorNameLower.includes(entryLower)) {
        console.log(`⚠️  SUSPICIOUS: ${delegate.firstName} ${delegate.lastName} → ${companyName}`);
        console.log(`   Opt-in entry "${entry}" matched sponsor "${companyName}" via substring`);
        falsePositives++;
      }
    }
  }
}

if (falsePositives === 0) {
  console.log('No suspicious false positives found in the matching logic.\n');
}

// Now show the full picture: for each sponsor, how many delegates opted in vs didn't
console.log('\n=== FULL SUMMARY ===\n');
for (const [sponsor, data] of [...sponsorSummary.entries()].sort()) {
  const icon = data.wrongBadge.length === 0 ? '✅' : '⚪';
  console.log(`${icon} ${sponsor}: ${data.optInCount}/${data.total} meetings have opt-in badge`);
  if (data.wrongBadge.length > 0) {
    console.log(`   No badge for: ${data.wrongBadge.join(', ')}`);
  }
}

console.log(`\nTotal meetings without opt-in badge: ${[...sponsorSummary.values()].reduce((s, v) => s + v.wrongBadge.length, 0)}`);
console.log(`Total meetings with opt-in badge: ${[...sponsorSummary.values()].reduce((s, v) => s + v.optInCount, 0)}`);
