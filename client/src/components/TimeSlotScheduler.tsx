/**
 * Time Slot Scheduler Component
 * Displays 6 meeting slots (3 per day) in two columns with drag-and-drop reorganization
 * Layout: Day 1 left column, Day 2 right column, unassigned meetings + all delegates on far right
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, GripVertical, X, Users, ChevronDown, ChevronUp, RefreshCw, Eye, FileText, Filter } from "lucide-react";
import { useState } from "react";
import { attendees } from "@/lib/attendees";
import MatchReasonModal from "@/components/MatchReasonModal";
import { MeetingNotesModal } from "@/components/MeetingNotesModal";

import { trpc } from "@/lib/trpc";

interface Meeting {
  id: number;
  attendeeId: string;
  delegateName: string;
  company: string;
  jobTitle: string;
  matchScore: number;
  matchReason: string;
  isPriority: boolean;
  isTop20?: boolean;
  rankPosition?: number | null; // Actual rank number from sponsor's prioritisation list
  timeSlot: number | null;
  attendeeNumber?: number | null;
  adminNotes?: string | null;
}

interface TimeSlotSchedulerProps {
  meetings: Meeting[];
  onUpdateSlot: (meetingId: number, newSlot: number | null) => void;
  onRemoveMeeting: (meetingId: number) => void;
  onAddDelegate?: (attendeeId: string, slot: number) => void;
  onReplaceMeeting?: (meetingId: number) => void;
  sponsorId?: number | null; // For calculating delegate match scores
  sponsorData?: {
    companyName: string;
    solutions?: string;
    painPointsSolved?: string;
    targetOrgSize?: string;
    targetIndustries?: string;
  } | null;
  attendeeNames?: {
    attendee1Name?: string;
    attendee2Name?: string;
  } | null;
}

// Slot numbering: 12 slots total — 6 per day, 2 × 30-min slots per 1-hour block
// Day 1 (Event Day 2): slots 1-6 | Day 2 (Event Day 3): slots 7-12
const DAY1_SLOTS = [
  { day: 1, slot: 1, label: "11:00–11:30" },
  { day: 1, slot: 2, label: "11:30–12:00" },
  { day: 1, slot: 3, label: "13:15–13:45" },
  { day: 1, slot: 4, label: "13:45–14:15" },
  { day: 1, slot: 5, label: "14:30–15:00" },
  { day: 1, slot: 6, label: "15:00–15:30" },
];

const DAY2_SLOTS = [
  { day: 2, slot: 7, label: "10:30–11:00" },
  { day: 2, slot: 8, label: "11:00–11:30" },
  { day: 2, slot: 9, label: "13:15–13:45" },
  { day: 2, slot: 10, label: "13:45–14:15" },
  { day: 2, slot: 11, label: "14:30–15:00" },
  { day: 2, slot: 12, label: "15:00–15:30" },
];

export default function TimeSlotScheduler({
  meetings,
  onUpdateSlot,
  onRemoveMeeting,
  onAddDelegate,
  onReplaceMeeting,
  sponsorId,
  sponsorData,
  attendeeNames,
}: TimeSlotSchedulerProps) {
  const [draggedMeeting, setDraggedMeeting] = useState<Meeting | null>(null);
  const [draggedDelegate, setDraggedDelegate] = useState<string | null>(null);
  const [isDelegateListExpanded, setIsDelegateListExpanded] = useState(false);
  const [matchReasonModal, setMatchReasonModal] = useState<{
    open: boolean;
    delegateName: string;
    matchScore: number;
    matchReason: string;
  }>({ open: false, delegateName: "", matchScore: 0, matchReason: "" });
  const [notesModal, setNotesModal] = useState<{
    open: boolean;
    meetingId: number;
    delegateName: string;
    initialNotes: string;
  }>({ open: false, meetingId: 0, delegateName: "", initialNotes: "" });
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isDragValid, setIsDragValid] = useState<boolean>(true);
  const [dragInvalidReason, setDragInvalidReason] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const utils = trpc.useUtils();
  
  const updateNotesMutation = trpc.admin.updateMeetingNotes.useMutation({
    onSuccess: () => {
      // Refresh meetings to show updated notes
      if (onReplaceMeeting) {
        // Trigger a refresh by calling the parent's refresh function
        window.location.reload();
      }
    },
  });
  
  const handleSaveNotes = async (meetingId: number, notes: string) => {
    await updateNotesMutation.mutateAsync({
      meetingId,
      adminNotes: notes,
    });
  };
  
  // Fetch delegate match scores for the selected sponsor
  const { data: delegateScores } = trpc.admin.calculateDelegateScores.useQuery(
    { sponsorId: sponsorId! },
    { enabled: !!sponsorId }
  );

  // Fetch sponsor's ranked delegate list for showing rank positions
  const { data: sponsorRankings } = trpc.admin.getSponsorRankings.useQuery(
    { sponsorId: sponsorId! },
    { enabled: !!sponsorId }
  );
  // Build a map of attendeeId -> rank position
  const rankMap = sponsorRankings
    ? new Map(sponsorRankings.map(r => [r.attendeeId, r.rank]))
    : new Map<string, number>();

  // Fetch eligible delegates for the selected slot (filters out excluded clients, slot clashes, cap)
  const { data: eligibleData, isFetching: isLoadingEligible } = trpc.admin.getEligibleDelegatesForSlot.useQuery(
    { sponsorId: sponsorId!, timeSlot: selectedSlot! },
    { enabled: !!sponsorId && selectedSlot !== null }
  );
  const eligibleIds = eligibleData ? new Set(eligibleData.eligibleIds) : null;
  // Rich eligible delegate list from server (includes match scores, sorted by score)
  const eligibleDelegateList = eligibleData?.eligibleDelegates ?? null;

  const handleDragStart = (meeting: Meeting) => {
    setDraggedMeeting(meeting);
    setDraggedDelegate(null);
  };

  const handleDelegateDragStart = (attendeeId: string) => {
    setDraggedDelegate(attendeeId);
    setDraggedMeeting(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Get slot from data attribute
    const target = e.currentTarget as HTMLElement;
    const slot = parseInt(target.getAttribute('data-slot') || '0');
    
    if (slot > 0) {
      setDragOverSlot(slot);
      
      // Check if dragging a delegate and validate availability
      if (draggedDelegate) {
        utils.admin.checkDelegateAvailability.fetch({
          attendeeId: draggedDelegate,
          timeSlot: slot,
        }).then(availabilityCheck => {
          setIsDragValid(availabilityCheck.isAvailable);
          if (!availabilityCheck.isAvailable) {
            setDragInvalidReason(`Already booked in this time slot`);
          }
        }).catch(() => {
          setIsDragValid(true); // Default to valid if check fails
        });
      } else {
        setIsDragValid(true);
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
    setIsDragValid(true);
    setDragInvalidReason("");
  };

  const handleDrop = async (slot: number, targetMeetingId?: number) => {
    // Handle delegate drop (create new meeting or swap with existing)
    if (draggedDelegate && onAddDelegate) {
      // Check if delegate is already booked in this time slot with another sponsor
      const availabilityCheck = await utils.admin.checkDelegateAvailability.fetch({
        attendeeId: draggedDelegate,
        timeSlot: slot,
      });

      if (!availabilityCheck.isAvailable) {
        alert(`This delegate is already booked in this time slot with another sponsor.`);
        setDraggedDelegate(null);
        return;
      }

      // If dropping on an existing meeting, remove the old meeting first
      if (targetMeetingId) {
        onRemoveMeeting(targetMeetingId);
      }

      // Add the new delegate
      onAddDelegate(draggedDelegate, slot);
      setDraggedDelegate(null);
      return;
    }

    // Handle meeting drop
    if (draggedMeeting !== null) {
      // If dropping on an existing meeting, swap them
      if (targetMeetingId && targetMeetingId !== draggedMeeting.id) {
        const targetMeetingData = meetings.find(m => m.id === targetMeetingId);
        
        if (targetMeetingData) {
          // Swap the time slots
          onUpdateSlot(draggedMeeting.id, targetMeetingData.timeSlot);
          onUpdateSlot(targetMeetingId, draggedMeeting.timeSlot);
        }
      } else {
        // Normal drop to slot
        onUpdateSlot(draggedMeeting.id, slot);
      }
      setDraggedMeeting(null);
    }
  };

  const handleDropToRemove = () => {
    if (draggedMeeting !== null) {
      // Remove the meeting entirely when dragged to delegate list
      onRemoveMeeting(draggedMeeting.id);
      setDraggedMeeting(null);
    }
    setDraggedDelegate(null);
  };

  const unassignedMeetings = meetings.filter(m => !m.timeSlot);
  const assignedMeetings = meetings.filter(m => m.timeSlot);
  
  // Calculate meeting count for each delegate
  const delegateMeetingCounts = meetings.reduce((acc, meeting) => {
    if (meeting.timeSlot) {
      acc[meeting.attendeeId] = (acc[meeting.attendeeId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const renderMeetingCard = (meeting: Meeting, compact: boolean = false, allowSwap: boolean = false) => (
    <div
      key={meeting.id}
      draggable
      onDragStart={() => handleDragStart(meeting)}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        e.stopPropagation();
        if (allowSwap) {
          handleDrop(meeting.timeSlot!, meeting.id);
        }
      }}
      className={`bg-slate-800/80 rounded-lg p-3 border border-slate-600 cursor-move hover:border-accent/50 transition-all ${
        compact ? 'text-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium text-white truncate cursor-help border-b border-dotted border-slate-500">{meeting.delegateName}</div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Match Score: {meeting.matchScore}/100</p>
                    <p className="text-sm">{meeting.matchReason}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {meeting.attendeeNumber && attendeeNames && (
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs flex-shrink-0">
                  {meeting.attendeeNumber === 1 
                    ? (attendeeNames.attendee1Name || `Attendee 1`) 
                    : (attendeeNames.attendee2Name || `Attendee 2`)
                  }
                </Badge>
              )}
            </div>
            <div className="text-slate-300 text-xs truncate">{meeting.company}</div>
            {!compact && (
              <>
                <div className="text-slate-400 text-xs truncate mt-1">{meeting.jobTitle}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {meeting.matchScore}% match
                  </Badge>
                  {meeting.isPriority && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                      Priority
                    </Badge>
                  )}
                  {meeting.rankPosition != null ? (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs font-bold">
                      #{meeting.rankPosition}
                    </Badge>
                  ) : sponsorRankings != null ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs font-bold cursor-help">
                          New
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This delegate was confirmed after the sponsor submitted their rankings</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : meeting.isTop20 && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                      Ranked
                    </Badge>
                  )}
                </div>

              </>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (meeting.matchReason && meeting.matchReason !== "Manually added") {
                    setMatchReasonModal({
                      open: true,
                      delegateName: meeting.delegateName,
                      matchScore: meeting.matchScore,
                      matchReason: meeting.matchReason,
                    });
                  }
                }}
                disabled={!meeting.matchReason || meeting.matchReason === "Manually added"}
                className="h-6 w-6 p-0 hover:bg-purple-500/20 hover:text-purple-400 flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Eye className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{meeting.matchReason && meeting.matchReason !== "Manually added" ? "View match reason" : "No match reason available"}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotesModal({
                    open: true,
                    meetingId: meeting.id,
                    delegateName: meeting.delegateName,
                    initialNotes: meeting.adminNotes || "",
                  });
                }}
                className={`h-6 w-6 p-0 hover:bg-yellow-500/20 hover:text-yellow-400 flex-shrink-0 ${
                  meeting.adminNotes ? 'text-yellow-400' : ''
                }`}
              >
                <FileText className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{meeting.adminNotes ? 'Edit notes' : 'Add notes'}</p>
            </TooltipContent>
          </Tooltip>
          {onReplaceMeeting && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReplaceMeeting(meeting.id)}
                  className="h-6 w-6 p-0 hover:bg-blue-500/20 hover:text-blue-400 flex-shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Replace with another delegate</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveMeeting(meeting.id)}
                className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-400 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove meeting</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  const renderSlot = (slotInfo: { day: number; slot: number; label: string }) => {
    const slotMeetings = assignedMeetings.filter(m => m.timeSlot === slotInfo.slot);
    const isEmpty = !slotMeetings[0];
    const isSelected = selectedSlot === slotInfo.slot;
    
    return (
      <div key={slotInfo.slot} className="space-y-1.5">
        <h4 className={`font-semibold text-xs flex items-center gap-1.5 ${isSelected ? 'text-accent' : 'text-white'}`}>
          <Clock className={`w-3 h-3 ${isSelected ? 'text-accent' : 'text-accent'}`} />
          {slotInfo.label}
          {isSelected && <span className="text-accent text-xs font-normal">(filtering delegates)</span>}
        </h4>
        <div
          data-slot={slotInfo.slot}
          className={`space-y-1.5 min-h-[140px] border-2 border-dashed rounded-lg p-2 transition-all duration-200 ${
            dragOverSlot === slotInfo.slot
              ? isDragValid
                ? 'border-green-500 bg-green-500/10'
                : 'border-red-500 bg-red-500/10'
              : isSelected
                ? 'border-accent bg-accent/5'
                : 'border-slate-600 bg-slate-900/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDrop(slotInfo.slot)}
        >
          {dragOverSlot === slotInfo.slot && !isDragValid && (
            <div className="text-red-400 text-xs font-medium mb-2 flex items-center gap-1">
              <span>⚠️</span>
              <span>{dragInvalidReason}</span>
            </div>
          )}
          {slotMeetings[0] ? (
            renderMeetingCard(slotMeetings[0], false, true)
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-2 text-center text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'border-accent/60 text-accent bg-accent/5 hover:bg-accent/10'
                  : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
              }`}
              onClick={() => {
                if (isEmpty && sponsorId) {
                  if (isSelected) {
                    setSelectedSlot(null);
                  } else {
                    setSelectedSlot(slotInfo.slot);
                    setIsDelegateListExpanded(true);
                  }
                }
              }}
            >
              {isSelected ? (
                <span className="flex items-center justify-center gap-1">
                  <Filter className="w-3 h-3" />
                  Filtering by this slot — click to clear
                </span>
              ) : (
                <span>Click to filter available delegates</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="grid grid-cols-[1fr_1fr_320px] gap-4 w-full">
      {/* Day 1 Column */}
      <div className="space-y-3">
        <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          Day 1
        </h3>
        {DAY1_SLOTS.map(renderSlot)}
      </div>

      {/* Day 2 Column */}
      <div className="space-y-3">
        <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          Day 2
        </h3>
        {DAY2_SLOTS.map(renderSlot)}
      </div>

      {/* Right Side: All Delegates */}
      <div className="space-y-3">
        {/* All Delegates Panel - Aligned with first meeting slot */}
        <div className="h-[22px]"></div> {/* Spacer to align with Day 1/Day 2 headers */}
        <Card className={`glass-card ${selectedSlot ? 'border-accent/60' : 'border-slate-700'}`}>
          <CardHeader className="pb-3">
            <Button
              variant="ghost"
              onClick={() => setIsDelegateListExpanded(!isDelegateListExpanded)}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${selectedSlot ? 'text-accent' : 'text-accent'}`} />
                {selectedSlot ? (
                  <span className="text-accent font-semibold text-base">
                    {isLoadingEligible ? 'Loading...' : `Available for Slot ${selectedSlot} (${eligibleDelegateList?.length ?? eligibleIds?.size ?? 0})`}
                  </span>
                ) : (
                  <span className="text-white font-semibold text-base">All Delegates ({attendees.length})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedSlot && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); }}
                    className="h-6 px-2 text-xs text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3 mr-1" /> Clear filter
                  </Button>
                )}
                {isDelegateListExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </Button>
          </CardHeader>
          {isDelegateListExpanded && (
            <CardContent 
              className="pt-0 max-h-[400px] overflow-y-auto border-2 border-dashed border-slate-600/50 rounded-lg"
              onDragOver={handleDragOver}
              onDrop={handleDropToRemove}
            >
              {selectedSlot && isLoadingEligible ? (
                <div className="text-center text-slate-400 text-sm py-4">Loading eligible delegates...</div>
              ) : selectedSlot && eligibleDelegateList ? (
                // ── Slot-filtered view: use server-side list with match scores ──
                <div className="space-y-2">
                  {eligibleDelegateList.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-4">No eligible delegates for this slot</div>
                  ) : (
                    (() => {
                      // Build a score map from the full calculateDelegateScores query
                      // so delegates without existing meetings still show their AI score
                      const fullScoreMap = delegateScores
                        ? new Map(delegateScores.map(s => [s.attendeeId, s.matchScore]))
                        : new Map<string, number>();

                      // Merge: prefer the stored meeting score; fall back to AI score
                      const enriched = eligibleDelegateList.map(d => ({
                        ...d,
                        matchScore: d.matchScore ?? fullScoreMap.get(d.id) ?? null,
                      }));

                      // Re-sort: scored first (descending), then unscored alphabetically
                      enriched.sort((a, b) => {
                        if (a.matchScore !== null && b.matchScore !== null) return b.matchScore - a.matchScore;
                        if (a.matchScore !== null) return -1;
                        if (b.matchScore !== null) return 1;
                        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
                      });

                      const getScoreColor = (score: number) => {
                        if (score >= 80) return "text-green-400";
                        if (score >= 60) return "text-yellow-400";
                        if (score >= 40) return "text-orange-400";
                        return "text-slate-400";
                      };

                      return enriched.map((delegate) => (
                        <div
                          key={delegate.id}
                          draggable
                          onDragStart={() => handleDelegateDragStart(delegate.id)}
                          className="bg-slate-800/50 rounded p-2 border border-slate-600 cursor-move hover:bg-slate-700/50 hover:border-accent/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white text-sm truncate">
                                {delegate.firstName} {delegate.lastName}
                              </div>
                              <div className="text-slate-300 text-xs truncate">{delegate.company}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {delegate.matchScore !== null ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getScoreColor(delegate.matchScore)} border-current`}
                                >
                                  {delegate.matchScore}%
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-slate-400 border-slate-500">
                                  No score
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs text-slate-300">
                                {delegate.meetingCount}/8
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>
              ) : (
              // ── No slot selected: show all delegates with booked/maxed indicators ──
              <div className="space-y-2">
                {(() => {
                  // Sort all delegates by match score
                  let sortedDelegates = [...attendees];
                  
                  if (delegateScores && delegateScores.length > 0) {
                    const scoreMap = new Map(delegateScores.map(s => [s.attendeeId, s.matchScore]));
                    sortedDelegates.sort((a, b) => {
                      const scoreA = scoreMap.get(a.id) || 0;
                      const scoreB = scoreMap.get(b.id) || 0;
                      return scoreB - scoreA; // Highest first
                    });
                  }

                  // Get list of delegate IDs already booked with this sponsor
                  const bookedDelegateIds = new Set(
                    meetings.filter(m => m.timeSlot).map(m => m.attendeeId)
                  );
                  
                  if (sortedDelegates.length === 0) {
                    return (
                      <div className="text-center text-slate-400 text-sm py-4">No delegates available</div>
                    );
                  }

                  return sortedDelegates.map((delegate) => {
                    const meetingCount = delegateMeetingCounts[delegate.id] || 0;
                    const isMaxed = meetingCount >= 8;
                    const isBooked = bookedDelegateIds.has(delegate.id);
                    const delegateScore = delegateScores?.find(s => s.attendeeId === delegate.id);
                    const matchScore = delegateScore?.matchScore || 0;
                    const rankPos = rankMap.get(delegate.id);
                    
                    // Color code based on match score
                    const getScoreColor = (score: number) => {
                      if (score >= 80) return "text-green-400";
                      if (score >= 60) return "text-yellow-400";
                      if (score >= 40) return "text-orange-400";
                      return "text-slate-400";
                    };
                    
                    return (
                      <div
                        key={delegate.id}
                        draggable={!isMaxed && !isBooked}
                        onDragStart={() => !isMaxed && !isBooked && handleDelegateDragStart(delegate.id)}
                        className={`bg-slate-800/50 rounded p-2 border border-slate-600 ${
                          isMaxed || isBooked ? 'opacity-50 cursor-not-allowed' : 'cursor-move hover:bg-slate-700/50 hover:border-accent/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm truncate">
                              {delegate.firstName} {delegate.lastName}
                            </div>
                            <div className="text-slate-300 text-xs truncate">{delegate.company}</div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {rankPos != null ? (
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs font-bold">
                                #{rankPos}
                              </Badge>
                            ) : sponsorRankings != null && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs font-bold cursor-help">
                                    New
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This delegate was confirmed after the sponsor submitted their rankings</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {isBooked && (
                              <Badge 
                                variant="outline" 
                                className="text-xs text-blue-400 border-blue-400"
                              >
                                Booked
                              </Badge>
                            )}
                            {sponsorId && delegateScore && !isBooked && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getScoreColor(matchScore)} border-current`}
                              >
                                {matchScore}%
                              </Badge>
                            )}
                            <Badge 
                              variant={isMaxed ? "destructive" : "outline"} 
                              className="text-xs"
                            >
                              {meetingCount}/8
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
    
    {/* Match Reason Modal */}
    <MatchReasonModal
      open={matchReasonModal.open}
      onOpenChange={(open) => setMatchReasonModal({ ...matchReasonModal, open })}
      delegateName={matchReasonModal.delegateName}
      matchScore={matchReasonModal.matchScore}
      matchReason={matchReasonModal.matchReason}
    />
    
    {/* Meeting Notes Modal */}
    <MeetingNotesModal
      open={notesModal.open}
      onClose={() => setNotesModal({ ...notesModal, open: false })}
      meetingId={notesModal.meetingId}
      delegateName={notesModal.delegateName}
      initialNotes={notesModal.initialNotes}
      onSave={handleSaveNotes}
    />
    </>
  );
}
