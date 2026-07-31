import { desc, eq, and, sql, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sponsors, InsertSponsor, rankingsSubmissions, InsertRankingsSubmission, vendorProfiles, InsertVendorProfile, delegateProfiles, InsertDelegateProfile, priorityTags, InsertPriorityTag, meetings, InsertMeeting, intakeSubmissions, InsertIntakeSubmission, matchCache, InsertMatchCache, adminActivityLog, InsertAdminActivityLog, sponsorActivityLog, InsertSponsorActivityLog, meetingRatingsLog, events, InsertEvent, agendaSessions, InsertAgendaSession, meetingRequests, InsertMeetingRequest, chatThreads, InsertChatThread, chatMessages, InsertChatMessage, notifications, InsertNotification, delegateSchedule, InsertDelegateSchedule } from "../drizzle/schema";
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

// Domains that should never be used for domain-based sponsor matching
const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk',
  'yahoo.com', 'yahoo.co.uk', 'icloud.com', 'me.com', 'mac.com',
  'live.com', 'live.co.uk', 'msn.com', 'protonmail.com', 'proton.me'
]);

// Sponsor helpers
// Looks up sponsor by userId first, then falls back to email domain matching.
// This allows multiple people from the same company to access the same sponsor portal
// without needing a manual userId re-link every time.
export async function getSponsorByUserId(userId: number, userEmail?: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Primary: exact userId match
  const result = await db.select().from(sponsors).where(eq(sponsors.userId, userId)).limit(1);
  if (result.length > 0) return result[0];

  // Fallback: email domain match (skip generic consumer domains)
  if (userEmail) {
    const atIndex = userEmail.lastIndexOf('@');
    if (atIndex !== -1) {
      const domain = userEmail.slice(atIndex + 1).toLowerCase();
      if (!GENERIC_EMAIL_DOMAINS.has(domain)) {
        // Find a sponsor whose contactEmail shares the same domain
        const allSponsors = await db.select().from(sponsors);
        const domainMatch = allSponsors.find(s => {
          if (!s.contactEmail) return false;
          const sAt = s.contactEmail.lastIndexOf('@');
          if (sAt === -1) return false;
          const sDomain = s.contactEmail.slice(sAt + 1).toLowerCase();
          return sDomain === domain;
        });
        if (domainMatch) {
          console.log(`[Sponsor] Domain match for ${userEmail} → ${domainMatch.companyName} (id: ${domainMatch.id})`);
          // Auto-update the sponsor's userId to this user so future lookups are instant
          await db.update(sponsors).set({ userId }).where(eq(sponsors.id, domainMatch.id));
          return { ...domainMatch, userId };
        }
      }
    }
  }

  return null;
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

export async function updateMeetingStatus(id: number, status: "suggested" | "confirmed" | "declined" | "cancelled") {
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
      meetingRating: meetings.meetingRating,
      meetingNotes: meetings.meetingNotes,
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

export async function updateAdminMeetingNotes(meetingId: number, adminNotes: string) {
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

export async function getMeetingById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateMeetingRating(meetingId: number, rating: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Update the meeting record
  await db
    .update(meetings)
    .set({ meetingRating: rating, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));
  // Write permanent audit log entry — this is never deleted
  const meeting = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  if (meeting[0]) {
    await db.insert(meetingRatingsLog).values({
      meetingId,
      sponsorId: meeting[0].sponsorId,
      attendeeId: meeting[0].attendeeId,
      rating,
      notes: meeting[0].meetingNotes ?? null,
      submittedAt: new Date(),
    });
  }
}

export async function updateMeetingNotes(meetingId: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(meetings)
    .set({ meetingNotes: notes, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));
}

export async function clearSponsorRatings(sponsorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(meetings)
    .set({ meetingRating: null, updatedAt: new Date() })
    .where(eq(meetings.sponsorId, sponsorId));
}

export async function toggleMeetingRescheduled(meetingId: number, isRescheduled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(meetings)
    .set({ isRescheduled: isRescheduled ? 1 : 0, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));
}

export async function getRescheduledMeetings() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: meetings.id,
      sponsorId: meetings.sponsorId,
      attendeeId: meetings.attendeeId,
      timeSlot: meetings.timeSlot,
      isRescheduled: meetings.isRescheduled,
    })
    .from(meetings)
    .where(eq(meetings.isRescheduled, 1));
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getAllEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(desc(events.createdAt));
}

