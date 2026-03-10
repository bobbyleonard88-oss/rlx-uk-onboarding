/**
 * AI Matching Engine
 * Uses LLM to semantically match vendors with delegates based on solutions/needs
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { attendees } from "./attendees";

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

  // Use attendees list directly (delegateProfiles DB table is not populated)
  if (attendees.length === 0) {
    throw new Error("No delegate profiles available for matching");
  }

  // Check cache first - get all cached matches for this sponsor
  const cachedMatches = await db.getMatchCacheBySponsor(sponsorId);
  const cachedAttendeeIds = new Set(cachedMatches.map((m: any) => m.attendeeId));
  
  // Separate delegates into cached and uncached
  const uncachedDelegates = attendees.filter(d => !cachedAttendeeIds.has(d.id));
  
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
    
    const prompt = `You are a senior matchmaking consultant writing pre-meeting briefings for a vendor at a curated B2B event. Your role is to explain — precisely and honestly — why this vendor and delegate are matched, based strictly on what each party has actually stated. You must not invent, assume, or infer anything that is not explicitly present in the data below.

VENDOR PROFILE:
Company: ${vendorProfile.companyName}
Solutions offered: ${vendorProfile.solutions}
Problems they solve: ${vendorProfile.painPoints}
Target market: ${vendorProfile.targetIndustries}

DELEGATES TO ASSESS:
${batch.map((d, idx) => {
  return `
${idx + 1}. ID: ${d.id}
   Active projects: ${d.activeConfirmedProjects || 'N/A'}
   What they want from this meeting: ${d.primaryMeetingObjective || 'N/A'}
   Solution areas they are exploring: ${d.keySolutionAreasOfInterest || 'N/A'}
   Current pain points: ${d.currentPainPoints || 'N/A'}
`}).join('\n')}

For each delegate provide:

1. MATCH SCORE (0–100) — score based solely on how specifically the vendor's stated solutions address the delegate's stated pain points, active projects, and meeting objectives:
   85–100: The delegate has explicitly named a challenge or project that the vendor directly addresses
   65–84: Clear thematic overlap between what the vendor solves and what the delegate has stated they need
   45–64: Some relevant overlap but the delegate's stated needs are only partially addressed
   25–44: Limited connection — the vendor is tangentially relevant at best
   0–24: No meaningful overlap between what the vendor does and what the delegate has stated
   IMPORTANT: If the delegate's profile data is sparse (mostly N/A), the score must reflect that uncertainty — do not inflate. If there is a specific, direct match between a stated pain point and a vendor solution, score it highly.

2. MATCH BRIEFING — 2 sentences maximum, written as a direct, factual statement grounded in the delegate's actual words:
   - Sentence 1: Name the specific thing the delegate has said (their pain point, active project, or meeting objective) and connect it directly to a specific capability the vendor has stated they offer. Use concrete language.
   - Sentence 2: State what the delegate stands to gain from this conversation as a specific, grounded outcome — not a vague possibility.
   
   STRICT RULES FOR THE BRIEFING:
   - NEVER use assumption language: banned words include "could", "might", "may", "potential", "possibly", "likely", "perhaps", "would benefit from", "appears to"
   - ONLY reference things the delegate has explicitly stated — do not infer from their job title, company size, or industry
   - If the delegate's profile is sparse, write a shorter, honest briefing that reflects what IS known
   - Do NOT use section labels or bullet points
   - Write in third person, present tense
   - Do NOT mention the delegate's name, job title, company name, or industry
   
   GOOD example (delegate stated: pain point = "high-volume CV screening taking too long", vendor solution = "AI-powered screening automation"):
   "This delegate is actively dealing with the time cost of high-volume CV screening — a problem ${vendorProfile.companyName} addresses directly through automated screening workflows. The conversation offers a concrete path to reducing screening time and freeing their team to focus on higher-value hiring decisions."
   
   BAD example (do NOT produce this):
   "${vendorProfile.companyName}'s expertise in AI aligns with this delegate's potential need to streamline recruitment. The delegate could gain insights into how AI solutions can enhance efficiency."

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
  const allIntake = await db.getAllIntakeSubmissions();
  // Use attendees list directly — delegateProfiles DB table is not populated

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

      // Build delegate data for this batch using the attendees list
      const batchDelegates = batch.map((m: typeof confirmedMeetings[0]) => {
        const att = attendees.find(a => a.id === m.attendeeId);
        return {
          meetingId: m.id,
          attendeeId: m.attendeeId,
          activeProjects: att?.activeConfirmedProjects || 'N/A',
          meetingObjective: att?.primaryMeetingObjective || 'N/A',
          solutionAreas: att?.keySolutionAreasOfInterest || 'N/A',
          painPoints: att?.currentPainPoints || 'N/A',
        };
      });

      const vp = vendorProfile!;
      const prompt = `You are a senior matchmaking consultant writing pre-meeting briefings for a vendor at a curated B2B event. Your role is to explain — precisely and honestly — why this vendor and delegate are matched, based strictly on what each party has actually stated. You must not invent, assume, or infer anything that is not explicitly present in the data below.

VENDOR PROFILE:
Company: ${vp.companyName}
Solutions offered: ${vp.solutions}
Problems they solve: ${vp.painPoints}
Target market: ${vp.targetIndustries}

DELEGATES TO ASSESS:
${batchDelegates.map((d: { meetingId: number; attendeeId: string; activeProjects: string; meetingObjective: string; solutionAreas: string; painPoints: string }, idx: number) => `
${idx + 1}. ID: ${d.attendeeId}
   Active projects: ${d.activeProjects}
   What they want from this meeting: ${d.meetingObjective}
   Solution areas they are exploring: ${d.solutionAreas}
   Current pain points: ${d.painPoints}
`).join('\n')}

For each delegate write a MATCH BRIEFING — 2 sentences maximum, written as a direct, factual statement grounded in the delegate's actual words:
- Sentence 1: Name the specific thing the delegate has said (their pain point, active project, or meeting objective) and connect it directly to a specific capability the vendor has stated they offer. Use concrete language.
- Sentence 2: State what the delegate stands to gain from this conversation as a specific, grounded outcome — not a vague possibility.

STRICT RULES:
- NEVER use assumption language: banned words include "could", "might", "may", "potential", "possibly", "likely", "perhaps", "would benefit from", "appears to"
- ONLY reference things the delegate has explicitly stated — do not infer from their job title, company size, or industry
- If the delegate's profile is sparse (mostly N/A), write a shorter honest briefing reflecting what IS known — do not pad with assumptions
- Do NOT use section labels or bullet points
- Write in third person, present tense
- Do NOT mention the delegate's name, job title, company name, or industry

GOOD example (delegate stated: pain point = "high-volume CV screening taking too long", vendor solution = "AI-powered screening automation"):
"This delegate is actively dealing with the time cost of high-volume CV screening — a problem ${vp.companyName} addresses directly through automated screening workflows. The conversation offers a concrete path to reducing screening time and freeing their team to focus on higher-value hiring decisions."

BAD example (do NOT produce this):
"${vp.companyName}'s expertise in AI aligns with this delegate's potential need to streamline recruitment. The delegate could gain insights into how AI solutions can enhance efficiency."

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
