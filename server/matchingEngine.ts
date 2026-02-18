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

  // Get sponsor's rankings
  const submissions = await db.getRankingsSubmissionsBySponsor(sponsorId);
  const latestSubmission = submissions[0];
  const topRankedIds = latestSubmission 
    ? JSON.parse(latestSubmission.rankingsData).slice(0, 12)
    : [];

  // Get priority tags
  const priorityTags = await db.getPriorityTagsBySponsor(sponsorId);
  const priorityAttendeeIds = priorityTags.map(t => t.attendeeId);

  // Batch process delegates in groups for efficiency
  const batchSize = 10;
  const results: MatchResult[] = [];

  for (let i = 0; i < delegateProfiles.length; i += batchSize) {
    const batch = delegateProfiles.slice(i, i + batchSize);
    
    const prompt = `You are an expert B2B matchmaker. Analyze how well this vendor matches with each delegate.

VENDOR PROFILE:
Company: ${vendorProfile.companyName}
Solutions: ${vendorProfile.solutions}
Pain Points They Solve: ${vendorProfile.painPoints}
Target Industries: ${vendorProfile.targetIndustries}

DELEGATES TO MATCH:
${batch.map((d, idx) => {
  // Parse profileData to get all free-text fields
  const profile = d.profileData ? JSON.parse(d.profileData) : {};
  return `
${idx + 1}. ID: ${d.attendeeId}
   Name: ${d.firstName} ${d.lastName}
   Company: ${d.company}
   Title: ${d.jobTitle}
   Industry: ${d.industry}
   Pain Points: ${profile.painPoints || d.challenges || 'N/A'}
   Solution Areas: ${profile.solutionAreas || d.interests || 'N/A'}
   Active Projects: ${profile.activeProjects || 'N/A'}
   Meeting Objective: ${profile.meetingObjective || 'N/A'}
   Project Stage: ${profile.projectStage || 'N/A'}
`}).join('\n')}

For each delegate, provide:
1. Match score (0-100) based on how well the vendor's solutions address the delegate's pain points, solution areas, active projects, and meeting objectives
2. Detailed reasoning (2-3 sentences minimum) explaining the match with this exact structure:
   - Start with PRIMARY ALIGNMENT: Explain the main connection between vendor solutions and delegate needs
   - Add SECONDARY FACTORS: Mention industry match, company size, project stage, or other relevant alignments
   - End with POTENTIAL VALUE: Describe what the delegate would gain from this meeting

Example reasoning format:
"Primary alignment: Vendor's recruitment automation platform directly addresses delegate's pain point around manual screening processes. Secondary factors: Both operate in Tech industry with 5k-10k employees, delegate is actively evaluating ATS solutions. Potential value: Could reduce time-to-hire by 40% and improve candidate quality through AI-powered matching."

IMPORTANT: Every reasoning MUST be at least 2 full sentences and cite specific details from both profiles.

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
        results.push({
          sponsorId,
          attendeeId: match.attendeeId,
          matchScore: Math.round(match.score),
          reasoning: match.reasoning,
          isTopRanked: topRankedIds.includes(match.attendeeId),
          isPriority: priorityAttendeeIds.includes(match.attendeeId),
        });
      }
    } catch (error) {
      console.error(`Error processing batch ${i / batchSize}:`, error);
    }
  }

  // Sort by priority first, then top-ranked, then score
  results.sort((a, b) => {
    if (a.isPriority !== b.isPriority) return b.isPriority ? 1 : -1;
    if (a.isTopRanked !== b.isTopRanked) return b.isTopRanked ? 1 : -1;
    return b.matchScore - a.matchScore;
  });

  return results;
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
