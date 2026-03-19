# Group A/B Room Feasibility Report

**Date:** March 19, 2026  
**Scope:** 279 meetings, 38 delegates, 25 sponsors, 12 time slots across 2 days

---

## The Model

| Group | Rule | Experience |
|---|---|---|
| **Group A** | Has meetings in **both** slots of an hour block | Stays in meeting room the full hour |
| **Group B** | Has **no** meetings in an hour block | Stays in content/session room the full hour |

Delegates with exactly **1 meeting** in an hour block are the problem — they must enter or exit mid-hour.

---

## Starting Point

Before any reshuffling, there were **84 mid-hour disruption instances** across 38 delegates and 6 hour blocks (delegates with exactly 1 meeting in a block).

---

## What the Solver Found

With full freedom to move any meeting to any of the 12 available slots (keeping all sponsor-delegate pairings intact, no delegate exceeding 8 meetings, no sponsor exceeding 2 meetings per slot), the solver was able to reduce this from **84 instances down to 9 instances** across just **7 delegates**.

**50 slot changes are required** to achieve this.

---

## Final Block Profile (After Reshuffling)

| Hour Block | Group A (2 meetings) | Group B (0 meetings) | ⚠️ Still Odd (1 meeting) |
|---|---|---|---|
| H1 — Day 1 11:00–12:00 | 22 delegates | 13 delegates | **3** |
| H2 — Day 1 13:15–14:15 | 21 delegates | 17 delegates | **0** ✅ |
| H3 — Day 1 14:30–15:30 | 22 delegates | 13 delegates | **3** |
| H4 — Day 2 10:30–11:30 | 21 delegates | 17 delegates | **0** ✅ |
| H5 — Day 2 13:15–14:15 | 25 delegates | 12 delegates | **1** |
| H6 — Day 2 14:30–15:30 | 23 delegates | 13 delegates | **2** |

**4 out of 6 hour blocks** can be made fully clean. The remaining 2 blocks on Day 1 and 2 blocks on Day 2 have a small residual.

---

## The 7 Unresolvable Delegates

These delegates cannot be cleanly assigned to Group A or B in at least one hour block, regardless of how other meetings are reshuffled. The constraint is that their single meeting in that block cannot be moved — either the sponsor is at full capacity in all other slots, or the delegate has no free slots in any other block to absorb it.

| Delegate | Company | Problematic Hour Block | Sponsor | Why Stuck |
|---|---|---|---|---|
| **Sarah Cooper** | Rentokil Initial | H1 — Day 1 11:00 | Poetry | Poetry has no other slot available for this pairing |
| **Chris Tennant** | Infor | H3 — Day 1 14:30 | PerchPeek | PerchPeek capacity conflict across remaining slots |
| **Julie Lowe** | easyJet | H1 — Day 1 11:00 | Udder | Udder at capacity in all H1-compatible slots |
| **Julie Lowe** | easyJet | H3 — Day 1 14:30 | The Martec | The Martec capacity conflict |
| **Jonathan Kitterhing** | Swiss Re | H1 — Day 1 11:00 | Udder | Same Udder constraint as Julie Lowe |
| **Martin McDermott** | IQ-EQ | H6 — Day 2 14:30 | The Martec | The Martec fully booked in all alternative slots |
| **Andrew Boyd** | Convatec | H6 — Day 2 14:30 | The Martec | Same The Martec constraint |
| **Mark Kunaseelan** | UAL | H5 — Day 2 13:15 | (sponsor conflict) | No available slot pairing |

**Common pattern:** The Martec and Udder are lower-volume sponsors (8–10 meetings each) but their meetings are spread thinly across the schedule, making it hard to consolidate them into paired blocks for certain delegates.

---

## Verdict

**The Group A/B room model is nearly feasible.** With 50 slot changes:

