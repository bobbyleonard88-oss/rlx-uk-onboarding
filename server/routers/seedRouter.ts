/**
 * Seed Router — Admin Only
 * Populates the database with realistic dummy data for RLX UK 2026.
 * Run once after a fresh deployment to get the app into a demo-ready state.
 * Safe to re-run: checks for existing data before inserting.
 */

import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  events,
  agendaSessions,
  sponsors,
  delegateProfiles,
  users,
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// ─── Seed Data ────────────────────────────────────────────────────────────────

const EVENT_DATA = {
  name: "RLX UK 2026",
  tagline: "The UK's Premier Talent Acquisition Summit",
  venueName: "The Grove Hotel, Spa & Golf",
  venueAddress: "Chandler's Cross, Hertfordshire, WD3 4TG",
  startDate: new Date("2026-09-24T08:00:00Z"),
  endDate: new Date("2026-09-25T18:00:00Z"),
  matchWeights: JSON.stringify({
    painPoints: 0.35,
    industry: 0.20,
    companySize: 0.15,
    budget: 0.20,
    tools: 0.10,
  }),
  isActive: 1,
};

const AGENDA_SESSIONS = [
  // ── Day 1 ──────────────────────────────────────────────────────────────────
  // Meetings are free-floating 20-min slots scheduled by admin — not shown as agenda items.
  // The agenda shows fixed sessions that block time for everyone.
  { dayNumber: 1, startTime: "08:00", endTime: "09:30", title: "Arrival & Registration", sessionType: "arrival", room: "Grand Foyer", isHighlight: 0, isOptional: 0, sortOrder: 1 },
  { dayNumber: 1, startTime: "09:30", endTime: "10:15", title: "Opening Keynote: The Future of Talent Acquisition", sessionType: "keynote", room: "Ivory Suite", format: "Keynote Address", isHighlight: 1, isOptional: 0, sortOrder: 2, description: "Setting the scene for two days of high-impact conversations." },
  { dayNumber: 1, startTime: "10:15", endTime: "10:30", title: "Morning Coffee", sessionType: "break", room: "Terrace", isHighlight: 0, isOptional: 0, sortOrder: 3 },
  { dayNumber: 1, startTime: "12:45", endTime: "14:00", title: "Networking Lunch", sessionType: "meal", room: "Conservatory Restaurant", isHighlight: 0, isOptional: 0, sortOrder: 4 },
  { dayNumber: 1, startTime: "15:40", endTime: "16:00", title: "Afternoon Tea", sessionType: "break", room: "Terrace", isHighlight: 0, isOptional: 0, sortOrder: 5 },
  { dayNumber: 1, startTime: "16:00", endTime: "16:45", title: "Panel: AI in Recruitment — Hype vs Reality", sessionType: "session", room: "Ivory Suite", format: "Panel Discussion", isHighlight: 1, isOptional: 1, sortOrder: 6, description: "Four leading TA practitioners debate the real-world impact of AI tools on hiring quality and speed." },
  { dayNumber: 1, startTime: "17:15", endTime: "18:30", title: "Spa & Wellness Break", sessionType: "wellness", room: "The Spa at The Grove", isHighlight: 0, isOptional: 1, sortOrder: 7, description: "Complimentary access to the pool, steam room, and relaxation areas." },
  { dayNumber: 1, startTime: "19:00", endTime: "19:45", title: "Drinks Reception", sessionType: "social", room: "Walled Garden", isHighlight: 1, isOptional: 0, sortOrder: 8 },
  { dayNumber: 1, startTime: "19:45", endTime: "22:30", title: "Gala Dinner", sessionType: "meal", room: "The Stables", isHighlight: 1, isOptional: 0, sortOrder: 9, description: "Three-course gala dinner with awards and entertainment." },
  // ── Day 2 ──────────────────────────────────────────────────────────────────
  { dayNumber: 2, startTime: "07:30", endTime: "08:45", title: "Morning Run & Yoga", sessionType: "wellness", room: "Hotel Grounds", isHighlight: 0, isOptional: 1, sortOrder: 1, description: "Optional guided 5k run or yoga session on the lawn." },
  { dayNumber: 2, startTime: "08:00", endTime: "09:00", title: "Breakfast", sessionType: "meal", room: "Conservatory Restaurant", isHighlight: 0, isOptional: 0, sortOrder: 2 },
  { dayNumber: 2, startTime: "09:00", endTime: "09:45", title: "Keynote: Building Employer Brands That Actually Work", sessionType: "keynote", room: "Ivory Suite", format: "Keynote Address", isHighlight: 1, isOptional: 0, sortOrder: 3 },
  { dayNumber: 2, startTime: "10:50", endTime: "11:10", title: "Coffee Break", sessionType: "break", room: "Terrace", isHighlight: 0, isOptional: 0, sortOrder: 4 },
  { dayNumber: 2, startTime: "12:15", endTime: "13:30", title: "Farewell Lunch", sessionType: "meal", room: "Conservatory Restaurant", isHighlight: 0, isOptional: 0, sortOrder: 5 },
  { dayNumber: 2, startTime: "13:30", endTime: "14:15", title: "Roundtable: Diversity, Equity & Inclusion in Hiring", sessionType: "session", room: "Ivory Suite", format: "Roundtable", isHighlight: 0, isOptional: 1, sortOrder: 6, description: "Facilitated discussion on practical DEI strategies that move the needle." },
  { dayNumber: 2, startTime: "14:15", endTime: "15:00", title: "Closing Keynote & Awards", sessionType: "keynote", room: "Ivory Suite", format: "Keynote & Ceremony", isHighlight: 1, isOptional: 0, sortOrder: 7 },
  { dayNumber: 2, startTime: "15:00", endTime: "15:30", title: "Departures & Farewell", sessionType: "social", room: "Grand Foyer", isHighlight: 0, isOptional: 0, sortOrder: 8 },
];

