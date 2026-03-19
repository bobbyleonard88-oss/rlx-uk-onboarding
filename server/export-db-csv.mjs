// Run with: cd /home/ubuntu/rlx-onboarding && npx tsx server/export-db-csv.mjs
import * as db from './db.ts';
import { attendees } from './attendees.ts';
import { writeFileSync } from 'fs';

const meetings = await db.getAllMeetings();
const intakes = await db.getAllIntakeSubmissions();
const rankings = await db.getAllRankingsSubmissions();
const profiles = await db.getAllDelegateProfiles();

// Build lookups
const sponsorMap = new Map(intakes.map(i => [i.sponsorId, i]));
const profileMap = new Map(profiles.map(p => [p.attendeeId, p]));
const rankingsMap = new Map();
for (const r of rankings) {
  if (r.rankingsData) {
    try { rankingsMap.set(r.sponsorId, JSON.parse(r.rankingsData)); } catch {}
  }
}

const slotLabel = {
  1: '10:15–10:45', 2: '10:45–11:15', 3: '13:30–14:00', 4: '14:00–14:30',
  5: '14:45–15:15', 6: '15:15–15:45', 7: '10:30–11:00', 8: '11:00–11:30',
  9: '13:15–13:45', 10: '13:45–14:15', 11: '14:30–15:00', 12: '15:00–15:30'
};
const slotDay = {
  1: 'Day 1 (Wed 25 Mar)', 2: 'Day 1 (Wed 25 Mar)', 3: 'Day 1 (Wed 25 Mar)',
  4: 'Day 1 (Wed 25 Mar)', 5: 'Day 1 (Wed 25 Mar)', 6: 'Day 1 (Wed 25 Mar)',
  7: 'Day 2 (Thu 26 Mar)', 8: 'Day 2 (Thu 26 Mar)', 9: 'Day 2 (Thu 26 Mar)',
  10: 'Day 2 (Thu 26 Mar)', 11: 'Day 2 (Thu 26 Mar)', 12: 'Day 2 (Thu 26 Mar)'
};

// Get all sponsors from the sponsors table too
const sponsors = await db.getAllSponsors();
const sponsorDetailsMap = new Map(sponsors.map(s => [s.id, s]));

const sorted = [...meetings].sort((a, b) => {
  const sa = sponsorDetailsMap.get(a.sponsorId)?.companyName || sponsorMap.get(a.sponsorId)?.companyName || '';
  const sb = sponsorDetailsMap.get(b.sponsorId)?.companyName || sponsorMap.get(b.sponsorId)?.companyName || '';
  return sa.localeCompare(sb) || a.timeSlot - b.timeSlot;
});

const rows = [];
for (const m of sorted) {
  const sponsorDetail = sponsorDetailsMap.get(m.sponsorId);
  const intake = sponsorMap.get(m.sponsorId);
  const profile = profileMap.get(m.attendeeId);
  const attendee = attendees.find(a => a.id === m.attendeeId);

  const companyName = sponsorDetail?.companyName || intake?.companyName || '';
  const repName = sponsorDetail
    ? `${sponsorDetail.firstName || ''} ${sponsorDetail.lastName || ''}`.trim()
    : intake ? `${intake.firstName || ''} ${intake.lastName || ''}`.trim() : '';

  const rankList = rankingsMap.get(m.sponsorId) || [];
  const rankIdx = rankList.indexOf(m.attendeeId);
  const vendorRank = rankIdx >= 0 ? String(rankIdx + 1) : 'ND';
  const top10 = rankIdx >= 0 && rankIdx < 10 ? 'Yes' : 'No';

  const delegateName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : attendee ? `${attendee.firstName} ${attendee.lastName}` : m.attendeeId;
  const delegateCompany = profile?.company || attendee?.company || '';
  const delegateTitle = profile?.jobTitle || attendee?.jobTitle || '';

  rows.push([
    companyName,
    repName,
    delegateName,
    delegateCompany,
    delegateTitle,
    vendorRank,
    m.matchScore != null ? `${m.matchScore}%` : '',
    top10,
    `Slot ${m.timeSlot}`,
    slotDay[m.timeSlot] || '',
    slotLabel[m.timeSlot] || '',
    '',
    m.matchReason || ''
  ]);
}

const header = [
  'Vendor Company', 'Rep Name', 'Delegate Name', 'Delegate Company',
  'Delegate Job Title', 'Vendor Rank', 'Match Score', 'In Vendor Top 10',
  'Opt-In', 'Meeting Time', 'Meeting Slot', 'Table Number', 'Match Reason'
];
const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\n');

const today = new Date().toISOString().slice(0, 10);
const outPath = `/home/ubuntu/upload/RLXUKV6-DB-EXPORT-${today}.csv`;
writeFileSync(outPath, csv, 'utf8');
console.log(`Exported ${rows.length} meetings to ${outPath}`);
process.exit(0);
