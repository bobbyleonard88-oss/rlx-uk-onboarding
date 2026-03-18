import * as db from './db.ts';
import { attendees } from './attendees.ts';

const AMBERJACK_ID = 690001;
const JAMES_ID = '12731251';

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();

const amberjackMeetings = allMeetings.filter(m => m.sponsorId === AMBERJACK_ID && m.attendeeId !== JAMES_ID);
const amberjackDelegateIds = new Set(amberjackMeetings.map(m => m.attendeeId));

const ranking = allRankings.find(r => r.sponsorId === AMBERJACK_ID);
const rankedList = ranking?.rankingsData ? JSON.parse(ranking.rankingsData) : [];

const meetingCount = new Map();
for (const m of allMeetings) {
  meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId) || 0) + 1);
}

const bookedSlot12 = new Set(allMeetings.filter(m => m.timeSlot === 12).map(m => m.attendeeId));

console.log('Next best available for Amberjack slot 12 (Day 2 15:00):');
let shown = 0;
for (let i = 0; i < rankedList.length; i++) {
  const id = rankedList[i];
  if (id === JAMES_ID) continue;
  if (amberjackDelegateIds.has(id)) continue;
  const d = attendees.find(a => a.id === id);
  if (!d) continue;
  const count = meetingCount.get(id) || 0;
  if (count >= 8) {
    console.log(`  Rank #${i+1}: ${d.firstName} ${d.lastName} (${d.company}) — ⚠️ at max ${count} meetings`);
    shown++;
    if (shown >= 5) break;
    continue;
  }
  if (bookedSlot12.has(id)) {
    console.log(`  Rank #${i+1}: ${d.firstName} ${d.lastName} (${d.company}) — ❌ busy in slot 12`);
    shown++;
    if (shown >= 5) break;
    continue;
  }
  console.log(`  Rank #${i+1}: ${d.firstName} ${d.lastName} (${d.company}) — ✅ ${count} meetings, FREE in slot 12`);
  shown++;
  if (shown >= 5) break;
}

process.exit(0);
