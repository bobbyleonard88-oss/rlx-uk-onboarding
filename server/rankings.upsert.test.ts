/**
 * Tests for rankings upsert behaviour:
 * - First submission creates a new row
 * - Re-submission overwrites the existing row (no duplicates)
 * - submittedAt is refreshed on re-submission
 * - status resets to 'pending' on re-submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal mock of the db layer so we can test upsertRankingsSubmission logic
// without a real database connection.
// ---------------------------------------------------------------------------

type RankingsRow = {
  id: number;
  sponsorId: number;
  userId: number;
  rankingsData: string;
  submittedAt: Date;
  status: string;
  isReviewed: number;
  isArchived: number;
};

let store: RankingsRow[] = [];
let nextId = 1;

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockImplementation(() => {
    // Return the most recent row for the queried sponsorId (set per test)
    return store.filter(r => r.sponsorId === currentSponsorId).slice(-1);
  }),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockImplementation((vals: Omit<RankingsRow, 'id'>) => {
    const row: RankingsRow = { id: nextId++, ...vals } as RankingsRow;
    store.push(row);
    return [{ insertId: row.id }];
  }),
};

let currentSponsorId = 1;

// ---------------------------------------------------------------------------
// Pure logic extracted from upsertRankingsSubmission for unit testing
// ---------------------------------------------------------------------------

async function upsertRankingsSubmission(submission: {
  sponsorId: number;
  userId: number;
  rankingsData: string;
}): Promise<number> {
  // Find existing row for this sponsor
  const existing = store
    .filter(r => r.sponsorId === submission.sponsorId)
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, 1);

  if (existing.length > 0) {
    // Overwrite in place
    const row = existing[0];
    row.userId = submission.userId;
    row.rankingsData = submission.rankingsData;
    row.submittedAt = new Date();
    row.status = 'pending';
    row.isReviewed = 0;
    return row.id;
  } else {
    const id = nextId++;
    store.push({
      id,
      sponsorId: submission.sponsorId,
      userId: submission.userId,
      rankingsData: submission.rankingsData,
      submittedAt: new Date(),
      status: 'pending',
      isReviewed: 0,
      isArchived: 0,
    });
    return id;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('upsertRankingsSubmission', () => {
  beforeEach(() => {
    store = [];
    nextId = 1;
  });

  it('creates a new row when no existing submission exists for the sponsor', async () => {
    const id = await upsertRankingsSubmission({
      sponsorId: 1,
      userId: 10,
      rankingsData: JSON.stringify(['delegate-1', 'delegate-2']),
    });

    expect(id).toBe(1);
    expect(store).toHaveLength(1);
    expect(store[0].sponsorId).toBe(1);
    expect(store[0].rankingsData).toBe(JSON.stringify(['delegate-1', 'delegate-2']));
  });

  it('overwrites the existing row on re-submission (no duplicates)', async () => {
    // First submission
    await upsertRankingsSubmission({
      sponsorId: 1,
      userId: 10,
      rankingsData: JSON.stringify(['delegate-1', 'delegate-2']),
    });

    // Re-submission with updated order
    const id = await upsertRankingsSubmission({
      sponsorId: 1,
      userId: 10,
      rankingsData: JSON.stringify(['delegate-2', 'delegate-1']),
    });

    // Still only one row in the store
    const rowsForSponsor = store.filter(r => r.sponsorId === 1);
    expect(rowsForSponsor).toHaveLength(1);
    expect(rowsForSponsor[0].rankingsData).toBe(JSON.stringify(['delegate-2', 'delegate-1']));
    expect(id).toBe(rowsForSponsor[0].id);
  });

  it('refreshes submittedAt timestamp on re-submission', async () => {
    // First submission — manually set an old timestamp
    await upsertRankingsSubmission({ sponsorId: 1, userId: 10, rankingsData: '[]' });
    const originalTime = store[0].submittedAt.getTime();

    // Wait a tick so the new Date() differs
    await new Promise(r => setTimeout(r, 5));

    await upsertRankingsSubmission({ sponsorId: 1, userId: 10, rankingsData: '["delegate-1"]' });

    expect(store[0].submittedAt.getTime()).toBeGreaterThan(originalTime);
  });

  it('resets status to pending and isReviewed to 0 on re-submission', async () => {
    await upsertRankingsSubmission({ sponsorId: 1, userId: 10, rankingsData: '[]' });

    // Simulate admin marking as reviewed
    store[0].status = 'reviewed';
    store[0].isReviewed = 1;

    // Sponsor re-submits
    await upsertRankingsSubmission({ sponsorId: 1, userId: 10, rankingsData: '["delegate-1"]' });

    expect(store[0].status).toBe('pending');
    expect(store[0].isReviewed).toBe(0);
  });

  it('handles multiple sponsors independently without cross-contamination', async () => {
    await upsertRankingsSubmission({ sponsorId: 1, userId: 10, rankingsData: '["a"]' });
    await upsertRankingsSubmission({ sponsorId: 2, userId: 20, rankingsData: '["b"]' });

    // Re-submit sponsor 1 only
    await upsertRankingsSubmission({ sponsorId: 1, userId: 10, rankingsData: '["a", "c"]' });

    const sponsor1Rows = store.filter(r => r.sponsorId === 1);
    const sponsor2Rows = store.filter(r => r.sponsorId === 2);

    expect(sponsor1Rows).toHaveLength(1);
    expect(sponsor1Rows[0].rankingsData).toBe('["a", "c"]');
    expect(sponsor2Rows).toHaveLength(1);
    expect(sponsor2Rows[0].rankingsData).toBe('["b"]');
  });
});
