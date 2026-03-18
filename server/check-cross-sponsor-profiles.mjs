import * as db from './db.ts';
import { attendees } from './attendees.ts';
import { invokeLLM } from './_core/llm.ts';

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();
const allIntakes = await db.getAllIntakeSubmissions();

// Build lookup maps
const sponsorIntakeMap = new Map(); // sponsorId -> intake
for (const r of allIntakes) sponsorIntakeMap.set(r.sponsorId, r);

const rankingsMap = new Map(); // sponsorId -> ranked array of attendeeIds
for (const r of allRankings) {
  if (r.rankingsData) rankingsMap.set(r.sponsorId, JSON.parse(r.rankingsData));
}

const delegateIntakeMap = new Map(); // attendeeId -> intake submission
const delegateIntakes = await db.getAllDelegateProfiles();
for (const d of delegateIntakes) delegateIntakeMap.set(d.attendeeId, d);

// Helper: get rank label
function getRank(sponsorId, attendeeId) {
  const list = rankingsMap.get(sponsorId) || [];
  const idx = list.indexOf(attendeeId);
  return idx >= 0 ? `#${idx+1} of ${list.length}` : 'unranked';
}

// The top swaps to analyse (from previous analysis)
const swaps = [
  // Tier 1
  { label: 'Jon Warwick (Sky) — Veremark → Harver', delegate: 'Jon Warwick', delegateCompany: 'Sky', fromSponsor: 'Veremark', toSponsor: 'Harver', displaced: 'James Harley', displacedCompany: 'Syngenta' },
  { label: 'Oliver Browne (Lockton) — JobSync → Veremark', delegate: 'Oliver Browne', delegateCompany: 'Lockton', fromSponsor: 'JobSync', toSponsor: 'Veremark', displaced: 'Yuliia Zembal', displacedCompany: 'UKRSIBBANK' },
  { label: 'Debbie Robinson (PepsiCo) — Radancy → Harver', delegate: 'Debbie Robinson', delegateCompany: 'PepsiCo', fromSponsor: 'Radancy', toSponsor: 'Harver', displaced: 'Jessica Shaunie Green', displacedCompany: 'Calor' },
  { label: 'Adam Binks (KPMG) — PerchPeek → Poetry', delegate: 'Adam Binks', delegateCompany: 'KPMG', fromSponsor: 'PerchPeek', toSponsor: 'Poetry', displaced: 'Sarah Cooper', displacedCompany: 'Rentokil' },
  { label: 'Tush Wijeratne (WPP) — JobSync → Wilson', delegate: 'Tush Wijeratne', delegateCompany: 'WPP', fromSponsor: 'JobSync', toSponsor: 'Wilson', displaced: 'Mark Coad', displacedCompany: 'GSK' },
  // Tier 2
  { label: 'Jules Anderson (Gilead) — JobSync → Happydance', delegate: 'Jules Anderson', delegateCompany: 'Gilead', fromSponsor: 'JobSync', toSponsor: 'Happydance', displaced: 'Andrew Boyd', displacedCompany: 'Convatec' },
  { label: 'Jules Anderson (Gilead) — JobSync → Amberjack', delegate: 'Jules Anderson', delegateCompany: 'Gilead', fromSponsor: 'JobSync', toSponsor: 'Amberjack', displaced: 'Lucy Bousfield', displacedCompany: 'Aon' },
  { label: 'Debbie Robinson (PepsiCo) — Radancy → hackajob', delegate: 'Debbie Robinson', delegateCompany: 'PepsiCo', fromSponsor: 'Radancy', toSponsor: 'hackajob', displaced: 'James Harley', displacedCompany: 'Syngenta' },
];

// Find attendee and sponsor IDs
function findAttendee(name) {
  const [first, ...rest] = name.split(' ');
  return attendees.find(a => a.firstName?.toLowerCase() === first.toLowerCase() && a.lastName?.toLowerCase() === rest.join(' ').toLowerCase());
}

function findSponsor(name) {
  for (const [id, intake] of sponsorIntakeMap) {
    if (intake.companyName?.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(intake.companyName?.toLowerCase())) {
      return { id, intake };
    }
  }
  return null;
}

