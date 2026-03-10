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
    
    const prompt = `You are a senior matchmaking consultant preparing pre-meeting briefings for a vendor attending a curated B2B event. Your job is to write a concise, insightful briefing that explains — in your own words — why this vendor and delegate are a strong fit. Do NOT simply echo the delegate's words back. Instead, synthesise both sides and explain the connection as a knowledgeable third party would.

VENDOR PROFILE:
Company: ${vendorProfile.companyName}
Solutions offered: ${vendorProfile.solutions}
Problems they solve: ${vendorProfile.painPoints}
Target market: ${vendorProfile.targetIndustries}

DELEGATES TO ASSESS:
${batch.map((d, idx) => {
  const profile = d.profileData ? JSON.parse(d.profileData) : {};
  return `
${idx + 1}. ID: ${d.attendeeId}
   Organisation size: ${profile.totalOrgEmployees || 'N/A'}
   Active projects: ${profile.activeProjects || 'N/A'}
   What they want from this meeting: ${profile.meetingObjective || 'N/A'}
   Solution areas they are exploring: ${profile.solutionAreas || d.interests || 'N/A'}
   Current pain points: ${profile.painPoints || d.challenges || 'N/A'}
`}).join('\n')}

For each delegate provide:

1. A match score (0–100):
   90–100: Exceptional — vendor directly solves the delegate's stated pain points, active project alignment
   75–89: Strong — clear solution-need fit, good market alignment
   60–74: Moderate — partial alignment, genuine value exists
   40–59: Weak — limited overlap, marginal fit
   0–39: Poor — little to no alignment
   Most strong matches should land 70–90. Do not artificially deflate scores.

2. A match briefing (2–3 sentences, written as a fluent narrative — NOT bullet points, NOT labelled sections).
   The briefing should:
   - Open by explaining what specific capability or product of the vendor connects to this delegate's situation
   - Draw a concrete link between the vendor's offering and the delegate's pain points or active projects — use your own synthesis, not a paraphrase of the delegate's words
   - Close with what the delegate stands to gain from this conversation, framed as a business outcome
   
   Good example: "${vendorProfile.companyName}'s approach to [relevant capability] is well-suited to organisations dealing with [synthesised challenge], which aligns closely with the scale and complexity this delegate is navigating. Their active work on [related project area] suggests they are at the right stage to evaluate a solution like this, and the conversation could surface concrete ways to [business outcome]."
   
   Bad example (do NOT do this): "Primary alignment: Delegate's pain points include X. Secondary factors: They are exploring Y. Potential value: They could benefit from Z."

Rules:
- Write in third person, present tense
- Do NOT mention the delegate's name, job title, company, or industry
- Do NOT use section labels (Primary alignment:, Secondary factors:, etc.)
- Do NOT simply repeat the delegate's own words — interpret and contextualise them
- Each briefing must be 2–3 complete sentences

Respond in JSON format:
{
  "matches": [
    {"attendeeId": "att_001", "score": 85, "reasoning": "..."},
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

/**
 * Re-generate match reasons for all confirmed meetings using the current prompt.
 * Processes meetings in batches of 10 per sponsor to avoid rate limits.
 * Updates matchReason on each meeting row.
 */
export async function regenerateAllMatchReasons(): Promise<number> {
  const allMeetings = await db.getAllMeetings();
  const confirmedMeetings = allMeetings.filter(m => m.status === 'confirmed');

  if (confirmedMeetings.length === 0) return 0;

  // Group by sponsorId so we can batch per sponsor
  const bySponsor = new Map<number, typeof confirmedMeetings>();
  for (const m of confirmedMeetings) {
    if (!bySponsor.has(m.sponsorId)) bySponsor.set(m.sponsorId, []);
    bySponsor.get(m.sponsorId)!.push(m);
  }

  const vendorProfiles = await db.getVendorProfiles();
  const delegateProfiles = await db.getDelegateProfiles();
  const allIntake = await db.getAllIntakeSubmissions();

  let totalUpdated = 0;

  for (const [sponsorId, sponsorMeetings] of Array.from(bySponsor.entries())) {
    // Build vendor profile — prefer vendorProfiles table, fall back to intakeSubmissions
    let vendorProfile = vendorProfiles.find(v => v.sponsorId === sponsorId);
    if (!vendorProfile) {
      const intake = allIntake.find(i => i.sponsorId === sponsorId);
      if (!intake) {
        console.warn(`[RegenReasons] No profile for sponsor ${sponsorId}, skipping`);
        continue;
      }
      vendorProfile = {
        sponsorId,
        companyName: intake.companyName,
        solutions: intake.technologyType || '',
        painPoints: intake.keyChallenges || '',
        targetIndustries: intake.targetOrgSize || '',
      } as any;
    }

    const batchSize = 10;
    for (let i = 0; i < sponsorMeetings.length; i += batchSize) {
      const batch = sponsorMeetings.slice(i, i + batchSize);

      // Build delegate data for this batch
      const batchDelegates = batch.map((m: typeof confirmedMeetings[0]) => {
        const dp = delegateProfiles.find(d => d.attendeeId === m.attendeeId);
        const profile = dp?.profileData ? JSON.parse(dp.profileData) : {};
        return {
          meetingId: m.id,
          attendeeId: m.attendeeId,
          totalOrgEmployees: profile.totalOrgEmployees || 'N/A',
          activeProjects: profile.activeProjects || 'N/A',
          meetingObjective: profile.meetingObjective || 'N/A',
          solutionAreas: profile.solutionAreas || dp?.interests || 'N/A',
          painPoints: profile.painPoints || dp?.challenges || 'N/A',
        };
      });

      const vp = vendorProfile!;
      const prompt = `You are a senior matchmaking consultant preparing pre-meeting briefings for a vendor attending a curated B2B event. Your job is to write a concise, insightful briefing that explains — in your own words — why this vendor and delegate are a strong fit. Do NOT simply echo the delegate's words back. Instead, synthesise both sides and explain the connection as a knowledgeable third party would.

