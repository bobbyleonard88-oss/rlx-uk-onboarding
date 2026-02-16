/**
 * Admin Meetings Management
 * AI-powered matchmaking and meeting scheduler
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Check, X, Calendar, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";
import { Link } from "wouter";

export default function AdminMeetings() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  
  const { data: meetings, refetch } = trpc.admin.getAllMeetings.useQuery();
  const generateMatches = trpc.admin.generateMatches.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("AI matching complete! Review suggested meetings below.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate matches");
    },
  });

  const updateMeetingStatus = trpc.admin.updateMeetingStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Meeting status updated");
    },
  });

  const deleteMeeting = trpc.admin.deleteMeeting.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Meeting deleted");
    },
  });

  const [selectedSponsor, setSelectedSponsor] = useState<number | null>(null);

  // Check if user is admin
  if (!loading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  function handleGenerateMatches() {
    if (confirm("Generate AI-powered matches for all sponsors? This will analyze vendor profiles against delegate needs.")) {
      generateMatches.mutate();
    }
  }

  function getAttendeeName(attendeeId: string) {
    const attendee = attendees.find(a => a.id === attendeeId);
    return attendee ? `${attendee.firstName} ${attendee.lastName}` : attendeeId;
  }

  function getAttendeeCompany(attendeeId: string) {
    const attendee = attendees.find(a => a.id === attendeeId);
    return attendee?.company || "Unknown";
  }

  // Group meetings by sponsor
  const meetingsBySponsor = meetings?.reduce((acc, meeting) => {
    if (!acc[meeting.sponsorId]) {
      acc[meeting.sponsorId] = [];
    }
    acc[meeting.sponsorId].push(meeting);
    return acc;
  }, {} as Record<number, typeof meetings>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Admin Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h2 className="text-xl font-heading font-bold text-white">RLX Admin</h2>
              <div className="flex gap-1">
                <Link href="/admin">
                  <Button variant="ghost" className="text-slate-300 hover:bg-primary/20 hover:text-white">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/meetings">
                  <Button variant="ghost" className="text-white hover:bg-primary/20">
                    Matchmaking
                  </Button>
                </Link>
                <Link href="/admin/users">
                  <Button variant="ghost" className="text-slate-300 hover:bg-primary/20 hover:text-white">
                    Users
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.href = '/api/auth/logout';
                }}
                className="gap-2 text-slate-300 hover:text-white hover:bg-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-12 px-4">
      <div className="container max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
            Meeting Matchmaking
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered meeting suggestions based on vendor solutions and delegate needs
          </p>
        </div>

        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate AI Matches
            </CardTitle>
            <CardDescription>
              Run the AI matching engine to analyze all vendor profiles against delegate needs.
              Priority tags and top rankings will be weighted higher.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGenerateMatches}
              disabled={generateMatches.isPending}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generateMatches.isPending ? "Generating Matches..." : "Generate AI Matches"}
            </Button>
          </CardContent>
        </Card>

        {meetingsBySponsor && Object.keys(meetingsBySponsor).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(meetingsBySponsor).map(([sponsorIdStr, sponsorMeetings]) => {
              const sponsorId = parseInt(sponsorIdStr);
              
              return (
                <Card key={sponsorId} className="glass-card">
                  <CardHeader>
                    <CardTitle>Sponsor ID: {sponsorId}</CardTitle>
                    <CardDescription>
                      {sponsorMeetings.length} suggested meetings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sponsorMeetings
                        .sort((a, b) => {
                          // Sort by priority, then top-ranked, then score
                          if (a.isPriority !== b.isPriority) return (b.isPriority || 0) - (a.isPriority || 0);
                          if (a.isTopRanked !== b.isTopRanked) return (b.isTopRanked || 0) - (a.isTopRanked || 0);
                          return (b.matchScore || 0) - (a.matchScore || 0);
                        })
                        .map((meeting) => (
                          <div
                            key={meeting.id}
                            className="flex justify-between items-start p-4 bg-background/50 rounded-lg border border-border/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-foreground">
                                  {getAttendeeName(meeting.attendeeId)}
                                </h3>
                                {meeting.isPriority === 1 && (
                                  <Badge variant="destructive">Priority</Badge>
                                )}
                                {meeting.isTopRanked === 1 && (
                                  <Badge variant="default">Top 12</Badge>
                                )}
                                <Badge variant="secondary">
                                  Score: {meeting.matchScore}%
                                </Badge>
                                <Badge
                                  variant={
                                    meeting.status === "confirmed"
                                      ? "default"
                                      : meeting.status === "declined"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {meeting.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {getAttendeeCompany(meeting.attendeeId)}
                              </p>
                              {meeting.notes && (
                                <p className="text-sm text-muted-foreground italic">
                                  {meeting.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {meeting.status === "suggested" && (
                                <>
                                  <Button
                                    onClick={() =>
                                      updateMeetingStatus.mutate({
                                        id: meeting.id,
                                        status: "confirmed",
                                      })
                                    }
                                    variant="default"
                                    size="sm"
                                    className="gap-1"
                                  >
                                    <Check className="w-4 h-4" />
                                    Confirm
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      updateMeetingStatus.mutate({
                                        id: meeting.id,
                                        status: "declined",
                                      })
                                    }
                                    variant="destructive"
                                    size="sm"
                                    className="gap-1"
                                  >
                                    <X className="w-4 h-4" />
                                    Decline
                                  </Button>
                                </>
                              )}
                              <Button
                                onClick={() => deleteMeeting.mutate({ id: meeting.id })}
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No meetings generated yet. Click "Generate AI Matches" to start.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
