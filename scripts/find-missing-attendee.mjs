import { readFileSync } from 'fs';

const serverContent = readFileSync('./server/attendees.ts', 'utf8');
const clientContent = readFileSync('./client/src/lib/attendees.ts', 'utf8');

const serverIds = [...serverContent.matchAll(/"id":\s*"([^"]+)"/g)].map(m => m[1]);
const clientIds = new Set([...clientContent.matchAll(/"id":\s*"([^"]+)"/g)].map(m => m[1]));

console.log('Server count:', serverIds.length, 'Client count:', clientIds.size);
for (const id of serverIds) {
  if (!clientIds.has(id)) {
    // Find surrounding context for name
    const idx = serverContent.indexOf(`"id": "${id}"`);
    const snippet = serverContent.slice(Math.max(0, idx - 200), idx + 200);
    const firstNameMatch = snippet.match(/"firstName":\s*"([^"]+)"/);
    const lastNameMatch = snippet.match(/"lastName":\s*"([^"]+)"/);
    const companyMatch = snippet.match(/"company":\s*"([^"]+)"/);
    console.log('MISSING FROM CLIENT:', id, firstNameMatch?.[1], lastNameMatch?.[1], '|', companyMatch?.[1]);
  }
}
