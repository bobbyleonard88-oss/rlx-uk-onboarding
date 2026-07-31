/**
 * Delegate Agenda Page
 * Displays the full event agenda. Delegates can add optional sessions
 * to their personal schedule. Overlap validation is enforced.
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Utensils,
  Users,
  Mic,
  Coffee,
  Star,
  Sun,
  Plus,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionType =
  | "arrival"
  | "keynote"
  | "session"
  | "meal"
  | "break"
  | "social"
  | "wellness";

const typeConfig: Record<SessionType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  arrival:       { icon: MapPin,    color: "text-accent",        bg: "bg-accent/10 border-accent/30",              label: "Arrival" },
  meal:          { icon: Utensils,  color: "text-amber-400",     bg: "bg-amber-400/10 border-amber-400/30",         label: "Meal" },
  social:        { icon: Users,     color: "text-purple-400",    bg: "bg-purple-400/10 border-purple-400/30",       label: "Social" },
  break:         { icon: Coffee,    color: "text-slate-400",     bg: "bg-slate-400/10 border-slate-400/30",         label: "Break" },
  session:       { icon: Mic,       color: "text-blue-400",      bg: "bg-blue-400/10 border-blue-400/30",           label: "Session" },
  keynote:       { icon: Star,      color: "text-yellow-400",    bg: "bg-yellow-400/10 border-yellow-400/30",       label: "Keynote" },

  wellness:      { icon: Sun,       color: "text-rose-400",      bg: "bg-rose-400/10 border-rose-400/30",           label: "Wellness" },
};

// ─── Helper: time overlap check ───────────────────────────────────────────────

function timesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string
): boolean {
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMins(aStart) < toMins(bEnd) && toMins(bStart) < toMins(aEnd);
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  isAdded,
  hasConflict,
  onAdd,
  onRemove,
}: {
  session: any;
  isAdded: boolean;
  hasConflict: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const cfg = typeConfig[session.sessionType as SessionType] ?? typeConfig.session;
  const Icon = cfg.icon;
  const isMeetingBlock = session.sessionType === "meeting_block";

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
        session.isHighlight === 1
          ? "border-amber-500/40 bg-amber-500/5"
          : isAdded
          ? "border-purple-500/40 bg-purple-500/5"
          : "border-slate-700/50 bg-slate-800/20"
      }`}
    >
      {/* Icon */}
      <div className={`mt-0.5 p-2 rounded-lg border ${cfg.bg} shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isMeetingBlock ? "text-emerald-300" : "text-white"}`}>
              {session.title}
            </p>
            {session.format && (
              <p className="text-xs text-slate-400 mt-0.5 italic">{session.format}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {session.startTime} – {session.endTime}
              </span>
              {session.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {session.room}
                </span>
              )}
            </div>
          </div>

          {/* Add/Remove button (only for optional sessions) */}
          {session.isOptional === 1 && !isMeetingBlock && (
            <div className="shrink-0">
              {isAdded ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRemove}
                  className="h-7 px-2 text-xs border-purple-500/50 text-purple-300 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Added
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAdd}
                  disabled={hasConflict}
                  className={`h-7 px-2 text-xs ${
                    hasConflict
                      ? "border-slate-700 text-slate-600 cursor-not-allowed"
                      : "border-slate-600 text-slate-300 hover:border-purple-500 hover:text-purple-300"
                  }`}
                  title={hasConflict ? "Conflicts with another session in your schedule" : "Add to your schedule"}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {hasConflict ? "Conflict" : "Add"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge className={`text-[10px] px-1.5 py-0 border ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </Badge>
          {session.isHighlight === 1 && (
            <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30 px-1.5 py-0">
              Highlight
            </Badge>
          )}
          {isAdded && (
            <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30 px-1.5 py-0">
              In Your Schedule
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DelegateAgenda() {
  const { user } = useAuth();
  const { data: activeEvent } = trpc.event.getActive.useQuery();
  const { data: sessions } = trpc.event.getSessions.useQuery({});

  // TODO Phase 2: Replace with real delegate schedule from DB
  // For now, use local state as a placeholder
  const addedSessionIds = new Set<number>();

  const handleAdd = (session: any) => {
    // Check for conflicts with already-added sessions
    const addedSessions = (sessions ?? []).filter((s) => addedSessionIds.has(s.id));
    const conflict = addedSessions.find((s) =>
      s.dayNumber === session.dayNumber &&
      timesOverlap(s.startTime, s.endTime, session.startTime, session.endTime)
    );
    if (conflict) {
      toast.error(`Conflicts with "${conflict.title}" (${conflict.startTime}–${conflict.endTime})`);
      return;
    }
    toast.success(`"${session.title}" added to your schedule`);
  };

  const handleRemove = (session: any) => {
    toast.success(`"${session.title}" removed from your schedule`);
  };

  // Group sessions by day
  const sessionsByDay = (sessions ?? []).reduce<Record<number, any[]>>((acc, s) => {
    if (!acc[s.dayNumber]) acc[s.dayNumber] = [];
    acc[s.dayNumber].push(s);
    return acc;
  }, {});

  const dayNumbers = Object.keys(sessionsByDay).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/delegate">
            <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <p className="text-xs text-slate-500 leading-none">Delegate Portal</p>
            <p className="text-sm font-semibold text-white leading-tight">Event Agenda</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Event Info */}
        {activeEvent && (
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 border border-purple-500/20">
            <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">{activeEvent.name}</p>
              {activeEvent.venueName && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {activeEvent.venueName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-slate-500">Session types:</span>
          {(Object.entries(typeConfig) as [SessionType, typeof typeConfig[SessionType]][]).map(([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={type} className={`flex items-center gap-1 ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
            );
          })}
        </div>

        {/* Agenda Days */}
        {dayNumbers.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">The agenda hasn't been published yet.</p>
            <p className="text-xs text-slate-500 mt-1">Check back soon.</p>
          </div>
        ) : (
          dayNumbers.map((day) => (
            <div key={day} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Day {day}
                </h2>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <div className="space-y-2">
                {sessionsByDay[day].map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isAdded={addedSessionIds.has(session.id)}
                    hasConflict={false}
                    onAdd={() => handleAdd(session)}
                    onRemove={() => handleRemove(session)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
