import { Link, useLocation } from "wouter";
import { Calendar, FormInput, MapPin, Star, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const navItems = [
  { path: "/meeting-schedule", label: "Meeting Schedule", icon: Calendar },
  { path: "/intake",           label: "Intake Form",      icon: FormInput },
  { path: "/event-details",    label: "Event Details",    icon: MapPin },
  { path: "/feedback",         label: "Feedback",         icon: Star },
];

export default function Navigation() {
  const [location] = useLocation();
  const [hasNewMeetings, setHasNewMeetings] = useState(false);
  const { user, loading } = useAuth();

  const { data: intakeStatus } = trpc.intake.getSubmission.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: meetings } = trpc.sponsor.getMyMeetings.useQuery(undefined, {
    enabled: !!user,
  });

  const hasMeetings = !!(meetings && meetings.length > 0);
  const isIntakeComplete = !!intakeStatus;

  useEffect(() => {
    if (hasMeetings) {
      const viewed = localStorage.getItem("rlx-meetings-viewed");
      if (!viewed) setHasNewMeetings(true);
    } else {
      setHasNewMeetings(false);
    }
  }, [hasMeetings]);

  useEffect(() => {
    if (location === "/meeting-schedule" && hasNewMeetings) {
      localStorage.setItem("rlx-meetings-viewed", "true");
      setHasNewMeetings(false);
    }
  }, [location, hasNewMeetings]);

  return (
    <nav className="fixed left-0 top-0 h-screen w-20 lg:w-64 glass-card z-50 flex flex-col">
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-border/30">
        <Link href="/meeting-schedule">
          <div className="flex items-center gap-3 cursor-pointer group">
            <img
              src="/rlx-logo.png"
              alt="RLX Logo"
              className="h-12 w-auto object-contain"
            />
            <div className="hidden lg:block">
              <h1 className="text-white font-heading font-bold text-sm tracking-tight">
                Resourcing Leaders Exchange
              </h1>
              <p className="text-white/80 text-xs">Sponsor Portal</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2 lg:px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            const isBlocked = !loading && !user;
            const isCompleted = item.path === "/intake" && isIntakeComplete;
            const isMeetingSchedule = item.path === "/meeting-schedule";

            return (
              <li key={item.path}>
                {isBlocked ? (
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-not-allowed opacity-40 text-white/50 lg:justify-start justify-center">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden lg:block font-heading text-sm font-medium">{item.label}</span>
                  </div>
                ) : (
                  <Link href={item.path}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 cursor-pointer relative
                        ${isMeetingSchedule && hasMeetings
                          ? isActive
                            ? "bg-green-500/30 text-white border border-green-400/60 scale-105"
                            : "bg-green-500/20 text-green-300 hover:bg-green-500/30 hover:text-white border border-green-500/40"
                          : isActive
                          ? "bg-primary/20 text-white border border-white/30 scale-105"
                          : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
                        }
                        ${isMeetingSchedule && hasNewMeetings ? "ring-2 ring-green-500 ring-opacity-50 animate-pulse" : ""}
                        lg:justify-start justify-center
                        ${isActive ? "animate-pop" : ""}
                      `}
                    >
                      <Icon className={`w-6 h-6 flex-shrink-0 ${isMeetingSchedule && hasMeetings ? "text-green-400" : ""}`} />
                      <span className="hidden lg:block font-heading text-sm font-medium flex-1">
                        {item.label}
                      </span>
                      {isCompleted && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {isMeetingSchedule && hasMeetings && !hasNewMeetings && (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      )}
                      {isMeetingSchedule && hasNewMeetings && (
                        <>
                          <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                          <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full" />
                        </>
                      )}
                    </div>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-border/30">
        <p className="text-sm text-white/60 text-center hidden lg:block">© 2026 RLX</p>
      </div>
    </nav>
  );
}
