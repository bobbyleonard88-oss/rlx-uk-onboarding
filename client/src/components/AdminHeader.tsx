/**
 * Shared Admin Header Component
 * Provides consistent navigation across all admin pages
 * Includes global test accounts toggle with destructive confirmation
 */

import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { LogOut, User, FlaskConical, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const utils = trpc.useUtils();

  const disableTestAccounts = trpc.admin.disableTestAccounts.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Test accounts disabled — ${data.meetingsDeleted} meetings and ${data.cacheDeleted} cached matches wiped.`,
        { duration: 5000 }
      );
      setIncludeTestAccountsStorage(false);
      setIncludeTestAccounts(false);
      dispatchTestAccountsChange(false);
      // Invalidate all admin queries so pages refresh
      utils.admin.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disable test accounts");
    },
  });

  // Listen for changes from other components
  useEffect(() => {
    const handler = (e: Event) => {
      setIncludeTestAccounts((e as CustomEvent).detail);
    };
    window.addEventListener("testAccountsChanged", handler);
    return () => window.removeEventListener("testAccountsChanged", handler);
  }, []);

  const handleToggle = () => {
    if (includeTestAccounts) {
      // Turning OFF — show destructive confirmation
      setShowDisableConfirm(true);
    } else {
      // Turning ON — just update state
      setIncludeTestAccountsStorage(true);
      setIncludeTestAccounts(true);
      dispatchTestAccountsChange(true);
      toast.info("Test accounts enabled — showing recruitmentevents.co sponsors");
    }
  };

  const handleConfirmDisable = () => {
    setShowDisableConfirm(false);
    disableTestAccounts.mutate();
  };

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/meetings", label: "Meetings" },
    { path: "/admin/analytics", label: "Analytics" },
    { path: "/admin/delegate-overview", label: "Delegate Overview" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/activity-log", label: "Activity Log" },
  ];

  return (
    <>
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
              {/* Test Accounts Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggle}
                disabled={disableTestAccounts.isPending}
                className={`flex items-center gap-2 text-xs font-medium transition-all ${
                  includeTestAccounts
                    ? "border-amber-500 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                    : "border-slate-600 text-slate-400 hover:text-slate-300"
                }`}
                title="Toggle test accounts (recruitmentevents.co sponsors)"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {disableTestAccounts.isPending
                  ? "Disabling..."
                  : includeTestAccounts
                  ? "Test: ON"
                  : "Test: OFF"}
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

      {/* Destructive confirmation dialog */}
      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Disable Test Accounts?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently wipe all meetings and AI match cache for the 4 test sponsor accounts
              (recruitmentevents.co). This action cannot be undone — meetings will need to be regenerated
              if you turn test accounts back on.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisable}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, disable and wipe data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
