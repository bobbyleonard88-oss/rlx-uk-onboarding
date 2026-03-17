import { desc, eq, and, sql, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sponsors, InsertSponsor, rankingsSubmissions, InsertRankingsSubmission, vendorProfiles, InsertVendorProfile, delegateProfiles, InsertDelegateProfile, priorityTags, InsertPriorityTag, meetings, InsertMeeting, intakeSubmissions, InsertIntakeSubmission, matchCache, InsertMatchCache, adminActivityLog, InsertAdminActivityLog, sponsorActivityLog, InsertSponsorActivityLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Sponsor helpers
export async function getSponsorByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(sponsors).where(eq(sponsors.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getSponsorById(sponsorId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(sponsors).where(eq(sponsors.id, sponsorId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSponsors() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all sponsors that don't have archived rankings
  const allSponsors = await db.select().from(sponsors);
  const archivedRankings = await db
    .select({ sponsorId: rankingsSubmissions.sponsorId })
    .from(rankingsSubmissions)
    .where(eq(rankingsSubmissions.isArchived, 1));
  
  const archivedSponsorIds = new Set(archivedRankings.map(r => r.sponsorId));
  
  return allSponsors.filter(s => !archivedSponsorIds.has(s.id));
}

export async function upsertSponsor(sponsor: InsertSponsor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First check by userId
  let existing = await getSponsorByUserId(sponsor.userId);
  
  // If not found by userId, check by contactEmail to prevent duplicates from different accounts
  if (!existing) {
    const emailMatch = await db
      .select()
      .from(sponsors)
      .where(eq(sponsors.contactEmail, sponsor.contactEmail))
      .limit(1);
    existing = emailMatch.length > 0 ? emailMatch[0] : null;
  }
  
  if (existing) {
    // Update existing sponsor (update userId to current user to link accounts)
    await db.update(sponsors)
      .set({
        userId: sponsor.userId, // Update userId to current user
        companyName: sponsor.companyName,
        contactName: sponsor.contactName,
        contactEmail: sponsor.contactEmail,
        updatedAt: new Date(),
      })
      .where(eq(sponsors.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(sponsors).values(sponsor);
    return Number(result[0].insertId);
  }
}

// Rankings helpers
export async function createRankingsSubmission(submission: InsertRankingsSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(rankingsSubmissions).values(submission);
  return Number(result[0].insertId);
}

// Upsert rankings: overwrite existing row for this sponsor, or insert if none exists
export async function upsertRankingsSubmission(submission: InsertRankingsSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(rankingsSubmissions)
    .where(eq(rankingsSubmissions.sponsorId, submission.sponsorId))
    .orderBy(desc(rankingsSubmissions.submittedAt))
    .limit(1);

  if (existing.length > 0) {
    // Overwrite the existing row with fresh data and a new timestamp
    // Also clear reviewer info so admin must re-review the updated submission
    await db
      .update(rankingsSubmissions)
      .set({
        userId: submission.userId,
        rankingsData: submission.rankingsData,
        submittedAt: new Date(),
        status: 'pending',
        isReviewed: 0,
        reviewedBy: null,
        reviewedAt: null,
      })
      .where(eq(rankingsSubmissions.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(rankingsSubmissions).values(submission);
    return Number(result[0].insertId);
  }
}

export async function getAllRankingsSubmissions() {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select({
      id: rankingsSubmissions.id,
      sponsorId: rankingsSubmissions.sponsorId,
      userId: rankingsSubmissions.userId,
      rankingsData: rankingsSubmissions.rankingsData,
      submittedAt: rankingsSubmissions.submittedAt,
      status: rankingsSubmissions.status,
      isArchived: rankingsSubmissions.isArchived,
      isReviewed: rankingsSubmissions.isReviewed,
      reviewedBy: rankingsSubmissions.reviewedBy,
      reviewedAt: rankingsSubmissions.reviewedAt,
      companyName: sponsors.companyName,
      contactName: sponsors.contactName,
      contactEmail: sponsors.contactEmail,
    })
    .from(rankingsSubmissions)
    .leftJoin(sponsors, eq(rankingsSubmissions.sponsorId, sponsors.id))
    .orderBy(desc(rankingsSubmissions.submittedAt));
  
  return results;
}

export async function getRankingsSubmissionsBySponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(rankingsSubmissions)
    .where(eq(rankingsSubmissions.sponsorId, sponsorId))
    .orderBy(desc(rankingsSubmissions.submittedAt));
}

// User management helpers
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// Vendor profile management
export async function createVendorProfile(profile: Omit<InsertVendorProfile, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(vendorProfiles).values(profile);
  return result[0].insertId;
}

export async function getVendorProfiles() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(vendorProfiles)
    .orderBy(desc(vendorProfiles.createdAt));
}

export async function deleteVendorProfile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(vendorProfiles).where(eq(vendorProfiles.id, id));
}

// Delegate profile management
export async function createDelegateProfile(profile: Omit<InsertDelegateProfile, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(delegateProfiles).values(profile);
  return result[0].insertId;
}

export async function getDelegateProfiles() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(delegateProfiles)
    .orderBy(desc(delegateProfiles.createdAt));
}

export async function deleteDelegateProfile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(delegateProfiles).where(eq(delegateProfiles.id, id));
}

// Priority tags management
export async function createPriorityTag(tag: Omit<InsertPriorityTag, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(priorityTags).values(tag);
  return result[0].insertId;
}

export async function getPriorityTagsBySponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(priorityTags)
    .where(eq(priorityTags.sponsorId, sponsorId));
}

export async function deletePriorityTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(priorityTags).where(eq(priorityTags.id, id));
}

export async function removePriorityTagByAttendee(sponsorId: number, attendeeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(priorityTags)
    .where(
      and(
        eq(priorityTags.sponsorId, sponsorId),
        eq(priorityTags.attendeeId, attendeeId)
      )
    );
}

// Meetings management
export async function createMeeting(meeting: Omit<InsertMeeting, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(meetings).values(meeting);
  return result[0].insertId;
}

export async function getAllMeetings() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all meetings, then filter out those from archived sponsors
  const allMeetings = await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.createdAt));
  
  // Get archived sponsor IDs
  const archivedRankings = await db
    .select({ sponsorId: rankingsSubmissions.sponsorId })
    .from(rankingsSubmissions)
    .where(eq(rankingsSubmissions.isArchived, 1));
  
  const archivedSponsorIds = new Set(archivedRankings.map(r => r.sponsorId));
  
  // Filter out meetings from archived sponsors
  return allMeetings.filter(m => !archivedSponsorIds.has(m.sponsorId));
}

