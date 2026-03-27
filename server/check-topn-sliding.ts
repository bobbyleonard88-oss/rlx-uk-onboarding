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
    effectiveTopN: number;    // how far down the list we had to go to fill quota active slots
    metFromEffectiveTopN: number;
    missed: number;
    cancelledEncountered: number;
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
    const quota = visibleMeetings.length;
    const meetingAttendeeIds = visibleMeetings.map((m: any) => m.attendeeId);

    // Slide down rankings until we have `quota` active delegates
    const effectiveTopN: string[] = [];
    let cancelledEncountered = 0;
    for (const id of ranked) {
      if (effectiveTopN.length >= quota) break;
      if (activeAttendeeIds.has(id)) {
        effectiveTopN.push(id);
      } else {
        cancelledEncountered++;
      }
    }

    const metFromEffectiveTopN = effectiveTopN.filter((id) => meetingAttendeeIds.includes(id)).length;
    const missed = effectiveTopN.length - metFromEffectiveTopN;
    const hitPct = effectiveTopN.length > 0
      ? ((metFromEffectiveTopN / effectiveTopN.length) * 100).toFixed(0) + '%'
      : 'N/A';

    results.push({
      name: sponsor.companyName,
      quota,
      effectiveTopN: effectiveTopN.length,
      metFromEffectiveTopN,
      missed,
      cancelledEncountered,
      hitPct,
    });
  }

  results.sort((a, b) => parseFloat(b.hitPct) - parseFloat(a.hitPct));

  console.log('\nSponsor | Quota | Effective Top-N (active) | Cancelled skipped | Met | Missed | Hit%');
  console.log('--------|-------|--------------------------|-------------------|-----|--------|-----');
  for (const r of results) {
    console.log(
      `${r.name} | ${r.quota} | ${r.effectiveTopN} | ${r.cancelledEncountered} | ${r.metFromEffectiveTopN} | ${r.missed} | ${r.hitPct}`
    );
  }
}

check().catch(console.error);
