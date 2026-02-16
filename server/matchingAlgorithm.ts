import * as db from "./db";

export interface MatchResult {
  attendeeId: string;
  matchScore: number; // 1-100
  matchReason: string;
  isPriority: boolean;
  isTopRanked: boolean;
  delegateInfo: {
    firstName: string;
    lastName: string;
    company: string;
    jobTitle: string;
    currentMeetingCount: number;
  };
}

/**
 * Calculate text similarity between two strings (simple keyword matching)
 * Returns a score from 0-1
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const matches = words1.filter(w => words2.includes(w)).length;
  return matches / Math.max(words1.length, words2.length);
}

/**
 * Generate match reason based on scoring factors
 */
function generateMatchReason(
  isPriority: boolean,
  challengeScore: number,
  rankPosition: number | null,
  delegateName: string
): string {
  if (isPriority) {
    return `Priority delegate - manually tagged by admin as must-meet`;
  }
  
  if (challengeScore > 0.6 && rankPosition !== null && rankPosition <= 5) {
    return `Strong alignment on challenges + ranked #${rankPosition} by sponsor`;
  }
  
  if (challengeScore > 0.6) {
    return `High alignment between delegate needs and sponsor solutions`;
  }
  
  if (rankPosition !== null && rankPosition <= 10) {
    return `Ranked #${rankPosition} in sponsor's preferred delegate list`;
  }
  
  if (challengeScore > 0.3) {
    return `Moderate alignment on pain points and challenges`;
  }
  
  return `Potential fit based on sponsor criteria`;
}

/**
 * Generate meetings for a specific sponsor
 * @param sponsorId - The sponsor to generate meetings for
 * @param meetingCount - Number of meetings to generate (12 or 20)
 * @returns Array of match results sorted by score (highest first)
 */
