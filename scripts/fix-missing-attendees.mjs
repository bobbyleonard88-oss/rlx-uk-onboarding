import mysql from 'mysql2/promise';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all delegate profiles from DB
  const [dbRows] = await conn.execute('SELECT attendeeId, firstName, lastName, company, jobTitle FROM delegateProfiles');
  
  // Get all IDs from attendees.ts
  const attendeesFile = fs.readFileSync(join(__dirname, '../client/src/lib/attendees.ts'), 'utf8');
  const idMatches = attendeesFile.match(/"id": "([^"]+)"/g) || [];
  const libIds = new Set(idMatches.map(m => m.match(/"id": "([^"]+)"/)[1]));
  
  console.log('DB delegates:', dbRows.length);
  console.log('Lib attendees:', libIds.size);
  
  // Find DB rows not in lib
  const missingFromLib = dbRows.filter(row => !libIds.has(row.attendeeId));
  
  console.log('\nIn DB but NOT in attendees.ts lib:');
  missingFromLib.forEach(m => console.log(' ', m.attendeeId, '-', m.firstName, m.lastName, '|', m.company));
  
  if (missingFromLib.length === 0) {
    console.log('All delegates are in the lib!');
    await conn.end();
    return;
  }
  
  // Get full profile data for missing attendees
  const missingIds = missingFromLib.map(m => m.attendeeId);
  const placeholders = missingIds.map(() => '?').join(',');
  const [fullRows] = await conn.execute(
    `SELECT * FROM delegateProfiles WHERE attendeeId IN (${placeholders})`,
    missingIds
  );
  
  console.log('\nFull data for missing attendees:');
  fullRows.forEach(r => {
    console.log(JSON.stringify({
      id: r.attendeeId,
      firstName: r.firstName,
      lastName: r.lastName,
      jobTitle: r.jobTitle || '',
      company: r.company || '',
      companySize: r.companySize || '',
      industry: r.industry || '',
      hiresPerYear: r.hiresPerYear || '',
      regionalRemit: r.regionalRemit || '',
      decisionLevel: r.decisionLevel || '',
      activeProjects: r.activeProjects || '',
      activeProjectBudget: r.activeProjectBudget || '',
      meetingObjective: r.meetingObjective || '',
      budgetAuthority: r.budgetAuthority || '',
      assessmentTools: r.assessmentTools || '',
      ats: r.ats || '',
      crm: r.crm || '',
      marketIntelligence: r.marketIntelligence || '',
      otherTools: r.otherTools || '',
      solutionAreas: r.solutionAreas || '',
      painPoints: r.painPoints || '',
      projectStage: r.projectStage || '',
    }, null, 2));
  });
  
  await conn.end();
}

main().catch(console.error);
