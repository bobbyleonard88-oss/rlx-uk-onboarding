import * as db from './db.ts';
import { attendees } from './attendees.ts';
import { invokeLLM } from './_core/llm.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();
const allDelegateProfiles = await db.getAllDelegateProfiles();

function findAttendee(firstName, lastName) {
  return attendees.find(a =>
    a.firstName?.toLowerCase() === firstName.toLowerCase() &&
    a.lastName?.toLowerCase() === lastName.toLowerCase()
  );
}

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

function getDelegateIntake(attendeeId) {
  return allDelegateProfiles.find(p => p.attendeeId === attendeeId);
}

function findMeeting(sponsorId, attendeeId) {
  return allMeetings.find(m => m.sponsorId === sponsorId && m.attendeeId === attendeeId);
}

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

async function scoreMatch(delegateName, delegateIntake, sponsorName, sponsorIntake) {
  if (!delegateIntake || !sponsorIntake) return { score: 'N/A', reason: 'Missing intake data' };
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
    return JSON.parse(response.choices[0].message.content);
  } catch (e) {
    return { score: 'N/A', reason: `Error: ${e.message}` };
  }
}

// ============================================================
// TIER 2 SWAP 1: Oliver Browne (Lockton) — JobSync → Veremark
//               Yuliia Zembal (UKRSIBBANK) — Veremark → JobSync
// ============================================================
const oliverBrowne = findAttendee('Oliver', 'Browne');
const yuliiaZembal = findAttendee('Yuliia', 'Zembal');
const jobsyncId = getSponsorId('jobsync');
const veremarkId = getSponsorId('veremark');

const oliverJobsyncMtg = findMeeting(jobsyncId, oliverBrowne.id);
const yuliiaVeremarkMtg = findMeeting(veremarkId, yuliiaZembal.id);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 TIER 2 SWAP 1: Oliver Browne (Lockton) — JobSync → Veremark');
console.log('   Yuliia Zembal (UKRSIBBANK) — Veremark → JobSync');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Current state
const oliverJobsyncCurrent = { score: oliverJobsyncMtg?.matchScore, reason: oliverJobsyncMtg?.matchReason };
const yuliiaVeremarkCurrent = { score: yuliiaVeremarkMtg?.matchScore, reason: yuliiaVeremarkMtg?.matchReason };

console.log(`\nCURRENT:`);
console.log(`  Oliver Browne (Lockton) @ JobSync — slot ${oliverJobsyncMtg?.timeSlot} (${slotLabels[oliverJobsyncMtg?.timeSlot]})`);
console.log(`  Score: ${oliverJobsyncCurrent.score}% | Reason: ${oliverJobsyncCurrent.reason}`);
console.log(`  Yuliia Zembal (UKRSIBBANK) @ Veremark — slot ${yuliiaVeremarkMtg?.timeSlot} (${slotLabels[yuliiaVeremarkMtg?.timeSlot]})`);
console.log(`  Score: ${yuliiaVeremarkCurrent.score}% | Reason: ${yuliiaVeremarkCurrent.reason}`);

// Generate new scores
const oliverVeremarkIntake = getSponsorIntake(veremarkId);
const jobsyncIntake = getSponsorIntake(jobsyncId);
const oliverDelegateIntake = getDelegateIntake(oliverBrowne.id);
const yuliiaDelegateIntake = getDelegateIntake(yuliiaZembal.id);

const oliverVeremarkNew = await scoreMatch('Oliver Browne (Lockton)', oliverDelegateIntake, 'Veremark', oliverVeremarkIntake);
const yuliiaJobsyncNew = await scoreMatch('Yuliia Zembal (UKRSIBBANK)', yuliiaDelegateIntake, 'JobSync', jobsyncIntake);

console.log(`\nIF SWAPPED:`);
console.log(`  ➡️  Oliver Browne (Lockton) @ Veremark`);
console.log(`  Score: ${oliverVeremarkNew.score}% | Reason: ${oliverVeremarkNew.reason}`);
console.log(`  ➡️  Yuliia Zembal (UKRSIBBANK) @ JobSync`);
console.log(`  Score: ${yuliiaJobsyncNew.score}% | Reason: ${yuliiaJobsyncNew.reason}`);

// ============================================================
// TIER 2 SWAP 2: Tush Wijeratne (WPP) — JobSync → Wilson
//               Mark Coad (GSK) — Wilson → JobSync
// ============================================================
const tushWijeratne = findAttendee('Tush', 'Wijeratne');
const markCoad = findAttendee('Mark', 'Coad');
const wilsonId = getSponsorId('wilson');

const tushJobsyncMtg = findMeeting(jobsyncId, tushWijeratne.id);
const markWilsonMtg = findMeeting(wilsonId, markCoad.id);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 TIER 2 SWAP 2: Tush Wijeratne (WPP) — JobSync → Wilson');
console.log('   Mark Coad (GSK) — Wilson → JobSync');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const tushJobsyncCurrent = { score: tushJobsyncMtg?.matchScore, reason: tushJobsyncMtg?.matchReason };
const markWilsonCurrent = { score: markWilsonMtg?.matchScore, reason: markWilsonMtg?.matchReason };

console.log(`\nCURRENT:`);
console.log(`  Tush Wijeratne (WPP) @ JobSync — slot ${tushJobsyncMtg?.timeSlot} (${slotLabels[tushJobsyncMtg?.timeSlot]})`);
console.log(`  Score: ${tushJobsyncCurrent.score}% | Reason: ${tushJobsyncCurrent.reason}`);
console.log(`  Mark Coad (GSK) @ Wilson — slot ${markWilsonMtg?.timeSlot} (${slotLabels[markWilsonMtg?.timeSlot]})`);
console.log(`  Score: ${markWilsonCurrent.score}% | Reason: ${markWilsonCurrent.reason}`);

const wilsonIntake = getSponsorIntake(wilsonId);
const tushDelegateIntake = getDelegateIntake(tushWijeratne.id);
const markDelegateIntake = getDelegateIntake(markCoad.id);

const tushWilsonNew = await scoreMatch('Tush Wijeratne (WPP)', tushDelegateIntake, 'Wilson', wilsonIntake);
const markJobsyncNew = await scoreMatch('Mark Coad (GSK)', markDelegateIntake, 'JobSync', jobsyncIntake);

console.log(`\nIF SWAPPED:`);
console.log(`  ➡️  Tush Wijeratne (WPP) @ Wilson`);
console.log(`  Score: ${tushWilsonNew.score}% | Reason: ${tushWilsonNew.reason}`);
console.log(`  ➡️  Mark Coad (GSK) @ JobSync`);
console.log(`  Score: ${markJobsyncNew.score}% | Reason: ${markJobsyncNew.reason}`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SUMMARY IN STANDARD FORMAT:');
console.log(`JobSync - Oliver Browne (#47, ${oliverJobsyncCurrent.score}%) > Veremark: Oliver Browne (#3, ${oliverVeremarkNew.score}%)`);
console.log(`Veremark - Yuliia Zembal (#?, ${yuliiaVeremarkCurrent.score}%) > JobSync: Yuliia Zembal (#?, ${yuliiaJobsyncNew.score}%)`);
console.log(`JobSync - Tush Wijeratne (#46, ${tushJobsyncCurrent.score}%) > Wilson: Tush Wijeratne (#6, ${tushWilsonNew.score}%)`);
console.log(`Wilson - Mark Coad (#16, ${markWilsonCurrent.score}%) > JobSync: Mark Coad (#24, ${markJobsyncNew.score}%)`);

process.exit(0);
