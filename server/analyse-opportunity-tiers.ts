/**
 * Opportunity Tier Classification
 *
 * Classifies each rated meeting into:
 *   🟢 Green  = Active opportunity (follow up immediately)
 *   🟡 Amber  = Future potential (worth nurturing)
 *   🔴 Red    = Not a fit right now
 *
 * Classification logic (using star rating + notes):
 *   5★            → Green (strong signal of active interest)
 *   4★            → Green (positive, likely active or near-term)
 *   3★            → Amber (neutral / future potential)
 *   2★            → Red   (poor fit or no near-term need)
 *   1★            → Red   (not a fit)
 *
 * Notes override: if notes mention active budget / project / "follow up" / "interested" → upgrade
 *                 if notes mention "no budget" / "not right now" / "not relevant" → downgrade
 */
import * as dotenv from "dotenv";
dotenv.config();
import * as db from "./db";
import { attendees } from "./attendees";

const attendeeMap = new Map(attendees.map(a => [String(a.id), a]));

type Tier = "🟢 Green" | "🟡 Amber" | "🔴 Red";

function classifyByRating(rating: number): Tier {
  if (rating >= 4) return "🟢 Green";
  if (rating === 3) return "🟡 Amber";
  return "🔴 Red";
}

// Keyword-based note override
function adjustByNotes(base: Tier, notes: string | null): Tier {
  if (!notes) return base;
  const n = notes.toLowerCase();

  const greenSignals = [
    "follow up", "follow-up", "active", "budget confirmed", "in budget",
    "actively looking", "procurement", "rfp", "ready to buy", "decision",
    "great fit", "perfect fit", "very interested", "keen", "excited",
    "next steps", "demo", "proposal", "contract", "sign off"
  ];
  const redSignals = [
    "no budget", "no near-term", "not right now", "not relevant",
    "not a fit", "wrong fit", "poor fit", "no need", "not interested",
    "already have", "existing solution", "happy with current",
    "not in market", "no project", "12 months", "18 months", "2 years"
  ];

  const hasGreen = greenSignals.some(s => n.includes(s));
  const hasRed = redSignals.some(s => n.includes(s));

  if (hasGreen && !hasRed) {
    if (base === "🔴 Red") return "🟡 Amber"; // upgrade one step only
    if (base === "🟡 Amber") return "🟢 Green";
    return "🟢 Green";
  }
  if (hasRed && !hasGreen) {
    if (base === "🟢 Green") return "🟡 Amber"; // downgrade one step only
    if (base === "🟡 Amber") return "🔴 Red";
    return "🔴 Red";
  }
  return base;
}

async function main() {
  const allSponsors = await db.getAllSponsors();

  type MeetingRow = {
    sponsor: string;
    delegate: string;
    company: string;
    rating: number;
    notes: string | null;
    tier: Tier;
  };

  const allRows: MeetingRow[] = [];

  for (const sponsor of allSponsors as any[]) {
    const meetings = await db.getMeetingsBySponsor(sponsor.id);
    const ratedMeetings = (meetings as any[]).filter((m: any) => m.meetingRating != null);
    if (ratedMeetings.length === 0) continue;

    for (const m of ratedMeetings) {
      const attendee = attendeeMap.get(String(m.attendeeId));
      if (!attendee) continue;

      const baseTier = classifyByRating(m.meetingRating);
      const finalTier = adjustByNotes(baseTier, m.meetingNotes ?? null);

      allRows.push({
        sponsor: sponsor.companyName,
        delegate: `${(attendee as any).firstName} ${(attendee as any).lastName}`,
        company: (attendee as any).company ?? "",
        rating: m.meetingRating,
        notes: m.meetingNotes ?? null,
        tier: finalTier,
      });
    }
  }

  const green = allRows.filter(r => r.tier === "🟢 Green");
  const amber = allRows.filter(r => r.tier === "🟡 Amber");
  const red = allRows.filter(r => r.tier === "🔴 Red");

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" OPPORTUNITY TIER CLASSIFICATION");
  console.log(`  Total rated meetings: ${allRows.length}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log(`  🟢 Green  (Active opportunity):  ${green.length}  (${Math.round(green.length / allRows.length * 100)}%)`);
  console.log(`  🟡 Amber  (Future potential):     ${amber.length}  (${Math.round(amber.length / allRows.length * 100)}%)`);
  console.log(`  🔴 Red    (Not a fit right now):  ${red.length}  (${Math.round(red.length / allRows.length * 100)}%)`);

  // Per-sponsor breakdown
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(" PER-SPONSOR BREAKDOWN");
  console.log("─────────────────────────────────────────────────────────────");
  const sponsors = Array.from(new Set(allRows.map(r => r.sponsor)));
  for (const s of sponsors) {
    const rows = allRows.filter(r => r.sponsor === s);
    const g = rows.filter(r => r.tier === "🟢 Green").length;
    const a = rows.filter(r => r.tier === "🟡 Amber").length;
    const r = rows.filter(r => r.tier === "🔴 Red").length;
    const avgRating = (rows.reduce((sum, x) => sum + x.rating, 0) / rows.length).toFixed(2);
    console.log(`  ${s.padEnd(28)} 🟢${g}  🟡${a}  🔴${r}  (avg ${avgRating}★, ${rows.length} meetings)`);
  }

  // Green meetings detail
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(` 🟢 GREEN MEETINGS — Active Opportunities (${green.length})`);
  console.log("─────────────────────────────────────────────────────────────");
  for (const r of green) {
    const notesStr = r.notes ? `  → "${r.notes.slice(0, 80)}${r.notes.length > 80 ? "…" : ""}"` : "";
    console.log(`  ${r.sponsor.padEnd(28)} ${r.delegate.padEnd(28)} ${r.company.padEnd(25)} ${r.rating}★${notesStr}`);
  }

  // Amber meetings detail
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(` 🟡 AMBER MEETINGS — Future Potential (${amber.length})`);
  console.log("─────────────────────────────────────────────────────────────");
  for (const r of amber) {
    const notesStr = r.notes ? `  → "${r.notes.slice(0, 80)}${r.notes.length > 80 ? "…" : ""}"` : "";
    console.log(`  ${r.sponsor.padEnd(28)} ${r.delegate.padEnd(28)} ${r.company.padEnd(25)} ${r.rating}★${notesStr}`);
  }

  // Note on methodology
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(" METHODOLOGY NOTE");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("  Classification: 4-5★ → Green, 3★ → Amber, 1-2★ → Red");
  console.log("  Notes keywords can upgrade or downgrade by one tier.");
  console.log("  This is an approximation — actual pipeline value requires");
  console.log("  sponsor follow-up to confirm active budget / timeline.");
  console.log("═══════════════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
