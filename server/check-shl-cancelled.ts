import * as db from './db';
import { attendees } from './attendees';

const activeAttendeeIds = new Set((attendees as any[]).map((a: any) => a.id));

async function check() {
  const allSponsors = await db.getAllSponsors() as any[];
  const shl = allSponsors.find((s: any) => s.companyName?.toLowerCase().includes('shl'));
  if (!shl) { console.log('SHL not found'); return; }
  console.log('SHL ID:', shl.id);

  const rankings = await db.getRankingsSubmissionsBySponsor(shl.id) as any[];
  if (!rankings.length || !rankings[0].rankingsData) { console.log('No rankings'); return; }

  const ranked: string[] = JSON.parse(rankings[0].rankingsData);
  console.log('Total ranked by SHL:', ranked.length);

  // Get all attendees including inactive ones from the DB
  const allDelegateProfiles = await db.getAllDelegateProfiles() as any[];
  const profileMap = new Map(allDelegateProfiles.map((a: any) => [a.attendeeId, a]));

  // Also check meetings to see if they appear anywhere
  const allMeetings = await db.getAllMeetings() as any[];

  console.log('\nSHL Rankings — full list with status:');
  let cancelledCount = 0;
  for (let i = 0; i < ranked.length; i++) {
    const id = ranked[i];
    const isActive = activeAttendeeIds.has(id);
    const profile = profileMap.get(id);
    const name = profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown';
    const company = profile?.company ?? '—';
    const hasMeeting = allMeetings.some((m: any) => m.attendeeId === id && m.sponsorId === shl.id);

    if (!isActive) {
      cancelledCount++;
      console.log(`  #${i + 1} [INACTIVE] ${name} (${company}) — ID: ${id} — has SHL meeting: ${hasMeeting}`);
    }
  }

  console.log(`\nTotal inactive in SHL's full ranked list: ${cancelledCount}`);

  // Show how many inactive appear in first 29 (quota 20 + 9 cancelled = 29 scanned)
  const allMeetingsRaw = await db.getAllMeetings() as any[];
  const visibleMeetings = allMeetingsRaw.filter(
    (m: any) => m.sponsorId === shl.id && m.isVisible === 1 && m.status !== 'declined'
  );
  const quota = visibleMeetings.length;
  console.log(`\nSHL quota (visible meetings): ${quota}`);

  let scanned = 0;
  let activeFound = 0;
  let inactiveFound = 0;
  for (const id of ranked) {
    if (activeFound >= quota) break;
    scanned++;
    if (activeAttendeeIds.has(id)) {
      activeFound++;
    } else {
      inactiveFound++;
      const profile = profileMap.get(id);
      const name = profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown';
      console.log(`  Skipped #${scanned} [INACTIVE]: ${name} (${profile?.company ?? '—'}) — ID: ${id}`);
    }
  }
  console.log(`\nScanned ${scanned} entries to find ${quota} active delegates (skipped ${inactiveFound} inactive)`);
}

check().catch(console.error);
