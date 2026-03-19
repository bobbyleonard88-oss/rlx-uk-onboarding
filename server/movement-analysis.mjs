import mysql from 'mysql2/promise';

const db = await mysql.createConnection(process.env.DATABASE_URL);

const hourBlocks = [
  { label: 'Block 1 — Day 1: 10:15–11:15', slotA: 1, slotB: 2 },
  { label: 'Block 2 — Day 1: 13:30–14:30', slotA: 3, slotB: 4 },
  { label: 'Block 3 — Day 1: 14:45–15:45', slotA: 5, slotB: 6 },
  { label: 'Block 4 — Day 2: 10:30–11:30', slotA: 7, slotB: 8 },
  { label: 'Block 5 — Day 2: 13:15–14:15', slotA: 9, slotB: 10 },
  { label: 'Block 6 — Day 2: 14:30–15:30', slotA: 11, slotB: 12 },
];

for (const block of hourBlocks) {
  const [rowsA] = await db.execute(`
    SELECT DISTINCT m.attendeeId, CONCAT(dp.firstName, ' ', dp.lastName) as name, dp.company, dp.lastName
    FROM meetings m
    JOIN delegateProfiles dp ON m.attendeeId = dp.attendeeId
    WHERE m.timeSlot = ?
    ORDER BY dp.lastName
  `, [block.slotA]);

  const [rowsB] = await db.execute(`
    SELECT DISTINCT m.attendeeId, CONCAT(dp.firstName, ' ', dp.lastName) as name, dp.company, dp.lastName
    FROM meetings m
    JOIN delegateProfiles dp ON m.attendeeId = dp.attendeeId
    WHERE m.timeSlot = ?
    ORDER BY dp.lastName
  `, [block.slotB]);

  const setA = new Map(rowsA.map(r => [r.attendeeId, `${r.name} (${r.company})`]));
  const setB = new Map(rowsB.map(r => [r.attendeeId, `${r.name} (${r.company})`]));

  const stay = [...setA.entries()].filter(([id]) => setB.has(id)).map(([, name]) => name);
  const leave = [...setA.entries()].filter(([id]) => !setB.has(id)).map(([, name]) => name);
  const enter = [...setB.entries()].filter(([id]) => !setA.has(id)).map(([, name]) => name);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${block.label}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Slot A delegates: ${rowsA.length} | Slot B delegates: ${rowsB.length}`);
  console.log(`Stay (both slots): ${stay.length} | Leave after Slot A: ${leave.length} | Enter for Slot B: ${enter.length}`);
  
  console.log(`\n✅ STAY (${stay.length}):`);
  stay.forEach(n => console.log(`   ${n}`));
  
  console.log(`\n⬅️  LEAVE after Slot A (${leave.length}):`);
  if (leave.length === 0) console.log('   None');
  else leave.forEach(n => console.log(`   ${n}`));
  
  console.log(`\n➡️  ENTER for Slot B (${enter.length}):`);
  if (enter.length === 0) console.log('   None');
  else enter.forEach(n => console.log(`   ${n}`));
}

await db.end();
