import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
    /**
     * Surrogate primary key. Auto-incremented numeric value managed by the database.
     * Use this for relations between tables.
     */
    id: int("id").autoincrement().primaryKey(),
    /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
/**
 * Sponsors table - stores sponsor company information
 */
export const sponsors = mysqlTable("sponsors", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(), // Link to users table
    companyName: varchar("companyName", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 255 }).notNull(),
    contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Rankings submissions table - stores sponsor rankings of attendees
 */
export const rankingsSubmissions = mysqlTable("rankingsSubmissions", {
    id: int("id").autoincrement().primaryKey(),
    sponsorId: int("sponsorId").notNull(), // Link to sponsors table
    userId: int("userId").notNull(), // Link to users table for who submitted
    rankingsData: text("rankingsData").notNull(), // JSON string of ranked attendee IDs
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    status: mysqlEnum("status", ["pending", "reviewed", "processed"]).default("pending").notNull(),
});
/**
 * Vendor profiles table - stores vendor company profiles with solutions/offerings
 */
export const vendorProfiles = mysqlTable("vendorProfiles", {
    id: int("id").autoincrement().primaryKey(),
    sponsorId: int("sponsorId").notNull(), // Link to sponsors table
    companyName: varchar("companyName", { length: 255 }).notNull(),
    solutions: text("solutions"), // What they offer/sell
    painPoints: text("painPoints"), // Problems they solve
    targetIndustries: text("targetIndustries"), // JSON array of industries
    profileData: text("profileData"), // Full profile as JSON
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Delegate profiles table - stores delegate information and needs
 */
export const delegateProfiles = mysqlTable("delegateProfiles", {
    id: int("id").autoincrement().primaryKey(),
    attendeeId: varchar("attendeeId", { length: 64 }).notNull().unique(), // Links to frontend attendee data
    firstName: varchar("firstName", { length: 255 }).notNull(),
    lastName: varchar("lastName", { length: 255 }).notNull(),
    company: varchar("company", { length: 255 }).notNull(),
    jobTitle: varchar("jobTitle", { length: 255 }),
    industry: varchar("industry", { length: 255 }),
    challenges: text("challenges"), // Their pain points/needs
    interests: text("interests"), // What they're looking for
    profileData: text("profileData"), // Full profile as JSON
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Priority tags table - manual tags for must-meet delegates
 */
export const priorityTags = mysqlTable("priorityTags", {
    id: int("id").autoincrement().primaryKey(),
    sponsorId: int("sponsorId").notNull(),
    attendeeId: varchar("attendeeId", { length: 64 }).notNull(),
    note: text("note"), // Why this is a priority
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Meetings table - stores scheduled meetings
 */
export const meetings = mysqlTable("meetings", {
    id: int("id").autoincrement().primaryKey(),
    sponsorId: int("sponsorId").notNull(),
    attendeeId: varchar("attendeeId", { length: 64 }).notNull(),
    matchScore: int("matchScore"), // 0-100 AI confidence score
    isTopRanked: int("isTopRanked").default(0), // 1 if in vendor's top 12
    isPriority: int("isPriority").default(0), // 1 if manually tagged
    status: mysqlEnum("status", ["suggested", "confirmed", "declined"]).default("suggested").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
