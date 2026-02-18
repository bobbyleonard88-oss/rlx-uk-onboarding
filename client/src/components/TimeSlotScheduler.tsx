/**
 * Time Slot Scheduler Component
 * Displays 6 meeting slots (3 per day) in two columns with drag-and-drop reorganization
 * Layout: Day 1 left column, Day 2 right column, unassigned meetings + all delegates on far right
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, GripVertical, X, Users, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useState } from "react";
import { attendees } from "@/lib/attendees";

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
  timeSlot: number | null;
  attendeeNumber?: number | null;
}

interface TimeSlotSchedulerProps {
  meetings: Meeting[];
  onUpdateSlot: (meetingId: number, newSlot: number | null) => void;
  onRemoveMeeting: (meetingId: number) => void;
  onAddDelegate?: (attendeeId: string, slot: number) => void;
  onReplaceMeeting?: (meetingId: number) => void;
}

const DAY1_SLOTS = [
  { day: 1, slot: 1, label: "Slot 1" },
  { day: 1, slot: 2, label: "Slot 2" },
  { day: 1, slot: 3, label: "Slot 3" },
];

const DAY2_SLOTS = [
  { day: 2, slot: 4, label: "Slot 1" },
  { day: 2, slot: 5, label: "Slot 2" },
  { day: 2, slot: 6, label: "Slot 3" },
];

export default function TimeSlotScheduler({ meetings, onUpdateSlot, onRemoveMeeting, onAddDelegate, onReplaceMeeting }: TimeSlotSchedulerProps) {
  const [draggedMeeting, setDraggedMeeting] = useState<number | null>(null);
  const [draggedDelegate, setDraggedDelegate] = useState<string | null>(null);
  const [showAllDelegates, setShowAllDelegates] = useState(false);

  const handleDragStart = (meetingId: number) => {
    setDraggedMeeting(meetingId);
    setDraggedDelegate(null);
  };

  const handleDelegateDragStart = (attendeeId: string) => {
    setDraggedDelegate(attendeeId);
    setDraggedMeeting(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (slot: number, targetMeetingId?: number) => {
    // Handle delegate drop (create new meeting)
    if (draggedDelegate && onAddDelegate) {
      onAddDelegate(draggedDelegate, slot);
      setDraggedDelegate(null);
      return;
    }

    // Handle meeting drop
    if (draggedMeeting !== null) {
      // If dropping on an existing meeting, swap them
      if (targetMeetingId && targetMeetingId !== draggedMeeting) {
        const draggedMeetingData = meetings.find(m => m.id === draggedMeeting);
        const targetMeetingData = meetings.find(m => m.id === targetMeetingId);
        
        if (draggedMeetingData && targetMeetingData) {
          // Swap the time slots
          onUpdateSlot(draggedMeeting, targetMeetingData.timeSlot);
          onUpdateSlot(targetMeetingId, draggedMeetingData.timeSlot);
        }
      } else {
        // Normal drop to slot
        onUpdateSlot(draggedMeeting, slot);
      }
      setDraggedMeeting(null);
    }
  };

  const handleDropUnassigned = () => {
    if (draggedMeeting !== null) {
      onUpdateSlot(draggedMeeting, null);
      setDraggedMeeting(null);
    }
    // Ignore delegate drops on unassigned area
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
      onDragStart={() => handleDragStart(meeting.id)}
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
              {meeting.attendeeNumber && (
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs flex-shrink-0">
                  Attendee {meeting.attendeeNumber}
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
                  {meeting.isTop20 && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                      Top 20
                    </Badge>
                  )}
                </div>
                {meeting.matchReason && meeting.matchReason !== "Manually added" && (
                  <div className="mt-2 text-xs text-slate-400 italic border-l-2 border-blue-500/30 pl-2">
                    {meeting.matchReason}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1">
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
    
    return (
      <div key={slotInfo.slot} className="space-y-2">
        <h4 className="text-white font-semibold text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          {slotInfo.label}
        </h4>
        <div
          className="space-y-2 min-h-[200px] border-2 border-dashed border-slate-600 rounded-lg p-3 bg-slate-900/30"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(slotInfo.slot)}
        >
          {[1, 2].map((meetingNum) => {
            const meeting = slotMeetings[meetingNum - 1];
            return (
              <div key={meetingNum} className="space-y-1">
                <div className="text-slate-400 text-xs font-medium">Meeting {meetingNum}</div>
                {meeting ? (
                  renderMeetingCard(meeting, false, true)
                ) : (
                  <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 text-center text-slate-500 text-sm">
                    Drop meeting here
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6">
      {/* Day 1 Column */}
      <div className="flex-1 space-y-4">
        <h3 className="text-xl font-heading font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          Day 1
        </h3>
        {DAY1_SLOTS.map(renderSlot)}
      </div>

      {/* Day 2 Column */}
      <div className="flex-1 space-y-4">
        <h3 className="text-xl font-heading font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          Day 2
        </h3>
        {DAY2_SLOTS.map(renderSlot)}
      </div>

      {/* Right Side: Unassigned Meetings + All Delegates */}
      <div className="w-80 space-y-4 flex-shrink-0">
        {/* Unassigned Meetings */}
        <Card className="glass-card border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-accent" />
              Unassigned ({unassignedMeetings.length})
            </CardTitle>
          </CardHeader>
          <CardContent
            className="min-h-[120px] max-h-[300px] overflow-y-auto border-2 border-dashed border-slate-600 rounded-lg p-3"
            onDragOver={handleDragOver}
            onDrop={handleDropUnassigned}
          >
            <div className="space-y-2">
              {unassignedMeetings.map((meeting) => renderMeetingCard(meeting, true))}
            </div>
            {unassignedMeetings.length === 0 && (
              <div className="text-center text-slate-400 py-8 text-sm">
                All meetings assigned
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Delegates Panel */}
        <Card className="glass-card border-slate-700">
          <CardHeader className="pb-3">
            <Button
              variant="ghost"
              onClick={() => setShowAllDelegates(!showAllDelegates)}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-white font-semibold text-base">All Delegates ({attendees.length})</span>
              </div>
              {showAllDelegates ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </Button>
          </CardHeader>
          {showAllDelegates && (
            <CardContent className="pt-0 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {attendees.map((delegate) => {
                  const meetingCount = delegateMeetingCounts[delegate.id] || 0;
                  const isMaxed = meetingCount >= 8;
                  
                  return (
                    <div
                      key={delegate.id}
                      draggable={!isMaxed}
                      onDragStart={() => !isMaxed && handleDelegateDragStart(delegate.id)}
                      className={`bg-slate-800/50 rounded p-2 border border-slate-600 ${
                        isMaxed ? 'opacity-50 cursor-not-allowed' : 'cursor-move hover:bg-slate-700/50 hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm truncate">
                            {delegate.firstName} {delegate.lastName}
                          </div>
                          <div className="text-slate-300 text-xs truncate">{delegate.company}</div>
                        </div>
                        <Badge 
                          variant={isMaxed ? "destructive" : "outline"} 
                          className="text-xs flex-shrink-0"
                        >
                          {meetingCount}/8
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
