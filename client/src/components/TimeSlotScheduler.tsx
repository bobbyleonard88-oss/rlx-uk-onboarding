/**
 * Time Slot Scheduler Component
 * Displays 12 numbered meeting slots (2 per hour) with drag-and-drop reorganization
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
  timeSlot: number | null;
}

interface TimeSlotSchedulerProps {
  meetings: Meeting[];
  onUpdateSlot: (meetingId: number, newSlot: number | null) => void;
  onRemoveMeeting: (meetingId: number) => void;
}

const TIME_SLOTS = [
  { slot: 1, time: "10:00-10:30am" },
  { slot: 2, time: "10:30-11:00am" },
  { slot: 3, time: "11:00-11:30am" },
  { slot: 4, time: "11:30am-12:00pm" },
  { slot: 5, time: "1:30-2:00pm" },
  { slot: 6, time: "2:00-2:30pm" },
  { slot: 7, time: "2:30-3:00pm" },
  { slot: 8, time: "3:00-3:30pm" },
  { slot: 9, time: "3:30-4:00pm" },
  { slot: 10, time: "4:00-4:30pm" },
  { slot: 11, time: "4:30-5:00pm" },
  { slot: 12, time: "5:00-5:30pm" },
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
            {unassignedMeetings.map((meeting) => (
              <div
                key={meeting.id}
                draggable
                onDragStart={() => handleDragStart(meeting.id)}
                className="bg-slate-800/50 p-3 rounded-lg cursor-move hover:bg-slate-700/50 transition-colors border border-slate-600"
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white truncate">
                        {meeting.delegateName}
                      </span>
                      {meeting.isPriority && (
                        <Badge variant="default" className="text-xs">Priority</Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-300 truncate">{meeting.company}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Match: {meeting.matchScore}%
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveMeeting(meeting.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {unassignedMeetings.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              All meetings assigned to time slots
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Slot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {TIME_SLOTS.map(({ slot, time }) => {
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
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-bold text-sm">{slot}</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Slot {slot}</div>
                      <div className="text-sm text-white font-medium">{time}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {slotMeetings.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 min-h-[60px]">
                  {slotMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      draggable
                      onDragStart={() => handleDragStart(meeting.id)}
                      className="bg-slate-800/50 p-2 rounded cursor-move hover:bg-slate-700/50 transition-colors border border-slate-600"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-3 h-3 text-slate-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-sm font-medium text-white truncate">
                              {meeting.delegateName}
                            </span>
                            {meeting.isPriority && (
                              <Badge variant="default" className="text-[10px] px-1 py-0">P</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 truncate">{meeting.company}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {meeting.matchScore}%
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveMeeting(meeting.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-0.5 h-auto"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {slotMeetings.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-4 border-2 border-dashed border-slate-700 rounded">
                      Drop here
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
