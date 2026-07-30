import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  uniqueIndex,
  boolean,
  decimal,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Core user table backing auth flow.
 * Role now includes 'delegate' in addition to 'user' (sponsor) and 'admin'.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "delegate"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * Events table — one row per event. The admin configures the event entirely
 * from the UI. All other tables reference the active event.
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  tagline: varchar("tagline", { length: 512 }),
  venueName: varchar("venueName", { length: 255 }),
  venueAddress: text("venueAddress"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  // Matching algorithm weight configuration (JSON object)
  matchWeights: text("matchWeights"),
  // Whether the event is live (visible to sponsors/delegates)
  isActive: int("isActive").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Agenda Sessions ──────────────────────────────────────────────────────────

/**
 * agendaSessions — the full event programme. Admin pre-loads all sessions.
 * Delegates can add optional sessions to their personal schedule.
 * Meeting time slots are also represented here as sessions of type 'meeting_block'.
 */
export const agendaSessions = mysqlTable("agendaSessions", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  dayNumber: int("dayNumber").notNull(), // 1, 2, 3 etc.
  startTime: varchar("startTime", { length: 10 }).notNull(), // e.g. "10:15"
  endTime: varchar("endTime", { length: 10 }).notNull(),     // e.g. "10:45"
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  room: varchar("room", { length: 255 }),
  format: varchar("format", { length: 255 }), // e.g. "Panel Discussion"
  sessionType: mysqlEnum("sessionType", [
    "arrival",
    "keynote",
    "session",
    "meeting_block",
    "meal",
    "break",
    "social",
    "wellness",
  ]).notNull(),
  // Whether delegates can optionally add this session to their schedule
  isOptional: int("isOptional").default(0).notNull(),
  // Whether this session is highlighted (e.g. gala dinner)
  isHighlight: int("isHighlight").default(0).notNull(),
  // Slot number within the day for meeting_block sessions (1, 2, 3...)
  meetingSlotNumber: int("meetingSlotNumber"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgendaSession = typeof agendaSessions.$inferSelect;
export type InsertAgendaSession = typeof agendaSessions.$inferInsert;

// ─── Sponsors ─────────────────────────────────────────────────────────────────

/**
 * Sponsors table — stores sponsor company information.
 * Now includes credit allowance and table assignment.
 */
export const sponsors = mysqlTable("sponsors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventId: int("eventId"),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  // Meeting credits purchased (set by admin to match package)
  meetingCredits: int("meetingCredits").default(12).notNull(),
  // Credits consumed by confirmed meetings (derived, but cached for performance)
  creditsUsed: int("creditsUsed").default(0).notNull(),
  // Fixed table number assigned by admin
  tableNumber: int("tableNumber"),
  // Company logo URL (S3)
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = typeof sponsors.$inferInsert;

// ─── Delegates ────────────────────────────────────────────────────────────────

/**
 * Delegate profiles — stores all delegate information.
 * Delegates now have a userId for direct login access.
 */
export const delegateProfiles = mysqlTable("delegateProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),                                       // Linked user account (nullable until they log in)
  eventId: int("eventId"),
  attendeeId: varchar("attendeeId", { length: 64 }).notNull().unique(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  // HubSpot / intake fields
  totalOrgEmployees: varchar("totalOrgEmployees", { length: 255 }),
  hiresPerYear: varchar("hiresPerYear", { length: 255 }),
  decisionMakingLevel: varchar("decisionMakingLevel", { length: 255 }),
  activeConfirmedProjects: text("activeConfirmedProjects"),
  activeProjectBudget: varchar("activeProjectBudget", { length: 255 }),
  primaryMeetingObjective: text("primaryMeetingObjective"),
  contractSignoff: varchar("contractSignoff", { length: 255 }),
  toolsAssessments: text("toolsAssessments"),
  toolsATS: text("toolsATS"),
  toolsCRM: text("toolsCRM"),
  toolsTalentIntelligence: text("toolsTalentIntelligence"),
  toolsOther: text("toolsOther"),
  keySolutionAreas: text("keySolutionAreas"),
  currentPainPoints: text("currentPainPoints"),
  currentProjectStage: varchar("currentProjectStage", { length: 255 }),
  challenges: text("challenges"),
  interests: text("interests"),
  profileData: text("profileData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DelegateProfile = typeof delegateProfiles.$inferSelect;
export type InsertDelegateProfile = typeof delegateProfiles.$inferInsert;

// ─── Delegate Personal Schedule ───────────────────────────────────────────────

/**
 * Tracks which optional sessions a delegate has added to their personal schedule.
 */
export const delegateSchedule = mysqlTable("delegateSchedule", {
  id: int("id").autoincrement().primaryKey(),
  delegateId: int("delegateId").notNull(),
  sessionId: int("sessionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  unique: uniqueIndex("delegate_session_unique").on(table.delegateId, table.sessionId),
}));

export type DelegateSchedule = typeof delegateSchedule.$inferSelect;
export type InsertDelegateSchedule = typeof delegateSchedule.$inferInsert;

// ─── Meetings ─────────────────────────────────────────────────────────────────

/**
 * Meetings table — stores all confirmed and pending meetings.
 * Meetings are now linked to agendaSessions (meeting_block slots).
 */
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId"),
  sponsorId: int("sponsorId").notNull(),
  delegateId: int("delegateId"),                    // FK to delegateProfiles.id (nullable for legacy meetings)
  attendeeId: varchar("attendeeId", { length: 64 }).notNull(), // legacy string ID
  sessionId: int("sessionId"),                     // FK to agendaSessions (meeting_block)
  timeSlot: int("timeSlot"),                       // Legacy slot number (1-12)
  // Match data
  matchScore: int("matchScore"),
  matchReason: text("matchReason"),
  isTopRanked: int("isTopRanked").default(0),
  isPriority: int("isPriority").default(0),
  // Status lifecycle: suggested → confirmed → (declined | cancelled)
  status: mysqlEnum("status", [
    "suggested",
    "confirmed",
    "declined",
    "cancelled",
  ]).default("suggested").notNull(),
  // Who requested this meeting
  requestedBy: mysqlEnum("requestedBy", ["admin", "sponsor", "delegate"]).default("admin"),
  // Table assignment
  tableNumber: int("tableNumber"),
  meetingLocation: text("meetingLocation"),        // Override note if not at official table
  // Sponsor rep assignment (for 20-meeting packages)
  attendeeNumber: int("attendeeNumber").default(1),
  sponsorRepName: varchar("sponsorRepName", { length: 255 }),
  // Visibility
  isVisible: int("isVisible").default(1).notNull(),
  // Notes
  notes: text("notes"),
  adminNotes: text("adminNotes"),
  // Post-event rating (1-5)
  meetingRating: int("meetingRating"),
  meetingNotes: text("meetingNotes"),
  // Rescheduled flag (shows gold star on public table plan)
  isRescheduled: int("isRescheduled").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

// ─── Meeting Requests ─────────────────────────────────────────────────────────

/**
 * Meeting requests — the pending request queue before a meeting is confirmed.
 * Either party can request; the other must accept.
 */
export const meetingRequests = mysqlTable("meetingRequests", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId"),
  sponsorId: int("sponsorId").notNull(),
  delegateId: int("delegateId").notNull(),
  // Proposed time slot (session ID for a meeting_block)
  proposedSessionId: int("proposedSessionId"),
  proposedTimeSlot: int("proposedTimeSlot"),
  // Who sent the request
  requestedBy: mysqlEnum("requestedBy", ["sponsor", "delegate"]).notNull(),
  // Status lifecycle
  status: mysqlEnum("status", [
    "pending",
    "accepted",
    "declined",
    "cancelled",
    "rescheduled",
  ]).default("pending").notNull(),
  // If this is a reschedule, link to the original meeting
  originalMeetingId: int("originalMeetingId"),
  // Optional message from the requester
  message: text("message"),
  // Admin notes
  adminNotes: text("adminNotes"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetingRequest = typeof meetingRequests.$inferSelect;
export type InsertMeetingRequest = typeof meetingRequests.$inferInsert;

// ─── Chat Threads ─────────────────────────────────────────────────────────────

/**
 * Chat threads — one thread per confirmed meeting between a sponsor and delegate.
 * Threads are created automatically when a meeting is confirmed.
 */
export const chatThreads = mysqlTable("chatThreads", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  sponsorId: int("sponsorId").notNull(),
  delegateId: int("delegateId").notNull(),
  // Last message preview for inbox display
  lastMessageAt: timestamp("lastMessageAt"),
  lastMessagePreview: varchar("lastMessagePreview", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatThread = typeof chatThreads.$inferSelect;
export type InsertChatThread = typeof chatThreads.$inferInsert;

// ─── Chat Messages ────────────────────────────────────────────────────────────

/**
 * Individual messages within a chat thread.
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  senderUserId: int("senderUserId").notNull(),
  senderRole: mysqlEnum("senderRole", ["sponsor", "delegate", "admin"]).notNull(),
  body: text("body").notNull(),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────

/**
 * In-app notifications for both sponsors and delegates.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "meeting_request",
    "meeting_confirmed",
    "meeting_declined",
    "meeting_cancelled",
    "meeting_rescheduled",
    "new_message",
    "rating_reminder",
    "system",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  // Link to the relevant entity
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Rankings Submissions ─────────────────────────────────────────────────────

export const rankingsSubmissions = mysqlTable("rankingsSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(),
  userId: int("userId").notNull(),
  rankingsData: text("rankingsData").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["pending", "reviewed"]).default("pending").notNull(),
  isReviewed: int("isReviewed").default(0).notNull(),
  isArchived: int("isArchived").default(0).notNull(),
  reviewedBy: varchar("reviewedBy", { length: 255 }),
  reviewedAt: timestamp("reviewedAt"),
});

export type RankingsSubmission = typeof rankingsSubmissions.$inferSelect;
export type InsertRankingsSubmission = typeof rankingsSubmissions.$inferInsert;

// ─── Vendor Profiles ──────────────────────────────────────────────────────────

export const vendorProfiles = mysqlTable("vendorProfiles", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  profileDocument: text("profileDocument"),
  solutions: text("solutions"),
  painPoints: text("painPoints"),
  targetIndustries: text("targetIndustries"),
  profileData: text("profileData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type InsertVendorProfile = typeof vendorProfiles.$inferInsert;

// ─── Priority Tags ────────────────────────────────────────────────────────────

export const priorityTags = mysqlTable("priorityTags", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(),
  attendeeId: varchar("attendeeId", { length: 64 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriorityTag = typeof priorityTags.$inferSelect;
export type InsertPriorityTag = typeof priorityTags.$inferInsert;

// ─── Intake Submissions ───────────────────────────────────────────────────────

export const intakeSubmissions = mysqlTable("intakeSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(),
  userId: int("userId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  technologyType: varchar("technologyType", { length: 255 }).notNull(),
  companyLogoUrl: text("companyLogoUrl"),
  companyBoilerplate: text("companyBoilerplate").notNull(),
  keyChallenges: text("keyChallenges").notNull(),
  targetOrgSize: varchar("targetOrgSize", { length: 255 }).notNull(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 255 }).notNull(),
  linkedinUrl: text("linkedinUrl").notNull(),
  secondRepName: varchar("secondRepName", { length: 255 }),
  secondRepEmail: varchar("secondRepEmail", { length: 320 }),
  secondRepJobTitle: varchar("secondRepJobTitle", { length: 255 }),
  secondRepLinkedinUrl: text("secondRepLinkedinUrl"),
  meetingPackage: mysqlEnum("meetingPackage", ["12", "20"]).default("12").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntakeSubmission = typeof intakeSubmissions.$inferSelect;
export type InsertIntakeSubmission = typeof intakeSubmissions.$inferInsert;

// ─── Match Cache ──────────────────────────────────────────────────────────────

export const matchCache = mysqlTable("matchCache", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(),
  attendeeId: varchar("attendeeId", { length: 64 }).notNull(),
  matchScore: int("matchScore").notNull(),
  matchReason: text("matchReason").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sponsorAttendeeUnique: uniqueIndex("sponsor_attendee_unique").on(table.sponsorId, table.attendeeId),
}));

export type MatchCache = typeof matchCache.$inferSelect;
export type InsertMatchCache = typeof matchCache.$inferInsert;

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const adminActivityLog = mysqlTable("adminActivityLog", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  adminName: varchar("adminName", { length: 255 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }),
  entityName: varchar("entityName", { length: 255 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminActivityLog = typeof adminActivityLog.$inferSelect;
export type InsertAdminActivityLog = typeof adminActivityLog.$inferInsert;

export const sponsorActivityLog = mysqlTable("sponsorActivityLog", {
  id: int("id").autoincrement().primaryKey(),
  sponsorId: int("sponsorId").notNull(),
  userId: int("userId").notNull(),
  eventType: mysqlEnum("eventType", ["login", "download"]).notNull(),
  downloadType: varchar("downloadType", { length: 128 }),
  downloadLabel: varchar("downloadLabel", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SponsorActivityLog = typeof sponsorActivityLog.$inferSelect;
export type InsertSponsorActivityLog = typeof sponsorActivityLog.$inferInsert;

// ─── Meeting Ratings Log ──────────────────────────────────────────────────────

export const meetingRatingsLog = mysqlTable("meetingRatingsLog", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  sponsorId: int("sponsorId").notNull(),
  attendeeId: varchar("attendeeId", { length: 64 }).notNull(),
  rating: int("rating").notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type MeetingRatingsLog = typeof meetingRatingsLog.$inferSelect;
export type InsertMeetingRatingsLog = typeof meetingRatingsLog.$inferInsert;
