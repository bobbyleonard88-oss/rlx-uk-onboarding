import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetingsRaw = await db.getAllMeetings();
const allSponsorsRaw = await db.getAllSponsors();

const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
const EXCLUDED_DELEGATE_IDS = new Set([]);

const allSponsors = allSponsorsRaw.filter(s => {
  if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(s.id)) return false;
  if (TEST_SPONSOR_IDS.has(s.id)) return false;
  return true;
});
const validSponsorIds = new Set(allSponsors.map(s => s.id));

const allMeetings = allMeetingsRaw.filter(
  m => !EXCLUDED_DELEGATE_IDS.has(m.attendeeId) && validSponsorIds.has(m.sponsorId)
);

const totalDelegates = attendees.filter(a => !EXCLUDED_DELEGATE_IDS.has(a.id)).length;
const uniqueDelegates = new Set(allMeetings.map(m => m.attendeeId));
const delegatesBooked = uniqueDelegates.size;

console.log('totalDelegates:', totalDelegates);
console.log('delegatesBooked:', delegatesBooked);
console.log('totalMeetings:', allMeetings.length);

// Check most in-demand delegates
const allRankingsRaw = await db.getAllRankingsSubmissions();
const allRankings = allRankingsRaw.filter(r => validSponsorIds.has(r.sponsorId));
const demandScores = new Map();

for (const ranking of allRankings) {
  if (ranking.rankingsData) {
    const rankedList = JSON.parse(ranking.rankingsData);
    rankedList.forEach((delegateId, index) => {
      if (EXCLUDED_DELEGATE_IDS.has(delegateId)) return;
      const score = rankedList.length - index;
      demandScores.set(delegateId, (demandScores.get(delegateId) || 0) + score);
    });
  }
}

const mostInDemand = Array.from(demandScores.entries())
  .map(([attendeeId, demandScore]) => {
    const delegate = attendees.find(d => d.id === attendeeId);
    return {
      attendeeId,
      name: delegate ? `${delegate.firstName} ${delegate.lastName}` : 'Unknown',
      company: delegate?.company || 'Unknown',
      demandScore,
    };
  })
  .sort((a, b) => b.demandScore - a.demandScore);

const unknownCount = mostInDemand.filter(d => d.name === 'Unknown').length;
console.log('\nMost in-demand delegates total:', mostInDemand.length);
console.log('Unknown names:', unknownCount);
if (unknownCount > 0) {
  console.log('Unknown IDs:', mostInDemand.filter(d => d.name === 'Unknown').slice(0, 5).map(d => d.attendeeId));
}
console.log('Top 5:', mostInDemand.slice(0, 5).map(d => `${d.name} (${d.company}) - ${d.demandScore}`));

process.exit(0);
