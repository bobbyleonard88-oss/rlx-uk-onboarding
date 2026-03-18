
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Get all meetings that were swapped - we need attendeeId -> name mapping
// The attendee names are stored in the attendees static file, but we can get
// them from the meetings table via delegateProfile JSON or from the attendees list
const [meetings] = await conn.execute(`
  SELECT m.id, m.attendeeId, m.timeSlot, m.matchReason,
         s.companyName as sponsorName,
         JSON_UNQUOTE(JSON_EXTRACT(m.delegateProfile, '$.name')) as delegateName,
         JSON_UNQUOTE(JSON_EXTRACT(m.delegateProfile, '$.company')) as delegateCompany,
         JSON_UNQUOTE(JSON_EXTRACT(m.delegateProfile, '$.jobTitle')) as delegateTitle
  FROM meetings m
  JOIN sponsors s ON s.id = m.sponsorId
  ORDER BY s.companyName, m.timeSlot
`);

// Build attendeeId -> name map
const nameMap = {};
for (const m of meetings) {
  if (m.delegateName && !nameMap[m.attendeeId]) {
    nameMap[m.attendeeId] = {
      name: m.delegateName,
      company: m.delegateCompany || '',
      title: m.delegateTitle || ''
    };
  }
}

console.log(JSON.stringify(nameMap));
await conn.end();
