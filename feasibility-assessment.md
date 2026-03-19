# Schedule Optimisation Feasibility Assessment

**RLX Customer Onboarding Journey — March 2026**
**Prepared for internal review only**

---

## Current Schedule Overview

The event runs across two days with six one-hour meeting blocks per day (three per day), each containing two consecutive 30-minute meeting slots. The full dataset comprises **279 confirmed meetings** across **38 delegates** and **25 sponsors**.

| Hour Block | Day | Slots | Total Meetings | Delegates Active |
|------------|-----|-------|---------------|-----------------|
| H1 | Day 1 | 11:00–11:30 + 11:30–12:00 | 47 | 31/38 |
| H2 | Day 1 | 13:15–13:45 + 13:45–14:15 | 47 | 31/38 |
| H3 | Day 1 | 14:30–15:00 + 15:00–15:30 | 48 | 31/38 |
| H4 | Day 2 | 10:30–11:00 + 11:00–11:30 | 47 | 32/38 |
| H5 | Day 2 | 13:15–13:45 + 13:45–14:15 | 46 | 29/38 |
| H6 | Day 2 | 14:30–15:00 + 15:00–15:30 | 43 | 28/38 |

A key structural characteristic of the current schedule is that **the majority of delegates have meetings in both slots of every hour block** — meaning they move between rooms twice per hour rather than once. Across all six blocks, there are **97 instances** of a delegate being scheduled back-to-back within the same hour.

---

## Approach 1: Group A / Group B Split

### What this means

In each hour block, delegates would be divided into two consistent groups:

- **Group A** — in meetings for the full hour (both slots)
- **Group B** — in a content session or free time for the full hour

Groups would swap in the following hour block. This means each delegate is either fully committed to meetings or fully free within any given hour, eliminating mid-hour movement.

### Feasibility Assessment

**This approach is technically feasible but requires significant reshuffling of the current schedule.**

The core constraint is that 97 delegate-block conflicts currently exist — meaning 97 meetings would need to be moved to different hour blocks to ensure no delegate appears in both slots of the same hour. This represents **34.8% of all meetings** (97 of 279).

The sponsor-side constraint is equally significant. Currently, **21 of 25 sponsors have meetings in both slots of every single hour block** — meaning their meeting rooms would be occupied throughout each hour under the current structure. Reshuffling to create a Group A/B split would require moving sponsor meetings between hour blocks, which in turn risks disrupting carefully optimised match pairings (rank, score, and exclusion logic).

| Metric | Current | Required for A/B Split |
|--------|---------|----------------------|
| Delegates with back-to-back meetings per hour | 15–19 per block | 0 |
| Meetings requiring movement | — | ~97 (34.8%) |
| Sponsors active in both slots per hour | 21/25 | Would need restructuring |
| Delegates free for entire hour per block | 6–10 | ~19 (half the group) |

### Estimated Improvement

If successfully implemented, this approach would reduce mid-hour movement by approximately **50–60%**. Currently, most delegates move between rooms at least once per hour block. Under Group A/B, half the delegate cohort would remain stationary for the entire hour, and the other half would be in a content session with no movement required.

### Trade-offs and Risks

The primary risk is **match quality degradation**. The current schedule has been optimised over multiple sessions — moving 97 meetings to different hour blocks would require re-validating every displaced meeting against the sponsor's ranked list, exclusion rules, and slot availability. Some high-quality pairings may not survive the reshuffle intact.

A secondary risk is **sponsor capacity**. Several sponsors have two representatives attending, with meetings split across both slots of an hour block. Collapsing all their meetings into one slot per hour would require either reducing their meeting count or running both reps simultaneously in the same slot — which may not be logistically possible in all cases.

The approach also assumes delegates can be cleanly divided into two groups of approximately equal size (~19 each). In practice, delegates with 8 meetings are fully booked across all 12 slots, making it impossible to move their meetings without reducing their total count — which would require sponsor approval.

**Verdict: Feasible in principle, but the implementation cost is high.** A full rebuild of the schedule would be more practical than a selective reshuffle of 97 meetings.

---

## Approach 2: Staggered Timing (Extended Gap)

### What this means

Rather than restructuring groups, this approach introduces a **30-minute gap between the two slots within each hour block**. The structure per hour would become:

```
Slot A:  30 min meeting
Gap:     30 min content session / delegates remain in room
Slot B:  30 min meeting
```

This allows content sessions to complete fully before delegates move, and gives sponsors time to reset between meetings.

### Feasibility Assessment

**This approach is feasible with zero changes to the current meeting schedule.**

No meetings need to move. No match pairings are disrupted. The only change is to the printed agenda and room management — the gap is inserted between the two existing slots in each hour block.

The trade-off is time. Adding a 30-minute gap to each of the six hour blocks adds **3 hours to the total event duration** across both days. This is not viable if the event venue and programme are already fixed.

However, a more practical variant would be to **apply the gap selectively** — for example, only between the morning and afternoon sessions (i.e., between H1 and H2, and between H4 and H5), rather than within every hour block. This would add only 30–60 minutes to the day while still reducing the most disruptive transitions.

Alternatively, the gap could be used to **replace one slot per hour block** rather than adding time. This would reduce total meetings from 279 to approximately 186 (removing one slot of ~23 meetings per block), which is a significant reduction in meeting volume and would require sponsor agreement.

| Variant | Time Added | Meetings Lost | Movement Reduction |
|---------|-----------|--------------|-------------------|
| Full 30-min gap per block (×6) | +3 hours | 0 | High |
| Selective gap (morning transitions only) | +30–60 min | 0 | Moderate |
| Replace one slot per block with gap | 0 | ~93 meetings | High |

### Estimated Improvement

The staggered timing approach would meaningfully reduce the **perception of disruption** even if it does not reduce the number of room transitions. Delegates would have a clear 30-minute window to complete content, settle, and prepare for the next meeting — rather than moving immediately from one room to another. The improvement is primarily experiential rather than structural.

### Trade-offs and Risks

The main risk is **programme length**. A full implementation adds 3 hours across two days, which may conflict with venue bookings, catering, or travel arrangements. Any variant that removes meeting slots would require sponsor and delegate communication.

The approach also does not address the root cause of movement — it simply spaces it out. Delegates with back-to-back meetings in the same hour block would still move between rooms; they would just have more time between transitions.

---

## Recommendation

| | Approach 1 (Group A/B) | Approach 2 (Staggered) |
|--|----------------------|----------------------|
| Feasibility | Possible but high effort | High — no schedule changes |
| Movement reduction | 50–60% | 20–30% (experiential) |
| Match quality risk | High (34.8% meetings displaced) | None |
| Time impact | Neutral | +3 hours (full) or +30–60 min (selective) |
| Implementation complexity | Very high | Low |

**For the current event (March 2026):** Approach 2 with selective gaps is the most practical option. Inserting a 30-minute buffer between the morning and afternoon meeting blocks on each day (i.e., between H1 and H2, and between H4 and H5) would add only 60 minutes across the two days while meaningfully reducing the pressure on delegates during the busiest transitions.

**For future events:** Approach 1 is worth designing into the schedule from the outset. If the Group A/B structure is built into the initial matching algorithm — rather than retrofitted — the match quality impact can be minimised and the movement reduction benefit fully realised.

---

*Analysis based on 279 confirmed meetings, 38 delegates, 25 sponsors as of 19 March 2026.*