const SPONSORS_DATA = [
  { companyName: "Workday", contactName: "Sarah Mitchell", email: "sarah.mitchell@workday-demo.rlx", tableNumber: 1, meetingCredits: 12, package: "Platinum" },
  { companyName: "LinkedIn Talent Solutions", contactName: "James Hargreaves", email: "james.hargreaves@linkedin-demo.rlx", tableNumber: 2, meetingCredits: 10, package: "Gold" },
  { companyName: "SmartRecruiters", contactName: "Priya Sharma", email: "priya.sharma@smartrecruiters-demo.rlx", tableNumber: 3, meetingCredits: 10, package: "Gold" },
  { companyName: "Beamery", contactName: "Tom Whitfield", email: "tom.whitfield@beamery-demo.rlx", tableNumber: 4, meetingCredits: 8, package: "Silver" },
  { companyName: "Eightfold AI", contactName: "Aisha Okonkwo", email: "aisha.okonkwo@eightfold-demo.rlx", tableNumber: 5, meetingCredits: 8, package: "Silver" },
  { companyName: "Greenhouse", contactName: "Marcus Chen", email: "marcus.chen@greenhouse-demo.rlx", tableNumber: 6, meetingCredits: 8, package: "Silver" },
  { companyName: "Lever (Employ Inc.)", contactName: "Natalie Brooks", email: "natalie.brooks@lever-demo.rlx", tableNumber: 7, meetingCredits: 6, package: "Bronze" },
  { companyName: "Pinpoint HQ", contactName: "David Osei", email: "david.osei@pinpoint-demo.rlx", tableNumber: 8, meetingCredits: 6, package: "Bronze" },
];

const DELEGATES_DATA = [
  { firstName: "Alexandra", lastName: "Thompson", jobTitle: "Global Head of Talent Acquisition", company: "HSBC", email: "a.thompson@hsbc-demo.rlx" },
  { firstName: "Michael", lastName: "Adeyemi", jobTitle: "VP People & Talent", company: "Revolut", email: "m.adeyemi@revolut-demo.rlx" },
  { firstName: "Charlotte", lastName: "Fairweather", jobTitle: "Director of Recruiting", company: "Arm Holdings", email: "c.fairweather@arm-demo.rlx" },
  { firstName: "Raj", lastName: "Patel", jobTitle: "Head of TA EMEA", company: "Salesforce", email: "r.patel@salesforce-demo.rlx" },
  { firstName: "Sophie", lastName: "Laurent", jobTitle: "Chief People Officer", company: "Monzo", email: "s.laurent@monzo-demo.rlx" },
  { firstName: "James", lastName: "O'Brien", jobTitle: "Senior Director, Talent", company: "Sky Group", email: "j.obrien@sky-demo.rlx" },
  { firstName: "Fatima", lastName: "Al-Hassan", jobTitle: "Head of Talent & Culture", company: "Deliveroo", email: "f.alhassan@deliveroo-demo.rlx" },
  { firstName: "Oliver", lastName: "Blackwood", jobTitle: "VP Talent Acquisition", company: "Wise", email: "o.blackwood@wise-demo.rlx" },
  { firstName: "Yuki", lastName: "Nakamura", jobTitle: "Global TA Lead", company: "Dyson", email: "y.nakamura@dyson-demo.rlx" },
  { firstName: "Emma", lastName: "Gallagher", jobTitle: "Head of Recruitment", company: "Ocado Group", email: "e.gallagher@ocado-demo.rlx" },
  { firstName: "Kwame", lastName: "Asante", jobTitle: "Director of People Operations", company: "Starling Bank", email: "k.asante@starling-demo.rlx" },
  { firstName: "Isabella", lastName: "Rossi", jobTitle: "Talent Acquisition Manager", company: "Rolls-Royce", email: "i.rossi@rolls-royce-demo.rlx" },
];

// ─── Router ───────────────────────────────────────────────────────────────────

