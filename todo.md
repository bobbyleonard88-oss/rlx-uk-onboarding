# RLX Onboarding Project TODO

## Admin Interface Simplification (Current Sprint)

### Remove Unnecessary Features
- [x] Remove Profiles tab entirely
- [x] Remove JSON text boxes from upload pages
- [x] Remove "Import Delegates" button (data already in database)
- [x] Remove profile upload functionality
- [x] Remove profile management pages

### Native Intake Form
- [x] Clone embedded intake form to be native in the app
- [x] Add intake form to database schema
- [x] Create intake form page for sponsors
- [x] Link intake form submissions to sponsor accounts

### Admin Dashboard Redesign
- [x] Consolidate all sponsor data on main dashboard
- [x] Add "View/Download Profile" button (intake form data)
- [x] Add "View/Download Rankings" button (meeting preferences)
- [x] Keep priority tagging dropdown for delegates
- [x] Keep "Reviewed" toggle button
- [x] Add timestamps to all submissions
- [x] Fix vendor profile to show company name from submission

### Admin Navigation
- [x] Create admin navigation bar
- [x] Add Dashboard link
- [x] Add Matchmaking link
- [x] Add User Management link
- [x] Apply consistent RLX branding

### User Management Fix
- [x] Fix admin promotion functionality
- [x] Ensure email-based promotion works correctly

### Timestamps
- [x] Add submission timestamps to all data
- [x] Display timestamps in admin dashboard
- [x] Show when intake form was submitted
- [x] Show when rankings were submitted

## Completed Features
- [x] Custom order persistence on Prioritise page
- [x] Sponsor authentication system
- [x] Backend API for rankings submission
- [x] Email notifications to CS team and Bobby
- [x] Admin dashboard basic structure
- [x] Delegate CSV import
- [x] AI matchmaking engine
- [x] Priority tagging system
- [x] Overview page redesign (iconographic)

## Final Polish (Current Sprint)

### Archive Functionality
- [x] Add archive field to submissions database schema
- [x] Add archive/unarchive API endpoints
- [x] Add "Archive" button to each submission on admin dashboard
- [x] Add toggle to show/hide archived submissions
- [x] Archived submissions should be hidden by default

### Remove Left Navigation
- [x] Remove left sidebar from admin dashboard
- [x] Remove left sidebar from matchmaking page
- [x] Remove left sidebar from user management page
- [x] Keep only top navigation bar

### Simplify User Management
- [x] Remove search functionality
- [x] Pre-populate bobby@recruitmentevents.co as admin
- [x] Pre-populate clientsuccess@recruitmentevents.co as admin
- [x] Keep simple email input to add additional admins

### Intake Form Updates
- [x] Update ICP org size options to: <1000, 1k-5k, 5k-10k, 10k+
- [x] Alphabetize technology type dropdown options
- [x] Split form into "Company Information" and "Attendee Information" sections
- [x] Add "Do you have 20 meetings booked?" question
- [x] Only show 2nd representative fields if they have 20 meetings

## Bug Fixes

### Intake Form Validation
- [x] Fix second representative email validation to allow empty values (optional field)

### Data Cleanup
- [x] Remove Jen Candee from delegate database

### Admin Management
- [x] Add remove/demote admin functionality to user management page
- [x] Add "Remove Admin" button next to each admin user

### Submission Display Bug
- [x] Debug why submitted intake forms and rankings are not appearing on admin portal
- [x] Fix admin dashboard query to show all submissions
- [x] Add intake data to getAllSubmissions query

### Sponsor Edit Functionality
- [x] Pre-populate intake form with previously submitted data
- [ ] Pre-populate rankings with previously submitted data (in progress)
- [x] Allow sponsors to edit and resubmit to overwrite previous submissions

## Urgent Fixes

- [x] Re-add user as admin (accidentally removed)
- [x] Debug and fix why sponsor submissions are not appearing on admin dashboard
- [x] Add intake form requirement check before rankings submission
- [x] Add rankings requirement check before intake form completion
- [x] Show partial submissions on admin dashboard (intake only or rankings only)
- [x] Add clear indicators for incomplete submissions
- [x] Fix rankings submission to create sponsor record if needed (allows any order)
- [x] Add warning banner on Prioritize page if intake form not completed
- [x] Add success message on Intake page reminding to complete rankings

## User Profile & Authentication UI

### Admin Portal
- [x] Add user profile display in admin navigation (show logged-in user email/name)
- [x] Add logout button in admin navigation
- [x] Make user info visible on all admin pages

### Sponsor Pages
- [x] Add user profile display in sponsor page navigation
- [x] Add logout button for sponsors
- [x] Show logged-in user on intake form and prioritize pages

### Sponsor Dashboard
- [x] Create sponsor dashboard page showing submission status
- [x] Display intake form completion status (completed/pending)
- [x] Display rankings completion status (completed/pending)
- [x] Add "Edit Intake Form" button if already submitted
- [x] Add "Edit Rankings" button if already submitted
- [x] Show submission timestamps
- [x] Add quick links to event information pages
