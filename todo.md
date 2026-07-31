# RLX UK 2026 — Event App · Full Build Specification

> **Spec locked:** July 2026 after client review session.
> **Stack:** React 19 + tRPC 11 + Drizzle ORM + MySQL (Manus hosted)
> **Design:** Mobile-first, premium dark theme — deep navy + purple, Montserrat/Playfair, glassmorphic cards

---

## Locked Specification

### Three Portals

| Portal | Route | Users |
|---|---|---|
| Admin | `/admin/*` | RLX team — full back-office control |
| Sponsor | `/*` | Sponsor company reps |
| Delegate | `/delegate/*` | Senior HR/TA leaders |

---

### Meeting Rules (LOCKED)

- All meetings are **20 minutes** duration
- **15-minute buffer** after every meeting (35 minutes total blocked per meeting)
- Meetings are **free-floating** — no fixed "meeting blocks" in the agenda. Any free 20-min slot in the day works
- **Admin generates the first full schedule** — these meetings are auto-confirmed, no acceptance needed
- After the initial schedule, **delegates can send additional meeting requests** to sponsors
- **Sponsors cannot send requests** unless admin turns on the sponsor-request toggle (per-event toggle)
- Meeting **request** does NOT consume a credit — only **acceptance/confirmation** does
- If a meeting is **cancelled**, the credit is returned to the sponsor
- Sponsors can go **above their credit allowance** if a delegate sends them a request — admin has full visibility and control
- Admin can **add or remove credits** from any sponsor at any time

---

### Credit System (LOCKED)

- Admin sets a credit allowance per sponsor (matches their purchased package)
- Credits consumed only on meeting confirmation
- Credits returned on cancellation
- Admin toggle (per event): allow/disallow sponsors from sending their own meeting requests
- Sponsors see their remaining credits at all times
- Sponsors can exceed their credit limit if a delegate requests them — this is allowed and tracked

---

### Delegate Minimum Requirement (LOCKED)

- Minimum **8 confirmed meetings** per delegate (configurable per event by admin — `minMeetings` field)
- Live tracker always visible: "X of 8 minimum confirmed"
- Not a hard block — it's a target with visibility

---

### Profiles (LOCKED)

**Delegate sees sponsor:**
- Rep + company as one unified profile (no split)
- Rep name, title, company name, company description
- Match score prominently displayed
- Match reasoning: "We matched you because..."
- Nudge: *"If anything here doesn't reflect your current situation, use your meeting time to have that conversation."*

**Sponsor sees delegate:**
- Full intake profile: pain points, tools (ATS/CRM/TI/Other), budget, company size, decision-making level, active projects, current project stage, challenges, interests
- Match score + reasoning
- Same nudge text

**Delegate discovery view:**
- All sponsors at the event, ranked by match score against the delegate's profile
- Each card: rep name, company, match score, top 2 match reasons
- "Request Meeting" button if they have a free slot and sponsor has capacity
- "View Profile" → full unified sponsor profile

---

### Chat (LOCKED)

- Text messages only as baseline
- Optional image/document sharing (file upload)
- Only available between a sponsor and delegate who have a **confirmed meeting**
- Admin can view all threads (read-only)
- Real-time updates (SSE or 5s polling)

---

### Notifications

- In-app notification centre (bell icon in nav)
- Email notifications
- Triggers: meeting request, confirmation, decline, reschedule, new message, rating reminder

---

### PWA

- Installable on iOS and Android
- Offline support for schedule viewing
- App icons, manifest, service worker

---

## Phase Status

---

### ✅ Phase 1 — Complete

- [x] Multi-portal routing: `/admin/*`, `/delegate/*`, `/*` (sponsor)
- [x] Drizzle schema: events, agendaSessions, meetingRequests, chatThreads, chatMessages, notifications, delegateSchedule
- [x] Admin Event Settings page (`/admin/settings`)
- [x] Admin Agenda Management page (`/admin/agenda`) — full session CRUD, day-by-day
- [x] Admin Demo Data page (`/admin/seed`) — one-click seed
- [x] Delegate Dashboard shell (`/delegate`)
- [x] Delegate Agenda view (`/delegate/agenda`)
- [x] PWA: manifest.json, sw.js, meta tags
- [x] AdminHeader updated with new nav items
- [x] Migration SQL: 0021_rlx_platform_evolution.sql

---

