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
 * Batch score all delegates against sponsor using AI
 * Returns a map of delegateId -> { score: 0-1, reasoning: string }
 */
async function batchScoreDelegates(
  sponsorSolutions: string,
  sponsorChallenges: string,
  delegates: Array<{ id: string; challenges: string; interests: string }>
): Promise<Map<string, { score: number; reasoning: string }>> {
  const scores = new Map<string, { score: number; reasoning: string }>();
  
  if (delegates.length === 0) return scores;
  
  try {
    const { invokeLLM } = await import("./_core/llm");
    
    // Build delegate list for AI
    const delegateList = delegates.map((d, idx) => 
      `DELEGATE ${idx + 1} (ID: ${d.id}):\nChallenges: ${d.challenges}\nInterests: ${d.interests}`
    ).join("\n\n");
    
    const prompt = `You are a B2B matchmaking expert. Score how well this sponsor matches each delegate AND provide specific reasoning.

SPONSOR PROFILE:
Solutions: ${sponsorSolutions}
Challenges they solve: ${sponsorChallenges}

${delegateList}

For each delegate:
1. Score the alignment from 0-100 where:
   - 90-100: Direct match - sponsor's solutions directly address delegate's stated needs
   - 75-89: Strong alignment - sponsor can solve most of delegate's challenges  
   - 60-74: Moderate alignment - sponsor addresses some needs
   - 40-59: Weak alignment - limited overlap
   - 0-39: Poor alignment - minimal relevance

2. Generate 1-2 sentence reasoning that MUST:
   - Quote or reference a SPECIFIC phrase from the delegate's challenges/interests
   - Explain HOW the sponsor's specific product/service addresses that exact need
   - Be self-explanatory without needing to see the full profiles
   - Avoid generic terms like AI platform, optimization, or alignment
   
   REQUIRED FORMAT:
   Delegate's challenge 'exact quote' -> Sponsor's specific solution addresses this by explaining how
   
   Example GOOD reasoning:
   Delegate uses 'over 40 ATSs' and seeks 'ATS integration' -> Sponsor's multi-ATS connector platform unifies disparate systems
   
   Example BAD reasoning:
   Sponsor's AI platform can help with delegate's ATS optimization needs
   Strong match: High alignment between solutions and needs

IMPORTANT: Be generous with scoring. If there's ANY reasonable alignment, score at least 60.

Respond with ONLY a JSON object mapping delegate IDs to {score, reasoning}, like:
{"10001": {"score": 85, "reasoning": "Delegate seeks AI-powered candidate screening → Sponsor's ML recruitment platform directly solves this"}, "10002": {"score": 72, "reasoning": "..."}, ...}

No other text, just the JSON.`;
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a B2B matchmaking scoring expert. Respond with only JSON." },
        { role: "user", content: prompt }
      ]
    });
    
    const content = response.choices[0]?.message?.content;
    const jsonText = typeof content === 'string' ? content.trim() : "{}";
    
    // Extract JSON from response (might have markdown code blocks)
    const jsonMatch = jsonText.match(/\{[\s\S]+\}/);
    if (!jsonMatch) {
      console.error("[Matching] AI response not valid JSON:", jsonText);
      return scores;
    }
    
    const scoresObj = JSON.parse(jsonMatch[0]);
    
    // Convert to Map with 0-1 scale score + reasoning
    for (const [delegateId, data] of Object.entries(scoresObj)) {
      if (typeof data === 'object' && data !== null && 'score' in data && 'reasoning' in data) {
        const numScore = typeof (data as any).score === 'number' ? (data as any).score : parseInt(String((data as any).score));
        scores.set(delegateId, {
          score: Math.min(100, Math.max(0, numScore)) / 100,
          reasoning: String((data as any).reasoning || "Match based on needs alignment")
        });
      } else {
        // Fallback for old format (just numbers)
        const numScore = typeof data === 'number' ? data : parseInt(String(data));
        scores.set(delegateId, {
          score: Math.min(100, Math.max(0, numScore)) / 100,
          reasoning: "Match based on needs alignment"
        });
      }
    }
    
    console.log(`[Matching] Batch scored ${scores.size} delegates via AI`);
    return scores;
  } catch (error) {
    console.error("[Matching] Batch AI scoring failed, using fallback:", error);
    // Return empty map, will use fallback scoring
    return scores;
  }
}

/**
 * Fallback keyword matching (used if AI fails)
 * Returns a score from 0-1
 */
