import * as db from './db';
import { attendees } from './attendees';

// Active delegate IDs — only those still in the attendees list
const activeAttendeeIds = new Set((attendees as any[]).map((a: any) => a.id));

async function check() {
  const allSponsors = await db.getAllSponsors() as any[];
  const allMeetingsRaw = await db.getAllMeetings() as any[];

  const results: Array<{
    name: string;
    quota: number;
    topNActive: number;       // how many of top-N were actually active delegates
    metFromTopN: number;
    missed: number;
    cancelledInTopN: number;  // ranked in top-N but no longer active
    hitPctRaw: string;        // vs full top-N
    hitPctAdjusted: string;   // vs active-only top-N
  }> = [];

  for (const sponsor of allSponsors) {
    const visibleMeetings = allMeetingsRaw.filter(
      (m: any) => m.sponsorId === sponsor.id && m.isVisible === 1 && m.status !== 'declined'
    );
    if (visibleMeetings.length === 0) continue;

    const rankings = await db.getRankingsSubmissionsBySponsor(sponsor.id) as any[];
    if (!rankings.length || !rankings[0].rankingsData) continue;

    const ranked: string[] = JSON.parse(rankings[0].rankingsData);
    const quota = visibleMeetings.length;
    const topN = ranked.slice(0, quota);
    const meetingAttendeeIds = visibleMeetings.map((m: any) => m.attendeeId);

    const cancelledInTopN = topN.filter((id: string) => !activeAttendeeIds.has(id)).length;
    const activeTopN = topN.filter((id: string) => activeAttendeeIds.has(id));

    const metFromTopN = topN.filter((id: string) => meetingAttendeeIds.includes(id)).length;
    const missed = quota - metFromTopN;

    const hitPctRaw = ((metFromTopN / quota) * 100).toFixed(0) + '%';
    const hitPctAdjusted = activeTopN.length > 0
      ? ((metFromTopN / activeTopN.length) * 100).toFixed(0) + '%'
      : 'N/A';

    results.push({
      name: sponsor.companyName,
      quota,
      topNActive: activeTopN.length,
      metFromTopN,
      missed,
      cancelledInTopN,
      hitPctRaw,
      hitPctAdjusted,
    });
  }

  results.sort((a, b) => parseFloat(b.hitPctAdjusted) - parseFloat(a.hitPctAdjusted));

  console.log('\nSponsor | Quota | Active in Top-N | Cancelled/Removed | Met | Hit% (raw) | Hit% (adjusted)');
  console.log('--------|-------|-----------------|-------------------|-----|------------|----------------');
  for (const r of results) {
    console.log(
      `${r.name} | ${r.quota} | ${r.topNActive} | ${r.cancelledInTopN} | ${r.metFromTopN} | ${r.hitPctRaw} | ${r.hitPctAdjusted}`
    );
  }

  const totalCancelled = results.reduce((s, r) => s + r.cancelledInTopN, 0);
  console.log(`\nTotal cancelled/removed delegates appearing in top-N slots: ${totalCancelled}`);
}

check().catch(console.error);
