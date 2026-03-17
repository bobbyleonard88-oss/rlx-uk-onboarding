/**
 * Script to generate AI match scores and reasons for manually added meetings
 * Jon Warwick (Sky) and Alan MacKinnon (Smith + Nephew) against SHL
 */
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB_URL = process.env.DATABASE_URL;

// SHL sponsor profile
const shlProfile = {
  companyName: "SHL",
  solutions: "Talent assessment, psychometric testing, cognitive ability tests, personality assessments, situational judgement tests, 360 feedback, leadership assessment, graduate assessment, volume hiring assessment, AI-powered talent measurement",
  painPointsSolved: "Hiring quality, reducing bias in selection, predicting job performance, identifying high-potential leaders, reducing time-to-hire, improving candidate experience, workforce analytics, skills-based hiring",
  targetOrgSize: "Enterprise (1000+ employees)",
  targetIndustries: "All industries, particularly financial services, retail, technology, healthcare, professional services"
};

// Jon Warwick (Sky) profile
const jonWarwick = {
  id: "1076201",
  firstName: "Jon",
  lastName: "Warwick",
  company: "Sky",
  jobTitle: "Group Director TA",
  companySize: "20,001-50,000",
  industry: "Broadcast Media",
  assessmentTool: "Sova, SHL, Cappfinity, Codility",
  ats: "Workday",
  activeProjects: "Assessment Tech, RPO renewal, AI",
  activeBudgetRange: "£100-500k",
  meetingObjective: "Networking with peers and sharing ideas on future focus.",
  contractSignOff: "> £1m",
  solutionAreas: "AI, Assessment tech, Talent Marketplace, Skills",
  painPoints: "",
  projectStage: "Planning & Budgeting (3-6 Months)",
  regionalRemit: "EMEA",
  optInSponsors: ["SHL"],
  budgetAuthority: "Final Budget Holder"
};

// Alan MacKinnon (Smith + Nephew) profile
const alanMacKinnon = {
  id: "8713772",
  firstName: "Alan",
  lastName: "Mackinnon",
  company: "Smith and Nephew plc",
  jobTitle: "Senior Director of Talent Acquisition EMEA & APAC",
  companySize: "10,001-20,000",
  industry: "Medical Devices",
  assessmentTool: "SHL",
  ats: "Workday",
  activeProjects: "Background Checks, Contingent worker RPO and MSP, Selection and assessment technology, Hiring Manager and end users education & support",
  activeBudgetRange: "£500k-£1m",
  meetingObjective: "Better understanding of how the solutions are better than existing partnerships/solutions; Approaches to implementation, adoption and realization of benefits",
  contractSignOff: "< £50k",
  solutionAreas: "Contingent worker RPO",
  painPoints: "Balancing global consistency with regional relevance (legal, cultural, language etc); driving positive process and tech adoption across users and stakeholders; Fully capitalizing on the benefits of Tech, AI & Automation while protecting the human experience of recruitment",
  projectStage: "Benchmarking for Future Use (6-12 Months)",
  regionalRemit: "EMEA, APAC",
  budgetAuthority: "Key Influencer"
};

async function generateScore(delegate, sponsor) {
  const prompt = `You are an expert B2B matchmaker for a senior HR/TA leadership event. Score how well this delegate matches with this vendor/sponsor for a 30-minute 1:1 meeting.

SPONSOR PROFILE:
Company: ${sponsor.companyName}
Solutions: ${sponsor.solutions}
Pain Points Solved: ${sponsor.painPointsSolved}
Target Org Size: ${sponsor.targetOrgSize}
Target Industries: ${sponsor.targetIndustries}

DELEGATE PROFILE:
Name: ${delegate.firstName} ${delegate.lastName}
Company: ${delegate.company}
Job Title: ${delegate.jobTitle}
Company Size: ${delegate.companySize}
Industry: ${delegate.industry}
Current Assessment Tools: ${delegate.assessmentTool}
ATS: ${delegate.ats}
Active Projects: ${delegate.activeProjects}
Budget Range: ${delegate.activeBudgetRange}
Meeting Objective: ${delegate.meetingObjective}
Contract Sign-off Authority: ${delegate.contractSignOff}
Solution Areas of Interest: ${delegate.solutionAreas}
Current Pain Points: ${delegate.painPoints || 'Not specified'}
Project Stage: ${delegate.projectStage}
Regional Remit: ${delegate.regionalRemit}
Budget Authority: ${delegate.budgetAuthority}
Opted in to meet this sponsor: ${delegate.optInSponsors?.includes(sponsor.companyName) ? 'YES' : 'NO'}

SCORING CRITERIA:
- Opt-in to meet this sponsor: very high weight (guarantees 90%+)
- Active projects aligning with sponsor solutions: high weight
- Pain points matching sponsor's value proposition: high weight  
- Budget authority and sign-off level: medium weight
- Company size matching target: medium weight
- Current tools (existing customer consideration): note if relevant
- Meeting objective alignment: medium weight

Return JSON with exactly these fields:
{
  "score": <integer 0-100>,
  "reason": "<2-3 sentence explanation of why this is a strong match, referencing specific projects, pain points, or objectives. Be specific and insightful, not generic.>"
}`;

  const response = await fetch(`${process.env.BUILT_IN_FORGE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a precise B2B matchmaking expert. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

async function main() {
  const conn = await createConnection(DB_URL);
  
  try {
    // Generate scores for both delegates
    console.log('Generating score for Jon Warwick (Sky) vs SHL...');
    const jonScore = await generateScore(jonWarwick, shlProfile);
    console.log(`Jon Warwick: ${jonScore.score}% - ${jonScore.reason}`);

    console.log('\nGenerating score for Alan MacKinnon (Smith + Nephew) vs SHL...');
    const alanScore = await generateScore(alanMacKinnon, shlProfile);
    console.log(`Alan MacKinnon: ${alanScore.score}% - ${alanScore.reason}`);

    // Update Jon Warwick's meeting
    const [jonResult] = await conn.execute(
      'UPDATE meetings SET matchScore = ?, matchReason = ? WHERE sponsorId = 750001 AND attendeeId = ?',
      [jonScore.score, jonScore.reason, '1076201']
    );
    console.log(`\nUpdated Jon Warwick's meeting: ${jonResult.affectedRows} row(s)`);

    // Update Alan MacKinnon's meeting
    const [alanResult] = await conn.execute(
      'UPDATE meetings SET matchScore = ?, matchReason = ? WHERE sponsorId = 750001 AND attendeeId = ?',
      [alanScore.score, alanScore.reason, '8713772']
    );
    console.log(`Updated Alan MacKinnon's meeting: ${alanResult.affectedRows} row(s)`);

    console.log('\nDone! Both meetings updated with AI scores and reasons.');
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
