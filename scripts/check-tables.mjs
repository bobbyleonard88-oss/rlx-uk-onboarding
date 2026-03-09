import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [tables] = await conn.execute('SHOW TABLES');
  console.log('Tables:', tables.map(t => Object.values(t)[0]));
  
  // Check if meetings table has rows
  try {
    const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM meetings');
    console.log('Meetings count:', cnt[0].c);
    if (cnt[0].c > 0) {
      const [sample] = await conn.execute('SELECT * FROM meetings LIMIT 3');
      console.log('Sample:', JSON.stringify(sample, null, 2));
    }
  } catch(e) {
    console.log('meetings table error:', e.message);
  }
  await conn.end();
}
main().catch(console.error);
