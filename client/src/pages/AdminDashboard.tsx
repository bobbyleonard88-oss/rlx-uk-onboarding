/**
 * Admin Dashboard - CS Team Consolidated View
 * Shows all sponsor data: intake forms, rankings, priorities
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, RefreshCw, Users, Calendar, CheckCircle, FileText, List, Archive, ArchiveRestore, AlertCircle, LogOut, User, LogIn, Eye } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { attendees } from "@/lib/attendees";
import { useState } from "react";
import IntakeProfileModal from "@/components/IntakeProfileModal";
import RankingsPreviewModal from "@/components/RankingsPreviewModal";
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
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [rankingsModalOpen, setRankingsModalOpen] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState<any>(null);
  const [selectedRankings, setSelectedRankings] = useState<{ data: string; companyName: string } | null>(null);
  
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

  const removePriorityTag = trpc.admin.removePriorityTag.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Priority delegate removed");
    },
  });

  // Check if user is not logged in
  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Card className="max-w-md glass-card">
          <CardHeader>
            <CardTitle className="text-white text-center">Admin Portal</CardTitle>
            <CardDescription className="text-slate-300 text-center">
              Please log in to access the RLX admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
              className="bg-accent hover:bg-accent/90 text-white gap-2 px-8"
            >
              <LogIn className="w-5 h-5" />
              Login / Register
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is admin
  if (!loading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Card className="max-w-md glass-card">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-slate-300">
              You do not have permission to access this page. Only administrators can view the admin dashboard.
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              className="gap-2"
            >
              {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>
          </div>
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
                          setSelectedIntake({
                            data: (submission as any).intakeData,
                            companyName: submission.companyName
                          });
                          setIntakeModalOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview Profile
                      </Button>
                    )}
                    {(submission as any).hasRankings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRankings({
                            data: (submission as any).rankingsData,
                            companyName: submission.companyName
                          });
                          setRankingsModalOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview Rankings
                      </Button>
                    )}
                  </div>

                  {/* Priority Tagging */}
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Priority Delegates
                      </label>
                      <span className="text-xs text-slate-400">
                        {submission.priorityDelegates?.length || 0} tagged
                      </span>
                    </div>
                    
                    {/* Currently Tagged Delegates */}
                    {submission.priorityDelegates && submission.priorityDelegates.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {submission.priorityDelegates.map((delegateId: string) => {
                          const delegate = attendees.find(a => a.id === delegateId);
                          if (!delegate) return null;
                          return (
                            <div
                              key={delegateId}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/80 rounded-full text-sm"
                            >
                              <span className="text-white font-medium">{delegate.firstName} {delegate.lastName}</span>
                              <button
                                onClick={() => {
                                  removePriorityTag.mutate({
                                    sponsorId: submission.sponsorId,
                                    attendeeId: delegateId,
                                  });
                                }}
                                className="hover:text-red-400 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Add Delegate Dropdown */}
                    <Select
                      onValueChange={(attendeeId) => {
                        addPriorityTag.mutate({
                          sponsorId: submission.sponsorId,
                          attendeeId,
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Add delegate to priority list..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {attendees
                          .filter(a => !submission.priorityDelegates?.includes(a.id))
                          .map((attendee) => (
                            <SelectItem key={attendee.id} value={attendee.id}>
                              {attendee.firstName} {attendee.lastName} - {attendee.company} ({attendee.jobTitle})
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

      {/* Preview Modals */}
      {selectedIntake && (
        <IntakeProfileModal
          open={intakeModalOpen}
          onOpenChange={setIntakeModalOpen}
          intakeData={selectedIntake.data}
          companyName={selectedIntake.companyName}
        />
      )}
      {selectedRankings && (
        <RankingsPreviewModal
          open={rankingsModalOpen}
          onOpenChange={setRankingsModalOpen}
          rankingsData={selectedRankings.data}
          companyName={selectedRankings.companyName}
          attendees={attendees}
        />
      )}
    </div>
  );
}
