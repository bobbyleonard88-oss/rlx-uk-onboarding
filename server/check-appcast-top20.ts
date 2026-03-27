import * as db from './db';
import { attendees } from './attendees';

async function check() {
  const allSponsors = await db.getAllSponsors() as any[];
  const appcast = allSponsors.find((s: any) => s.companyName?.toLowerCase().includes('appcast'));
  if (!appcast) { console.log('Appcast not found'); return; }
  console.log('Appcast ID:', appcast.id, 'Name:', appcast.companyName);

  // Get rankings
  const rankings = await db.getRankingsSubmissionsBySponsor(appcast.id) as any[];
  if (!rankings.length) { console.log('No rankings found'); return; }
  const ranked: string[] = JSON.parse(rankings[0].rankingsData ?? '[]');
  console.log('Total ranked delegates:', ranked.length);

  // Get meetings
  const allMeetings = await db.getMeetingsBySponsor(appcast.id) as any[];
  const visibleMeetings = allMeetings.filter((m: any) => m.isVisible === 1 && m.status !== 'declined');
  console.log('Total visible meetings:', visibleMeetings.length);

  const meetingAttendeeIds = visibleMeetings.map((m: any) => m.attendeeId);
  const top20 = ranked.slice(0, 20);

  const metFromTop20 = top20.filter((id: string) => meetingAttendeeIds.includes(id));
  const notMetFromTop20 = top20.filter((id: string) => !meetingAttendeeIds.includes(id));
  const metOutsideTop20 = meetingAttendeeIds.filter((id: string) => !top20.includes(id));

  console.log('\n=== RESULTS ===');
  console.log('Met from top 20:', metFromTop20.length);
  console.log('NOT met from top 20:', notMetFromTop20.length);
  console.log('Met outside top 20 (unranked or ranked 21+):', metOutsideTop20.length);

  // Resolve names
  const getName = (id: string) => {
    const a = (attendees as any[]).find((x: any) => x.id === id);
    return a ? `${a.firstName} ${a.lastName} (${a.company})` : id;
  };

  console.log('\nMet from top 20:');
  metFromTop20.forEach((id: string, i: number) => {
    const rankPos = top20.indexOf(id) + 1;
    const meeting = visibleMeetings.find((m: any) => m.attendeeId === id);
    console.log(`  #${rankPos} ${getName(id)} — rated ${meeting?.meetingRating ?? 'unrated'}/5`);
  });

  console.log('\nNOT met from top 20:');
  notMetFromTop20.forEach((id: string) => {
    const rankPos = top20.indexOf(id) + 1;
    console.log(`  #${rankPos} ${getName(id)}`);
  });

  console.log('\nMet outside top 20:');
  metOutsideTop20.forEach((id: string) => {
    const rankPos = ranked.indexOf(id);
    const meeting = visibleMeetings.find((m: any) => m.attendeeId === id);
    const label = rankPos >= 0 ? `Rank #${rankPos + 1}` : 'Unranked';
    console.log(`  ${label} ${getName(id)} — rated ${meeting?.meetingRating ?? 'unrated'}/5`);
  });
}

check().catch(console.error);
