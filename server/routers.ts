import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./emailNotification";
import { generateAllMatches, saveMatches } from "./matchingEngine";

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
  }),

  // Rankings router
  rankings: router({
    // Submit rankings
    submit: protectedProcedure
      .input(z.object({
        rankingsData: z.string(), // JSON string of ranked attendee IDs
      }))
      .mutation(async ({ ctx, input }) => {
        // Get or create sponsor
        let sponsor = await db.getSponsorByUserId(ctx.user.id);
        if (!sponsor) {
          throw new Error("Please complete your sponsor profile first");
        }

        // Create submission
        const submissionId = await db.createRankingsSubmission({
          sponsorId: sponsor.id,
          userId: ctx.user.id,
          rankingsData: input.rankingsData,
        });

        // Send notification to CS team and Bobby
        try {
          // Get admin portal URL
          const adminUrl = `${process.env.VITE_APP_URL || 'https://your-domain.com'}/admin`;
          
          // Send to Manus notification (project owner)
          await notifyOwner({
            title: "New Rankings Submission - RLX",
            content: `${sponsor.companyName} has submitted their meeting priorities.\n\nContact: ${sponsor.contactName} (${sponsor.contactEmail})\n\nView and download in admin dashboard: ${adminUrl}`,
          });
          
          // Send email to CS team and Bobby
          await sendEmail({
            to: ['clientsuccess@recruitmentevents.co', 'bobby@recruitmentevents.co'],
            subject: `New Rankings Submission - ${sponsor.companyName}`,
            body: `Hello,\n\n${sponsor.companyName} has submitted their meeting priorities for the RLX event.\n\nCompany: ${sponsor.companyName}\nContact: ${sponsor.contactName}\nEmail: ${sponsor.contactEmail}\nSubmission ID: #${submissionId}\n\nYou can view and download all submissions in the admin dashboard:\n${adminUrl}\n\nBest regards,\nRLX Onboarding System`,
            html: `<p>Hello,</p><p><strong>${sponsor.companyName}</strong> has submitted their meeting priorities for the RLX event.</p><ul><li><strong>Company:</strong> ${sponsor.companyName}</li><li><strong>Contact:</strong> ${sponsor.contactName}</li><li><strong>Email:</strong> ${sponsor.contactEmail}</li><li><strong>Submission ID:</strong> #${submissionId}</li></ul><p><a href="${adminUrl}" style="background-color: #7B4B94; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Admin Dashboard</a></p><p>Best regards,<br>RLX Onboarding System</p>`,
          });
        } catch (error) {
          console.error("Failed to send notification:", error);
        }

        return { success: true, submissionId };
      }),

    // Get user's own submissions
    mySubmissions: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
      if (!sponsor) return [];
      return await db.getRankingsSubmissionsBySponsor(sponsor.id);
    }),
  }),

  // Admin router (CS team dashboard)
  admin: router({
    // Get all rankings submissions
    getAllSubmissions: adminProcedure.query(async () => {
      return await db.getAllRankingsSubmissions();
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
    
    // Vendor profile management
    getVendorProfiles: adminProcedure.query(async () => {
      return await db.getVendorProfiles();
    }),
    
    uploadVendorProfile: adminProcedure
      .input(z.object({
        profileData: z.string(),
      }))
      .mutation(async ({ input }) => {
        const profile = JSON.parse(input.profileData);
        const id = await db.createVendorProfile({
          sponsorId: profile.sponsorId || 0,
          companyName: profile.companyName,
          solutions: profile.solutions || null,
          painPoints: profile.painPoints || null,
          targetIndustries: JSON.stringify(profile.targetIndustries || []),
          profileData: input.profileData,
        });
        return { success: true, id };
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
    
    getAllMeetings: adminProcedure.query(async () => {
      return await db.getAllMeetings();
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
    
    deletePriorityTag: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deletePriorityTag(input.id);
        return { success: true };
      }),
    
    // Update submission status
    updateSubmissionStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "reviewed", "processed"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateRankingsSubmissionStatus(input.id, input.status);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