VENDOR PROFILE:
Company: ${vp.companyName}
Solutions offered: ${vp.solutions}
Problems they solve: ${vp.painPoints}
Target market: ${vp.targetIndustries}

DELEGATES TO ASSESS:
${batchDelegates.map((d: { meetingId: number; attendeeId: string; totalOrgEmployees: string; activeProjects: string; meetingObjective: string; solutionAreas: string; painPoints: string }, idx: number) => `
${idx + 1}. ID: ${d.attendeeId}
   Organisation size: ${d.totalOrgEmployees}
   Active projects: ${d.activeProjects}
   What they want from this meeting: ${d.meetingObjective}
   Solution areas they are exploring: ${d.solutionAreas}
   Current pain points: ${d.painPoints}
`).join('\n')}

For each delegate write a match briefing (2–3 sentences, written as a fluent narrative — NOT bullet points, NOT labelled sections).
The briefing should:
- Open by explaining what specific capability or product of the vendor connects to this delegate's situation
- Draw a concrete link between the vendor's offering and the delegate's pain points or active projects — use your own synthesis, not a paraphrase of the delegate's words
- Close with what the delegate stands to gain from this conversation, framed as a business outcome

Rules:
- Write in third person, present tense
- Do NOT mention the delegate's name, job title, company, or industry
- Do NOT use section labels (Primary alignment:, Secondary factors:, etc.)
- Do NOT simply repeat the delegate's own words — interpret and contextualise them
- Each briefing must be 2–3 complete sentences

Respond in JSON format:
{
  "matches": [
    {"attendeeId": "att_001", "reasoning": "..."},
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
                        reasoning: { type: "string" }
                      },
                      required: ["attendeeId", "reasoning"],
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
        for (const match of parsed.matches as Array<{ attendeeId: string; reasoning: string }>) {
          const meeting = batch.find((m: typeof confirmedMeetings[0]) => m.attendeeId === match.attendeeId);
          if (!meeting) continue;
          await db.updateMeeting(meeting.id, { matchReason: match.reasoning });
          totalUpdated++;
          console.log(`[RegenReasons] Updated meeting ${meeting.id} for ${match.attendeeId}`);
        }
      } catch (error) {
        console.error(`[RegenReasons] Error processing batch for sponsor ${sponsorId}:`, error);
      }
    }
  }

  console.log(`[RegenReasons] Done — updated ${totalUpdated} match reasons`);
  return totalUpdated;
}
