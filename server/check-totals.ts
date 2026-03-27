import * as dotenv from "dotenv";
dotenv.config();
import * as db from "./db";
async function main() {
  const allSponsors = await db.getAllSponsors();
  for (const s of allSponsors as any[]) {
    const meetings = await db.getMeetingsBySponsor(s.id);
    const rated = (meetings as any[]).filter((m: any) => m.meetingRating != null);
    const total = (meetings as any[]).length;
    if (rated.length > 0) {
      console.log(`${s.companyName.padEnd(25)} total=${total}, rated=${rated.length}`);
    }
  }
  process.exit(0);
}
main().catch(console.error);
