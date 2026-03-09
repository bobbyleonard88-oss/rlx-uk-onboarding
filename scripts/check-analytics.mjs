import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check time slots
  const [slots] = await conn.execute('SELECT DISTINCT timeSlot, COUNT(*) as cnt FROM meetings GROUP BY timeSlot ORDER BY timeSlot');
  console.log('Time slots in DB:', JSON.stringify(slots));
  
  // Check all sponsors
  const [sponsors] = await conn.execute('SELECT id, companyName FROM sponsors ORDER BY companyName');
  console.log('\nAll sponsors:');
  sponsors.forEach(s => console.log(` ${s.id}: ${s.companyName}`));
  
  await conn.end();
}
main().catch(console.error);