export async function updateMeetingStatus(id: number, status: "suggested" | "confirmed" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(meetings)
    .set({ status, updatedAt: new Date() })
    .where(eq(meetings.id, id));
}

export async function toggleMeetingsVisibility(sponsorId: number, isVisible: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(meetings)
    .set({ isVisible: isVisible ? 1 : 0, updatedAt: new Date() })
    .where(eq(meetings.sponsorId, sponsorId));
  
  return { isVisible };
}

export async function deleteMeeting(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(meetings).where(eq(meetings.id, id));
}

export async function getMeetingsBySponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select({
      id: meetings.id,
      sponsorId: meetings.sponsorId,
      attendeeId: meetings.attendeeId,
      matchScore: meetings.matchScore,
      matchReason: meetings.matchReason,
      isTopRanked: meetings.isTopRanked,
      isPriority: meetings.isPriority,
      timeSlot: meetings.timeSlot,
      attendeeNumber: meetings.attendeeNumber,
      status: meetings.status,
      isVisible: meetings.isVisible,
      notes: meetings.notes,
      adminNotes: meetings.adminNotes,
      createdAt: meetings.createdAt,
      updatedAt: meetings.updatedAt,
      attendeeFirstName: delegateProfiles.firstName,
      attendeeLastName: delegateProfiles.lastName,
      attendeeCompany: delegateProfiles.company,
      attendeeJobTitle: delegateProfiles.jobTitle,
    })
    .from(meetings)
    .leftJoin(delegateProfiles, eq(meetings.attendeeId, delegateProfiles.id))
    .where(eq(meetings.sponsorId, sponsorId))
    .orderBy(desc(meetings.matchScore));
  
  return results;
}

