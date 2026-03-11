/**
 * RLX Event Agenda - Official Programme
 * RLUK Exchange 2026 at The Grove Hotel Spa & Golf, Hertfordshire, UK
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Calendar, Clock, MapPin, Utensils, Users, Mic, Coffee, Star, Sun } from "lucide-react";

interface AgendaItem {
  time?: string;
  title: string;
  subtitle?: string;
  format?: string;
  type: "meeting" | "session" | "meal" | "social" | "break" | "keynote" | "arrival" | "wellness";
  highlight?: boolean;
}

interface DayAgenda {
  day: string;
  date: string;
  subtitle: string;
  items: AgendaItem[];
}

const typeConfig: Record<AgendaItem["type"], { icon: React.ElementType; color: string; bg: string; dot: string }> = {
  arrival:  { icon: MapPin,     color: "text-accent",          bg: "bg-accent/10 border-accent/30",          dot: "bg-accent" },
  meal:     { icon: Utensils,   color: "text-amber-400",       bg: "bg-amber-400/10 border-amber-400/30",    dot: "bg-amber-400" },
  social:   { icon: Users,      color: "text-purple-400",      bg: "bg-purple-400/10 border-purple-400/30",  dot: "bg-purple-400" },
  break:    { icon: Coffee,     color: "text-slate-400",       bg: "bg-slate-400/10 border-slate-400/30",    dot: "bg-slate-400" },
  session:  { icon: Mic,        color: "text-blue-400",        bg: "bg-blue-400/10 border-blue-400/30",      dot: "bg-blue-400" },
  keynote:  { icon: Star,       color: "text-yellow-400",      bg: "bg-yellow-400/10 border-yellow-400/30",  dot: "bg-yellow-400" },
  meeting:  { icon: Clock,      color: "text-emerald-400",     bg: "bg-emerald-400/10 border-emerald-400/30", dot: "bg-emerald-400" },
  wellness: { icon: Sun,        color: "text-rose-400",        bg: "bg-rose-400/10 border-rose-400/30",      dot: "bg-rose-400" },
};

const agenda: DayAgenda[] = [
  {
    day: "Day 1",
    date: "Tuesday, 24th March 2026",
    subtitle: "Arrival & Welcome Evening",
    items: [
      {
        time: "15:00",
        title: "Arrival & Check In",
        type: "arrival",
      },
      {
        time: "18:00",
        title: "Welcome Drinks and Icebreaker Activity",
        type: "social",
        highlight: true,
      },
      {
        time: "19:30",
        title: "Welcome Dinner",
        type: "meal",
        highlight: true,
      },
    ],
  },
  {
    day: "Day 2",
    date: "Wednesday, 25th March 2026",
    subtitle: "Full Meeting Day",
    items: [
      {
        title: "Morning Wellness Session & Hotel Breakfast",
        type: "wellness",
      },
      {
        time: "08:45–09:15",
        title: "Host Welcome & Introductions",
        type: "keynote",
      },
      {
        time: "09:15–10:00",
        title: "The TA Funnel Clinic: High Volume, Screening Risk & Sourcing That Actually Converts",
        format: "Panel Discussion",
        type: "session",
        highlight: true,
      },
      {
        title: "Morning Break",
        type: "break",
      },
      {
        time: "10:15–11:15",
        title: "1:1 Meetings Hour",
        subtitle: "The AI Toolbox: Tips, Tricks & Real Use Cases",
        format: "Peer-to-peer show and tell",
        type: "meeting",
        highlight: true,
      },
      {
        time: "11:15–12:15",
        title: "The New Recruiter Blueprint: Skills, Influence & Operating Model Reset",
        format: "Leader-led Workshop",
        type: "session",
        highlight: true,
      },
      {
        title: "Lunch Break",
        type: "meal",
      },
      {
        time: "13:30–14:30",
        title: "1:1 Meetings Hour",
        subtitle: "Tech Stack Reckoning: Simplify, Integrate or Start Again?",
        format: "Peer-to-peer roundtable",
        type: "meeting",
        highlight: true,
      },
      {
        title: "Afternoon Break",
        type: "break",
      },
      {
        time: "14:45–15:45",
        title: "1:1 Meetings Hour",
        subtitle: "Signal Over Noise: Hiring Quality in a High-Volume, AI-Accelerated World",
        format: "Peer-to-peer roundtable",
        type: "meeting",
        highlight: true,
      },
      {
        time: "15:45–17:00",
        title: "Experiential Sessions & Networking",
        type: "social",
      },
      {
        time: "18:30–23:00",
        title: "Gala Dinner",
        type: "meal",
        highlight: true,
      },
    ],
  },
  {
    day: "Day 3",
    date: "Thursday, 26th March 2026",
    subtitle: "Final Meeting Day",
    items: [
      {
        title: "Morning Wellness Session & Hotel Breakfast",
        type: "wellness",
      },
      {
        time: "09:00–09:15",
        title: "Host Welcome & Introductions",
        type: "keynote",
      },
      {
        time: "09:15–10:15",
        title: "1:1 Meetings",
        subtitle: "Shared Challenges Workshop Hour",
        type: "meeting",
        highlight: true,
      },
      {
        title: "Morning Break",
        type: "break",
      },
      {
        time: "10:30–11:30",
        title: "1:1 Meetings",
        subtitle: "From Reactive TA to Workforce Strategist: Skills, Mobility & Org Redesign",
        format: "Peer-to-peer roundtable",
        type: "meeting",
        highlight: true,
      },
      {
        time: "11:30–12:15",
        title: "AI Is Hiring. Legal Is Panicking. TA Is Stuck in the Middle.",
        format: "Fireside Chat",
        type: "session",
        highlight: true,
      },
      {
        title: "Lunch Break",
        type: "meal",
      },
      {
        time: "13:30–14:30",
        title: "1:1 Meetings",
        subtitle: "Employer Value Under Pressure: Brand, Early Careers & Candidate Experience",
        format: "Peer-to-peer roundtable",
        type: "meeting",
        highlight: true,
      },
      {
        title: "Afternoon Break",
        type: "break",
      },
      {
        time: "14:45–15:30",
        title: "The Recruiter Adoption Playbook",
        format: "Leader-led Workshop",
        type: "session",
      },
      {
        time: "15:30–16:00",
        title: "Empathetic Resilience: Sustaining Performance Without Burning Out the System",
        format: "Keynote Presentation",
        type: "keynote",
        highlight: true,
      },
    ],
  },
];

function AgendaItemRow({ item, index }: { item: AgendaItem; index: number }) {
  const config = typeConfig[item.type];
  const Icon = config.icon;

  const isBreak = item.type === "break" || item.type === "meal" && !item.time;
  const isWellness = item.type === "wellness";

  if (isWellness || (isBreak && !item.time)) {
    // Render as a compact divider-style row
    return (
      <AnimatedSection delay={index * 35}>
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-md border ${config.bg} my-1`}>
          <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
          <span className={`text-xs font-semibold uppercase tracking-widest ${config.color}`}>{item.title}</span>
        </div>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection delay={index * 35}>
      <div
        className={`flex gap-4 p-4 rounded-lg border transition-all ${
          item.highlight
            ? "bg-gradient-to-r from-primary/10 to-accent/5 border-accent/30"
            : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/70"
        }`}
      >
        {/* Time */}
        <div className="flex-shrink-0 w-28 text-right pt-0.5">
          {item.time && (
            <span className="text-sm font-mono font-medium text-accent/90 leading-tight">{item.time}</span>
          )}
        </div>

        {/* Icon column */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${config.bg}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="w-px flex-1 bg-slate-700/50 min-h-[8px]" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-1">
          <h4
            className={`font-heading font-semibold text-sm leading-snug mb-0.5 ${
              item.highlight ? "text-white" : "text-slate-200"
            }`}
          >
            {item.title}
          </h4>
          {item.subtitle && (
            <p className="text-slate-300 text-xs leading-relaxed mb-0.5">{item.subtitle}</p>
          )}
          {item.format && (
            <span className={`text-xs italic ${config.color} opacity-80`}>{item.format}</span>
          )}
        </div>
      </div>
    </AnimatedSection>
  );
}

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

        {/* Event Summary Card */}
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

        {/* Legend */}
        <AnimatedSection delay={150}>
          <div className="glass-card p-4 rounded-lg mb-10 border-slate-700/50">
            <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">Session Types</p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["meeting",  "1:1 Meetings"],
                  ["session",  "Session / Workshop"],
                  ["keynote",  "Keynote / Welcome"],
                  ["meal",     "Meals"],
                  ["social",   "Social / Networking"],
                  ["wellness", "Wellness & Breakfast"],
                  ["break",    "Break"],
                  ["arrival",  "Arrival / Departure"],
                ] as [AgendaItem["type"], string][]
              ).map(([type, label]) => {
                const cfg = typeConfig[type];
                const Icon = cfg.icon;
                return (
                  <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${cfg.bg}`}>
                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                    <span className={cfg.color}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedSection>

        {/* Day-by-Day Agenda */}
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

                {/* Agenda Items */}
                <div className="p-4 space-y-2">
                  {day.items.map((item, itemIndex) => (
                    <AgendaItemRow key={itemIndex} item={item} index={itemIndex} />
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Footer Note */}
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
