/**
 * Admin Dashboard - CS Team Consolidated View
 * Shows all sponsor data: intake forms, rankings, priorities
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, RefreshCw, Users, Calendar, CheckCircle, FileText, List, Archive, ArchiveRestore, AlertCircle, LogOut, User } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [showArchived, setShowArchived] = useState(false);
  
  const { data: submissions, isLoading, refetch } = trpc.admin.getAllSubmissions.useQuery();
  const { data: delegates } = trpc.admin.getAllDelegates.useQuery();
  
  const updateStatus = trpc.admin.updateSubmissionStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status updated");
    },
  });

  const archiveSubmission = trpc.admin.archiveSubmission.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Submission archived");
    },
  });

  const unarchiveSubmission = trpc.admin.unarchiveSubmission.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Submission restored");
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

  function handleStatusToggle(submissionId: number, currentStatus: string) {
    const newStatus = currentStatus === "reviewed" ? "pending" : "reviewed";
    updateStatus.mutate({ id: submissionId, status: newStatus });
  }

  function handleArchive(submissionId: number) {
    if (confirm("Archive this submission? It will be hidden from the main view but can be restored later.")) {
      archiveSubmission.mutate({ id: submissionId });
    }
  }

  function handleUnarchive(submissionId: number) {
    unarchiveSubmission.mutate({ id: submissionId });
  }

  function downloadRankings(submission: any) {
    const rankings = JSON.parse(submission.rankingsData);
    const csvContent = [
      ["Rank", "Attendee ID", "Name", "Company", "Job Title"],
      ...rankings.map((id: string, index: number) => {
        const attendee = attendees.find((a) => a.id === id);
        return [
          index + 1,
          id,
          attendee ? `${attendee.firstName} ${attendee.lastName}` : "Unknown",
          attendee?.company || "Unknown",
          attendee?.jobTitle || "Unknown",
        ];
      }),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${submission.companyName}-rankings.csv`;
    a.click();
  }

  // Filter submissions based on archive toggle
  const filteredSubmissions = submissions?.filter(
    (sub: any) => showArchived ? sub.isArchived === 1 : sub.isArchived === 0
  );

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

      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold text-white mb-2">
              Sponsor Submissions
            </h1>
            <p className="text-lg text-slate-300">
              {filteredSubmissions?.length || 0} {showArchived ? "archived" : "active"} submissions
            </p>
          </div>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            {showArchived ? "Show Active" : "Show Archived"}
          </Button>
        </div>

        {/* Submissions Grid */}
        <div className="grid gap-6">
          {filteredSubmissions && filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="glass-card border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-2xl mb-2">
                        {submission.companyName}
                      </CardTitle>
                      <CardDescription className="text-slate-300 space-y-1">
                        <div>{submission.contactName} • {submission.contactEmail}</div>
                        <div className="text-sm text-slate-400">
                          Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={submission.status === "reviewed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusToggle(submission.id, submission.status)}
                        className="gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {submission.status === "reviewed" ? "Reviewed" : "Mark Reviewed"}
                      </Button>
                      {showArchived ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchive(submission.id)}
                          className="gap-2"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(submission.id)}
                          className="gap-2 text-slate-400 hover:text-white"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Completion Status */}
                  <div className="flex gap-2 mb-4">
                    {(submission as any).hasIntake ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Intake Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                        <AlertCircle className="w-3 h-3" />
                        Intake Missing
                      </span>
                    )}
                    {(submission as any).hasRankings ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Rankings Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                        <AlertCircle className="w-3 h-3" />
                        Rankings Missing
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {(submission as any).hasIntake && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Show intake data modal
                          alert('View Profile feature coming soon');
                        }}
                        className="gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Profile
                      </Button>
                    )}
                    {(submission as any).hasRankings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadRankings(submission)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Rankings
                      </Button>
                    )}
                  </div>

                  {/* Priority Tagging */}
                  <div className="pt-4 border-t border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Priority Delegates (who requested this sponsor)
                    </label>
                    <Select
                      onValueChange={(attendeeId) => {
                        addPriorityTag.mutate({
                          sponsorId: submission.sponsorId,
                          attendeeId,
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select delegate to tag as priority..." />
                      </SelectTrigger>
                      <SelectContent>
                        {delegates?.map((delegate) => (
                          <SelectItem key={delegate.attendeeId} value={delegate.attendeeId}>
                            {delegate.firstName} {delegate.lastName} - {delegate.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-slate-300">
                  {showArchived ? "No archived submissions" : "No submissions yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
