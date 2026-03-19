import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get affected meeting IDs
const [affected] = await conn.execute(`
  SELECT m.id, m.attendeeId, m.sponsorId, m.matchScore, m.matchReason,
         s.companyName as sponsor,
         CONCAT(d.firstName, ' ', d.lastName) as delegate,
         d.company as delegateCompany,
         d.jobTitle,
         d.challenges, d.interests, d.currentPainPoints, d.keySolutionAreas,
         d.activeConfirmedProjects, d.primaryMeetingObjective, d.profileData
  FROM meetings m
  JOIN sponsors s ON s.id = m.sponsorId
  JOIN delegateProfiles d ON d.attendeeId = m.attendeeId
  WHERE m.matchReason IS NULL 
     OR m.matchReason = '' 
     OR m.matchReason = 'null'
     OR m.matchScore IS NULL 
     OR m.matchScore = 0
     OR m.matchReason LIKE '%manual%'
     OR m.matchReason LIKE '%Manual%'
     OR m.matchReason LIKE '%manually%'
  ORDER BY s.companyName, d.lastName
`);

console.log(`Processing ${affected.length} affected meetings...`);

// Get all vendor profiles for reference
const [vendors] = await conn.execute(`SELECT sponsorId, companyName, solutions, painPoints, targetIndustries, profileData FROM vendorProfiles`);
const vendorMap = new Map(vendors.map(v => [v.sponsorId, v]));

// Also get sponsor intake data
const [intakes] = await conn.execute(`SELECT sponsorId, companyName, technologyType, companyBoilerplate, keyChallenges, targetOrgSize FROM intakeSubmissions`);
const intakeMap = new Map(intakes.map(i => [i.sponsorId, i]));

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function generateMatchReason(meeting) {
  const vendor = vendorMap.get(meeting.sponsorId);
  const intake = intakeMap.get(meeting.sponsorId);

  // Build delegate context
  let delegateContext = `Delegate: ${meeting.delegate}, ${meeting.jobTitle} at ${meeting.delegateCompany}`;
  if (meeting.currentPainPoints) delegateContext += `\nPain points: ${meeting.currentPainPoints}`;
  if (meeting.keySolutionAreas) delegateContext += `\nKey solution areas: ${meeting.keySolutionAreas}`;
  if (meeting.activeConfirmedProjects) delegateContext += `\nActive projects: ${meeting.activeConfirmedProjects}`;
  if (meeting.primaryMeetingObjective) delegateContext += `\nMeeting objective: ${meeting.primaryMeetingObjective}`;
  if (meeting.challenges) delegateContext += `\nChallenges: ${meeting.challenges}`;

  // Try to get more from profileData
  if (meeting.profileData) {
    try {
      const pd = JSON.parse(meeting.profileData);
      if (pd.currentPainPoints && !meeting.currentPainPoints) delegateContext += `\nPain points: ${pd.currentPainPoints}`;
      if (pd.keySolutionAreasOfInterest) delegateContext += `\nSolution areas of interest: ${pd.keySolutionAreasOfInterest}`;
      if (pd.activeConfirmedProjects) delegateContext += `\nActive projects: ${pd.activeConfirmedProjects}`;
      if (pd.primaryMeetingObjective) delegateContext += `\nMeeting objective: ${pd.primaryMeetingObjective}`;
    } catch {}
  }

  // Build sponsor context
  let sponsorContext = `Sponsor: ${meeting.sponsor}`;
  if (vendor?.solutions) sponsorContext += `\nSolutions: ${vendor.solutions}`;
  if (vendor?.painPoints) sponsorContext += `\nPain points they address: ${vendor.painPoints}`;
  if (vendor?.targetIndustries) sponsorContext += `\nTarget industries: ${vendor.targetIndustries}`;
  if (intake?.technologyType) sponsorContext += `\nTechnology type: ${intake.technologyType}`;
  if (intake?.companyBoilerplate) sponsorContext += `\nCompany overview: ${intake.companyBoilerplate}`;
  if (intake?.keyChallenges) sponsorContext += `\nKey challenges they solve: ${intake.keyChallenges}`;
  if (intake?.targetOrgSize) sponsorContext += `\nTarget org size: ${intake.targetOrgSize}`;

  const prompt = `You are an expert talent acquisition conference matchmaker. Based on the delegate and sponsor information below, provide:
1. A match score (0-100) reflecting how well this pairing serves the delegate's needs
2. A concise match reason (2-3 sentences) explaining specifically WHY this delegate and sponsor are a good match, referencing their specific pain points, projects, or objectives and the sponsor's relevant solutions

Scoring guide:
- 85-100: Excellent — sponsor directly solves delegate's active projects or top pain points
- 70-84: Good — strong alignment on key challenges or solution areas
- 55-69: Moderate — some overlap but not the delegate's primary focus
- 30-54: Weak — limited alignment, peripheral relevance only

${delegateContext}

${sponsorContext}

Respond in JSON only: {"score": <number>, "reason": "<2-3 sentence reason>"}
Do NOT mention that the delegate opted in or was manually added. Focus purely on the business/solution fit.`;

  const response = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FORGE_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content from LLM: ' + JSON.stringify(data));
  
  const parsed = JSON.parse(content);
  return { score: parsed.score, reason: parsed.reason };
}

// Process each affected meeting
for (const meeting of affected) {
  try {
    console.log(`\nProcessing: ${meeting.delegate} <-> ${meeting.sponsor} (id=${meeting.id})`);
    const { score, reason } = await generateMatchReason(meeting);
    console.log(`  Score: ${score}, Reason: ${reason.substring(0, 80)}...`);
    
    await conn.execute(
      'UPDATE meetings SET matchScore = ?, matchReason = ? WHERE id = ?',
      [score, reason, meeting.id]
    );
    console.log(`  ✅ Updated`);
  } catch (err) {
    console.error(`  ❌ Error for meeting ${meeting.id}:`, err.message);
  }
}

console.log('\nDone!');
await conn.end();