// Match Cache helpers
export async function getMatchCacheBySponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(matchCache)
    .where(eq(matchCache.sponsorId, sponsorId));
}

export async function createMatchCache(cache: InsertMatchCache) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(matchCache).values(cache);
}

export async function deleteMeetingsBySponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(meetings).where(eq(meetings.sponsorId, sponsorId));
}

export async function deleteAllMeetings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(meetings);
}

export async function updateRankingsSubmissionStatus(id: number, status: "pending" | "reviewed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(rankingsSubmissions)
    .set({ status })
    .where(eq(rankingsSubmissions.id, id));
}

export async function getAllDelegateProfiles() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(delegateProfiles);
}

export async function getDelegateByAttendeeId(attendeeId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(delegateProfiles)
    .where(eq(delegateProfiles.attendeeId, attendeeId))
    .limit(1);
  
  return results[0] || null;
}

export async function updateVendorProfileDocument(sponsorId: number, documentUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First check if vendor profile exists
  const existing = await db
    .select()
    .from(vendorProfiles)
    .where(eq(vendorProfiles.sponsorId, sponsorId))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing
    await db
      .update(vendorProfiles)
      .set({ profileDocument: documentUrl })
      .where(eq(vendorProfiles.sponsorId, sponsorId));
  } else {
    // Create new
    await db.insert(vendorProfiles).values({
      sponsorId,
      companyName: "Unknown",
      profileDocument: documentUrl,
    });
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getIntakeSubmissionBySponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.sponsorId, sponsorId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function upsertIntakeSubmission(data: InsertIntakeSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if submission already exists
  const existing = await db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.sponsorId, data.sponsorId))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing - refresh submittedAt to reflect re-submission date
    await db
      .update(intakeSubmissions)
      .set({ ...data, submittedAt: new Date() })
      .where(eq(intakeSubmissions.id, existing[0].id));
    return existing[0].id;
  } else {
    // Create new
    const result = await db.insert(intakeSubmissions).values(data);
    return Number(result[0].insertId);
  }
}

export async function updateSubmissionStatus(
  submissionId: number,
  status: "pending" | "reviewed",
  reviewedBy?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {
    status,
    isReviewed: status === "reviewed" ? 1 : 0,
  };

  if (status === "reviewed" && reviewedBy) {
    updateData.reviewedBy = reviewedBy;
    updateData.reviewedAt = new Date();
  } else if (status === "pending") {
    // Clear reviewer info when reset to pending
    updateData.reviewedBy = null;
    updateData.reviewedAt = null;
  }

  await db
    .update(rankingsSubmissions)
    .set(updateData)
    .where(eq(rankingsSubmissions.id, submissionId));
}

export async function archiveSubmission(submissionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(rankingsSubmissions)
    .set({ isArchived: 1 })
    .where(eq(rankingsSubmissions.id, submissionId));
}

export async function unarchiveSubmission(submissionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(rankingsSubmissions)
    .set({ isArchived: 0 })
    .where(eq(rankingsSubmissions.id, submissionId));
}

export async function getAllIntakeSubmissions() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get intake submissions: database not available");
    return [];
  }
  
  return await db.select().from(intakeSubmissions).orderBy(desc(intakeSubmissions.submittedAt));
}

export async function deleteSponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all related data first (foreign key constraints)
  await db.delete(meetings).where(eq(meetings.sponsorId, sponsorId));
  await db.delete(priorityTags).where(eq(priorityTags.sponsorId, sponsorId));
  await db.delete(intakeSubmissions).where(eq(intakeSubmissions.sponsorId, sponsorId));
  await db.delete(rankingsSubmissions).where(eq(rankingsSubmissions.sponsorId, sponsorId));
  await db.delete(vendorProfiles).where(eq(vendorProfiles.sponsorId, sponsorId));
  
  // Finally delete the sponsor
  await db.delete(sponsors).where(eq(sponsors.id, sponsorId));
}

