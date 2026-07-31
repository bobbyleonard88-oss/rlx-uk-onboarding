/**
 * Event & Agenda Router
 * Admin-only procedures for managing the event configuration and agenda sessions.
 */

import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

const sessionTypeEnum = z.enum([
  "arrival",
  "keynote",
  "session",
  "meal",
  "break",
  "social",
  "wellness",
]);

export const eventRouter = router({
  // ─── Event Settings ────────────────────────────────────────────────────────

  /** Get the active event (or the most recently created one). */
  getActive: publicProcedure.query(async () => {
    return await db.getActiveEvent();
  }),

  /** Get all events (admin only). */
  getAll: adminProcedure.query(async () => {
    return await db.getAllEvents();
  }),

  /** Create a new event. */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        tagline: z.string().optional(),
        venueName: z.string().optional(),
        venueAddress: z.string().optional(),
        startDate: z.string(), // ISO date string
        endDate: z.string(),
        matchWeights: z.string().optional(), // JSON string
        isActive: z.boolean().optional().default(false),
        minMeetings: z.number().optional().default(8),
        meetingDurationMins: z.number().optional().default(20),
        meetingBufferMins: z.number().optional().default(15),
        sponsorRequestsEnabled: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createEvent({
        name: input.name,
        tagline: input.tagline ?? null,
        venueName: input.venueName ?? null,
        venueAddress: input.venueAddress ?? null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        matchWeights: input.matchWeights ?? null,
        isActive: input.isActive ? 1 : 0,
        minMeetings: input.minMeetings ?? 8,
        meetingDurationMins: input.meetingDurationMins ?? 20,
        meetingBufferMins: input.meetingBufferMins ?? 15,
        sponsorRequestsEnabled: input.sponsorRequestsEnabled ? 1 : 0,
      });
      return { success: true, id };
    }),

  /** Update an existing event. */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        tagline: z.string().optional(),
        venueName: z.string().optional(),
        venueAddress: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        matchWeights: z.string().optional(),
        isActive: z.boolean().optional(),
        minMeetings: z.number().optional(),
        meetingDurationMins: z.number().optional(),
        meetingBufferMins: z.number().optional(),
        sponsorRequestsEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db.updateEvent(id, {
        ...(rest.name !== undefined && { name: rest.name }),
        ...(rest.tagline !== undefined && { tagline: rest.tagline }),
        ...(rest.venueName !== undefined && { venueName: rest.venueName }),
        ...(rest.venueAddress !== undefined && { venueAddress: rest.venueAddress }),
        ...(rest.startDate !== undefined && { startDate: new Date(rest.startDate) }),
        ...(rest.endDate !== undefined && { endDate: new Date(rest.endDate) }),
        ...(rest.matchWeights !== undefined && { matchWeights: rest.matchWeights }),
        ...(rest.isActive !== undefined && { isActive: rest.isActive ? 1 : 0 }),
        ...(rest.minMeetings !== undefined && { minMeetings: rest.minMeetings }),
        ...(rest.meetingDurationMins !== undefined && { meetingDurationMins: rest.meetingDurationMins }),
        ...(rest.meetingBufferMins !== undefined && { meetingBufferMins: rest.meetingBufferMins }),
        ...(rest.sponsorRequestsEnabled !== undefined && { sponsorRequestsEnabled: rest.sponsorRequestsEnabled ? 1 : 0 }),
      });
      return { success: true };
    }),

  /** Set a specific event as the active one (deactivates all others). */
  setActive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.setActiveEvent(input.id);
      return { success: true };
    }),

  // ─── Agenda Sessions ───────────────────────────────────────────────────────

  /** Get all sessions for an event. */
  getSessions: publicProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .query(async ({ input }) => {
      const eventId = input.eventId ?? (await db.getActiveEvent())?.id;
      if (!eventId) return [];
      return await db.getAgendaSessions(eventId);
    }),

  /** Create a new agenda session. */
  createSession: adminProcedure
    .input(
      z.object({
        eventId: z.number(),
        dayNumber: z.number().min(1),
        startTime: z.string(),
        endTime: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        room: z.string().optional(),
        format: z.string().optional(),
        sessionType: sessionTypeEnum,
        isOptional: z.boolean().optional().default(false),
        isHighlight: z.boolean().optional().default(false),
        sortOrder: z.number().optional().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createAgendaSession({
        eventId: input.eventId,
        dayNumber: input.dayNumber,
        startTime: input.startTime,
        endTime: input.endTime,
        title: input.title,
        description: input.description ?? null,
        room: input.room ?? null,
        format: input.format ?? null,
        sessionType: input.sessionType,
        isOptional: input.isOptional ? 1 : 0,
        isHighlight: input.isHighlight ? 1 : 0,
        sortOrder: input.sortOrder ?? 0,
      });
      return { success: true, id };
    }),

  /** Update an existing agenda session. */
  updateSession: adminProcedure
    .input(
      z.object({
        id: z.number(),
        dayNumber: z.number().min(1).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        room: z.string().optional().nullable(),
        format: z.string().optional().nullable(),
        sessionType: sessionTypeEnum.optional(),
        isOptional: z.boolean().optional(),
        isHighlight: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db.updateAgendaSession(id, {
        ...(rest.dayNumber !== undefined && { dayNumber: rest.dayNumber }),
        ...(rest.startTime !== undefined && { startTime: rest.startTime }),
        ...(rest.endTime !== undefined && { endTime: rest.endTime }),
        ...(rest.title !== undefined && { title: rest.title }),
        ...(rest.description !== undefined && { description: rest.description }),
        ...(rest.room !== undefined && { room: rest.room }),
        ...(rest.format !== undefined && { format: rest.format }),
        ...(rest.sessionType !== undefined && { sessionType: rest.sessionType }),
        ...(rest.isOptional !== undefined && { isOptional: rest.isOptional ? 1 : 0 }),
        ...(rest.isHighlight !== undefined && { isHighlight: rest.isHighlight ? 1 : 0 }),
        ...(rest.sortOrder !== undefined && { sortOrder: rest.sortOrder }),
      });
      return { success: true };
    }),

  /** Delete an agenda session. */
  deleteSession: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAgendaSession(input.id);
      return { success: true };
    }),

  /** Reorder sessions (batch update sortOrder). */
  reorderSessions: adminProcedure
    .input(
      z.object({
        sessions: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
      })
    )
    .mutation(async ({ input }) => {
      for (const s of input.sessions) {
        await db.updateAgendaSession(s.id, { sortOrder: s.sortOrder });
      }
      return { success: true };
    }),
});
