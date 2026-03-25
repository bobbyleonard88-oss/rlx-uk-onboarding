import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Star, Calendar, Users, Table } from "lucide-react";

// Colour palette — one per table number (cycles)
const TABLE_COLOURS = [
  "bg-purple-600/80 border-purple-500",
  "bg-blue-600/80 border-blue-500",
  "bg-emerald-600/80 border-emerald-500",
  "bg-amber-600/80 border-amber-500",
  "bg-rose-600/80 border-rose-500",
  "bg-cyan-600/80 border-cyan-500",
  "bg-indigo-600/80 border-indigo-500",
  "bg-teal-600/80 border-teal-500",
  "bg-orange-600/80 border-orange-500",
  "bg-pink-600/80 border-pink-500",
  "bg-lime-600/80 border-lime-500",
  "bg-violet-600/80 border-violet-500",
];

function tableColour(tableNumber: number) {
  return TABLE_COLOURS[(tableNumber - 1) % TABLE_COLOURS.length];
}

const DAY_LABELS = ["Day 1 — Wed 26 Mar", "Day 2 — Thu 27 Mar"];
const HOUR_LABELS = ["Hour 1", "Hour 2", "Hour 3"];

// Slot → day/hour mapping
const SLOT_DAY_HOUR: Record<number, { day: number; hour: number }> = {
  1: { day: 1, hour: 1 }, 2: { day: 1, hour: 1 },
  3: { day: 1, hour: 2 }, 4: { day: 1, hour: 2 },
  5: { day: 1, hour: 3 }, 6: { day: 1, hour: 3 },
  7: { day: 2, hour: 1 }, 8: { day: 2, hour: 1 },
  9: { day: 2, hour: 2 }, 10: { day: 2, hour: 2 },
  11: { day: 2, hour: 3 }, 12: { day: 2, hour: 3 },
};

