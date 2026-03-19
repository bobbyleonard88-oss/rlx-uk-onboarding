import * as db from './db.ts';
import { attendees } from './attendees.ts';
import { invokeLLM } from './_core/llm.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();
const allRankings = await db.getAllRankingsSubmissions();
const allDelegateProfiles = await db.getAllDelegateProfiles();

function getSponsorId(name) {
  for (const i of allIntakes) {
    const n = i.companyName?.toLowerCase() || '';
    if (n.includes(name.toLowerCase()) || name.toLowerCase().includes(n)) return i.sponsorId;
  }
  return null;
}

function getSponsorIntake(sponsorId) {
  return allIntakes.find(i => i.sponsorId === sponsorId);
}

function getDelegateProfile(attendeeId) {
  return allDelegateProfiles.find(p => p.attendeeId === attendeeId);
}

function findA(fn, ln) {
  return attendees.find(a => a.firstName?.toLowerCase() === fn.toLowerCase() && a.lastName?.toLowerCase() === ln.toLowerCase());
}

function getRank(sponsorId, attendeeId) {
  const rankings = JSON.parse(allRankings.find(r => r.sponsorId === sponsorId)?.rankingsData || '[]');
  const idx = rankings.indexOf(String(attendeeId));
  return idx >= 0 ? `#${idx + 1}` : 'unranked';
}

async function scoreMatch(delegateName, delegateProfile, sponsorName, sponsorIntake) {
  if (!delegateProfile || !sponsorIntake) return { score: 'N/A', reason: 'Missing intake data' };
  const prompt = `You are a B2B meeting matchmaker for an HR tech event. Score the match between a delegate and a vendor sponsor.

DELEGATE: ${delegateName}
Role: ${delegateProfile.jobTitle || 'N/A'}
Company: ${delegateProfile.company || 'N/A'}
ATS: ${delegateProfile.toolsATS || 'N/A'}
Assessment Tools: ${delegateProfile.toolsAssessments || 'N/A'}
Other Tools: ${delegateProfile.toolsOther || 'N/A'}
Active Projects: ${delegateProfile.activeConfirmedProjects || 'N/A'}
Key Solution Areas: ${delegateProfile.keySolutionAreas || 'N/A'}
Pain Points: ${delegateProfile.currentPainPoints || 'N/A'}
Primary Objective: ${delegateProfile.primaryMeetingObjective || 'N/A'}
Org Size: ${delegateProfile.totalOrgEmployees || 'N/A'} employees, ${delegateProfile.hiresPerYear || 'N/A'} hires/year
Budget: ${delegateProfile.activeProjectBudget || 'N/A'}
Decision Level: ${delegateProfile.decisionMakingLevel || 'N/A'}

SPONSOR/VENDOR: ${sponsorName}
Technology Type: ${sponsorIntake.technologyType || 'N/A'}
Company Description: ${sponsorIntake.companyBoilerplate || 'N/A'}
Key Challenges They Solve: ${sponsorIntake.keyChallenges || 'N/A'}
Target Org Size: ${sponsorIntake.targetOrgSize || 'N/A'}

Provide:
1. A match score from 0-100 (integer only)
2. A 2-3 sentence match reason explaining the specific alignment. Be honest about weak matches.

Respond in JSON: {"score": 75, "reason": "..."}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_schema', json_schema: { name: 'match', strict: true, schema: { type: 'object', properties: { score: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'reason'], additionalProperties: false } } }
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (e) {
    return { score: 'N/A', reason: `Error: ${e.message}` };
  }
}

const veremarkId = getSponsorId('veremark');
const veremarkIntake = getSponsorIntake(veremarkId);

const kitterhing = findA('Jonathan', 'Kitterhing');
const kitterhingProfile = getDelegateProfile(kitterhing.id);
const kitterhingRank = getRank(veremarkId, kitterhing.id);

console.log('=== VEREMARK RESHUFFLE OPTIONS — SCORES & REASONS ===\n');
console.log(`Kitterhing (Swiss Re) rank at Veremark: ${kitterhingRank}\n`);

// Score Kitterhing vs Veremark
const kitterhingScore = await scoreMatch('Jonathan Kitterhing (Swiss Re)', kitterhingProfile, 'Veremark', veremarkIntake);
console.log(`Jonathan Kitterhing (Swiss Re) → Veremark`);
console.log(`  Score: ${kitterhingScore.score}%`);
console.log(`  Reason: ${kitterhingScore.reason}`);

// The three displaced delegates — score them at Veremark's slot 5 (same sponsor, just different slot — score is same)
// Actually we need to score the displaced delegates staying at Veremark but in a different slot
// The score doesn't change by slot — what changes is who gets displaced OUT of Veremark
// So we need to show: what's the current score of the displaced delegate at Veremark vs Kitterhing's new score

const displaced = [
  { fn: 'Mark', ln: 'Kunaseelan', company: 'University of the Arts London', fromSlot: 1, toSlot: 5 },
  { fn: 'Chris', ln: 'Tennant', company: 'Infor', fromSlot: 2, toSlot: 5 },
  { fn: 'Jules', ln: 'Anderson', company: 'Gilead Science', fromSlot: 7, toSlot: 5 },
];

console.log('\n=== DISPLACED DELEGATES (staying at Veremark, just moved to slot 5) ===');
for (const d of displaced) {
  const a = findA(d.fn, d.ln);
  const mtg = allMeetings.find(m => m.sponsorId === veremarkId && m.attendeeId === a.id);
  const rank = getRank(veremarkId, a.id);
  console.log(`\n  Option: Move ${d.fn} ${d.ln} (${d.company}) from slot ${d.fromSlot} → slot ${d.toSlot}`);
  console.log(`  Their current rank at Veremark: ${rank}, score: ${mtg?.matchScore}%`);
  console.log(`  (They stay in Veremark's schedule — just move to slot 5 where Syngenta was)`);
  console.log(`  → Opens slot ${d.fromSlot} for Kitterhing (${kitterhingScore.score}%)`);
}

console.log('\n=== SUMMARY ===');
console.log(`All 3 options bring in Kitterhing (Swiss Re, ${kitterhingRank}) at ${kitterhingScore.score}%`);
console.log(`vs current Syngenta (#13, 55%)`);
console.log(`\nBest displaced candidate (lowest ranked at Veremark):`);
console.log(`Chris Tennant (Infor, #46, 79%) — moves to slot 5, Kitterhing takes slot 2`);

process.exit(0);