### 🔧 Phase 1b — Schema Corrections & Dashboard Fix (Next)

- [ ] Fix blank admin dashboard (DB migration not yet applied — new tables missing)
- [ ] Remove `meeting_block` session type from agenda (meetings are free-floating)
- [ ] Remove `meetingSlotNumber` from agendaSessions schema
- [ ] Update seed data: remove meeting_block sessions, replace with realistic free-day sessions
- [ ] Add `minMeetings` int to events table (default 8)
- [ ] Add `sponsorRequestsEnabled` int to events table (default 0 = off)
- [ ] Add `meetingDurationMins` int to events table (default 20)
- [ ] Add `meetingBufferMins` int to events table (default 15)
- [ ] Fix admin dashboard to show event overview, stats, and quick links
- [ ] Update migration SQL with schema corrections

---

### 🔲 Phase 2 — Credit System + Admin Schedule Generation

**Goal:** Admin can generate the initial meeting schedule. Credits work correctly. Sponsor credit display live.

#### Schema
- [ ] meetings.status: add `admin_confirmed` as distinct from `confirmed` (delegate-accepted)
- [ ] Confirm sponsors.meetingCredits and creditsUsed are wired correctly

#### Admin pages
- [ ] Admin Sponsor Management (`/admin/sponsors`)
  - List all sponsors: credits remaining, credits used, table number, meeting count
  - Edit credits (add/remove), edit table number
  - Toggle: allow/disallow sponsor from sending requests
  - Global event toggle: sponsorRequestsEnabled
- [ ] Admin Schedule Generator (`/admin/schedule`)
  - Input: number of meetings per delegate, event date range
  - Algorithm: assign meetings to free 20-min slots, respecting 15-min buffers and session clashes
  - Preview grid before confirming
  - One-click confirm → sets all generated meetings to `admin_confirmed`
- [ ] Admin Meetings page — updated to show admin_confirmed / requested / confirmed / cancelled

#### Sponsor portal
- [ ] Credit tracker widget (always visible in sponsor nav/header)
  - "X credits remaining of Y total" + visual progress bar
- [ ] Sponsor meeting schedule page — all confirmed meetings with delegate profiles
- [ ] Sponsor delegate profile view — full intake data + match score + match reasoning

#### Delegate portal
- [ ] Minimum meeting tracker (always visible)
  - "X of 8 minimum meetings confirmed" — red < 8, amber = 8, green > 8
- [ ] Delegate meeting schedule page — all confirmed meetings with sponsor profiles
- [ ] Delegate sponsor profile view — unified rep + company + match score + reasoning

---

### 🔲 Phase 3 — Meeting Requests, Reschedule, Overlap Enforcement

**Goal:** Delegates can send additional meeting requests. Either party can request reschedules. System enforces no-overlap.

- [ ] Delegate → Sponsor meeting request flow
  - Delegate selects sponsor from discovery view
  - System checks: no time clash for either party (20-min + 15-min buffer + session clashes)
  - System suggests up to 3 available time slots
  - Delegate picks a slot + optional message → sends request
  - Sponsor receives in-app + email notification
  - Sponsor accepts or declines
  - On accept: meeting confirmed, credit consumed, chat thread created
  - On decline: credit not consumed, delegate notified
- [ ] Reschedule request flow (either party)
  - Either party can request to move a confirmed meeting
  - System finds alternative slots (20-min + 15-min buffer + session clashes)
  - Suggests up to 3 alternatives
  - Other party accepts or declines
  - If accepted: meeting updated, both notified
  - If declined: original meeting stays
- [ ] Overlap enforcement (hard blocks)
  - Cannot book into a slot that clashes with another meeting
  - 15-minute buffer after every meeting is blocked
  - If delegate has added a session to their schedule, that time is blocked
- [ ] Admin override: admin can force-move any meeting regardless of clashes

---

### 🔲 Phase 4 — Match Scoring Display + Delegate Discovery

**Goal:** Both parties see why they've been matched. Delegates can discover and evaluate all sponsors.

- [ ] Match score calculation (server-side, cached in matchCache)
  - Inputs: delegate intake data vs sponsor profile
  - Weights: pain points (35%), industry (20%), company size (15%), budget (20%), tools (10%)
  - Output: 0–100 score + human-readable reasoning string
