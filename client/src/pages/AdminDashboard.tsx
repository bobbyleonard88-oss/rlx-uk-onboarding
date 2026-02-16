/**
 * Admin Dashboard - CS Team Consolidated View
 * Shows all sponsor data: intake forms, rankings, priorities
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, RefreshCw, Users, Calendar, CheckCircle, FileText, List } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: submissions, isLoading, refetch } = trpc.admin.getAllSubmissions.useQuery();
  const { data: delegates } = trpc.admin.getAllDelegates.useQuery();
  
  const updateStatus = trpc.admin.updateSubmissionStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status updated");
    },
  });

  const addPriorityTag = trpc.admin.addPriorityTag.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Priority delegate tagged");
    },
  });

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

  function downloadRankingsCSV(submission: any) {
    try {
      const rankingsData = JSON.parse(submission.rankingsData);
      
      // Map IDs to attendee details
      const rankedAttendees = rankingsData
        .map((id: string) => attendees.find((a) => a.id === id))
        .filter(Boolean);

      // Create CSV content
      const csvHeader = "Rank,First Name,Last Name,Job Title,Company,Industry,Company Size\n";
      const csvRows = rankedAttendees
        .map((a: any, i: number) => 
          `${i + 1},"${a.firstName}","${a.lastName}","${a.jobTitle}","${a.company}","${a.industry}","${a.companySize}"`
        )
        .join('\n');

      const csvContent = csvHeader + csvRows;

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${submission.companyName || 'submission'}-rankings-${submission.id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Rankings CSV downloaded");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download CSV");
    }
  }

  function downloadIntakeProfile(submission: any) {
    // TODO: Fetch intake submission and generate Word doc
    toast.info("Profile download coming soon");
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
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
                  <Button variant="ghost" className="text-white hover:bg-primary/20">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/meetings">
                  <Button variant="ghost" className="text-slate-300 hover:bg-primary/20 hover:text-white">
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
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-white mb-2">
            Sponsor Submissions
          </h1>
          <p className="text-lg text-slate-300">
            {submissions?.length || 0} total submissions • View intake forms, rankings, and manage priorities
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Total Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{submissions?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                Reviewed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                {submissions?.filter(s => s.status === "reviewed").length || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                Delegates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{delegates?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <div className="space-y-6">
          {submissions && submissions.length > 0 ? (
            submissions.map((submission) => (
              <Card key={submission.id} className="glass-card border-slate-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-2xl text-white mb-2">
                        {submission.companyName || "Unknown Company"}
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        {submission.contactName} • {submission.contactEmail}
                      </CardDescription>
                      <div className="flex gap-4 mt-3 text-sm text-slate-400">
                        <div>
                          <span className="text-slate-500">Submitted:</span>{" "}
                          {new Date(submission.submittedAt).toLocaleDateString()} at{" "}
                          {new Date(submission.submittedAt).toLocaleTimeString()}
                        </div>
                        <div>
                          <span className="text-slate-500">ID:</span> #{submission.id}
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span>{" "}
                          <span className={`capitalize ${submission.status === "reviewed" ? "text-accent" : "text-slate-400"}`}>
                            {submission.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <Button
                      onClick={() => updateStatus.mutate({ 
                        id: submission.id, 
                        status: submission.status === "reviewed" ? "pending" : "reviewed" 
                      })}
                      variant={submission.status === "reviewed" ? "default" : "outline"}
                      size="sm"
                      disabled={updateStatus.isPending}
                      className="gap-2"
                    >
                      {submission.status === "reviewed" ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Reviewed
                        </>
                      ) : (
                        "Mark Reviewed"
                      )}
                    </Button>

                    <Button
                      onClick={() => downloadIntakeProfile(submission)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View/Download Profile
                    </Button>

                    <Button
                      onClick={() => downloadRankingsCSV(submission)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <List className="w-4 h-4" />
                      Download Rankings
                    </Button>

                    {delegates && delegates.length > 0 && (
                      <Select
                        onValueChange={(attendeeId) => {
                          addPriorityTag.mutate({
                            sponsorId: submission.sponsorId,
                            attendeeId,
                          });
                        }}
                      >
                        <SelectTrigger className="w-[240px] h-9">
                          <SelectValue placeholder="Tag Priority Delegate" />
                        </SelectTrigger>
                        <SelectContent>
                          {delegates.map((delegate) => (
                            <SelectItem key={delegate.attendeeId} value={delegate.attendeeId}>
                              {delegate.firstName} {delegate.lastName} ({delegate.company})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Rankings Preview */}
                  {submission.rankingsData && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <p className="text-sm text-slate-400 mb-2">
                        <strong className="text-white">Rankings:</strong> {JSON.parse(submission.rankingsData).length} delegates prioritized
                      </p>
                      <p className="text-xs text-slate-500">
                        Click "Download Rankings" to see full list
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No submissions yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
