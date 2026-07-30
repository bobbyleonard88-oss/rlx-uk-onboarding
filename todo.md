# RLX UK 2026 Platform Evolution Plan

This document outlines the roadmap to evolve the existing RLX onboarding tool into a fully interactive, self-service event management platform with three distinct portals: Admin, Sponsor, and Delegate.

## Architectural Foundation

The existing app is a solid fullstack application using React 19, tRPC 11, Drizzle ORM, and MySQL. It currently supports an Admin portal (`/admin/*`) and a Sponsor portal (`/*`).

To achieve the new requirements, we will:
1. **Clean Slate**: Start with a fresh database schema (no legacy event data).
2. **Multi-Portal Routing**: Restructure the frontend routing to clearly separate `/admin`, `/sponsor`, and `/delegate`.
3. **Data-Driven Configuration**: Move hard-coded logic (like the agenda and time slots) into the database.
4. **PWA Support**: Add a web app manifest and service worker for installability.

## Phase 1: Foundation & Event Settings (Current Phase)

**Goal**: Establish the clean multi-portal architecture, define the new database schema, and build the Admin Event Settings and Agenda management pages.

- [ ] **Codebase Cleanup**
  - [ ] Remove legacy one-off scripts (`fix-*.ts`, `check-*.mjs`, etc.) from the root and `server/` directories.
  - [ ] Clear out legacy data models and hard-coded arrays (e.g., `attendees.ts`, `EventAgenda.tsx` static data).
- [ ] **Database Schema Redesign**
  - [ ] Create `events` table (name, dates, venue, match weights).
  - [ ] Create `agendaSessions` table (title, time, room, type, etc.).
  - [ ] Create `sponsorCredits` table or add credit fields to the `sponsors` table.
  - [ ] Create `meetingRequests` table (status: pending, accepted, declined, cancelled).
  - [ ] Create `chatThreads` and `chatMessages` tables.
  - [ ] Update `users` table to explicitly handle `delegate` roles.
- [ ] **Routing & Architecture**
  - [ ] Refactor `App.tsx` to explicitly route `/admin/*`, `/sponsor/*`, and `/delegate/*`.
  - [ ] Create placeholder dashboard pages for the Delegate portal.
- [ ] **Admin Event Settings**
  - [ ] Build a new Admin page (`/admin/settings`) to configure global event details.
  - [ ] Build a new Admin page (`/admin/agenda`) for full CRUD management of the event agenda.
- [ ] **PWA Configuration**
  - [ ] Add `manifest.json` and basic service worker to `client/public/`.

## Phase 2: The Delegate Portal & Agenda Selection

**Goal**: Build the core experience for delegates, allowing them to view the event and manage their personal schedule.

- [ ] **Delegate Authentication & Onboarding**
  - [ ] Implement login flow for delegates.
  - [ ] Create a profile setup/verification page.
- [ ] **Personal Schedule Management**
  - [ ] Display the full, DB-driven event agenda to delegates.
  - [ ] Allow delegates to add/remove optional sessions to their personal schedule.
  - [ ] Enforce overlap validation (cannot attend two concurrent sessions).
- [ ] **Sponsor Visibility**
  - [ ] Allow delegates to browse the list of attending sponsors and their vendor profiles.

## Phase 3: The Interactive Meeting System & Credits

**Goal**: Implement the core self-service meeting engine where sponsors and delegates can request, accept, and reschedule meetings.

- [ ] **Credit System Implementation**
  - [ ] Build admin UI to set/adjust meeting credit allowances per sponsor.
  - [ ] Build sponsor UI to display remaining credits.
- [ ] **Meeting Request Flow**
  - [ ] Enable sponsors to request meetings with delegates (costs 1 credit).
  - [ ] Enable delegates to request meetings with sponsors (minimum 8 confirmed required).
  - [ ] Implement Inbox/Requests UI for both portals to accept/decline incoming requests.
- [ ] **Constraint Engine**
  - [ ] Validate table assignments (default to sponsor's fixed table, allow override).
  - [ ] Prevent double-booking (check against confirmed meetings and personal session schedules).
  - [ ] Suggest alternative time slots when a clash occurs.
- [ ] **Rescheduling & Cancellations**
  - [ ] Allow either party to request a reschedule.
  - [ ] Allow cancellations (refunds 1 credit to the sponsor).

## Phase 4: Two-Way Messaging & Notifications

**Goal**: Enable private communication between matched parties and keep users informed of updates.

- [ ] **Messaging System**
  - [ ] Build chat UI in both Sponsor and Delegate portals.
  - [ ] Restrict chat access to only parties with a *confirmed* meeting.
  - [ ] Build Admin UI to monitor all chat threads.
- [ ] **Notification Engine**
  - [ ] Implement in-app notification center (bell icon) for both portals.
  - [ ] Trigger notifications for: new requests, confirmations, declines, reschedules, and new messages.
  - [ ] Integrate email fallback notifications using the existing email infrastructure.

## Phase 5: Polish, Ratings & Launch

**Goal**: Finalize the design, implement post-event features, and prepare for production.

- [ ] **Design & Theming**
  - [ ] Ensure mobile-first responsiveness across all new interactive views.
  - [ ] Refine the premium dark theme (deep navy, purple accents, Montserrat/Playfair typography) to ensure it feels like a high-end app.
- [ ] **Rating System**
  - [ ] Implement the 1-5 star rating system (1★ = No Fit, 2★ = Longer Term, 3★ = Medium Term, 4/5★ = Immediate Opportunity).
  - [ ] Add automated post-event rating reminders.
- [ ] **Final QA & Testing**
  - [ ] End-to-end testing of the full meeting lifecycle.
  - [ ] Verify PWA installability on iOS and Android.
