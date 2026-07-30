/**
 * Admin Agenda Management Page
 * Full CRUD for the event agenda. Admin pre-loads all sessions, keynotes, breaks,
 * and meeting blocks. These become the source of truth for all scheduling.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionType =
  | "arrival"
  | "keynote"
  | "session"
  | "meeting_block"
  | "meal"
  | "break"
  | "social"
  | "wellness";

const SESSION_TYPES: { value: SessionType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "arrival",       label: "Arrival",       icon: MapPin,    color: "text-accent" },
  { value: "keynote",       label: "Keynote",        icon: Star,      color: "text-yellow-400" },
  { value: "session",       label: "Session",        icon: Mic,       color: "text-blue-400" },
  { value: "meeting_block", label: "Meeting Block",  icon: Clock,     color: "text-emerald-400" },
  { value: "meal",          label: "Meal",           icon: Utensils,  color: "text-amber-400" },
  { value: "break",         label: "Break",          icon: Coffee,    color: "text-slate-400" },
  { value: "social",        label: "Social",         icon: Users,     color: "text-purple-400" },
  { value: "wellness",      label: "Wellness",       icon: Sun,       color: "text-rose-400" },
];

const typeConfig: Record<SessionType, { icon: React.ElementType; color: string; bg: string }> = {
  arrival:       { icon: MapPin,    color: "text-accent",        bg: "bg-accent/10 border-accent/30" },
  meal:          { icon: Utensils,  color: "text-amber-400",     bg: "bg-amber-400/10 border-amber-400/30" },
  social:        { icon: Users,     color: "text-purple-400",    bg: "bg-purple-400/10 border-purple-400/30" },
  break:         { icon: Coffee,    color: "text-slate-400",     bg: "bg-slate-400/10 border-slate-400/30" },
  session:       { icon: Mic,       color: "text-blue-400",      bg: "bg-blue-400/10 border-blue-400/30" },
  keynote:       { icon: Star,      color: "text-yellow-400",    bg: "bg-yellow-400/10 border-yellow-400/30" },
  meeting_block: { icon: Clock,     color: "text-emerald-400",   bg: "bg-emerald-400/10 border-emerald-400/30" },
  wellness:      { icon: Sun,       color: "text-rose-400",      bg: "bg-rose-400/10 border-rose-400/30" },
};

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const sessionSchema = z.object({
  dayNumber: z.number().min(1),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  room: z.string().optional(),
  format: z.string().optional(),
  sessionType: z.enum([
    "arrival", "keynote", "session", "meeting_block", "meal", "break", "social", "wellness",
  ]),
  isOptional: z.boolean().optional().default(false),
  isHighlight: z.boolean().optional().default(false),
  meetingSlotNumber: z.number().optional(),
  sortOrder: z.number().optional().default(0),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

// ─── Session Form ─────────────────────────────────────────────────────────────

function SessionForm({
  eventId,
  defaultValues,
  sessionId,
  onSuccess,
  onCancel,
}: {
  eventId: number;
  defaultValues?: Partial<SessionFormValues>;
  sessionId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createSession = trpc.event.createSession.useMutation({
    onSuccess: () => { toast.success("Session added"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const updateSession = trpc.event.updateSession.useMutation({
    onSuccess: () => { toast.success("Session updated"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SessionFormValues, any, SessionFormValues>({
    resolver: zodResolver(sessionSchema) as any,
    defaultValues: defaultValues ?? {
      dayNumber: 1,
      startTime: "",
      endTime: "",
      title: "",
      description: "",
      room: "",
      format: "",
      sessionType: "session",
      isOptional: false,
      isHighlight: false,
      meetingSlotNumber: undefined,
      sortOrder: 0,
    },
  });

  const sessionType = watch("sessionType");
  const isOptional = watch("isOptional");
  const isHighlight = watch("isHighlight");
  const isMeetingBlock = sessionType === "meeting_block";

  const onSubmit = (data: SessionFormValues) => {
    if (sessionId) {
      updateSession.mutate({ id: sessionId, ...data, meetingSlotNumber: data.meetingSlotNumber ?? undefined });
    } else {
      createSession.mutate({ eventId, ...data, meetingSlotNumber: data.meetingSlotNumber ?? undefined });
    }
  };

  const inputClass = "bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Day */}
        <div>
          <Label className="text-xs font-medium text-slate-300">Day *</Label>
          <Input type="number" min={1} {...register("dayNumber", { valueAsNumber: true })} className={`mt-1 ${inputClass}`} />
          {errors.dayNumber && <p className="mt-0.5 text-xs text-red-400">{errors.dayNumber.message}</p>}
        </div>
        {/* Start Time */}
        <div>
          <Label className="text-xs font-medium text-slate-300">Start *</Label>
          <Input type="time" {...register("startTime")} className={`mt-1 ${inputClass}`} />
          {errors.startTime && <p className="mt-0.5 text-xs text-red-400">{errors.startTime.message}</p>}
        </div>
        {/* End Time */}
        <div>
          <Label className="text-xs font-medium text-slate-300">End *</Label>
          <Input type="time" {...register("endTime")} className={`mt-1 ${inputClass}`} />
          {errors.endTime && <p className="mt-0.5 text-xs text-red-400">{errors.endTime.message}</p>}
        </div>
        {/* Sort Order */}
        <div>
          <Label className="text-xs font-medium text-slate-300">Sort Order</Label>
          <Input type="number" {...register("sortOrder", { valueAsNumber: true })} className={`mt-1 ${inputClass}`} />
        </div>
      </div>

      {/* Title */}
      <div>
        <Label className="text-xs font-medium text-slate-300">Title *</Label>
        <Input {...register("title")} placeholder="Session title" className={`mt-1 ${inputClass}`} />
        {errors.title && <p className="mt-0.5 text-xs text-red-400">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Session Type */}
        <div>
          <Label className="text-xs font-medium text-slate-300">Type *</Label>
          <Select
            value={sessionType}
            onValueChange={(v) => setValue("sessionType", v as SessionType)}
          >
            <SelectTrigger className={`mt-1 ${inputClass}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {SESSION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-white hover:bg-slate-700">
                  <span className={`font-medium ${t.color}`}>{t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Format */}
        <div>
          <Label className="text-xs font-medium text-slate-300">Format</Label>
          <Input
            {...register("format")}
            placeholder="e.g. Panel Discussion"
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Room */}
        <div>
          <Label className="text-xs font-medium text-slate-300">Room</Label>
          <Input {...register("room")} placeholder="e.g. Ivory Suite" className={`mt-1 ${inputClass}`} />
        </div>
        {/* Meeting Slot Number (only for meeting_block) */}
        {isMeetingBlock && (
          <div>
            <Label className="text-xs font-medium text-slate-300">Meeting Slot #</Label>
            <Input
              type="number"
              {...register("meetingSlotNumber", { valueAsNumber: true })}
              placeholder="1"
              className={`mt-1 ${inputClass}`}
            />
            <p className="mt-0.5 text-xs text-slate-500">Unique slot number used for meeting assignment</p>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <Label className="text-xs font-medium text-slate-300">Description</Label>
        <Textarea
          {...register("description")}
          placeholder="Optional description or speaker details"
          rows={2}
          className={`mt-1 ${inputClass} resize-none`}
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={isOptional}
            onCheckedChange={(v) => setValue("isOptional", v)}
            className="data-[state=checked]:bg-purple-600"
          />
          <Label className="text-sm text-slate-300 cursor-pointer">Delegates can opt in</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={isHighlight}
            onCheckedChange={(v) => setValue("isHighlight", v)}
            className="data-[state=checked]:bg-amber-500"
          />
          <Label className="text-sm text-slate-300 cursor-pointer">Highlight session</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-slate-600 text-slate-300 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createSession.isPending || updateSession.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
        >
          {sessionId ? "Save Changes" : "Add Session"}
        </Button>
      </div>
    </form>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  eventId,
  onRefetch,
}: {
  session: any;
  eventId: number;
  onRefetch: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const deleteSession = trpc.event.deleteSession.useMutation({
    onSuccess: () => { toast.success("Session removed"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });

  const cfg = typeConfig[session.sessionType as SessionType] ?? typeConfig.session;
  const Icon = cfg.icon;

  if (editing) {
    return (
      <div className="p-4 rounded-lg border border-purple-500/30 bg-slate-800/30">
        <SessionForm
          eventId={eventId}
          sessionId={session.id}
          defaultValues={{
            dayNumber: session.dayNumber,
            startTime: session.startTime,
            endTime: session.endTime,
            title: session.title,
            description: session.description ?? "",
            room: session.room ?? "",
            format: session.format ?? "",
            sessionType: session.sessionType,
            isOptional: session.isOptional === 1,
            isHighlight: session.isHighlight === 1,
            meetingSlotNumber: session.meetingSlotNumber,
            sortOrder: session.sortOrder,
          }}
          onSuccess={() => { setEditing(false); onRefetch(); }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:border-slate-600 ${
        session.isHighlight === 1 ? "border-amber-500/30 bg-amber-500/5" : "border-slate-700/50 bg-slate-800/20"
      }`}
    >
      {/* Icon */}
      <div className={`mt-0.5 p-1.5 rounded-md border ${cfg.bg} shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{session.title}</span>
          {session.isHighlight === 1 && (
            <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30 px-1.5 py-0">
              Highlight
            </Badge>
          )}
          {session.isOptional === 1 && (
            <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30 px-1.5 py-0">
              Optional
            </Badge>
          )}
          {session.sessionType === "meeting_block" && session.meetingSlotNumber && (
            <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-1.5 py-0">
              Slot {session.meetingSlotNumber}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
          <span>{session.startTime} – {session.endTime}</span>
          {session.room && <span>{session.room}</span>}
          {session.format && <span>{session.format}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm("Remove this session from the agenda?")) {
              deleteSession.mutate({ id: session.id });
            }
          }}
          className="w-7 h-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Day Group ────────────────────────────────────────────────────────────────

function DayGroup({
  dayNumber,
  sessions,
  eventId,
  onRefetch,
}: {
  dayNumber: number;
  sessions: any[];
  eventId: number;
  onRefetch: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addingSession, setAddingSession] = useState(false);

  return (
    <div className="space-y-2">
      {/* Day Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          Day {dayNumber}
          <span className="text-xs font-normal text-slate-500">({sessions.length} sessions)</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddingSession(!addingSession)}
          className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 px-2"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Session
        </Button>
      </div>

      {/* Add Session Form */}
      {addingSession && (
        <div className="p-4 rounded-lg border border-purple-500/30 bg-slate-800/30">
          <SessionForm
            eventId={eventId}
            defaultValues={{ dayNumber, sortOrder: sessions.length }}
            onSuccess={() => { setAddingSession(false); onRefetch(); }}
            onCancel={() => setAddingSession(false)}
          />
        </div>
      )}

      {/* Sessions */}
      {!collapsed && (
        <div className="space-y-1.5 pl-2 border-l border-slate-700/50">
          {sessions.length === 0 && !addingSession && (
            <p className="text-xs text-slate-600 py-2 pl-2">No sessions yet for Day {dayNumber}.</p>
          )}
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} eventId={eventId} onRefetch={onRefetch} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAgenda() {
  const { data: activeEvent } = trpc.event.getActive.useQuery();
  const { data: allEvents } = trpc.event.getAll.useQuery();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const eventId = selectedEventId ?? activeEvent?.id ?? null;
  const { data: sessions, refetch } = trpc.event.getSessions.useQuery(
    { eventId: eventId ?? undefined },
    { enabled: eventId !== null }
  );

  // Group sessions by day
  const sessionsByDay = (sessions ?? []).reduce<Record<number, any[]>>((acc, s) => {
    if (!acc[s.dayNumber]) acc[s.dayNumber] = [];
    acc[s.dayNumber].push(s);
    return acc;
  }, {});

  const dayNumbers = Object.keys(sessionsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  // Determine max day for "Add Day" button
  const maxDay = dayNumbers.length > 0 ? Math.max(...dayNumbers) : 0;

  const currentEvent = allEvents?.find((e) => e.id === eventId);

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-400" />
            Agenda Management
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Pre-load the full event programme. Sessions become the source of truth for all scheduling.
          </p>
        </div>

        {/* Event Selector */}
        {allEvents && allEvents.length > 1 && (
          <div className="flex items-center gap-3">
            <Label className="text-sm text-slate-400 shrink-0">Viewing agenda for:</Label>
            <Select
              value={String(eventId ?? "")}
              onValueChange={(v) => setSelectedEventId(Number(v))}
            >
              <SelectTrigger className="w-64 bg-slate-800/50 border-slate-600 text-white">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {allEvents.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-slate-700">
                    {e.name} {e.isActive === 1 ? "(Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* No Event Warning */}
        {!eventId && (
          <Card className="glass-card border-amber-500/30">
            <CardContent className="p-5 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300">No active event found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Go to Event Settings to create and activate an event first.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agenda Content */}
        {eventId && (
          <div className="space-y-6">
            {/* Event Info Banner */}
            {currentEvent && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-white">{currentEvent.name}</span>
                  {currentEvent.venueName && (
                    <span className="text-slate-400"> · {currentEvent.venueName}</span>
                  )}
                </div>
                {currentEvent.isActive === 1 && (
                  <Badge className="ml-auto text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                    Active
                  </Badge>
                )}
              </div>
            )}

            {/* Day Groups */}
            {dayNumbers.length > 0 ? (
              <div className="space-y-6">
                {dayNumbers.map((day) => (
                  <DayGroup
                    key={day}
                    dayNumber={day}
                    sessions={sessionsByDay[day]}
                    eventId={eventId}
                    onRefetch={refetch}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-400 mb-1">No Sessions Yet</h3>
                <p className="text-sm text-slate-500">
                  Start building the agenda by adding sessions below.
                </p>
              </div>
            )}

            {/* Add New Day */}
            <Separator className="border-slate-700" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {sessions?.length ?? 0} sessions across {dayNumbers.length} day{dayNumbers.length !== 1 ? "s" : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Add a placeholder session for the next day to create the day group
                  // The user will fill in the details
                  const nextDay = maxDay + 1;
                  toast.info(`Use "Add Session" on Day ${nextDay} to begin building that day's programme.`);
                }}
                className="border-slate-600 text-slate-300 hover:text-white hover:border-purple-500 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Day {maxDay + 1}
              </Button>
            </div>

            {/* Quick Add for new day */}
            <DayGroup
              key={`new-day-${maxDay + 1}`}
              dayNumber={maxDay + 1}
              sessions={[]}
              eventId={eventId}
              onRefetch={refetch}
            />
          </div>
        )}
      </div>
    </div>
  );
}
