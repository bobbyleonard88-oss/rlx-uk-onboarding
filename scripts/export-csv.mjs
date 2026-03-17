import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
dotenv.config();

const TIME_SLOT_LABELS = {
  1: "Wed 10:15-10:45",
  2: "Wed 10:45-11:15",
  3: "Wed 13:30-14:00",
  4: "Wed 14:00-14:30",
  5: "Wed 14:45-15:15",
  6: "Wed 15:15-15:45",
  7: "Thu 10:30-11:00",
  8: "Thu 11:00-11:30",
  9: "Thu 13:15-13:45",
  10: "Thu 13:45-14:15",
  11: "Thu 14:30-15:00",
  12: "Thu 15:00-15:30",
};

const ATTENDEES = {
  "18336502": { name: "Adam Binks", company: "Vodafone" },
  "18336503": { name: "Alan MacKinnon", company: "Smith + Nephew" },
  "18336504": { name: "Alex Sheridan", company: "Morrisons" },
  "18336505": { name: "Anna Katyal", company: "Unilever" },
  "18336506": { name: "Carly George", company: "AXA" },
  "18336507": { name: "Cath Possamai", company: "Amazon" },
  "18336508": { name: "Chris Tennant", company: "Tesco" },
  "18336509": { name: "Ciaran O'Regan", company: "Primark" },
  "18336510": { name: "Edwin Pene", company: "Red Bull" },
  "18336511": { name: "Elaine Sherwood", company: "Centrica" },
  "18336512": { name: "Fiona Sherwood", company: "Barclays" },
  "18336513": { name: "Gemma Sherwood", company: "HSBC" },
  "18336514": { name: "Gillian Sherwood", company: "Lloyds" },
  "18336515": { name: "Joanna Saunders-Hare", company: "Rolls-Royce" },
  "18336516": { name: "Jon Warwick", company: "Sky" },
  "18336517": { name: "Jonathan Kitterhing", company: "Compass Group" },
  "18336518": { name: "Jules Anderson", company: "Gilead Science" },
  "18336519": { name: "Karen Sherwood", company: "National Grid" },
  "18336520": { name: "Laura Sherwood", company: "BT" },
  "18336521": { name: "Lena Sherwood", company: "Aviva" },
  "18336522": { name: "Mark Coad", company: "Whitbread" },
  "18336523": { name: "Mark Kunaseelan", company: "Deloitte" },
  "18336524": { name: "Martin Sherwood", company: "EDF" },
  "18336525": { name: "Michael Sherwood", company: "Sainsbury's" },
  "18336526": { name: "Nikhilesh Mathur", company: "Capgemini" },
  "18336527": { name: "Nuria Munoz", company: "Ferrovial" },
  "18336528": { name: "Paul Sherwood", company: "Diageo" },
  "18336529": { name: "Rachel Sherwood", company: "Marks & Spencer" },
  "18336530": { name: "Robyn Collins", company: "Boots" },
  "18336531": { name: "Sarah Sherwood", company: "John Lewis" },
  "18336532": { name: "Sharron Marsh", company: "Wickes" },
  "18336533": { name: "Sonal Jain", company: "Infosys" },
  "18336534": { name: "Sophie Sherwood", company: "Asos" },
  "18336535": { name: "Tush Wijeratne", company: "Jaguar Land Rover" },
  "18336536": { name: "Victoria Sherwood", company: "Virgin Media" },
  "18336537": { name: "Yuliia Zembal", company: "Mondelez" },
  "18336538": { name: "Jessica Shaunie Green", company: "Selfridges" },
  "18336539": { name: "Chris Sherwood", company: "Ocado" },
};

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT m.attendeeId, m.sponsorId, sp.companyName as sponsorName, 
         m.timeSlot, m.sponsorRepName, m.attendeeNumber, m.matchScore
  FROM meetings m
  LEFT JOIN sponsors sp ON sp.id = m.sponsorId
  ORDER BY m.timeSlot, sp.companyName, m.attendeeId
`);

console.log(`Total meetings: ${rows.length}`);

// Build CSV
const lines = ['Sponsor,Delegate Name,Company,Time Slot,Slot Number,Rep Name,Match Score,Table'];
for (const r of rows) {
  const attendee = ATTENDEES[r.attendeeId] || { name: `Attendee ${r.attendeeId}`, company: 'Unknown' };
  const slotLabel = TIME_SLOT_LABELS[r.timeSlot] || `Slot ${r.timeSlot}`;
  const score = r.matchScore ? `${Math.round(r.matchScore)}%` : 'N/A';
  lines.push([
    r.sponsorName || r.sponsorId,
    attendee.name,
    attendee.company,
    slotLabel,
    r.timeSlot,
    r.sponsorRepName || '',
    score,
    r.attendeeNumber || ''
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
}

const csvContent = lines.join('\n');
writeFileSync('/home/ubuntu/rlx-onboarding/scripts/meetings-export.csv', csvContent);
console.log('CSV written to scripts/meetings-export.csv');

// Also generate a per-delegate schedule
const delegateLines = ['Delegate Name,Company,Slot 1 (Wed 10:15),Slot 2 (Wed 10:45),Slot 3 (Wed 13:30),Slot 4 (Wed 14:00),Slot 5 (Wed 14:45),Slot 6 (Wed 15:15),Slot 7 (Thu 10:30),Slot 8 (Thu 11:00),Slot 9 (Thu 13:15),Slot 10 (Thu 13:45),Slot 11 (Thu 14:30),Slot 12 (Thu 15:00),Total Meetings'];

// Group by attendee
const byAttendee = {};
for (const r of rows) {
  if (!byAttendee[r.attendeeId]) byAttendee[r.attendeeId] = {};
  byAttendee[r.attendeeId][r.timeSlot] = r.sponsorName || r.sponsorId;
}

for (const [attendeeId, slots] of Object.entries(byAttendee)) {
  const attendee = ATTENDEES[attendeeId] || { name: `Attendee ${attendeeId}`, company: 'Unknown' };
  const row = [attendee.name, attendee.company];
  for (let s = 1; s <= 12; s++) {
    row.push(slots[s] || '');
  }
  row.push(Object.keys(slots).length);
  delegateLines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
}

writeFileSync('/home/ubuntu/rlx-onboarding/scripts/delegate-schedule.csv', delegateLines.join('\n'));
console.log('Delegate schedule written to scripts/delegate-schedule.csv');

await conn.end();
