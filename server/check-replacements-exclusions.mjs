import * as db from './db.ts';
import { attendees } from './attendees.ts';

// The 8 suggested replacements: [sponsorId, delegateId, sponsorName, delegateName]
const replacements = [
  { sponsorId: 780001, delegateId: '190898269597', sponsorName: 'The Martec',              delegateName: 'Jonathan Kitterhing' },
  { sponsorId: 210001, delegateId: '13454401',     sponsorName: 'Harver',                  delegateName: 'Mark Coad' },
  { sponsorId: 330001, delegateId: '452351',       sponsorName: 'Symphony Talent',         delegateName: 'Cath Possamai' },
  { sponsorId: 540001, delegateId: '76678269091',  sponsorName: 'hackajob',                delegateName: 'Adam Binks' },
  { sponsorId: 270002, delegateId: '13454401',     sponsorName: 'Appcast',                 delegateName: 'Mark Coad' },
  { sponsorId: 750001, delegateId: '4956154',      sponsorName: 'SHL',                    delegateName: 'Jules Anderson' },
  { sponsorId: 600001, delegateId: '8713772',      sponsorName: 'Happydance',             delegateName: 'Alan MacKinnon' },
  { sponsorId: 690001, delegateId: '7258470500',   sponsorName: 'Amberjack',              delegateName: 'Mark Brooker' },
];

// Also check the hard exclusions defined in routers.ts
// These are sponsor-level hard exclusions (delegates who should never meet a sponsor)
const SPONSOR_HARD_EXCLUSIONS = {
  540001: ['190937723960','13454401','9477501','1076201','9322701'],
  840001: ['17812226737','7258470500','91889321035','190937723960','13454401','12731251','195183358360'],
  750001: ['76678269091','7258470500','91889321035','13454401','93174643474','200543495570','91862577661','190937723960','113145184682','110260566550','191181016455','452351','5927642'],
  150001: ['17812226737','200543495570','5927642','7258470500','128491656706'],
  780001: [],
  300001: ['190937723960'],
};

const allIntake = await db.getAllIntakeSubmissions();
const allSponsors = await db.getAllSponsors();
const sponsorMap = new Map(allSponsors.map(s => [s.id, s]));

console.log('=== Customer / Exclusion Check for Suggested Replacements ===\n');

for (const r of replacements) {
  const delegate = attendees.find(a => a.id === r.delegateId);
  if (!delegate) {
    console.log(`${r.sponsorName} → ${r.delegateName}: DELEGATE NOT FOUND`);
    continue;
  }

  const sponsor = sponsorMap.get(r.sponsorId);
  const sponsorCompany = sponsor?.companyName ?? r.sponsorName;

  // Check hard exclusion
  const hardExcluded = (SPONSOR_HARD_EXCLUSIONS[r.sponsorId] ?? []).includes(r.delegateId);

  // Check delegate's intake form for existing customer / current tool mentions
  const delegateIntake = allIntake.find(i => i.sponsorId === undefined); // delegate intake not stored by sponsorId
  
  // Check delegate's ATS, CRM, assessment tools, market intelligence fields
  const atsField = (delegate.ats ?? '').toLowerCase();
  const crmField = (delegate.crm ?? '').toLowerCase();
  const assessmentField = (delegate.assessmentTool ?? '').toLowerCase();
  const marketField = (delegate.marketIntelligence ?? '').toLowerCase();
  const otherTools = (delegate.otherTools ?? '').toLowerCase();
  const allToolsText = `${atsField} ${crmField} ${assessmentField} ${marketField} ${otherTools}`;

  // Check sponsor's intake form for exclusions / existing customers
  const sponsorIntake = allIntake.find(i => i.sponsorId === r.sponsorId);
  const sponsorExclusions = sponsorIntake?.exclusions ?? '';
  const sponsorExistingCustomers = sponsorIntake?.existingCustomers ?? '';
  
  // Check if delegate company appears in sponsor exclusions or existing customers
  const delegateCompany = delegate.company?.toLowerCase() ?? '';
  const isInSponsorExclusions = sponsorExclusions.toLowerCase().includes(delegateCompany) || 
    sponsorExclusions.toLowerCase().includes(delegate.firstName.toLowerCase()) ||
    sponsorExclusions.toLowerCase().includes(delegate.lastName.toLowerCase());
  const isInSponsorCustomers = sponsorExistingCustomers.toLowerCase().includes(delegateCompany) ||
    sponsorExistingCustomers.toLowerCase().includes(delegate.firstName.toLowerCase()) ||
    sponsorExistingCustomers.toLowerCase().includes(delegate.lastName.toLowerCase());

  // Check if sponsor company appears in delegate's tool fields
  const sponsorNameLower = sponsorCompany.toLowerCase().replace(/\s+/g, ' ');
  // Key product names for each sponsor
  const sponsorKeywords = {
    780001: ['martec'],
    210001: ['harver'],
    330001: ['symphony', 'symphony talent'],
    540001: ['hackajob'],
    270002: ['appcast'],
    750001: ['shl', 'ceb'],
    600001: ['happydance'],
    690001: ['amberjack'],
  };
  const keywords = sponsorKeywords[r.sponsorId] ?? [sponsorNameLower];
  const isExistingCustomerByTools = keywords.some(kw => allToolsText.includes(kw));

  const flags = [];
  if (hardExcluded) flags.push('⛔ HARD EXCLUDED (in system exclusion list)');
  if (isInSponsorExclusions) flags.push(`⛔ IN SPONSOR EXCLUSIONS: "${sponsorExclusions}"`);
  if (isInSponsorCustomers) flags.push(`⚠️  IN SPONSOR EXISTING CUSTOMERS: "${sponsorExistingCustomers}"`);
  if (isExistingCustomerByTools) flags.push(`⚠️  DELEGATE USES SPONSOR TOOL (tools: ${allToolsText.trim().substring(0, 80)})`);

  const status = flags.length === 0 ? '✅ Clear' : flags.join('\n     ');
  
  console.log(`${r.sponsorName} → ${r.delegateName} (${delegate.company})`);
  console.log(`  Status: ${status}`);
  
  // Also show delegate's current tools for manual review
  const toolsSummary = [
    delegate.ats ? `ATS: ${delegate.ats}` : null,
    delegate.crm ? `CRM: ${delegate.crm}` : null,
    delegate.assessmentTool ? `Assessment: ${delegate.assessmentTool}` : null,
  ].filter(Boolean).join(' | ');
  if (toolsSummary) console.log(`  Tools: ${toolsSummary}`);
  console.log('');
}

// Also show sponsor intake exclusions for reference
console.log('\n=== Sponsor Intake Exclusions / Existing Customers (raw) ===\n');
for (const r of replacements) {
  const intake = allIntake.find(i => i.sponsorId === r.sponsorId);
  if (intake) {
    const excl = intake.exclusions || intake.currentCustomers || intake.existingCustomers || '';
    const fields = Object.entries(intake)
      .filter(([k, v]) => v && typeof v === 'string' && 
        (k.toLowerCase().includes('exclu') || k.toLowerCase().includes('customer') || k.toLowerCase().includes('compet')))
      .map(([k, v]) => `  ${k}: ${v}`);
    if (fields.length > 0) {
      console.log(`${r.sponsorName}:`);
      fields.forEach(f => console.log(f));
      console.log('');
    } else {
      console.log(`${r.sponsorName}: (no exclusion/customer fields found in intake)`);
    }
  } else {
    console.log(`${r.sponsorName}: (no intake submission found)`);
  }
}

process.exit(0);
