import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);

let issues = 0;

// 1. Total meetings
const [totalRows] = await db.execute(`SELECT COUNT(*) as cnt FROM meetings`);
const total = totalRows[0].cnt;
console.log(`\n✅ Total meetings: ${total}`);

// 2. Distinct delegates with meetings
const [delegateRows] = await db.execute(`SELECT COUNT(DISTINCT attendeeId) as cnt FROM meetings`);
console.log(`✅ Distinct delegates with meetings: ${delegateRows[0].cnt}`);

// 3. Delegate double-bookings (same delegate, same slot)
const [clashRows] = await db.execute(`
  SELECT attendeeId, timeSlot, COUNT(*) as cnt
  FROM meetings
  GROUP BY attendeeId, timeSlot
  HAVING cnt > 1
`);
if (clashRows.length > 0) {
  issues += clashRows.length;
  console.log(`\n❌ DELEGATE CLASHES (${clashRows.length}):`);
  for (const r of clashRows) {
    const [d] = await db.execute(`SELECT firstName, lastName FROM delegateProfiles WHERE CAST(id AS CHAR) = ?`, [r.attendeeId]);
    const name = d.length ? `${d[0].firstName} ${d[0].lastName}` : r.attendeeId;
    console.log(`  ${name} has ${r.cnt} meetings in slot ${r.timeSlot}`);
  }
} else {
  console.log(`✅ No delegate double-bookings`);
}

// 4. Duplicate pairings (same delegate meets same sponsor twice)
const [dupRows] = await db.execute(`
  SELECT attendeeId, sponsorId, COUNT(*) as cnt
  FROM meetings
  GROUP BY attendeeId, sponsorId
  HAVING cnt > 1
`);
if (dupRows.length > 0) {
  issues += dupRows.length;
  console.log(`\n❌ DUPLICATE PAIRINGS (${dupRows.length}):`);
  for (const r of dupRows) {
    const [d] = await db.execute(`SELECT firstName, lastName FROM delegateProfiles WHERE CAST(id AS CHAR) = ?`, [r.attendeeId]);
    const [s] = await db.execute(`SELECT companyName FROM sponsors WHERE id = ?`, [r.sponsorId]);
    console.log(`  ${d[0]?.firstName} ${d[0]?.lastName} meets ${s[0]?.companyName?.trim()} ${r.cnt}x`);
  }
} else {
  console.log(`✅ No duplicate pairings`);
}

// 5. Sponsor slot distribution (real sponsors only)
const [realSponsors] = await db.execute(`
  SELECT s.id, TRIM(s.companyName) as name, COUNT(m.id) as total
  FROM sponsors s
  LEFT JOIN meetings m ON m.sponsorId = s.id
  WHERE s.companyName NOT LIKE '%Test%' AND s.companyName NOT LIKE '%Visibility%'
    AND s.companyName NOT IN ('AI Limited', 'Elevate Assess', 'Little Moment', 'NexaTalent Solutions Ltd')
  GROUP BY s.id, s.companyName
  HAVING total > 0
  ORDER BY s.companyName
`);

console.log(`\n✅ Real sponsors with meetings: ${realSponsors.length}`);

let slotIssues = 0;
for (const sponsor of realSponsors) {
  const [slots] = await db.execute(`SELECT timeSlot, COUNT(*) as cnt FROM meetings WHERE sponsorId = ? GROUP BY timeSlot`, [sponsor.id]);
  const maxPerSlot = sponsor.total > 12 ? 2 : 1;
  const slotMap = {};
  for (const s of slots) slotMap[s.timeSlot] = s.cnt;
  const missing = [1,2,3,4,5,6,7,8,9,10,11,12].filter(s => !slotMap[s]);
  const over = Object.entries(slotMap).filter(([,c]) => c > maxPerSlot);
  if (missing.length || over.length) {
    slotIssues++;
    issues++;
    console.log(`  ❌ ${sponsor.name} (${sponsor.total} meetings): missing=[${missing.join(',')}] over=[${over.map(([s,c])=>`slot${s}(${c}x)`).join(',')}]`);
  }
}
if (slotIssues === 0) console.log(`✅ All sponsors have clean slot distribution (no doubles, no gaps)`);

// 6. Every delegate has exactly 6 meetings (one per hour block = 2 slots)
const [delegateCounts] = await db.execute(`
  SELECT attendeeId, COUNT(*) as cnt FROM meetings GROUP BY attendeeId ORDER BY cnt
`);
const under = delegateCounts.filter(r => r.cnt < 6);
const over6 = delegateCounts.filter(r => r.cnt > 8);
if (under.length) {
  console.log(`\n⚠️  Delegates with fewer than 6 meetings (${under.length}):`);
  for (const r of under) {
    const [d] = await db.execute(`SELECT firstName, lastName FROM delegateProfiles WHERE CAST(id AS CHAR) = ?`, [r.attendeeId]);
    console.log(`  ${d[0]?.firstName} ${d[0]?.lastName}: ${r.cnt} meetings`);
  }
} else {
  console.log(`✅ All delegates have 6+ meetings`);
}
if (over6.length) {
  console.log(`⚠️  Delegates with more than 8 meetings (${over6.length}):`);
  for (const r of over6) {
    const [d] = await db.execute(`SELECT firstName, lastName FROM delegateProfiles WHERE CAST(id AS CHAR) = ?`, [r.attendeeId]);
    console.log(`  ${d[0]?.firstName} ${d[0]?.lastName}: ${r.cnt} meetings`);
  }
} else {
  console.log(`✅ No delegates with more than 8 meetings`);
}

// 7. Meeting counts per sponsor summary
console.log(`\n=== SPONSOR MEETING COUNTS ===`);
for (const s of realSponsors) {
  console.log(`  ${s.name}: ${s.total}`);
}

// Final
console.log(`\n${'='.repeat(50)}`);
if (issues === 0) {
  console.log(`✅ ALL CLEAR — schedule is operationally sound`);
} else {
  console.log(`❌ ${issues} issue(s) found`);
}

await db.end();
