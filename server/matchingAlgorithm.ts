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
  sponsorTechnologyType: string,
  sponsorTargetOrgSize: string,
  sponsorName: string,
  delegates: Array<{
    id: string;
    painPoints: string;
    activeProjects: string;
    interests: string;
    currentProjectStage?: string;
    companySize?: string;
    industry?: string;
    budgetAuthority?: string;
    contractSignOff?: string;
    currentTechStack?: string;
  }>
): Promise<Map<string, { score: number; reasoning: string }>> {
  const scores = new Map<string, { score: number; reasoning: string }>();
  
  if (delegates.length === 0) return scores;
  
  try {
    const { invokeLLM } = await import("./_core/llm");
    
    // Build delegate list for AI — include all available fields
    const delegateList = delegates.map((d, idx) => {
      const lines = [
        `DELEGATE ${idx + 1} (ID: ${d.id}):`,
        d.painPoints ? `Current Pain Points: ${d.painPoints}` : null,
        d.activeProjects ? `Active / Confirmed Projects: ${d.activeProjects}` : null,
        d.interests ? `Meeting Objectives & Solution Areas of Interest: ${d.interests}` : null,
        d.currentProjectStage ? `Project Stage: ${d.currentProjectStage}` : null,
        d.companySize ? `Company Size: ${d.companySize}` : null,
        d.industry ? `Industry: ${d.industry}` : null,
        d.budgetAuthority ? `Budget Authority: ${d.budgetAuthority}` : null,
        d.contractSignOff ? `Contract Sign-Off Level: ${d.contractSignOff}` : null,
        // Tech stack is listed separately for exclusion check — NOT for scoring
        d.currentTechStack ? `Existing Tools (for conflict check only): ${d.currentTechStack}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    }).join("\n\n");
    
    const prompt = `You are a B2B matchmaking expert for a senior TA leadership event. Score how well this sponsor matches each delegate AND provide specific reasoning.

SPONSOR PROFILE:
Sponsor Name: ${sponsorName}
Product / Solutions: ${sponsorSolutions}
Pain Points They Solve: ${sponsorChallenges}
Technology Category: ${sponsorTechnologyType || "Not specified"}
Target Organisation Size: ${sponsorTargetOrgSize || "Not specified"}

${delegateList}

IMPORTANT — EXISTING CUSTOMER CHECK:
Each delegate profile may include an "Existing Tools" line listing their current ATS, CRM, Assessment Tool, Market Intelligence, and Other Tools.
DO NOT use this to score positively. Instead:
- If the delegate already uses the sponsor's product (or a direct competitor), note this in the reasoning as a potential conflict or existing relationship.
- This field should NEVER increase a delegate's score — it is for conflict detection only.

For each delegate:
1. Score the alignment from 0-100 where:
   - 90-100: Direct match — sponsor's solutions directly address delegate's stated pain points, active projects, or solution areas of interest
   - 75-89: Strong alignment — sponsor can solve most of delegate's challenges or objectives
   - 60-74: Moderate alignment — sponsor addresses some needs or there is clear category overlap
   - 40-59: Weak alignment — limited overlap, niche relevance only
   - 0-39: Poor alignment — minimal relevance

   Scoring factors (in priority order):
   a) Current pain points matching sponsor's solutions (highest weight)
   b) Active / confirmed projects matching sponsor's category or capability
   c) Meeting objectives and solution areas of interest
   d) Org size alignment with sponsor's target market
   e) Project stage ("Actively Evaluating Vendors" = higher urgency = higher score)
   
   DO NOT score based on existing tools — use those only for the conflict note.

