import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Find Natalija's sponsor record
const [sponsors] = await connection.execute("SELECT * FROM sponsors WHERE companyName LIKE '%Natalija%'");
console.log("Natalija sponsor:", JSON.stringify(sponsors, null, 2));

if (sponsors.length > 0) {
  const sponsorId = sponsors[0].id;
  const [meetings] = await connection.execute("SELECT * FROM meetings WHERE sponsorId = ?", [sponsorId]);
  console.log(`\nNatalija has ${meetings.length} meetings:`);
  console.log(JSON.stringify(meetings, null, 2));
}

await connection.end();
