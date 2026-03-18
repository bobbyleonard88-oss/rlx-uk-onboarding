import * as db from './db.ts';
import { attendees } from './attendees.ts';

const allMeetings = await db.getAllMeetings();
const allRankings = await db.getAllRankingsSubmissions();
const allIntakes = await db.getAllIntakeSubmissions();

// Build lookup maps
const sponsorNames = new Map();
for (const intake of allIntakes) {
  sponsorNames.set(intake.sponsorId, intake.companyName || `Sponsor ${intake.sponsorId}`);
}

const rankingsMap = new Map(); // sponsorId -> ranked array of attendeeIds
for (const r of allRankings) {
  if (r.rankingsData) rankingsMap.set(r.sponsorId, JSON.parse(r.rankingsData));
}

const meetingCount = new Map();
for (const m of allMeetings) meetingCount.set(m.attendeeId, (meetingCount.get(m.attendeeId)||0)+1);

const slotOccupancy = new Map(); // slot -> Set of attendeeIds
for (const m of allMeetings) {
  if (!slotOccupancy.has(m.timeSlot)) slotOccupancy.set(m.timeSlot, new Set());
  slotOccupancy.get(m.timeSlot).add(m.attendeeId);
}

// For each sponsor, build their current delegate set
const sponsorDelegates = new Map(); // sponsorId -> Set of attendeeIds
for (const m of allMeetings) {
  if (!sponsorDelegates.has(m.sponsorId)) sponsorDelegates.set(m.sponsorId, new Set());
  sponsorDelegates.get(m.sponsorId).add(m.attendeeId);
}

const slotLabels = {1:'Day1 11:00',2:'Day1 11:30',3:'Day1 13:15',4:'Day1 13:45',5:'Day1 14:30',6:'Day1 15:00',7:'Day2 10:30',8:'Day2 11:00',9:'Day2 13:15',10:'Day2 13:45',11:'Day2 14:30',12:'Day2 15:00'};

// Find all meetings where delegate is ranked in bottom 40% for that sponsor
// AND that same delegate is ranked in top 20% for another sponsor who doesn't have them yet
const swapCandidates = [];