export async function generateMeetingsForSponsor(
  sponsorId: number,
  meetingCount: number
): Promise<MatchResult[]> {
  console.log(`[Matching] Starting match generation for sponsor ${sponsorId}, requesting ${meetingCount} meetings`);
  
  // Get sponsor data
  const sponsor = await db.getSponsorById(sponsorId);
  if (!sponsor) {
    console.error(`[Matching] Sponsor ${sponsorId} not found`);
    throw new Error("Sponsor not found");
  }
  console.log(`[Matching] Found sponsor: ${sponsor.companyName}`);
  
  const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsorId);
  if (!intakeSubmission) {
    console.error(`[Matching] No intake submission found for sponsor ${sponsorId}`);
    throw new Error("Sponsor has not completed intake form");
  }
  console.log(`[Matching] Found intake submission with keyChallenges: ${intakeSubmission.keyChallenges?.substring(0, 50)}...`);
  
  // Get priority tags for this sponsor
  const priorityTags = await db.getPriorityTagsBySponsor(sponsorId);
  const priorityAttendeeIds = new Set(priorityTags.map(t => t.attendeeId));
  
  // Get sponsor's rankings
  const rankingsSubmissions = await db.getRankingsSubmissionsBySponsor(sponsorId);
  const rankingsSubmission = rankingsSubmissions[0]; // Get most recent
  let rankedAttendeeIds: string[] = [];
  if (rankingsSubmission && rankingsSubmission.rankingsData) {
    try {
      rankedAttendeeIds = JSON.parse(rankingsSubmission.rankingsData);
    } catch (e) {
      console.error("Failed to parse rankings data:", e);
    }
  }
  
  // Get all delegates from attendees list
  const { attendees } = await import('./attendees');
  console.log(`[Matching] Loaded ${attendees.length} attendees from attendees list`);
  
  // Transform attendees to delegate format
  const allDelegates = attendees.map(a => ({
    id: 0, // Not used
    attendeeId: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    company: a.company || 'Unknown',
    jobTitle: a.jobTitle || '',
    industry: a.industry || null,
    challenges: a.assessmentTool || '',
    interests: `${a.ats || ''} ${a.crm || ''} ${a.marketIntelligence || ''}`,
    profileData: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  console.log(`[Matching] Transformed ${allDelegates.length} delegates for matching`);
  
  // Get all existing meetings to check delegate capacity
  const allMeetings = await db.getAllMeetings();
  const delegateMeetingCounts = new Map<string, number>();
  for (const meeting of allMeetings) {
    const count = delegateMeetingCounts.get(meeting.attendeeId) || 0;
    delegateMeetingCounts.set(meeting.attendeeId, count + 1);
  }
  
  // Filter out delegates who have reached capacity (8 meetings)
  const availableDelegates = allDelegates.filter(delegate => {
    const currentCount = delegateMeetingCounts.get(delegate.attendeeId) || 0;
    return currentCount < 8;
  });
  console.log(`[Matching] ${availableDelegates.length} delegates available (under 8 meetings capacity)`);
  
  // Score each available delegate
  const scoredMatches: MatchResult[] = [];
  
  for (const delegate of availableDelegates) {
    const isPriority = priorityAttendeeIds.has(delegate.attendeeId);
    const rankPosition = rankedAttendeeIds.indexOf(delegate.attendeeId);
    const isTopRanked = rankPosition >= 0 && rankPosition < 12;
    
    let matchScore = 0;
    
    // Priority delegates get 100% match
    if (isPriority) {
      matchScore = 100;
    } else {
      // Calculate challenge/solution alignment
      const sponsorChallenges = intakeSubmission.keyChallenges || "";
      const delegateChallenges = delegate.challenges || "";
      const challengeScore = calculateTextSimilarity(sponsorChallenges, delegateChallenges);
      
      // Base score from challenge alignment (0-70 points)
      matchScore = Math.round(challengeScore * 70);
      
      // Bonus points for being in sponsor's rankings (0-30 points)
      if (rankPosition >= 0) {
        const rankBonus = Math.max(0, 30 - rankPosition * 2); // Higher rank = more points
        matchScore += rankBonus;
      }
      
      // Cap at 99 (only priority tags get 100)
      matchScore = Math.min(99, matchScore);
    }
    
    const matchReason = generateMatchReason(
      isPriority,
      calculateTextSimilarity(intakeSubmission.keyChallenges || "", delegate.challenges || ""),
      rankPosition >= 0 ? rankPosition + 1 : null,
      `${delegate.firstName} ${delegate.lastName}`
    );
    
    scoredMatches.push({
      attendeeId: delegate.attendeeId,
      matchScore,
      matchReason,
      isPriority,
      isTopRanked,
      delegateInfo: {
        firstName: delegate.firstName,
        lastName: delegate.lastName,
        company: delegate.company,
        jobTitle: delegate.jobTitle || "N/A",
        currentMeetingCount: delegateMeetingCounts.get(delegate.attendeeId) || 0,
      },
    });
  }
  
  // Sort by match score (highest first), then by priority, then by rank
  scoredMatches.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.isPriority !== a.isPriority) return b.isPriority ? 1 : -1;
    if (b.isTopRanked !== a.isTopRanked) return b.isTopRanked ? 1 : -1;
    return 0;
  });
  
  // Return top N matches
  const topMatches = scoredMatches.slice(0, meetingCount);
  console.log(`[Matching] Returning ${topMatches.length} matches (requested ${meetingCount})`);
  console.log(`[Matching] Top 3 scores: ${topMatches.slice(0, 3).map(m => `${m.delegateInfo.firstName} ${m.delegateInfo.lastName}: ${m.matchScore}%`).join(', ')}`);
  return topMatches;
}

/**
 * Generate meetings for all sponsors
 */
export async function generateMeetingsForAllSponsors(): Promise<Map<number, MatchResult[]>> {
  const allSponsors = await db.getAllSponsors();
  const results = new Map<number, MatchResult[]>();
  
  for (const sponsor of allSponsors) {
    const intakeSubmission = await db.getIntakeSubmissionBySponsor(sponsor.id);
    if (!intakeSubmission) continue; // Skip sponsors without intake form
    
    const meetingCount = intakeSubmission.meetingPackage === "20" ? 20 : 12;
    
    try {
      const matches = await generateMeetingsForSponsor(sponsor.id, meetingCount);
      results.set(sponsor.id, matches);
    } catch (error) {
      console.error(`Failed to generate meetings for sponsor ${sponsor.id}:`, error);
    }
  }
  
  return results;
}
