/**
 * Delegate Overview - Admin Report
 * Shows all delegates with their complete meeting schedules across all sponsors
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Calendar, Building2, LogOut, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const TIME_SLOT_LABELS: Record<number, string> = {
  1: "Day 1 - Slot 1",
  2: "Day 1 - Slot 2",
  3: "Day 1 - Slot 3",
  4: "Day 2 - Slot 1",
  5: "Day 2 - Slot 2",
  6: "Day 2 - Slot 3",
};

export default function DelegateOverview() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { data: overview, isLoading } = trpc.admin.getDelegateOverview.useQuery();

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
            meeting.attendeeNumber ? `Attendee ${meeting.attendeeNumber}` : "",
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
      {/* Navigation Header */}
      <div className="bg-slate-900/50 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-heading font-semibold text-white">RLX Admin Portal</h1>
            <nav className="flex gap-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Dashboard
                </Button>
              </Link>
              <Link href="/admin/meetings">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Meetings
                </Button>
              </Link>
              <Link href="/admin/delegate-overview">
                <Button variant="ghost" className="text-white bg-slate-800">
                  Delegate Overview
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Users
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-300">
              <UserIcon className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-slate-300 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

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

        {/* Delegate List */}
        <div className="space-y-4">
          {overview && overview.length > 0 ? (
            overview.map((delegate) => (
              <Card key={delegate.delegateId} className="glass-card border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-xl flex items-center gap-3">
                        {delegate.delegateName}
                        <Badge 
                          variant={delegate.totalMeetings >= 8 ? "destructive" : "secondary"}
                          className="text-sm"
                        >
                          {delegate.totalMeetings}/8 meetings
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-slate-300 mt-1">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        {delegate.company} • {delegate.jobTitle}
                      </CardDescription>
                    </div>
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
                            {meeting.attendeeNumber && (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                Attendee {meeting.attendeeNumber}
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
