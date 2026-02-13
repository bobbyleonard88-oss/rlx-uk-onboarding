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
function Router() {
  const [location] = useLocation();
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);
  
  return (
    <div className="flex">
      <Navigation />
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
          <Route path="/intake" component={Intake} />
          <Route path="/prioritize" component={Prioritize} />
          <Route path="/faq" component={FAQ} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/sponsor-profile" component={SponsorProfile} />
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
