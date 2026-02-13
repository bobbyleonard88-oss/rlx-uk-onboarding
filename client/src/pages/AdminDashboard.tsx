/**
 * Admin Dashboard - CS Team Rankings Management
 * Only accessible to admin users
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, RefreshCw, Users, FileText, Calendar, Upload, CheckCircle } from "lucide-react";
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
  const { data: submissions, isLoading, refetch } = trpc.admin.getAllSubmissions.useQuery();
  const { data: delegates } = trpc.admin.getAllDelegates.useQuery();
  
  const updateStatus = trpc.admin.updateSubmissionStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status updated");
    },
  });

  const uploadProfile = trpc.admin.uploadVendorProfile.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Profile uploaded");
    },
  });

  const addPriorityTag = trpc.admin.addPriorityTag.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Priority tag added");
    },
  });

  const importDelegates = trpc.admin.importDelegates.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} delegates`);
    },
  });

  const [uploadingFor, setUploadingFor] = useState<number | null>(null);

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

  function downloadSubmissionCSV(submission: any) {
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
      
      toast.success("CSV downloaded");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download CSV");
    }
  }

  async function handleFileUpload(sponsorId: number, file: File) {
    setUploadingFor(sponsorId);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await uploadProfile.mutateAsync({
          sponsorId,
          fileData: base64,
          fileName: file.name,
        });
        setUploadingFor(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
      setUploadingFor(null);
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-lg text-slate-300">
            Manage sponsor submissions and matchmaking
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link href="/admin/profiles">
            <Card className="glass-card cursor-pointer hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Profiles
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/meetings">
            <Card className="glass-card cursor-pointer hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Matchmaking
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="glass-card cursor-pointer hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold" />
                  Manage Users
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Import Delegates</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => importDelegates.mutate()}
                disabled={importDelegates.isPending}
                size="sm"
                className="w-full"
              >
                {importDelegates.isPending ? "Importing..." : "Import CSV"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Sponsor Submissions</CardTitle>
                <CardDescription>
                  {submissions?.length || 0} total submissions
                </CardDescription>
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submissions && submissions.length > 0 ? (
                submissions.map((submission) => (
                  <Card key={submission.id} className="glass-card border-slate-700">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            {submission.companyName || "Unknown Company"}
                          </CardTitle>
                          <CardDescription>
                            {submission.contactName} • {submission.contactEmail}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => downloadSubmissionCSV(submission)}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download CSV
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <div className="text-muted-foreground">Submission ID</div>
                          <div className="font-medium">#{submission.id}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Submitted</div>
                          <div className="font-medium">
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Time</div>
                          <div className="font-medium">
                            {new Date(submission.submittedAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <div className="font-medium capitalize">{submission.status}</div>
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="flex flex-wrap gap-3">
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

                        <div className="relative">
                          <input
                            type="file"
                            accept=".doc,.docx,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(submission.sponsorId, file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingFor === submission.sponsorId}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadingFor === submission.sponsorId}
                            className="gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            {uploadingFor === submission.sponsorId ? "Uploading..." : "Upload Profile"}
                          </Button>
                        </div>

                        {delegates && delegates.length > 0 && (
                          <Select
                            onValueChange={(attendeeId) => {
                              addPriorityTag.mutate({
                                sponsorId: submission.sponsorId,
                                attendeeId,
                              });
                            }}
                          >
                            <SelectTrigger className="w-[200px] h-9">
                              <SelectValue placeholder="Tag Priority Delegate" />
                            </SelectTrigger>
                            <SelectContent>
                              {delegates.map((delegate) => (
                                <SelectItem key={delegate.attendeeId} value={delegate.attendeeId}>
                                  {delegate.firstName} {delegate.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
