import * as db from './db';
import { attendees } from './attendees';

async function check() {
  const allSponsors = await db.getAllSponsors() as any[];
  const allMeetingsRaw = await db.getAllMeetings() as any[];

  const results: Array<{
    name: string;
    quota: number;
    metFromTopN: number;
    missed: number;
    hitPct: string;
  }> = [];

  for (const sponsor of allSponsors) {
    const visibleMeetings = allMeetingsRaw.filter(
      (m: any) => m.sponsorId === sponsor.id && m.isVisible === 1 && m.status !== 'declined'
    );
    if (visibleMeetings.length === 0) continue;

    const rankings = await db.getRankingsSubmissionsBySponsor(sponsor.id) as any[];
    if (!rankings.length || !rankings[0].rankingsData) continue;

    const ranked: string[] = JSON.parse(rankings[0].rankingsData);
    const quota = visibleMeetings.length; // use actual meeting count as N
    const topN = ranked.slice(0, quota);
    const meetingAttendeeIds = visibleMeetings.map((m: any) => m.attendeeId);

    const metFromTopN = topN.filter((id: string) => meetingAttendeeIds.includes(id)).length;
    const missed = quota - metFromTopN;
    const hitPct = ((metFromTopN / quota) * 100).toFixed(0) + '%';

    results.push({
      name: sponsor.companyName,
      quota,
      metFromTopN,
      missed,
      hitPct,
    });
  }

  // Sort by hit % descending
  results.sort((a, b) => parseFloat(b.hitPct) - parseFloat(a.hitPct));

  console.log('\nSponsor | Met from Top-N | Missed | Hit %');
  console.log('--------|---------------|--------|------');
  for (const r of results) {
    console.log(`${r.name} | ${r.metFromTopN} / ${r.quota} | ${r.missed} | ${r.hitPct}`);
  }
}

check().catch(console.error);
