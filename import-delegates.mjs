/**
 * Import delegate data from CSV to database
 */

import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/mysql2';
import { delegateProfiles } from './drizzle/schema.js';

const db = drizzle(process.env.DATABASE_URL);

// Parse CSV
const csvContent = readFileSync('./delegates.csv', 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

console.log('CSV Headers:', header);
console.log(`Total rows: ${lines.length - 1}`);

// Process each row
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Parse CSV line (handle quoted fields)
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  const [
    id,
    firstName,
    lastName,
    jobTitle,
    company,
    companySize,
    industry,
    taTeamSize,
    budgetAuthority,
    assessmentTools,
    ats,
    crm,
    marketIntel,
    otherTools
  ] = values;
  
  if (!id || !firstName || !lastName) {
    console.log(`Skipping row ${i}: missing required fields`);
    continue;
  }
  
  try {
    await db.insert(delegateProfiles).values({
      attendeeId: id,
      firstName: firstName.replace(/"/g, ''),
      lastName: lastName.replace(/"/g, ''),
      company: company?.replace(/"/g, '') || 'Unknown',
      jobTitle: jobTitle?.replace(/"/g, '') || null,
      industry: industry?.replace(/"/g, '') || null,
      challenges: assessmentTools?.replace(/"/g, '') || null,
      interests: `ATS: ${ats || 'N/A'}, CRM: ${crm || 'N/A'}, Market Intel: ${marketIntel || 'N/A'}`,
      profileData: JSON.stringify({
        companySize: companySize?.replace(/"/g, ''),
        taTeamSize: taTeamSize?.replace(/"/g, ''),
        budgetAuthority: budgetAuthority?.replace(/"/g, ''),
        assessmentTools: assessmentTools?.replace(/"/g, ''),
        ats: ats?.replace(/"/g, ''),
        crm: crm?.replace(/"/g, ''),
        marketIntel: marketIntel?.replace(/"/g, ''),
        otherTools: otherTools?.replace(/"/g, ''),
      }),
    }).onDuplicateKeyUpdate({
      set: {
        firstName: firstName.replace(/"/g, ''),
        lastName: lastName.replace(/"/g, ''),
        company: company?.replace(/"/g, '') || 'Unknown',
        updatedAt: new Date(),
      }
    });
    
    console.log(`✓ Imported: ${firstName} ${lastName} (${company})`);
  } catch (error) {
    console.error(`✗ Error importing row ${i}:`, error.message);
  }
}

console.log('\nImport complete!');
process.exit(0);
