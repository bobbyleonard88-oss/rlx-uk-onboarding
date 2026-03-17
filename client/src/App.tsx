import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import Overview from "./pages/Overview";
import Features from "./pages/Features";
import Rules from "./pages/Rules";
import Team from "./pages/Team";
import AddOns from "./pages/AddOns";
import Timeline from "./pages/Timeline";
import Meetings from "./pages/Meetings";
import Matchmaking from "./pages/Matchmaking";
import Intake from "./pages/Intake";
import Prioritize from "./pages/Prioritize";
import FAQ from "./pages/FAQ";
import AdminDashboard from "./pages/AdminDashboard";
import SponsorProfile from "./pages/SponsorProfile";
import AdminUsers from "./pages/AdminUsers";
import AdminMeetings from "./pages/AdminMeetings";
import SponsorDashboard from "./pages/SponsorDashboard";
import MeetingSchedule from "./pages/MeetingSchedule";
import DelegateOverview from "./pages/DelegateOverview";
import Analytics from "./pages/Analytics";
import ActivityLog from "./pages/ActivityLog";
import EventAgenda from "./pages/EventAgenda";
import NewMeetingNotification from "./components/NewMeetingNotification";

// Banner shown when admin is viewing the portal as a sponsor
function ImpersonationBanner() {
  const isImpersonating = document.cookie.includes('is_impersonating=1');
  if (!isImpersonating) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-black text-sm font-semibold flex items-center justify-between px-4 py-2 shadow-lg">
      <span>👁 Admin View — You are viewing the portal as a sponsor</span>
      <a
        href="/api/impersonate/exit"
        className="ml-4 bg-black text-white text-xs font-bold px-3 py-1 rounded hover:bg-gray-800 transition-colors"
      >
        ← Return to Admin
      </a>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  // Admin routes: full-width, no sponsor sidebar
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/meetings" component={AdminMeetings} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/analytics" component={Analytics} />
          <Route path="/admin/delegate-overview" component={DelegateOverview} />
          <Route path="/admin/activity-log" component={ActivityLog} />
          <Route component={NotFound} />
        </Switch>
      </div>
    );
  }

  // Sponsor portal routes: with sidebar navigation
  return (
    <div className="flex">
      <ImpersonationBanner />
      <Navigation />
      <NewMeetingNotification />
      <main className="flex-1 ml-20 lg:ml-64">
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path="/overview" component={Overview} />
          <Route path="/features" component={Features} />
          <Route path="/rules" component={Rules} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/addons" component={AddOns} />
          <Route path="/meetings" component={Meetings} />
          <Route path="/matchmaking" component={Matchmaking} />
          <Route path="/team" component={Team} />
          <Route path="/dashboard" component={SponsorDashboard} />
          <Route path="/intake" component={Intake} />
          <Route path="/prioritize" component={Prioritize} />
          <Route path="/faq" component={FAQ} />
          <Route path="/sponsor-profile" component={SponsorProfile} />
          <Route path="/meeting-schedule" component={MeetingSchedule} />
          <Route path="/agenda" component={EventAgenda} />
          <Route path="/404" component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

/**
 * RLX Onboarding Journey
 * Design: RLX Branded Splash
 * - Dark theme with deep navy/purple gradient background
 * - Purple/Magenta accent colors
 * - Montserrat for headings, Playfair Display for body
 */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