function Slider({ labels, value, onChange }: { labels: string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {labels.map((label, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
            value === i
              ? "bg-purple-600 text-white shadow"
              : "bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function TablePlan() {
  const { data: floorPlan, isLoading, error } = trpc.public.getFloorPlan.useQuery();
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(0);
  const [search, setSearch] = useState("");

  // Derive the two slot numbers for the selected day+hour
  const { round1Slot, round2Slot } = useMemo(() => {
    const day = selectedDay + 1;
    const hour = selectedHour + 1;
    const matching = Object.entries(SLOT_DAY_HOUR)
      .filter(([, v]) => v.day === day && v.hour === hour)
      .map(([k]) => Number(k))
      .sort();
    return { round1Slot: matching[0] ?? null, round2Slot: matching[1] ?? null };
  }, [selectedDay, selectedHour]);

  // Normalised search query
  const searchLower = search.trim().toLowerCase();

  // Filter meetings across all slots that match the search query
  const searchResults = useMemo(() => {
    if (!floorPlan || !searchLower) return null;
    const results: Array<{
      slot: number; time: string; label: string;
      meeting: typeof floorPlan.slots[0]["meetings"][0];
    }> = [];
    for (const slot of floorPlan.slots) {
      for (const m of slot.meetings) {
        const haystack = [
          m.attendeeName, m.attendeeCompany, m.attendeeJobTitle, m.sponsorName,
        ].join(" ").toLowerCase();
        if (haystack.includes(searchLower)) {
          results.push({ slot: slot.slot, time: slot.time, label: slot.label, meeting: m });
        }
      }
    }
    return results;
  }, [floorPlan, searchLower]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading table plan…</p>
        </div>
      </div>
    );
  }

  if (error || !floorPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-red-400">Failed to load table plan. Please try again.</p>
      </div>
    );
  }

  const renderMeetingCard = (
    sponsor: typeof floorPlan.sponsors[0],
    slot: typeof floorPlan.slots[0] | null,
    repNum: 1 | 2,
    highlight: boolean
  ) => {
    const meeting = slot?.meetings.find(
      m => m.sponsorId === sponsor.id && (m.attendeeNumber ?? 1) === repNum
    );
    const colour = tableColour(sponsor.tableNumber);
    const starred = meeting?.isStarred;

    return (
      <div
        key={`${sponsor.id}-${repNum}-${slot?.slot ?? "empty"}`}
        className={`rounded-lg border p-2.5 transition-all relative ${
          meeting
            ? `${colour} shadow-md ${highlight ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900" : ""}`
            : "bg-slate-800/40 border-slate-700 opacity-50"
        }`}
      >
        {starred && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-yellow-400 rounded-full p-0.5 shadow-lg">
              <Star className="w-3.5 h-3.5 text-yellow-900 fill-yellow-900" />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-bold ${meeting ? "text-white" : "text-slate-500"}`}>
            T{sponsor.tableNumber}
          </span>
        </div>
        <p className={`text-xs font-semibold leading-tight truncate ${meeting ? "text-white" : "text-slate-500"}`}>
          {sponsor.repLabel ?? sponsor.companyName}
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
  };

  const renderRound = (slotNum: number | null, roundLabel: string) => {
    const slot = slotNum != null ? floorPlan.slots.find(s => s.slot === slotNum) ?? null : null;
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">{roundLabel}</span>
          {slot && <span className="text-xs text-slate-500">{slot.time}</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
          {floorPlan.sponsors.map(sponsor => {
            const isRep2 = sponsor.repLabel?.endsWith("(Rep 2)");
            const repNum: 1 | 2 = isRep2 ? 2 : 1;
            return renderMeetingCard(sponsor, slot, repNum, false);
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Table className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">RLX UK — Table Plan</h1>
              <p className="text-xs text-slate-400">
                {floorPlan.sponsors.length} tables · {floorPlan.totalMeetings} meetings
              </p>
            </div>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Search person or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 bg-slate-800/60 border-slate-600 text-white placeholder:text-slate-500 text-sm h-9 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Search results */}
        {searchLower && searchResults !== null && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Search className="w-4 h-4 text-purple-400" />
                Search results
                <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs ml-1">
                  {searchResults.length} match{searchResults.length !== 1 ? "es" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchResults.length === 0 ? (
                <p className="text-slate-400 text-sm">No meetings found for "{search}".</p>
              ) : (
                <div className="space-y-2.5">
                  {searchResults.map((r, i) => (
                    <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700 overflow-hidden">
                      {/* Top bar: time + location */}
                      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-700/50 border-b border-slate-700">
                        <div className="flex items-center gap-1.5 text-sm text-slate-300">
                          <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="font-semibold">{r.time}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-300 ml-auto">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Ivory Suite</span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-sm font-bold text-white ml-1 ${tableColour(r.meeting.tableNumber)}`}>
                            Table {r.meeting.tableNumber}
                            {r.meeting.isStarred && <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />}
                          </span>
                        </div>
                      </div>
                      {/* Body: delegate ↔ sponsor */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4">
                        {/* Delegate */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Delegate</p>
                          <p className="text-white font-semibold text-base leading-tight">{r.meeting.attendeeName}</p>
                          {r.meeting.attendeeJobTitle && (
                            <p className="text-slate-400 text-sm mt-0.5">{r.meeting.attendeeJobTitle}</p>
                          )}
                          {r.meeting.attendeeCompany && (
                            <p className="text-purple-300/80 text-sm font-medium mt-0.5">{r.meeting.attendeeCompany}</p>
                          )}
                        </div>
                        {/* Divider */}
                        <div className="hidden sm:flex items-center">
                          <div className="w-px h-12 bg-slate-600" />
                        </div>
                        {/* Sponsor */}
                        <div className="flex-1 min-w-0 sm:text-right">
                          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Meeting with</p>
                          <p className="text-white font-semibold text-base">{r.meeting.sponsorName}</p>
                          {r.meeting.isStarred && (
                            <span className="inline-flex items-center gap-1 text-yellow-400 text-sm mt-0.5">
                              <Star className="w-3.5 h-3.5 fill-yellow-400" /> Rescheduled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Floor plan card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-400" />
                  Meeting Floor Plan
                </CardTitle>
                <p className="text-sm text-slate-400 mt-0.5">
                  Ivory Suite · {floorPlan.sponsors.length} tables · use the sliders to navigate sessions
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
                (2 rounds × 30 min)
              </span>
              {/* Star legend */}
              <div className="ml-auto flex items-center gap-1.5 text-xs text-yellow-400">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                <span>= Rescheduled</span>
              </div>
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
              {floorPlan.sponsors.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm border ${tableColour(s.tableNumber)}`} />
                  <span className="text-xs text-slate-400">T{s.tableNumber} {s.companyName}</span>
                </div>
              ))}
              {floorPlan.sponsors.length > 8 && (
                <span className="text-xs text-slate-500">+{floorPlan.sponsors.length - 8} more</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Full schedule list — all slots */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-purple-400" />
              Full Schedule — All Slots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2].map(day => (
              <div key={day}>
                <h3 className="text-sm font-bold text-purple-300 mb-3 uppercase tracking-wide">
                  {DAY_LABELS[day - 1]}
                </h3>
                <div className="space-y-4">
                  {floorPlan.slots
                    .filter(s => SLOT_DAY_HOUR[s.slot]?.day === day)
                    .map(slot => (
                      <div key={slot.slot}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-slate-300">{slot.time}</span>
                          <span className="text-xs text-slate-500">{slot.label}</span>
                          <span className="text-xs text-slate-600">· {slot.meetings.length} meetings</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[600px]">
                            <thead>
                              <tr className="border-b border-slate-700/60">
                                <th className="text-left text-xs text-slate-500 font-medium pb-1.5 pr-3 w-12">Table</th>
                                <th className="text-left text-xs text-slate-500 font-medium pb-1.5 pr-3">Sponsor</th>
                                <th className="text-left text-xs text-slate-500 font-medium pb-1.5 pr-3">Delegate</th>
                                <th className="text-left text-xs text-slate-500 font-medium pb-1.5 pr-3">Company</th>
                                <th className="text-left text-xs text-slate-500 font-medium pb-1.5">Job Title</th>
                              </tr>
                            </thead>
                            <tbody>
                              {slot.meetings.map((m, i) => (
                                <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-700/20 transition-colors">
                                  <td className="py-1.5 pr-3">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold text-white ${tableColour(m.tableNumber)}`}>
                                      T{m.tableNumber}
                                      {m.isStarred && <Star className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" />}
                                    </span>
                                  </td>
                                  <td className="py-1.5 pr-3 text-white font-medium text-xs">{m.sponsorName}</td>
                                  <td className="py-1.5 pr-3 text-slate-200 text-xs">{m.attendeeName}</td>
                                  <td className="py-1.5 pr-3 text-slate-300 text-xs">{m.attendeeCompany}</td>
                                  <td className="py-1.5 text-slate-400 text-xs">{m.attendeeJobTitle}</td>
                                </tr>
                              ))}
                              {slot.meetings.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-2 text-xs text-slate-600 italic">No meetings scheduled for this slot</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <div className="border-t border-slate-700/40 mt-8 py-4 text-center">
        <p className="text-xs text-slate-600">RLX UK · Ivory Suite, The Grove · Confidential</p>
      </div>
    </div>
  );
}
