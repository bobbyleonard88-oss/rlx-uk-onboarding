import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

// Hour blocks: each block has 2 slots
const hourBlocks = [
  { name: 'H1 — Day 1 (Wed) 10:15–11:15', day: 1, slots: [1, 2] },
  { name: 'H2 — Day 1 (Wed) 13:30–14:30', day: 1, slots: [3, 4] },
  { name: 'H3 — Day 1 (Wed) 14:45–15:45', day: 1, slots: [5, 6] },
  { name: 'H4 — Day 2 (Thu) 10:30–11:30', day: 2, slots: [7, 8] },
  { name: 'H5 — Day 2 (Thu) 13:15–14:15', day: 2, slots: [9, 10] },
  { name: 'H6 — Day 2 (Thu) 14:30–15:30', day: 2, slots: [11, 12] },
];

// Get all delegates
const [delegates] = await db.execute(`SELECT id, firstName, lastName, company FROM delegateProfiles ORDER BY firstName, lastName`);

// Get all meetings
const [meetings] = await db.execute(`SELECT attendeeId, timeSlot FROM meetings`);

for (const block of hourBlocks) {
  const [s1, s2] = block.slots;
  
  const groupA = []; // 2 meetings in this block (both slots)
  const groupB = []; // 0 meetings in this block
  const movers = []; // 1 meeting in this block (mid-hour move)

  for (const d of delegates) {
    const delegateId = String(d.id);
    const inS1 = meetings.some(m => m.attendeeId === delegateId && m.timeSlot === s1);
    const inS2 = meetings.some(m => m.attendeeId === delegateId && m.timeSlot === s2);
    const count = (inS1 ? 1 : 0) + (inS2 ? 1 : 0);
    const name = `${d.firstName} ${d.lastName} (${d.company})`;

    if (count === 2) groupA.push(name);
    else if (count === 0) groupB.push(name);
    else {
      // 1 meeting — determine direction
      if (inS1) movers.push({ name, direction: 'LEAVES after slot 1 (first 30 min)', slot: s1 });
      else movers.push({ name, direction: 'ENTERS for slot 2 (second 30 min)', slot: s2 });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(block.name);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nGROUP A — STAYS IN MEETING ROOM ALL HOUR (${groupA.length} delegates):`);
  groupA.forEach(n => console.log(`  • ${n}`));
  
  console.log(`\nGROUP B — STAYS IN CONTENT ROOM ALL HOUR (${groupB.length} delegates):`);
  groupB.forEach(n => console.log(`  • ${n}`));

  if (movers.length > 0) {
    console.log(`\n⚠️  MID-HOUR MOVERS (${movers.length} delegates):`);
    movers.forEach(m => console.log(`  • ${m.name} — ${m.direction}`));
  } else {
    console.log(`\n✅ No mid-hour movers`);
  }
}

await db.end();
