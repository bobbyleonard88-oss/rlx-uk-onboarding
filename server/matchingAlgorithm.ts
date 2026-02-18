import * as db from "./db";

export interface MatchResult {
  attendeeId: string;
  matchScore: number; // 1-100
  matchReason: string;
  isPriority: boolean;
  isTopRanked: boolean;
  isTop20: boolean; // New: delegate in sponsor's top 20 rankings
  timeSlot?: number | null; // 1-6 for Day 1/Day 2 slots
  delegateInfo: {
    firstName: string;
    lastName: string;
    company: string;
    jobTitle: string;
    currentMeetingCount: number;
  };
}

/**
 * Calculate text similarity between two strings (improved keyword matching)
 * Returns a score from 0-1
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const matches = words1.filter(w => words2.includes(w)).length;
  const avgLength = (words1.length + words2.length) / 2;
  return matches / avgLength;
}

/**
 * Check if org sizes match or overlap
 * Returns a score from 0-1
 */
function calculateOrgSizeMatch(sponsorOrgSize: string, delegateOrgSize: string): number {
  if (!sponsorOrgSize || !delegateOrgSize) return 0;
  
  // Exact match
  if (sponsorOrgSize === delegateOrgSize) return 1.0;
  
  // Parse size ranges
  const parseSize = (size: string): { min: number, max: number } => {
    size = size.toLowerCase().replace(/,/g, '');
    if (size.includes('<') || size.includes('under')) return { min: 0, max: 1000 };
    if (size.includes('+') || size.includes('over')) {
      const num = parseInt(size.match(/\d+/)?.[0] || '10000');
      return { min: num, max: 999999 };
    }
    const parts = size.match(/(\d+)\s*-\s*(\d+)/);
    if (parts) return { min: parseInt(parts[1]), max: parseInt(parts[2]) };
    const single = parseInt(size.match(/\d+/)?.[0] || '0');
    return { min: single, max: single };
  };
  
  const sponsor = parseSize(sponsorOrgSize);
  const delegate = parseSize(delegateOrgSize);
  
  // Check for overlap
  const overlapMin = Math.max(sponsor.min, delegate.min);
  const overlapMax = Math.min(sponsor.max, delegate.max);
  
  if (overlapMin <= overlapMax) {
    // Calculate overlap percentage
    const overlapSize = overlapMax - overlapMin;
    const sponsorSize = sponsor.max - sponsor.min;
    const delegateSize = delegate.max - delegate.min;
    const avgSize = (sponsorSize + delegateSize) / 2;
    return Math.min(1.0, overlapSize / avgSize);
  }
  
  return 0;
}

/**
 * Generate match reason based on needs-to-solutions alignment
 * Focus on how sponsor solutions address delegate needs/challenges
 */
function generateMatchReason(
  isPriority: boolean,
  needsSolutionScore: number,
  orgSizeScore: number,
  rankPosition: number | null,
  isTop20: boolean,
  delegateName: string
): string {
  // Exceptional alignment (90-100%)
  if (needsSolutionScore > 0.9 && orgSizeScore > 0.8) {
    return `Exceptional match: Sponsor's solutions directly address delegate's stated pain points and challenges. Perfect org size alignment for target market.`;
  }
  
  if (needsSolutionScore > 0.9) {
    return `Exceptional match: Sponsor's solutions directly address delegate's stated pain points, challenges, and expressed interests.`;
  }
  
  // Strong alignment (75-89%)
  if (needsSolutionScore > 0.75 && orgSizeScore > 0.7) {
    return `Strong match: High alignment between sponsor's solutions and delegate's needs. Good org size compatibility for effective partnership.`;
  }
  
  if (needsSolutionScore > 0.75) {
    return `Strong match: Sponsor's solutions align well with delegate's challenges and areas of interest.`;
  }
  
  // Moderate alignment (60-74%)
  if (needsSolutionScore > 0.6 && orgSizeScore > 0.7) {
    return `Moderate match: Sponsor's solutions address some delegate needs. Strong org size alignment enhances potential value.`;
  }
  
  if (needsSolutionScore > 0.6) {
    return `Moderate match: Sponsor's solutions address some of the delegate's stated challenges and interests.`;
  }
  
  // Weak alignment (40-59%)
  if (needsSolutionScore > 0.4) {
    return `Weak match: Limited alignment between sponsor's solutions and delegate's needs. May have potential in specific areas.`;
  }
  
  // Poor match (<40%)
  return `Limited match: Minimal alignment between sponsor's solutions and delegate's stated needs and challenges.`;
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
    const isTop20 = rankPosition >= 0 && rankPosition < 20;
    
    // Calculate needs-to-solutions alignment
    // Sponsor offers solutions (keyChallenges = what they solve, companyBoilerplate = their solutions)
    // Delegate has needs (challenges, interests, pain points)
    const sponsorSolutions = intakeSubmission.companyBoilerplate || "";
    const sponsorPainPointsSolved = intakeSubmission.keyChallenges || ""; // What pain points the sponsor solves
    const delegateChallenges = delegate.challenges || "";
    const delegateInterests = delegate.interests || "";
    
    // Primary alignment: How well sponsor's solutions address delegate's challenges/interests
    const needsSolutionScore = Math.max(
      calculateTextSimilarity(sponsorSolutions, delegateChallenges),
      calculateTextSimilarity(sponsorSolutions, delegateInterests),
      calculateTextSimilarity(sponsorPainPointsSolved, delegateChallenges)
    );
    
    // Secondary alignment: Org size compatibility
    const orgSizeScore = calculateOrgSizeMatch(
      intakeSubmission.targetOrgSize || "",
      (delegate as any).orgSize || ""
    );
    
    // Needs-based scoring (0-100):
    // - Needs-solution alignment: 80 points (primary factor)
    // - Org size match: 20 points (secondary factor)
    let matchScore = Math.round(needsSolutionScore * 80 + orgSizeScore * 20);
    
    // Apply calibrated scale:
    // - 90-100: Exceptional direct match
    // - 75-89: Strong alignment
    // - 60-74: Moderate alignment
    // - 40-59: Weak alignment
    // - 0-39: Poor match
    
    // Ensure minimum score of 1
    matchScore = Math.max(1, matchScore);
    
    // Generate match reason based on needs-solution alignment
    const matchReason = generateMatchReason(
      isPriority,
      needsSolutionScore,
      orgSizeScore,
      rankPosition >= 0 ? rankPosition + 1 : null,
      isTop20,
      `${delegate.firstName} ${delegate.lastName}`
    );
    
    scoredMatches.push({
      attendeeId: delegate.attendeeId,
      matchScore,
      matchReason,
      isPriority,
      isTopRanked,
      isTop20,
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