2. Generate 1-2 sentence reasoning that MUST:
   - Quote or reference a SPECIFIC phrase from the delegate's pain points, active projects, or objectives
   - Explain HOW the sponsor's specific product/service addresses that exact need
   - If the delegate already uses the sponsor's product or a close competitor, add a brief note: "Note: delegate currently uses [tool]"
   - Be self-explanatory without needing to see the full profiles
   - Avoid generic terms like "AI platform", "optimization", or "alignment"
   
   REQUIRED FORMAT:
   Delegate's challenge 'exact quote' → Sponsor's specific solution addresses this by [how]
   
   Example GOOD reasoning:
   Delegate seeks 'candidate experience' and has active CRM replacement project → Sponsor's candidate engagement platform directly replaces legacy CRM with modern experience layer
   
   Example BAD reasoning:
   Sponsor's AI platform can help with delegate's ATS optimization needs

Respond with ONLY a JSON object mapping delegate IDs to {score, reasoning}, like:
{"10001": {"score": 85, "reasoning": "Delegate seeks AI-powered candidate screening → Sponsor's ML recruitment platform directly solves this"}, "10002": {"score": 72, "reasoning": "..."}, ...}

No other text, just the JSON.`;
    
    // Use AbortController to hard-cancel the fetch when the timeout fires.
    // Promise.race alone does not cancel the underlying HTTP connection, so
    // the stalled request would keep consuming resources and block Node's event loop.
    const LLM_TIMEOUT_MS = 75_000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[Matching] AI scoring timed out after ${LLM_TIMEOUT_MS / 1000}s for ${sponsorName} — aborting fetch`);
      abortController.abort();
    }, LLM_TIMEOUT_MS);
    let response;
    try {
      response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a B2B matchmaking scoring expert. Respond with only JSON." },
          { role: "user", content: prompt }
        ],
        signal: abortController.signal,
      });
    } catch (llmErr: unknown) {
      clearTimeout(timeoutId);
      const msg = llmErr instanceof Error ? llmErr.message : String(llmErr);
      console.error(`[Matching] AI scoring failed for ${sponsorName}: ${msg}`);
      return scores; // fall back to keyword scoring
    }
    clearTimeout(timeoutId);
    
    const content = response.choices[0]?.message?.content;
    const jsonText = typeof content === 'string' ? content.trim() : "{}";
    
    // Extract JSON from response (might have markdown code blocks)
    const jsonMatch = jsonText.match(/\{[\s\S]+\}/);
    if (!jsonMatch) {
      console.error("[Matching] AI response not valid JSON:", jsonText.substring(0, 200));
      return scores;
    }
    
    let scoresObj: Record<string, unknown>;
    try {
      scoresObj = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      // Try sanitising common LLM JSON issues: unescaped newlines inside strings,
      // trailing commas, and control characters
      try {
        const sanitised = jsonMatch[0]
          .replace(/[\x00-\x1F\x7F]/g, (c) => {
            // Keep valid JSON whitespace, escape the rest
            if (c === '\n' || c === '\r' || c === '\t') return ' ';
            return '';
          })
          .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        scoresObj = JSON.parse(sanitised);
      } catch (sanitiseErr) {
        console.error("[Matching] AI JSON parse failed after sanitisation:", String(parseErr).substring(0, 100));
        return scores;
      }
    }
    
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

    const REASON_TIMEOUT_MS = 30_000;
    const reasonTimeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[Matching] AI reasoning timed out after ${REASON_TIMEOUT_MS / 1000}s`)), REASON_TIMEOUT_MS)
    );
    const response = await Promise.race([
      invokeLLM({
        messages: [
          { role: "system", content: "You are a B2B matchmaking expert. Generate specific, contextual match reasoning." },
          { role: "user", content: prompt }
        ]
      }),
      reasonTimeoutPromise
    ]);
    
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

  // ─── Sponsor-specific hard exclusions (named existing clients) ───
  // These delegates are NEVER matched to these sponsors regardless of score or opt-in.
  const SPONSOR_HARD_EXCLUSIONS: Record<number, string[]> = {
    // Appcast (270002) — existing clients + Adam Binks (KPMG) + Joanna Saunders-Hare (MUFG)
    270002: ['4956154','7258470500','200543495570','190937723960','13454401','91889321035','5140258','76678269091','203946652193'],
    // hackajob (540001) — existing clients + Edwin Pene (Red Bull) + Jon Warwick (Sky) + Tush Wijeratne (WPP)
    540001: ['190937723960','13454401','9477501','1076201','9322701'],
    // JobSync (840001) — existing clients + Anna Katyal (BMS Group)
    840001: ['17812226737','7258470500','91889321035','190937723960','13454401','12731251','195183358360'],
    // SHL (750001) — existing clients + Carly George (AXA) + Sonal Jain (Nissan) + Nikhilesh Mathur (LSEG)
    750001: ['76678269091','7258470500','91889321035','13454401','93174643474','200543495570','91862577670','190937723960','113145184682','110260566550','191181016455','452351','5927642'],
    // Stepstone Group (150001) — existing clients + Yuliia Zembal (UKRSIBBANK BNP Paribas)
    150001: ['17812226737','200543495570','5927642','7258470500','128491656706'],
    // The Martec (780001) — named people not currently in attendee list, empty for now
    780001: [],
    // Zinc (300001) — BusyBees Nurseries
    300001: ['190937723960'],
  };
  const sponsorHardExcludeIds = new Set<string>(SPONSOR_HARD_EXCLUSIONS[sponsorId] ?? []);

  // ─── Opt-in awareness ───
  // Delegates who explicitly opted in to meet this sponsor get a scoring boost and a note.
  const sponsorNameNorm = (sponsor.companyName || '').toLowerCase();
  const optInAttendeeIds = new Set<string>(
    attendees
      .filter(a => (a.optInSponsors ?? []).some(s =>
        s.toLowerCase().includes(sponsorNameNorm) ||
        sponsorNameNorm.includes(s.toLowerCase())
      ))
      .map(a => a.id)
  );
  if (optInAttendeeIds.size > 0) {
    console.log(`[Matching] ${optInAttendeeIds.size} delegate(s) opted in to meet ${sponsor.companyName}`);
  }

  // ─── Cross-sponsor affinity boosts ───
  // JobSync (840001): delegates who opted in to Appcast get a +15 affinity boost
  // Veremark (810001): delegates who opted in to Zinc get a +15 affinity boost
  const CROSS_SPONSOR_AFFINITY: Record<number, string> = {
    840001: 'appcast',   // JobSync ← Appcast opt-ins
    810001: 'zinc',      // Veremark ← Zinc opt-ins
  };
  const affinitySourceSponsor = CROSS_SPONSOR_AFFINITY[sponsorId];
  const affinityAttendeeIds = affinitySourceSponsor
    ? new Set<string>(
        attendees
          .filter(a => (a.optInSponsors ?? []).some(s =>
            s.toLowerCase().includes(affinitySourceSponsor) ||
            affinitySourceSponsor.includes(s.toLowerCase())
          ))
          .map(a => a.id)
      )
    : new Set<string>();
  if (affinityAttendeeIds.size > 0) {
    console.log(`[Matching] ${affinityAttendeeIds.size} delegate(s) have cross-sponsor affinity for ${sponsor.companyName} (via ${affinitySourceSponsor})`);
  }

  // Transform attendees to delegate format — include all available fields for richer matching
  const allDelegates = attendees.map(a => ({
    id: 0, // Not used
    attendeeId: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    company: a.company || 'Unknown',
    jobTitle: a.jobTitle || '',
    industry: a.industry || null,
    // Primary matching fields — kept separate for clearer AI signal
    painPoints: a.currentPainPoints || '',
    activeProjects: a.activeConfirmedProjects || '',
    // Keep combined challenges for fallback scoring
    challenges: [a.currentPainPoints, a.activeConfirmedProjects].filter(Boolean).join('. '),
    interests: [a.primaryMeetingObjective, a.keySolutionAreasOfInterest].filter(Boolean).join('. '),
    // Additional context fields for richer AI scoring
    currentProjectStage: a.currentProjectStage || '',
    companySize: a.companySize || '',
    budgetAuthority: a.budgetAuthority || '',
    contractSignOff: a.contractSignOff || '',
    // Tech stack fields — used for conflict detection only, not scoring
    ats: a.ats || '',
    crm: a.crm || '',
    assessmentTool: a.assessmentTool || '',
    marketIntelligence: a.marketIntelligence || '',
    otherTools: a.otherTools || '',
    profileData: null,
    optedIn: optInAttendeeIds.has(a.id),
    hasAffinityBoost: affinityAttendeeIds.has(a.id),
    regionalRemit: a.regionalRemit || '',
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
  
  // ─── Global exclusions (never matched to any sponsor) ───
  // No global exclusions currently — delegates are managed via the attendees list
  const GLOBAL_EXCLUDED_DELEGATE_IDS = new Set<string>([]);

  // Filter out delegates who have reached capacity (8 meetings) and hard-excluded delegates
  const capacityFiltered = allDelegates.filter(delegate => {
    const currentCount = delegateMeetingCounts.get(delegate.attendeeId) || 0;
    if (currentCount >= 8) return false;
    if (GLOBAL_EXCLUDED_DELEGATE_IDS.has(delegate.attendeeId)) {
      console.log(`[Matching] Globally excluded ${delegate.firstName} ${delegate.lastName} — on global exclusion list`);
      return false;
    }
    if (sponsorHardExcludeIds.has(delegate.attendeeId)) {
      console.log(`[Matching] Hard-excluded ${delegate.firstName} ${delegate.lastName} (${delegate.company}) from ${sponsor.companyName} — named existing client`);
      return false;
    }
    return true;
  });
  console.log(`[Matching] ${capacityFiltered.length} delegates available (capacity + hard exclusions applied)`);

  // --- Existing customer exclusion ---
  // Build a set of normalised keywords from the sponsor's name and known product aliases
  // so we can fuzzy-match against each delegate's tech stack fields.
  const sponsorKeywords = (sponsor.companyName || "")
    .toLowerCase()
    .split(/[\s\-\/&,]+/)
    .map(w => w.replace(/[^a-z0-9]/g, ""))
    .filter(w => w.length > 2); // ignore short words like "and", "the"

  function isExistingCustomer(delegate: typeof capacityFiltered[0]): boolean {
    if (sponsorKeywords.length === 0) return false;
    const techFields = [
      delegate.ats,
      delegate.crm,
      delegate.assessmentTool,
      delegate.marketIntelligence,
      delegate.otherTools,
    ].join(' ').toLowerCase();
    return sponsorKeywords.some(kw => techFields.includes(kw));
  }

  // Sponsors where existing-customer exclusion is deliberately relaxed
  // (e.g. they want to meet existing customers, or quota can't be met otherwise)
  const SKIP_CUSTOMER_EXCLUSION = new Set([450001]); // PerchPeek

  const availableDelegates = SKIP_CUSTOMER_EXCLUSION.has(sponsorId)
    ? capacityFiltered
    : capacityFiltered.filter(d => !isExistingCustomer(d));
  const excludedAsCustomers = capacityFiltered.length - availableDelegates.length;
  if (excludedAsCustomers > 0) {
    console.log(`[Matching] Excluded ${excludedAsCustomers} existing customer(s) of ${sponsor.companyName} from match pool`);
  }
  // --- End existing customer exclusion ---

  // Batch score all delegates using AI (much faster than individual calls)
  const sponsorSolutions = intakeSubmission.companyBoilerplate || "";
  const sponsorPainPointsSolved = intakeSubmission.keyChallenges || "";
  const sponsorTechnologyType = intakeSubmission.technologyType || "";
  const sponsorTargetOrgSize = intakeSubmission.targetOrgSize || "";
  
  const delegatesForScoring = availableDelegates.map(d => ({
    id: d.attendeeId,
    painPoints: d.painPoints || "",
    activeProjects: d.activeProjects || "",
    interests: d.interests || "",
    currentProjectStage: d.currentProjectStage || "",
    companySize: d.companySize || "",
    industry: (d.industry as string) || "",
    budgetAuthority: d.budgetAuthority || "",
    contractSignOff: d.contractSignOff || "",
    // Tech stack for conflict detection only — NOT for scoring
    currentTechStack: [
      d.ats ? `ATS: ${d.ats}` : null,
      d.crm ? `CRM: ${d.crm}` : null,
      d.assessmentTool ? `Assessment: ${d.assessmentTool}` : null,
      d.marketIntelligence ? `Market Intel: ${d.marketIntelligence}` : null,
      d.otherTools ? `Other: ${d.otherTools}` : null,
    ].filter(Boolean).join(', ') || "",
  }));
  
  console.log(`[Matching] Batch scoring ${delegatesForScoring.length} delegates via AI...`);
  const aiScores = await batchScoreDelegates(
    sponsorSolutions,
    sponsorPainPointsSolved,
    sponsorTechnologyType,
    sponsorTargetOrgSize,
    sponsor.companyName || "",
    delegatesForScoring
  );
  console.log(`[Matching] AI batch scoring complete, got ${aiScores.size} scores`);
  
  // Score each available delegate
  const scoredMatches: MatchResult[] = [];
  
  for (const delegate of availableDelegates) {
    const isPriority = priorityAttendeeIds.has(delegate.attendeeId);
    const isOptIn = (delegate as any).optedIn === true;
    const hasAffinityBoost = (delegate as any).hasAffinityBoost === true;
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

      // Opt-in guarantee: delegates who explicitly opted in to meet this sponsor score 90%+
      // This ensures their expressed interest is always prioritised over AI scoring alone.
      if (isOptIn) {
        matchScore = Math.max(90, Math.min(100, matchScore + 15));
      }

      // Cross-sponsor affinity bonus: +15 points for delegates who opted in to a related sponsor
      if (hasAffinityBoost && !isOptIn) {
        matchScore = Math.min(100, matchScore + 15);
      }

      // PerchPeek global business bonus: +20 points for delegates with multi-regional remit
      // PerchPeek's relocation/mobility product is only relevant to globally-operating businesses
      if (sponsorId === 450001) {
        const remit = ((delegate as any).regionalRemit || '').toLowerCase();
        const isGlobal = remit.includes('other') || // 'Other' = Global in our data
          (remit.split(',').filter((r: string) => r.trim().length > 0).length >= 3); // 3+ regions = global
        if (isGlobal) {
          matchScore = Math.min(100, matchScore + 20);
        }
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
      if (isOptIn) {
        matchReason = `Delegate opted in to meet ${sponsor.companyName}. ` + matchReason;
      }
      if (hasAffinityBoost && !isOptIn) {
        const affinityLabel = affinitySourceSponsor ? affinitySourceSponsor.charAt(0).toUpperCase() + affinitySourceSponsor.slice(1) : 'a related sponsor';
        matchReason = `Delegate opted in to meet ${affinityLabel} (similar solution space). ` + matchReason;
      }
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
  
  // Filter out matches below minimum threshold (except priority delegates)
  // SHL (750001) and PerchPeek (450001) use 0% threshold to fill quota when delegate pool is thin
  const minScoreThreshold = (sponsorId === 750001 || sponsorId === 450001) ? 0 : 30;
  const qualityMatches = scoredMatches.filter(m => m.isPriority || m.matchScore >= minScoreThreshold);
  
  // Return ALL quality matches as a buffer — the caller (run-match-final.ts) will pick
  // the best N that still have capacity, ensuring later sponsors can fill their quota
  // even when top-ranked delegates are already at the 8-meeting cap.
  const topMatches = qualityMatches; // return all, not just top N
  console.log(`[Matching] Returning ${topMatches.length} matches (buffer for ${meetingCount} needed)`);
  if (topMatches.length > 0) {
    console.log(`[Matching] Top 3 scores: ${topMatches.slice(0, 3).map(m => `${m.delegateInfo.firstName} ${m.delegateInfo.lastName}: ${m.matchScore}%`).join(', ')}`);
  }
  
  // Log quality distribution
  const above65 = topMatches.filter(m => m.matchScore >= 65).length;
  const between30and65 = topMatches.filter(m => m.matchScore >= 30 && m.matchScore < 65).length;
  console.log(`[Matching] Quality distribution: ${above65} above 65%, ${between30and65} between 30-65%`);
  
  return topMatches;
}

/**
 * Generate meetings for all sponsors
 */
export async function generateMeetingsForAllSponsors(
  onProgress?: (event: import('./matchProgress').MatchProgressEvent) => void,
  excludedSponsorIds?: Set<number>,
  orderedSponsorIds?: number[]
): Promise<Map<number, MatchResult[]>> {
  const allSponsors = await db.getAllSponsors();
  const results = new Map<number, MatchResult[]>();

  // Load all intake submissions upfront so we can sort by submission date
  const allIntake = await db.getAllIntakeSubmissions();
  const intakeBySponsors = new Map(allIntake.map(s => [s.sponsorId, s]));

  let eligibleSponsors;
  if (orderedSponsorIds && orderedSponsorIds.length > 0) {
    // Use the caller-specified order (e.g. most-constrained sponsors first)
    const sponsorMap = new Map(allSponsors.map(s => [s.id, s]));
    eligibleSponsors = orderedSponsorIds
      .filter(id => sponsorMap.has(id) && intakeBySponsors.has(id) && !(excludedSponsorIds?.has(id)))
      .map(id => sponsorMap.get(id)!);
    console.log('[Matching] Processing sponsors in caller-specified order (most-constrained first)');
  } else {
    // Sort sponsors by intake submission date ascending (earliest submitter gets priority)
    const sortedSponsors = [...allSponsors].sort((a, b) => {
      const aDate = intakeBySponsors.get(a.id)?.submittedAt;
      const bDate = intakeBySponsors.get(b.id)?.submittedAt;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;  // no intake → push to end
      if (!bDate) return -1;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
    // Filter to only sponsors with intake forms AND not in the exclusion set
    eligibleSponsors = sortedSponsors.filter(s =>
      intakeBySponsors.has(s.id) && !(excludedSponsorIds?.has(s.id))
    );
    console.log('[Matching] Processing sponsors in intake submission order (earliest first)');
  }

  const totalSponsors = eligibleSponsors.length;
  let completedSponsors = 0;

  // Emit start event
  onProgress?.({ type: 'start', totalSponsors, phase: 'scoring' });

  // Package overrides: correct values where intake form has wrong data
  const PACKAGE_OVERRIDES_ALG: Record<number, number> = {
    750001: 24, // SHL: 24 meetings
    870001: 12, // Wilson: 12 meetings (not 20)
    390001: 10, // Bright Apply: 10 meetings
    // 600001 (Happydance) uses leftover logic in the caller, request 12 candidates here
  };

  for (const sponsor of eligibleSponsors) {
    const intakeSubmission = intakeBySponsors.get(sponsor.id)!;
    const basePkg = intakeSubmission.meetingPackage === "20" ? 20 : 12;
    const meetingCount = PACKAGE_OVERRIDES_ALG[sponsor.id] ?? basePkg;
    const sponsorName = sponsor.companyName || `Sponsor ${sponsor.id}`;
    
    // Emit scoring start for this sponsor
    onProgress?.({ type: 'scoring_start', sponsorId: sponsor.id, sponsorName, totalSponsors, completedSponsors, phase: 'scoring' });
    
    try {
      const matches = await generateMeetingsForSponsor(sponsor.id, meetingCount);
      results.set(sponsor.id, matches);
      completedSponsors++;
      onProgress?.({ type: 'scoring_complete', sponsorId: sponsor.id, sponsorName, meetingCount: matches.length, totalSponsors, completedSponsors, phase: 'scoring' });
    } catch (error) {
      console.error(`Failed to generate meetings for sponsor ${sponsor.id}:`, error);
      completedSponsors++;
      onProgress?.({ type: 'sponsor_error', sponsorId: sponsor.id, sponsorName, error: String(error), totalSponsors, completedSponsors });
    }
  }
  
  return results;
}
