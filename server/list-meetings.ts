import * as db from "./db";
import { attendees } from "./attendees";

async function main() {
  const meetings = await db.getAllMeetings();
  
  const getDelegate = (id: string) => attendees.find(a => a.id === id);
  
  // PerchPeek meetings
  const perchpeek = meetings.filter(m => m.sponsorId === 450001).sort((a, b) => (a.timeSlot || 0) - (b.timeSlot || 0));
  console.log("=== PERCHPEEK MEETINGS ===");
  for (const m of perchpeek) {
    const d = getDelegate(m.attendeeId);
    const name = d ? `${d.firstName} ${d.lastName}` : m.attendeeId;
    const company = d ? d.company : "Unknown";
    console.log(`  Slot ${m.timeSlot} | ${name} | ${company} | Score: ${m.matchScore}%`);
  }
  
  // SHL meetings
  const shl = meetings.filter(m => m.sponsorId === 750001).sort((a, b) => {
    if ((a.attendeeNumber || 1) !== (b.attendeeNumber || 1)) return (a.attendeeNumber || 1) - (b.attendeeNumber || 1);
    return (a.timeSlot || 0) - (b.timeSlot || 0);
  });
  console.log("\n=== SHL MEETINGS ===");
  for (const m of shl) {
    const d = getDelegate(m.attendeeId);
    const name = d ? `${d.firstName} ${d.lastName}` : m.attendeeId;
    const company = d ? d.company : "Unknown";
    console.log(`  Slot ${m.timeSlot} Rep ${m.attendeeNumber} | ${name} | ${company} | Score: ${m.matchScore}%`);
  }
  
  // Check for flagged companies in both
  const flaggedCompanies = [
    "KPMG", "BT Group", "Aon", "JPMorganChase", "Balfour Beatty", "GSK", "AXA",
    "Nissan Motor Corporation", "Ramboll", "Swiss Re Management Ltd",
    "Smith and Nephew plc", "London Stock Exchange Group", "CBRE", "Hitachi",
    "Amazon", "Sky", "Macquarie", "UKRSIBBANK BNP PARIBAS GROUP"
  ];
  
  const allMeetings = [...perchpeek, ...shl];
  console.log("\n=== FLAGGED COMPANY CHECK (PerchPeek + SHL) ===");
  let found = false;
  for (const m of allMeetings) {
    const d = getDelegate(m.attendeeId);
    if (!d) continue;
    const company = (d.company || "").toLowerCase();
    const matchedFlag = flaggedCompanies.find(f => 
      company.includes(f.toLowerCase()) || f.toLowerCase().includes(company)
    );
    if (matchedFlag) {
      const sponsor = m.sponsorId === 450001 ? "PerchPeek" : "SHL";
      console.log(`  ⚠️  ${sponsor}: ${d.firstName} ${d.lastName} (${d.company}) — flagged: ${matchedFlag}`);
      found = true;
    }
  }
  if (!found) {
    console.log("  ✅ No flagged companies found in PerchPeek or SHL meetings");
  }
}

main().catch(console.error);
