/**
 * Shared Admin Header Component
 * Provides consistent navigation across all admin pages
 * Includes global test accounts toggle (hides test accounts and clears their meetings when OFF)
 */

import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { LogOut, User, FlaskConical } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Global test accounts state persisted in localStorage
const TEST_ACCOUNTS_KEY = "rlx_include_test_accounts";

export function getIncludeTestAccounts(): boolean {
  try {
    return localStorage.getItem(TEST_ACCOUNTS_KEY) === "true";
  } catch {
    return false;
  }
}

export function setIncludeTestAccountsStorage(value: boolean) {
  try {
    localStorage.setItem(TEST_ACCOUNTS_KEY, value ? "true" : "false");
  } catch {}
}

// Event to notify other components of state changes
export function dispatchTestAccountsChange(value: boolean) {
  window.dispatchEvent(new CustomEvent("testAccountsChanged", { detail: value }));
}

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [includeTestAccounts, setIncludeTestAccounts] = useState(getIncludeTestAccounts);

  // Listen for changes from other components
  useEffect(() => {
    const handler = (e: Event) => {
      setIncludeTestAccounts((e as CustomEvent).detail);
    };
    window.addEventListener("testAccountsChanged", handler);
    return () => window.removeEventListener("testAccountsChanged", handler);
  }, []);

  const disableTestAccounts = trpc.admin.disableTestAccounts.useMutation({
    onSuccess: (data) => {
      toast.success(`Test mode OFF — cleared ${data.meetingsDeleted} test meetings`);
    },
    onError: () => {
      toast.error("Failed to clear test meetings");
    },
  });

  const handleToggle = () => {
    const newValue = !includeTestAccounts;
    setIncludeTestAccountsStorage(newValue);
    setIncludeTestAccounts(newValue);
    dispatchTestAccountsChange(newValue);
    // When turning test mode OFF, clear all test sponsor meetings
    if (!newValue) {
      disableTestAccounts.mutate();
    }
  };

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/meetings", label: "Meetings" },
    { path: "/admin/analytics", label: "Analytics" },
    { path: "/admin/feedback-notes", label: "Feedback & Notes" },
    { path: "/admin/rescheduled", label: "Rescheduled ★" },
    { path: "/admin/delegate-overview", label: "Delegate Overview" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/activity-log", label: "Activity Log" },
  ];

  return (
    <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-heading font-bold text-white">RLX Admin</h1>
            
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={isActive ? "bg-primary" : "text-slate-300 hover:text-white"}
                    >
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Test Accounts Toggle — show/hide only, never deletes data */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle}
              className={`flex items-center gap-2 text-xs font-medium transition-all ${
                includeTestAccounts
                  ? "border-amber-500 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                  : "border-slate-600 text-slate-400 hover:text-slate-300"
              }`}
              title="Toggle test accounts visibility (recruitmentevents.co sponsors)"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {includeTestAccounts ? "Test: ON" : "Test: OFF"}
            </Button>

            <div className="hidden lg:flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
