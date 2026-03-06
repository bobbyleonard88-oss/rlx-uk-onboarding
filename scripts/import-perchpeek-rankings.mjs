/**
 * Import PerchPeek rankings from RLUKSelection-Finalsheet.csv
 * Maps CSV attendees to delegateProfiles by name/company matching
 * Creates a rankingsSubmissions entry for PerchPeek (sponsorId: 450001)
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CSV data from RLUKSelection-Finalsheet.csv (parsed manually)
const csvData = [
  { name: "James Kennedy", company: "Palo Alto Networks", points: 8 },
  { name: "Martin McDermott", company: "IQ-EQ", points: 7.5 },
  { name: "Robyn Collins", company: "M42", points: 7.5 },
  { name: "Chris Tennant", company: "Infor", points: 7 },
  { name: "Michelle Monahan", company: "European Tyre Enterprise Limited", points: 7 },
  { name: "James Boyle", company: "Latham & Watkins", points: 6 },
  { name: "Oliver Browne", company: "Lockton", points: 6 },
  { name: "Jonathan Kitterhing Best", company: "Swiss Re Management Ltd", points: 6 },
  { name: "Julie Lowe", company: "easyJet", points: 6 },
  { name: "Joanna Hackett", company: "Howden", points: 6 },
  { name: "Theresa O'Brien", company: "CBRE", points: 7 },
  { name: "Caroline Loubert", company: "Argus Media Ltd", points: 5.5 },
  { name: "Anna Katyal", company: "BMS Group", points: 5.5 },
  { name: "Jennifer Cunningham", company: "Pearson", points: 5 },
  { name: "Claudia Sneddon Da Silva Raposo", company: "Expleo Group", points: 5 },
  { name: "Alan MacKinnon", company: "Smith and Nephew plc", points: 5 },
  { name: "Christopher Widdison", company: "Macquarie", points: 5 },
  { name: "Jules Anderson", company: "Gilead Sciences", points: 5 },
  { name: "Jessica Shaunie Green", company: "Calor Gas", points: 5 },
  { name: "Laura Callaghan", company: "Western Union", points: 5 },
  { name: "Lucy Bousfield", company: "Aon", points: 4.5 },
  { name: "James Harley", company: "Syngenta", points: 4.5 },
  { name: "Joanna Saunders-Hare", company: "MUFG", points: 4.5 },
  { name: "Nuria Munoz", company: "Munich Re", points: 4.5 },
  { name: "Sarah Cooper", company: "Rentokil Initial", points: 4.5 },
  { name: "Jen Hulme", company: "BPP", points: 4.5 },
  { name: "Hollie Jordan", company: "Ramboll", points: 4 },
  { name: "Nainik Patel", company: "Hitachi", points: 4 },
  { name: "David Nottage", company: "Screwfix", points: 4 },
  { name: "Natalie McGuinness", company: "Busy Bees Nurseries", points: 4 },
  { name: "Sonal Jain", company: "Nissan Motor Corporation", points: 4 },
  { name: "Carly George", company: "AXA", points: 4 },
  { name: "Salina Budaly", company: "Balfour Beatty", points: 3.5 },
  { name: "Mark Brooker", company: "BT Group", points: 3.5 },
  { name: "Mark Coad", company: "GSK", points: 3.5 },
  { name: "Tush Wijeratne", company: "WPP", points: 3 },
  { name: "Peter Buchanan-Parker", company: "JPMorgan Chase", points: 3 },
  { name: "Nikhilesh Mathur", company: "London Stock Exchange Group", points: 3 },
  { name: "Edwin Pene", company: "Red Bull", points: 3 },
  { name: "Lisa Brignall", company: "Coca-Cola Europacific Partners", points: 3 },
  { name: "Jon Warwick", company: "Sky", points: 2 },
  { name: "Ciaran O'Regan", company: "the LEGO Group", points: 2 },
  { name: "Adam Binks", company: "KPMG", points: 2 },
  { name: "Yuliia Zembal", company: "UKRSIBBANK BNP PARIBAS GROUP", points: 2 },
  { name: "Rikki Fullerton", company: "Serco", points: 1.5 },
  { name: "Cath Possamai", company: "Amazon", points: 1 },
  { name: "Debbie Robinson", company: "PepsiCo", points: 0 },
];

const PERCHPEEK_SPONSOR_ID = 450001;

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
}

function normalizeCompany(company) {
  return company.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function matchDelegate(csvRow, delegates) {
  const csvFirstName = csvRow.name.split(' ')[0].toLowerCase();
  const csvLastName = csvRow.name.split(' ').slice(1).join(' ').toLowerCase();
  const csvCompanyNorm = normalizeCompany(csvRow.company);

  // Try exact last name + company match first
  for (const d of delegates) {
    const dbLastNorm = normalizeName(d.lastName);
    const dbCompanyNorm = normalizeCompany(d.company);
    
    if (dbLastNorm.includes(csvLastName) || csvLastName.includes(dbLastNorm)) {
      if (dbCompanyNorm.includes(csvCompanyNorm.split(' ')[0]) || 
          csvCompanyNorm.includes(dbCompanyNorm.split(' ')[0])) {
        return d;
      }
    }
  }

  // Try first name + last name match
  for (const d of delegates) {
    const dbFirstNorm = normalizeName(d.firstName);
    const dbLastNorm = normalizeName(d.lastName);
    
    if (dbFirstNorm === csvFirstName && 
        (dbLastNorm.includes(csvLastName) || csvLastName.includes(dbLastNorm))) {
      return d;
    }
  }

  // Try company-only match with partial last name
  for (const d of delegates) {
    const dbCompanyNorm = normalizeCompany(d.company);
    const dbLastNorm = normalizeName(d.lastName);
    
    if (csvCompanyNorm.includes(dbCompanyNorm.split(' ')[0]) && 
        dbLastNorm.includes(csvLastName.split(' ')[0])) {
      return d;
    }
  }

  return null;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Get all delegates
    const [delegates] = await conn.execute(
      'SELECT attendeeId, firstName, lastName, company, jobTitle FROM delegateProfiles'
    );
    
    console.log(`Found ${delegates.length} delegates in database`);
    console.log(`Processing ${csvData.length} CSV rows...\n`);
    
    const ranked = [];
    const unmatched = [];
    
    for (const csvRow of csvData) {
      const match = matchDelegate(csvRow, delegates);
      if (match) {
        ranked.push({
          attendeeId: match.attendeeId,
          name: `${match.firstName} ${match.lastName}`,
          company: match.company,
          points: csvRow.points,
          csvName: csvRow.name,
        });
      } else {
        unmatched.push(csvRow);
      }
    }
    
    // Sort by points descending
    ranked.sort((a, b) => b.points - a.points);
    
    console.log('=== MATCHED ===');
    ranked.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name} (${r.company}) - ${r.points} pts [ID: ${r.attendeeId}]`);
    });
    
    console.log('\n=== UNMATCHED ===');
    unmatched.forEach(u => {
      console.log(`- ${u.name} (${u.company}) - ${u.points} pts`);
    });
    
    // Build rankingsData JSON: array of attendeeIds in ranked order
    const rankingsData = ranked.map(r => ({
      attendeeId: r.attendeeId,
      points: r.points,
      name: r.name,
      company: r.company,
    }));
    
    // Check if there's an existing ranking for PerchPeek
    const [existing] = await conn.execute(
      'SELECT id FROM rankingsSubmissions WHERE sponsorId = ?',
      [PERCHPEEK_SPONSOR_ID]
    );
    
    // Get PerchPeek's userId
    const [sponsor] = await conn.execute(
      'SELECT userId FROM sponsors WHERE id = ?',
      [PERCHPEEK_SPONSOR_ID]
    );
    const userId = sponsor[0].userId;
    
    const rankingsJson = JSON.stringify(rankingsData);
    
    if (existing.length > 0) {
      // Update existing
      await conn.execute(
        `UPDATE rankingsSubmissions 
         SET rankingsData = ?, status = 'pending', isReviewed = 0, submittedAt = NOW(), updatedAt = NOW()
         WHERE sponsorId = ?`,
        [rankingsJson, PERCHPEEK_SPONSOR_ID]
      );
      console.log(`\n✅ Updated existing rankings submission (id: ${existing[0].id})`);
    } else {
      // Insert new
      const [result] = await conn.execute(
        `INSERT INTO rankingsSubmissions (sponsorId, userId, rankingsData, status, isReviewed, isArchived, submittedAt)
         VALUES (?, ?, ?, 'pending', 0, 0, NOW())`,
        [PERCHPEEK_SPONSOR_ID, userId, rankingsJson]
      );
      console.log(`\n✅ Created new rankings submission (id: ${result.insertId})`);
    }
    
    console.log(`\nTotal ranked: ${ranked.length}`);
    console.log(`Total unmatched: ${unmatched.length}`);
    
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
