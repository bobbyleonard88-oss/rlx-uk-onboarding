/**
 * Standalone script to regenerate match reasons for all confirmed meetings.
 * Run with: node scripts/regen-reasons.mjs
 */
import { config } from 'dotenv';
config();

// We need to import the compiled server code — use tsx to run the TS directly
// This script is just a thin wrapper; the actual logic is in matchingEngine.ts
console.log('Starting match reason regeneration...');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
