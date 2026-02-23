import csv
import json

# Read the HubSpot CSV
with open('/home/ubuntu/upload/hubspot-crm-exports-rlx-uk-applications-2026-02-20-1.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    attendees = []
    
    for row in reader:
        attendee = {
            'id': row['Record ID'],
            'firstName': row['First Name'].strip(),
            'lastName': row['Last Name'].strip(),
            'jobTitle': row['Job Title'],
            'company': row['Company Name'].strip(),
            'companySize': row['Total Org Employees'],
            'industry': row['Industry'],
            'teamSize': row['Hires per Year'],
            'budgetAuthority': row['Decision Making Level (TA)'],
            'assessmentTool': row['Tools: Assessments'],
            'ats': row['Tools: ATS'],
            'crm': row['Tools: CRM'],
            'marketIntelligence': row['Tools: Talent Intelligence'],
            'otherTools': row['Tools: Other'],
            'activeConfirmedProjects': row['Active Confirmed Projects'],
            'activeBudgetRange': row['Active Project Budget Range (£)'],
            'primaryMeetingObjective': row['Primary Meeting Objective'],
            'contractSignOff': row['Contract sign-off (£)'],
            'keySolutionAreasOfInterest': row['Key Solution Areas of Interest'],
            'currentPainPoints': row['Current Pain Points'],
            'currentProjectStage': row['Current Project Stage'],
            'regionalRemit': row['Regional Remit (TA)']
        }
        attendees.append(attendee)

# Generate TypeScript code
ts_code = '''export interface Attendee {
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
  // New fields from HubSpot CSV
  activeConfirmedProjects?: string;
  activeBudgetRange?: string;
  primaryMeetingObjective?: string;
  contractSignOff?: string;
  keySolutionAreasOfInterest?: string;
  currentPainPoints?: string;
  currentProjectStage?: string;
  regionalRemit?: string;
}

export const attendees: Attendee[] = '''

ts_code += json.dumps(attendees, indent=2, ensure_ascii=False)
ts_code += ';\n'

# Write to attendees.ts
with open('/home/ubuntu/rlx-onboarding/server/attendees.ts', 'w', encoding='utf-8') as f:
    f.write(ts_code)

print(f"Imported {len(attendees)} attendees with needs/challenges data")
