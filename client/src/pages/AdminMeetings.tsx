/**
 * Admin Meetings Management
 * Intelligent meeting generation with priority-based matching
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw, LogOut, User, Trash2, Save } from "lucide-react";
import TimeSlotScheduler from "@/components/TimeSlotScheduler";
import { useState } from "react";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

interface MatchResult {
  attendeeId: string;
  matchScore: number;
  matchReason: string;
  isPriority: boolean;
  isTopRanked: boolean;
  isTop20: boolean;
  timeSlot?: number | null;
  delegateInfo: {
    firstName: string;
    lastName: string;
    company: string;
    jobTitle: string;
    currentMeetingCount: number;
  };
}

export default function AdminMeetings() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  
  const [selectedSponsorId, setSelectedSponsorId] = useState<number | null>(null);
  const [meetingCount, setMeetingCount] = useState<number>(12);
  const [generatedMatches, setGeneratedMatches] = useState<MatchResult[]>([]);
  const [editedMatches, setEditedMatches] = useState<MatchResult[]>([]);
  
  const { data: submissions } = trpc.admin.getAllSubmissions.useQuery();
  const utils = trpc.useUtils();
  
  const generateMeetings = trpc.admin.generateMeetings.useMutation({
    onSuccess: (data) => {
      // Auto-assign meetings to time slots based on match score
      const matchesWithSlots = data.matches.map((match, index) => {
        // Assign to slots 1-6 (max 2 meetings per slot)
        const slotNumber = Math.floor(index / 2) + 1;
        return {
          ...match,
          timeSlot: slotNumber <= 6 ? slotNumber : null, // Only assign first 12 meetings to slots
        };
      });
      
      setGeneratedMatches(matchesWithSlots);
      setEditedMatches(matchesWithSlots);
      toast.success(`Generated ${data.matches.length} meeting matches and auto-assigned to time slots!`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate meetings");
    },
  });
  
  const generateAllMeetings = trpc.admin.generateAllMeetings.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated meetings for ${data.results.length} sponsors!`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate all meetings");
    },
  });
  
  const saveMeetings = trpc.admin.saveMeetings.useMutation({
    onSuccess: () => {
      // Set flag for sponsor to show Meeting Schedule tab
      localStorage.setItem('rlx-has-meetings', 'true');
      // Clear notification flags so sponsor sees the popup
      localStorage.removeItem('rlx-meetings-viewed');
      localStorage.removeItem('rlx-meetings-notification-seen');
      toast.success("Meetings saved successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save meetings");
    },
  });
  
  const { data: savedMeetings, refetch: refetchSavedMeetings } = trpc.admin.getMeetingsBySponsor.useQuery(
    { sponsorId: selectedSponsorId! },
    { enabled: !!selectedSponsorId }
  );
  
  // Check if user is admin
  if (!loading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Card className="max-w-md glass-card">
          <CardHeader>
            <CardTitle className="text-white text-center">Access Denied</CardTitle>
            <CardDescription className="text-slate-300 text-center">
              This page is only accessible to administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const handleGenerateMeetings = () => {
    if (!selectedSponsorId) {
      toast.error("Please select a sponsor first");
      return;
    }
    
    generateMeetings.mutate({
      sponsorId: selectedSponsorId,
      meetingCount,
    });
  };
  
  const handleRemoveMatch = (attendeeId: string) => {
    setEditedMatches(editedMatches.filter(m => m.attendeeId !== attendeeId));
    toast.success("Match removed");
  };
  
  const handleSaveMeetings = () => {
    if (!selectedSponsorId) return;
    
    saveMeetings.mutate({
      sponsorId: selectedSponsorId,
      meetings: editedMatches.map(m => ({
        attendeeId: m.attendeeId,
        matchScore: m.matchScore,
        matchReason: m.matchReason,
        isPriority: m.isPriority,
        isTopRanked: m.isTopRanked,
        timeSlot: m.timeSlot || null,
      })),
    });
  };
  
  const selectedSubmission = submissions?.find(s => s.sponsorId === selectedSponsorId);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white">RLX Admin</h1>
          </div>
          
          {/* Admin Navigation */}
          <nav className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/meetings">
              <Button variant="default" className="bg-primary">
                Meetings
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Users
              </Button>
            </Link>
          </nav>
          
          <div className="flex-1"></div>
          
          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Sponsor Selection */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Meetings
            </CardTitle>
            <CardDescription className="text-slate-300">
              Select a sponsor and generate intelligent meeting matches based on priority delegates, challenge alignment, and rankings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sponsor Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Select Sponsor</label>
                <Select
                  value={selectedSponsorId?.toString() || ""}
                  onValueChange={async (value) => {
                    const sponsorId = parseInt(value);
                    setSelectedSponsorId(sponsorId);
                    
                    // Auto-set meeting count from intake form
                    const submission = submissions?.find(s => s.sponsorId === sponsorId);
                    if (submission?.intakeData?.meetingPackage) {
                      setMeetingCount(parseInt(submission.intakeData.meetingPackage));
                    }
                    
                    // Try to load existing meetings for this sponsor
                    try {
                      const existingMeetings = await utils.admin.getMeetingsBySponsor.fetch({ sponsorId });
                      
                      if (existingMeetings && existingMeetings.length > 0) {
                        // Convert existing meetings to MatchResult format
                        const matchResults: MatchResult[] = existingMeetings.map((meeting: any) => {
                          const delegate = attendees.find(a => a.id === meeting.attendeeId);
                          return {
                            attendeeId: meeting.attendeeId,
                            matchScore: meeting.matchScore || 0,
                            matchReason: meeting.notes || '',
                            isPriority: meeting.isPriority === 1,
                            isTopRanked: meeting.isTopRanked === 1,
                            isTop20: meeting.isTopRanked === 1, // Assuming isTopRanked maps to isTop20
                            timeSlot: meeting.timeSlot,
                            delegateInfo: delegate ? {
                              firstName: delegate.firstName,
                              lastName: delegate.lastName,
                              company: delegate.company,
                              jobTitle: delegate.jobTitle,
                              currentMeetingCount: 0, // Will be calculated if needed
                            } : {
                              firstName: 'Unknown',
                              lastName: 'Delegate',
                              company: 'N/A',
                              jobTitle: 'N/A',
                              currentMeetingCount: 0,
                            },
                          };
                        });
                        
                        setGeneratedMatches(matchResults);
                        setEditedMatches(matchResults);
                        toast.success(`Loaded ${existingMeetings.length} existing meetings`);
                      } else {
                        // No existing meetings, clear the state
                        setGeneratedMatches([]);
                        setEditedMatches([]);
                      }
                    } catch (error) {
                      console.error('Failed to load existing meetings:', error);
                      setGeneratedMatches([]);
                      setEditedMatches([]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a sponsor..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {submissions
                      ?.filter(s => s.hasIntake && !s.isArchived) // Only show non-archived sponsors with intake forms
                      ?.map((submission) => (
                        <SelectItem key={submission.sponsorId} value={submission.sponsorId.toString()}>
                          {submission.companyName} - {submission.contactEmail}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Meeting Count Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Meeting Count</label>
                <Select
                  value={meetingCount.toString()}
                  onValueChange={(value) => setMeetingCount(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 Meetings</SelectItem>
                    <SelectItem value="20">20 Meetings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Generate Button */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 opacity-0">Action</label>
                <Button
                  onClick={handleGenerateMeetings}
                  disabled={!selectedSponsorId || generateMeetings.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {generateMeetings.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Meetings
                    </>
                  )}
                </Button>
              </div>
            </div>
            

          </CardContent>
        </Card>
        
        {/* Selected Sponsor Info */}
        {selectedSubmission && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">{selectedSubmission.companyName}</CardTitle>
              <CardDescription className="text-slate-300">
                {selectedSubmission.contactName} • {selectedSubmission.contactEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Meeting Package:</span>
                  <span className="ml-2 text-white font-medium">
                    {selectedSubmission.intakeData?.meetingPackage || "Not set"} meetings
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Priority Delegates:</span>
                  <span className="ml-2 text-white font-medium">
                    {selectedSubmission.priorityDelegates?.length || 0} tagged
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Has Rankings:</span>
                  <Badge variant={selectedSubmission.hasRankings ? "default" : "secondary"} className="ml-2">
                    {selectedSubmission.hasRankings ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Time Slot Scheduler */}
        {editedMatches.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">
                    Meeting Schedule ({editedMatches.length} meetings)
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Drag and drop meetings to assign time slots
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveMeetings}
                  disabled={saveMeetings.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TimeSlotScheduler
                meetings={editedMatches.map((match, index) => ({
                  id: index,
                  attendeeId: match.attendeeId,
                  delegateName: `${match.delegateInfo.firstName} ${match.delegateInfo.lastName}`,
                  company: match.delegateInfo.company,
                  jobTitle: match.delegateInfo.jobTitle,
                  matchScore: match.matchScore,
                  matchReason: match.matchReason,
                  isPriority: match.isPriority,
                  isTop20: match.isTop20,
                  timeSlot: match.timeSlot || null,
                }))}
                onUpdateSlot={(meetingId, newSlot) => {
                  setEditedMatches(prev => prev.map((match, index) => 
                    index === meetingId ? { ...match, timeSlot: newSlot } : match
                  ));
                }}
                onRemoveMeeting={(meetingId) => {
                  setEditedMatches(prev => prev.filter((_, index) => index !== meetingId));
                }}
                onAddDelegate={(attendeeId, slot) => {
                  // Find delegate info
                  const delegate = attendees.find(a => a.id === attendeeId);
                  if (!delegate) return;
                  
                  // Create new match result
                  const newMatch: MatchResult = {
                    attendeeId: delegate.id,
                    matchScore: 0,
                    matchReason: "Manually added",
                    isPriority: false,
                    isTopRanked: false,
                    isTop20: false,
                    timeSlot: slot,
                    delegateInfo: {
                      firstName: delegate.firstName,
                      lastName: delegate.lastName,
                      company: delegate.company,
                      jobTitle: delegate.jobTitle,
                      currentMeetingCount: 0,
                    },
                  };
                  
                  setEditedMatches(prev => [...prev, newMatch]);
                  toast.success(`Added ${delegate.firstName} ${delegate.lastName} to schedule`);
                }}
              />
            </CardContent>
          </Card>
        )}
        
        {/* Empty State */}
        {!selectedSponsorId && (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-400 mb-2">
                Select a sponsor to begin
              </h3>
              <p className="text-sm text-slate-500">
                Choose a sponsor from the dropdown above to generate intelligent meeting matches
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
