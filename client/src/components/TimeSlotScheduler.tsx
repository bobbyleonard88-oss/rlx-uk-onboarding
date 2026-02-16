/**
 * Time Slot Scheduler Component
 * Displays 6 meeting slots (3 per day) with drag-and-drop reorganization
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, GripVertical, X } from "lucide-react";
import { useState } from "react";

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

  const handleDragStart = (meetingId: number) => {
    setDraggedMeeting(meetingId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (slot: number) => {
    if (draggedMeeting !== null) {
      onUpdateSlot(draggedMeeting, slot);
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

  const renderMeetingCard = (meeting: Meeting, compact: boolean = false) => (
    <div
      key={meeting.id}
      draggable
      onDragStart={() => handleDragStart(meeting.id)}
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
    <div className="space-y-6">
      {/* Unassigned Meetings Pool */}
      <Card className="glass-card border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Unassigned Meetings ({unassignedMeetings.length})
          </CardTitle>
        </CardHeader>
        <CardContent
          className="min-h-[100px] border-2 border-dashed border-slate-600 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={handleDropUnassigned}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedMeetings.map((meeting) => renderMeetingCard(meeting, false))}
          </div>
          {unassignedMeetings.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              All meetings assigned to time slots
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Slot Grid - Day 1 & Day 2 */}
      <div className="space-y-6">
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
                                renderMeetingCard(meeting, true)
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
    </div>
  );
}
