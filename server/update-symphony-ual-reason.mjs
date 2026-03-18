import * as db from './db.ts';
import { attendees } from './attendees.ts';

const SYMPHONY_ID = 330001;

const allMeetings = await db.getAllMeetings();
const ual = attendees.find(a => a.company?.includes('University of the Arts'));
const ualMeeting = allMeetings.find(m => m.sponsorId === SYMPHONY_ID && m.attendeeId === ual?.id);

if (!ualMeeting) throw new Error('UAL meeting not found for Symphony');

console.log(`Found meeting id: ${ualMeeting.id}, current score: ${ualMeeting.matchScore}%`);

// New match reason — focused on process modernisation, candidate experience, and multi-site consistency
// NOT referencing ATS, onboarding platform, or background screening
const newMatchReason = `University of the Arts London is undergoing a significant digital transformation across a complex multi-site structure spanning Colleges, Research Centres, and subsidiaries. Mark's core challenge — inconsistent local processes, a fragmented and dated tech stack, and the need to deliver staffing efficiencies — aligns directly with Symphony Talent's strength in unifying employer brand, media, and recruitment technology into a single connected framework. Symphony Talent's ability to create consistent, compelling candidate experiences across diverse hiring audiences makes them well-placed to support UAL's goal of standardising their resourcing approach and building a business case for their People digital roadmap.`;

// Score: 62% — genuine alignment on candidate experience and process consistency,
// but primary active projects (ATS, background screening) are outside Symphony's offering
const newScore = 62;

await db.updateMeeting(ualMeeting.id, {
  matchScore: newScore,
  matchReason: newMatchReason,
});

console.log(`\n✅ Updated UAL match for Symphony Talent`);
console.log(`  Score: ${ualMeeting.matchScore}% → ${newScore}%`);
console.log(`  Reason: ${newMatchReason}`);

process.exit(0);
