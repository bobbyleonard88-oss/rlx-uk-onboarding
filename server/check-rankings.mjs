import * as db from './db.ts';
import { attendees } from './attendees.ts';

const rankings = await db.getAllRankingsSubmissions();
const active = rankings.filter(r => r.rankingsData && r.isArchived !== 1);
const first = active[0];
if (first) {
  const parsed = JSON.parse(first.rankingsData);
  console.log('SponsorId:', first.sponsorId);
  console.log('First 3 items:', JSON.stringify(parsed.slice(0,3), null, 2));
  console.log('Type of first item:', typeof parsed[0]);
  
  // Check if IDs match attendees
  const firstId = typeof parsed[0] === 'string' ? parsed[0] : (parsed[0]?.id ?? parsed[0]?.attendeeId);
  const match = attendees.find(a => a.id === firstId);
  console.log('First ID:', firstId, '-> Match:', match ? match.firstName + ' ' + match.lastName : 'NOT FOUND');
}

// Check totalDelegates
console.log('\nTotal attendees:', attendees.length);
console.log('First attendee ID type:', typeof attendees[0].id);
