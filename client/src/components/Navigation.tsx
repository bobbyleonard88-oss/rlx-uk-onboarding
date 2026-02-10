import { Link, useLocation } from "wouter";
import { Home, Info, Award, Users, FileText, Calendar, Shield, FormInput, ListOrdered } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/overview", label: "Overview", icon: Info },
  { path: "/features", label: "Features & Values", icon: Award },
  { path: "/rules", label: "Rules", icon: Shield },
  { path: "/team", label: "Team", icon: Users },
  { path: "/packages", label: "Packages", icon: FileText },
  { path: "/meetings", label: "Meetings", icon: Calendar },
  { path: "/intake", label: "Intake Form", icon: FormInput },
  { path: "/prioritize", label: "Prioritize Meetings", icon: ListOrdered },
];

export default function Navigation() {
  const [location] = useLocation();

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
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <a
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/20 text-accent border border-accent/30' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 border border-transparent'
                      }
                      lg:justify-start justify-center
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden lg:block font-heading text-sm font-medium">
                      {item.label}
                    </span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-border/30 hidden lg:block">
        <p className="text-xs text-muted-foreground text-center">
          © 2026 RLX
        </p>
      </div>
    </nav>
  );
}
