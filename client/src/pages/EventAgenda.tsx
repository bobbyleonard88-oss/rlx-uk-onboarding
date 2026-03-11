/**
 * RLX Event Agenda - Full 3-Day Schedule
 * Displays the complete event programme for RLUK Exchange 2026 at The Grove
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Calendar, Clock, MapPin, Utensils, Users, Mic, Coffee, Star, Sun } from "lucide-react";

interface AgendaItem {
  time: string;
  title: string;
  description?: string;
  type: "meeting" | "session" | "meal" | "social" | "break" | "keynote" | "arrival";
  highlight?: boolean;
}

interface DayAgenda {
  day: string;
  date: string;
  subtitle: string;
  items: AgendaItem[];
}

const typeConfig: Record<AgendaItem["type"], { icon: React.ElementType; color: string; bg: string }> = {
  arrival:  { icon: MapPin,     color: "text-accent",          bg: "bg-accent/10 border-accent/30" },
  meal:     { icon: Utensils,   color: "text-amber-400",       bg: "bg-amber-400/10 border-amber-400/30" },
  social:   { icon: Users,      color: "text-purple-400",      bg: "bg-purple-400/10 border-purple-400/30" },
  break:    { icon: Coffee,     color: "text-slate-400",       bg: "bg-slate-400/10 border-slate-400/30" },
  session:  { icon: Mic,        color: "text-blue-400",        bg: "bg-blue-400/10 border-blue-400/30" },
  keynote:  { icon: Star,       color: "text-yellow-400",      bg: "bg-yellow-400/10 border-yellow-400/30" },
  meeting:  { icon: Clock,      color: "text-emerald-400",     bg: "bg-emerald-400/10 border-emerald-400/30" },
};

const agenda: DayAgenda[] = [
  {
    day: "Day 1",
    date: "Tuesday, 24th March 2026",
    subtitle: "Arrival & Welcome Evening",
    items: [
      {
        time: "From 14:00",
        title: "Arrival & Check-In",
        description: "Guests arrive at The Grove, Hertfordshire. Check in to your rooms and settle in.",
        type: "arrival",
      },
      {
        time: "17:00 – 18:30",
        title: "Welcome Drinks Reception",
        description: "Informal networking reception in the hotel grounds. Meet your fellow delegates and partners before the event begins.",
        type: "social",
        highlight: true,
      },
      {
        time: "18:30 – 19:00",
        title: "Event Welcome & Introductions",
        description: "Brief welcome from the RLX team, overview of the two-day programme, and housekeeping.",
        type: "keynote",
      },
      {
        time: "19:00 – 22:00",
        title: "Welcome Dinner",
        description: "Seated dinner for all delegates and partners. A relaxed setting to build connections ahead of the structured meeting days.",
        type: "meal",
        highlight: true,
      },
      {
        time: "22:00 onwards",
        title: "Informal Evening",
        description: "Bar and lounge available for continued networking.",
        type: "social",
      },
    ],
  },
  {
    day: "Day 2",
    date: "Wednesday, 25th March 2026",
    subtitle: "Full Meeting Day",
    items: [
      {
        time: "07:30 – 09:00",
        title: "Breakfast",
        description: "Buffet breakfast in the hotel restaurant.",
        type: "meal",
      },
      {
        time: "09:00 – 09:15",
        title: "Day 2 Welcome & Programme Overview",
        description: "Morning briefing from the RLX team. Overview of the day's schedule and meeting etiquette.",
        type: "keynote",
      },
      {
        time: "09:15 – 10:15",
        title: "Roundtable Sessions",
        description: "Facilitated peer-to-peer roundtable discussions on key themes in talent acquisition and HR technology.",
        type: "session",
      },
      {
        time: "10:15 – 11:15",
        title: "1:1 Meetings — Block 1",
        description: "First block of structured 1:1 meetings between delegates and technology partners.",
        type: "meeting",
        highlight: true,
      },
      {
        time: "11:15 – 11:30",
        title: "Refreshment Break",
        type: "break",
      },
      {
        time: "11:30 – 12:30",
        title: "Keynote Speaker",
        description: "Thought leadership session from an industry expert on the future of talent acquisition.",
        type: "keynote",
        highlight: true,
      },
      {
        time: "12:30 – 13:30",
        title: "Lunch",
        description: "Seated lunch for all attendees.",
        type: "meal",
      },
      {
        time: "13:30 – 14:30",
        title: "1:1 Meetings — Block 2",
        description: "Second block of structured 1:1 meetings.",
        type: "meeting",
        highlight: true,
      },
      {
        time: "14:30 – 14:45",
        title: "Short Break",
        type: "break",
      },
      {
        time: "14:45 – 15:45",
        title: "1:1 Meetings — Block 3",
        description: "Third and final block of Day 2 meetings.",
        type: "meeting",
        highlight: true,
      },
      {
        time: "15:45 – 16:00",
        title: "Afternoon Break",
        type: "break",
      },
      {
        time: "16:00 – 17:30",
        title: "Facilitated Workshop",
        description: "Interactive workshop session. Delegates and partners collaborate on shared challenges in talent acquisition.",
        type: "session",
      },
      {
        time: "17:30 – 18:30",
        title: "Free Time / Leisure",
        description: "Time to relax, use the hotel spa, or explore the grounds before the evening programme.",
        type: "break",
      },
      {
        time: "18:30 – 19:00",
        title: "Pre-Dinner Drinks",
        description: "Drinks reception before the gala dinner.",
        type: "social",
      },
      {
        time: "19:00 – 22:30",
        title: "Gala Dinner",
        description: "The centrepiece evening of the event. Formal dinner with entertainment, awards, and continued networking.",
        type: "meal",
        highlight: true,
      },
      {
        time: "22:30 onwards",
        title: "Evening Entertainment",
        description: "Informal bar and entertainment continues.",
        type: "social",
      },
    ],
  },
  {
    day: "Day 3",
    date: "Thursday, 26th March 2026",
    subtitle: "Final Meeting Day & Departures",
    items: [
      {
        time: "07:30 – 09:00",
        title: "Breakfast",
        description: "Buffet breakfast in the hotel restaurant.",
        type: "meal",
      },
      {
        time: "09:00 – 09:15",
        title: "Day 3 Welcome",
        description: "Brief morning briefing and recap of Day 2 highlights.",
        type: "keynote",
      },
      {
        time: "09:15 – 10:15",
        title: "1:1 Meetings — Block 4",
        description: "First meeting block of Day 3.",
        type: "meeting",
        highlight: true,
      },
      {
        time: "10:15 – 10:30",
        title: "Refreshment Break",
        type: "break",
      },
      {
        time: "10:30 – 11:30",
        title: "1:1 Meetings — Block 5",
        description: "Second meeting block of Day 3.",
        type: "meeting",
        highlight: true,
      },
      {
        time: "11:30 – 12:30",
        title: "Panel Discussion",
        description: "Closing panel with senior delegates sharing insights from the event and key takeaways for the year ahead.",
        type: "session",
      },
      {
        time: "12:30 – 13:30",
        title: "Lunch",
        description: "Final lunch together before departures begin.",
        type: "meal",
      },
      {
        time: "13:30 – 14:30",
        title: "1:1 Meetings — Block 6",
        description: "Third and final meeting block of the event.",
        type: "meeting",
        highlight: true,
      },
      {
        time: "14:30 – 15:00",
        title: "Closing Remarks & Farewell",
        description: "Closing session from the RLX team. Summary of outcomes, next steps, and thank you to all participants.",
        type: "keynote",
        highlight: true,
      },
      {
        time: "15:00 onwards",
        title: "Departures",
        description: "Guests depart at their leisure. Late checkout available on request.",
        type: "arrival",
      },
    ],
  },
];

function AgendaItemRow({ item, index }: { item: AgendaItem; index: number }) {
  const config = typeConfig[item.type];
  const Icon = config.icon;

  return (
    <AnimatedSection delay={index * 40}>
      <div
        className={`flex gap-4 p-4 rounded-lg border transition-all ${
          item.highlight
            ? "bg-gradient-to-r from-primary/10 to-accent/5 border-accent/30"
            : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/70"
        }`}
      >
        {/* Time */}
        <div className="flex-shrink-0 w-28 text-right">
          <span className="text-sm font-mono font-medium text-accent/90 leading-tight">{item.time}</span>
        </div>

        {/* Divider line */}
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
          {item.description && (
            <p className="text-slate-400 text-xs leading-relaxed">{item.description}</p>
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
              Full programme for the RLUK Exchange 2026 at The Grove, Hertfordshire.
              All times are approximate and subject to minor adjustments on the day.
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
                <h3 className="text-lg font-heading font-bold text-foreground mb-1">The Grove</h3>
                <p className="text-muted-foreground text-sm">Hertfordshire, United Kingdom</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mb-3 border-2 border-accent/30">
                  <Clock className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-heading font-bold text-foreground mb-1">6 Meeting Blocks</h3>
                <p className="text-muted-foreground text-sm">3 per day across Days 2 & 3<br />60 minutes per block</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Legend */}
        <AnimatedSection delay={150}>
          <div className="glass-card p-4 rounded-lg mb-10 border-slate-700/50">
            <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">Session Types</p>
            <div className="flex flex-wrap gap-3">
              {(Object.entries(typeConfig) as [AgendaItem["type"], typeof typeConfig[AgendaItem["type"]]][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                const labels: Record<AgendaItem["type"], string> = {
                  arrival: "Arrival / Departure",
                  meal: "Meals",
                  social: "Social / Networking",
                  break: "Break",
                  session: "Session / Workshop",
                  keynote: "Keynote / Welcome",
                  meeting: "1:1 Meetings",
                };
                return (
                  <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${cfg.bg}`}>
                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                    <span className={cfg.color}>{labels[type]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedSection>

        {/* Day-by-Day Agenda */}
        <div className="space-y-12">
          {agenda.map((day, dayIndex) => (
            <AnimatedSection key={day.day} delay={dayIndex * 100}>
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
                  <p className="text-slate-300 text-sm mt-2 ml-13 pl-[52px]">{day.subtitle}</p>
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
            <p className="text-muted-foreground text-sm leading-relaxed">
              This agenda is indicative and may be subject to minor adjustments. 
              Your confirmed 1:1 meeting schedule will be shared separately via your personalised meeting schedule page.
              For any questions about the programme, please contact the RLX team.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
