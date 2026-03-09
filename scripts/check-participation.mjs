import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const EXCLUDED = new Set([30001, 60001, 90001, 120001, 270001, 510003]);

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [sponsors] = await conn.execute('SELECT id, companyName FROM sponsors');
  const active = sponsors.filter(s => !EXCLUDED.has(s.id));
  const activeIds = new Set(active.map(s => s.id));

  const [intake] = await conn.execute('SELECT DISTINCT sponsorId FROM intakeSubmissions');
  const [rankings] = await conn.execute('SELECT DISTINCT sponsorId FROM rankingsSubmissions');

  const intakeActive = intake.filter(r => activeIds.has(r.sponsorId));
  const rankingsActive = rankings.filter(r => activeIds.has(r.sponsorId));

  console.log('Active sponsors:', active.length);
  console.log('Active sponsors with intake:', intakeActive.length);
  console.log('Active sponsors with rankings:', rankingsActive.length);
  console.log('Intake %:', Math.round(intakeActive.length / active.length * 100) + '%');
  console.log('Rankings %:', Math.round(rankingsActive.length / active.length * 100) + '%');

  const intakeIds = new Set(intakeActive.map(r => r.sponsorId));
  const rankingsIds = new Set(rankingsActive.map(r => r.sponsorId));
  const missingIntake = active.filter(s => !intakeIds.has(s.id));
  const missingRankings = active.filter(s => !rankingsIds.has(s.id));
  if (missingIntake.length) console.log('Missing intake:', missingIntake.map(s => s.companyName));
  if (missingRankings.length) console.log('Missing rankings:', missingRankings.map(s => s.companyName));

  await conn.end();
}
main().catch(console.error);
