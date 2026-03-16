// Simulate the slot assignment logic exactly as in routers.ts
const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const delegateUsedSlots = new Map();
const sponsorUsedSlots = new Map();
const delegateMeetingCount = new Map();

const sponsorId = 750001;
const meetingCount = 24;
const halfCount = Math.ceil(meetingCount / 2); // 12
const hasTwoAttendees = meetingCount > 12; // true

// Initialize sponsor slot tracker
if (!sponsorUsedSlots.has(sponsorId)) {
  sponsorUsedSlots.set(sponsorId, new Map([[1, new Set()], [2, new Set()]]));
}
const sponsorSlots = sponsorUsedSlots.get(sponsorId);

// Simulate 24 different delegates
const delegates = Array.from({length: 24}, (_, i) => ({ attendeeId: 'delegate_' + i }));

const matchesWithSlots = [];
for (let i = 0; i < delegates.length; i++) {
  const match = delegates[i];
  const attendeeNumber = hasTwoAttendees ? (i < halfCount ? 1 : 2) : 1;
  
  const delegateSlots = delegateUsedSlots.get(match.attendeeId) ?? new Set();
  const sponsorAttendeeSlots = sponsorSlots.get(attendeeNumber) ?? new Set();
  
  const availableSlot = ALL_SLOTS.find(slot => !delegateSlots.has(slot) && !sponsorAttendeeSlots.has(slot)) ?? null;
  
  if (availableSlot !== null) {
    delegateSlots.add(availableSlot);
    sponsorAttendeeSlots.add(availableSlot);
    delegateUsedSlots.set(match.attendeeId, delegateSlots);
    sponsorSlots.set(attendeeNumber, sponsorAttendeeSlots);
    delegateMeetingCount.set(match.attendeeId, (delegateMeetingCount.get(match.attendeeId) ?? 0) + 1);
  }
  
  matchesWithSlots.push({ ...match, timeSlot: availableSlot, attendeeNumber });
}

console.log('Slot assignments:');
matchesWithSlots.forEach(m => console.log(`  Attendee ${m.attendeeNumber} Slot ${m.timeSlot} Delegate ${m.attendeeId}`));
console.log('Sponsor slot tracker for Attendee 1:', [...sponsorSlots.get(1)]);
console.log('Sponsor slot tracker for Attendee 2:', [...sponsorSlots.get(2)]);
