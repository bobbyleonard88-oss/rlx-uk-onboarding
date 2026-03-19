/**
 * Group A/B Feasibility Solver (v2 — no cycling)
 * 
 * For each delegate, find hour blocks where they have exactly 1 meeting ("odd blocks").
 * Try to resolve each odd block by moving that single meeting to a slot in another block,
 * so the block either becomes 0 (Group B) or 2 (Group A).
 * 
 * Each meeting is moved AT MOST ONCE. We process each delegate once.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [meetingRows] = await conn.execute(
  `SELECT id, sponsorId, attendeeId, timeSlot FROM meetings WHERE status != 'declined' AND isVisible = 1 ORDER BY timeSlot`
);
const [sponsorRows] = await conn.execute(`SELECT id, companyName FROM intakeSubmissions`);
const [delegateRows] = await conn.execute(`SELECT attendeeId, firstName, lastName, company FROM delegateProfiles`);
await conn.end();

const sponsorMap = {};
for (const s of sponsorRows) sponsorMap[s.id] = s.companyName;

const delegateNameMap = {};
for (const d of delegateRows) delegateNameMap[d.attendeeId] = `${d.firstName} ${d.lastName} (${d.company})`;

const SLOT_TO_BLOCK = { 1:'H1',2:'H1',3:'H2',4:'H2',5:'H3',6:'H3',7:'H4',8:'H4',9:'H5',10:'H5',11:'H6',12:'H6' };
const BLOCK_SLOTS = { H1:[1,2], H2:[3,4], H3:[5,6], H4:[7,8], H5:[9,10], H6:[11,12] };
const BLOCK_LABELS = {
  H1:'Day 1 11:00–12:00', H2:'Day 1 13:15–14:15', H3:'Day 1 14:30–15:30',
  H4:'Day 2 10:30–11:30', H5:'Day 2 13:15–14:15', H6:'Day 2 14:30–15:30',
};

// Mutable working copy — track which meetings have already been moved
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
const movedMeetingIds = new Set();

for (const delegateId of delegateIds) {
  // Get a snapshot of this delegate's odd blocks
  const oddBlocks = getOddBlocks(delegateId, workingMeetings);
  if (oddBlocks.length === 0) continue;
  
  // For each odd block, find the single meeting in it
  const oddMeetings = oddBlocks.map(block => {
    const m = workingMeetings.find(
      m => m.attendeeId === delegateId && SLOT_TO_BLOCK[m.timeSlot] === block && !m.moved
    );
    return { block, meeting: m };
  }).filter(x => x.meeting);
  
  // Try to pair odd blocks: for each pair of odd blocks, try moving one meeting to the other block
  // We process pairs greedily — once a meeting is moved, it's locked
  const resolved = new Set();
  
  for (let i = 0; i < oddMeetings.length; i++) {
    if (resolved.has(i)) continue;
    const { block: fromBlock, meeting } = oddMeetings[i];
    if (!meeting || meeting.moved) continue;
    
    let didMove = false;
    
    // Priority 1: Move to another odd block (pairs them up: one becomes 0, one becomes 2)
    for (let j = 0; j < oddMeetings.length; j++) {
      if (i === j || resolved.has(j)) continue;
      const { block: toBlock } = oddMeetings[j];
      
      for (const targetSlot of BLOCK_SLOTS[toBlock]) {
        if (canMove(meeting, targetSlot, workingMeetings)) {
          const oldSlot = meeting.timeSlot;
          meeting.timeSlot = targetSlot;
          meeting.moved = true;
          moves.push({
            delegateId,
            meetingId: meeting.id,
            sponsorName: sponsorMap[meeting.sponsorId] || `Sponsor ${meeting.sponsorId}`,
            fromSlot: oldSlot,
            fromBlock,
            toSlot: targetSlot,
            toBlock,
          });
          resolved.add(i);
          resolved.add(j);
          didMove = true;
          break;
        }
      }
      if (didMove) break;
    }
    
    if (didMove) continue;
    
    // Priority 2: Move to a block where this delegate already has 1 meeting (makes it 2 = Group A)
    const counts = getBlockCounts(delegateId, workingMeetings);
    for (const [block, count] of Object.entries(counts)) {
      if (block === fromBlock || count !== 1) continue;
      for (const targetSlot of BLOCK_SLOTS[block]) {
        if (canMove(meeting, targetSlot, workingMeetings)) {
          const oldSlot = meeting.timeSlot;
          meeting.timeSlot = targetSlot;
          meeting.moved = true;
          moves.push({
            delegateId,
            meetingId: meeting.id,
            sponsorName: sponsorMap[meeting.sponsorId] || `Sponsor ${meeting.sponsorId}`,
            fromSlot: oldSlot,
            fromBlock,
            toSlot: targetSlot,
            toBlock: block,
          });
          resolved.add(i);
          didMove = true;
          break;
        }
      }
      if (didMove) break;
    }
    
    if (didMove) continue;
    
    // Priority 3: Move to an empty block (makes from block 0 = Group B)
    for (const [block, count] of Object.entries(counts)) {
      if (block === fromBlock || count !== 0) continue;
      for (const targetSlot of BLOCK_SLOTS[block]) {
        if (canMove(meeting, targetSlot, workingMeetings)) {
          // Only do this if it clears the from block (it will, since count was 1)
          const oldSlot = meeting.timeSlot;
          meeting.timeSlot = targetSlot;
          meeting.moved = true;
          moves.push({
            delegateId,
            meetingId: meeting.id,
            sponsorName: sponsorMap[meeting.sponsorId] || `Sponsor ${meeting.sponsorId}`,
            fromSlot: oldSlot,
            fromBlock,
            toSlot: targetSlot,
            toBlock: block,
          });
          resolved.add(i);
          didMove = true;
          break;
        }
      }
      if (didMove) break;
    }
  }
}

// Final analysis
const finalOddByDelegate = {};
for (const delegateId of delegateIds) {
  const odd = getOddBlocks(delegateId, workingMeetings);
  if (odd.length > 0) finalOddByDelegate[delegateId] = odd;
}

const initialOddTotal = 84; // from previous analysis
const finalOddTotal = Object.values(finalOddByDelegate).reduce((s, arr) => s + arr.length, 0);

console.log('=== GROUP A/B FEASIBILITY — FULL SLOT RESHUFFLING ===\n');
console.log(`Total meetings: ${workingMeetings.length}`);
console.log(`Delegates with meetings: ${delegateIds.length}`);
console.log(`Initial odd-block instances: ${initialOddTotal}`);
console.log(`Slot changes made: ${moves.length}`);
console.log(`Remaining odd-block instances: ${finalOddTotal}`);
console.log(`Delegates still needing mid-hour move: ${Object.keys(finalOddByDelegate).length}`);
console.log('');

// Show required moves grouped by delegate
if (moves.length > 0) {
  console.log('=== REQUIRED SLOT CHANGES ===');
  const byDelegate = {};
  for (const m of moves) {
    if (!byDelegate[m.delegateId]) byDelegate[m.delegateId] = [];
    byDelegate[m.delegateId].push(m);
  }
  for (const [delegateId, delegateMoves] of Object.entries(byDelegate)) {
    const name = (delegateNameMap[delegateId] || delegateId).replace(/\(.*\)/, '').trim();
    console.log(`\n${name}:`);
    for (const mv of delegateMoves) {
      console.log(`  ${mv.sponsorName}: Slot ${mv.fromSlot} [${BLOCK_LABELS[mv.fromBlock]}] → Slot ${mv.toSlot} [${BLOCK_LABELS[mv.toBlock]}]`);
    }
  }
}

// Show unresolvable
if (Object.keys(finalOddByDelegate).length > 0) {
  console.log('\n=== UNRESOLVABLE — MID-HOUR MOVE STILL NEEDED ===');
  for (const [delegateId, oddBlocks] of Object.entries(finalOddByDelegate)) {
    const name = (delegateNameMap[delegateId] || delegateId).replace(/\(.*\)/, '').trim();
    console.log(`\n${name}:`);
    for (const block of oddBlocks) {
      const m = workingMeetings.find(m => m.attendeeId === delegateId && SLOT_TO_BLOCK[m.timeSlot] === block);
      const sponsor = m ? (sponsorMap[m.sponsorId] || `Sponsor ${m.sponsorId}`) : '?';
      const slot = m ? m.timeSlot : '?';
      console.log(`  ${BLOCK_LABELS[block]}: 1 meeting with ${sponsor} (slot ${slot})`);
    }
  }
}

// Final block profile
console.log('\n=== FINAL BLOCK PROFILE ===');
for (const [block] of Object.entries(BLOCK_SLOTS)) {
  let groupA = 0, groupB = 0, odd = [];
  for (const delegateId of delegateIds) {
    const counts = getBlockCounts(delegateId, workingMeetings);
    const c = counts[block];
    const name = (delegateNameMap[delegateId] || delegateId).split(' (')[0];
    if (c === 2) groupA++;
    else if (c === 0) groupB++;
    else odd.push(name);
  }
  console.log(`${block} ${BLOCK_LABELS[block]}: Group A=${groupA}, Group B=${groupB}${odd.length ? `, ⚠️ odd=${odd.length} (${odd.join(', ')})` : ''}`);
}

console.log('\n=== VERDICT ===');
if (Object.keys(finalOddByDelegate).length === 0) {
  console.log('✅ FULLY FEASIBLE — all 38 delegates can be cleanly assigned to Group A or B per hour block');
  console.log(`   Requires ${moves.length} slot changes (same pairings, different time slots)`);
} else {
  const n = Object.keys(finalOddByDelegate).length;
  console.log(`⚠️  NEARLY FEASIBLE — ${n} delegate(s) cannot be cleanly resolved`);
  console.log(`   Requires ${moves.length} slot changes`);
  console.log(`   ${n} delegate(s) would still need to enter/exit mid-hour in at least one block`);
}
