/**
 * Delegate Overview - Admin Report
 * Shows all delegates with their complete meeting schedules across all sponsors
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Calendar, Building2, LogOut, User as UserIcon, Search, Filter, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useTestMode } from "@/hooks/useTestMode";

const TIME_SLOT_LABELS: Record<number, string> = {
  // Day 2 (Wednesday 25 Mar)
  1: "Day 2 (Wed 25 Mar) · 11:00–11:30",
  2: "Day 2 (Wed 25 Mar) · 11:30–12:00",
  3: "Day 2 (Wed 25 Mar) · 13:15–13:45",
  4: "Day 2 (Wed 25 Mar) · 13:45–14:15",
  5: "Day 2 (Wed 25 Mar) · 14:30–15:00",
  6: "Day 2 (Wed 25 Mar) · 15:00–15:30",
  // Day 3 (Thursday 26 Mar)
  7: "Day 3 (Thu 26 Mar) · 10:30–11:00",
  8: "Day 3 (Thu 26 Mar) · 11:00–11:30",
  9: "Day 3 (Thu 26 Mar) · 13:15–13:45",
  10: "Day 3 (Thu 26 Mar) · 13:45–14:15",
  11: "Day 3 (Thu 26 Mar) · 14:30–15:00",
  12: "Day 3 (Thu 26 Mar) · 15:00–15:30",
};

export default function DelegateOverview() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const includeTestAccounts = useTestMode();
  const { data: overview, isLoading, refetch } = trpc.admin.getDelegateOverview.useQuery({ includeTestAccounts });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "at-capacity" | "over-capacity">("all");
  const cancelDelegate = trpc.admin.cancelDelegate.useMutation();

  const downloadCSV = () => {
    if (!overview) return;

    const headers = [
      "Delegate Name",
      "Company",
      "Job Title",
      "Total Meetings",
      "Sponsor Name",
      "Time Slot",
      "Attendee Number",
      "Match Score"
    ];

    const rows: string[][] = [];
    
    overview.forEach(delegate => {
      if (delegate.meetings.length === 0) {
        // Delegate with no meetings
        rows.push([
          delegate.delegateName,
          delegate.company,
          delegate.jobTitle,
          delegate.totalMeetings.toString(),
          "",
          "",
          "",
          ""
        ]);
      } else {
        // One row per meeting
        delegate.meetings.forEach(meeting => {
          rows.push([
            delegate.delegateName,
            delegate.company,
            delegate.jobTitle,
            delegate.totalMeetings.toString(),
            meeting.sponsorName,
            meeting.timeSlot ? TIME_SLOT_LABELS[meeting.timeSlot] || `Slot ${meeting.timeSlot}` : "Unassigned",
            meeting.sponsorRepName || (meeting.attendeeNumber ? `Attendee ${meeting.attendeeNumber}` : ""),
            meeting.matchScore ? `${meeting.matchScore}%` : ""
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delegate-overview-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("CSV downloaded successfully");
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardHeader>
            <CardTitle className="text-white">Authentication Required</CardTitle>
            <CardDescription className="text-slate-300">
              Please log in to access the delegate overview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-accent hover:bg-accent/90">
              <a href={getLoginUrl()}>Log In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-slate-300">
              You don't have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AdminHeader />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Header */}
        <Card className="glass-card border-slate-700">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white text-3xl mb-2 flex items-center gap-3">
                  <Users className="w-8 h-8 text-accent" />
                  Delegate Overview Report
                </CardTitle>
                <CardDescription className="text-slate-300 text-lg">
                  Complete meeting schedules for all delegates across all sponsors
                </CardDescription>
              </div>
              <Button
                onClick={downloadCSV}
                className="bg-accent hover:bg-accent/90 gap-2"
                disabled={!overview || overview.length === 0}
              >
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Capacity Overview */}
        {overview && overview.length > 0 && (() => {
          const totalDelegates = overview.length;
          const atCapacity = overview.filter(d => d.totalMeetings >= 8).length;
          const available = overview.filter(d => d.totalMeetings < 8).length;
          const totalMeetings = overview.reduce((s, d) => s + d.totalMeetings, 0);
          const totalCapacity = totalDelegates * 8;
          const utilPct = Math.round((totalMeetings / totalCapacity) * 100);
          const avgMeetings = (totalMeetings / totalDelegates).toFixed(1);
          return (
            <Card className="glass-card border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Delegate Capacity Overview
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {totalMeetings} meetings assigned across {totalDelegates} delegates — {utilPct}% of total capacity used
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{totalMeetings}</div>
                    <div className="text-xs text-slate-400 mt-1">Total Meetings</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{totalCapacity - totalMeetings}</div>
                    <div className="text-xs text-slate-400 mt-1">Remaining Slots</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-300">{atCapacity}</div>
                    <div className="text-xs text-slate-400 mt-1">At Capacity (8/8)</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-300">{available}</div>
                    <div className="text-xs text-slate-400 mt-1">Have Capacity Left</div>
                  </div>
                </div>

                {/* Overall utilization bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Overall Capacity Used</span>
                    <span>{totalMeetings} / {totalCapacity} slots ({utilPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(utilPct, 100)}%`,
                        background: utilPct >= 90 ? '#f59e0b' : utilPct >= 70 ? '#8b5cf6' : '#10b981'
                      }}
                    />
                  </div>
                </div>

                {/* Per-delegate capacity bars — compact grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {[...overview]
                    .sort((a, b) => b.totalMeetings - a.totalMeetings)
                    .map(delegate => {
                      const pct = Math.min((delegate.totalMeetings / 8) * 100, 100);
                      const barColor = delegate.totalMeetings >= 8
                        ? 'bg-yellow-400'
                        : delegate.totalMeetings >= 6
                        ? 'bg-purple-400'
                        : delegate.totalMeetings >= 3
                        ? 'bg-blue-400'
                        : 'bg-green-400';
                      return (
                        <div key={delegate.delegateId} className="flex items-center gap-2">
                          <div className="w-28 shrink-0 text-right">
                            <span className="text-xs text-slate-300 truncate block">
                              {delegate.delegateName.split(' ')[0]} {delegate.delegateName.split(' ').slice(-1)[0]}
                            </span>
                          </div>
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8 shrink-0">
                            {delegate.totalMeetings}/8
                          </span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Search and Filters */}
        <Card className="glass-card border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by delegate name or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              
              {/* Filter Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                  className={filterStatus === "all" ? "bg-accent hover:bg-accent/90" : "border-slate-600 text-slate-300"}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "available" ? "default" : "outline"}
                  onClick={() => setFilterStatus("available")}
                  className={filterStatus === "available" ? "bg-accent hover:bg-accent/90" : "border-slate-600 text-slate-300"}
                >
                  Available
                </Button>
                <Button
                  variant={filterStatus === "at-capacity" ? "default" : "outline"}
                  onClick={() => setFilterStatus("at-capacity")}
                  className={filterStatus === "at-capacity" ? "bg-accent hover:bg-accent/90" : "border-slate-600 text-slate-300"}
                >
                  At Capacity
                </Button>
                <Button
                  variant={filterStatus === "over-capacity" ? "default" : "outline"}
                  onClick={() => setFilterStatus("over-capacity")}
                  className={filterStatus === "over-capacity" ? "bg-accent hover:bg-accent/90" : "border-slate-600 text-slate-300"}
                >
                  Over Capacity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delegate List */}
        <div className="space-y-4">
          {overview && overview.length > 0 ? (
            overview
              .filter(delegate => {
                // Search filter
                const matchesSearch = searchQuery === "" ||
                  delegate.delegateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  delegate.company.toLowerCase().includes(searchQuery.toLowerCase());
                
                // Status filter
                let matchesStatus = true;
                if (filterStatus === "available") {
                  matchesStatus = delegate.totalMeetings < 8;
                } else if (filterStatus === "at-capacity") {
                  matchesStatus = delegate.totalMeetings === 8;
                } else if (filterStatus === "over-capacity") {
                  matchesStatus = delegate.totalMeetings > 8;
                }
                
                return matchesSearch && matchesStatus;
              })
              .map((delegate) => (
              <Card key={delegate.delegateId} className="glass-card border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-xl flex items-center gap-3">
                        {delegate.delegateName}
                        <Badge 
                          className={
                            delegate.totalMeetings > 8
                              ? "bg-red-500/20 text-red-300 border-red-500/30 text-sm"
                              : delegate.totalMeetings === 8
                              ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-sm"
                              : "bg-green-500/20 text-green-300 border-green-500/30 text-sm"
                          }
                        >
                          {delegate.totalMeetings}/8 meetings
                          {delegate.totalMeetings > 8 && " - Over Capacity"}
                          {delegate.totalMeetings === 8 && " - At Capacity"}
                          {delegate.totalMeetings < 8 && " - Available"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-slate-300 mt-1">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        {delegate.company} • {delegate.jobTitle}
                      </CardDescription>
                    </div>
                    {delegate.totalMeetings > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Cancel Delegate
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-slate-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">
                              Cancel {delegate.delegateName}?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-300">
                              This will remove {delegate.delegateName} from all {delegate.totalMeetings} scheduled meeting(s) and automatically replace them with the next best available match for each sponsor.
                              <br /><br />
                              <strong>Affected Sponsors:</strong>
                              <ul className="mt-2 space-y-1">
                                {delegate.meetings.map((meeting, idx) => (
                                  <li key={idx} className="text-sm">
                                    • {meeting.sponsorName} ({meeting.timeSlot ? TIME_SLOT_LABELS[meeting.timeSlot] : "Unassigned"})
                                  </li>
                                ))}
                              </ul>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 text-white border-slate-600 hover:bg-slate-700">
                              Keep Delegate
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600 text-white"
                              onClick={async () => {
                                try {
                                  const result = await cancelDelegate.mutateAsync({
                                    delegateId: delegate.delegateId,
                                  });
                                  toast.success(result.message || "Delegate cancelled successfully");
                                  if (result.replacements && result.replacements.length > 0) {
                                    const replacementSummary = result.replacements
                                      .map(r => `${r.sponsorName}: ${r.newDelegateName} (${r.matchScore}% match)`)
                                      .join("\n");
                                    toast.info(`Replacements:\n${replacementSummary}`, { duration: 10000 });
                                  }
                                  refetch();
                                } catch (error: any) {
                                  const errorMessage = error?.message || "Failed to cancel delegate";
                                  toast.error(errorMessage);
                                  console.error("Cancel delegate error:", error);
                                }
                              }}
                            >
                              Cancel & Replace
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {delegate.meetings.length > 0 ? (
                    <div className="space-y-2">
                      {delegate.meetings.map((meeting, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{meeting.sponsorName}</span>
                              <span className="text-slate-400 text-sm">
                                {meeting.timeSlot 
                                  ? TIME_SLOT_LABELS[meeting.timeSlot] || `Slot ${meeting.timeSlot}`
                                  : "Time slot not assigned"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(meeting.sponsorRepName || meeting.attendeeNumber) && (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                {meeting.sponsorRepName || `Attendee ${meeting.attendeeNumber}`}
                              </Badge>
                            )}
                            {meeting.matchScore && (
                              <Badge variant="secondary">
                                {meeting.matchScore}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-4">
                      No meetings scheduled
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-slate-300">No delegate data available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
