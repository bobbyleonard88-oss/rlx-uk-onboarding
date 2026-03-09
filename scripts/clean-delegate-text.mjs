import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function callLLM(systemPrompt, userPrompt) {
  const res = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

const TEXT_FIELDS = [
  'primaryMeetingObjective',
  'activeConfirmedProjects',
  'currentPainPoints',
  'keySolutionAreas',
  'toolsOther',
  'toolsATS',
  'toolsCRM',
  'toolsAssessments',
  'toolsTalentIntelligence',
  'currentProjectStage',
  'challenges',
  'interests',
];

const SYSTEM_PROMPT = `You are a professional copy editor. Fix spelling mistakes, grammar errors, and improve clarity in the provided text fields. Rules:
1. Fix typos and spelling errors
2. Fix obvious grammar issues  
3. Remove parenthetical commentary like "(terrible, needs replacing)" — strip the parenthetical part, keep the product name
4. Capitalise proper nouns (product names, company names like Workday, SAP, LinkedIn)
5. Keep the same tone and voice — do not add words or change meaning
6. Do NOT change numerical values, percentages, or specific data
7. Return ONLY valid JSON with the exact same field names as input`;

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT id, ${TEXT_FIELDS.join(', ')}
  FROM delegateProfiles
  WHERE primaryMeetingObjective IS NOT NULL
     OR activeConfirmedProjects IS NOT NULL
     OR currentPainPoints IS NOT NULL
     OR keySolutionAreas IS NOT NULL
`);

console.log(`Processing ${rows.length} delegates...`);

const results = [];
let successCount = 0;
let errorCount = 0;

for (const row of rows) {
  const fieldsToClean = {};
  for (const field of TEXT_FIELDS) {
    if (row[field] && row[field].trim()) {
      fieldsToClean[field] = row[field];
    }
  }

  if (Object.keys(fieldsToClean).length === 0) {
    results.push({ id: row.id, cleaned: {} });
    continue;
  }

  try {
    const userPrompt = `Clean the following delegate profile fields:\n${JSON.stringify(fieldsToClean, null, 2)}`;
    const cleaned = await callLLM(SYSTEM_PROMPT, userPrompt);
    const cleanedObj = JSON.parse(cleaned);
    results.push({ id: row.id, cleaned: cleanedObj });
    successCount++;
    process.stdout.write(`✓ ${row.id} `);
  } catch (err) {
    console.error(`\n✗ Error on delegate ${row.id}:`, err.message);
    results.push({ id: row.id, cleaned: {} });
    errorCount++;
  }
}

console.log(`\n\nDone: ${successCount} cleaned, ${errorCount} errors`);

// Save results for review before writing to DB
fs.writeFileSync('/home/ubuntu/delegate-text-cleaned.json', JSON.stringify(results, null, 2));
console.log('Saved to /home/ubuntu/delegate-text-cleaned.json');

// Now write cleaned data back to DB
let updateCount = 0;
for (const result of results) {
  if (Object.keys(result.cleaned).length === 0) continue;
  
  const setClauses = [];
  const values = [];
  
  for (const [field, value] of Object.entries(result.cleaned)) {
    if (TEXT_FIELDS.includes(field) && value !== null && value !== undefined) {
      setClauses.push(`\`${field}\` = ?`);
      values.push(value);
    }
  }
  
  if (setClauses.length === 0) continue;
  
  values.push(result.id);
  await conn.execute(
    `UPDATE delegateProfiles SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );
  updateCount++;
}

await conn.end();
console.log(`Updated ${updateCount} delegate profiles in the database`);
