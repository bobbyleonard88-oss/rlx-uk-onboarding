import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sponsors, InsertSponsor, rankingsSubmissions, InsertRankingsSubmission, vendorProfiles, InsertVendorProfile, delegateProfiles, InsertDelegateProfile, priorityTags, InsertPriorityTag, meetings, InsertMeeting } from "../drizzle/schema";
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
  if (!db) return undefined;
  
  const result = await db.select().from(sponsors).where(eq(sponsors.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertSponsor(sponsor: InsertSponsor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSponsorByUserId(sponsor.userId);
  
  if (existing) {
    await db.update(sponsors)
      .set({
        companyName: sponsor.companyName,
        contactName: sponsor.contactName,
        contactEmail: sponsor.contactEmail,
        updatedAt: new Date(),
      })
      .where(eq(sponsors.userId, sponsor.userId));
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
  
  return await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.createdAt));
}

export async function updateMeetingStatus(id: number, status: "suggested" | "confirmed" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(meetings)
    .set({ status, updatedAt: new Date() })
    .where(eq(meetings.id, id));
}

export async function deleteMeeting(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(meetings).where(eq(meetings.id, id));
}

export async function updateRankingsSubmissionStatus(id: number, status: "pending" | "reviewed" | "processed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(rankingsSubmissions)
    .set({ status })
    .where(eq(rankingsSubmissions.id, id));
}