export const seedRouter = router({
  /**
   * Check whether seed data already exists.
   */
  status: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { seeded: false, eventCount: 0, sponsorCount: 0, delegateCount: 0, sessionCount: 0 };

    const [eventCount] = await db.select({ count: sql<number>`count(*)` }).from(events);
    const [sponsorCount] = await db.select({ count: sql<number>`count(*)` }).from(sponsors);
    const [delegateCount] = await db.select({ count: sql<number>`count(*)` }).from(delegateProfiles);
    const [sessionCount] = await db.select({ count: sql<number>`count(*)` }).from(agendaSessions);

    return {
      seeded: Number(eventCount.count) > 0,
      eventCount: Number(eventCount.count),
      sponsorCount: Number(sponsorCount.count),
      delegateCount: Number(delegateCount.count),
      sessionCount: Number(sessionCount.count),
    };
  }),

  /**
   * Run the full seed. Idempotent — skips if event already exists.
   */
  run: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const log: string[] = [];

    // ── 1. Create event ──────────────────────────────────────────────────────
    const existingEvents = await db.select().from(events).limit(1);
    let eventId: number;

    if (existingEvents.length > 0) {
      eventId = existingEvents[0].id;
      log.push(`Event already exists (id=${eventId}), skipping event creation.`);
    } else {
      const result = await db.insert(events).values(EVENT_DATA);
      eventId = Number((result as any).insertId ?? 0);
      log.push(`Created event: "${EVENT_DATA.name}" (id=${eventId})`);
    }

    // ── 2. Create agenda sessions ────────────────────────────────────────────
    const existingSessions = await db
      .select({ count: sql<number>`count(*)` })
      .from(agendaSessions)
      .where(eq(agendaSessions.eventId, eventId));

    if (Number(existingSessions[0].count) > 0) {
      log.push(`Agenda sessions already exist (${existingSessions[0].count}), skipping.`);
    } else {
      for (const session of AGENDA_SESSIONS) {
        await db.insert(agendaSessions).values({
          eventId,
          dayNumber: session.dayNumber,
          startTime: session.startTime,
          endTime: session.endTime,
          title: session.title,
          sessionType: session.sessionType as any,
          room: session.room ?? null,
          format: (session as any).format ?? null,
          description: (session as any).description ?? null,
          isHighlight: session.isHighlight,
          isOptional: session.isOptional,
          sortOrder: session.sortOrder,
        });
      }
      log.push(`Created ${AGENDA_SESSIONS.length} agenda sessions.`);
    }

    // ── 3. Create sponsor users + profiles ───────────────────────────────────
    const existingSponsors = await db.select({ count: sql<number>`count(*)` }).from(sponsors);

    if (Number(existingSponsors[0].count) > 0) {
      log.push(`Sponsors already exist (${existingSponsors[0].count}), skipping.`);
    } else {
      for (let i = 0; i < SPONSORS_DATA.length; i++) {
        const s = SPONSORS_DATA[i];

        // Create a user account for the sponsor
        const userResult = await db.insert(users).values({
          openId: `seed-sponsor-${i + 1}`,
          name: s.contactName,
          email: s.email,
          role: "user",
          loginMethod: "seed",
        });
        const userId = Number((userResult as any).insertId ?? 0);

        // Create the sponsor profile
        await db.insert(sponsors).values({
          userId,
          companyName: s.companyName,
          contactName: s.contactName,
          contactEmail: s.email,
          tableNumber: s.tableNumber,
          meetingCredits: s.meetingCredits,
          creditsUsed: 0,
          eventId,
        } as any);
      }
      log.push(`Created ${SPONSORS_DATA.length} sponsor profiles.`);
    }

    // ── 4. Create delegate profiles ──────────────────────────────────────────
    const existingDelegates = await db.select({ count: sql<number>`count(*)` }).from(delegateProfiles);

    if (Number(existingDelegates[0].count) > 0) {
      log.push(`Delegates already exist (${existingDelegates[0].count}), skipping.`);
    } else {
      for (let i = 0; i < DELEGATES_DATA.length; i++) {
        const d = DELEGATES_DATA[i];

        // Create a user account for the delegate
        const userResult = await db.insert(users).values({
          openId: `seed-delegate-${i + 1}`,
          name: `${d.firstName} ${d.lastName}`,
          email: d.email,
          role: "delegate",
          loginMethod: "seed",
        });
        const userId = Number((userResult as any).insertId ?? 0);

        // Create the delegate profile
        await db.insert(delegateProfiles).values({
          userId,
          eventId,
          attendeeId: `seed-delegate-${i + 1}`,
          firstName: d.firstName,
          lastName: d.lastName,
          jobTitle: d.jobTitle,
          company: d.company,
        } as any);
      }
      log.push(`Created ${DELEGATES_DATA.length} delegate profiles.`);
    }

    return {
      success: true,
      eventId,
      log,
      summary: {
        event: EVENT_DATA.name,
        sessions: AGENDA_SESSIONS.length,
        sponsors: SPONSORS_DATA.length,
        delegates: DELEGATES_DATA.length,
      },
    };
  }),

  /**
   * Wipe all seed data (test accounts + event data only).
   * Does NOT delete real user accounts (only those with loginMethod='seed').
   */
  wipe: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Delete seed users (cascades to sponsors/delegates in application logic)
    await db.delete(users).where(eq(users.loginMethod as any, "seed"));
    await db.delete(events);
    await db.delete(agendaSessions);

    return { success: true, message: "All seed data wiped. Database is clean." };
  }),
});