for (const m of allMeetings) {
  const sponsorRankedList = rankingsMap.get(m.sponsorId) || [];
  if (sponsorRankedList.length === 0) continue;
  
  const currentRank = sponsorRankedList.indexOf(m.attendeeId);
  if (currentRank < 0) continue; // unranked, skip
  
  const rankPct = currentRank / sponsorRankedList.length;
  if (rankPct < 0.4) continue; // only look at bottom 60% ranked delegates (rank > 40% of list)
  
  const delegate = attendees.find(a => a.id === m.attendeeId);
  if (!delegate) continue;
  
  // Now check: is this delegate ranked highly by any OTHER sponsor who doesn't have them yet?
  for (const [otherSponsorId, otherRankedList] of rankingsMap) {
    if (otherSponsorId === m.sponsorId) continue;
    
    const otherRank = otherRankedList.indexOf(m.attendeeId);
    if (otherRank < 0) continue; // not ranked by other sponsor
    
    const otherRankPct = otherRank / otherRankedList.length;
    if (otherRankPct > 0.3) continue; // only top 30% for other sponsor
    
    // Does other sponsor already have this delegate?
    if (sponsorDelegates.get(otherSponsorId)?.has(m.attendeeId)) continue;
    
    // Does other sponsor have a slot free that this delegate can fill?
    // Find other sponsor's lowest-ranked delegate who is free in the same slot
    const otherMeetings = allMeetings.filter(x => x.sponsorId === otherSponsorId);
    
    // Find a delegate in other sponsor's schedule who:
    // 1. Is ranked lower than our delegate would be
    // 2. Is free in our delegate's current slot (so they can swap)
    // 3. Our delegate is free in their slot
    
    for (const otherM of otherMeetings) {
      const otherDelegate = attendees.find(a => a.id === otherM.attendeeId);
      if (!otherDelegate) continue;
      
      const otherDelegateRankInOther = otherRankedList.indexOf(otherM.attendeeId);
      // Our delegate would be ranked better in other sponsor than the current occupant
      if (otherRank >= otherDelegateRankInOther && otherDelegateRankInOther >= 0) continue;
      
      // Can the displaced delegate go to our sponsor's slot?
      // Check: is displaced delegate free in our meeting's slot?
      const busyInOurSlot = slotOccupancy.get(m.timeSlot) || new Set();
      if (busyInOurSlot.has(otherM.attendeeId)) continue;
      
      // Check: is our delegate free in other sponsor's slot?
      const busyInOtherSlot = slotOccupancy.get(otherM.timeSlot) || new Set();
      if (busyInOtherSlot.has(m.attendeeId)) continue;
      
      // Check: does displaced delegate already meet our sponsor?
      if (sponsorDelegates.get(m.sponsorId)?.has(otherM.attendeeId)) continue;
      
      // Check: rank improvement for our sponsor (displaced delegate ranked in our sponsor's list)
      const displacedRankInOurSponsor = (rankingsMap.get(m.sponsorId) || []).indexOf(otherM.attendeeId);
      
      // Calculate rank improvement scores
      const rankImprovementForOtherSponsor = currentRank - otherRank; // positive = better
      const currentRankStr = `#${currentRank+1} of ${sponsorRankedList.length}`;
      const newRankStr = `#${otherRank+1} of ${otherRankedList.length}`;
      const displacedRankStr = displacedRankInOurSponsor >= 0 ? `#${displacedRankInOurSponsor+1}` : 'unranked';
      const otherDelegateCurrentRankStr = `#${otherDelegateRankInOther+1} of ${otherRankedList.length}`;
      
      // Only flag if it's a meaningful improvement (at least 10 rank positions better)
      if (rankImprovementForOtherSponsor < 10) continue;
      
      swapCandidates.push({
        delegate,
        currentSponsorId: m.sponsorId,
        currentSponsorName: sponsorNames.get(m.sponsorId),
        currentRank: currentRank + 1,
        currentRankTotal: sponsorRankedList.length,
        currentSlot: m.timeSlot,
        targetSponsorId: otherSponsorId,
        targetSponsorName: sponsorNames.get(otherSponsorId),
        targetRank: otherRank + 1,
        targetRankTotal: otherRankedList.length,
        targetSlot: otherM.timeSlot,
        displacedDelegate: otherDelegate,
        displacedRankInTarget: otherDelegateRankInOther + 1,
        displacedRankInCurrent: displacedRankInOurSponsor >= 0 ? displacedRankInOurSponsor + 1 : null,
        rankImprovement: rankImprovementForOtherSponsor,
        score: m.matchScore,
      });
    }
  }
}

// Sort by rank improvement (biggest upgrade first)
swapCandidates.sort((a, b) => b.rankImprovement - a.rankImprovement);

// Deduplicate — only show best swap per delegate-sponsor pair
const seen = new Set();
const filtered = [];
for (const c of swapCandidates) {
  const key = `${c.delegate.id}-${c.targetSponsorId}`;
  if (seen.has(key)) continue;
  seen.add(key);
  filtered.push(c);
  if (filtered.length >= 20) break;
}

console.log(`=== TOP CROSS-SPONSOR SWAP OPPORTUNITIES ===`);
console.log(`Found ${swapCandidates.length} potential swaps, showing top ${filtered.length}\n`);

for (const c of filtered) {
  console.log(`📊 ${c.delegate.firstName} ${c.delegate.lastName} (${c.delegate.company})`);
  console.log(`   Currently: ${c.currentSponsorName} rank ${c.currentRank}/${c.currentRankTotal} in slot ${c.currentSlot} (${slotLabels[c.currentSlot]}) | score ${c.score}%`);
  console.log(`   Better fit: ${c.targetSponsorName} rank ${c.targetRank}/${c.targetRankTotal} — +${c.rankImprovement} rank improvement`);
  console.log(`   Swap with: ${c.displacedDelegate.firstName} ${c.displacedDelegate.lastName} (${c.displacedDelegate.company}) currently rank ${c.displacedRankInTarget}/${c.targetRankTotal} for ${c.targetSponsorName}`);
  console.log(`   → ${c.displacedDelegate.firstName} goes to ${c.currentSponsorName} (rank ${c.displacedRankInCurrent ? '#'+c.displacedRankInCurrent : 'unranked'}) in slot ${c.currentSlot}`);
  console.log(`   Slots: ${c.targetSponsorName} slot ${c.targetSlot} (${slotLabels[c.targetSlot]}) ↔ ${c.currentSponsorName} slot ${c.currentSlot} (${slotLabels[c.currentSlot]})`);
  console.log('');
}

process.exit(0);
