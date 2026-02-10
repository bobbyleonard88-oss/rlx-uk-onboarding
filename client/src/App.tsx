import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import Overview from "./pages/Overview";
import Features from "./pages/Features";
import Rules from "./pages/Rules";
import Team from "./pages/Team";
import Packages from "./pages/Packages";
import Meetings from "./pages/Meetings";
import Intake from "./pages/Intake";
import Prioritize from "./pages/Prioritize";

function Router() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 ml-20 lg:ml-64">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/overview" component={Overview} />
          <Route path="/features" component={Features} />
          <Route path="/rules" component={Rules} />
          <Route path="/team" component={Team} />
          <Route path="/packages" component={Packages} />
          <Route path="/meetings" component={Meetings} />
          <Route path="/intake" component={Intake} />
          <Route path="/prioritize" component={Prioritize} />
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
 * Design: Luxury Editorial
 * - Dark theme with deep navy (#2C3E5A) to near-black (#1a1a2e) gradient background
 * - Purple (#7B4B94) primary, Gold (#d4af37) accents
 * - Playfair Display for headlines, Montserrat for structure, Crimson Pro for body
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
