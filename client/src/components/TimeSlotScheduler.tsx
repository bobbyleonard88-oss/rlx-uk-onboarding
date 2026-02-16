/**
 * Time Slot Scheduler Component
 * Displays 6 meeting slots (3 per day) with drag-and-drop reorganization
 * Layout: Schedule on left, unassigned meetings + all delegates on right
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, GripVertical, X, Users, ChevronDown, ChevronUp } from "lucide-react";
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
}

interface TimeSlotSchedulerProps {
  meetings: Meeting[];
  onUpdateSlot: (meetingId: number, newSlot: number | null) => void;
  onRemoveMeeting: (meetingId: number) => void;
}

const TIME_SLOTS = [
  // Day 1
  { day: 1, slot: 1, label: "Slot 1" },
  { day: 1, slot: 2, label: "Slot 2" },
  { day: 1, slot: 3, label: "Slot 3" },
  // Day 2
  { day: 2, slot: 4, label: "Slot 1" },
  { day: 2, slot: 5, label: "Slot 2" },
  { day: 2, slot: 6, label: "Slot 3" },
];

export default function TimeSlotScheduler({ meetings, onUpdateSlot, onRemoveMeeting }: TimeSlotSchedulerProps) {
  const [draggedMeeting, setDraggedMeeting] = useState<number | null>(null);
  const [showAllDelegates, setShowAllDelegates] = useState(false);

  const handleDragStart = (meetingId: number) => {
    setDraggedMeeting(meetingId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (slot: number, targetMeetingId?: number) => {
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
        if (allowSwap && draggedMeeting !== null && draggedMeeting !== meeting.id) {
          handleDrop(meeting.timeSlot || 0, meeting.id);
        }
      }}
      className={`bg-slate-800/50 rounded cursor-move hover:bg-slate-700/50 transition-colors border border-slate-600 ${compact ? 'p-2' : 'p-3'}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className={`text-slate-400 mt-1 flex-shrink-0 ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
            <span className={`font-medium text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>
              {meeting.delegateName}
            </span>
            {meeting.isPriority && (
              <Badge variant="default" className={compact ? "text-[10px] px-1 py-0" : "text-xs"}>
                {compact ? "P" : "Priority"}
              </Badge>
            )}
            {!meeting.isPriority && meeting.isTop20 && (
              <Badge variant="secondary" className={`bg-purple-500/20 text-purple-300 border-purple-500/30 ${compact ? "text-[10px] px-1 py-0" : "text-xs"}`}>
                {compact ? "T20" : "Top 20"}
              </Badge>
            )}
          </div>
          <div className={`text-slate-300 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{meeting.company}</div>
          <div className={`text-slate-400 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Match: {meeting.matchScore}%
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemoveMeeting(meeting.id)}
          className={`text-red-400 hover:text-red-300 hover:bg-red-500/20 h-auto ${compact ? 'p-0.5' : 'p-1'}`}
        >
          <X className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex gap-6">
      {/* Left Side: Time Slot Schedule */}
      <div className="flex-1 space-y-6">
        {[1, 2].map(day => (
          <div key={day}>
            <h3 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Day {day}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TIME_SLOTS.filter(ts => ts.day === day).map(({ slot, label }) => {
                const slotMeetings = assignedMeetings.filter(m => m.timeSlot === slot);
                
                return (
                  <Card
                    key={slot}
                    className="glass-card border-slate-700"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(slot)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg text-white font-semibold">{label}</div>
                          <div className="text-xs text-slate-400">2 meetings per slot</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {slotMeetings.length}/2
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3 min-h-[140px]">
                        {[1, 2].map(meetingNum => {
                          const meeting = slotMeetings[meetingNum - 1];
                          
                          return (
                            <div
                              key={meetingNum}
                              className="border-2 border-dashed border-slate-600 rounded-lg p-2 min-h-[60px]"
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(slot)}
                            >
                              <div className="text-xs text-slate-400 mb-1 font-medium">Meeting {meetingNum}</div>
                              {meeting ? (
                                renderMeetingCard(meeting, true, true)
                              ) : (
                                <div className="text-center text-slate-500 text-xs py-2">
                                  Drop here
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
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
                      className={`bg-slate-800/50 rounded p-2 border border-slate-600 ${
                        isMaxed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/50'
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
