import { Link, useLocation } from "wouter";
import { Home, Info, Award, Users, FileText, Calendar, Shield, FormInput, ListOrdered, Clock, Target, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/overview", label: "Overview", icon: Info },
  { path: "/features", label: "Features & Values", icon: Award },
  { path: "/rules", label: "Rules", icon: Shield },
  { path: "/addons", label: "Add-Ons", icon: FileText },
  { path: "/timeline", label: "Timeline", icon: Clock },
  { path: "/meetings", label: "Meetings", icon: Calendar },
  { path: "/matchmaking", label: "Matchmaking", icon: Target },
  { path: "/intake", label: "Intake Form", icon: FormInput },
  { path: "/prioritize", label: "Prioritize Meetings", icon: ListOrdered },
  { path: "/faq", label: "FAQ", icon: HelpCircle },
  { path: "/team", label: "Team", icon: Users },
];

export default function Navigation() {
  const [location] = useLocation();
  const [visitedPages, setVisitedPages] = useState<string[]>([]);

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
    <nav className="fixed left-0 top-0 h-screen w-20 lg:w-64 glass-card border-r border-border/50 z-50 flex flex-col">
      <div className="p-4 lg:p-6 border-b border-border/30">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group">
            <img 
              src="/rlx-logo.png" 
              alt="RLX Logo" 
              className="h-12 w-auto object-contain"
            />
            <div className="hidden lg:block">
              <h1 className="text-foreground font-heading font-bold text-sm tracking-tight">
                Resourcing Leaders Exchange
              </h1>
              <p className="text-muted-foreground text-xs">Onboarding Journey</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1 px-2 lg:px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            const isVisited = visitedPages.includes(item.path);
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <div
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 cursor-pointer
                      ${isActive 
                        ? 'bg-primary/20 text-accent border border-accent/30 scale-105' 
                        : isVisited
                        ? 'bg-accent/10 text-accent/80 hover:text-accent hover:bg-accent/20 border border-accent/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 border border-transparent'
                      }
                      lg:justify-start justify-center
                      ${isActive ? 'animate-pop' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden lg:block font-heading text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground text-center hidden lg:block">
          © 2026 RLX
        </p>
      </div>
    </nav>
  );
}