// Get delegate meeting count across ALL sponsors
export async function getDelegateMeetingCount(attendeeId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(meetings)
    .where(eq(meetings.attendeeId, attendeeId));
  
  return result[0]?.count || 0;
}

// Get all meetings for a delegate across all sponsors with time slot info
export async function getDelegateMeetings(attendeeId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(meetings)
    .where(eq(meetings.attendeeId, attendeeId))
    .orderBy(meetings.timeSlot);
}

// Alias for getDelegateMeetings (for consistency)
export async function getMeetingsByDelegate(attendeeId: string) {
  return await getDelegateMeetings(attendeeId);
}

// Update meeting fields
export async function updateMeeting(id: number, updates: Partial<Omit<InsertMeeting, "id" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(meetings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(meetings.id, id));
}

export async function updateMeetingNotes(meetingId: number, adminNotes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(meetings)
    .set({ adminNotes, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));
}

// Check for time slot conflicts across all sponsors
export async function checkTimeSlotConflict(attendeeId: string, timeSlot: number, excludeSponsorId?: number) {
  const db = await getDb();
  if (!db) return false;
  
  const conditions = [
    eq(meetings.attendeeId, attendeeId),
    eq(meetings.timeSlot, timeSlot)
  ];
  
  if (excludeSponsorId) {
    conditions.push(ne(meetings.sponsorId, excludeSponsorId));
  }
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(meetings)
    .where(and(...conditions));
  
  return (result[0]?.count || 0) > 0;
}

// ─── Admin Activity Log ───────────────────────────────────────────────────────

export async function logAdminActivity(entry: InsertAdminActivityLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminActivityLog).values(entry);
}

export async function getAdminActivityLog(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(adminActivityLog)
    .orderBy(desc(adminActivityLog.createdAt))
    .limit(limit);
}

export async function getRankingsSubmissionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(rankingsSubmissions)
    .where(eq(rankingsSubmissions.id, id))
    .limit(1);
  return results[0] || null;
}

// ─── Sponsor Activity Log ────────────────────────────────────────────────────

export async function logSponsorActivity(entry: InsertSponsorActivityLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(sponsorActivityLog).values(entry);
}

export async function getSponsorActivityLog(sponsorId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(sponsorActivityLog)
    .where(eq(sponsorActivityLog.sponsorId, sponsorId))
    .orderBy(desc(sponsorActivityLog.createdAt))
    .limit(limit);
}

export async function getAllSponsorActivityLog(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: sponsorActivityLog.id,
      sponsorId: sponsorActivityLog.sponsorId,
      userId: sponsorActivityLog.userId,
      eventType: sponsorActivityLog.eventType,
      downloadType: sponsorActivityLog.downloadType,
      downloadLabel: sponsorActivityLog.downloadLabel,
      createdAt: sponsorActivityLog.createdAt,
      companyName: sponsors.companyName,
      contactName: sponsors.contactName,
    })
    .from(sponsorActivityLog)
    .leftJoin(sponsors, eq(sponsorActivityLog.sponsorId, sponsors.id))
    .orderBy(desc(sponsorActivityLog.createdAt))
    .limit(limit);
}

export async function getLastLoginBySponsor(): Promise<{ sponsorId: number; companyName: string; lastLogin: Date | null }[]> {
  const db = await getDb();
  if (!db) return [];
  // Get all sponsors with their last login event
  const allSponsors = await db.select().from(sponsors);
  const logins = await db
    .select({
      sponsorId: sponsorActivityLog.sponsorId,
      lastLogin: sql<Date>`MAX(${sponsorActivityLog.createdAt})`,
    })
    .from(sponsorActivityLog)
    .where(eq(sponsorActivityLog.eventType, 'login'))
    .groupBy(sponsorActivityLog.sponsorId);

  const loginMap = new Map(logins.map(l => [l.sponsorId, l.lastLogin]));
  return allSponsors.map(s => ({
    sponsorId: s.id,
    companyName: s.companyName,
    lastLogin: loginMap.get(s.id) ?? null,
  }));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}
