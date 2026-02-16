import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const sponsors = await db.select().from(schema.sponsors);
console.log('All sponsors:');
sponsors.forEach(s => {
  console.log(`ID: ${s.id}, Email: ${s.email}, Company: ${s.companyName}, Archived: ${s.isArchived}`);
});

await connection.end();
