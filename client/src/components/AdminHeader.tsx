/**
 * Shared Admin Header Component
 * Provides consistent navigation across all admin pages
 */

import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { LogOut, User } from "lucide-react";

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/meetings", label: "Meetings" },
    { path: "/admin/delegate-overview", label: "Delegate Overview" },
    { path: "/admin/users", label: "Users" },
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
