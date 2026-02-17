import { Link, useLocation } from "wouter";
import { Home, Info, Award, Users, FileText, Calendar, Shield, FormInput, ListOrdered, Clock, Target, HelpCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const baseNavItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/overview", label: "Overview", icon: Info },
  { path: "/features", label: "Features & Values", icon: Award },
  { path: "/rules", label: "Rules of Engagement", icon: Shield },
  { path: "/addons", label: "Add-Ons", icon: FileText },
  { path: "/timeline", label: "Timeline", icon: Clock },
  { path: "/meetings", label: "Meetings", icon: Calendar },
  { path: "/matchmaking", label: "Matchmaking", icon: Target },
  { path: "/intake", label: "Intake Form", icon: FormInput },
  { path: "/prioritize", label: "Prioritise Meetings", icon: ListOrdered },
  { path: "/faq", label: "FAQ", icon: HelpCircle },
  { path: "/team", label: "Team", icon: Users },
];

export default function Navigation() {
  const [location] = useLocation();
  const [visitedPages, setVisitedPages] = useState<string[]>([]);
  const [hasMeetings, setHasMeetings] = useState(false);
  const [hasNewMeetings, setHasNewMeetings] = useState(false);
  const { user, loading } = useAuth();
  
  // Query completion status for intake and rankings
  const { data: intakeStatus } = trpc.intake.getSubmission.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: rankingsStatus } = trpc.rankings.myRankingsSubmission.useQuery(undefined, {
    enabled: !!user,
  });
  
  const isIntakeComplete = !!intakeStatus;
  const isRankingsComplete = !!rankingsStatus;
  
  // Query actual meetings from database instead of localStorage
  const { data: meetings } = trpc.sponsor.getMyMeetings.useQuery(undefined, {
    enabled: !!user,
  });
  
  // Check if user has saved meetings (for showing Meeting Schedule tab)
  useEffect(() => {
    if (meetings && meetings.length > 0) {
      setHasMeetings(true);
      // Show notification if meetings exist but haven't been viewed
      const viewed = localStorage.getItem('rlx-meetings-viewed');
      if (!viewed) {
        setHasNewMeetings(true);
      }
    } else {
      setHasMeetings(false);
      setHasNewMeetings(false);
    }
  }, [meetings]);
  
  // Mark meetings as viewed when user visits the schedule page
  useEffect(() => {
    if (location === '/meeting-schedule' && hasNewMeetings) {
      localStorage.setItem('rlx-meetings-viewed', 'true');
      setHasNewMeetings(false);
    }
  }, [location, hasNewMeetings]);
  
  // Add Meeting Schedule to nav items if user has meetings
  const navItems = hasMeetings 
    ? [...baseNavItems.slice(0, 10), { path: "/meeting-schedule", label: "Meeting Schedule", icon: Calendar }, ...baseNavItems.slice(10)]
    : baseNavItems;

  useEffect(() => {
    // Load visited pages from localStorage
    const saved = localStorage.getItem("rlx-visited-pages");
    if (saved) {
      try {
        setVisitedPages(JSON.parse(saved));
      } catch {
        setVisitedPages([]);
      }
    }
  }, []);

  useEffect(() => {
    // Mark current page as visited with pop animation
    if (location && !visitedPages.includes(location)) {
      const newVisited = [...visitedPages, location];
      setVisitedPages(newVisited);
      localStorage.setItem("rlx-visited-pages", JSON.stringify(newVisited));
    }
  }, [location]);

  return (
    <nav className="fixed left-0 top-0 h-screen w-20 lg:w-64 glass-card z-50 flex flex-col">
      <div className="p-4 lg:p-6 border-b border-border/30">
        <Link href="/">
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
              <p className="text-white/80 text-xs">Onboarding Journey</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2 lg:px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            const isVisited = visitedPages.includes(item.path);
            
            // Check if this item is completed
            const isCompleted = 
              (item.path === '/intake' && isIntakeComplete) ||
              (item.path === '/prioritize' && isRankingsComplete);
            
            // Block navigation if not authenticated (except home page)
            const isBlocked = !loading && !user && item.path !== "/";
            
            return (
              <li key={item.path}>
                {isBlocked ? (
                  <div
                    className="
                      flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 cursor-not-allowed opacity-40
                      text-white/50 border border-transparent
                      lg:justify-start justify-center
                    "
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden lg:block font-heading text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <Link href={item.path}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 cursor-pointer relative
                        ${isActive 
                          ? 'bg-primary/20 text-white border border-white/30 scale-105' 
                          : isVisited
                          ? 'bg-white/10 text-white hover:text-white hover:bg-white/20 border border-white/20'
                          : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                        }
                        ${item.path === '/meeting-schedule' && hasNewMeetings ? 'ring-2 ring-green-500 ring-opacity-50 animate-pulse' : ''}
                        lg:justify-start justify-center
                        ${isActive ? 'animate-pop' : ''}
                      `}
                    >
                      <Icon className="w-6 h-6 flex-shrink-0" />
                      <span className="hidden lg:block font-heading text-sm font-medium flex-1">
                        {item.label}
                      </span>
                      {isCompleted && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {item.path === '/meeting-schedule' && hasNewMeetings && (
                        <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                      )}
                      {item.path === '/meeting-schedule' && hasNewMeetings && (
                        <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full" />
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
        <p className="text-sm text-white/60 text-center hidden lg:block">
          © 2026 RLX
        </p>
      </div>
    </nav>
  );
}
