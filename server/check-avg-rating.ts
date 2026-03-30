import { config } from 'dotenv';
config();
import { getDb } from './db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error('No DB');

  // True mean across all meetings with rating > 0
  const allRatings = await db.execute(sql`
    SELECT meetingRating FROM meetings WHERE meetingRating IS NOT NULL AND meetingRating > 0
  `);
  const ratings = (allRatings as any[])[0] as any[];
  const ratingValues = ratings.map((r: any) => Number(r.meetingRating));
  const trueMean = ratingValues.reduce((s: number, r: number) => s + r, 0) / ratingValues.length;
  console.log(`Total meetings with rating > 0: ${ratingValues.length}`);
  console.log(`True mean (Feedback & Notes method): ${trueMean.toFixed(4)} -> displayed as ${trueMean.toFixed(1)}`);

  // Per-sponsor averages (what Analytics page does)
  const sponsorAvgs = await db.execute(sql`
    SELECT 
      s.companyName,
      COUNT(m.meetingRating) as rated_count,
      AVG(m.meetingRating) as avg_rating
    FROM meetings m
    JOIN sponsors s ON m.sponsorId = s.id
    WHERE m.meetingRating IS NOT NULL AND m.meetingRating > 0
    GROUP BY s.id, s.companyName
    ORDER BY avg_rating DESC
  `);
  const rows = (sponsorAvgs as any[])[0] as any[];
  console.log('\nPer-sponsor averages:');
  for (const row of rows) {
    console.log(`  ${row.companyName}: ${Number(row.avg_rating).toFixed(2)} (${row.rated_count} rated)`);
  }
  const avgOfAvgs = rows.reduce((sum: number, r: any) => sum + Number(r.avg_rating), 0) / rows.length;
  console.log(`\nAverage of sponsor averages (Analytics method): ${avgOfAvgs.toFixed(4)} -> displayed as ${avgOfAvgs.toFixed(1)}`);
  console.log('\nThe correct figure is the TRUE MEAN across all meetings.');
  process.exit(0);
}

main().catch(console.error);
