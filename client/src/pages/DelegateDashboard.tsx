/**
 * Delegate Dashboard
 * The main landing page for the delegate portal.
 * Shows the event overview, personal schedule, and upcoming meetings.
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Calendar, Clock, MessageSquare, Star, User, ChevronRight, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-purple-400",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg bg-slate-800/60 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DelegateDashboard() {
  const { user } = useAuth();
  const { data: activeEvent } = trpc.event.getActive.useQuery();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
              <span className="text-white text-xs font-bold">RLX</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-none">Delegate Portal</p>
              <p className="text-sm font-semibold text-white leading-tight">
                {activeEvent?.name ?? "RLX UK 2026"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="text-sm font-medium text-white">{user?.name ?? user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Welcome back, {user?.name?.split(" ")[0] ?? "Delegate"}
          </h1>
          {activeEvent && (
            <p className="text-slate-400 mt-1 text-sm">
              {activeEvent.venueName && `${activeEvent.venueName} · `}
              {activeEvent.name}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Clock}        label="Confirmed Meetings" value={0}  sub="Min. 8 required"  color="text-emerald-400" />
          <StatCard icon={Calendar}     label="Sessions Added"     value={0}  sub="Personal schedule" color="text-blue-400" />
          <StatCard icon={MessageSquare} label="Unread Messages"   value={0}  sub="From sponsors"    color="text-purple-400" />
          <StatCard icon={Star}         label="Pending Requests"   value={0}  sub="Awaiting response" color="text-amber-400" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/delegate/agenda">
            <Card className="glass-card border-slate-700/50 hover:border-purple-500/40 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Event Agenda</p>
                    <p className="text-xs text-slate-400">View & add sessions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/delegate/meetings">
            <Card className="glass-card border-slate-700/50 hover:border-purple-500/40 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">My Meetings</p>
                    <p className="text-xs text-slate-400">Schedule & requests</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/delegate/messages">
            <Card className="glass-card border-slate-700/50 hover:border-purple-500/40 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Messages</p>
                    <p className="text-xs text-slate-400">Chat with sponsors</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Upcoming Meetings Placeholder */}
        <div>
          <h2 className="text-base font-semibold text-slate-200 mb-3">Your Meetings</h2>
          <div className="glass-card rounded-xl border border-slate-700/50 p-8 text-center">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">No meetings scheduled yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Your confirmed meetings will appear here. You need a minimum of 8 confirmed meetings.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white hover:border-purple-500"
            >
              Browse Sponsors
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
