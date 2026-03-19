import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// The 3 clashes to fix:
// 1. SHL Rep 1 Slot 6: IDs 750149 (Julie Lowe) and 750147 (Robyn Collins) — move one to Rep 2
// 2. Harver Rep 1 Slot 10: IDs 780011 (Sonal Jain) and 780007 (Joanna Saunders-Hare) — move one to Rep 2
// 3. Harver Rep 1 Slot 12: IDs 780014 (Anna Katyal) and 780002 (Edwin Pene) — move one to Rep 2

// Strategy: for each clash, check if Rep 2 already has a meeting in that slot.
// If Rep 2 is free in that slot, reassign one of the Rep 1 meetings to Rep 2.
// If Rep 2 is also busy in that slot, we need to move one meeting to a different slot.

async function fixClash(sponsorName, sponsorId, slot, meetingIds) {
  console.log(`\nFixing ${sponsorName} Slot ${slot} clash (meetings: ${meetingIds.join(', ')})`);
  
  // Check if Rep 2 is free in this slot
  const [rep2Check] = await conn.execute(
    `SELECT id FROM meetings WHERE sponsorId = ? AND attendeeNumber = 2 AND timeSlot = ? AND isVisible = 1 AND status != 'declined'`,
    [sponsorId, slot]
  );
  
  if (rep2Check.length === 0) {
    // Rep 2 is free — reassign the second meeting to Rep 2
    const moveId = meetingIds[1];
    await conn.execute(`UPDATE meetings SET attendeeNumber = 2 WHERE id = ?`, [moveId]);
    console.log(`  ✅ Reassigned meeting ID ${moveId} from Rep 1 to Rep 2 in Slot ${slot}`);
  } else {
    // Rep 2 is busy — need to move one meeting to a different slot
    // Find what slots are free for this delegate
    const moveId = meetingIds[1];
    const [meetingInfo] = await conn.execute(
      `SELECT m.attendeeId, CONCAT(d.firstName, ' ', d.lastName) as name FROM meetings m JOIN delegateProfiles d ON m.attendeeId = d.attendeeId WHERE m.id = ?`,
      [moveId]
    );
    const delegateId = meetingInfo[0]?.attendeeId;
    const delegateName = meetingInfo[0]?.name;
    
    // Get delegate's used slots
    const [delegateSlots] = await conn.execute(
      `SELECT timeSlot FROM meetings WHERE attendeeId = ? AND isVisible = 1 AND status != 'declined'`,
      [delegateId]
    );
    const usedSlots = new Set(delegateSlots.map(r => r.timeSlot));
    
    // Get sponsor's slot usage
    const [sponsorSlotUsage] = await conn.execute(
      `SELECT timeSlot, COUNT(*) as cnt FROM meetings WHERE sponsorId = ? AND isVisible = 1 AND status != 'declined' GROUP BY timeSlot`,
      [sponsorId]
    );
    const sponsorBusy = new Set(sponsorSlotUsage.filter(r => r.cnt >= 2).map(r => r.timeSlot));
    
    const freeSlots = [1,2,3,4,5,6,7,8,9,10,11,12].filter(s => !usedSlots.has(s) && !sponsorBusy.has(s));
    
    if (freeSlots.length > 0) {
      const targetSlot = freeSlots[0];
      await conn.execute(`UPDATE meetings SET timeSlot = ? WHERE id = ?`, [targetSlot, moveId]);
      console.log(`  ✅ Moved meeting ID ${moveId} (${delegateName}) from Slot ${slot} to Slot ${targetSlot}`);
    } else {
      console.log(`  ❌ Could not resolve clash for meeting ID ${moveId} (${delegateName}) — no free slots available`);
    }
  }
}

// Get sponsor IDs
const [shlRow] = await conn.execute(`SELECT id FROM sponsors WHERE companyName = 'SHL' LIMIT 1`);
const [harverRow] = await conn.execute(`SELECT id FROM sponsors WHERE companyName LIKE 'Harver%' LIMIT 1`);
const shlId = shlRow[0].id;
const harverId = harverRow[0].id;

console.log(`SHL ID: ${shlId}, Harver ID: ${harverId}`);

// Fix the 3 clashes
await fixClash('SHL', shlId, 6, [750149, 750147]);
await fixClash('Harver', harverId, 10, [780011, 780007]);
await fixClash('Harver', harverId, 12, [780014, 780002]);

// Final verification
console.log('\n=== FINAL VERIFICATION ===');
const [remaining] = await conn.execute(`
  SELECT m.sponsorId, m.attendeeNumber, m.timeSlot, COUNT(*) as cnt, s.companyName
  FROM meetings m JOIN sponsors s ON m.sponsorId = s.id
  WHERE m.isVisible = 1 AND m.status != 'declined'
  AND m.sponsorId IN (?, ?)
  GROUP BY m.sponsorId, m.attendeeNumber, m.timeSlot
  HAVING cnt > 1
  ORDER BY s.companyName, m.timeSlot
`, [shlId, harverId]);

if (remaining.length === 0) {
  console.log('✅ All SHL and Harver rep clashes resolved');
} else {
  console.log('Remaining issues:');
  for (const r of remaining) console.log(`  ${r.companyName} Rep ${r.attendeeNumber} Slot ${r.timeSlot}: ${r.cnt} meetings`);
}

await conn.end();
