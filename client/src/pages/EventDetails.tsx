import { MapPin, Clock, Calendar, Car, Train, Building2, Users, ChevronRight } from "lucide-react";

const AGENDA = [
  {
    day: "Wednesday 25 March 2026",
    date: "Day 1",
    items: [
      { time: "09:00", label: "Registration & Breakfast", type: "break" },
      { time: "09:45", label: "Welcome & Opening Remarks", type: "session" },
      { time: "10:15–11:15", label: "New Recruiter Workshop", room: "Ivory Suite", type: "workshop" },
      { time: "10:15–11:15", label: "1:1 Meetings — Slots 1 & 2", room: "Ivory Suite", type: "meetings" },
      { time: "11:15–12:00", label: "Networking & Refreshments", type: "break" },
      { time: "12:00–13:00", label: "Keynote & Panel Session", type: "session" },
      { time: "13:00–13:30", label: "Lunch", type: "break" },
      { time: "13:30–14:30", label: "Tech Stack Workshop", room: "Ivory Suite", type: "workshop" },
      { time: "13:30–15:45", label: "1:1 Meetings — Slots 3–6", room: "Ivory Suite", type: "meetings" },
      { time: "15:45–17:00", label: "Roundtable Discussions", type: "session" },
      { time: "17:00–19:00", label: "Drinks Reception", type: "break" },
      { time: "19:30", label: "Gala Dinner", type: "break" },
    ],
  },
  {
    day: "Thursday 26 March 2026",
    date: "Day 2",
    items: [
      { time: "08:00–09:00", label: "Breakfast", type: "break" },
      { time: "09:00–09:30", label: "Day 2 Opening & Recap", type: "session" },
      { time: "09:30–10:15", label: "Morning Keynote", type: "session" },
      { time: "10:30–11:30", label: "Roundtable: Talent Acquisition Trends", room: "Ivory Suite", type: "workshop" },
      { time: "10:30–11:30", label: "1:1 Meetings — Slots 7 & 8", room: "Ivory Suite", type: "meetings" },
      { time: "11:30–12:00", label: "Networking Break", type: "break" },
      { time: "12:00–13:00", label: "Lunch", type: "break" },
      { time: "13:15–14:15", label: "Roundtable: Employer Brand", room: "Ivory Suite", type: "workshop" },
      { time: "13:15–14:15", label: "1:1 Meetings — Slots 9 & 10", room: "Ivory Suite", type: "meetings" },
      { time: "14:30–15:30", label: "Recruiter Adoption Workshop", room: "Ivory Suite", type: "workshop" },
      { time: "14:30–15:30", label: "1:1 Meetings — Slots 11 & 12", room: "Ivory Suite", type: "meetings" },
      { time: "15:30–16:00", label: "Closing Remarks & Wrap-Up", type: "session" },
    ],
  },
];

const typeStyles: Record<string, string> = {
  meetings: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  workshop: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  session: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  break: "bg-white/5 text-white/50 border-white/10",
};

const typeLabels: Record<string, string> = {
  meetings: "1:1 Meetings",
  workshop: "Workshop / Roundtable",
  session: "Plenary Session",
  break: "Break / Social",
};

export default function EventDetails() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-10 max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white mb-1">Event Details</h1>
        <p className="text-white/60 text-sm">Everything you need to know about RLX UK 2026</p>
      </div>

      {/* Venue Card */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-heading font-semibold text-white">Venue</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">The Grove</p>
                <p className="text-white/60 text-sm">Chandler's Cross</p>
                <p className="text-white/60 text-sm">Hertfordshire, WD3 4TG</p>
                <p className="text-white/60 text-sm">United Kingdom</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Building2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Conference Room</p>
                <p className="text-white/60 text-sm">Ivory Suite</p>
                <p className="text-white/50 text-xs mt-1">All 1:1 meetings and workshops are held in the Ivory Suite</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Dates</p>
                <p className="text-white/60 text-sm">Wednesday 25 – Thursday 26 March 2026</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Registration</p>
                <p className="text-white/60 text-sm">Wednesday 25 March from 09:00</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Format</p>
                <p className="text-white/60 text-sm">Residential — overnight stay included</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting There */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Car className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-heading font-semibold text-white">Getting There</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex gap-3">
              <Car className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white/80 text-sm font-medium">By Car</p>
                <p className="text-white/50 text-sm">M25 Junction 19 — approximately 2 minutes from the motorway. Free parking on site.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-3">
              <Train className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white/80 text-sm font-medium">By Train</p>
                <p className="text-white/50 text-sm">Watford Junction (15 min taxi). London Euston to Watford Junction is approximately 20 minutes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agenda */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-heading font-semibold text-white">Agenda</h2>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeLabels).map(([type, label]) => (
            <span key={type} className={`text-xs px-2.5 py-1 rounded-full border ${typeStyles[type]}`}>
              {label}
            </span>
          ))}
        </div>

        {AGENDA.map((day) => (
          <div key={day.day} className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">{day.date}</p>
                <h3 className="text-white font-heading font-semibold">{day.day}</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
            <div className="divide-y divide-white/5">
              {day.items.map((item, i) => (
                <div key={i} className={`px-6 py-3 flex items-start gap-4 ${item.type === "break" ? "opacity-60" : ""}`}>
                  <span className="text-white/50 text-xs font-mono w-28 flex-shrink-0 mt-0.5">{item.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-medium">{item.label}</p>
                    {item.room && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-purple-400" />
                        <span className="text-purple-300 text-xs">{item.room}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${typeStyles[item.type]}`}>
                    {typeLabels[item.type]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-white/30 text-xs text-center pb-6">
        Agenda is subject to minor changes. Your meeting schedule is confirmed in the Meeting Schedule tab.
      </p>
    </div>
  );
}