function calculateTextSimilarityFallback(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const matches = words1.filter(w => words2.includes(w)).length;
  const avgLength = (words1.length + words2.length) / 2;
  // Multiply by 2 to be more generous with fallback scores
  return Math.min(1.0, (matches / avgLength) * 2);
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
 * Generate AI-powered match reason with specific examples from profiles
 * Uses LLM to analyze sponsor solutions vs delegate needs and cite specific alignments
 */
async function generateAIMatchReason(
  isPriority: boolean,
  matchScore: number,
  sponsorSolutions: string,
  sponsorPainPointsSolved: string,
  delegateChallenges: string,
  delegateInterests: string,
  orgSizeScore: number,
  isTop20: boolean
): Promise<string> {
  if (isPriority) {
    return "Priority delegate - manually tagged by admin as must-meet";
  }
  
  // Use AI to generate specific, contextual match reasoning
  try {
    const { invokeLLM } = await import("./_core/llm");
    
    const prompt = `You are a B2B event matchmaking expert. Analyze the alignment between a sponsor's solutions and a delegate's needs.

SPONSOR SOLUTIONS:
${sponsorSolutions || "Not provided"}

SPONSOR PAIN POINTS THEY SOLVE:
${sponsorPainPointsSolved || "Not provided"}

DELEGATE CHALLENGES:
${delegateChallenges || "Not provided"}

DELEGATE INTERESTS:
${delegateInterests || "Not provided"}

MATCH SCORE: ${matchScore}%
TOP 20 RANKING: ${isTop20 ? "Yes" : "No"}

Generate a 1-2 sentence match reason that:
1. Cites SPECIFIC examples from the delegate's challenges/interests
2. Explains HOW the sponsor's solutions address those specific needs
3. Uses concrete language, not generic phrases

Example good reasoning:
"Delegate mentioned high volume screening of AI candidates → Sponsor's AI recruitment platform directly addresses this need (95% match)"

Example bad reasoning:
"Strong match: High alignment between sponsor's solutions and delegate's needs"

Generate the match reason now (1-2 sentences max):`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a B2B matchmaking expert. Generate specific, contextual match reasoning." },
        { role: "user", content: prompt }
      ]
    });
    
    const content = response.choices[0]?.message?.content;
    const aiReason = typeof content === 'string' ? content.trim() : "";
    if (aiReason) {
      return aiReason;
    }
  } catch (error) {
    console.error("[Matching] AI reasoning failed, falling back to template:", error);
  }
  
  // Fallback to template-based reasoning if AI fails
  return generateMatchReasonFallback(matchScore, orgSizeScore, isTop20);
}

/**
 * Fallback template-based match reason (used if AI fails)
 */
function generateMatchReasonFallback(
  matchScore: number,
  orgSizeScore: number,
  isTop20: boolean
): string {
  if (matchScore >= 90 && orgSizeScore > 0.8) {
    return `Exceptional match: Sponsor's solutions directly address delegate's stated pain points and challenges. Perfect org size alignment for target market.`;
  }
  
  if (matchScore >= 90) {
    return `Exceptional match: Sponsor's solutions directly address delegate's stated pain points, challenges, and expressed interests.`;
  }
  
  if (matchScore >= 75 && orgSizeScore > 0.7) {
    return `Strong match: High alignment between sponsor's solutions and delegate's needs. Good org size compatibility for effective partnership.`;
  }
  
  if (matchScore >= 75) {
    return `Strong match: Sponsor's solutions align well with delegate's challenges and areas of interest.`;
  }
  
  if (matchScore >= 60 && orgSizeScore > 0.7) {
    return `Moderate match: Sponsor's solutions address some delegate needs. Strong org size alignment enhances potential value.`;
  }
  
  if (matchScore >= 60) {
    return `Moderate match: Sponsor's solutions address some of the delegate's stated challenges and interests.`;
  }
  
  if (matchScore >= 40) {
    return `Weak match: Limited alignment between sponsor's solutions and delegate's needs. May have potential in specific areas.`;
  }
  
  return `Limited match: Minimal alignment between sponsor's solutions and delegate's stated needs and challenges.`;
}

/**
 * DEPRECATED: Old template-based match reason generator
 * Kept for reference but no longer used
 */