- **35 out of 38 delegates** can be cleanly assigned to Group A or B for every hour block
- **3 delegates** (Sarah Cooper, Chris Tennant, Julie Lowe / Jonathan Kitterhing) would still need to move mid-hour in 1–2 blocks
- **4 of 6 hour blocks** would be completely disruption-free

This is a significant improvement over the current state (84 disruption instances → 9 instances, an **89% reduction**).

---

## Recommendation

**Proceed with the reshuffling** if you want to implement Group A/B rooms. The 50 slot changes are purely administrative (same sponsor-delegate pairings, just different time slots) and would not require any re-matching or re-ranking.

The 7 residual cases could be handled by:
1. Accepting that these 7 delegates move once mid-hour (minimal disruption)
2. Manually reviewing The Martec and Udder schedules to see if any of their meetings can be swapped with another sponsor to free up a slot

---

## Required Slot Changes (50 total)

Sponsor name key for coded IDs: `270002` = Appcast (second rep), `540001` = hackajob, `600001` = Happydance, `810002` = Radancy, `900001` = Poetry.

| Delegate | Company | Sponsor | From Slot | From Block | To Slot | To Block |
|---|---|---|---|---|---|---|
| Cath Possamai | | Happydance | Slot 3 | Day 1 13:15 | Slot 5 | Day 1 14:30 |
| Cath Possamai | | Bright Apply | Slot 11 | Day 2 14:30 | Slot 6 | Day 1 14:30 |
| Jon Warwick | Sky | SHL | Slot 6 | Day 1 14:30 | Slot 8 | Day 2 10:30 |
| Jules Anderson | Gilead | Bright Apply | Slot 4 | Day 1 13:15 | Slot 9 | Day 2 13:15 |
| Sarah Cooper | Rentokil | Poetry | Slot 10 | Day 2 13:15 | Slot 1 | Day 1 11:00 |
| Michelle Monahan | | Wilson | Slot 2 | Day 1 11:00 | Slot 4 | Day 1 13:15 |
| Michelle Monahan | | Poetry | Slot 7 | Day 2 10:30 | Slot 10 | Day 2 13:15 |
| Chris Tennant | Infor | PerchPeek | Slot 3 | Day 1 13:15 | Slot 5 | Day 1 14:30 |
| Sharron Marsh | Doyle Collection | Appcast | Slot 1 | Day 1 11:00 | Slot 11 | Day 2 14:30 |
| Sharron Marsh | Doyle Collection | The Martec | Slot 5 | Day 1 14:30 | Slot 1 | Day 1 11:00 |
| Sharron Marsh | Doyle Collection | Symphony Talent | Slot 8 | Day 2 10:30 | Slot 2 | Day 1 11:00 |
| Tush Wijeratne | WPP | Bright Apply | Slot 2 | Day 1 11:00 | Slot 4 | Day 1 13:15 |
| Tush Wijeratne | WPP | Maki People | Slot 8 | Day 2 10:30 | Slot 11 | Day 2 14:30 |
| Edwin Pene | | Harver | Slot 3 | Day 1 13:15 | Slot 12 | Day 2 14:30 |
| Martin McDermott | IQ-EQ | The Martec | Slot 8 | Day 2 10:30 | Slot 11 | Day 2 14:30 |
| Mark Coad | GSK | Harver | Slot 2 | Day 1 11:00 | Slot 3 | Day 1 13:15 |
| Mark Coad | GSK | PerchPeek | Slot 6 | Day 1 14:30 | Slot 8 | Day 2 10:30 |
| Andrew Boyd | Convatec | Wilson | Slot 3 | Day 1 13:15 | Slot 8 | Day 2 10:30 |
| Robyn Collins | | Wilson | Slot 4 | Day 1 13:15 | Slot 5 | Day 1 14:30 |
| Robyn Collins | | Udder | Slot 8 | Day 2 10:30 | Slot 9 | Day 2 13:15 |
| Anna Katyal | BMS Group | The Martec | Slot 6 | Day 1 14:30 | Slot 9 | Day 2 13:15 |
| Anna Katyal | BMS Group | PerchPeek | Slot 7 | Day 2 10:30 | Slot 10 | Day 2 13:15 |
| Rikki Fullerton | Serco | Udder | Slot 6 | Day 1 14:30 | Slot 7 | Day 2 10:30 |
| Adam Binks | KPMG | Veremark | Slot 5 | Day 1 14:30 | Slot 10 | Day 2 13:15 |
| Mark Brooker | | Udder | Slot 3 | Day 1 13:15 | Slot 5 | Day 1 14:30 |
| Debbie Robinson | | inploi | Slot 4 | Day 1 13:15 | Slot 6 | Day 1 14:30 |
| Joanna Hackett | | Zinc | Slot 11 | Day 2 14:30 | Slot 7 | Day 2 10:30 |
| Ciaran O'Regan | LEGO | Happydance | Slot 1 | Day 1 11:00 | Slot 12 | Day 2 14:30 |
| Hollie Jordan | | Sapia.ai | Slot 4 | Day 1 13:15 | Slot 11 | Day 2 14:30 |
| Jessica Shaunie Green | Calor Gas | Veremark | Slot 1 | Day 1 11:00 | Slot 4 | Day 1 13:15 |
| Oliver Browne | | Poetry | Slot 1 | Day 1 11:00 | Slot 3 | Day 1 13:15 |
| Oliver Browne | | Appcast | Slot 6 | Day 1 14:30 | Slot 1 | Day 1 11:00 |
| Oliver Browne | | Wilson | Slot 9 | Day 2 13:15 | Slot 2 | Day 1 11:00 |
| Nikhilesh Mathur | | Sapia.ai | Slot 3 | Day 1 13:15 | Slot 8 | Day 2 10:30 |
| Carly George | AXA | Veremark | Slot 4 | Day 1 13:15 | Slot 9 | Day 2 13:15 |
| Sonal Jain | | Zinc | Slot 5 | Day 1 14:30 | Slot 9 | Day 2 13:15 |
| Salina Budaly | | Sapia.ai | Slot 7 | Day 2 10:30 | Slot 12 | Day 2 14:30 |
| Mark Kunaseelan | UAL | Poetry | Slot 8 | Day 2 10:30 | Slot 9 | Day 2 13:15 |
| Mark Kunaseelan | UAL | The Martec | Slot 11 | Day 2 14:30 | Slot 5 | Day 1 14:30 |
| Joanna Saunders-Hare | | hackajob | Slot 2 | Day 1 11:00 | Slot 6 | Day 1 14:30 |
| Joanna Saunders-Hare | | Harver | Slot 7 | Day 2 10:30 | Slot 10 | Day 2 13:15 |
| Lucy Bousfield | | Poetry | Slot 2 | Day 1 11:00 | Slot 3 | Day 1 13:15 |
| Julie Lowe | easyJet | Udder | Slot 5 | Day 1 14:30 | Slot 1 | Day 1 11:00 |
| Julie Lowe | easyJet | The Martec | Slot 8 | Day 2 10:30 | Slot 6 | Day 1 14:30 |
| Jonathan Kitterhing | Swiss Re | Udder | Slot 12 | Day 2 14:30 | Slot 2 | Day 1 11:00 |
| Yuliia Zembal | UKRSIBBANK | Zinc | Slot 7 | Day 2 10:30 | Slot 1 | Day 1 11:00 |
| Yuliia Zembal | UKRSIBBANK | Happydance | Slot 10 | Day 2 13:15 | Slot 2 | Day 1 11:00 |
| Lisa Brignall | Coca-Cola | Happydance | Slot 9 | Day 2 13:15 | Slot 11 | Day 2 14:30 |
| Natalie McGuinness | Busy Bees | Radancy | Slot 4 | Day 1 13:15 | Slot 10 | Day 2 13:15 |
| James Harley | Syngenta | JobSync | Slot 5 | Day 1 14:30 | Slot 12 | Day 2 14:30 |
