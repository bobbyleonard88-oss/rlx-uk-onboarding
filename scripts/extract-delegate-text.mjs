import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT 
    id,
    attendeeId,
    primaryMeetingObjective,
    activeConfirmedProjects,
    currentPainPoints,
    keySolutionAreas,
    toolsOther,
    toolsATS,
    toolsCRM,
    toolsAssessments,
    toolsTalentIntelligence,
    currentProjectStage,
    challenges,
    interests
  FROM delegateProfiles
  WHERE primaryMeetingObjective IS NOT NULL
     OR activeConfirmedProjects IS NOT NULL
     OR currentPainPoints IS NOT NULL
     OR keySolutionAreas IS NOT NULL
`);

await conn.end();

fs.writeFileSync('/home/ubuntu/delegate-text-raw.json', JSON.stringify(rows, null, 2));
console.log(`Extracted ${rows.length} delegate profiles`);
