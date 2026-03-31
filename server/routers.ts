import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./emailNotification";
import { notifyIntakeSubmission, notifyRankingsSubmission } from "./_core/emailNotification";
import { ENV } from "./_core/env";
import { generateAllMatches, saveMatches } from "./matchingEngine";
import { attendees } from "./attendees";


export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Sponsor router
  sponsor: router({
    // Get or create sponsor profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
    }),
    
    // Update sponsor profile
    updateProfile: protectedProcedure
      .input(z.object({
        companyName: z.string().min(1),
        contactName: z.string().min(1),
        contactEmail: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const sponsorId = await db.upsertSponsor({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true, sponsorId };
      }),
    
    // Get submission stats for the progress indicator shown to sponsors
    getSubmissionStats: publicProcedure.query(async () => {
      // Exclude test/inactive sponsor accounts from participation stats
      const EXCLUDED_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001, 270001, 510003]);
      const allIntake = await db.getAllIntakeSubmissions();
      const allRankings = await db.getAllRankingsSubmissions();
      // Total active sponsors (excluding test/inactive)
      const allSponsors = await db.getAllSponsors();
      const activeSponsors = allSponsors.filter((s: any) => !EXCLUDED_SPONSOR_IDS.has(s.id));
      const activeSponsorIds = new Set(activeSponsors.map((s: any) => s.id));
      // Count unique active sponsors who have submitted intake
      const intakeCount = new Set(
        allIntake.filter((s: any) => activeSponsorIds.has(s.sponsorId)).map((s: any) => s.sponsorId)
      ).size;
      // Count unique active sponsors who have submitted rankings
      const rankingsCount = new Set(
        allRankings.filter((s: any) => activeSponsorIds.has(s.sponsorId)).map((s: any) => s.sponsorId)
      ).size;
      const totalSponsors = activeSponsors.length;
      return { intakeCount, rankingsCount, totalSponsors };
    }),

    // Get sponsor's own meetings
    getMyMeetings: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
      if (!sponsor) return [];
      const allMeetings = await db.getMeetingsBySponsor(sponsor.id);
      // Only return meetings that are visible (published to sponsor AND not hidden by admin)
      // Accept both 'suggested' and 'confirmed' status — all published meetings should be visible
      const confirmed = allMeetings.filter(m => (m.status === 'confirmed' || m.status === 'suggested') && m.isVisible === 1);
      const sponsorNameLower = (sponsor.companyName ?? '').toLowerCase();
      return confirmed.map(m => {
        const delegate = attendees.find(a => a.id === m.attendeeId);
        const hasDelegateOptIn = (delegate?.optInSponsors ?? []).some((s: string) =>
          s.toLowerCase().includes(sponsorNameLower) || sponsorNameLower.includes(s.toLowerCase())
        );
        return {
          ...m,
          meetingRating: m.meetingRating ?? null,
          meetingNotes: m.meetingNotes ?? null,
          hasDelegateOptIn,
          // Full delegate profile fields for meeting schedule display
          delegateProfile: delegate ? {
            firstName: delegate.firstName,
            lastName: delegate.lastName,
            jobTitle: delegate.jobTitle,
            company: delegate.company,
            companySize: delegate.companySize,
            industry: delegate.industry,
            teamSize: delegate.teamSize,
            budgetAuthority: delegate.budgetAuthority,
            assessmentTool: delegate.assessmentTool,
            ats: delegate.ats,
            crm: delegate.crm,
            marketIntelligence: delegate.marketIntelligence,
            otherTools: delegate.otherTools,
            activeConfirmedProjects: delegate.activeConfirmedProjects ?? null,
            activeBudgetRange: delegate.activeBudgetRange ?? null,
            primaryMeetingObjective: delegate.primaryMeetingObjective ?? null,
            contractSignOff: delegate.contractSignOff ?? null,
            keySolutionAreasOfInterest: delegate.keySolutionAreasOfInterest ?? null,
            currentPainPoints: delegate.currentPainPoints ?? null,
            currentProjectStage: delegate.currentProjectStage ?? null,
            regionalRemit: delegate.regionalRemit ?? null,
          } : null,
        };
      });
    }),
    // Get sponsor's own intake (for attendee names on meeting schedule)
    getMyIntake: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
      if (!sponsor) return null;
      return await db.getIntakeSubmissionBySponsor(sponsor.id);
    }),

    // Get delegate list for sponsor-facing pages (limited fields — no budgets, pain points, or opt-in lists)
    getDelegates: protectedProcedure.query(async () => {
      return attendees.map(a => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        jobTitle: a.jobTitle,
        company: a.company,
        companySize: a.companySize,
        industry: a.industry,
        teamSize: a.teamSize,
        regionalRemit: a.regionalRemit ?? null,
      }));
    }),

    // Track sponsor activity (login or download)
    trackActivity: protectedProcedure
      .input(z.object({
        eventType: z.enum(['login', 'download']),
        downloadType: z.string().optional(),
        downloadLabel: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
        if (!sponsor) return { success: false };
        await db.logSponsorActivity({
          sponsorId: sponsor.id,
          userId: ctx.user.id,
          eventType: input.eventType,
          downloadType: input.downloadType ?? null,
          downloadLabel: input.downloadLabel ?? null,
        });
        return { success: true };
      }),
  }),

  // Intake form router
  intake: router({    
    // Get user's intake submission
    getSubmission: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
      if (!sponsor) return null;
      return await db.getIntakeSubmissionBySponsor(sponsor.id);
    }),
    
    // Submit intake form
    submit: protectedProcedure
      .input(z.object({
        companyName: z.string(),
        technologyType: z.string(),
        companyLogoUrl: z.string().optional(),
        companyBoilerplate: z.string(),
        keyChallenges: z.string(),
        targetOrgSize: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        jobTitle: z.string(),
        linkedinUrl: z.string(),
        meetingPackage: z.enum(["12", "20"]),
        secondRepName: z.string().optional(),
        secondRepEmail: z.string().email().optional().or(z.literal("")),
        secondRepJobTitle: z.string().optional(),
        secondRepLinkedinUrl: z.string().optional().or(z.literal("")),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get or create sponsor
        const sponsorId = await db.upsertSponsor({
          userId: ctx.user.id,
          companyName: input.companyName,
          contactName: `${input.firstName} ${input.lastName}`,
          contactEmail: input.email,
        });
        
        // Create or update intake submission
        const submissionId = await db.upsertIntakeSubmission({
          sponsorId,
          userId: ctx.user.id,
          companyName: input.companyName,
          technologyType: input.technologyType,
          companyBoilerplate: input.companyBoilerplate,
          keyChallenges: input.keyChallenges,
          targetOrgSize: input.targetOrgSize,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          jobTitle: input.jobTitle,
          linkedinUrl: input.linkedinUrl,
          meetingPackage: input.meetingPackage,
          companyLogoUrl: input.companyLogoUrl || null,
          secondRepName: input.secondRepName || null,
          secondRepEmail: input.secondRepEmail || null,
          secondRepJobTitle: input.secondRepJobTitle || null,
          secondRepLinkedinUrl: input.secondRepLinkedinUrl || null,
        });
        
        // Send email notification to admin team
        const dashboardUrl = `${ENV.isProduction ? 'https' : 'http'}://${ctx.req.headers.host || 'localhost:3000'}/dashboard`;
        await notifyIntakeSubmission(
          input.companyName,
          sponsorId,
          dashboardUrl
        ).catch(err => console.error('Failed to send intake notification:', err));
        
        return { success: true, submissionId };
      }),
  }),

  // Rankings router
  rankings: router({
    // Get user's previous rankings submission
    myRankingsSubmission: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
      if (!sponsor) return null;
      const submissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
      return submissions.length > 0 ? submissions[0] : null;
    }),
    // Submit rankings
    submit: protectedProcedure
      .input(z.object({
        rankingsData: z.string(), // JSON string of ranked attendee IDs
      }))
      .mutation(async ({ ctx, input }) => {
        // Get or create sponsor (using minimal info from user profile)
        let sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
        if (!sponsor) {
          // Create a basic sponsor record if it doesn't exist
          const sponsorId = await db.upsertSponsor({
            userId: ctx.user.id,
            companyName: ctx.user.name || "Unknown Company",
            contactName: ctx.user.name || "Unknown Contact",
            contactEmail: ctx.user.email || "unknown@example.com",
          });
          sponsor = await db.getSponsorById(sponsorId);
          if (!sponsor) {
            throw new Error("Failed to create sponsor record");
          }
        }

        // Upsert submission — overwrites any existing row for this sponsor
        const submissionId = await db.upsertRankingsSubmission({
          sponsorId: sponsor.id,
          userId: ctx.user.id,
          rankingsData: input.rankingsData,
        });

        // Send email notification to admin team
        const dashboardUrl = `${ENV.isProduction ? 'https' : 'http'}://${ctx.req.headers.host || 'localhost:3000'}/dashboard`;
        await notifyRankingsSubmission(
          sponsor.companyName,
          sponsor.id,
          dashboardUrl
        ).catch(err => console.error('Failed to send rankings notification:', err));

        return { success: true, submissionId };
      }),

    // Get user's own submissions
    mySubmissions: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
      if (!sponsor) return [];
      return await db.getRankingsSubmissionsBySponsor(sponsor.id);
    }),
    
    // Get user's latest rankings (for pre-populating form)
    getLatestRankings: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
      if (!sponsor) return null;
      const submissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
      // Return the most recent submission
      return submissions.length > 0 ? submissions[0] : null;
    }),

    // Rate a meeting (1-5 stars) — sponsor only
    rateMeeting: protectedProcedure
      .input(z.object({ meetingId: z.number(), rating: z.number().min(1).max(5) }))
      .mutation(async ({ ctx, input }) => {
        const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
        if (!sponsor) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No sponsor account found' });
        // Verify the meeting belongs to this sponsor
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting || meeting.sponsorId !== sponsor.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Meeting not found or access denied' });
        }
        await db.updateMeetingRating(input.meetingId, input.rating);
        return { success: true };
      }),

    // Save notes for a meeting — sponsor only
    saveMeetingNote: protectedProcedure
      .input(z.object({ meetingId: z.number(), notes: z.string().max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const sponsor = await db.getSponsorByUserId(ctx.user.id, ctx.user.email ?? undefined);
        if (!sponsor) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No sponsor account found' });
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting || meeting.sponsorId !== sponsor.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Meeting not found or access denied' });
        }
        await db.updateMeetingNotes(input.meetingId, input.notes);
        return { success: true };
      }),
  }),

  // Public router — no auth required
  public: router({
    // Public floor plan — all meetings grouped by time slot, no login needed
    // Rescheduled status is now managed via the admin back office (isRescheduled DB column)
    getFloorPlan: publicProcedure
      .query(async () => {
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const allMeetingsRaw = await db.getAllMeetings();
        const allSponsorsRaw = await db.getAllSponsors();
        const allSponsors = allSponsorsRaw.filter((s: any) => {
          if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(s.id)) return false;
          if (TEST_SPONSOR_IDS.has(s.id)) return false;
          return true;
        });
        const validSponsorIds = new Set(allSponsors.map((s: any) => s.id));
        const allMeetings = allMeetingsRaw.filter(
          (m: any) => validSponsorIds.has(m.sponsorId)
        );
        const sponsorsWithRep2 = new Set(
          allMeetings.filter((m: any) => m.attendeeNumber === 2).map((m: any) => m.sponsorId)
        );
        const sortedSponsors = [...allSponsors].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName));
        const sponsorTableMap = new Map<string, number>();
        let tableCounter = 1;
        for (const s of sortedSponsors) {
          sponsorTableMap.set(`${s.id}-1`, tableCounter++);
          if (sponsorsWithRep2.has(s.id)) {
            sponsorTableMap.set(`${s.id}-2`, tableCounter++);
          }
        }
        const slotLabels: Record<number, { day: number; time: string; label: string }> = {
          1:  { day: 1, time: '10:15–10:45', label: 'Day 1 · Slot 1' },
          2:  { day: 1, time: '10:45–11:15', label: 'Day 1 · Slot 2' },
          3:  { day: 1, time: '13:30–14:00', label: 'Day 1 · Slot 3' },
          4:  { day: 1, time: '14:00–14:30', label: 'Day 1 · Slot 4' },
          5:  { day: 1, time: '14:45–15:15', label: 'Day 1 · Slot 5' },
          6:  { day: 1, time: '15:15–15:45', label: 'Day 1 · Slot 6' },
          7:  { day: 2, time: '10:30–11:00', label: 'Day 2 · Slot 1' },
          8:  { day: 2, time: '11:00–11:30', label: 'Day 2 · Slot 2' },
          9:  { day: 2, time: '13:15–13:45', label: 'Day 2 · Slot 3' },
          10: { day: 2, time: '13:45–14:15', label: 'Day 2 · Slot 4' },
          11: { day: 2, time: '14:30–15:00', label: 'Day 2 · Slot 5' },
          12: { day: 2, time: '15:00–15:30', label: 'Day 2 · Slot 6' },
        };
        const slotMap = new Map<number, typeof allMeetings>();
        for (let i = 1; i <= 12; i++) slotMap.set(i, []);
        for (const m of allMeetings) {
          if (m.timeSlot && slotMap.has(m.timeSlot)) {
            slotMap.get(m.timeSlot)!.push(m);
          }
        }
        const slots = Array.from(slotMap.entries()).map(([slotNum, slotMeetings]) => ({
          slot: slotNum,
          ...slotLabels[slotNum],
          meetings: slotMeetings.map((m: any) => {
            const sponsor = allSponsors.find((s: any) => s.id === m.sponsorId);
            const attendee = attendees.find((a: any) => a.id === m.attendeeId);
            return {
              meetingId: m.id,
              sponsorId: m.sponsorId,
              sponsorName: sponsor?.companyName ?? 'Unknown',
              tableNumber: sponsorTableMap.get(`${m.sponsorId}-${m.attendeeNumber ?? 1}`) ?? 0,
              attendeeNumber: m.attendeeNumber ?? 1,
              attendeeName: attendee ? `${attendee.firstName} ${attendee.lastName}` : '',
              attendeeCompany: attendee?.company ?? '',
              attendeeJobTitle: attendee?.jobTitle ?? '',
              status: m.status,
              isStarred: m.isRescheduled === 1,
            };
          }).sort((a: any, b: any) => a.tableNumber - b.tableNumber),
        }));
        const sponsorTableEntries = [] as { id: number; companyName: string; tableNumber: number; repLabel: string }[];
        for (const s of sortedSponsors) {
          const t1 = sponsorTableMap.get(`${s.id}-1`);
          if (t1 != null) sponsorTableEntries.push({ id: s.id, companyName: s.companyName, tableNumber: t1, repLabel: sponsorsWithRep2.has(s.id) ? `${s.companyName} (Rep 1)` : s.companyName });
          const t2 = sponsorTableMap.get(`${s.id}-2`);
          if (t2 != null) sponsorTableEntries.push({ id: s.id, companyName: s.companyName, tableNumber: t2, repLabel: `${s.companyName} (Rep 2)` });
        }
        return {
          slots,
          sponsors: sponsorTableEntries,
          totalMeetings: allMeetings.length,
        };
      }),
  }),

  // Admin router (CS team dashboard)
  admin: router({
    // Get all submissions (rankings + intake, including partial submissions)
    getAllSubmissions: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional().default(false) }).optional())
      .query(async ({ input }) => {
      // Test sponsor IDs (recruitmentevents.co accounts)
      const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
      const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
      const includeTestAccounts = input?.includeTestAccounts ?? false;

      const rankingsSubmissions = await db.getAllRankingsSubmissions();
      const allIntakeSubmissions = await db.getAllIntakeSubmissions();
      
      // Create a map to track which sponsors we've already processed
      const processedSponsors = new Set<number>();
      const submissions: any[] = [];
      
      // Filter out test/excluded sponsors based on toggle
      const isAllowed = (sponsorId: number) => {
        if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsorId)) return false;
        if (!includeTestAccounts && TEST_SPONSOR_IDS.has(sponsorId)) return false;
        return true;
      };

      // Deduplicate rankings submissions - keep only the most recent per sponsor
      const latestRankingsBySponsor = new Map<number, typeof rankingsSubmissions[0]>();
      for (const sub of rankingsSubmissions) {
        const existing = latestRankingsBySponsor.get(sub.sponsorId);
        if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
          latestRankingsBySponsor.set(sub.sponsorId, sub);
        }
      }
      
      // Helper: compute opt-in delegates for a sponsor from the attendees list
      const getOptInDelegates = (sponsorName: string): string[] => {
        const nameLower = (sponsorName || '').toLowerCase();
        return attendees
          .filter(a => (a.optInSponsors ?? []).some((s: string) =>
            s.toLowerCase().includes(nameLower) || nameLower.includes(s.toLowerCase())
          ))
          .map(a => a.id);
      };

      // Process deduplicated rankings submissions
      for (const sub of Array.from(latestRankingsBySponsor.values()).filter(s => isAllowed(s.sponsorId))) {
        const sponsor = await db.getSponsorById(sub.sponsorId);
        const intakeSubmission = await db.getIntakeSubmissionBySponsor(sub.sponsorId);
        const priorityTags = await db.getPriorityTagsBySponsor(sub.sponsorId);
        const sponsorName = sponsor?.companyName || '';
        submissions.push({
          ...sub,
          companyName: sponsorName || "Unknown",
          contactName: sponsor?.contactName || "Unknown",
          contactEmail: sponsor?.contactEmail || "Unknown",
          intakeData: intakeSubmission || null,
          hasIntake: !!intakeSubmission,
          hasRankings: true,
          priorityDelegates: priorityTags.map(t => t.attendeeId),
          optInDelegates: getOptInDelegates(sponsorName),
        });
        if (sub.sponsorId) processedSponsors.add(sub.sponsorId);
      }
      
      // Add intake-only submissions (no rankings yet)
      for (const intake of allIntakeSubmissions) {
        if (!processedSponsors.has(intake.sponsorId) && isAllowed(intake.sponsorId)) {
          const sponsor = await db.getSponsorById(intake.sponsorId);
          const priorityTags = await db.getPriorityTagsBySponsor(intake.sponsorId);
          const sponsorName = intake.companyName || sponsor?.companyName || '';
          submissions.push({
            id: intake.id,
            sponsorId: intake.sponsorId,
            submittedAt: intake.submittedAt,
            isArchived: 0,
            status: 'pending', // intake-only submissions always start as pending
            isReviewed: 0,
            companyName: sponsorName || "Unknown",
            contactName: intake.firstName + " " + intake.lastName,
            contactEmail: intake.email,
            intakeData: intake,
            hasIntake: true,
            hasRankings: false,
            rankingsData: null,
            priorityDelegates: priorityTags.map(t => t.attendeeId),
            optInDelegates: getOptInDelegates(sponsorName),
          });
        }
      }
      
      // Sort by submission date
      return submissions.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    }),
    
    // Get all delegates
    getAllDelegates: adminProcedure.query(async () => {
      return await db.getDelegateProfiles();
    }),

    // Get full delegate list from attendees.ts (admin only — includes all PII fields)
    getDelegates: adminProcedure.query(async () => {
      return attendees;
    }),
    
    // Update submission status
    updateSubmissionStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "reviewed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Pass the admin's display name or email as the reviewer
        const reviewedBy = ctx.user.name || ctx.user.email || 'Admin';
        await db.updateSubmissionStatus(input.id, input.status, reviewedBy);
        // Get sponsor name for the log
        const submission = await db.getRankingsSubmissionById(input.id);
        const sponsor = submission ? await db.getSponsorById(submission.sponsorId) : null;
        await db.logAdminActivity({
          adminId: ctx.user.id,
          adminName: reviewedBy,
          action: input.status === 'reviewed' ? 'reviewed' : 'reset_to_pending',
          entityType: 'submission',
          entityId: String(input.id),
          entityName: sponsor?.companyName || `Submission #${input.id}`,
          details: `Rankings marked as ${input.status}`,
        });
        return { success: true };
      }),
    
    // Archive submission
    archiveSubmission: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.archiveSubmission(input.id);
        const submission = await db.getRankingsSubmissionById(input.id);
        const sponsor = submission ? await db.getSponsorById(submission.sponsorId) : null;
        const adminName = ctx.user.name || ctx.user.email || 'Admin';
        await db.logAdminActivity({
          adminId: ctx.user.id,
          adminName,
          action: 'archived',
          entityType: 'sponsor',
          entityId: String(submission?.sponsorId ?? input.id),
          entityName: sponsor?.companyName || `Submission #${input.id}`,
          details: 'Sponsor archived from admin dashboard',
        });
        return { success: true };
      }),
    
    // Unarchive submission
    unarchiveSubmission: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.unarchiveSubmission(input.id);
        const submission = await db.getRankingsSubmissionById(input.id);
        const sponsor = submission ? await db.getSponsorById(submission.sponsorId) : null;
        const adminName = ctx.user.name || ctx.user.email || 'Admin';
        await db.logAdminActivity({
          adminId: ctx.user.id,
          adminName,
          action: 'unarchived',
          entityType: 'sponsor',
          entityId: String(submission?.sponsorId ?? input.id),
          entityName: sponsor?.companyName || `Submission #${input.id}`,
          details: 'Sponsor restored from archive',
        });
        return { success: true };
      }),
    
    // Get all users
    getAllUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    // Create a short-lived impersonation token by sponsorId (admin only)
    // Looks up the sponsor's linked userId and creates the impersonation token in one step.
    loginAsSponsor: adminProcedure
      .input(z.object({ sponsorId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const sponsor = await db.getSponsorById(input.sponsorId);
        if (!sponsor) throw new Error('Sponsor not found');
        if (!sponsor.userId) throw new Error('Sponsor has no linked user account yet — they must log in at least once.');
        const targetUser = await db.getUserById(sponsor.userId);
        if (!targetUser) throw new Error('Linked user account not found');
        const { SignJWT } = await import('jose');
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
        const token = await new SignJWT({
          targetOpenId: targetUser.openId,
          impersonation: true,
          adminId: ctx.user.id,
        })
          .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
          .setExpirationTime('5m')
          .sign(secret);
        return { token, sponsorName: sponsor.companyName };
      }),

    // Create a short-lived impersonation token for a target user (admin only)
    createImpersonationToken: adminProcedure
      .input(z.object({ targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const targetUser = await db.getUserById(input.targetUserId);
        if (!targetUser) throw new Error('User not found');
        // Sign a short-lived JWT (5 minutes) with the server JWT_SECRET
        const { SignJWT } = await import('jose');
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
        const token = await new SignJWT({
          targetOpenId: targetUser.openId,
          impersonation: true,
          adminId: ctx.user.id,
        })
          .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
          .setExpirationTime('5m')
          .sign(secret);
        return { token };
      }),
    
    // Promote user to admin
    promoteToAdmin: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, "admin");
        return { success: true };
      }),
    
    promoteUserByEmail: adminProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          throw new Error("User not found. They must log in at least once before being promoted.");
        }
        await db.updateUserRole(user.id, "admin");
        return { success: true };
      }),
    
    // Remove admin privileges (demote to user)
    removeAdmin: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, "user");
        return { success: true };
      }),
    
    // Delete sponsor and all related data
    deleteSponsor: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteSponsor(input.sponsorId);
        return { success: true };
      }),
    
    // Vendor profile management
    getVendorProfiles: adminProcedure.query(async () => {
      return await db.getVendorProfiles();
    }),
    

    
    deleteVendorProfile: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteVendorProfile(input.id);
        return { success: true };
      }),
    
    // Delegate profile management
    getDelegateProfiles: adminProcedure.query(async () => {
      return await db.getDelegateProfiles();
    }),
    
    uploadDelegateProfile: adminProcedure
      .input(z.object({
        profileData: z.string(),
      }))
      .mutation(async ({ input }) => {
        const profile = JSON.parse(input.profileData);
        const id = await db.createDelegateProfile({
          attendeeId: profile.attendeeId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          company: profile.company,
          jobTitle: profile.jobTitle || null,
          industry: profile.industry || null,
          challenges: profile.challenges || null,
          interests: profile.interests || null,
          profileData: input.profileData,
        });
        return { success: true, id };
      }),
    
    deleteDelegateProfile: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteDelegateProfile(input.id);
        return { success: true };
      }),
    
    // Meeting matchmaking
    generateMatches: adminProcedure.mutation(async () => {
      const allMatches = await generateAllMatches();
      
      // Save all matches to database
      const entries = Array.from(allMatches.entries());
      for (const [sponsorId, matches] of entries) {
        await saveMatches(matches);
      }
      
      return { success: true, totalMatches: Array.from(allMatches.values()).flat().length };
    }),

    // Re-generate match reasons for all confirmed meetings using the latest AI prompt
    regenerateMatchReasons: adminProcedure.mutation(async () => {
      const { regenerateAllMatchReasons } = await import('./matchingEngine');
      const updated = await regenerateAllMatchReasons();
      return { success: true, updated };
    }),
    
    getAllMeetings: adminProcedure.query(async () => {
      return await db.getAllMeetings();
    }),
    
    // Wipe all meetings and match cache for test sponsor accounts
    disableTestAccounts: adminProcedure.mutation(async ({ ctx }) => {
      const TEST_SPONSOR_IDS = [30001, 60001, 90001, 120001];
      let meetingsDeleted = 0;
      let cacheDeleted = 0;
      
      for (const sponsorId of TEST_SPONSOR_IDS) {
        // Delete all meetings for this test sponsor
        const meetings = await db.getAllMeetings();
        const sponsorMeetings = meetings.filter((m: any) => m.sponsorId === sponsorId);
        if (sponsorMeetings.length > 0) {
          await db.deleteMeetingsBySponsor(sponsorId);
          meetingsDeleted += sponsorMeetings.length;
        }
        
        // Delete match cache for this test sponsor
        const cache = await db.getMatchCacheBySponsor(sponsorId);
        if (cache.length > 0) {
          const { matchCache } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const drizzleDb = await db.getDb();
          if (drizzleDb) {
            await drizzleDb.delete(matchCache).where(eq(matchCache.sponsorId, sponsorId));
          }
          cacheDeleted += cache.length;
        }
      }
      
      const adminName = ctx.user.name || ctx.user.email || 'Admin';
      await db.logAdminActivity({
        adminId: ctx.user.id,
        adminName,
        action: 'disabled_test_accounts',
        entityType: 'system',
        entityId: 'test_accounts',
        entityName: 'Test Accounts',
        details: `Wiped ${meetingsDeleted} meetings and ${cacheDeleted} cached matches for test sponsors`,
      });
      
      return { success: true, meetingsDeleted, cacheDeleted };
    }),
    
    // Check if delegate is available for a specific time slot
    checkDelegateAvailability: adminProcedure
      .input(z.object({
        attendeeId: z.string(),
        timeSlot: z.number(),
      }))
      .query(async ({ input }) => {
        const delegateMeetings = await db.getDelegateMeetings(input.attendeeId);
        const conflictingMeeting = delegateMeetings.find(m => m.timeSlot === input.timeSlot);
        return {
          isAvailable: !conflictingMeeting,
          conflictingMeeting: conflictingMeeting || null,
        };
      }),
    
    // Returns the set of eligible delegate IDs for a given sponsor + slot,
    // plus match scores from existing meetings for display in the admin UI.
    // Filters out: globally excluded delegates, hard-excluded clients, delegates already
    // booked in that slot (any sponsor), delegates already booked with this sponsor,
    // and delegates at the 8-meeting cap.
    getEligibleDelegatesForSlot: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        timeSlot: z.number(),
      }))
      .query(async ({ input }) => {
        const { sponsorId, timeSlot } = input;

        // ─── Global exclusions (mirror of matchingAlgorithm.ts) ───
        // No global exclusions — delegates managed via attendees list
        const GLOBAL_EXCLUDED_DELEGATE_IDS = new Set<string>([]);

        // Hard exclusions per sponsor (mirror of matchingAlgorithm.ts)
        const SPONSOR_HARD_EXCLUSIONS: Record<number, string[]> = {
          270002: ['4956154','7258470500','200543495570','190937723960','13454401','91889321035','5140258','76678269091','203946652193'],
          540001: ['190937723960','13454401','9477501','1076201','9322701'],
          840001: ['17812226737','7258470500','91889321035','190937723960','13454401','12731251','195183358360'],
          750001: ['76678269091','7258470500','91889321035','13454401','93174643474','200543495570','91862577670','190937723960','113145184682','110260566550','191181016455','452351','5927642'],
          150001: ['17812226737','200543495570','5927642','7258470500','128491656706'],
          780001: [],
          300001: ['190937723960'],
        };
        const hardExcluded = new Set<string>(SPONSOR_HARD_EXCLUSIONS[sponsorId] ?? []);

        // Get all meetings in this time slot (any sponsor) — delegates already booked
        const allMeetings = await db.getAllMeetings();
        const bookedInSlot = new Set<string>(
          allMeetings
            .filter(m => m.timeSlot === timeSlot)
            .map(m => m.attendeeId)
        );

        // Get delegates already matched to this sponsor (regardless of slot)
        const sponsorMeetings = allMeetings.filter(m => m.sponsorId === sponsorId);
        const alreadyMatchedToSponsor = new Set<string>(sponsorMeetings.map(m => m.attendeeId));

        // Build a map of attendeeId -> matchScore from this sponsor's existing meetings
        // (stored in the notes field as JSON: { score, reason })
        const matchScoreMap = new Map<string, number>();
        for (const m of sponsorMeetings) {
          if (m.notes) {
            try {
              const parsed = JSON.parse(m.notes);
              if (typeof parsed.score === 'number') {
                matchScoreMap.set(m.attendeeId, parsed.score);
              }
            } catch {
              // notes not JSON — ignore
            }
          }
        }

        // Count total meetings per delegate across all sponsors
        const delegateMeetingCounts = new Map<string, number>();
        for (const m of allMeetings) {
          delegateMeetingCounts.set(m.attendeeId, (delegateMeetingCounts.get(m.attendeeId) ?? 0) + 1);
        }

        // Build list of eligible delegates with their details and scores
        // Use server-side attendees (not client bundle) to keep PII off the client
        const { attendees } = await import('./attendees');
        const eligibleDelegates: Array<{
          id: string;
          firstName: string;
          lastName: string;
          company: string;
          jobTitle: string;
          meetingCount: number;
          matchScore: number | null;
        }> = [];

        for (const attendee of attendees) {
          const id = attendee.id;
          if (GLOBAL_EXCLUDED_DELEGATE_IDS.has(id)) continue; // globally excluded
          if (hardExcluded.has(id)) continue;                  // sponsor-specific exclusion
          if (bookedInSlot.has(id)) continue;                  // already in this slot
          if (alreadyMatchedToSponsor.has(id)) continue;       // already meeting this sponsor
          if ((delegateMeetingCounts.get(id) ?? 0) >= 8) continue; // at cap
          eligibleDelegates.push({
            id,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            company: attendee.company || '',
            jobTitle: attendee.jobTitle || '',
            meetingCount: delegateMeetingCounts.get(id) ?? 0,
            matchScore: matchScoreMap.get(id) ?? null,
          });
        }

        // Sort by match score descending (nulls last), then alphabetically
        eligibleDelegates.sort((a, b) => {
          if (a.matchScore !== null && b.matchScore !== null) return b.matchScore - a.matchScore;
          if (a.matchScore !== null) return -1;
          if (b.matchScore !== null) return 1;
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        });

        // Keep backward-compatible eligibleIds field alongside the richer list
        return {
          eligibleIds: eligibleDelegates.map(d => d.id),
          eligibleDelegates,
        };
      }),

    updateMeetingStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["suggested", "confirmed", "declined"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateMeetingStatus(input.id, input.status);
        return { success: true };
      }),
    
    deleteMeeting: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteMeeting(input.id);
        return { success: true };
      }),
    
    updateMeetingNotes: adminProcedure
      .input(z.object({
        meetingId: z.number(),
        adminNotes: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateAdminMeetingNotes(input.meetingId, input.adminNotes);
        return { success: true };
      }),
    
    // Priority tagging
    getPriorityTags: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getPriorityTagsBySponsor(input.sponsorId);
      }),
    
    addPriorityTag: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        attendeeId: z.string(),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPriorityTag({
          sponsorId: input.sponsorId,
          attendeeId: input.attendeeId,
          note: input.note || null,
        });
        return { success: true, id };
      }),
    
    removePriorityTag: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        attendeeId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.removePriorityTagByAttendee(input.sponsorId, input.attendeeId);
        return { success: true };
      }),
    
    deletePriorityTag: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deletePriorityTag(input.id);
        return { success: true };
      }),
    
    // Upload vendor profile document
    uploadVendorProfile: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        fileData: z.string(), // base64
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        // In production, upload to S3 and store URL
        // For now, just store the filename
        await db.updateVendorProfileDocument(input.sponsorId, input.fileName);
        return { success: true };
      }),
    
    // Import delegates from attendees list
    importDelegates: adminProcedure.mutation(async () => {
      const { attendees } = await import('./attendees');
      
      let imported = 0;
      let skipped = 0;
      
      for (const attendee of attendees) {
        if (!attendee.id || !attendee.firstName || !attendee.lastName) {
          skipped++;
          continue;
        }
        
        try {
          // Check if delegate already exists
          const existing = await db.getDelegateByAttendeeId(attendee.id);
          if (existing) {
            skipped++;
            continue;
          }
          
          await db.createDelegateProfile({
            attendeeId: attendee.id,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            company: attendee.company || 'Unknown',
            jobTitle: attendee.jobTitle || null,
            industry: attendee.industry || null,
            challenges: attendee.assessmentTool || null,
            interests: `ATS: ${attendee.ats || 'N/A'}, CRM: ${attendee.crm || 'N/A'}, Market Intel: ${attendee.marketIntelligence || 'N/A'}`,
            profileData: JSON.stringify({
              companySize: attendee.companySize,
              teamSize: attendee.teamSize,
              budgetAuthority: attendee.budgetAuthority,
              otherTools: attendee.otherTools,
            }),
          });
          imported++;
        } catch (error) {
          console.error(`Error importing attendee ${attendee.id}:`, error);
          skipped++;
        }
      }
      
      return { success: true, imported, skipped, total: attendees.length };
    }),
    
    // Generate meetings for a specific sponsor
    generateMeetings: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        meetingCount: z.number().min(12).max(20),
      }))
      .mutation(async ({ input }) => {
        const { generateMeetingsForSponsor } = await import('./matchingAlgorithm');
        const matches = await generateMeetingsForSponsor(input.sponsorId, input.meetingCount);
        return { success: true, matches };
      }),
    
    // Generate meetings for all sponsors
    generateAllMeetings: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional() }).optional())
      .mutation(async ({ input }) => {
        const { generateMeetingsForAllSponsors } = await import('./matchingAlgorithm');
        const { matchProgress } = await import('./matchProgress');
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const includeTestAccounts = input?.includeTestAccounts ?? false;

        // Start a progress session so SSE clients can track this run
        const sessionId = `match-${Date.now()}`;
        matchProgress.startSession(sessionId);
        
        // Build the full exclusion set to pass into the algorithm
        // so test/excluded sponsors are skipped before any progress events are emitted
        const excludedForRun = new Set<number>([
          ...Array.from(ALWAYS_EXCLUDED_SPONSOR_IDS),
          ...(includeTestAccounts ? [] : Array.from(TEST_SPONSOR_IDS)),
        ]);

        // ─── FIRE AND FORGET ─────────────────────────────────────────────────────
        // Run the entire matching + saving pipeline in the background so the HTTP
        // response returns immediately (within ~1s). Cloudflare and other proxies
        // have a ~100s timeout on HTTP requests; the full Match All run takes
        // 5-15 minutes, so we MUST NOT await it inside the request handler.
        // Progress is streamed to the client via the SSE /api/match-progress endpoint.
        setImmediate(async () => {
          // Wait 1.5s for the SSE client to establish its connection before emitting
          // the first 'start' event. The late-join replay in the SSE endpoint also
          // handles clients that connect slightly after the job begins.
          await new Promise(resolve => setTimeout(resolve, 1500));
          try {
            // Process most-constrained sponsors first so they get first pick of delegate slots
            const ORDERED_SPONSOR_IDS = [
              750001, // SHL: 24 meetings (most constrained)
              210001, // Harver: 20 meetings
              270002, // Appcast: 20 meetings
              150001, // Stepstone: 12
              180001, // Maki People: 12
              240001, // Sapia.ai: 12
              300001, // Zinc: 12
              330001, // Symphony Talent: 12
              360001, // Udder: 12
              540001, // hackajob: 12
              600001, // Happydance: 12
              690001, // Amberjack: 12
              720001, // inploi: 12
              780001, // The Martec: 12
              810001, // Veremark: 12
              810002, // Radancy: 12
              840001, // JobSync: 12
              870001, // Wilson: 12
              900001, // Poetry: 12
              450001, // PerchPeek: 10
              390001, // Bright Apply: 10 (least constrained)
            ];

            const allMatchResults = await generateMeetingsForAllSponsors((event) => {
              matchProgress.emitProgress(event);
            }, excludedForRun, ORDERED_SPONSOR_IDS);
            const savedResults: { sponsorId: number; meetingCount: number }[] = [];

            // ─── Global slot availability trackers ───────────────────────────────────
            // delegateUsedSlots: delegateId → Set<timeSlot>  (1 meeting per slot per delegate)
            // sponsorUsedSlots:  sponsorId → repNumber → Set<timeSlot>  (1 meeting per slot per rep)
            // delegateMeetingCount: delegateId → total meetings assigned (global 8-cap)
            const delegateUsedSlots = new Map<string, Set<number>>();
            const sponsorUsedSlots = new Map<number, Map<number, Set<number>>>();
            const delegateMeetingCount = new Map<string, number>();
            const DELEGATE_MAX_MEETINGS = 8;
            const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

            // Sponsor-specific meeting count overrides
            const SPONSOR_MEETING_COUNT_OVERRIDES: Record<number, number> = {
              450001: 12,  // PerchPeek — relaxed exclusion list, target 12
              750001: 24,  // SHL
              870001: 12,  // Wilson
              390001: 10,  // Bright Apply
            };

            // Iterate in the same priority order as the AI scoring step
            const orderedEntries = ORDERED_SPONSOR_IDS
              .filter(id => allMatchResults.has(id))
              .map(id => [id, allMatchResults.get(id)!] as [number, any[]]);
            // Include any sponsors not in the ordered list (fallback)
            for (const [id, matches] of Array.from(allMatchResults.entries())) {
              if (!ORDERED_SPONSOR_IDS.includes(id)) orderedEntries.push([id, matches]);
            }

            for (const [sponsorId, matches] of orderedEntries) {
              // Skip excluded sponsors
              if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsorId)) continue;
              if (!includeTestAccounts && TEST_SPONSOR_IDS.has(sponsorId)) continue;

              const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsorId);
              const targetMeetingCount = SPONSOR_MEETING_COUNT_OVERRIDES[sponsorId] ??
                (intakeSubmission?.meetingPackage === '20' ? 20 : 12);

              // Number of reps: 1 rep can do max 12 meetings (1 per slot).
              // Sponsors needing > 12 meetings require 2 reps.
              const hasTwoReps = targetMeetingCount > 12;
              const rep1Quota = hasTwoReps ? Math.ceil(targetMeetingCount / 2) : targetMeetingCount;
              const rep2Quota = hasTwoReps ? Math.floor(targetMeetingCount / 2) : 0;

              // Initialise per-rep slot trackers for this sponsor
              if (!sponsorUsedSlots.has(sponsorId)) {
                sponsorUsedSlots.set(sponsorId, new Map<number, Set<number>>([[1, new Set<number>()], [2, new Set<number>()]]));
              }
              const sponsorSlots = sponsorUsedSlots.get(sponsorId)!;

              const repName1 = intakeSubmission
                ? `${intakeSubmission.firstName} ${intakeSubmission.lastName}`.trim()
                : 'Attendee 1';
              const repName2 = intakeSubmission?.secondRepName?.trim() || repName1;

              const matchesWithSlots: any[] = [];
              let rep1Count = 0;
              let rep2Count = 0;

              // Track delegates already assigned to this sponsor (no duplicate vendor-delegate pairs)
              const assignedDelegates = new Set<string>();

              for (const match of (matches as any[])) {
                // Stop when quota is fully met
                if (rep1Count >= rep1Quota && rep2Count >= rep2Quota) break;

                // Skip if this delegate is already assigned to this sponsor
                if (assignedDelegates.has(match.attendeeId)) {
                  console.log(`[Scheduling] Duplicate delegate ${match.attendeeId} for sponsor ${sponsorId} — skipping`);
                  continue;
                }

                // Skip if delegate has hit the global 8-meeting cap
                const currentDelegateCount = delegateMeetingCount.get(match.attendeeId) ?? 0;
                if (currentDelegateCount >= DELEGATE_MAX_MEETINGS) {
                  console.log(`[Scheduling] Delegate ${match.attendeeId} at 8-meeting cap — skipping for sponsor ${sponsorId}`);
                  continue;
                }

                // Determine which rep to assign this meeting to.
                // Fill Rep 1 first (up to their quota), then Rep 2.
                // If a rep's slots are all full, try the other rep.
                let assignedRep: number | null = null;
                let availableSlot: number | null = null;

                const delegateSlots = delegateUsedSlots.get(match.attendeeId) ?? new Set<number>();

                // Try Rep 1 first if they still have quota
                if (rep1Count < rep1Quota) {
                  const rep1Slots = sponsorSlots.get(1)!;
                  const slot = ALL_SLOTS.find(s => !delegateSlots.has(s) && !rep1Slots.has(s)) ?? null;
                  if (slot !== null) {
                    assignedRep = 1;
                    availableSlot = slot;
                  }
                }

                // If Rep 1 couldn't take it, try Rep 2
                if (assignedRep === null && rep2Count < rep2Quota) {
                  const rep2Slots = sponsorSlots.get(2)!;
                  const slot = ALL_SLOTS.find(s => !delegateSlots.has(s) && !rep2Slots.has(s)) ?? null;
                  if (slot !== null) {
                    assignedRep = 2;
                    availableSlot = slot;
                  }
                }

                if (assignedRep === null || availableSlot === null) {
                  console.warn(`[Scheduling] No available slot for delegate ${match.attendeeId} with sponsor ${sponsorId} — skipping`);
                  continue; // Skip this delegate — don't save a meeting with null slot
                }

                // Commit the slot assignment
                delegateSlots.add(availableSlot);
                sponsorSlots.get(assignedRep)!.add(availableSlot);
                delegateUsedSlots.set(match.attendeeId, delegateSlots);
                delegateMeetingCount.set(match.attendeeId, currentDelegateCount + 1);
                assignedDelegates.add(match.attendeeId);

                if (assignedRep === 1) rep1Count++;
                else rep2Count++;

                const sponsorRepName = assignedRep === 2 ? repName2 : repName1;
                matchesWithSlots.push({ ...match, timeSlot: availableSlot, attendeeNumber: assignedRep, sponsorRepName });
              }

              console.log(`[Scheduling] Sponsor ${sponsorId}: ${matchesWithSlots.length}/${targetMeetingCount} meetings scheduled (Rep1: ${rep1Count}/${rep1Quota}, Rep2: ${rep2Count}/${rep2Quota})`);

              // Save to database (replace existing meetings for this sponsor)
              await db.deleteMeetingsBySponsor(sponsorId);
              for (const meeting of matchesWithSlots) {
                // Sanitise matchReason to remove control characters
                const safeReason = (meeting.matchReason || '')
                  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                  .replace(/\r\n|\r/g, ' ')
                  .trim();
                await db.createMeeting({
                  sponsorId,
                  attendeeId: meeting.attendeeId,
                  matchScore: meeting.matchScore,
                  matchReason: safeReason,
                  isTopRanked: meeting.isTopRanked ? 1 : 0,
                  isPriority: meeting.isPriority ? 1 : 0,
                  timeSlot: meeting.timeSlot ?? null,
                  attendeeNumber: meeting.attendeeNumber ?? 1,
                  sponsorRepName: meeting.sponsorRepName ?? null,
                  status: 'suggested',
                  notes: null,
                });
              }

              savedResults.push({ sponsorId, meetingCount: matchesWithSlots.length });
              matchProgress.emitProgress({
                type: 'sponsor_complete',
                sponsorId,
                meetingCount: matchesWithSlots.length,
                completedSponsors: savedResults.length,
                totalSponsors: allMatchResults.size,
                phase: 'saving',
              });
            } // end for (allMatchResults)

            // Signal completion and end the session
            matchProgress.emitProgress({ type: 'done', totalSponsors: savedResults.length });
            matchProgress.endSession();
          } catch (err) {
            console.error('[MatchAll] Background job failed:', err);
            matchProgress.emitProgress({ type: 'done', totalSponsors: 0 });
            matchProgress.endSession();
          }
        }); // end setImmediate

        // Return immediately so the HTTP response closes before Cloudflare times out.
        // The client tracks progress via the SSE /api/match-progress stream.
        return { success: true, started: true };
      }),

    // Clear all meetings across all sponsors
    clearAllMeetings: adminProcedure
      .mutation(async () => {
        await db.deleteAllMeetings();
        return { success: true };
      }),
    
    // Save generated meetings to database
    saveMeetings: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        meetings: z.array(z.object({
          attendeeId: z.string(),
          matchScore: z.number(),
          matchReason: z.string(),
          isPriority: z.boolean(),
          isTopRanked: z.boolean(),
          timeSlot: z.number().nullable().optional(),
          attendeeNumber: z.number().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Delete existing meetings for this sponsor
        await db.deleteMeetingsBySponsor(input.sponsorId);
        
        // Create new meetings
        for (const meeting of input.meetings) {
          await db.createMeeting({
            sponsorId: input.sponsorId,
            attendeeId: meeting.attendeeId,
            matchScore: meeting.matchScore,
            matchReason: meeting.matchReason,
            isTopRanked: meeting.isTopRanked ? 1 : 0,
            isPriority: meeting.isPriority ? 1 : 0,
            timeSlot: meeting.timeSlot ?? null,
            attendeeNumber: meeting.attendeeNumber ?? 1,
            status: 'suggested',
            notes: null,
          });
        }
        const sponsor = await db.getSponsorById(input.sponsorId);
        const adminName = ctx.user.name || ctx.user.email || 'Admin';
        await db.logAdminActivity({
          adminId: ctx.user.id,
          adminName,
          action: 'saved_meetings',
          entityType: 'sponsor',
          entityId: String(input.sponsorId),
          entityName: sponsor?.companyName || `Sponsor #${input.sponsorId}`,
          details: `${input.meetings.length} meetings saved`,
        });
        return { success: true };
      }),
    
    // Clear all meetings for a sponsor while retaining AI matching data
    clearMeetings: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMeetingsBySponsor(input.sponsorId);
        const sponsor = await db.getSponsorById(input.sponsorId);
        const adminName = ctx.user.name || ctx.user.email || 'Admin';
        await db.logAdminActivity({
          adminId: ctx.user.id,
          adminName,
          action: 'cleared_meetings',
          entityType: 'sponsor',
          entityId: String(input.sponsorId),
          entityName: sponsor?.companyName || `Sponsor #${input.sponsorId}`,
          details: 'All meetings cleared for sponsor',
        });
        return { success: true };
      }),
    
    // Publish meetings to sponsor (change status from suggested to confirmed)
    publishMeetings: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const meetings = await db.getMeetingsBySponsor(input.sponsorId);
        const suggestedMeetings = meetings.filter(m => m.status === 'suggested');
        const suggestedCount = suggestedMeetings.length;
        for (const meeting of suggestedMeetings) {
          await db.updateMeetingStatus(meeting.id, 'confirmed');
        }
        const sponsor = await db.getSponsorById(input.sponsorId);
        const adminName = ctx.user.name || ctx.user.email || 'Admin';
        await db.logAdminActivity({
          adminId: ctx.user.id,
          adminName,
          action: 'published_meetings',
          entityType: 'sponsor',
          entityId: String(input.sponsorId),
          entityName: sponsor?.companyName || `Sponsor #${input.sponsorId}`,
          details: `${suggestedCount} meetings published to sponsor`,
        });
        return { 
          success: true, 
          publishedCount: suggestedCount,
          totalMeetings: meetings.length,
          alreadyPublished: meetings.length - suggestedCount
        };
      }),
    
    // Toggle meetings visibility for sponsor
    toggleMeetingsVisibility: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
        isVisible: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.toggleMeetingsVisibility(input.sponsorId, input.isVisible);
        const sponsor = await db.getSponsorById(input.sponsorId);
        const adminName = ctx.user.name || ctx.user.email || 'Admin';
        await db.logAdminActivity({
          adminId: ctx.user.id,
          adminName,
          action: input.isVisible ? 'meetings_made_visible' : 'meetings_hidden',
          entityType: 'sponsor',
          entityId: String(input.sponsorId),
          entityName: sponsor?.companyName || `Sponsor #${input.sponsorId}`,
          details: `Meetings ${input.isVisible ? 'made visible' : 'hidden'} for sponsor`,
        });
        return result;
      }),
    
    // Get meetings for a sponsor
    getMeetingsBySponsor: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getMeetingsBySponsor(input.sponsorId);
      }),
    
    // Check for delegate conflicts (capacity and time slots)
    getDelegateConflicts: adminProcedure
      .input(z.object({
        meetings: z.array(z.object({
          attendeeId: z.string(),
          timeSlot: z.number().nullable(),
        })),
        excludeSponsorId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const conflicts: Array<{
          attendeeId: string;
          type: 'capacity' | 'timeslot';
          currentCount?: number;
          conflictingSlot?: number;
        }> = [];
        
        // Check each delegate
        for (const meeting of input.meetings) {
          // Check capacity (max 8 meetings total)
          const currentCount = await db.getDelegateMeetingCount(meeting.attendeeId);
          if (currentCount >= 8) {
            conflicts.push({
              attendeeId: meeting.attendeeId,
              type: 'capacity',
              currentCount,
            });
          }
          
          // Check time slot conflicts if slot is assigned
          if (meeting.timeSlot !== null) {
            const hasConflict = await db.checkTimeSlotConflict(
              meeting.attendeeId,
              meeting.timeSlot,
              input.excludeSponsorId
            );
            
            if (hasConflict) {
              conflicts.push({
                attendeeId: meeting.attendeeId,
                type: 'timeslot',
                conflictingSlot: meeting.timeSlot,
              });
            }
          }
        }
        
        return conflicts;
      }),
    
    // Get all delegate meeting counts for display
    getAllDelegateCounts: adminProcedure
      .query(async () => {
        const { attendees } = await import('./attendees');
        const counts: Record<string, number> = {};
        
        for (const attendee of attendees) {
          counts[attendee.id] = await db.getDelegateMeetingCount(attendee.id);
        }
        
        return counts;
      }),
    
    // Get delegate overview report - all delegates with their meeting schedules
    getDelegateOverview: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        const { attendees } = await import('./attendees');
        const allSponsors = await db.getAllSponsors();
        const allMeetings = await db.getAllMeetings();
        
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const includeTestAccounts = input?.includeTestAccounts ?? false;
        
        const isAllowedSponsor = (sponsorId: number) => {
          if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsorId)) return false;
          if (!includeTestAccounts && TEST_SPONSOR_IDS.has(sponsorId)) return false;
          return true;
        };
        
        // Build overview for each delegate
        const overview = await Promise.all(attendees.map(async (delegate) => {
          const delegateMeetings = allMeetings.filter(m => m.attendeeId === delegate.id && isAllowedSponsor(m.sponsorId));
          
          // Group meetings by sponsor
          const sponsorMeetings = delegateMeetings.map(meeting => {
            const sponsor = allSponsors.find(s => s.id === meeting.sponsorId);
            return {
              sponsorId: meeting.sponsorId,
              sponsorName: sponsor?.companyName || 'Unknown',
              timeSlot: meeting.timeSlot,
              attendeeNumber: meeting.attendeeNumber,
              sponsorRepName: meeting.sponsorRepName ?? null,
              matchScore: meeting.matchScore,
            };
          });
          
          return {
            delegateId: delegate.id,
            delegateName: `${delegate.firstName} ${delegate.lastName}`,
            company: delegate.company,
            jobTitle: delegate.jobTitle,
            totalMeetings: delegateMeetings.length,
            meetings: sponsorMeetings,
          };
        }));
        
        // Sort by total meetings (descending) then by name
        return overview.sort((a, b) => {
          if (b.totalMeetings !== a.totalMeetings) {
            return b.totalMeetings - a.totalMeetings;
          }
          return a.delegateName.localeCompare(b.delegateName);
        });
      }),
    
    // Cancel delegate and replace with next best matches
    cancelDelegate: adminProcedure
      .input(z.object({
        delegateId: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Get all meetings for this delegate
        const delegateMeetings = await db.getMeetingsByDelegate(input.delegateId);
        
        if (delegateMeetings.length === 0) {
          return { success: true, replacements: [], message: 'No meetings to cancel' };
        }
        
        const replacements: Array<{
          sponsorId: number;
          sponsorName: string;
          oldDelegate: string;
          newDelegate: string;
          newDelegateName: string;
          matchScore: number;
        }> = [];
        
        // For each sponsor, find the next best available match
        for (const meeting of delegateMeetings) {
          const sponsor = await db.getSponsorById(meeting.sponsorId);
          if (!sponsor) continue;
          
          // Generate fresh matches for this sponsor
          const { attendees } = await import('./attendees');
          const intakeSubmission = await db.getIntakeSubmissionBySponsor(meeting.sponsorId);
          const priorityTags = await db.getPriorityTagsBySponsor(meeting.sponsorId);
          
          if (!intakeSubmission) continue;
          
          // Get all matches for this sponsor
          let allMatches;
          
          // Try AI matching first
          try {
            const { generateMatchesForSponsor } = await import('./matchingEngine');
            allMatches = await generateMatchesForSponsor(sponsor.id);
          } catch (error) {
            // Fallback to rankings-based matching if AI matching fails
            console.warn(`AI matching failed for sponsor ${sponsor.id}, falling back to rankings: ${error}`);
            
            const rankingsSubmissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
            const rankingsSubmission = rankingsSubmissions[0]; // Get the first (most recent) submission
            if (!rankingsSubmission || !rankingsSubmission.rankingsData) {
              console.warn(`No rankings data found for sponsor ${sponsor.id}, deleting meeting`);
              await db.deleteMeeting(meeting.id);
              continue;
            }
            
            // Use rankings data to create simple matches
            const rankings = JSON.parse(rankingsSubmission.rankingsData);
            const { attendees } = await import('./attendees');
            
            allMatches = rankings.map((attendeeId: string, index: number) => {
              const delegate = attendees.find(a => a.id === attendeeId);
              return {
                attendeeId,
                matchScore: Math.max(100 - (index * 5), 50), // Decreasing score based on rank
                reasoning: `Ranked #${index + 1} by sponsor`,
                delegateInfo: delegate ? {
                  firstName: delegate.firstName,
                  lastName: delegate.lastName,
                  company: delegate.company,
                  jobTitle: delegate.jobTitle,
                } : null,
              };
            });
          }
          
          // Filter out: cancelled delegate, delegates already at capacity (8 meetings), delegates already meeting this sponsor
          const existingMeetings = await db.getMeetingsBySponsor(meeting.sponsorId);
          const existingDelegateIds = new Set(existingMeetings.map(m => m.attendeeId));
          
          const availableMatches = [];
          for (const match of allMatches) {
            if (match.attendeeId === input.delegateId) continue; // Skip cancelled delegate
            if (existingDelegateIds.has(match.attendeeId)) continue; // Skip already scheduled
            
            const meetingCount = await db.getDelegateMeetingCount(match.attendeeId);
            if (meetingCount >= 8) continue; // Skip at capacity
            
            availableMatches.push(match);
          }
          
          // Sort by match score and take the best
          availableMatches.sort((a, b) => b.matchScore - a.matchScore);
          const bestMatch = availableMatches[0];
          
          if (bestMatch) {
            // Update the meeting with new delegate
            await db.updateMeeting(meeting.id, {
              attendeeId: bestMatch.attendeeId,
              matchScore: bestMatch.matchScore,
              matchReason: bestMatch.reasoning,
            });
            
            const newDelegate = attendees.find(a => a.id === bestMatch.attendeeId);
            replacements.push({
              sponsorId: sponsor.id,
              sponsorName: sponsor.companyName,
              oldDelegate: input.delegateId,
              newDelegate: bestMatch.attendeeId,
              newDelegateName: newDelegate ? `${newDelegate.firstName} ${newDelegate.lastName}` : 'Unknown',
              matchScore: bestMatch.matchScore,
            });
          } else {
            // No replacement found - delete the meeting
            await db.deleteMeeting(meeting.id);
            replacements.push({
              sponsorId: sponsor.id,
              sponsorName: sponsor.companyName,
              oldDelegate: input.delegateId,
              newDelegate: 'NONE',
              newDelegateName: 'No replacement available',
              matchScore: 0,
            });
          }
        }
        
        return {
          success: true,
          replacements,
          message: `Cancelled ${delegateMeetings.length} meetings and found ${replacements.filter(r => r.newDelegate !== 'NONE').length} replacements`,
        };
      }),
    
    // Calculate match scores for all delegates against a specific sponsor
    calculateDelegateScores: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .query(async ({ input }) => {
        const { generateMeetingsForSponsor } = await import('./matchingAlgorithm');
        
        // Generate matches for ALL delegates (use a high number like 100)
        const matches = await generateMeetingsForSponsor(input.sponsorId, 100);
        
        // Return all delegate scores sorted by match score (highest first)
        return matches.map(m => ({
          attendeeId: m.attendeeId,
          matchScore: m.matchScore,
          matchReason: m.matchReason,
          firstName: m.delegateInfo.firstName,
          lastName: m.delegateInfo.lastName,
          company: m.delegateInfo.company,
          currentMeetingCount: m.delegateInfo.currentMeetingCount,
        }));
      }),
    
    // Get sponsor's ranked delegate list (for showing rank position in scheduling UI)
    getSponsorRankings: adminProcedure
      .input(z.object({ sponsorId: z.number() }))
      .query(async ({ input }) => {
        const submissions = await db.getRankingsSubmissionsBySponsor(input.sponsorId);
        if (!submissions.length || !submissions[0].rankingsData) return [];
        try {
          const parsed = JSON.parse(submissions[0].rankingsData as string);
          // rankingsData can be array of IDs or array of {id, ...} objects
          return (parsed as any[]).map((item: any, index: number) => ({
            attendeeId: typeof item === 'string' ? item : item.id,
            rank: index + 1,
          }));
        } catch {
          return [];
        }
      }),

    // Get analytics dashboard data
    getAnalytics: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional().default(false) }).optional())
      .query(async ({ input }) => {
        const includeTestAccounts = input?.includeTestAccounts ?? false;

        // Test accounts (recruitmentevents.co) — toggled by includeTestAccounts flag
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        // Always-excluded truly inactive/dummy accounts
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        // No excluded delegates for analytics
        const EXCLUDED_DELEGATE_IDS = new Set<string>([]);

        const allMeetingsRaw = await db.getAllMeetings();
        const allSponsorsRaw = await db.getAllSponsors();

        // Filter sponsors based on toggle
        const allSponsors = allSponsorsRaw.filter(s => {
          if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(s.id)) return false;
          if (!includeTestAccounts && TEST_SPONSOR_IDS.has(s.id)) return false;
          return true;
        });
        const validSponsorIds = new Set(allSponsors.map(s => s.id));

        // Filter meetings accordingly
        const allMeetings = allMeetingsRaw.filter(
          m => !EXCLUDED_DELEGATE_IDS.has(m.attendeeId) && validSponsorIds.has(m.sponsorId)
        );

        const totalDelegates = attendees.filter(a => !EXCLUDED_DELEGATE_IDS.has(a.id)).length;
        
        // Calculate average match score
        const totalScore = allMeetings.reduce((sum, m) => sum + (m.matchScore || 0), 0);
        const averageMatchScore = allMeetings.length > 0 ? totalScore / allMeetings.length : 0;
        
        // Count unique delegates booked
        const uniqueDelegates = new Set(allMeetings.map(m => m.attendeeId));
        const delegatesBooked = uniqueDelegates.size;
        
        // Calculate average utilization (meetings per delegate / max 8)
        const MAX_MEETINGS_PER_DELEGATE = 8;
        const delegateMeetingCounts = new Map<string, number>();
        for (const meeting of allMeetings) {
          delegateMeetingCounts.set(
            meeting.attendeeId,
            (delegateMeetingCounts.get(meeting.attendeeId) || 0) + 1
          );
        }
        const totalUtilization = Array.from(delegateMeetingCounts.values()).reduce(
          (sum, count) => sum + (count / MAX_MEETINGS_PER_DELEGATE) * 100,
          0
        );
        const averageUtilization = delegateMeetingCounts.size > 0 
          ? totalUtilization / delegateMeetingCounts.size 
          : 0;
        
        // Score distribution
        const scoreDistribution = [
          { range: '90-100%', count: 0 },
          { range: '80-89%', count: 0 },
          { range: '70-79%', count: 0 },
          { range: '60-69%', count: 0 },
          { range: '50-59%', count: 0 },
          { range: 'Below 50%', count: 0 },
        ];
        
        for (const meeting of allMeetings) {
          const score = meeting.matchScore || 0;
          if (score >= 90) scoreDistribution[0].count++;
          else if (score >= 80) scoreDistribution[1].count++;
          else if (score >= 70) scoreDistribution[2].count++;
          else if (score >= 60) scoreDistribution[3].count++;
          else if (score >= 50) scoreDistribution[4].count++;
          else scoreDistribution[5].count++;
        }
        
        // Time slot distribution — 12 slots total, 6 per day, 2 × 30-min per 1-hour block
        // Day 1 (Event Day 2): slots 1-6 | Day 2 (Event Day 3): slots 7-12
        const timeSlotDistribution = [
          { slot: 1, label: 'Day 1 — 10:15–10:45', count: 0 },
          { slot: 2, label: 'Day 1 — 10:45–11:15', count: 0 },
          { slot: 3, label: 'Day 1 — 13:30–14:00', count: 0 },
          { slot: 4, label: 'Day 1 — 14:00–14:30', count: 0 },
          { slot: 5, label: 'Day 1 — 14:45–15:15', count: 0 },
          { slot: 6, label: 'Day 1 — 15:15–15:45', count: 0 },
          { slot: 7, label: 'Day 2 — 10:30–11:00', count: 0 },
          { slot: 8, label: 'Day 2 — 11:00–11:30', count: 0 },
          { slot: 9, label: 'Day 2 — 13:15–13:45', count: 0 },
          { slot: 10, label: 'Day 2 — 13:45–14:15', count: 0 },
          { slot: 11, label: 'Day 2 — 14:30–15:00', count: 0 },
          { slot: 12, label: 'Day 2 — 15:00–15:30', count: 0 },
        ];
        
        for (const meeting of allMeetings) {
          if (meeting.timeSlot) {
            const slotIndex = meeting.timeSlot - 1;
            if (slotIndex >= 0 && slotIndex < 12) {
              timeSlotDistribution[slotIndex].count++;
            }
          }
        }
        
        // Most in-demand delegates based on sponsor rankings (excluding Jen Candee)
        // Only count rankings from valid (non-test) sponsors
        const allRankingsRaw = await db.getAllRankingsSubmissions();
        const allRankings = allRankingsRaw.filter(r => validSponsorIds.has(r.sponsorId));
        const demandScores = new Map<string, number>();
        
        for (const ranking of allRankings) {
          if (ranking.rankingsData) {
            const rankedList = JSON.parse(ranking.rankingsData);
            rankedList.forEach((delegateId: string, index: number) => {
              if (EXCLUDED_DELEGATE_IDS.has(delegateId)) return;
              const score = rankedList.length - index;
              demandScores.set(delegateId, (demandScores.get(delegateId) || 0) + score);
            });
          }
        }
        
        // Build meeting count per delegate for display
        const delegateMeetingCountMap = new Map<string, number>();
        for (const meeting of allMeetings) {
          delegateMeetingCountMap.set(meeting.attendeeId, (delegateMeetingCountMap.get(meeting.attendeeId) || 0) + 1);
        }

        // Build avg match score per delegate
        const delegateMatchScoreMap = new Map<string, { sum: number; count: number }>();
        for (const meeting of allMeetings) {
          if (meeting.matchScore != null) {
            const existing = delegateMatchScoreMap.get(meeting.attendeeId) || { sum: 0, count: 0 };
            delegateMatchScoreMap.set(meeting.attendeeId, {
              sum: existing.sum + meeting.matchScore,
              count: existing.count + 1,
            });
          }
        }

        // Build avg rating per delegate (across all sponsor ratings for that delegate)
        const delegateRatingMap = new Map<string, { sum: number; count: number }>();
        for (const meeting of allMeetings) {
          if (meeting.meetingRating != null && meeting.meetingRating > 0) {
            const existing = delegateRatingMap.get(meeting.attendeeId) || { sum: 0, count: 0 };
            delegateRatingMap.set(meeting.attendeeId, {
              sum: existing.sum + meeting.meetingRating,
              count: existing.count + 1,
            });
          }
        }

        const mostInDemandDelegates = Array.from(demandScores.entries())
          .map(([attendeeId, demandScore]) => {
            const delegate = attendees.find(d => d.id === attendeeId);
            const ratingData = delegateRatingMap.get(attendeeId);
            const matchScoreData = delegateMatchScoreMap.get(attendeeId);
            const avgRating = ratingData && ratingData.count > 0 ? ratingData.sum / ratingData.count : null;
            const avgMatchScore = matchScoreData && matchScoreData.count > 0 ? matchScoreData.sum / matchScoreData.count : null;
            const meetingCount = delegateMeetingCountMap.get(attendeeId) || 0;
            const ratedCount = ratingData?.count ?? 0;
            // Weighted sort score: avg rating weighted by number of ratings received
            // Delegates with more ratings carry more confidence — Bayesian-style with prior of 3.0
            const PRIOR_WEIGHT = 3; // equivalent to 3 "ghost" ratings at 3.0
            const PRIOR_MEAN = 3.0;
            const weightedRating = ratedCount > 0
              ? (ratingData!.sum + PRIOR_WEIGHT * PRIOR_MEAN) / (ratedCount + PRIOR_WEIGHT)
              : PRIOR_MEAN;
            return {
              attendeeId,
              name: delegate ? `${delegate.firstName} ${delegate.lastName}` : 'Unknown',
              company: delegate?.company || 'Unknown',
              demandScore,
              rankingCount: allRankings.filter(r => {
                const rankedList = r.rankingsData ? JSON.parse(r.rankingsData) : [];
                return rankedList.includes(attendeeId);
              }).length,
              meetingCount,
              avgRating,
              avgMatchScore,
              ratedCount,
              weightedRating,
            };
          })
          .filter(d => d.name !== 'Unknown')
          .sort((a, b) => b.weightedRating - a.weightedRating || b.ratedCount - a.ratedCount);
        
        // Sponsor statistics (excluding test/inactive sponsors)
        const sponsorStats = await Promise.all(
          allSponsors.map(async (sponsor) => {
            const sponsorMeetings = allMeetings.filter(m => m.sponsorId === sponsor.id);
            const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsor.id);
            // Use same quota overrides as the matching engine
            const ANALYTICS_QUOTA_OVERRIDES: Record<number, number> = {
              450001: 12,  // PerchPeek
              750001: 20,  // SHL: 20 meetings (reduced from 22, 2 lowest scoring removed)
              870001: 12,  // Wilson (package says 20, actual is 12)
              390001: 12,  // Bright Apply: 12 meetings (quota was 10 but algorithm gave 12)
              210001: 21,  // Harver: 21 meetings (20-meeting package + 1 extra from 2-rep slots, confirmed correct)
              540001: 12,  // hackajob: 12 meetings (originally 10 but 2 extra added)
            };
            const totalSlots = ANALYTICS_QUOTA_OVERRIDES[sponsor.id] ??
              (intakeSubmission?.meetingPackage === '20' ? 20 : 12);
            const avgScore = sponsorMeetings.length > 0
              ? sponsorMeetings.reduce((sum, m) => sum + (m.matchScore || 0), 0) / sponsorMeetings.length
              : 0;
            
            // Meeting ratings analytics
            const ratedMeetings = sponsorMeetings.filter(m => m.meetingRating != null && m.meetingRating > 0);
            const avgRating = ratedMeetings.length > 0
              ? ratedMeetings.reduce((sum, m) => sum + (m.meetingRating ?? 0), 0) / ratedMeetings.length
              : null;

            // Opportunity tier counts
            const greenCount = ratedMeetings.filter(m => (m.meetingRating ?? 0) >= 4).length;
            const yellowCount = ratedMeetings.filter(m => (m.meetingRating ?? 0) === 3).length;
            const orangeCount = ratedMeetings.filter(m => (m.meetingRating ?? 0) === 2).length;
            const redCount = ratedMeetings.filter(m => (m.meetingRating ?? 0) === 1).length;
            
            return {
              sponsorId: sponsor.id,
              companyName: sponsor.companyName,
              meetingsScheduled: sponsorMeetings.length,
              totalSlots,
              avgMatchScore: avgScore,
              ratedMeetingsCount: ratedMeetings.length,
              avgMeetingRating: avgRating,
              greenCount,
              yellowCount,
              orangeCount,
              redCount,
            };
          })
        );
        
        return {
          averageMatchScore,
          totalMeetings: allMeetings.length,
          delegatesBooked,
          totalDelegates,
          averageUtilization,
          scoreDistribution,
          timeSlotDistribution,
          mostInDemandDelegates,
          sponsorStats,
        };
      }),

    // Get meeting floor plan data — all meetings grouped by timeSlot for the floor plan view
    getFloorPlan: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional().default(false) }).optional())
      .query(async ({ input }) => {
      const includeTestAccounts = input?.includeTestAccounts ?? false;
      const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
      const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
      const allMeetingsRaw = await db.getAllMeetings();
      const allSponsorsRaw = await db.getAllSponsors();
      const allSponsors = allSponsorsRaw.filter(s => {
        if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(s.id)) return false;
        if (!includeTestAccounts && TEST_SPONSOR_IDS.has(s.id)) return false;
        return true;
      });
      const validSponsorIds = new Set(allSponsors.map(s => s.id));
      const allMeetings = allMeetingsRaw.filter(
        m => validSponsorIds.has(m.sponsorId)
      );

      // Assign table numbers: every rep with meetings gets their own table.
      // 2-rep sponsors get 2 consecutive table numbers (one per rep).
      // Key: `${sponsorId}-${attendeeNumber}` -> tableNumber
      const sponsorsWithRep2 = new Set(
        allMeetings.filter(m => m.attendeeNumber === 2).map(m => m.sponsorId)
      );
      const sortedSponsors = [...allSponsors].sort((a, b) => a.companyName.localeCompare(b.companyName));
      const sponsorTableMap = new Map<string, number>(); // key: `${sponsorId}-${attendeeNumber}`
      let floorTableCounter = 1;
      for (const s of sortedSponsors) {
        sponsorTableMap.set(`${s.id}-1`, floorTableCounter++);
        if (sponsorsWithRep2.has(s.id)) {
          sponsorTableMap.set(`${s.id}-2`, floorTableCounter++);
        }
      }

      // Build floor plan: 12 slots total, 6 per day, 2 × 30-min per 1-hour block
      // Day 1 (Wed 25 Mar): slots 1-6 | Day 2 (Thu 26 Mar): slots 7-12
      const slotLabels: Record<number, { day: number; hour: number; round: number; time: string }> = {
        1:  { day: 1, hour: 1, round: 1, time: '10:15–10:45' },
        2:  { day: 1, hour: 1, round: 2, time: '10:45–11:15' },
        3:  { day: 1, hour: 2, round: 1, time: '13:30–14:00' },
        4:  { day: 1, hour: 2, round: 2, time: '14:00–14:30' },
        5:  { day: 1, hour: 3, round: 1, time: '14:45–15:15' },
        6:  { day: 1, hour: 3, round: 2, time: '15:15–15:45' },
        7:  { day: 2, hour: 1, round: 1, time: '10:30–11:00' },
        8:  { day: 2, hour: 1, round: 2, time: '11:00–11:30' },
        9:  { day: 2, hour: 2, round: 1, time: '13:15–13:45' },
        10: { day: 2, hour: 2, round: 2, time: '13:45–14:15' },
        11: { day: 2, hour: 3, round: 1, time: '14:30–15:00' },
        12: { day: 2, hour: 3, round: 2, time: '15:00–15:30' },
      };

      // Group meetings by slot
      const slotMap = new Map<number, typeof allMeetings>();
      for (let i = 1; i <= 12; i++) slotMap.set(i, []);
      for (const m of allMeetings) {
        if (m.timeSlot && slotMap.has(m.timeSlot)) {
          slotMap.get(m.timeSlot)!.push(m);
        }
      }

      const slots = Array.from(slotMap.entries()).map(([slotNum, meetings]) => ({
        slot: slotNum,
        ...slotLabels[slotNum],
        meetings: meetings.map(m => {
          const sponsor = allSponsors.find(s => s.id === m.sponsorId);
          const attendee = attendees.find(a => a.id === m.attendeeId);
          return {
            meetingId: m.id,
            sponsorId: m.sponsorId,
            sponsorName: sponsor?.companyName ?? 'Unknown Sponsor',
            tableNumber: sponsorTableMap.get(`${m.sponsorId}-${m.attendeeNumber ?? 1}`) ?? 0,
            attendeeNumber: m.attendeeNumber ?? 1,
            attendeeId: m.attendeeId,
            attendeeName: attendee ? `${attendee.firstName} ${attendee.lastName}` : m.attendeeId,
            attendeeCompany: attendee?.company ?? '',
            matchScore: m.matchScore,
            status: m.status,
          };
        }).sort((a, b) => a.tableNumber - b.tableNumber),
      }));

      // Build sponsor table entries — one per rep with meetings
      const sponsorTableEntries: { id: number; companyName: string; tableNumber: number; repLabel: string }[] = [];
      for (const s of sortedSponsors) {
        const t1 = sponsorTableMap.get(`${s.id}-1`);
        if (t1 != null) sponsorTableEntries.push({ id: s.id, companyName: s.companyName, tableNumber: t1, repLabel: sponsorsWithRep2.has(s.id) ? `${s.companyName} (Rep 1)` : s.companyName });
        const t2 = sponsorTableMap.get(`${s.id}-2`);
        if (t2 != null) sponsorTableEntries.push({ id: s.id, companyName: s.companyName, tableNumber: t2, repLabel: `${s.companyName} (Rep 2)` });
      }

      return {
        slots,
        sponsors: sponsorTableEntries,
        totalMeetings: allMeetings.length,
      };
    }),

    // Get admin activity log
    getActivityLog: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAdminActivityLog(input?.limit ?? 100);
      }),

    // Get sponsor activity log (downloads + logins)
    getSponsorActivityLog: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(1000).optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllSponsorActivityLog(input?.limit ?? 500);
      }),

    // Get last login per sponsor
    getSponsorLastLogins: adminProcedure.query(async () => {
      return await db.getLastLoginBySponsor();
    }),

    // Export all submissions: intake data + top 10 ranked priorities per sponsor
    exportAllSubmissions: adminProcedure.query(async () => {
      const rankingsSubmissions = await db.getAllRankingsSubmissions();
      const allIntakeSubmissions = await db.getAllIntakeSubmissions();

      // Build lookup: sponsorId -> latest rankings
      const latestRankingsBySponsor = new Map<number, typeof rankingsSubmissions[0]>();
      for (const sub of rankingsSubmissions) {
        const existing = latestRankingsBySponsor.get(sub.sponsorId);
        if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
          latestRankingsBySponsor.set(sub.sponsorId, sub);
        }
      }

      // Build lookup: sponsorId -> intake
      const intakeBySponsor = new Map<number, typeof allIntakeSubmissions[0]>();
      for (const intake of allIntakeSubmissions) {
        intakeBySponsor.set(intake.sponsorId, intake);
      }

      // Collect all unique sponsorIds
      const allSponsorIds = new Set([
        ...Array.from(latestRankingsBySponsor.keys()),
        ...Array.from(intakeBySponsor.keys()),
      ]);

      const rows: Record<string, string>[] = [];

      for (const sponsorId of Array.from(allSponsorIds)) {
        const rankings = latestRankingsBySponsor.get(sponsorId);
        const intake = intakeBySponsor.get(sponsorId);
        const sponsor = await db.getSponsorById(sponsorId);

        // Skip archived sponsors
        if (rankings?.isArchived === 1) continue;

        // Parse all ranked delegate IDs from rankingsData JSON
        let allRanked: string[] = [];
        if (rankings?.rankingsData) {
          try {
            const parsed = JSON.parse(rankings.rankingsData as string);
            // rankingsData is an array of {id, ...} or just an array of IDs
            const ids: string[] = Array.isArray(parsed)
              ? parsed.map((item: any) => (typeof item === 'string' ? item : item.id ?? item.attendeeId ?? ''))
              : [];
            allRanked = ids; // No slice — include all ranked delegates
          } catch {
            allRanked = [];
          }
        }

        // Resolve delegate names from attendees list
        const allRankedNames = allRanked.map((id) => {
          const delegate = attendees.find(a => a.id === id);
          return delegate ? `${delegate.firstName} ${delegate.lastName} (${delegate.company})` : id;
        });

        const row: Record<string, string> = {
          // Sponsor info
          'Company Name': intake?.companyName || sponsor?.companyName || '',
          'Contact Name': intake ? `${intake.firstName} ${intake.lastName}` : sponsor?.contactName || '',
          'Contact Email': intake?.email || sponsor?.contactEmail || '',
          'Job Title': intake?.jobTitle || '',
          'LinkedIn': intake?.linkedinUrl || '',
          'Meeting Package': intake?.meetingPackage || '',
          // Intake fields
          'Technology Type': intake?.technologyType || '',
          'Target Org Size': intake?.targetOrgSize || '',
          'Company Boilerplate': intake?.companyBoilerplate || '',
          'Key Challenges': intake?.keyChallenges || '',
          // Second rep
          'Second Rep Name': intake?.secondRepName || '',
          'Second Rep Email': intake?.secondRepEmail || '',
          'Second Rep Job Title': intake?.secondRepJobTitle || '',
          'Second Rep LinkedIn': intake?.secondRepLinkedinUrl || '',
          // Logo
          'Logo URL': intake?.companyLogoUrl || '',
          // Submission metadata
          'Intake Submitted': intake?.submittedAt ? new Date(intake.submittedAt).toLocaleDateString('en-GB') : '',
          'Rankings Submitted': rankings?.submittedAt ? new Date(rankings.submittedAt).toLocaleDateString('en-GB') : '',
          'Rankings Status': rankings?.status || 'pending',
          'Reviewed By': rankings?.reviewedBy || '',
        };

        // Add all ranked delegates as individual priority columns
        for (let i = 0; i < allRankedNames.length; i++) {
          row[`Priority ${i + 1}`] = allRankedNames[i] || '';
        }

        rows.push(row);
      }

      // Sort by company name
      rows.sort((a, b) => a['Company Name'].localeCompare(b['Company Name']));

      return rows;
    }),

    // Export all meetings as CSV data with full details
    getAllMeetingsExport: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional().default(false) }).optional())
      .query(async ({ input }) => {
        const includeTestAccounts = input?.includeTestAccounts ?? false;
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);

        const slotLabels: Record<number, { day: string; time: string }> = {
          1:  { day: 'Day 1 (Wed 25 Mar)', time: '10:15–10:45' },
          2:  { day: 'Day 1 (Wed 25 Mar)', time: '10:45–11:15' },
          3:  { day: 'Day 1 (Wed 25 Mar)', time: '13:30–14:00' },
          4:  { day: 'Day 1 (Wed 25 Mar)', time: '14:00–14:30' },
          5:  { day: 'Day 1 (Wed 25 Mar)', time: '14:45–15:15' },
          6:  { day: 'Day 1 (Wed 25 Mar)', time: '15:15–15:45' },
          7:  { day: 'Day 2 (Thu 26 Mar)', time: '10:30–11:00' },
          8:  { day: 'Day 2 (Thu 26 Mar)', time: '11:00–11:30' },
          9:  { day: 'Day 2 (Thu 26 Mar)', time: '13:15–13:45' },
          10: { day: 'Day 2 (Thu 26 Mar)', time: '13:45–14:15' },
          11: { day: 'Day 2 (Thu 26 Mar)', time: '14:30–15:00' },
          12: { day: 'Day 2 (Thu 26 Mar)', time: '15:00–15:30' },
        };

        const allMeetingsRaw = await db.getAllMeetings();
        const allSponsors = await db.getAllSponsors();
        const allIntakeSubmissions = await db.getAllIntakeSubmissions();
        const allRankingsSubmissions = await db.getAllRankingsSubmissions();

        // Build sponsor lookup maps
        const sponsorMap = new Map(allSponsors.map(s => [s.id, s]));
        const intakeMap = new Map(allIntakeSubmissions.map(i => [i.sponsorId, i]));

        // Assign table numbers: sponsors sorted alphabetically.
        // Single-rep sponsors get one table number.
        // 2-rep sponsors (attendeeNumber 1 and 2) each get their OWN separate table — they run independent meetings.
        // We build a map keyed by (sponsorId, attendeeNumber) -> tableNumber.
        const exportSortedSponsors = [...allSponsors]
          .filter(s => !new Set([270001, 510003, 30001, 60001, 90001, 120001]).has(s.id))
          .sort((a, b) => a.companyName.localeCompare(b.companyName));

        // Determine which sponsors have 2 reps (attendeeNumber 2 exists in filtered meetings)
        const filteredForTable = allMeetingsRaw.filter(m => {
          if (new Set([270001, 510003, 30001, 60001, 90001, 120001]).has(m.sponsorId)) return false;
          return true;
        });
        const sponsorsWithRep2 = new Set(
          filteredForTable.filter(m => m.attendeeNumber === 2).map(m => m.sponsorId)
        );

        // Assign table numbers sequentially: single-rep sponsors get 1 slot, 2-rep sponsors get 2 slots
        const exportTableMap = new Map<string, number>(); // key: `${sponsorId}-${attendeeNumber}`
        let tableCounter = 1;
        for (const s of exportSortedSponsors) {
          exportTableMap.set(`${s.id}-1`, tableCounter++);
          if (sponsorsWithRep2.has(s.id)) {
            exportTableMap.set(`${s.id}-2`, tableCounter++);
          }
        }

        // Build rankings lookup: sponsorId -> top-10 ranked attendee IDs (for In Top 10 flag)
        // and sponsorId -> Map<attendeeId, rankPosition> (for exact rank column)
        const rankingsTop10Map = new Map<number, Set<string>>();
        const rankPositionMap = new Map<number, Map<string, number>>();
        const latestRankingsBySponsor = new Map<number, typeof allRankingsSubmissions[0]>();
        for (const sub of allRankingsSubmissions) {
          const existing = latestRankingsBySponsor.get(sub.sponsorId);
          if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
            latestRankingsBySponsor.set(sub.sponsorId, sub);
          }
        }
        for (const [sponsorId, sub] of Array.from(latestRankingsBySponsor.entries())) {
          try {
            const parsed = JSON.parse(sub.rankingsData as string);
            const ids: string[] = Array.isArray(parsed)
              ? parsed.map((item: any) => (typeof item === 'string' ? item : item.id ?? item.attendeeId ?? ''))
              : [];
            rankingsTop10Map.set(sponsorId, new Set(ids.slice(0, 10)));
            const posMap = new Map<string, number>();
            ids.forEach((id, idx) => { if (id) posMap.set(id, idx + 1); });
            rankPositionMap.set(sponsorId, posMap);
          } catch {
            rankingsTop10Map.set(sponsorId, new Set());
            rankPositionMap.set(sponsorId, new Map());
          }
        }

        // Build priority tags lookup: sponsorId -> Set of attendeeIds
        // Fetch all priority tags from DB (leader opt-ins tagged by admin)
        const { priorityTags: priorityTagsTable } = await import('../drizzle/schema');
        const drizzleDb = await db.getDb();
        const allPriorityTagsList = drizzleDb ? await drizzleDb.select().from(priorityTagsTable) : [];
        const priorityTagsMap = new Map<number, Set<string>>();
        for (const tag of allPriorityTagsList) {
          if (!priorityTagsMap.has(tag.sponsorId)) priorityTagsMap.set(tag.sponsorId, new Set());
          priorityTagsMap.get(tag.sponsorId)!.add(tag.attendeeId);
        }

        // Filter meetings
        const filteredMeetings = allMeetingsRaw.filter(m => {
          if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(m.sponsorId)) return false;
          if (!includeTestAccounts && TEST_SPONSOR_IDS.has(m.sponsorId)) return false;
          return true;
        });

        // Build CSV rows
        const rows = filteredMeetings.map(meeting => {
          const sponsor = sponsorMap.get(meeting.sponsorId);
          const intake = intakeMap.get(meeting.sponsorId);
          const delegate = attendees.find(a => a.id === meeting.attendeeId);
          const slotInfo = meeting.timeSlot ? slotLabels[meeting.timeSlot] : null;
          const isTop10 = rankingsTop10Map.get(meeting.sponsorId)?.has(meeting.attendeeId) ?? false;
          const vendorRank = rankPositionMap.get(meeting.sponsorId)?.get(meeting.attendeeId) ?? null;
          const hasLeaderOptIn = priorityTagsMap.get(meeting.sponsorId)?.has(meeting.attendeeId) ?? false;
          // Check if delegate opted in via their delegate form
          const sponsorName = (sponsor?.companyName ?? intake?.companyName ?? '').toLowerCase();
          const hasDelegateOptIn = (delegate?.optInSponsors ?? []).some((s: string) =>
            s.toLowerCase().includes(sponsorName) || sponsorName.includes(s.toLowerCase())
          );

          // Determine which rep this meeting belongs to
          const isRep2 = meeting.attendeeNumber === 2;
          const rep1Name = intake ? `${intake.firstName ?? ''} ${intake.lastName ?? ''}`.trim() : (sponsor?.contactName ?? '');
          const rep1Email = intake?.email ?? sponsor?.contactEmail ?? '';
          const rep2Name = intake?.secondRepName?.trim() || rep1Name;
          const rep2Email = intake?.secondRepEmail?.trim() || rep1Email;
          const repName = isRep2 ? rep2Name : rep1Name;
          const repEmail = isRep2 ? rep2Email : rep1Email;

          const attendeeNum = meeting.attendeeNumber ?? 1;
          const tableNum = exportTableMap.get(`${meeting.sponsorId}-${attendeeNum}`);

          return {
            // Vendor details
            'Vendor Name': sponsor?.companyName ?? intake?.companyName ?? `Sponsor #${meeting.sponsorId}`,
            'Vendor Rep Name': repName,
            'Vendor Rep Email': repEmail,
            'Table Number': tableNum != null ? `Table ${tableNum}` : '',
            // Delegate details
            'Delegate Name': delegate ? `${delegate.firstName} ${delegate.lastName}` : meeting.attendeeId,
            'Delegate Company': delegate?.company ?? '',
            'Delegate Job Title': delegate?.jobTitle ?? '',
            'Delegate Company Size': delegate?.companySize ?? '',
            'Delegate Industry': delegate?.industry ?? '',
            'Delegate Team Size': delegate?.teamSize ?? '',
            'Delegate Regional Remit': delegate?.regionalRemit ?? '',
            'Budget Authority': delegate?.budgetAuthority ?? '',
            'Contract Sign-Off': delegate?.contractSignOff ?? '',
            'Active Budget Range': delegate?.activeBudgetRange ?? '',
            'Active Confirmed Projects': delegate?.activeConfirmedProjects ?? '',
            'Primary Meeting Objective': delegate?.primaryMeetingObjective ?? '',
            'Key Solution Areas of Interest': delegate?.keySolutionAreasOfInterest ?? '',
            'Current Pain Points': delegate?.currentPainPoints ?? '',
            'Current Project Stage': delegate?.currentProjectStage ?? '',
            'Assessment Tool': delegate?.assessmentTool ?? '',
            'ATS': delegate?.ats ?? '',
            'CRM': delegate?.crm ?? '',
            'Market Intelligence': delegate?.marketIntelligence ?? '',
            // Priority flags
            'Vendor Rank': vendorRank != null ? `#${vendorRank}` : '',
            'In Vendor Top 10': isTop10 ? 'Yes' : 'No',
            'Leader Opt-In': hasLeaderOptIn ? 'Yes' : 'No',
            'Delegate Form Opt-In': hasDelegateOptIn ? 'Yes' : 'No',
            // Meeting slot info
            'Meeting Slot': meeting.timeSlot ? `Slot ${meeting.timeSlot}` : 'Unassigned',
            'Meeting Time': slotInfo?.time ?? '',
            'Meeting Day': slotInfo?.day ?? '',
            // Match quality
            'Match Score': meeting.matchScore ? `${meeting.matchScore}%` : '',
            'Match Reason': meeting.matchReason ?? '',
            // Status
            'Status': meeting.status,
            // Rescheduled flag
            'Rescheduled': meeting.isRescheduled ? 'Yes' : 'No',
            // Post-event rating
            'Meeting Rating': meeting.meetingRating != null ? `${meeting.meetingRating}/5` : '',
            // Post-event notes
            'Meeting Notes': meeting.meetingNotes ?? '',
          };
        });
        // Sort by vendor name then slot
        rows.sort((a, b) => {
          const vendorCmp = a['Vendor Name'].localeCompare(b['Vendor Name']);
          if (vendorCmp !== 0) return vendorCmp;
          const slotA = parseInt(a['Meeting Slot'].replace('Slot ', '')) || 99;
          const slotB = parseInt(b['Meeting Slot'].replace('Slot ', '')) || 99;
          return slotA - slotB;
        });
        return rows;
      }),
    // Get all meeting feedback notes for admin view
    getFeedbackNotes: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional().default(false) }).optional())
      .query(async ({ input }) => {
        const includeTestAccounts = input?.includeTestAccounts ?? false;
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const allMeetingsRaw = await db.getAllMeetings();
        const allSponsorsRaw = await db.getAllSponsors();
        const attendees = await db.getAllDelegateProfiles();
        const allSponsors = allSponsorsRaw.filter(s => {
          if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(s.id)) return false;
          if (!includeTestAccounts && TEST_SPONSOR_IDS.has(s.id)) return false;
          return true;
        });
        const validSponsorIds = new Set(allSponsors.map(s => s.id));
        const sponsorMap = new Map(allSponsors.map(s => [s.id, s]));
        // Only meetings with notes or ratings
        const feedbackMeetings = allMeetingsRaw.filter(
          m => validSponsorIds.has(m.sponsorId) &&
            ((m.meetingNotes && m.meetingNotes.trim().length > 0) ||
             (m.meetingRating != null && m.meetingRating > 0))
        );
        return feedbackMeetings.map(m => {
          const sponsor = sponsorMap.get(m.sponsorId);
          const delegate = attendees.find(a => a.attendeeId === m.attendeeId);
          return {
            meetingId: m.id,
            sponsorId: m.sponsorId,
            sponsorName: sponsor?.companyName ?? `Sponsor #${m.sponsorId}`,
            delegateName: delegate ? `${delegate.firstName} ${delegate.lastName}` : m.attendeeId,
            delegateCompany: delegate?.company ?? '',
            delegateJobTitle: delegate?.jobTitle ?? '',
            timeSlot: m.timeSlot,
            meetingRating: m.meetingRating ?? null,
            meetingNotes: m.meetingNotes ?? '',
          };
        }).sort((a, b) => a.sponsorName.localeCompare(b.sponsorName));
      }),

    clearSponsorRatings: adminProcedure
      .input(z.object({ sponsorId: z.number() }))
      .mutation(async ({ input }) => {
        await db.clearSponsorRatings(input.sponsorId);
        return { success: true };
      }),

    // Toggle a meeting's rescheduled flag (shows/hides gold star on public table plan)
    toggleMeetingRescheduled: adminProcedure
      .input(z.object({ meetingId: z.number(), isRescheduled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleMeetingRescheduled(input.meetingId, input.isRescheduled);
        return { success: true };
      }),

    // Get all meetings with their rescheduled status (for admin management page)
    getAllMeetingsWithRescheduled: adminProcedure
      .query(async () => {
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const allMeetingsRaw = await db.getAllMeetings();
        const allSponsorsRaw = await db.getAllSponsors();
        const sponsorMap = new Map(allSponsorsRaw.map((s: any) => [s.id, s]));
        return allMeetingsRaw
          .filter((m: any) => {
            const sponsor = sponsorMap.get(m.sponsorId);
            if (!sponsor) return false;
            if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(m.sponsorId)) return false;
            if (TEST_SPONSOR_IDS.has(m.sponsorId)) return false;
            if (m.status === 'declined') return false;
            if (m.isVisible === 0) return false;
            return true;
          })
          .map((m: any) => {
            const sponsor = sponsorMap.get(m.sponsorId);
            const delegate = attendees.find((a: any) => a.id === m.attendeeId);
            return {
              id: m.id,
              sponsorId: m.sponsorId,
              sponsorName: sponsor?.companyName ?? 'Unknown',
              delegateName: delegate ? `${delegate.firstName} ${delegate.lastName}` : m.attendeeId,
              delegateCompany: delegate?.company ?? '',
              timeSlot: m.timeSlot,
              isRescheduled: m.isRescheduled === 1,
            };
          })
          .sort((a: any, b: any) => a.sponsorName.localeCompare(b.sponsorName));
      }),

    // Per-sponsor meeting report — all meetings with delegate info, match %, opt-in, rating, AI reason
    // Blocked (throws) if any visible meetings for this sponsor are unrated
    getSponsorReport: adminProcedure
      .input(z.object({ sponsorId: z.number() }))
      .query(async ({ input }) => {
        const allSponsorsRaw = await db.getAllSponsors();
        const sponsor = (allSponsorsRaw as any[]).find((s: any) => s.id === input.sponsorId);

        const allMeetings = await db.getMeetingsBySponsor(input.sponsorId);
        // Only visible, non-declined meetings
        const visibleMeetings = (allMeetings as any[]).filter(
          (m: any) => m.isVisible === 1 && m.status !== 'declined'
        );

        // Block if any meetings are unrated
        const unratedCount = visibleMeetings.filter((m: any) => !m.meetingRating).length;
        if (unratedCount > 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `${unratedCount} meeting${unratedCount === 1 ? ' is' : 's are'} not yet rated. All meetings must be rated before generating this report.`,
          });
        }

        // Get sponsor rankings to determine rank position for each delegate
        const rankingsSubmissions = await db.getRankingsSubmissionsBySponsor(input.sponsorId);
        let rankedAttendeeIds: string[] = [];
        if (rankingsSubmissions.length > 0 && rankingsSubmissions[0].rankingsData) {
          try {
            rankedAttendeeIds = JSON.parse(rankingsSubmissions[0].rankingsData);
          } catch {}
        }

        const sponsorNameLower = (sponsor.companyName ?? '').toLowerCase();

        const meetings = visibleMeetings.map((m: any) => {
          const delegate = attendees.find((a: any) => a.id === m.attendeeId);
          const rankIndex = rankedAttendeeIds.indexOf(m.attendeeId);
          const rankPosition = rankIndex >= 0 ? rankIndex + 1 : null;
          const optedIn = delegate
            ? ((delegate as any).optInSponsors ?? []).some((s: string) =>
                s.toLowerCase().includes(sponsorNameLower) ||
                sponsorNameLower.includes(s.toLowerCase())
              )
            : false;

          return {
            meetingId: m.id,
            timeSlot: m.timeSlot,
            delegateName: delegate ? `${(delegate as any).firstName} ${(delegate as any).lastName}` : m.attendeeId,
            delegateCompany: (delegate as any)?.company ?? '',
            delegateJobTitle: (delegate as any)?.jobTitle ?? '',
            matchScore: m.matchScore ?? null,
            matchReason: m.matchReason ?? null,
            optedIn,
            rankPosition,
            meetingRating: m.meetingRating,
            opportunityTier: m.meetingRating >= 4 ? 'green' : m.meetingRating === 3 ? 'yellow' : m.meetingRating === 2 ? 'orange' : 'red',
          };
        }).sort((a: any, b: any) => (a.timeSlot ?? 99) - (b.timeSlot ?? 99));

        const totalMeetings = meetings.length;
        const avgRating = totalMeetings > 0
          ? meetings.reduce((sum: number, m: any) => sum + (m.meetingRating ?? 0), 0) / totalMeetings
          : 0;

        return {
          sponsorId: sponsor.id,
          sponsorName: sponsor.companyName,
          totalMeetings,
          avgRating: Math.round(avgRating * 100) / 100,
          meetings,
        };
      }),

    // List all sponsors with meeting/rating counts for the report selector
    getReportableSponsorStatus: adminProcedure
      .query(async () => {
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const allSponsorsRaw = await db.getAllSponsors();
        const allMeetingsRaw = await db.getAllMeetings();

        return (allSponsorsRaw as any[])
          .map((s: any) => {
            const meetings = (allMeetingsRaw as any[]).filter(
              (m: any) => m.sponsorId === s.id && m.isVisible === 1 && m.status !== 'declined'
            );
            const rated = meetings.filter((m: any) => m.meetingRating != null && m.meetingRating > 0).length;
            return {
              id: s.id,
              name: s.companyName,
              totalMeetings: meetings.length,
              ratedMeetings: rated,
              allRated: meetings.length > 0 && rated === meetings.length,
            };
          })
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
      }),
    // ── Matching Intelligence ──────────────────────────────────────────────────

    // 1. Top-N Ranking Coverage: for each sponsor, how many of their top-N
    //    ranked delegates (sliding to fill cancelled slots) made it into the schedule.
    getTopNCoverage: adminProcedure.query(async () => {
      const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
      const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
      const SPONSOR_MEETING_COUNT_OVERRIDES: Record<number, number> = {
        450001: 12, 750001: 24, 870001: 12, 390001: 10,
      };

      const allSponsorsRaw = await db.getAllSponsors();
      const allMeetingsRaw = await db.getAllMeetings();
      // Active attendee IDs — from attendees.ts (only present delegates are in this list)
      const allAttendeesRaw = attendees as any[];
      const activeAttendeeIds = new Set(allAttendeesRaw.map((a: any) => a.id));

      const results: Array<{
        sponsorId: number;
        sponsorName: string;
        quota: number;
        metFromTopN: number;
        cancelledSkipped: number;
        hitPct: number;
        avgRating: number | null;
        ratedCount: number;
      }> = [];

      for (const sponsor of allSponsorsRaw as any[]) {
        if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsor.id)) continue;
        if (TEST_SPONSOR_IDS.has(sponsor.id)) continue;

        const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsor.id);
        const quota = SPONSOR_MEETING_COUNT_OVERRIDES[sponsor.id] ??
          (intakeSubmission?.meetingPackage === '20' ? 20 : 12);

        // Get latest rankings submission
        const rankingsSubs = await db.getRankingsSubmissionsBySponsor(sponsor.id);
        if (!rankingsSubs.length) continue;
        const latestSub = rankingsSubs[0];
        let rankedIds: number[] = [];
        try {
          rankedIds = JSON.parse(latestSub.rankingsData || '[]');
        } catch { continue; }
        if (!rankedIds.length) continue;

        // Slide down to fill cancelled slots — collect first `quota` active ranked delegates
        const effectiveTopN: number[] = [];
        let cancelledSkipped = 0;
        for (const id of rankedIds) {
          if (effectiveTopN.length >= quota) break;
          if (activeAttendeeIds.has(id)) {
            effectiveTopN.push(id);
          } else {
            cancelledSkipped++;
          }
        }

        // Sponsor's actual scheduled meetings (visible, not declined)
        const sponsorMeetings = (allMeetingsRaw as any[]).filter(
          (m: any) => m.sponsorId === sponsor.id && m.isVisible === 1 && m.status !== 'declined'
        );
        const scheduledDelegateIds = new Set(sponsorMeetings.map((m: any) => m.attendeeId));

        const metFromTopN = effectiveTopN.filter(id => scheduledDelegateIds.has(id)).length;
        const hitPct = effectiveTopN.length > 0 ? Math.round((metFromTopN / effectiveTopN.length) * 100) : 0;

        // Post-event avg rating
        const ratedMeetings = sponsorMeetings.filter((m: any) => m.meetingRating != null && m.meetingRating > 0);
        const avgRating = ratedMeetings.length > 0
          ? Math.round((ratedMeetings.reduce((s: number, m: any) => s + m.meetingRating, 0) / ratedMeetings.length) * 10) / 10
          : null;

        results.push({
          sponsorId: sponsor.id,
          sponsorName: sponsor.companyName,
          quota,
          metFromTopN,
          cancelledSkipped,
          hitPct,
          avgRating,
          ratedCount: ratedMeetings.length,
        });
      }

      return results.sort((a, b) => b.hitPct - a.hitPct);
    }),

    // 6. Sponsor Schedule Confidence Score: combines hit rate, avg match score,
    //    opt-in overlap, and (if available) post-event avg rating into a single score.
    getScheduleConfidence: adminProcedure.query(async () => {
      const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
      const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
      const SPONSOR_MEETING_COUNT_OVERRIDES: Record<number, number> = {
        450001: 12, 750001: 24, 870001: 12, 390001: 10,
      };

      const allSponsorsRaw = await db.getAllSponsors();
      const allMeetingsRaw = await db.getAllMeetings();
      // Active attendee IDs — from attendees.ts
      const allAttendeesRaw = attendees as any[];
      const activeAttendeeIds = new Set(allAttendeesRaw.map((a: any) => a.id));

      const results: Array<{
        sponsorId: number;
        sponsorName: string;
        confidenceScore: number;
        hitRate: number;
        avgMatchScore: number;
        optInOverlap: number;
        avgRating: number | null;
        ratedCount: number;
        totalMeetings: number;
        breakdown: { hitRate: number; matchScore: number; optIn: number; feedback: number };
      }> = [];

      for (const sponsor of allSponsorsRaw as any[]) {
        if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsor.id)) continue;
        if (TEST_SPONSOR_IDS.has(sponsor.id)) continue;

        const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsor.id);
        const quota = SPONSOR_MEETING_COUNT_OVERRIDES[sponsor.id] ??
          (intakeSubmission?.meetingPackage === '20' ? 20 : 12);

        const rankingsSubs = await db.getRankingsSubmissionsBySponsor(sponsor.id);
        if (!rankingsSubs.length) continue;
        const latestSub = rankingsSubs[0];
        let rankedIds: number[] = [];
        try { rankedIds = JSON.parse(latestSub.rankingsData || '[]'); } catch { continue; }
        if (!rankedIds.length) continue;

        // Effective top-N (sliding)
        const effectiveTopN: number[] = [];
        for (const id of rankedIds) {
          if (effectiveTopN.length >= quota) break;
          if (activeAttendeeIds.has(id)) effectiveTopN.push(id);
        }

        const sponsorMeetings = (allMeetingsRaw as any[]).filter(
          (m: any) => m.sponsorId === sponsor.id && m.isVisible === 1 && m.status !== 'declined'
        );
        if (!sponsorMeetings.length) continue;

        const scheduledDelegateIds = new Set(sponsorMeetings.map((m: any) => m.attendeeId));
        const metFromTopN = effectiveTopN.filter(id => scheduledDelegateIds.has(id)).length;
        const hitRate = effectiveTopN.length > 0 ? (metFromTopN / effectiveTopN.length) * 100 : 0;

        // Avg match score
        const matchScores = sponsorMeetings.map((m: any) => m.matchScore).filter((s: any) => s != null);
        const avgMatchScore = matchScores.length > 0
          ? matchScores.reduce((a: number, b: number) => a + b, 0) / matchScores.length
          : 0;

        // Opt-in overlap: % of scheduled meetings where delegate opted in
        const optInMeetings = sponsorMeetings.filter((m: any) => {
          const attendee = (allAttendeesRaw as any[]).find((a: any) => a.id === m.attendeeId);
          if (!attendee?.optInSponsors) return false;
          try {
            const optIns: number[] = JSON.parse(attendee.optInSponsors);
            return optIns.includes(sponsor.id);
          } catch { return false; }
        });
        const optInOverlap = (optInMeetings.length / sponsorMeetings.length) * 100;

        // Post-event avg rating
        const ratedMeetings = sponsorMeetings.filter((m: any) => m.meetingRating != null && m.meetingRating > 0);
        const avgRating = ratedMeetings.length > 0
          ? ratedMeetings.reduce((s: number, m: any) => s + m.meetingRating, 0) / ratedMeetings.length
          : null;

        // Confidence score formula (pre-event weights):
        //   40% hit rate (0-100 → 0-40)
        //   35% avg match score (0-100 → 0-35)
        //   25% opt-in overlap (0-100 → 0-25)
        // If post-event feedback available, blend in: 30% feedback (1-5 → 0-100), reduce others proportionally
        let confidenceScore: number;
        let breakdown: { hitRate: number; matchScore: number; optIn: number; feedback: number };

        if (avgRating !== null && ratedMeetings.length >= Math.ceil(sponsorMeetings.length * 0.5)) {
          // Post-event mode: feedback available for ≥50% of meetings
          const feedbackNorm = ((avgRating - 1) / 4) * 100; // 1-5 → 0-100
          confidenceScore = Math.round(
            hitRate * 0.30 + avgMatchScore * 0.25 + optInOverlap * 0.15 + feedbackNorm * 0.30
          );
          breakdown = {
            hitRate: Math.round(hitRate * 0.30),
            matchScore: Math.round(avgMatchScore * 0.25),
            optIn: Math.round(optInOverlap * 0.15),
            feedback: Math.round(feedbackNorm * 0.30),
          };
        } else {
          // Pre-event mode
          confidenceScore = Math.round(hitRate * 0.40 + avgMatchScore * 0.35 + optInOverlap * 0.25);
          breakdown = {
            hitRate: Math.round(hitRate * 0.40),
            matchScore: Math.round(avgMatchScore * 0.35),
            optIn: Math.round(optInOverlap * 0.25),
            feedback: 0,
          };
        }

        results.push({
          sponsorId: sponsor.id,
          sponsorName: sponsor.companyName,
          confidenceScore: Math.min(100, Math.max(0, confidenceScore)),
          hitRate: Math.round(hitRate),
          avgMatchScore: Math.round(avgMatchScore),
          optInOverlap: Math.round(optInOverlap),
          avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
          ratedCount: ratedMeetings.length,
          totalMeetings: sponsorMeetings.length,
          breakdown,
        });
      }

      return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
    }),

    // 8. Algorithm Weight Simulator: given custom weights for rankings/AI/opt-in,
    //    preview what the top-N hit rates and avg match scores would look like.
    simulateWeights: adminProcedure
      .input(z.object({
        rankingsWeight: z.number().min(0).max(100),
        aiWeight: z.number().min(0).max(100),
        optInWeight: z.number().min(0).max(100),
      }))
      .query(async ({ input }) => {
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const SPONSOR_MEETING_COUNT_OVERRIDES: Record<number, number> = {
          450001: 12, 750001: 24, 870001: 12, 390001: 10,
        };

        // Normalise weights to sum to 1
        const total = input.rankingsWeight + input.aiWeight + input.optInWeight;
        const wRank = total > 0 ? input.rankingsWeight / total : 0.55;
        const wAI = total > 0 ? input.aiWeight / total : 0.40;
        const wOptIn = total > 0 ? input.optInWeight / total : 0.05;

        const allSponsorsRaw = await db.getAllSponsors();
        const allMeetingsRaw = await db.getAllMeetings();
        // Active attendee IDs — from attendees.ts
        const allAttendeesRaw = attendees as any[];
        const activeAttendeeIds = new Set(allAttendeesRaw.map((a: any) => a.id));

        // Build opt-in map: attendeeId → Set<sponsorId>
        const optInMap = new Map<number, Set<number>>();
        for (const att of allAttendeesRaw as any[]) {
          try {
            const names: string[] = Array.isArray(att.optInSponsors) ? att.optInSponsors : JSON.parse(att.optInSponsors || '[]');
            // Store sponsor names for lookup
            (att as any)._optInNames = new Set(names.map((n: string) => n.toLowerCase()));
            optInMap.set(att.id, new Set<number>()); // placeholder
          } catch { optInMap.set(att.id, new Set()); }
        }

        const results: Array<{
          sponsorId: number;
          sponsorName: string;
          quota: number;
          simMetFromTopN: number;
          simHitPct: number;
          simAvgScore: number;
          actualHitPct: number;
          delta: number;
        }> = [];

        for (const sponsor of allSponsorsRaw as any[]) {
          if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsor.id)) continue;
          if (TEST_SPONSOR_IDS.has(sponsor.id)) continue;

          const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsor.id);
          const quota = SPONSOR_MEETING_COUNT_OVERRIDES[sponsor.id] ??
            (intakeSubmission?.meetingPackage === '20' ? 20 : 12);

          const rankingsSubs = await db.getRankingsSubmissionsBySponsor(sponsor.id);
          if (!rankingsSubs.length) continue;
          const latestSub = rankingsSubs[0];
          let rankedIds: number[] = [];
          try { rankedIds = JSON.parse(latestSub.rankingsData || '[]'); } catch { continue; }
          if (!rankedIds.length) continue;

          // Build rank position map (lower = better)
          const rankPos = new Map<number, number>();
          rankedIds.forEach((id, i) => rankPos.set(id, i + 1));

          // Get all active attendees as candidate pool
          const candidates = (allAttendeesRaw as any[]).filter((a: any) => a.isVisible !== 0);

          // Score each candidate under the simulated weights
          const scored = candidates.map((att: any) => {
            const pos = rankPos.get(att.id);
            // Rank score: ranked delegates get score based on position (1st = 1.0, last = 0.0)
            const rankScore = pos != null
              ? Math.max(0, 1 - (pos - 1) / Math.max(rankedIds.length - 1, 1))
              : 0;
            // AI match score (normalised 0-1)
            const sponsorMeeting = (allMeetingsRaw as any[]).find(
              (m: any) => m.sponsorId === sponsor.id && m.attendeeId === att.id && m.isVisible === 1
            );
            const aiScore = sponsorMeeting?.matchScore != null ? sponsorMeeting.matchScore / 100 : 0.5;
            // Opt-in bonus
            const optInBonus = ((att as any)._optInNames?.has(sponsor.companyName?.toLowerCase() ?? '') ? 1 : 0);

            return {
              attendeeId: att.id,
              score: wRank * rankScore + wAI * aiScore + wOptIn * optInBonus,
              aiScore,
            };
          });

          // Sort by simulated score descending, take top quota
          scored.sort((a: any, b: any) => b.score - a.score);
          const simTopN = scored.slice(0, quota);
          const simTopNIds = new Set(simTopN.map((s: any) => s.attendeeId));

          // Actual scheduled meetings
          const sponsorMeetings = (allMeetingsRaw as any[]).filter(
            (m: any) => m.sponsorId === sponsor.id && m.isVisible === 1 && m.status !== 'declined'
          );
          const scheduledIds = new Set(sponsorMeetings.map((m: any) => m.attendeeId));

          // Effective actual top-N (sliding)
          const effectiveTopN: number[] = [];
          for (const id of rankedIds) {
            if (effectiveTopN.length >= quota) break;
            if (activeAttendeeIds.has(id)) effectiveTopN.push(id);
          }
          const actualMet = effectiveTopN.filter(id => scheduledIds.has(id)).length;
          const actualHitPct = effectiveTopN.length > 0 ? Math.round((actualMet / effectiveTopN.length) * 100) : 0;

          // Simulated: how many of simTopN are in the actual schedule
          const simMet = Array.from(simTopNIds).filter(id => scheduledIds.has(id)).length;
          const simHitPct = quota > 0 ? Math.round((simMet / quota) * 100) : 0;
          const simAvgScore = simTopN.length > 0
            ? Math.round((simTopN.reduce((s: number, x: any) => s + x.aiScore * 100, 0) / simTopN.length))
            : 0;

          results.push({
            sponsorId: sponsor.id,
            sponsorName: sponsor.companyName,
            quota,
            simMetFromTopN: simMet,
            simHitPct,
            simAvgScore,
            actualHitPct,
            delta: simHitPct - actualHitPct,
          });
        }

        const overallSimHit = results.length > 0
          ? Math.round(results.reduce((s, r) => s + r.simHitPct, 0) / results.length)
          : 0;
        const overallActualHit = results.length > 0
          ? Math.round(results.reduce((s, r) => s + r.actualHitPct, 0) / results.length)
          : 0;

        return {
          weights: { rankingsWeight: input.rankingsWeight, aiWeight: input.aiWeight, optInWeight: input.optInWeight },
          overallSimHit,
          overallActualHit,
          delta: overallSimHit - overallActualHit,
          sponsors: results.sort((a, b) => b.simHitPct - a.simHitPct),
        };
      }),

  }),
});
export type AppRouter = typeof appRouter;