// Generate match score and reason using LLM
async function generateMatch(delegateIntake, sponsorIntake, delegateName, sponsorName) {
  if (!delegateIntake || !sponsorIntake) {
    return { score: 'N/A', reason: 'Missing intake data' };
  }
    const prompt = `You are a B2B meeting matchmaker for an HR tech event. Score the match between a delegate and a vendor sponsor, and write a concise match reason.

DELEGATE: ${delegateName}
Role: ${delegateIntake.jobTitle || 'N/A'}
Company: ${delegateIntake.company || 'N/A'}
ATS: ${delegateIntake.toolsATS || 'N/A'}
Assessment Tools: ${delegateIntake.toolsAssessments || 'N/A'}
Other Tools: ${delegateIntake.toolsOther || 'N/A'}
Active Projects: ${delegateIntake.activeConfirmedProjects || 'N/A'}
Key Solution Areas: ${delegateIntake.keySolutionAreas || 'N/A'}
Pain Points: ${delegateIntake.currentPainPoints || 'N/A'}
Primary Objective: ${delegateIntake.primaryMeetingObjective || 'N/A'}
Org Size: ${delegateIntake.totalOrgEmployees || 'N/A'} employees, ${delegateIntake.hiresPerYear || 'N/A'} hires/year
Budget: ${delegateIntake.activeProjectBudget || 'N/A'}
Decision Level: ${delegateIntake.decisionMakingLevel || 'N/A'}

SPONSOR/VENDOR: ${sponsorName}
Technology Type: ${sponsorIntake.technologyType || 'N/A'}
Company Description: ${sponsorIntake.companyBoilerplate || 'N/A'}
Key Challenges They Solve: ${sponsorIntake.keyChallenges || 'N/A'}
Target Org Size: ${sponsorIntake.targetOrgSize || 'N/A'}

Provide:
1. A match score from 0-100 (integer only)
2. A 2-3 sentence match reason explaining WHY this is a good or poor match, focusing on specific alignment between the delegate's needs and the sponsor's offering. Be honest — if it's a weak match, say so.

Respond in JSON: {"score": 75, "reason": "..."}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_schema', json_schema: { name: 'match', strict: true, schema: { type: 'object', properties: { score: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'reason'], additionalProperties: false } } }
    });
    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (e) {
    return { score: 'N/A', reason: `Error: ${e.message}` };
  }
}

console.log('=== CROSS-SPONSOR SWAP ANALYSIS WITH MATCH SCORES & REASONS ===\n');

for (const swap of swaps) {
  const delegate = findAttendee(swap.delegate);
  const toSponsor = findSponsor(swap.toSponsor);
  const fromSponsor = findSponsor(swap.fromSponsor);
  const displaced = findAttendee(swap.displaced);
  const fromSponsorForDisplaced = fromSponsor; // displaced goes to fromSponsor
  
  if (!delegate || !toSponsor || !fromSponsor) {
    console.log(`⚠️  ${swap.label} — could not find IDs`);
    console.log(`   delegate: ${delegate?.id}, toSponsor: ${toSponsor?.id}, fromSponsor: ${fromSponsor?.id}\n`);
    continue;
  }
  
  const delegateIntake = delegateIntakeMap.get(delegate.id);
  const toSponsorIntake = toSponsor.intake;
  const fromSponsorIntake = fromSponsor.intake;
  const displacedIntake = displaced ? delegateIntakeMap.get(displaced.id) : null;
  
  const delegateRankInTo = getRank(toSponsor.id, delegate.id);
  const delegateRankInFrom = getRank(fromSponsor.id, delegate.id);
  const displacedRankInTo = displaced ? getRank(toSponsor.id, displaced.id) : 'N/A';
  const displacedRankInFrom = displaced ? getRank(fromSponsor.id, displaced.id) : 'N/A';
  
  // Generate match scores
  const [delegateToMatch, displacedFromMatch] = await Promise.all([
    generateMatch(delegateIntake, toSponsorIntake, `${delegate.firstName} ${delegate.lastName}`, swap.toSponsor),
    displaced ? generateMatch(displacedIntake, fromSponsorIntake, `${displaced.firstName} ${displaced.lastName}`, swap.fromSponsor) : Promise.resolve({ score: 'N/A', reason: 'N/A' }),
  ]);
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔄 ${swap.label}`);
  console.log(``);
  console.log(`  MOVE: ${delegate.firstName} ${delegate.lastName} (${swap.delegateCompany})`);
  console.log(`    From: ${swap.fromSponsor} (rank ${delegateRankInFrom}) → To: ${swap.toSponsor} (rank ${delegateRankInTo})`);
  console.log(`    New match score: ${delegateToMatch.score}%`);
  console.log(`    Reason: ${delegateToMatch.reason}`);
  console.log(``);
  if (displaced) {
    console.log(`  DISPLACED: ${displaced.firstName} ${displaced.lastName} (${swap.displacedCompany})`);
    console.log(`    From: ${swap.toSponsor} (rank ${displacedRankInTo}) → To: ${swap.fromSponsor} (rank ${displacedRankInFrom})`);
    console.log(`    New match score: ${displacedFromMatch.score}%`);
    console.log(`    Reason: ${displacedFromMatch.reason}`);
  }
  console.log('');
}

process.exit(0);
