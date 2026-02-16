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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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

export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = typeof sponsors.$inferInsert;

/**
 * Rankings submissions table - stores sponsor rankings of attendees
 */
export const rankingsSubmissions = mysqlTable("rankingsSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(), // Link to sponsors table
  userId: int("userId").notNull(), // Link to users table for who submitted
  rankingsData: text("rankingsData").notNull(), // JSON string of ranked attendee IDs
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["pending", "reviewed"]).default("pending").notNull(),
  isReviewed: int("isReviewed").default(0).notNull(), // 0 or 1, toggle for matchmaking
  isArchived: int("isArchived").default(0).notNull(), // 0 or 1, hide from main view
});

export type RankingsSubmission = typeof rankingsSubmissions.$inferSelect;
export type InsertRankingsSubmission = typeof rankingsSubmissions.$inferInsert;

/**
 * Vendor profiles table - stores vendor company profiles with solutions/offerings
 */
export const vendorProfiles = mysqlTable("vendorProfiles", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(), // Link to sponsors table
  companyName: varchar("companyName", { length: 255 }).notNull(),
  profileDocument: text("profileDocument"), // S3 URL to Word doc
  solutions: text("solutions"), // What they offer/sell
  painPoints: text("painPoints"), // Problems they solve
  targetIndustries: text("targetIndustries"), // JSON array of industries
  profileData: text("profileData"), // Full profile as JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type InsertVendorProfile = typeof vendorProfiles.$inferInsert;

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

export type DelegateProfile = typeof delegateProfiles.$inferSelect;
export type InsertDelegateProfile = typeof delegateProfiles.$inferInsert;

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

export type PriorityTag = typeof priorityTags.$inferSelect;
export type InsertPriorityTag = typeof priorityTags.$inferInsert;

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
  timeSlot: int("timeSlot"), // 1-12 (2 slots per hour across 3 time blocks)
  status: mysqlEnum("status", ["suggested", "confirmed", "declined"]).default("suggested").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

/**
 * Intake form submissions table - stores sponsor intake form data
 */
export const intakeSubmissions = mysqlTable("intakeSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(), // Link to sponsors table
  userId: int("userId").notNull(), // Link to users table
  
  // Company Information
  companyName: varchar("companyName", { length: 255 }).notNull(),
  technologyType: varchar("technologyType", { length: 255 }).notNull(),
  companyLogoUrl: text("companyLogoUrl"), // S3 URL
  companyBoilerplate: text("companyBoilerplate").notNull(),
  keyChallenges: text("keyChallenges").notNull(),
  targetOrgSize: varchar("targetOrgSize", { length: 255 }).notNull(),
  
  // Primary Representative
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 255 }).notNull(),
  linkedinUrl: text("linkedinUrl").notNull(),
  
  // Second Representative (optional)
  secondRepName: varchar("secondRepName", { length: 255 }),
  secondRepEmail: varchar("secondRepEmail", { length: 320 }),
  secondRepJobTitle: varchar("secondRepJobTitle", { length: 255 }),
  secondRepLinkedinUrl: text("secondRepLinkedinUrl"),
  
  // Metadata
  meetingPackage: mysqlEnum("meetingPackage", ["12", "20"]).default("12").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntakeSubmission = typeof intakeSubmissions.$inferSelect;
export type InsertIntakeSubmission = typeof intakeSubmissions.$inferInsert;