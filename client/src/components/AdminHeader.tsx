/**
 * Shared Admin Header Component
 * Provides consistent navigation across all admin pages
 * Two-row layout: top row = brand + actions, bottom row = nav links (scrollable)
 */

import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { LogOut, User, FlaskConical } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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

export function dispatchTestAccountsChange(value: boolean) {
  window.dispatchEvent(new CustomEvent("testAccountsChanged", { detail: value }));
}

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [includeTestAccounts, setIncludeTestAccounts] = useState(getIncludeTestAccounts);

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
    if (!newValue) {
      disableTestAccounts.mutate();
    }
  };

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/meetings", label: "Meetings" },
    { path: "/admin/analytics", label: "Analytics" },
    { path: "/admin/feedback-notes", label: "Feedback & Notes" },
    { path: "/admin/table-plan", label: "Table Plan ★" },
    { path: "/admin/delegate-overview", label: "Delegate Overview" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/activity-log", label: "Activity Log" },
  ];

  return (
    <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Row 1: Brand + right-side actions */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <h1 className="text-xl font-heading font-bold text-white shrink-0">RLX Admin</h1>

        <div className="flex items-center gap-2 shrink-0">
          {/* Test Accounts Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className={`flex items-center gap-1.5 text-xs font-medium transition-all h-8 px-3 ${
              includeTestAccounts
                ? "border-amber-500 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                : "border-slate-600 text-slate-400 hover:text-slate-300"
            }`}
            title="Toggle test accounts visibility (recruitmentevents.co sponsors)"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{includeTestAccounts ? "Test: ON" : "Test: OFF"}</span>
          </Button>

          {/* Email — only on wide screens */}
          <div className="hidden xl:flex items-center gap-1.5 text-slate-400 text-xs">
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[180px] truncate">{user?.email}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex items-center gap-1.5 h-8 px-3 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Row 2: Nav links — horizontally scrollable so they never overflow */}
      <div className="overflow-x-auto scrollbar-none border-t border-slate-700/50">
        <nav className="flex items-center gap-0.5 px-4 sm:px-6 py-1 min-w-max">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
