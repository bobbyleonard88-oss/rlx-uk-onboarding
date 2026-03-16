/**
 * RLX Event Agenda - Official Programme
 * RLUK Exchange 2026 at The Grove Hotel Spa & Golf, Hertfordshire, UK
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Calendar, Clock, MapPin, Utensils, Users, Mic, Coffee, Star, Sun } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionType = "meeting" | "session" | "meal" | "social" | "break" | "keynote" | "arrival" | "wellness";

interface SingleItem {
  kind: "single";
  time?: string;
  title: string;
  format?: string;
  type: SessionType;
  highlight?: boolean;
}

/** Two sessions running at the same time — meetings on left, parallel session on right */
interface ConcurrentItem {
  kind: "concurrent";
  time: string;
  left: {
    title: string;
    type: SessionType;
  };
  right: {
    title: string;
    format: string;
    type: SessionType;
  };
}

type AgendaItem = SingleItem | ConcurrentItem;

interface DayAgenda {
  day: string;
  date: string;
  subtitle: string;
  items: AgendaItem[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const typeConfig: Record<SessionType, { icon: React.ElementType; color: string; bg: string }> = {
  arrival:  { icon: MapPin,   color: "text-accent",        bg: "bg-accent/10 border-accent/30" },
  meal:     { icon: Utensils, color: "text-amber-400",     bg: "bg-amber-400/10 border-amber-400/30" },
  social:   { icon: Users,    color: "text-purple-400",    bg: "bg-purple-400/10 border-purple-400/30" },
  break:    { icon: Coffee,   color: "text-slate-400",     bg: "bg-slate-400/10 border-slate-400/30" },
  session:  { icon: Mic,      color: "text-blue-400",      bg: "bg-blue-400/10 border-blue-400/30" },
  keynote:  { icon: Star,     color: "text-yellow-400",    bg: "bg-yellow-400/10 border-yellow-400/30" },
  meeting:  { icon: Clock,    color: "text-emerald-400",   bg: "bg-emerald-400/10 border-emerald-400/30" },
  wellness: { icon: Sun,      color: "text-rose-400",      bg: "bg-rose-400/10 border-rose-400/30" },
};

// ─── Agenda Data ──────────────────────────────────────────────────────────────

const agenda: DayAgenda[] = [
  {
    day: "Day 1",
    date: "Tuesday, 24th March 2026",
    subtitle: "Arrival & Welcome Evening",
    items: [
      { kind: "single", time: "15:00",  title: "Arrival & Check In",                        type: "arrival" },
      { kind: "single", time: "18:00",  title: "Welcome Drinks and Icebreaker Activity",     type: "social",  highlight: true },
      { kind: "single", time: "19:30",  title: "Welcome Dinner",                             type: "meal",    highlight: true },
    ],
  },
  {
    day: "Day 2",
    date: "Wednesday, 25th March 2026",
    subtitle: "Full Meeting Day",
    items: [
      { kind: "single", title: "Morning Wellness Session & Hotel Breakfast",                  type: "wellness" },
      { kind: "single", time: "08:45–09:15", title: "Host Welcome & Introductions",           type: "keynote" },
      {
        kind: "single",
        time: "09:15–10:00",
        title: "The TA Funnel Clinic: High Volume, Screening Risk & Sourcing That Actually Converts",
        format: "Panel Discussion",
        type: "session",
        highlight: true,
      },
      { kind: "single", title: "Morning Break", type: "break" },
      {
        kind: "concurrent",
        time: "10:15–11:15",
        left:  { title: "1:1 Meetings Hour",                                                  type: "meeting" },
        right: { title: "The AI Toolbox: Tips, Tricks & Real Use Cases",  format: "Peer-to-peer show and tell", type: "session" },
      },
      {
        kind: "single",
        time: "11:15–12:15",
        title: "The New Recruiter Blueprint: Skills, Influence & Operating Model Reset",
        format: "Leader-led Workshop",
        type: "session",
        highlight: true,
      },
      { kind: "single", title: "Lunch Break", type: "meal" },
      {
        kind: "concurrent",
        time: "13:30–14:30",
        left:  { title: "1:1 Meetings Hour",                                                  type: "meeting" },
        right: { title: "Tech Stack Reckoning: Simplify, Integrate or Start Again?", format: "Peer-to-peer roundtable", type: "session" },
      },
      { kind: "single", title: "Afternoon Break", type: "break" },
      {
        kind: "concurrent",
        time: "14:45–15:45",
        left:  { title: "1:1 Meetings Hour",                                                  type: "meeting" },
        right: { title: "Signal Over Noise: Hiring Quality in a High-Volume, AI-Accelerated World", format: "Peer-to-peer roundtable", type: "session" },
      },
      { kind: "single", time: "15:45–17:00", title: "Experiential Sessions & Networking",    type: "social" },
      { kind: "single", time: "18:30–23:00", title: "Gala Dinner",                           type: "meal", highlight: true },
    ],
  },
  {
    day: "Day 3",
    date: "Thursday, 26th March 2026",
    subtitle: "Final Meeting Day",
    items: [
      { kind: "single", title: "Morning Wellness Session & Hotel Breakfast",                  type: "wellness" },
      { kind: "single", time: "09:00–09:15", title: "Host Welcome & Introductions",           type: "keynote" },
      {
        kind: "concurrent",
        time: "09:15–10:15",
        left:  { title: "1:1 Meetings",                                                       type: "meeting" },
        right: { title: "Shared Challenges Workshop Hour", format: "Peer-to-peer workshop",   type: "session" },
      },
      { kind: "single", title: "Morning Break", type: "break" },
      {
        kind: "concurrent",
        time: "10:30–11:30",
        left:  { title: "1:1 Meetings",                                                       type: "meeting" },
        right: { title: "From Reactive TA to Workforce Strategist: Skills, Mobility & Org Redesign", format: "Peer-to-peer roundtable", type: "session" },
      },
      {
        kind: "single",
        time: "11:30–12:15",
        title: "AI Is Hiring. Legal Is Panicking. TA Is Stuck in the Middle.",
        format: "Fireside Chat",
        type: "session",
        highlight: true,
      },
      { kind: "single", title: "Lunch Break", type: "meal" },
      {
        kind: "concurrent",
        time: "13:30–14:30",
        left:  { title: "1:1 Meetings",                                                       type: "meeting" },
        right: { title: "Employer Value Under Pressure: Brand, Early Careers & Candidate Experience", format: "Peer-to-peer roundtable", type: "session" },
      },
      { kind: "single", title: "Afternoon Break", type: "break" },
      {
        kind: "single",
        time: "14:45–15:30",
        title: "The Recruiter Adoption Playbook",
        format: "Leader-led Workshop",
        type: "session",
      },
      {
        kind: "single",
        time: "15:30–16:00",
        title: "Empathetic Resilience: Sustaining Performance Without Burning Out the System",
        format: "Keynote Presentation",
        type: "keynote",
        highlight: true,
      },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: SessionType }) {
  const cfg = typeConfig[type];
  const Icon = cfg.icon;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0 ${cfg.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
    </div>
  );
}

function SingleRow({ item, index }: { item: SingleItem; index: number }) {
  const cfg = typeConfig[item.type];

  // Compact divider for breaks / wellness with no time
  if (!item.time && (item.type === "break" || item.type === "wellness" || item.type === "meal")) {
    return (
      <AnimatedSection delay={index * 35}>
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-md border my-1 ${cfg.bg}`}>
          <cfg.icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
          <span className={`text-xs font-semibold uppercase tracking-widest ${cfg.color}`}>{item.title}</span>
        </div>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection delay={index * 35}>
      <div className={`flex gap-4 p-4 rounded-lg border transition-all ${
        item.highlight
          ? "bg-gradient-to-r from-primary/10 to-accent/5 border-accent/30"
          : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/70"
      }`}>
        {/* Time */}
        <div className="flex-shrink-0 w-28 text-right pt-0.5">
          {item.time && <span className="text-sm font-mono font-medium text-accent/90">{item.time}</span>}
        </div>
        {/* Icon */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <TypeBadge type={item.type} />
          <div className="w-px flex-1 bg-slate-700/50 min-h-[8px]" />
        </div>
        {/* Content */}
        <div className="flex-1 pb-1">
          <h4 className={`font-heading font-semibold text-sm leading-snug mb-0.5 ${item.highlight ? "text-white" : "text-slate-200"}`}>
            {item.title}
          </h4>
          {item.format && <span className={`text-xs italic ${cfg.color} opacity-80`}>{item.format}</span>}
        </div>
      </div>
    </AnimatedSection>
  );
}

function ConcurrentRow({ item, index }: { item: ConcurrentItem; index: number }) {
  const leftCfg  = typeConfig[item.left.type];
  const rightCfg = typeConfig[item.right.type];

  return (
    <AnimatedSection delay={index * 35}>
      <div className="rounded-lg border border-accent/20 overflow-hidden">
        {/* Time header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-b border-accent/20">
          <Clock className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span className="text-sm font-mono font-semibold text-accent">{item.time}</span>
          <span className="text-xs text-slate-400 ml-1">— concurrent sessions</span>
        </div>

        {/* Two-column tracks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-700/50">
          {/* Left — 1:1 Meetings */}
          <div className={`flex items-start gap-3 p-4 ${leftCfg.bg}`}>
            <TypeBadge type={item.left.type} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Track A</p>
              <h4 className={`font-heading font-bold text-sm text-white leading-snug`}>{item.left.title}</h4>
            </div>
          </div>

          {/* Right — Parallel session */}
          <div className="flex items-start gap-3 p-4 bg-slate-800/40">
            <TypeBadge type={item.right.type} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Track B</p>
              <h4 className={`font-heading font-semibold text-sm text-slate-200 leading-snug mb-0.5`}>{item.right.title}</h4>
              <span className={`text-xs italic ${rightCfg.color} opacity-80`}>{item.right.format}</span>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventAgenda() {
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-5xl">
        {/* Header */}
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-4">Event Agenda</h1>
            <div className="gold-divider max-w-md mx-auto mb-8" />
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Official programme for the RLUK Exchange 2026 at The Grove Hotel Spa &amp; Golf, Hertfordshire.
              Final topics and speakers are subject to change ahead of the event day.
            </p>
          </div>
        </AnimatedSection>

        {/* Event Summary */}
        <AnimatedSection delay={100}>
          <div className="glass-card p-8 rounded-lg mb-12 bg-gradient-to-br from-primary/20 to-accent/20 border-accent/30">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mb-3 border-2 border-accent/30">
                  <Calendar className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-heading font-bold text-foreground mb-1">24–26 March 2026</h3>
                <p className="text-muted-foreground text-sm">Arrival evening of 24 March<br />Event days 25–26 March</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mb-3 border-2 border-accent/30">
                  <MapPin className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-heading font-bold text-foreground mb-1">The Grove Hotel</h3>
                <p className="text-muted-foreground text-sm">Spa &amp; Golf, Hertfordshire, UK</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mb-3 border-2 border-accent/30">
                  <Clock className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-heading font-bold text-foreground mb-1">6 Meeting Blocks</h3>
                <p className="text-muted-foreground text-sm">3 per day across Days 2 &amp; 3<br />60 minutes per block</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Day-by-Day */}
        <div className="space-y-12">
          {agenda.map((day, dayIndex) => (
            <AnimatedSection key={day.day} delay={dayIndex * 80}>
              <div className="glass-card rounded-lg overflow-hidden border-slate-700/50">
                {/* Day Header */}
                <div className="bg-gradient-to-r from-primary/30 to-accent/20 border-b border-accent/30 p-6">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent/40">
                      <Sun className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-heading font-bold text-white leading-tight">{day.day}</h2>
                      <p className="text-accent text-sm font-medium">{day.date}</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mt-2 pl-[52px]">{day.subtitle}</p>
                </div>

                {/* Items */}
                <div className="p-4 space-y-2">
                  {day.items.map((item, i) =>
                    item.kind === "concurrent"
                      ? <ConcurrentRow key={i} item={item} index={i} />
                      : <SingleRow key={i} item={item} index={i} />
                  )}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Footer */}
        <AnimatedSection delay={300}>
          <div className="mt-10 p-6 glass-card rounded-lg border-slate-700/50 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed italic">
              Final topics and speakers are subject to change ahead of the event day.
              Your confirmed 1:1 meeting schedule will be shared separately via your personalised meeting schedule page.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
