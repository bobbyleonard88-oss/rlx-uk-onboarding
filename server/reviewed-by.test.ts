/**
 * Tests for reviewedBy tracking and submission stats
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { rankingsSubmissions, sponsors } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('ReviewedBy Tracking', () => {
  let testSponsorId: number;
  let submissionId: number;
  const uniqueUserId = 800000 + Math.floor(Math.random() * 99999);
  const uniqueEmail = `reviewed-by-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    testSponsorId = await db.upsertSponsor({
      userId: uniqueUserId,
      contactEmail: uniqueEmail,
      companyName: 'ReviewedBy Test Co',
      contactName: 'Test Admin',
      packageType: '12-meetings',
      status: 'active',
    });

    // Create a rankings submission
    submissionId = await db.upsertRankingsSubmission({
      sponsorId: testSponsorId,
      userId: uniqueUserId,
      rankingsData: JSON.stringify(['a1', 'a2', 'a3']),
    });
  });

  afterAll(async () => {
    const dbInstance = await db.getDb();
    if (dbInstance) {
      await dbInstance.delete(rankingsSubmissions).where(eq(rankingsSubmissions.sponsorId, testSponsorId));
      await dbInstance.delete(sponsors).where(eq(sponsors.id, testSponsorId));
    }
  });

  it('should start with status pending and no reviewedBy', async () => {
    const subs = await db.getRankingsSubmissionsBySponsor(testSponsorId);
    expect(subs.length).toBe(1);
    expect(subs[0].status).toBe('pending');
    expect(subs[0].reviewedBy).toBeNull();
    expect(subs[0].reviewedAt).toBeNull();
  });

  it('should record reviewedBy and reviewedAt when marked as reviewed', async () => {
    await db.updateSubmissionStatus(submissionId, 'reviewed', 'admin@rlx.com');

    const subs = await db.getRankingsSubmissionsBySponsor(testSponsorId);
    expect(subs[0].status).toBe('reviewed');
    expect(subs[0].reviewedBy).toBe('admin@rlx.com');
    expect(subs[0].reviewedAt).not.toBeNull();
  });

  it('should clear reviewedBy and reviewedAt when reset to pending', async () => {
    await db.updateSubmissionStatus(submissionId, 'pending');

    const subs = await db.getRankingsSubmissionsBySponsor(testSponsorId);
    expect(subs[0].status).toBe('pending');
    expect(subs[0].reviewedBy).toBeNull();
    expect(subs[0].reviewedAt).toBeNull();
  });

  it('should reset reviewedBy to null when sponsor re-submits rankings', async () => {
    // First mark as reviewed
    await db.updateSubmissionStatus(submissionId, 'reviewed', 'admin@rlx.com');

    // Sponsor re-submits — upsert should reset status to pending
    await db.upsertRankingsSubmission({
      sponsorId: testSponsorId,
      userId: uniqueUserId,
      rankingsData: JSON.stringify(['a3', 'a1', 'a2']),
    });

    const subs = await db.getRankingsSubmissionsBySponsor(testSponsorId);
    expect(subs.length).toBe(1); // still only one row
    expect(subs[0].status).toBe('pending');
    expect(subs[0].reviewedBy).toBeNull();
  });
});

describe('Submission Stats', () => {
  it('should return non-negative counts', async () => {
    const allIntake = await db.getAllIntakeSubmissions();
    const allRankings = await db.getAllRankingsSubmissions();
    const allSponsors = await db.getAllSponsors();

    const intakeCount = new Set(allIntake.map((s: any) => s.sponsorId)).size;
    const rankingsCount = new Set(allRankings.map((s: any) => s.sponsorId)).size;
    const totalSponsors = allSponsors.length;

    expect(intakeCount).toBeGreaterThanOrEqual(0);
    expect(rankingsCount).toBeGreaterThanOrEqual(0);
    expect(totalSponsors).toBeGreaterThanOrEqual(0);
    expect(rankingsCount).toBeLessThanOrEqual(totalSponsors);
  });
});
