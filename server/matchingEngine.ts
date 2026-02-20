/**
 * AI Matching Engine
 * Uses LLM to semantically match vendors with delegates based on solutions/needs
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export type MatchResult = {
  sponsorId: number;
  attendeeId: string;
  matchScore: number;
  reasoning: string;
  isTopRanked: boolean;
  isPriority: boolean;
};

/**
 * Generate AI-powered matches for a specific sponsor
 * Uses permanent cache to avoid re-analyzing sponsor-delegate pairs
 */
export async function generateMatchesForSponsor(sponsorId: number): Promise<MatchResult[]> {
  // Get vendor profile
  const vendorProfiles = await db.getVendorProfiles();
  const vendorProfile = vendorProfiles.find(v => v.sponsorId === sponsorId);
  
  if (!vendorProfile) {
    throw new Error(`No vendor profile found for sponsor ${sponsorId}`);
  }

  // Get all delegate profiles
  const delegateProfiles = await db.getDelegateProfiles();
  
  if (delegateProfiles.length === 0) {
    throw new Error("No delegate profiles available for matching");
  }

  // Check cache first - get all cached matches for this sponsor
  const cachedMatches = await db.getMatchCacheBySponsor(sponsorId);
  const cachedAttendeeIds = new Set(cachedMatches.map((m: any) => m.attendeeId));
  
  // Separate delegates into cached and uncached
  const uncachedDelegates = delegateProfiles.filter(d => !cachedAttendeeIds.has(d.attendeeId));
  
  console.log(`[Match Cache] Sponsor ${sponsorId}: ${cachedMatches.length} cached, ${uncachedDelegates.length} need AI analysis`);

  // Get sponsor's rankings
  const submissions = await db.getRankingsSubmissionsBySponsor(sponsorId);
  const latestSubmission = submissions[0];
  const topRankedIds = latestSubmission 
    ? JSON.parse(latestSubmission.rankingsData).slice(0, 12)
    : [];

  // Get priority tags
  const priorityTags = await db.getPriorityTagsBySponsor(sponsorId);
  const priorityAttendeeIds = priorityTags.map(t => t.attendeeId);

  // Convert cached matches to MatchResult format
  const cachedResults: MatchResult[] = cachedMatches.map((cache: any) => ({
    sponsorId,
    attendeeId: cache.attendeeId,
    matchScore: cache.matchScore,
    reasoning: cache.matchReason,
    isTopRanked: topRankedIds.includes(cache.attendeeId),
    isPriority: priorityAttendeeIds.includes(cache.attendeeId),
  }));

  // If all delegates are cached, return immediately without AI call
  if (uncachedDelegates.length === 0) {
    console.log(`[Match Cache] All ${cachedResults.length} delegates cached for sponsor ${sponsorId} - no AI calls needed`);
    return cachedResults.sort((a, b) => {
      if (a.isPriority !== b.isPriority) return b.isPriority ? 1 : -1;
      if (a.isTopRanked !== b.isTopRanked) return b.isTopRanked ? 1 : -1;
      return b.matchScore - a.matchScore;
    });
  }

  // Batch process only uncached delegates
  const batchSize = 10;
  const newResults: MatchResult[] = [];

  for (let i = 0; i < uncachedDelegates.length; i += batchSize) {
    const batch = uncachedDelegates.slice(i, i + batchSize);
    
    const prompt = `You are an expert B2B matchmaker. Analyze how well this vendor matches with each delegate.

VENDOR PROFILE:
Company: ${vendorProfile.companyName}
Solutions: ${vendorProfile.solutions}
Pain Points They Solve: ${vendorProfile.painPoints}
Target Industries: ${vendorProfile.targetIndustries}

DELEGATES TO MATCH:
${batch.map((d, idx) => {
  // Parse profileData to get ONLY the approved matching fields
  const profile = d.profileData ? JSON.parse(d.profileData) : {};
  return `
${idx + 1}. ID: ${d.attendeeId}
   Total Org Employees: ${profile.totalOrgEmployees || 'N/A'}
   Active Confirmed Projects: ${profile.activeProjects || 'N/A'}
   Primary Meeting Objective: ${profile.meetingObjective || 'N/A'}
   Key Solution Areas of Interest: ${profile.solutionAreas || d.interests || 'N/A'}
   Current Pain Points: ${profile.painPoints || d.challenges || 'N/A'}
`}).join('\n')}

For each delegate, provide:
1. Match score (0-100) using this calibrated scale:
   - 90-100: Exceptional match - Vendor solutions directly solve delegate's pain points, active project alignment, strong company size fit
   - 75-89: Strong match - Good solution-need alignment based on pain points and solution areas of interest
   - 60-74: Moderate match - Partial alignment on solutions or pain points, potential value exists
   - 40-59: Weak match - Limited alignment, vendor could help but not ideal fit
   - 0-39: Poor match - Little to no alignment between vendor solutions and delegate needs
   
   IMPORTANT: Most good matches should score 70-90. Be generous with scores when there's clear value - don't artificially deflate scores.
   
2. Detailed reasoning (2-3 sentences minimum) explaining the match with this exact structure:
   - Start with PRIMARY ALIGNMENT: Explain the main connection between vendor solutions and delegate's pain points/solution areas
   - Add SECONDARY FACTORS: Mention company size fit, active projects, or meeting objective alignment
   - End with POTENTIAL VALUE: Describe what the delegate would gain from this meeting

Example reasoning format:
"Primary alignment: Vendor's recruitment automation platform directly addresses delegate's pain point around manual screening processes. Secondary factors: Delegate's company size (5k-10k employees) fits vendor's target market, and they have active projects evaluating ATS solutions. Potential value: Could reduce time-to-hire by 40% and improve candidate quality through AI-powered matching."

IMPORTANT: 
- Every reasoning MUST be at least 2 full sentences and cite specific details from ONLY the 5 approved fields
- DO NOT mention delegate name, job title, company name, or industry in your reasoning
- Focus exclusively on: Total Org Employees, Active Projects, Meeting Objective, Solution Areas, and Pain Points

Respond in JSON format:
{
  "matches": [
    {"attendeeId": "att_001", "score": 85, "reasoning": "Primary alignment: ... Secondary factors: ... Potential value: ..."},
    ...
  ]
}`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a B2B matchmaking expert. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "match_results",
            strict: true,
            schema: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      attendeeId: { type: "string" },
                      score: { type: "number" },
                      reasoning: { type: "string" }
                    },
                    required: ["attendeeId", "score", "reasoning"],
                    additionalProperties: false
                  }
                }
              },
              required: ["matches"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      const parsed = JSON.parse(content);
      
      for (const match of parsed.matches) {
        const matchResult = {
          sponsorId,
          attendeeId: match.attendeeId,
          matchScore: Math.round(match.score),
          reasoning: match.reasoning,
          isTopRanked: topRankedIds.includes(match.attendeeId),
          isPriority: priorityAttendeeIds.includes(match.attendeeId),
        };
        newResults.push(matchResult);
        
        // Store in permanent cache
        try {
          await db.createMatchCache({
            sponsorId,
            attendeeId: match.attendeeId,
            matchScore: Math.round(match.score),
            matchReason: match.reasoning,
          });
        } catch (error) {
          console.error(`[Match Cache] Failed to cache match for ${match.attendeeId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing batch ${i / batchSize}:`, error);
    }
  }

  console.log(`[Match Cache] Sponsor ${sponsorId}: Generated ${newResults.length} new matches, combined with ${cachedResults.length} cached`);

  // Combine cached and new results
  const allResults = [...cachedResults, ...newResults];
  
  // Sort by priority first, then top-ranked, then score
  allResults.sort((a, b) => {
    if (a.isPriority !== b.isPriority) return b.isPriority ? 1 : -1;
    if (a.isTopRanked !== b.isTopRanked) return b.isTopRanked ? 1 : -1;
    return b.matchScore - a.matchScore;
  });

  return allResults;
}

/**
 * Generate matches for all sponsors
 */
export async function generateAllMatches(): Promise<Map<number, MatchResult[]>> {
  const vendorProfiles = await db.getVendorProfiles();
  const allMatches = new Map<number, MatchResult[]>();

  for (const vendor of vendorProfiles) {
    try {
      const matches = await generateMatchesForSponsor(vendor.sponsorId);
      allMatches.set(vendor.sponsorId, matches);
    } catch (error) {
      console.error(`Error generating matches for sponsor ${vendor.sponsorId}:`, error);
    }
  }

  return allMatches;
}

/**
 * Save matches to database
 */
export async function saveMatches(matches: MatchResult[]): Promise<void> {
  for (const match of matches) {
    await db.createMeeting({
      sponsorId: match.sponsorId,
      attendeeId: match.attendeeId,
      matchScore: match.matchScore,
      isTopRanked: match.isTopRanked ? 1 : 0,
      isPriority: match.isPriority ? 1 : 0,
      status: "suggested",
      notes: match.reasoning,
    });
  }
}
