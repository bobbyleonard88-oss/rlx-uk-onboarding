import { readFileSync } from 'fs';

const content = readFileSync('./server/attendees.ts', 'utf8');
// Strip the TS export wrapper to get the JSON array
const match = content.match(/=\s*(\[[\s\S]*\]);?\s*$/);
if (!match) { console.error('Could not parse attendees'); process.exit(1); }

const attendees = JSON.parse(match[1]);

for (const a of attendees) {
  console.log(`\n=== ${a.firstName} ${a.lastName} | ${a.company} ===`);
  console.log(`  Objective : ${a.primaryMeetingObjective || ''}`);
  console.log(`  Pain Pts  : ${a.currentPainPoints || ''}`);
  console.log(`  Solutions : ${a.keySolutionAreasOfInterest || ''}`);
  console.log(`  Projects  : ${a.activeConfirmedProjects || ''}`);
}
