/**
 * RLX Onboarding - Progress Tracker Component
 * Tracks user progress through the onboarding journey
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";

const ONBOARDING_PAGES = [
  "/",
  "/overview",
  "/features",
  "/rules",
  "/timeline",
  "/addons",
  "/meetings",
  "/matchmaking",
  "/team",
  "/intake",
];

export default function ProgressTracker() {
  const [location] = useLocation();
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set());

  // Load visited pages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("rlx-visited-pages");
    if (stored) {
      try {
        setVisitedPages(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error("Failed to load visited pages", e);
      }
    }
  }, []);

  // Track current page visit
  useEffect(() => {
    if (ONBOARDING_PAGES.includes(location)) {
      setVisitedPages((prev) => {
        const updated = new Set(prev);
        updated.add(location);
        localStorage.setItem("rlx-visited-pages", JSON.stringify(Array.from(updated)));
        return updated;
      });
    }
  }, [location]);

  const progress = (visitedPages.size / ONBOARDING_PAGES.length) * 100;
  const completedCount = visitedPages.size;
  const totalCount = ONBOARDING_PAGES.length;

  return (
    <div className="glass-card p-4 rounded-lg border border-accent/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-accent" />
          <span className="text-sm font-heading font-semibold text-foreground">
            Onboarding Progress
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount}
        </span>
      </div>
      
      <div className="w-full bg-secondary/30 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {completedCount === totalCount && (
        <p className="text-xs text-accent mt-2 font-medium">
          ✓ Journey Complete! Ready to prioritize meetings.
        </p>
      )}
    </div>
  );
}
