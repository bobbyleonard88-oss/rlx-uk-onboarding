/**
 * Test suite for meetings visibility toggle functionality
 * Verifies that admin can control whether published meetings are visible to sponsors
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { eq } from 'drizzle-orm';
import { meetings, sponsors } from '../drizzle/schema';

describe('Meetings Visibility Toggle', () => {
  let testSponsorId: number;
  let testMeetingIds: number[] = [];
  // Use a unique email per test run to avoid cross-run contamination
  const uniqueEmail = `visibility-test-${Date.now()}@example.com`;
  const uniqueUserId = 900000 + Math.floor(Math.random() * 99999);

  beforeAll(async () => {
    // Create a test sponsor using upsertSponsor
    testSponsorId = await db.upsertSponsor({
      userId: uniqueUserId,
      contactEmail: uniqueEmail,
      companyName: 'Visibility Test Company',
      contactName: 'Test User',
      packageType: '12-meetings',
      status: 'active',
    });

    // Create test meetings with confirmed status
    for (let i = 0; i < 3; i++) {
      const meetingId = await db.createMeeting({
        sponsorId: testSponsorId,
        attendeeId: `test-attendee-${i}`,
        matchScore: 80,
        matchReason: 'Test match reason',
        isTopRanked: 1,
        isPriority: 0,
        timeSlot: i + 1,
        attendeeNumber: 1,
        status: 'confirmed', // Published meetings
        notes: null,
      });
      testMeetingIds.push(meetingId);
    }
  });

  it('should create meetings with isVisible = 1 by default', async () => {
    const allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    
    expect(allMeetings.length).toBe(3);
    allMeetings.forEach(meeting => {
      expect(meeting.isVisible).toBe(1);
    });
  });

  it('should hide all meetings for a sponsor when toggled off', async () => {
    // Toggle visibility off
    await db.toggleMeetingsVisibility(testSponsorId, false);
    
    const allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    
    allMeetings.forEach(meeting => {
      expect(meeting.isVisible).toBe(0);
    });
  });

  it('should show all meetings for a sponsor when toggled on', async () => {
    // Toggle visibility on
    await db.toggleMeetingsVisibility(testSponsorId, true);
    
    const allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    
    allMeetings.forEach(meeting => {
      expect(meeting.isVisible).toBe(1);
    });
  });

  it('should only return visible confirmed meetings in sponsor view', async () => {
    // First, ensure meetings are visible
    await db.toggleMeetingsVisibility(testSponsorId, true);
    
    const allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    const visibleConfirmedMeetings = allMeetings.filter(
      m => m.status === 'confirmed' && m.isVisible === 1
    );
    
    expect(visibleConfirmedMeetings.length).toBe(3);
    
    // Now hide meetings
    await db.toggleMeetingsVisibility(testSponsorId, false);
    
    const allMeetingsAfterHide = await db.getMeetingsBySponsor(testSponsorId);
    const visibleConfirmedAfterHide = allMeetingsAfterHide.filter(
      m => m.status === 'confirmed' && m.isVisible === 1
    );
    
    // Should be 0 because all meetings are hidden
    expect(visibleConfirmedAfterHide.length).toBe(0);
  });

  it('should not affect suggested (draft) meetings', async () => {
    // Create a draft meeting
    const draftMeetingId = await db.createMeeting({
      sponsorId: testSponsorId,
      attendeeId: 'draft-attendee',
      matchScore: 75,
      matchReason: 'Draft match',
      isTopRanked: 0,
      isPriority: 0,
      timeSlot: 4,
      attendeeNumber: 1,
      status: 'suggested', // Draft status
      notes: null,
    });
    
    // Toggle visibility off
    await db.toggleMeetingsVisibility(testSponsorId, false);
    
    const allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    const draftMeeting = allMeetings.find(m => m.id === draftMeetingId);
    
    // Draft meeting should also have isVisible = 0 (admin can control all meetings)
    expect(draftMeeting?.isVisible).toBe(0);
    
    // But sponsors shouldn't see draft meetings regardless of visibility
    const sponsorVisibleMeetings = allMeetings.filter(
      m => m.status === 'confirmed' && m.isVisible === 1
    );
    expect(sponsorVisibleMeetings.length).toBe(0);
  });

  afterAll(async () => {
    // Clean up test data
    const dbInstance = await db.getDb();
    if (dbInstance) {
      await dbInstance.delete(meetings).where(eq(meetings.sponsorId, testSponsorId));
      await dbInstance.delete(sponsors).where(eq(sponsors.id, testSponsorId));
    }
  });

  it('should toggle visibility multiple times correctly', async () => {
    // Toggle off
    await db.toggleMeetingsVisibility(testSponsorId, false);
    let allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    expect(allMeetings.every(m => m.isVisible === 0)).toBe(true);
    
    // Toggle on
    await db.toggleMeetingsVisibility(testSponsorId, true);
    allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    expect(allMeetings.every(m => m.isVisible === 1)).toBe(true);
    
    // Toggle off again
    await db.toggleMeetingsVisibility(testSponsorId, false);
    allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    expect(allMeetings.every(m => m.isVisible === 0)).toBe(true);
    
    // Toggle on again
    await db.toggleMeetingsVisibility(testSponsorId, true);
    allMeetings = await db.getMeetingsBySponsor(testSponsorId);
    expect(allMeetings.every(m => m.isVisible === 1)).toBe(true);
  });
});
