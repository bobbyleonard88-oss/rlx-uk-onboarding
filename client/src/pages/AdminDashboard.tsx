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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminHeader from "@/components/AdminHeader";
import { useTestMode } from "@/hooks/useTestMode";

export default function AdminDashboard() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const includeTestAccounts = useTestMode();
  const [showArchived, setShowArchived] = useState(false);
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [rankingsModalOpen, setRankingsModalOpen] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState<any>(null);
  const [selectedRankings, setSelectedRankings] = useState<{ data: string; companyName: string } | null>(null);
  const [openCombobox, setOpenCombobox] = useState<Record<number, boolean>>({});
  
  const { data: submissions, isLoading, refetch } = trpc.admin.getAllSubmissions.useQuery({ includeTestAccounts });
  const { data: delegates } = trpc.admin.getAllDelegates.useQuery();
  const { refetch: fetchExport, isFetching: isExporting } = trpc.admin.exportAllSubmissions.useQuery(
    undefined,
    { enabled: false }
  );

  const handleDownloadAll = async () => {
    const result = await fetchExport();
    const rows = result.data;
    if (!rows || rows.length === 0) {
      toast.error('No submissions to export');
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: string) => '"' + (v ?? '').replace(/"/g, '""') + '"';
    const csvLines = [
      headers.map(escape).join(','),
      ...rows.map((row: Record<string, string>) => headers.map(h => escape(row[h] ?? '')).join(','))
    ];
    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rlx-all-submissions-' + new Date().toISOString().split('T')[0] + '.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    toast.success('Downloaded ' + rows.length + ' sponsor submissions');
  };
  
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
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
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
      <AdminHeader />

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
              onClick={handleDownloadAll}
              className="gap-2 border-purple-600 text-purple-300 hover:bg-purple-900/30"
              disabled={isExporting}
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
              {isExporting ? 'Preparing...' : 'Download All'}
            </Button>
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
                        {submission.status === "reviewed" && submission.reviewedBy && (
                          <div className="text-sm text-green-400/80 flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3" />
                            Reviewed by {submission.reviewedBy}
                            {submission.reviewedAt && (
                              <span className="text-slate-500"> · {new Date(submission.reviewedAt).toLocaleString()}</span>
                            )}
                          </div>
                        )}
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
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(submission.id)}
                            className="gap-2 text-slate-400 hover:text-white"
                          >
                            <Archive className="w-4 h-4" />
                            Archive
                          </Button>

                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Completion Status */}
                  <div className="flex gap-2 mb-4">
                    {(submission as any).hasIntake ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                        <CheckCircle className="w-3 h-3" />
                        Intake Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">
                        <AlertCircle className="w-3 h-3" />
                        Intake Missing
                      </span>
                    )}
                    {(submission as any).hasRankings ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                        <CheckCircle className="w-3 h-3" />
                        Rankings Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">
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
                      <span className="text-sm text-slate-400">
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
                    
                    {/* Add Delegate Dropdown - Searchable */}
                    <Popover 
                      open={openCombobox[submission.sponsorId] || false} 
                      onOpenChange={(open) => setOpenCombobox(prev => ({ ...prev, [submission.sponsorId]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between text-slate-300 hover:text-white"
                        >
                          Add delegate to priority list...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search delegates..." />
                          <CommandEmpty>No delegate found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-auto">
                            {attendees
                              .filter(a => !submission.priorityDelegates?.includes(a.id))
                              .map((attendee) => (
                                <CommandItem
                                  key={attendee.id}
                                  value={`${attendee.firstName} ${attendee.lastName} ${attendee.company} ${attendee.jobTitle}`}
                                  onSelect={() => {
                                    addPriorityTag.mutate({
                                      sponsorId: submission.sponsorId,
                                      attendeeId: attendee.id,
                                    });
                                    setOpenCombobox(prev => ({ ...prev, [submission.sponsorId]: false }));
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{attendee.firstName} {attendee.lastName}</span>
                                    <span className="text-sm text-slate-400">{attendee.company} • {attendee.jobTitle}</span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
