/**
 * Demo script: generate 3 example match reasons for each real sponsor
 * Run with: npx tsx scripts/demo-matches.ts
 */
import 'dotenv/config';
import { invokeLLM } from '../server/_core/llm';
import { attendees } from '../server/attendees';
import mysql2 from 'mysql2/promise';
import { writeFileSync } from 'fs';

const REAL_SPONSORS = [
  'Appcast',
  'Bright Apply',
  'hackajob',
  'Happydance Careers Websites',
  'Harver',
  'Maki People',
  'PerchPeek',
  'Sapia.ai',
  'Stepstone Group UK Ltd',
  'Symphony Talent',
  'Udder',
  'Zinc',
];

// 3 diverse delegates with rich profiles
const DEMO_DELEGATE_IDS = ['4956154', '7258470500', '194295425320'];

async function main() {
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);

  const placeholders = REAL_SPONSORS.map(() => '?').join(',');
  const [intakeRows] = await conn.execute<any[]>(
    `SELECT sponsorId, companyName, technologyType, keyChallenges, targetOrgSize
     FROM intakeSubmissions
     WHERE companyName IN (${placeholders})
     ORDER BY companyName`,
    REAL_SPONSORS
  );

  await conn.end();

  const demoDelegates = DEMO_DELEGATE_IDS.map(id => {
    const a = attendees.find(d => d.id === id);
    if (!a) throw new Error(`Delegate ${id} not found`);
    return a;
  });

  const results: { company: string; matches: { name: string; score: number; reason: string }[] }[] = [];

  for (const sponsor of intakeRows) {
    const delegateBlock = demoDelegates.map((d, idx) => `
${idx + 1}. INDEX: ${idx}
   Active projects: ${d.activeConfirmedProjects || 'N/A'}
   What they want from this meeting: ${d.primaryMeetingObjective || 'N/A'}
   Solution areas they are exploring: ${d.keySolutionAreasOfInterest || 'N/A'}
   Current pain points: ${d.currentPainPoints || 'N/A'}
`).join('\n');

    const prompt = `You are a senior matchmaking consultant writing pre-meeting briefings for a vendor at a curated B2B event. Your role is to explain — precisely and honestly — why this vendor and delegate are matched, based strictly on what each party has actually stated. You must not invent, assume, or infer anything that is not explicitly present in the data below.

VENDOR PROFILE:
Company: ${sponsor.companyName}
Technology type: ${sponsor.technologyType}
Problems they solve / solutions offered: ${sponsor.keyChallenges}
Target organisation size: ${sponsor.targetOrgSize}

DELEGATES TO ASSESS:
${delegateBlock}

For each delegate (identified by INDEX 0, 1, 2) provide:

1. MATCH SCORE (0–100):
   85–100: Delegate explicitly named a challenge or project the vendor directly addresses
   65–84: Clear thematic overlap between vendor solutions and delegate stated needs
   45–64: Partial overlap — some relevant areas but not fully addressed
   25–44: Limited connection — vendor is tangentially relevant at best
   0–24: No meaningful overlap
   If delegate data is sparse (mostly N/A), score must reflect that uncertainty — do not inflate.

2. MATCH BRIEFING — 2 sentences maximum:
   - Sentence 1: Name the specific thing the delegate has said (pain point, active project, or meeting objective) and connect it directly to a specific capability the vendor has stated they offer.
   - Sentence 2: State what the delegate stands to gain from this conversation as a specific, grounded outcome.
   
   STRICT RULES:
   - NEVER use: "could", "might", "may", "potential", "possibly", "likely", "perhaps", "would benefit from", "appears to"
   - ONLY reference things the delegate has explicitly stated
   - Do NOT use section labels or bullet points
   - Write in third person, present tense
   - Do NOT mention the delegate's name, job title, company name, or industry

Respond ONLY with valid JSON in this exact format:
{
  "matches": [
    {"index": 0, "score": 85, "reason": "..."},
    {"index": 1, "score": 72, "reason": "..."},
    {"index": 2, "score": 60, "reason": "..."}
  ]
}`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a precise matchmaking consultant. Respond with valid JSON only, no markdown, no code blocks.' },
          { role: 'user', content: prompt },
        ],
      });

      const content = response.choices[0].message.content.trim()
        .replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(content);
      
      const matches = (parsed.matches || []).map((m: any) => ({
        name: demoDelegates[m.index] ? `${demoDelegates[m.index].firstName} ${demoDelegates[m.index].lastName}` : `Delegate ${m.index}`,
        score: m.score,
        reason: m.reason,
      }));

      results.push({ company: sponsor.companyName, matches });
      console.log(`✓ ${sponsor.companyName}`);
    } catch (err: any) {
      console.error(`✗ ${sponsor.companyName}:`, err.message);
      results.push({ company: sponsor.companyName, matches: [] });
    }
  }

  // Write results to file
  let output = '=== MATCH REASON EXAMPLES ===\n';
  for (const { company, matches } of results) {
    output += `\n\n--- ${company} ---\n`;
    for (const m of matches) {
      output += `\nDelegate: ${m.name}\n`;
      output += `Score: ${m.score}\n`;
      output += `Reason: ${m.reason}\n`;
    }
  }
  writeFileSync('/tmp/match-demo-results.txt', output);
  console.log('\nResults written to /tmp/match-demo-results.txt');
}

main().catch(console.error);
