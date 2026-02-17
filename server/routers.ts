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
    
    // Get sponsor's own meetings
    getMyMeetings: protectedProcedure.query(async ({ ctx }) => {
      const sponsor = await db.getSponsorByUserId(ctx.user.id);
      if (!sponsor) return [];
      const allMeetings = await db.getMeetingsBySponsor(sponsor.id);
      // Only return confirmed meetings (published to sponsor)
      return allMeetings.filter(m => m.status === 'confirmed');
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

        // Create submission
        const submissionId = await db.createRankingsSubmission({
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
          timeSlot: z.number().nullable().optional(),
          attendeeNumber: z.number().optional(),
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
            matchReason: meeting.matchReason,
            isTopRanked: meeting.isTopRanked ? 1 : 0,
            isPriority: meeting.isPriority ? 1 : 0,
            timeSlot: meeting.timeSlot ?? null,
            attendeeNumber: meeting.attendeeNumber ?? 1,
            status: 'suggested',
            notes: null,
          });
        }
        
        return { success: true };
      }),
    
    // Publish meetings to sponsor (change status from suggested to confirmed)
    publishMeetings: adminProcedure
      .input(z.object({
        sponsorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get all meetings for this sponsor
        const meetings = await db.getMeetingsBySponsor(input.sponsorId);
        
        // Count suggested meetings BEFORE updating
        const suggestedMeetings = meetings.filter(m => m.status === 'suggested');
        const suggestedCount = suggestedMeetings.length;
        
        // Update all suggested meetings to confirmed
        for (const meeting of suggestedMeetings) {
          await db.updateMeetingStatus(meeting.id, 'confirmed');
        }
        
        return { 
          success: true, 
          publishedCount: suggestedCount,
          totalMeetings: meetings.length,
          alreadyPublished: meetings.length - suggestedCount
        };
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
      .query(async () => {
        const { attendees } = await import('./attendees');
        const allSponsors = await db.getAllSponsors();
        const allMeetings = await db.getAllMeetings();
        
        // Build overview for each delegate
        const overview = await Promise.all(attendees.map(async (delegate) => {
          const delegateMeetings = allMeetings.filter(m => m.attendeeId === delegate.id);
          
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
          const { generateMatchesForSponsor } = await import('./matchingEngine');
          let allMatches;
          try {
            allMatches = await generateMatchesForSponsor(sponsor.id);
          } catch (error) {
            // Skip if vendor profile not found (sponsor hasn't completed intake)
            console.warn(`Skipping sponsor ${sponsor.id}: ${error}`);
            await db.deleteMeeting(meeting.id);
            continue;
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
  }),
});

export type AppRouter = typeof appRouter;
