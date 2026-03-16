import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./emailNotification";
import { notifyIntakeSubmission, notifyRankingsSubmission } from "./_core/emailNotification";
import { ENV } from "./_core/env";
import { generateAllMatches, saveMatches } from "./matchingEngine";
import { attendees } from "../client/src/lib/attendees";


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
      return await db.getSponsorByUserId(ctx.user.id);
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
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
      if (!sponsor) return [];
      const allMeetings = await db.getMeetingsBySponsor(sponsor.id);
      // Only return confirmed meetings that are visible (published to sponsor AND not hidden by admin)
      const confirmed = allMeetings.filter(m => m.status === 'confirmed' && m.isVisible === 1);
      const sponsorNameLower = (sponsor.companyName ?? '').toLowerCase();
      return confirmed.map(m => {
        const delegate = attendees.find(a => a.id === m.attendeeId);
        const hasDelegateOptIn = (delegate?.optInSponsors ?? []).some((s: string) =>
          s.toLowerCase().includes(sponsorNameLower) || sponsorNameLower.includes(s.toLowerCase())
        );
        return { ...m, hasDelegateOptIn };
      });
    }),
    // Get sponsor's own intake (for attendee names on meeting schedule)
    getMyIntake: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
      if (!sponsor) return null;
      return await db.getIntakeSubmissionBySponsor(sponsor.id);
    }),
  }),

  // Intake form router
  intake: router({    
    // Get user's intake submission
    getSubmission: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
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
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
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
        let sponsor = await db.getSponsorByUserId(ctx.user.id);
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
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
      if (!sponsor) return [];
      return await db.getRankingsSubmissionsBySponsor(sponsor.id);
    }),
    
    // Get user's latest rankings (for pre-populating form)
    getLatestRankings: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
      if (!sponsor) return null;
      const submissions = await db.getRankingsSubmissionsBySponsor(sponsor.id);
      // Return the most recent submission
      return submissions.length > 0 ? submissions[0] : null;
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
        await db.updateMeetingNotes(input.meetingId, input.adminNotes);
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
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        const includeTestAccounts = input?.includeTestAccounts ?? false;
        
        const allMatchResults = await generateMeetingsForAllSponsors();
        const savedResults: { sponsorId: number; meetingCount: number }[] = [];

        // ─── Global slot availability trackers ───────────────────────────────────
        // Tracks which time slots each delegate is already booked into across ALL sponsors
        // delegateUsedSlots: delegateId → Set<timeSlot>
        const delegateUsedSlots = new Map<string, Set<number>>();
        // Tracks which time slots each sponsor's attendee is already booked
        // sponsorUsedSlots: sponsorId → attendeeNumber → Set<timeSlot>
        const sponsorUsedSlots = new Map<number, Map<number, Set<number>>>();
        // Tracks how many meetings each delegate has been assigned across ALL sponsors
        // Used to enforce the 8-meeting cap globally (not just per-sponsor)
        const delegateMeetingCount = new Map<string, number>();
        const DELEGATE_MAX_MEETINGS = 8;

        // Valid slots: 1-6 (Day 1), 7-12 (Day 2)
        const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        // Sponsor-specific meeting count overrides (takes precedence over intake form package)
        const SPONSOR_MEETING_COUNT_OVERRIDES: Record<number, number> = {
          450001: 10,  // PerchPeek — 10 meetings
          750001: 24,  // SHL — 24 meetings
          870001: 12,  // Wilson — 12 meetings
        };

        for (const [sponsorId, matches] of Array.from(allMatchResults.entries())) {
          // Skip excluded sponsors
          if (ALWAYS_EXCLUDED_SPONSOR_IDS.has(sponsorId)) continue;
          if (!includeTestAccounts && TEST_SPONSOR_IDS.has(sponsorId)) continue;
          
          // Determine meeting count
          const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsorId);
          const meetingCount = SPONSOR_MEETING_COUNT_OVERRIDES[sponsorId] ??
            (intakeSubmission?.meetingPackage === '20' ? 20 : 12);

          // For sponsors with > 12 meetings they need 2 attendees
          // Attendee 1 gets the first half, Attendee 2 gets the second half
          const halfCount = Math.ceil(meetingCount / 2);
          const hasTwoAttendees = meetingCount > 12;

          // Initialise sponsor slot tracker
          if (!sponsorUsedSlots.has(sponsorId)) {
            sponsorUsedSlots.set(sponsorId, new Map<number, Set<number>>([[1, new Set<number>()], [2, new Set<number>()]]));
          }
          const sponsorSlots = sponsorUsedSlots.get(sponsorId)!;

          // Resolve sponsor rep names for per-attendee assignment
          const repName1 = intakeSubmission
            ? `${intakeSubmission.firstName} ${intakeSubmission.lastName}`.trim()
            : 'Attendee 1';
          const repName2 = intakeSubmission?.secondRepName
            ? intakeSubmission.secondRepName.trim()
            : repName1; // Fall back to primary rep if no second rep

          const matchesWithSlots: any[] = [];

          for (let i = 0; i < (matches as any[]).length; i++) {
            const match = (matches as any[])[i];

            // ─── Global 8-meeting cap check ───
            const currentDelegateCount = delegateMeetingCount.get(match.attendeeId) ?? 0;
            if (currentDelegateCount >= DELEGATE_MAX_MEETINGS) {
              console.log(`[Scheduling] Delegate ${match.attendeeId} has reached ${DELEGATE_MAX_MEETINGS}-meeting cap — skipping for sponsor ${sponsorId}`);
              continue; // Skip this delegate for this sponsor
            }

            // Determine which attendee this meeting belongs to
            const attendeeNumber = hasTwoAttendees ? (i < halfCount ? 1 : 2) : 1;
            // Resolve the sponsor rep name for this slot
            const sponsorRepName = attendeeNumber === 2 ? repName2 : repName1;

            // Get used slots for this delegate and this sponsor's attendee
            const delegateSlots = delegateUsedSlots.get(match.attendeeId) ?? new Set<number>();
            const sponsorAttendeeSlots = sponsorSlots.get(attendeeNumber) ?? new Set<number>();

            // Find the first slot that is free for BOTH the delegate and the sponsor's attendee
            const availableSlot = ALL_SLOTS.find(
              slot => !delegateSlots.has(slot) && !sponsorAttendeeSlots.has(slot)
            ) ?? null;

            if (availableSlot !== null) {
              // Mark this slot as used and increment delegate meeting count
              delegateSlots.add(availableSlot);
              sponsorAttendeeSlots.add(availableSlot);
              delegateUsedSlots.set(match.attendeeId, delegateSlots);
              sponsorSlots.set(attendeeNumber, sponsorAttendeeSlots);
              delegateMeetingCount.set(match.attendeeId, currentDelegateCount + 1);
            } else {
              console.warn(`[Scheduling] No available slot for delegate ${match.attendeeId} with sponsor ${sponsorId} — meeting will have null slot`);
            }

            matchesWithSlots.push({ ...match, timeSlot: availableSlot, attendeeNumber, sponsorRepName });
          }

          // Save to database (replace existing meetings)
          await db.deleteMeetingsBySponsor(sponsorId);
          for (const meeting of matchesWithSlots) {
            // Sanitise matchReason to remove control characters that could break JSON serialisation
            const safeReason = (meeting.matchReason || '')
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove non-printable control chars
              .replace(/\r\n|\r/g, ' ')  // Normalise line endings
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
        }
        
        return { success: true, results: savedResults, totalSponsors: savedResults.length };
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
    
    // Get analytics dashboard data
    getAnalytics: adminProcedure
      .input(z.object({ includeTestAccounts: z.boolean().optional().default(false) }).optional())
      .query(async ({ input }) => {
        const includeTestAccounts = input?.includeTestAccounts ?? false;

        // Test accounts (recruitmentevents.co) — toggled by includeTestAccounts flag
        const TEST_SPONSOR_IDS = new Set([30001, 60001, 90001, 120001]);
        // Always-excluded truly inactive/dummy accounts
        const ALWAYS_EXCLUDED_SPONSOR_IDS = new Set([270001, 510003]);
        // Jen Candee excluded from delegate analytics
        const EXCLUDED_DELEGATE_IDS = new Set(['150796696175']);

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
        
        // Calculate average utilization (meetings per delegate / max 6 = 2/hr × 3hrs/day × 2 days)
        const MAX_MEETINGS_PER_DELEGATE = 6;
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
          { slot: 7, label: 'Day 2 — 09:15–09:45', count: 0 },
          { slot: 8, label: 'Day 2 — 09:45–10:15', count: 0 },
          { slot: 9, label: 'Day 2 — 10:30–11:00', count: 0 },
          { slot: 10, label: 'Day 2 — 11:00–11:30', count: 0 },
          { slot: 11, label: 'Day 2 — 13:30–14:00', count: 0 },
          { slot: 12, label: 'Day 2 — 14:00–14:30', count: 0 },
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
        
        const mostInDemandDelegates = Array.from(demandScores.entries())
          .map(([attendeeId, demandScore]) => {
            const delegate = attendees.find(d => d.id === attendeeId);
            return {
              attendeeId,
              name: delegate ? `${delegate.firstName} ${delegate.lastName}` : 'Unknown',
              company: delegate?.company || 'Unknown',
              demandScore,
              rankingCount: allRankings.filter(r => {
                const rankedList = r.rankingsData ? JSON.parse(r.rankingsData) : [];
                return rankedList.includes(attendeeId);
              }).length,
            };
          })
          .sort((a, b) => b.demandScore - a.demandScore)
          .slice(0, 10);
        
        // Sponsor statistics (excluding test/inactive sponsors)
        const sponsorStats = await Promise.all(
          allSponsors.map(async (sponsor) => {
            const sponsorMeetings = allMeetings.filter(m => m.sponsorId === sponsor.id);
            const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsor.id);
            const totalSlots = intakeSubmission?.meetingPackage === '20' ? 20 : 12;
            const avgScore = sponsorMeetings.length > 0
              ? sponsorMeetings.reduce((sum, m) => sum + (m.matchScore || 0), 0) / sponsorMeetings.length
              : 0;
            
            return {
              sponsorId: sponsor.id,
              companyName: sponsor.companyName,
              meetingsScheduled: sponsorMeetings.length,
              totalSlots,
              avgMatchScore: avgScore,
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
      // Assign table numbers to sponsors (sorted by companyName for consistency)
      const sortedSponsors = [...allSponsors].sort((a, b) => a.companyName.localeCompare(b.companyName));
      const sponsorTableMap = new Map<number, number>();
      sortedSponsors.forEach((s, i) => sponsorTableMap.set(s.id, i + 1));
      const allMeetings = allMeetingsRaw.filter(
        m => validSponsorIds.has(m.sponsorId)
      );

      // Build floor plan: 12 slots total, 6 per day, 2 × 30-min per 1-hour block
      // Day 1 (Event Day 2): slots 1-6 | Day 2 (Event Day 3): slots 7-12
      const slotLabels: Record<number, { day: number; hour: number; round: number; time: string }> = {
        1:  { day: 1, hour: 1, round: 1, time: '10:15–10:45' },
        2:  { day: 1, hour: 1, round: 2, time: '10:45–11:15' },
        3:  { day: 1, hour: 2, round: 1, time: '13:30–14:00' },
        4:  { day: 1, hour: 2, round: 2, time: '14:00–14:30' },
        5:  { day: 1, hour: 3, round: 1, time: '14:45–15:15' },
        6:  { day: 1, hour: 3, round: 2, time: '15:15–15:45' },
        7:  { day: 2, hour: 1, round: 1, time: '09:15–09:45' },
        8:  { day: 2, hour: 1, round: 2, time: '09:45–10:15' },
        9:  { day: 2, hour: 2, round: 1, time: '10:30–11:00' },
        10: { day: 2, hour: 2, round: 2, time: '11:00–11:30' },
        11: { day: 2, hour: 3, round: 1, time: '13:30–14:00' },
        12: { day: 2, hour: 3, round: 2, time: '14:00–14:30' },
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
            tableNumber: sponsorTableMap.get(m.sponsorId) ?? 0,
            attendeeId: m.attendeeId,
            attendeeName: attendee ? `${attendee.firstName} ${attendee.lastName}` : m.attendeeId,
            attendeeCompany: attendee?.company ?? '',
            matchScore: m.matchScore,
            status: m.status,
          };
        }).sort((a, b) => a.tableNumber - b.tableNumber),
      }));

      return {
        slots,
        sponsors: sortedSponsors.map(s => ({
          id: s.id,
          companyName: s.companyName,
          tableNumber: sponsorTableMap.get(s.id) ?? 0,
        })),
        totalMeetings: allMeetings.length,
      };
    }),

    // Get admin activity log
    getActivityLog: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAdminActivityLog(input?.limit ?? 100);
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
          1:  { day: 'Day 2 (Wed 13 May)', time: '10:15–10:45' },
          2:  { day: 'Day 2 (Wed 13 May)', time: '10:45–11:15' },
          3:  { day: 'Day 2 (Wed 13 May)', time: '13:30–14:00' },
          4:  { day: 'Day 2 (Wed 13 May)', time: '14:00–14:30' },
          5:  { day: 'Day 2 (Wed 13 May)', time: '14:45–15:15' },
          6:  { day: 'Day 2 (Wed 13 May)', time: '15:15–15:45' },
          7:  { day: 'Day 3 (Thu 14 May)', time: '09:15–09:45' },
          8:  { day: 'Day 3 (Thu 14 May)', time: '09:45–10:15' },
          9:  { day: 'Day 3 (Thu 14 May)', time: '10:30–11:00' },
          10: { day: 'Day 3 (Thu 14 May)', time: '11:00–11:30' },
          11: { day: 'Day 3 (Thu 14 May)', time: '13:30–14:00' },
          12: { day: 'Day 3 (Thu 14 May)', time: '14:00–14:30' },
        };

        const allMeetingsRaw = await db.getAllMeetings();
        const allSponsors = await db.getAllSponsors();
        const allIntakeSubmissions = await db.getAllIntakeSubmissions();
        const allRankingsSubmissions = await db.getAllRankingsSubmissions();

        // Build sponsor lookup maps
        const sponsorMap = new Map(allSponsors.map(s => [s.id, s]));
        const intakeMap = new Map(allIntakeSubmissions.map(i => [i.sponsorId, i]));

        // Build rankings lookup: sponsorId -> top-10 ranked attendee IDs
        const rankingsTop10Map = new Map<number, Set<string>>();
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
              ? parsed.slice(0, 10).map((item: any) => (typeof item === 'string' ? item : item.id ?? item.attendeeId ?? ''))
              : [];
            rankingsTop10Map.set(sponsorId, new Set(ids));
          } catch { rankingsTop10Map.set(sponsorId, new Set()); }
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
          const hasLeaderOptIn = priorityTagsMap.get(meeting.sponsorId)?.has(meeting.attendeeId) ?? false;
          // Check if delegate opted in via their delegate form
          const sponsorName = (sponsor?.companyName ?? intake?.companyName ?? '').toLowerCase();
          const hasDelegateOptIn = (delegate?.optInSponsors ?? []).some((s: string) =>
            s.toLowerCase().includes(sponsorName) || sponsorName.includes(s.toLowerCase())
          );

          return {
            // Vendor details
            'Vendor Name': sponsor?.companyName ?? intake?.companyName ?? `Sponsor #${meeting.sponsorId}`,
            'Vendor Contact': intake ? `${intake.firstName} ${intake.lastName}` : sponsor?.contactName ?? '',
            'Vendor Email': intake?.email ?? sponsor?.contactEmail ?? '',
            'Attendee Number': meeting.attendeeNumber === 2 ? 'Attendee 2' : 'Attendee 1',
            // Delegate details
            'Delegate Name': delegate ? `${delegate.firstName} ${delegate.lastName}` : meeting.attendeeId,
            'Delegate Company': delegate?.company ?? '',
            'Delegate Job Title': delegate?.jobTitle ?? '',
            // Priority flags
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
  }),
});

export type AppRouter = typeof appRouter;
