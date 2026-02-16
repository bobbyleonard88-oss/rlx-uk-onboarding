import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./emailNotification";
import { generateAllMatches, saveMatches } from "./matchingEngine";
import { readFileSync } from "fs";
import { join } from "path";

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
    // Get all submissions (rankings + intake, including partial submissions)
    getAllSubmissions: adminProcedure.query(async () => {
      const rankingsSubmissions = await db.getAllRankingsSubmissions();
      const allIntakeSubmissions = await db.getAllIntakeSubmissions();
      
      // Create a map to track which sponsors we've already processed
      const processedSponsors = new Set<number>();
      const submissions: any[] = [];
      
      // Process rankings submissions
      for (const sub of rankingsSubmissions) {
        const sponsor = await db.getSponsorById(sub.sponsorId);
        const intakeSubmission = await db.getIntakeSubmissionBySponsor(sub.sponsorId);
        const priorityTags = await db.getPriorityTagsBySponsor(sub.sponsorId);
        submissions.push({
          ...sub,
          companyName: sponsor?.companyName || "Unknown",
          contactName: sponsor?.contactName || "Unknown",
          contactEmail: sponsor?.contactEmail || "Unknown",
          intakeData: intakeSubmission || null,
          hasIntake: !!intakeSubmission,
          hasRankings: true,
          priorityDelegates: priorityTags.map(t => t.attendeeId),
        });
        if (sub.sponsorId) processedSponsors.add(sub.sponsorId);
      }
      
      // Add intake-only submissions (no rankings yet)
      for (const intake of allIntakeSubmissions) {
        if (!processedSponsors.has(intake.sponsorId)) {
          const sponsor = await db.getSponsorById(intake.sponsorId);
          const priorityTags = await db.getPriorityTagsBySponsor(intake.sponsorId);
          submissions.push({
            id: intake.id,
            sponsorId: intake.sponsorId,
            submittedAt: intake.submittedAt,
            isArchived: false,
            companyName: intake.companyName || sponsor?.companyName || "Unknown",
            contactName: intake.firstName + " " + intake.lastName,
            contactEmail: intake.email,
            intakeData: intake,
            hasIntake: true,
            hasRankings: false,
            rankingsData: null,
            priorityDelegates: priorityTags.map(t => t.attendeeId),
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
      .mutation(async ({ input }) => {
        await db.updateSubmissionStatus(input.id, input.status);
        return { success: true };
      }),
    
    // Archive submission
    archiveSubmission: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.archiveSubmission(input.id);
        return { success: true };
      }),
    
    // Unarchive submission
    unarchiveSubmission: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.unarchiveSubmission(input.id);
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
    
    // Import delegates from CSV
    importDelegates: adminProcedure.mutation(async () => {
      const csvPath = join(process.cwd(), 'delegates.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Parse CSV line
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        const [
          id, firstName, lastName, jobTitle, company, companySize,
          industry, taTeamSize, budgetAuthority, assessmentTools,
          ats, crm, marketIntel, otherTools
        ] = values;
        
        if (!id || !firstName || !lastName) continue;
        
        try {
          await db.createDelegateProfile({
            attendeeId: id,
            firstName: firstName.replace(/"/g, ''),
            lastName: lastName.replace(/"/g, ''),
            company: company?.replace(/"/g, '') || 'Unknown',
            jobTitle: jobTitle?.replace(/"/g, '') || null,
            industry: industry?.replace(/"/g, '') || null,
            challenges: assessmentTools?.replace(/"/g, '') || null,
            interests: `ATS: ${ats || 'N/A'}, CRM: ${crm || 'N/A'}`,
            profileData: JSON.stringify({
              companySize: companySize?.replace(/"/g, ''),
              taTeamSize: taTeamSize?.replace(/"/g, ''),
              budgetAuthority: budgetAuthority?.replace(/"/g, ''),
            }),
          });
          imported++;
        } catch (error) {
          console.error(`Error importing row ${i}:`, error);
        }
      }
      
      return { success: true, imported };
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
    generateAllMeetings: adminProcedure.mutation(async () => {
      const { generateMeetingsForAllSponsors } = await import('./matchingAlgorithm');
      const results = await generateMeetingsForAllSponsors();
      return { success: true, results: Array.from(results.entries()).map(([sponsorId, matches]) => ({ sponsorId, matches })) };
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
        })),
      }))
      .mutation(async ({ input }) => {
        // Delete existing meetings for this sponsor
        await db.deleteMeetingsBySponsor(input.sponsorId);
        
        // Create new meetings
        for (const meeting of input.meetings) {
          await db.createMeeting({
            sponsorId: input.sponsorId,
            attendeeId: meeting.attendeeId,
            matchScore: meeting.matchScore,
            isTopRanked: meeting.isTopRanked ? 1 : 0,
            isPriority: meeting.isPriority ? 1 : 0,
            status: 'suggested',
            notes: meeting.matchReason,
          });
        }
        
        return { success: true };
      }),
    
    // Get meetings for a sponsor
    getMeetingsBySponsor: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getMeetingsBySponsor(input.sponsorId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
