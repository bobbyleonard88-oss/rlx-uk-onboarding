/**
 * Admin Dashboard - CS Team Rankings Management
 * Only accessible to admin users
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";

export default function AdminDashboard() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: submissions, isLoading, refetch } = trpc.admin.getAllSubmissions.useQuery();

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
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const filename = `${submission.companyName?.replace(/[^a-z0-9]/gi, '_')}_rankings_${submission.id}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download CSV");
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
            Rankings Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            View and download all sponsor rankings submissions
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-muted-foreground">
            {submissions?.length || 0} total submissions
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {submissions && submissions.length > 0 ? (
            submissions.map((submission) => (
              <Card key={submission.id} className="glass-card">
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
                    <Button
                      onClick={() => downloadSubmissionCSV(submission)}
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No submissions yet. Submissions will appear here once sponsors submit their rankings.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
