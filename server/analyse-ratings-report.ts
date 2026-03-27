import * as db from "./db";
import { attendees } from "./attendees";

async function main() {
  const allSponsors = await db.getAllSponsors();

  // Build attendee lookup
  const attendeeMap = new Map<string, { name: string; company: string }>();
  attendees.forEach((a: any) => {
    attendeeMap.set(String(a.id), {
      name: `${a.firstName} ${a.lastName}`,
      company: a.company ?? a.companyName ?? "",
    });
  });

  // Collect all rated meetings across all sponsors
  type Row = {
    sponsor: string;
    delegate: string;
    company: string;
    rank: number | null;
    score: number | null;
    rating: number;
    rep: string;
  };

  const allRows: Row[] = [];

  for (const sponsor of allSponsors as any[]) {
    const meetings = await db.getMeetingsBySponsor(sponsor.id);
    const rated = (meetings as any[]).filter((m) => m.meetingRating != null);
    if (rated.length === 0) continue;

    // Get rankings
    const submissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
    const latestSub = (submissions as any[]).find((s) => s.isReviewed === 1) ?? (submissions as any[])[0];
    const rankingsData: string[] = latestSub ? JSON.parse(latestSub.rankingsData) : [];
    const rankMap = new Map<string, number>();
    rankingsData.forEach((id, idx) => rankMap.set(String(id), idx + 1));

    for (const m of rated) {
      const entry = attendeeMap.get(String(m.attendeeId));
      allRows.push({
        sponsor: sponsor.companyName,
        delegate: entry?.name ?? String(m.attendeeId),
        company: entry?.company ?? "",
        rank: rankMap.get(String(m.attendeeId)) ?? null,
        score: m.matchScore ?? null,
        rating: m.meetingRating,
        rep: m.attendeeNumber === 2 ? "Rep 2" : "Rep 1",
      });
    }
  }

  // ── 1. SPONSOR SUMMARY ──────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SECTION 1 — SPONSOR SUMMARY (avg rating & match score)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const sponsorGroups = new Map<string, Row[]>();
  allRows.forEach((r) => {
    if (!sponsorGroups.has(r.sponsor)) sponsorGroups.set(r.sponsor, []);
    sponsorGroups.get(r.sponsor)!.push(r);
  });

  const sponsorSummary = Array.from(sponsorGroups.entries()).map(([sponsor, rows]) => {
    const avgRating = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
    const scoredRows = rows.filter((r) => r.score != null);
    const avgScore = scoredRows.length > 0
      ? scoredRows.reduce((s, r) => s + r.score!, 0) / scoredRows.length
      : null;
    const rankedRows = rows.filter((r) => r.rank != null);
    const avgRank = rankedRows.length > 0
      ? rankedRows.reduce((s, r) => s + r.rank!, 0) / rankedRows.length
      : null;
    const highRated = rows.filter((r) => r.rating >= 4).length;
    const lowRated = rows.filter((r) => r.rating <= 2).length;
    return { sponsor, count: rows.length, avgRating, avgScore, avgRank, highRated, lowRated };
  }).sort((a, b) => b.avgRating - a.avgRating);

  console.log(
    "Sponsor".padEnd(28),
    "Rated".padEnd(7),
    "Avg★".padEnd(7),
    "Avg Match%".padEnd(12),
    "Avg Rank".padEnd(10),
    "4-5★".padEnd(6),
    "1-2★"
  );
  console.log("─".repeat(82));
  sponsorSummary.forEach((s) => {
    console.log(
      s.sponsor.padEnd(28),
      String(s.count).padEnd(7),
      s.avgRating.toFixed(2).padEnd(7),
      (s.avgScore != null ? `${s.avgScore.toFixed(1)}%` : "n/a").padEnd(12),
      (s.avgRank != null ? `#${s.avgRank.toFixed(1)}` : "n/a").padEnd(10),
      String(s.highRated).padEnd(6),
      String(s.lowRated)
    );
  });

  // ── 2. HIGH-RATED MEETINGS (4-5★) ───────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SECTION 2 — HIGH-RATED MEETINGS (4★ or 5★)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const highRated = allRows.filter((r) => r.rating >= 4).sort((a, b) => b.rating - a.rating);
  console.log(
    "Sponsor".padEnd(24),
    "Delegate".padEnd(26),
    "Company".padEnd(28),
    "Rank".padEnd(8),
    "Match%".padEnd(9),
    "★"
  );
  console.log("─".repeat(100));
  highRated.forEach((r) => {
    console.log(
      r.sponsor.padEnd(24),
      r.delegate.padEnd(26),
      r.company.padEnd(28),
      (r.rank != null ? `#${r.rank}` : "unranked").padEnd(8),
      (r.score != null ? `${r.score}%` : "n/a").padEnd(9),
      `${r.rating}/5`
    );
  });

  // ── 3. LOW-RATED MEETINGS (1-2★) ────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SECTION 3 — LOW-RATED MEETINGS (1★ or 2★)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const lowRated = allRows.filter((r) => r.rating <= 2).sort((a, b) => a.rating - b.rating);
  console.log(
    "Sponsor".padEnd(24),
    "Delegate".padEnd(26),
    "Company".padEnd(28),
    "Rank".padEnd(8),
    "Match%".padEnd(9),
    "★"
  );
  console.log("─".repeat(100));
  lowRated.forEach((r) => {
    console.log(
      r.sponsor.padEnd(24),
      r.delegate.padEnd(26),
      r.company.padEnd(28),
      (r.rank != null ? `#${r.rank}` : "unranked").padEnd(8),
      (r.score != null ? `${r.score}%` : "n/a").padEnd(9),
      `${r.rating}/5`
    );
  });

  // ── 4. MATCH SCORE vs RATING CORRELATION ────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SECTION 4 — MATCH SCORE vs RATING CORRELATION");
  console.log("═══════════════════════════════════════════════════════════\n");

  const buckets: Record<string, { count: number; totalRating: number }> = {
    "90-100%": { count: 0, totalRating: 0 },
    "70-89%":  { count: 0, totalRating: 0 },
    "50-69%":  { count: 0, totalRating: 0 },
    "0-49%":   { count: 0, totalRating: 0 },
  };

  allRows.filter((r) => r.score != null).forEach((r) => {
    const s = r.score!;
    const bucket = s >= 90 ? "90-100%" : s >= 70 ? "70-89%" : s >= 50 ? "50-69%" : "0-49%";
    buckets[bucket].count++;
    buckets[bucket].totalRating += r.rating;
  });

  console.log("Match Score Bucket".padEnd(20), "Meetings".padEnd(10), "Avg Rating");
  console.log("─".repeat(42));
  Object.entries(buckets).forEach(([bucket, data]) => {
    const avg = data.count > 0 ? (data.totalRating / data.count).toFixed(2) : "n/a";
    console.log(bucket.padEnd(20), String(data.count).padEnd(10), avg);
  });

  // ── 5. RANK vs RATING CORRELATION ───────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SECTION 5 — RANK POSITION vs RATING CORRELATION");
  console.log("═══════════════════════════════════════════════════════════\n");

  const rankBuckets: Record<string, { count: number; totalRating: number }> = {
    "Top 10":    { count: 0, totalRating: 0 },
    "11–20":     { count: 0, totalRating: 0 },
    "21–30":     { count: 0, totalRating: 0 },
    "31+":       { count: 0, totalRating: 0 },
    "Unranked":  { count: 0, totalRating: 0 },
  };

  allRows.forEach((r) => {
    const bucket = r.rank == null ? "Unranked"
      : r.rank <= 10 ? "Top 10"
      : r.rank <= 20 ? "11–20"
      : r.rank <= 30 ? "21–30"
      : "31+";
    rankBuckets[bucket].count++;
    rankBuckets[bucket].totalRating += r.rating;
  });

  console.log("Rank Bucket".padEnd(14), "Meetings".padEnd(10), "Avg Rating");
  console.log("─".repeat(36));
  Object.entries(rankBuckets).forEach(([bucket, data]) => {
    const avg = data.count > 0 ? (data.totalRating / data.count).toFixed(2) : "n/a";
    console.log(bucket.padEnd(14), String(data.count).padEnd(10), avg);
  });

  // ── 6. OVERALL STATS ────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SECTION 6 — OVERALL STATS");
  console.log("═══════════════════════════════════════════════════════════\n");

  const totalRated = allRows.length;
  const overallAvgRating = allRows.reduce((s, r) => s + r.rating, 0) / totalRated;
  const scoredAll = allRows.filter((r) => r.score != null);
  const overallAvgScore = scoredAll.reduce((s, r) => s + r.score!, 0) / scoredAll.length;
  const fiveStars = allRows.filter((r) => r.rating === 5).length;
  const fourStars = allRows.filter((r) => r.rating === 4).length;
  const threeStars = allRows.filter((r) => r.rating === 3).length;
  const twoStars = allRows.filter((r) => r.rating === 2).length;
  const oneStar = allRows.filter((r) => r.rating === 1).length;

  console.log(`Total rated meetings:  ${totalRated}`);
  console.log(`Overall avg rating:    ${overallAvgRating.toFixed(2)}/5`);
  console.log(`Overall avg match%:    ${overallAvgScore.toFixed(1)}%`);
  console.log(`\nRating distribution:`);
  console.log(`  5★: ${fiveStars} (${((fiveStars/totalRated)*100).toFixed(0)}%)`);
  console.log(`  4★: ${fourStars} (${((fourStars/totalRated)*100).toFixed(0)}%)`);
  console.log(`  3★: ${threeStars} (${((threeStars/totalRated)*100).toFixed(0)}%)`);
  console.log(`  2★: ${twoStars} (${((twoStars/totalRated)*100).toFixed(0)}%)`);
  console.log(`  1★: ${oneStar} (${((oneStar/totalRated)*100).toFixed(0)}%)`);
}

main().catch(console.error);
