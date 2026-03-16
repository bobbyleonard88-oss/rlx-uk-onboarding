/**
 * check-shl-exclusions.ts
 * Shows exactly which delegates are excluded for SHL (750001) and why,
 * and how many meetings each remaining delegate already has.
 */
import 'dotenv/config';
import * as db from './server/db';

const SHL_HARD_EXCLUSIONS = new Set([
  '76678269091','7258470500','91889321035','13454401',
  '93174643474','200543495570','91862577670','190937723960'
]);

async function main() {
  const delegates = await db.getAllDelegateProfiles();
  const allMeetings = await db.getAllMeetings();
  
  const meetingCounts = new Map<string, number>();
  for (const m of allMeetings) {
    if (m.sponsorId === 750001) continue; // ignore SHL's own meetings
    meetingCounts.set(m.attendeeId, (meetingCounts.get(m.attendeeId) || 0) + 1);
  }

  const shlKeywords = ['shl'];

  console.log(`Total delegates: ${delegates.length}\n`);
  console.log('=== EXCLUDED ===');
  
  let hardCount = 0, techCount = 0, capCount = 0;
  const eligible: typeof delegates = [];

  for (const d of delegates) {
    const name = `${d.firstName} ${d.lastName}`;
    const count = meetingCounts.get(d.attendeeId) || 0;
    
    if (SHL_HARD_EXCLUSIONS.has(d.attendeeId)) {
      console.log(`  HARD: ${name} (${d.company}) — named existing client`);
      hardCount++;
      continue;
    }
    
    const techFields = [d.ats, d.crm, d.assessmentTool, d.marketIntelligence, d.otherTools]
      .join(' ').toLowerCase();
    if (shlKeywords.some(kw => techFields.includes(kw))) {
      console.log(`  TECH: ${name} (${d.company}) — has SHL in tech stack`);
      techCount++;
      continue;
    }
    
    if (count >= 8) {
      console.log(`  CAP:  ${name} (${d.company}) — at 8-meeting cap`);
      capCount++;
      continue;
    }
    
    eligible.push(d);
  }

  console.log(`\nHard excluded: ${hardCount}`);
  console.log(`Tech-stack excluded: ${techCount}`);
  console.log(`At cap: ${capCount}`);
  console.log(`\n=== ELIGIBLE (${eligible.length} delegates) ===`);
  for (const d of eligible) {
    const count = meetingCounts.get(d.attendeeId) || 0;
    console.log(`  ${d.firstName} ${d.lastName} (${d.company}) — ${count} meetings so far`);
  }
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
