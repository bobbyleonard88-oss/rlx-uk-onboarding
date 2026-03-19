/**
 * Group A/B Slot Reshuffler — Apply to Database
 * 
 * Runs the same solver as solve-groupab.mjs but writes the changes to the DB.
 * Each meeting is moved AT MOST ONCE. All sponsor-delegate pairings preserved.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Load all meetings using sponsors table (correct IDs)
const [meetingRows] = await conn.execute(
  `SELECT m.id, m.sponsorId, m.attendeeId, m.timeSlot, s.companyName as sponsorName
   FROM meetings m
   LEFT JOIN sponsors s ON m.sponsorId = s.id
   WHERE m.status != 'declined' AND m.isVisible = 1
   ORDER BY m.timeSlot`
);

const [delegateRows] = await conn.execute(
  `SELECT attendeeId, firstName, lastName FROM delegateProfiles`
);

const delegateNameMap = {};
for (const d of delegateRows) {
  delegateNameMap[d.attendeeId] = `${d.firstName} ${d.lastName}`;
}

const SLOT_TO_BLOCK = { 1:'H1',2:'H1',3:'H2',4:'H2',5:'H3',6:'H3',7:'H4',8:'H4',9:'H5',10:'H5',11:'H6',12:'H6' };
const BLOCK_SLOTS = { H1:[1,2], H2:[3,4], H3:[5,6], H4:[7,8], H5:[9,10], H6:[11,12] };
const BLOCK_LABELS = {
  H1:'Day 1 11:00–12:00', H2:'Day 1 13:15–14:15', H3:'Day 1 14:30–15:30',
  H4:'Day 2 10:30–11:30', H5:'Day 2 13:15–14:15', H6:'Day 2 14:30–15:30',
};

let workingMeetings = meetingRows.map(m => ({ ...m, moved: false }));
const delegateIds = [...new Set(workingMeetings.map(m => m.attendeeId))];

function canMove(meeting, newSlot, allMeetings) {
  if (allMeetings.some(m => m.attendeeId === meeting.attendeeId && m.timeSlot === newSlot && m.id !== meeting.id)) return false;
  if (allMeetings.filter(m => m.sponsorId === meeting.sponsorId && m.timeSlot === newSlot && m.id !== meeting.id).length >= 2) return false;
  return true;
}

function getBlockCounts(delegateId, allMeetings) {
  const myMeetings = allMeetings.filter(m => m.attendeeId === delegateId);
  const counts = {};
  for (const block of Object.keys(BLOCK_SLOTS)) {
    counts[block] = myMeetings.filter(m => SLOT_TO_BLOCK[m.timeSlot] === block).length;
  }
  return counts;
}

function getOddBlocks(delegateId, allMeetings) {
  const counts = getBlockCounts(delegateId, allMeetings);
  return Object.entries(counts).filter(([,c]) => c === 1).map(([b]) => b);
}

const moves = [];

for (const delegateId of delegateIds) {
  const oddBlocks = getOddBlocks(delegateId, workingMeetings);
  if (oddBlocks.length === 0) continue;

  const oddMeetings = oddBlocks.map(block => {
    const m = workingMeetings.find(
      m => m.attendeeId === delegateId && SLOT_TO_BLOCK[m.timeSlot] === block && !m.moved
    );
    return { block, meeting: m };
  }).filter(x => x.meeting);

  const resolved = new Set();

  for (let i = 0; i < oddMeetings.length; i++) {
    if (resolved.has(i)) continue;
    const { block: fromBlock, meeting } = oddMeetings[i];
    if (!meeting || meeting.moved) continue;

    let didMove = false;

    // Strategy 1: pair with another odd block
    for (let j = 0; j < oddMeetings.length && !didMove; j++) {
      if (i === j || resolved.has(j)) continue;
      const { block: toBlock } = oddMeetings[j];
      for (const targetSlot of BLOCK_SLOTS[toBlock]) {
        if (canMove(meeting, targetSlot, workingMeetings)) {
          const oldSlot = meeting.timeSlot;
          meeting.timeSlot = targetSlot;
          meeting.moved = true;
          moves.push({ meetingId: meeting.id, delegateName: delegateNameMap[delegateId] || delegateId, sponsorName: meeting.sponsorName, fromSlot: oldSlot, fromBlock, toSlot: targetSlot, toBlock });
          resolved.add(i); resolved.add(j);
          didMove = true;
          break;
        }
      }
    }

    // Strategy 2: move to a block where delegate already has 1 meeting
    if (!didMove) {
      const counts = getBlockCounts(delegateId, workingMeetings);
      for (const [block, count] of Object.entries(counts)) {
        if (block === fromBlock || count !== 1 || didMove) continue;
        for (const targetSlot of BLOCK_SLOTS[block]) {
          if (canMove(meeting, targetSlot, workingMeetings)) {
            const oldSlot = meeting.timeSlot;
            meeting.timeSlot = targetSlot;
            meeting.moved = true;
            moves.push({ meetingId: meeting.id, delegateName: delegateNameMap[delegateId] || delegateId, sponsorName: meeting.sponsorName, fromSlot: oldSlot, fromBlock, toSlot: targetSlot, toBlock: block });
            resolved.add(i);
            didMove = true;
            break;
          }
        }
      }
    }

    // Strategy 3: move to an empty block (clears the odd block)
    if (!didMove) {
      const counts = getBlockCounts(delegateId, workingMeetings);
      for (const [block, count] of Object.entries(counts)) {
        if (block === fromBlock || count !== 0 || didMove) continue;
        for (const targetSlot of BLOCK_SLOTS[block]) {
          if (canMove(meeting, targetSlot, workingMeetings)) {
            const fromBlockAfter = workingMeetings.filter(
              m => m.attendeeId === delegateId && SLOT_TO_BLOCK[m.timeSlot] === fromBlock && m.id !== meeting.id
            ).length;
            if (fromBlockAfter === 0) {
              const oldSlot = meeting.timeSlot;
              meeting.timeSlot = targetSlot;
              meeting.moved = true;
              moves.push({ meetingId: meeting.id, delegateName: delegateNameMap[delegateId] || delegateId, sponsorName: meeting.sponsorName, fromSlot: oldSlot, fromBlock, toSlot: targetSlot, toBlock: block });
              resolved.add(i);
              didMove = true;
              break;
            }
          }
        }
      }
    }
  }
}

console.log(`\nSolver complete: ${moves.length} slot changes to apply\n`);

// Preview all moves
for (const mv of moves) {
  console.log(`  ${mv.delegateName} @ ${mv.sponsorName}: Slot ${mv.fromSlot} [${BLOCK_LABELS[mv.fromBlock]}] → Slot ${mv.toSlot} [${BLOCK_LABELS[mv.toBlock]}]`);
}

// Apply to database
console.log('\nApplying changes to database...');
let applied = 0;
for (const mv of moves) {
  await conn.execute(
    `UPDATE meetings SET timeSlot = ?, updatedAt = NOW() WHERE id = ?`,
    [mv.toSlot, mv.meetingId]
  );
  applied++;
}
console.log(`\n✅ Applied ${applied} slot changes to database.`);

// Final verification
const [finalMeetings] = await conn.execute(
  `SELECT id, sponsorId, attendeeId, timeSlot FROM meetings WHERE status != 'declined' AND isVisible = 1`
);

let finalOdd = 0;
for (const delegateId of delegateIds) {
  const myMeetings = finalMeetings.filter(m => m.attendeeId === delegateId);
  for (const block of Object.keys(BLOCK_SLOTS)) {
    const count = myMeetings.filter(m => SLOT_TO_BLOCK[m.timeSlot] === block).length;
    if (count === 1) finalOdd++;
  }
}

console.log(`\nPost-update verification:`);
console.log(`  Total meetings: ${finalMeetings.length}`);
console.log(`  Remaining odd-block instances: ${finalOdd}`);
console.log(`  (${finalOdd} delegates still need 1 mid-hour move — expected ~9)`);

await conn.end();
