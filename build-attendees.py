"""
build-attendees.py
Reads the HubSpot CSV and the existing attendees.ts to produce an updated
attendees.ts that:
  1. Uses the CSV as the authoritative source of delegate records
  2. Excludes Jen Candee (Record ID 150796696175)
  3. Preserves all optInSponsors from the existing attendees.ts
  4. Only includes delegates whose RLXUK26-1 status is "Accepted" or "Confirmed"
"""
import csv, json, re, sys

CSV_PATH = "/home/ubuntu/upload/hubspot-crm-exports-rlx-uk-applications-2026-03-16.csv"
EXISTING_TS = "/home/ubuntu/rlx-onboarding/server/attendees.ts"
OUTPUT_TS   = "/home/ubuntu/rlx-onboarding/server/attendees.ts"

EXCLUDE_IDS = {"150796696175"}  # Jen Candee

# ── 1. Read existing attendees.ts to extract optInSponsors per ID ─────────────
existing_opt_ins: dict[str, list[str]] = {}
with open(EXISTING_TS) as f:
    raw = f.read()

# Extract the JSON array from the .ts file
m = re.search(r'export const attendees: Attendee\[\] = (\[.*\]);', raw, re.DOTALL)
if not m:
    print("ERROR: could not parse existing attendees.ts", file=sys.stderr)
    sys.exit(1)

existing_records = json.loads(m.group(1))
for rec in existing_records:
    if rec.get("optInSponsors"):
        existing_opt_ins[str(rec["id"])] = rec["optInSponsors"]

print(f"Loaded opt-in data for {len(existing_opt_ins)} delegates from existing attendees.ts")

# ── 2. Parse the HubSpot CSV ──────────────────────────────────────────────────
delegates = []
skipped = []

with open(CSV_PATH, newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        record_id = row.get("Record ID", "").strip()
        first     = row.get("First Name", "").strip()
        last      = row.get("Last Name", "").strip()
        status    = row.get("RLXUK26-1 - Event Status (Watford, March)", "").strip()
        confirmed = row.get("RLXUK26-1 - Confirmed", "").strip()

        # Skip Jen Candee
        if record_id in EXCLUDE_IDS:
            skipped.append(f"EXCLUDED: {first} {last} ({record_id})")
            continue

        # Only include accepted/confirmed delegates
        if status.lower() not in ("accepted", "confirmed") and confirmed.lower() not in ("yes", "true", "1"):
            skipped.append(f"SKIPPED (status={status!r}): {first} {last} ({record_id})")
            continue

        # Map company size
        total_employees = row.get("Total Org Employees", "").strip()

        # Map hires per year → teamSize proxy
        hires = row.get("Hires per Year", "").strip()

        delegate = {
            "id": record_id,
            "firstName": first,
            "lastName": last,
            "jobTitle": row.get("Job Title", "").strip(),
            "company": row.get("Company Name", "").strip(),
            "companySize": total_employees,
            "industry": row.get("Industry", "").strip(),
            "teamSize": hires,
            "budgetAuthority": row.get("Decision Making Level (TA)", "").strip(),
            "assessmentTool": row.get("Tools: Assessments", "").strip(),
            "ats": row.get("Tools: ATS", "").strip(),
            "crm": row.get("Tools: CRM", "").strip(),
            "marketIntelligence": row.get("Tools: Talent Intelligence", "").strip(),
            "otherTools": row.get("Tools: Other", "").strip(),
            "activeConfirmedProjects": row.get("Active Confirmed Projects", "").strip(),
            "activeBudgetRange": row.get("Active Project Budget Range (£)", "").strip(),
            "primaryMeetingObjective": row.get("Primary Meeting Objective", "").strip(),
            "contractSignOff": row.get("Contract sign-off (£)", "").strip(),
            "keySolutionAreasOfInterest": row.get("Key Solution Areas of Interest", "").strip(),
            "currentPainPoints": row.get("Current Pain Points", "").strip(),
            "currentProjectStage": row.get("Current Project Stage", "").strip(),
            "regionalRemit": row.get("Regional Remit (TA)", "").strip(),
        }

        # Restore opt-in sponsors from existing data
        opt_ins = existing_opt_ins.get(record_id)
        if opt_ins:
            delegate["optInSponsors"] = opt_ins

        delegates.append(delegate)

print(f"\nIncluded: {len(delegates)} delegates")
for s in skipped:
    print(f"  {s}")

# ── 3. Write updated attendees.ts ─────────────────────────────────────────────
interface_block = '''export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  companySize: string;
  industry: string;
  teamSize: string;
  budgetAuthority: string;
  assessmentTool: string;
  ats: string;
  crm: string;
  marketIntelligence: string;
  otherTools: string;
  // Fields from HubSpot CSV
  activeConfirmedProjects?: string;
  activeBudgetRange?: string;
  primaryMeetingObjective?: string;
  contractSignOff?: string;
  keySolutionAreasOfInterest?: string;
  currentPainPoints?: string;
  currentProjectStage?: string;
  regionalRemit?: string;
  optInSponsors?: string[]; // Sponsors the delegate opted in to meet
}
'''

json_str = json.dumps(delegates, ensure_ascii=False, indent=None, separators=(', ', ': '))
# Format as one record per line for readability
json_str = json.dumps(delegates[0], ensure_ascii=False)
lines = []
for d in delegates:
    lines.append(json.dumps(d, ensure_ascii=False))

array_str = "[\n  " + ",\n  ".join(lines) + "\n]"

output = interface_block + "\nexport const attendees: Attendee[] = " + array_str + ";\n"

with open(OUTPUT_TS, "w", encoding="utf-8") as f:
    f.write(output)

print(f"\nWrote {len(delegates)} delegates to {OUTPUT_TS}")
print("Names:")
for d in delegates:
    print(f"  {d['firstName']} {d['lastName']} ({d['company']}) — opt-ins: {d.get('optInSponsors', [])}")
