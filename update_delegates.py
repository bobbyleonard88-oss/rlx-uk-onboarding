#!/usr/bin/env python3
import csv
import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Parse DATABASE_URL
# Format: mysql://username:password@host:port/database
database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise ValueError("DATABASE_URL not found in environment")

# Parse the URL
# mysql://user:pass@host:port/dbname?params
parts = database_url.replace('mysql://', '').split('@')
user_pass = parts[0].split(':')
host_db = parts[1].split('/')
host_port = host_db[0].split(':')

username = user_pass[0]
password = user_pass[1]
host = host_port[0]
port = int(host_port[1]) if len(host_port) > 1 else 3306
database = host_db[1].split('?')[0]

# Connect to database
conn = mysql.connector.connect(
    host=host,
    port=port,
    user=username,
    password=password,
    database=database
)

cursor = conn.cursor()

# Read CSV file
csv_file = '/home/ubuntu/upload/hubspot-crm-exports-rlx-uk-applications-2026-02-20-1.csv'

delegates_added = 0
delegates_updated = 0
delegates_skipped = 0

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    
    for row in reader:
        first_name = row.get('First Name', '').strip()
        last_name = row.get('Last Name', '').strip()
        
        # Skip Jen Candee / Jennifer Candee
        if (first_name.lower() in ['jen', 'jennifer'] and last_name.lower() == 'candee'):
            print(f"Skipping: {first_name} {last_name}")
            delegates_skipped += 1
            continue
        
        # Generate attendeeId from HubSpot ID
        attendee_id = row.get('Record ID', '').strip()
        if not attendee_id:
            print(f"Warning: No Record ID for {first_name} {last_name}, skipping")
            continue
        
        # Extract all fields
        company = row.get('Company Name', '').strip()
        job_title = row.get('Job Title', '').strip()
        industry = row.get('Industry', '').strip()
        total_org_employees = row.get('Total Org Employees', '').strip()
        hires_per_year = row.get('Hires per Year', '').strip()
        decision_making_level = row.get('Decision Making Level (TA)', '').strip()
        active_confirmed_projects = row.get('Active Confirmed Projects', '').strip()
        active_project_budget = row.get('Active Project Budget Range (£)', '').strip()
        primary_meeting_objective = row.get('Primary Meeting Objective', '').strip()
        contract_signoff = row.get('Contract sign-off (£)', '').strip()
        tools_assessments = row.get('Tools: Assessments', '').strip()
        tools_ats = row.get('Tools: ATS', '').strip()
        tools_crm = row.get('Tools: CRM', '').strip()
        tools_talent_intelligence = row.get('Tools: Talent Intelligence', '').strip()
        tools_other = row.get('Tools: Other', '').strip()
        key_solution_areas = row.get('Key Solution Areas of Interest', '').strip()
        current_pain_points = row.get('Current Pain Points', '').strip()
        current_project_stage = row.get('Current Project Stage', '').strip()
        
        # Check if delegate already exists
        cursor.execute(
            "SELECT id FROM delegateProfiles WHERE attendeeId = %s",
            (attendee_id,)
        )
        existing = cursor.fetchone()
        
        if existing:
            # Update existing delegate
            cursor.execute("""
                UPDATE delegateProfiles SET
                    firstName = %s,
                    lastName = %s,
                    company = %s,
                    jobTitle = %s,
                    industry = %s,
                    totalOrgEmployees = %s,
                    hiresPerYear = %s,
                    decisionMakingLevel = %s,
                    activeConfirmedProjects = %s,
                    activeProjectBudget = %s,
                    primaryMeetingObjective = %s,
                    contractSignoff = %s,
                    toolsAssessments = %s,
                    toolsATS = %s,
                    toolsCRM = %s,
                    toolsTalentIntelligence = %s,
                    toolsOther = %s,
                    keySolutionAreas = %s,
                    currentPainPoints = %s,
                    currentProjectStage = %s,
                    updatedAt = NOW()
                WHERE attendeeId = %s
            """, (
                first_name, last_name, company, job_title, industry,
                total_org_employees, hires_per_year, decision_making_level,
                active_confirmed_projects, active_project_budget,
                primary_meeting_objective, contract_signoff,
                tools_assessments, tools_ats, tools_crm,
                tools_talent_intelligence, tools_other,
                key_solution_areas, current_pain_points,
                current_project_stage, attendee_id
            ))
            delegates_updated += 1
            print(f"Updated: {first_name} {last_name}")
        else:
            # Insert new delegate
            cursor.execute("""
                INSERT INTO delegateProfiles (
                    attendeeId, firstName, lastName, company, jobTitle, industry,
                    totalOrgEmployees, hiresPerYear, decisionMakingLevel,
                    activeConfirmedProjects, activeProjectBudget,
                    primaryMeetingObjective, contractSignoff,
                    toolsAssessments, toolsATS, toolsCRM,
                    toolsTalentIntelligence, toolsOther,
                    keySolutionAreas, currentPainPoints,
                    currentProjectStage, createdAt, updatedAt
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
            """, (
                attendee_id, first_name, last_name, company, job_title, industry,
                total_org_employees, hires_per_year, decision_making_level,
                active_confirmed_projects, active_project_budget,
                primary_meeting_objective, contract_signoff,
                tools_assessments, tools_ats, tools_crm,
                tools_talent_intelligence, tools_other,
                key_solution_areas, current_pain_points,
                current_project_stage
            ))
            delegates_added += 1
            print(f"Added: {first_name} {last_name}")

# Commit changes
conn.commit()

print(f"\n=== Summary ===")
print(f"Delegates added: {delegates_added}")
print(f"Delegates updated: {delegates_updated}")
print(f"Delegates skipped (Jen Candee): {delegates_skipped}")
print(f"Total processed: {delegates_added + delegates_updated + delegates_skipped}")

# Close connection
cursor.close()
conn.close()
