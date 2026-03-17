/**
 * MeetingFloorPlan — Interactive floor plan for RLX hosted meetings.
 * Shows which leader is at which sponsor table per slot.
 * Navigation: Day slider (Day 1 / Day 2) + Session slider (Hour 1-3).
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const DAY_LABELS = ["Day 1", "Day 2"];
const HOUR_LABELS = ["Hour 1", "Hour 2", "Hour 3"];
const ROUND_LABELS = ["Round 1", "Round 2"];

// Colour palette for sponsor tables (cycles if > 12 sponsors)
const TABLE_COLOURS = [
  "bg-purple-600/80 border-purple-400",
  "bg-blue-600/80 border-blue-400",
  "bg-emerald-600/80 border-emerald-400",
  "bg-amber-600/80 border-amber-400",
  "bg-rose-600/80 border-rose-400",
  "bg-cyan-600/80 border-cyan-400",
  "bg-indigo-600/80 border-indigo-400",
  "bg-teal-600/80 border-teal-400",
  "bg-orange-600/80 border-orange-400",
  "bg-pink-600/80 border-pink-400",
  "bg-lime-600/80 border-lime-400",
  "bg-sky-600/80 border-sky-400",
];

function tableColour(tableNumber: number) {
  return TABLE_COLOURS[(tableNumber - 1) % TABLE_COLOURS.length];
}

interface SliderProps {
  labels: string[];
  value: number;
  onChange: (v: number) => void;
}

function Slider({ labels, value, onChange }: SliderProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {labels.map((label, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            value === i
              ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
          }`}
        >
          {label}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(labels.length - 1, value + 1))}
        disabled={value === labels.length - 1}
        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

interface MeetingFloorPlanProps {
  includeTestAccounts?: boolean;
}

export default function MeetingFloorPlan({ includeTestAccounts = false }: MeetingFloorPlanProps) {
  const { data: floorPlan, isLoading } = trpc.admin.getFloorPlan.useQuery(
    { includeTestAccounts }
  );
  const [selectedDay, setSelectedDay] = useState(0); // 0 = Day 1, 1 = Day 2
  const [selectedHour, setSelectedHour] = useState(0); // 0-2 = Hour 1-3

  // Compute the two slots for the selected day + hour
  const { round1Slot, round2Slot } = useMemo(() => {
    if (!floorPlan) return { round1Slot: null, round2Slot: null };
    // Slot numbers: Day 1 = 1-6, Day 2 = 7-12; within each day: hour 1 = slots 1-2, hour 2 = 3-4, hour 3 = 5-6
    const baseSlot = selectedDay * 6 + selectedHour * 2 + 1;
    return {
      round1Slot: floorPlan.slots.find(s => s.slot === baseSlot) ?? null,
      round2Slot: floorPlan.slots.find(s => s.slot === baseSlot + 1) ?? null,
    };
  }, [floorPlan, selectedDay, selectedHour]);

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-slate-400 text-center py-8">Loading floor plan...</div>
        </CardContent>
      </Card>
    );
  }

  if (!floorPlan) return null;

  const isEmpty = floorPlan.totalMeetings === 0;

  const renderRound = (slot: typeof round1Slot, roundLabel: string) => {
    if (!slot) return null;
    const activeTables = new Set(slot.meetings.map(m => m.sponsorId)).size;
    return (
      <div className="flex-1 min-w-0">
        {/* Round header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-slate-700/60 rounded-md px-2.5 py-1">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-purple-300">{roundLabel}</span>
            <span className="text-xs text-slate-400 ml-1">{slot.time}</span>
          </div>
          <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
            {activeTables} / {floorPlan.sponsors.length} tables active
          </Badge>
        </div>

        {isEmpty ? (
          <div className="border border-dashed border-slate-600 rounded-lg p-6 text-center">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No meetings scheduled yet</p>
            <p className="text-slate-600 text-xs mt-1">Generate meetings via the Matchmaking page</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {/* Show all sponsor tables, highlight those with meetings */}
            {floorPlan.sponsors.map(sponsor => {
              const meeting = slot.meetings.find(m => m.sponsorId === sponsor.id);
              const colour = tableColour(sponsor.tableNumber);
              return (
                <div
                  key={sponsor.id}
                  className={`rounded-lg border p-2.5 transition-all ${
                    meeting
                      ? `${colour} shadow-md`
                      : "bg-slate-800/40 border-slate-700 opacity-50"
                  }`}
                >
                  {/* Table number + sponsor */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${meeting ? "text-white" : "text-slate-500"}`}>
                      T{sponsor.tableNumber}
                    </span>
                    {meeting && (
                      <span className="text-xs text-white/70 bg-black/20 rounded px-1">
                        {meeting.matchScore != null ? `${meeting.matchScore}%` : "—"}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-semibold leading-tight truncate ${meeting ? "text-white" : "text-slate-500"}`}>
                    {sponsor.companyName}
                  </p>
                  {meeting ? (
                    <div className="mt-1.5 pt-1.5 border-t border-white/20">
                      <p className="text-xs text-white/90 font-medium truncate">{meeting.attendeeName}</p>
                      {meeting.attendeeCompany && (
                        <p className="text-xs text-white/60 truncate">{meeting.attendeeCompany}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-700">
                      <p className="text-xs text-slate-600 italic">Empty</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              Meeting Floor Plan
            </CardTitle>
            <p className="text-sm text-slate-400 mt-0.5">
              {floorPlan.sponsors.length} sponsor tables · {floorPlan.totalMeetings} meetings scheduled
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Slider labels={DAY_LABELS} value={selectedDay} onChange={setSelectedDay} />
            <Slider labels={HOUR_LABELS} value={selectedHour} onChange={setSelectedHour} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Session header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-semibold text-white">
            {DAY_LABELS[selectedDay]} — {HOUR_LABELS[selectedHour]}
          </span>
          <span className="text-xs text-slate-500">
            (2 rounds × 30 min = 1 hour · up to {floorPlan.sponsors.length * 2} meetings)
          </span>
        </div>

        {/* Two rounds side by side */}
        <div className="flex flex-col lg:flex-row gap-6">
          {renderRound(round1Slot, "Round 1")}
          <div className="hidden lg:block w-px bg-slate-700" />
          {renderRound(round2Slot, "Round 2")}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-700 flex flex-wrap gap-3 items-center">
          <span className="text-xs text-slate-500 font-medium">Table colours:</span>
          {floorPlan.sponsors.slice(0, 6).map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm border ${tableColour(s.tableNumber)}`} />
              <span className="text-xs text-slate-400">T{s.tableNumber} {s.companyName}</span>
            </div>
          ))}
          {floorPlan.sponsors.length > 6 && (
            <span className="text-xs text-slate-500">+{floorPlan.sponsors.length - 6} more</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
