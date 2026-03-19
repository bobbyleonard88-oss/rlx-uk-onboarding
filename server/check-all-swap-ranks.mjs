import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allIntakes = await db.getAllIntakeSubmissions();
const allRankings = await db.getAllRankingsSubmissions();

const sponsorNames = new Map(allIntakes.map(i => [i.sponsorId, i.companyName]));

const rankingsMap = new Map();
for (const r of allRankings) {
  if (r.rankingsData) rankingsMap.set(r.sponsorId, JSON.parse(r.rankingsData));
}

function getRank(sponsorId, attendeeId) {
  const list = rankingsMap.get(sponsorId) || [];
  const idx = list.indexOf(String(attendeeId));
  return idx >= 0 ? `#${idx + 1}` : 'unranked';
}

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

function getMeeting(sponsorId, attendeeId) {
  return allMeetings.find(m => m.sponsorId === sponsorId && m.attendeeId === attendeeId);
}

// All the swaps — [delegate, from sponsor, to sponsor]
const swaps = [
  // Latham replacements — new delegates already in, just need their rank/score at each sponsor
  ['Jon', 'Warwick', 'Veremark', 'Harver'],
  ['James', 'Harley', 'Harver', 'Veremark'],
  ['Jules', 'Anderson', 'JobSync', 'Happydance'],
  ['Andrew', 'Boyd', 'Happydance', 'JobSync'],
  ['Tush', 'Wijeratne', 'JobSync', 'Wilson'],
  ['Mark', 'Coad', 'Wilson', 'JobSync'],
];

console.log('=== CROSS-SPONSOR SWAP RANKS & SCORES ===\n');

for (const [fn, ln, fromSponsorName, toSponsorName] of swaps) {
  const delegate = findAttendee(fn, ln);
  if (!delegate) { console.log(`${fn} ${ln}: NOT FOUND`); continue; }

  const fromId = getSponsorId(fromSponsorName);
  const toId = getSponsorId(toSponsorName);

  const fromMtg = getMeeting(fromId, delegate.id);
  const toMtg = getMeeting(toId, delegate.id);

  const fromRank = getRank(fromId, delegate.id);
  const toRank = getRank(toId, delegate.id);

  const fromScore = fromMtg?.matchScore ?? 'N/A';
  const toScore = toMtg?.matchScore ?? 'N/A';

  const fromSponsor = sponsorNames.get(fromId) || fromSponsorName;
  const toSponsor = sponsorNames.get(toId) || toSponsorName;
  const delegateCompany = delegate.company || '';

  console.log(`${toSponsor} - ${delegateCompany} (${fromRank}, ${fromScore}%) > ${delegateCompany} (${toRank}, ${toScore}%)`);
}

process.exit(0);