- [ ] Delegate discovery page (`/delegate/sponsors`)
  - All sponsors ranked by match score
  - Card: rep name, company, match score, top 2 match reasons
  - "Request Meeting" button
  - "View Profile" → full unified sponsor profile
- [ ] Sponsor profile page (delegate view)
  - Rep photo, name, title, company name + description
  - Match score prominently displayed
  - Match reasoning + nudge text
- [ ] Delegate profile page (sponsor view)
  - Full intake data
  - Match score + reasoning + nudge text
- [ ] Meeting card (both portals) — inline match score + top reason

---

### 🔲 Phase 5 — Two-Way Chat

**Goal:** Confirmed meeting pairs can message each other. Admin can view all threads.

- [ ] Chat thread auto-created when a meeting is confirmed
- [ ] Chat UI (`/delegate/messages`, `/messages` for sponsor)
  - Thread list: sorted by last message, unread badge
  - Thread view: message bubbles, timestamps, read receipts
  - Text input + send
  - Optional: image/document attachment (S3 upload)
- [ ] Real-time updates (SSE or 5s polling)
- [ ] Unread message count in nav (both portals)
- [ ] Admin messages view (`/admin/messages`) — read-only
- [ ] In-app + email notification on new message (email batched, max 1/hour per thread)

---

### 🔲 Phase 6 — Notifications, Ratings, Admin Reporting

**Goal:** Full notification system, post-event ratings, admin export tools.

- [ ] In-app notification centre (bell icon in nav)
  - Unread count badge
  - Notification list: type icon, title, body, timestamp, read/unread
  - Mark all read
  - Click → navigate to relevant page
- [ ] Email notifications for all triggers
- [ ] Post-event rating flow
  - 24h after event end: email + in-app prompt to rate each meeting
  - Rating tiers: 1★ No Fit, 2★ Longer Term, 3★ Medium Term, 4★/5★ Immediate Opportunity
  - Optional notes field
  - Both sponsor and delegate rate independently
- [ ] Admin reporting page
  - Meeting completion rate, average match score, rating distribution
  - Credit utilisation per sponsor
  - Export to CSV

---

### 🔲 Phase 7 — PWA Polish + Production Hardening

- [ ] Push notifications (web push API)
- [ ] Offline schedule viewing (service worker caches schedule data)
- [ ] App icons (192px, 512px) for iOS/Android home screen
- [ ] Performance: lazy load routes, optimise bundle
- [ ] Accessibility: keyboard navigation, ARIA labels, colour contrast
- [ ] Security: rate limiting on meeting requests, input sanitisation
- [ ] Error boundaries on all portal pages
- [ ] Loading skeletons on all data-fetching pages

---

## Navigation Map

### Admin (`/admin/*`)

| Route | Page |
|---|---|
| `/admin` | Dashboard — event overview, stats |
| `/admin/settings` | Event Settings — name, dates, venue, weights, min meetings, sponsor toggle |
| `/admin/agenda` | Agenda Management — session CRUD |
| `/admin/sponsors` | Sponsor Management — credits, tables, toggles |
| `/admin/schedule` | Schedule Generator — generate + confirm initial meetings |
| `/admin/meetings` | All Meetings — status, override, cancel |
| `/admin/messages` | All Chat Threads — read-only |
| `/admin/users` | User Management |
| `/admin/analytics` | Analytics |
| `/admin/reporting` | Reports + Export |
| `/admin/activity-log` | Activity Log |
| `/admin/seed` | Demo Data |

### Sponsor (`/*`)

| Route | Page |
|---|---|
| `/dashboard` | Sponsor Dashboard — credits, upcoming meetings, unread messages |
| `/meeting-schedule` | My Schedule — all confirmed meetings |
| `/agenda` | Event Agenda — read-only |
| `/event-details` | Event Details — venue, dates |
| `/messages` | Chat — thread list + thread view |
| `/feedback` | Post-event ratings |

### Delegate (`/delegate/*`)

| Route | Page |
|---|---|
| `/delegate` | Dashboard — meeting tracker, upcoming meetings, unread messages |
| `/delegate/schedule` | My Schedule — all confirmed meetings |
| `/delegate/sponsors` | Sponsor Discovery — all sponsors ranked by match score |
| `/delegate/agenda` | Event Agenda — with opt-in for optional sessions |
| `/delegate/messages` | Chat — thread list + thread view |
| `/delegate/feedback` | Post-event ratings |
