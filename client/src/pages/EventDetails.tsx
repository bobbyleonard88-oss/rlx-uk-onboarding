import { MapPin, Clock, Calendar, Car, Train, Building2, Users } from "lucide-react";


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

      {/* Footer note */}
      <p className="text-white/30 text-xs text-center pb-6">
        Full programme available in the <strong className="text-purple-300">Agenda</strong> tab. Your confirmed meeting times are in the <strong className="text-purple-300">Meeting Schedule</strong> tab.
      </p>
    </div>
  );
}