export async function getActiveEvent() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(events).where(eq(events.isActive, 1)).limit(1);
  if (result.length > 0) return result[0];
  // Fallback: return the most recently created event
  const fallback = await db.select().from(events).orderBy(desc(events.createdAt)).limit(1);
  return fallback.length > 0 ? fallback[0] : null;
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createEvent(data: InsertEvent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(events).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function updateEvent(id: number, data: Partial<InsertEvent>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set({ ...data, updatedAt: new Date() }).where(eq(events.id, id));
}

export async function setActiveEvent(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Deactivate all events, then activate the target
  await db.update(events).set({ isActive: 0 });
  await db.update(events).set({ isActive: 1, updatedAt: new Date() }).where(eq(events.id, id));
}

// ─── Agenda Sessions ──────────────────────────────────────────────────────────

export async function getAgendaSessions(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agendaSessions)
    .where(eq(agendaSessions.eventId, eventId))
    .orderBy(agendaSessions.dayNumber, agendaSessions.sortOrder, agendaSessions.startTime);
}

export async function getAgendaSessionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agendaSessions).where(eq(agendaSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createAgendaSession(data: InsertAgendaSession): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agendaSessions).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function updateAgendaSession(id: number, data: Partial<InsertAgendaSession>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(agendaSessions).set({ ...data, updatedAt: new Date() }).where(eq(agendaSessions.id, id));
}

export async function deleteAgendaSession(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(agendaSessions).where(eq(agendaSessions.id, id));
}

// getMeetingBlockSessions removed — meetings are now free-floating 20-min slots, not tied to agenda blocks.

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  return Number(result[0]?.count ?? 0);
}

// ─── Chat Threads ─────────────────────────────────────────────────────────────

export async function createChatThread(data: InsertChatThread): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatThreads).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function getChatThreadByMeetingId(meetingId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(chatThreads).where(eq(chatThreads.meetingId, meetingId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getChatThreadsForSponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.sponsorId, sponsorId))
    .orderBy(desc(chatThreads.lastMessageAt));
}

export async function getChatThreadsForDelegate(delegateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.delegateId, delegateId))
    .orderBy(desc(chatThreads.lastMessageAt));
}

export async function getAllChatThreads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatThreads).orderBy(desc(chatThreads.lastMessageAt));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function createChatMessage(data: InsertChatMessage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values(data);
  const msgId = Number((result as any).insertId ?? 0);
  // Update thread last message info
  await db
    .update(chatThreads)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: data.body.slice(0, 255),
      updatedAt: new Date(),
    })
    .where(eq(chatThreads.id, data.threadId));
  return msgId;
}

export async function getChatMessages(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(chatMessages.createdAt);
}

export async function markMessagesRead(threadId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Mark all messages in this thread as read that were NOT sent by this user
  await db
    .update(chatMessages)
    .set({ isRead: 1 })
    .where(and(eq(chatMessages.threadId, threadId), ne(chatMessages.senderUserId, userId)));
}

// ─── Meeting Requests ─────────────────────────────────────────────────────────

export async function createMeetingRequest(data: InsertMeetingRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(meetingRequests).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function getMeetingRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(meetingRequests).where(eq(meetingRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getMeetingRequestsForSponsor(sponsorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(meetingRequests)
    .where(eq(meetingRequests.sponsorId, sponsorId))
    .orderBy(desc(meetingRequests.createdAt));
}

export async function getMeetingRequestsForDelegate(delegateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(meetingRequests)
    .where(eq(meetingRequests.delegateId, delegateId))
    .orderBy(desc(meetingRequests.createdAt));
}

export async function updateMeetingRequestStatus(
  id: number,
  status: "pending" | "accepted" | "declined" | "cancelled" | "rescheduled",
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(meetingRequests)
    .set({ status, respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(meetingRequests.id, id));
}

// ─── Delegate Schedule ────────────────────────────────────────────────────────

export async function getDelegateSchedule(delegateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(delegateSchedule).where(eq(delegateSchedule.delegateId, delegateId));
}

export async function addSessionToSchedule(delegateId: number, sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(delegateSchedule).values({ delegateId, sessionId }).onDuplicateKeyUpdate({ set: { delegateId } });
}

export async function removeSessionFromSchedule(delegateId: number, sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(delegateSchedule)
    .where(and(eq(delegateSchedule.delegateId, delegateId), eq(delegateSchedule.sessionId, sessionId)));
}
