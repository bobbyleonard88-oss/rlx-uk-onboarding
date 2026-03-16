import * as dotenv from "dotenv";
dotenv.config();
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { meetings, sponsors } from "./drizzle/schema";
import { eq, notInArray, sql } from "drizzle-orm";

const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
const db = drizzle(conn);

const rows = await db.select({
  company: sponsors.companyName,
  status: meetings.status,
  count: sql<number>`COUNT(*)`
}).from(meetings)
  .innerJoin(sponsors, eq(meetings.sponsorId, sponsors.id))
  .where(notInArray(meetings.sponsorId, [30001, 60001, 90001, 120001]))
  .groupBy(meetings.sponsorId, meetings.status)
  .orderBy(sponsors.companyName);

for (const r of rows) {
  console.log(`${r.company}: ${r.count} [${r.status}]`);
}
await conn.end();
process.exit(0);