function generateMatchReason_DEPRECATED(
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
    // Use actual challenges/needs fields, NOT tools
    challenges: [a.currentPainPoints, a.activeConfirmedProjects].filter(Boolean).join('. '),
    interests: [a.primaryMeetingObjective, a.keySolutionAreasOfInterest].filter(Boolean).join('. '),
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
  
  // Batch score all delegates using AI (much faster than individual calls)
  const sponsorSolutions = intakeSubmission.companyBoilerplate || "";
  const sponsorPainPointsSolved = intakeSubmission.keyChallenges || "";
  
  const delegatesForScoring = availableDelegates.map(d => ({
    id: d.attendeeId,
    challenges: d.challenges || "",
    interests: d.interests || ""
  }));
  
  console.log(`[Matching] Batch scoring ${delegatesForScoring.length} delegates via AI...`);
  const aiScores = await batchScoreDelegates(
    sponsorSolutions,
    sponsorPainPointsSolved,
    delegatesForScoring
  );
  console.log(`[Matching] AI batch scoring complete, got ${aiScores.size} scores`);
  
  // Score each available delegate
  const scoredMatches: MatchResult[] = [];
  
  for (const delegate of availableDelegates) {
    const isPriority = priorityAttendeeIds.has(delegate.attendeeId);
    const rankPosition = rankedAttendeeIds.indexOf(delegate.attendeeId);
    const isTopRanked = rankPosition >= 0 && rankPosition < 12;
    const isTop20 = rankPosition >= 0 && rankPosition < 20;
    
    // Get AI score and reasoning for this delegate
    const aiResult = aiScores.get(delegate.attendeeId) || { score: 0, reasoning: "" };
    const needsSolutionScore = aiResult.score; // 0-1 scale
    const aiMatchReasoning = aiResult.reasoning;
    
    // Keep delegate data for match reasoning
    const delegateChallenges = delegate.challenges || "";
    const delegateInterests = delegate.interests || "";
    
    // Secondary alignment: Org size compatibility
    const orgSizeScore = calculateOrgSizeMatch(
      intakeSubmission.targetOrgSize || "",
      (delegate as any).orgSize || ""
    );
    
    // Scoring logic with correct weighting:
    let matchScore: number;
    
    if (isPriority) {
      // Priority delegates = 100% (manually tagged must-meet)
      matchScore = 100;
    } else {
      // Base score from needs-solution alignment (0-100)
      // - Needs-solution alignment: 80 points (primary factor)
      // - Org size match: 20 points (secondary factor)
      matchScore = Math.round(needsSolutionScore * 80 + orgSizeScore * 20);
      
      // Top 20 ranking bonus: +10 points for sponsor's preferred delegates
      if (isTop20) {
        matchScore = Math.min(100, matchScore + 10);
      }
      
      // Ensure scores are in reasonable range (minimum 30% for actual meetings)
      // Lower scores will be filtered out when selecting best matches
      matchScore = Math.max(1, matchScore);
    }
    
    // Generate match reason - use AI-generated reasoning from batch call
    let matchReason = "";
    if (isPriority) {
      matchReason = "Priority delegate: Manually selected as must-meet by event organizers.";
    } else {
      // Use AI reasoning from batch scoring (already includes specific examples)
      matchReason = aiMatchReasoning || "Match based on needs-solution alignment";
      
      // Enhance with additional context if available
      if (isTop20) {
        matchReason += " (Ranked in sponsor's top 20 preferred delegates)";
      }
      if (orgSizeScore >= 0.8) {
        matchReason += " Excellent org size match.";
      }
    }
    
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
  
  // Filter out matches below 30% threshold (except priority delegates)
  const qualityMatches = scoredMatches.filter(m => m.isPriority || m.matchScore >= 30);
  
  // Return top N matches from quality matches
  const topMatches = qualityMatches.slice(0, meetingCount);
  console.log(`[Matching] Returning ${topMatches.length} matches (requested ${meetingCount})`);
  console.log(`[Matching] Top 3 scores: ${topMatches.slice(0, 3).map(m => `${m.delegateInfo.firstName} ${m.delegateInfo.lastName}: ${m.matchScore}%`).join(', ')}`);
  
  // Log quality distribution
  const above65 = topMatches.filter(m => m.matchScore >= 65).length;
  const between30and65 = topMatches.filter(m => m.matchScore >= 30 && m.matchScore < 65).length;
  console.log(`[Matching] Quality distribution: ${above65} above 65%, ${between30and65} between 30-65%`);
  
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
