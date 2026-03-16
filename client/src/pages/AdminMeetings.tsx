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
import { Sparkles, RefreshCw, LogOut, User, Trash2, Save, Send, Download, Zap } from "lucide-react";
import TimeSlotScheduler from "@/components/TimeSlotScheduler";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import AdminHeader from "@/components/AdminHeader";
import { useTestMode } from "@/hooks/useTestMode";

interface MatchResult {
  attendeeId: string;
  matchScore: number;
  matchReason: string;
  isPriority: boolean;
  isTopRanked: boolean;
  isTop20: boolean;
  timeSlot?: number | null;
  attendeeNumber?: number; // 1 or 2 (for 20-meeting packages)
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
  const [selectedAttendee, setSelectedAttendee] = useState<1 | 2>(1); // For 20-meeting packages
  const [replacingMeetingId, setReplacingMeetingId] = useState<number | null>(null);

  // ─── Match All Progress State ────────────────────────────────────────────────
  interface SponsorProgress {
    sponsorId: number;
    sponsorName: string;
    status: 'pending' | 'scoring' | 'saving' | 'done' | 'error';
    meetingCount?: number;
    error?: string;
  }
  const [matchProgress, setMatchProgress] = useState<{
    isVisible: boolean;
    phase: 'scoring' | 'saving' | 'done';
    totalSponsors: number;
    completedSponsors: number;
    sponsors: SponsorProgress[];
    totalMeetingsCreated?: number;
  } | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const utils = trpc.useUtils();
  const startProgressTracking = useCallback(() => {
    // Close any existing SSE connection
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

    const es = new EventSource('/api/match-progress');
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'connected') return;

        setMatchProgress(prev => {
          if (!prev && event.type !== 'start') return prev;

          if (event.type === 'start') {
            return {
              isVisible: true,
              phase: 'scoring',
              totalSponsors: event.totalSponsors ?? 0,
              completedSponsors: 0,
              sponsors: [],
            };
          }

          if (!prev) return prev;

          if (event.type === 'scoring_start') {
            return {
              ...prev,
              sponsors: [...prev.sponsors, {
                sponsorId: event.sponsorId,
                sponsorName: event.sponsorName,
                status: 'scoring',
              }],
            };
          }

          if (event.type === 'scoring_complete') {
            return {
              ...prev,
              completedSponsors: event.completedSponsors ?? prev.completedSponsors,
              sponsors: prev.sponsors.map(s =>
                s.sponsorId === event.sponsorId
                  ? { ...s, status: 'saving' as const, meetingCount: event.meetingCount }
                  : s
              ),
            };
          }

          if (event.type === 'sponsor_complete') {
            return {
              ...prev,
              phase: 'saving',
              completedSponsors: event.completedSponsors ?? prev.completedSponsors,
              sponsors: prev.sponsors.map(s =>
                s.sponsorId === event.sponsorId
                  ? { ...s, status: 'done' as const, meetingCount: event.meetingCount }
                  : s
              ),
            };
          }

          if (event.type === 'sponsor_error') {
            return {
              ...prev,
              completedSponsors: event.completedSponsors ?? prev.completedSponsors,
              sponsors: prev.sponsors.map(s =>
                s.sponsorId === event.sponsorId
                  ? { ...s, status: 'error' as const, error: event.error }
                  : s
              ),
            };
          }

          if (event.type === 'done') {
            es.close();
            sseRef.current = null;
            // Refresh the admin dashboard now that all meetings are saved
            utils.admin.getAllSubmissions.invalidate();
            // Sum up all meeting counts from completed sponsors
            const totalMeetingsCreated = prev.sponsors.reduce((sum, s) => sum + (s.meetingCount ?? 0), 0);
            return { ...prev, phase: 'done', completedSponsors: prev.totalSponsors, totalMeetingsCreated };
          }

          return prev;
        });
      } catch (_) {}
    };

    es.onerror = () => { es.close(); sseRef.current = null; };
  }, [utils]);

  // Clean up SSE on unmount
  useEffect(() => () => { sseRef.current?.close(); }, []);
  
  const includeTestAccounts = useTestMode();
  const { data: submissions } = trpc.admin.getAllSubmissions.useQuery({ includeTestAccounts });
  
  const generateMeetings = trpc.admin.generateMeetings.useMutation({
    onSuccess: (data) => {
      // Auto-assign meetings to time slots
      // 12-meeting package (1 attendee): slots 1-6 = Day 1, slots 7-12 = Day 2
      // 20-meeting package (2 attendees): 10 per attendee, slots 1-5 Day 1 + 6-10 Day 2 per attendee
      const DAY1_SLOTS_COUNT = 6; // 6 slots per day for 12-meeting package
      const DAY2_START = 7;       // Day 2 starts at slot 7
      const matchesWithSlots = data.matches.map((match, index) => {
        const is20MeetingPackage = meetingCount === 20;
        const attendeeNumber = is20MeetingPackage ? (index < 10 ? 1 : 2) : 1;
        
        // Index within this attendee's meetings
        const attendeeIndex = is20MeetingPackage ? (index < 10 ? index : index - 10) : index;
        
        let timeSlot: number | null;
        if (is20MeetingPackage) {
          // 20-meeting package: 5 slots per attendee per day
          // Attendee slots: Day 1 = slots 1-5, Day 2 = slots 7-11
          if (attendeeIndex < 5) {
            timeSlot = attendeeIndex + 1; // Day 1: slots 1-5
          } else if (attendeeIndex < 10) {
            timeSlot = (attendeeIndex - 5) + DAY2_START; // Day 2: slots 7-11
          } else {
            timeSlot = null;
          }
        } else {
          // 12-meeting package: 6 slots per day
          if (attendeeIndex < DAY1_SLOTS_COUNT) {
            timeSlot = attendeeIndex + 1; // Day 1: slots 1-6
          } else if (attendeeIndex < DAY1_SLOTS_COUNT * 2) {
            timeSlot = (attendeeIndex - DAY1_SLOTS_COUNT) + DAY2_START; // Day 2: slots 7-12
          } else {
            timeSlot = null;
          }
        }
        
        return {
          ...match,
          timeSlot,
          attendeeNumber,
        };
      });
      
      setGeneratedMatches(matchesWithSlots);
      setEditedMatches(matchesWithSlots);
      
      const message = meetingCount === 20 
        ? `Generated ${data.matches.length} meetings (10 for Attendee 1, 10 for Attendee 2) and auto-assigned to time slots!`
        : `Generated ${data.matches.length} meeting matches and auto-assigned to time slots!`;
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate meetings");
    },
  });
  
  const regenerateMatchReasons = trpc.admin.regenerateMatchReasons.useMutation({
    onSuccess: (data) => {
      toast.success(`Refreshed match reasons for ${data.updated} meetings!`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate match reasons");
    },
  });

  const clearAllMeetings = trpc.admin.clearAllMeetings.useMutation({
    onSuccess: () => {
      toast.success('All meetings cleared across all sponsors.');
      utils.admin.getAllSubmissions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to clear all meetings');
    },
  });

  const handleClearAllMeetings = () => {
    if (!confirm('This will permanently delete ALL meetings across ALL sponsors. This cannot be undone. Continue?')) return;
    clearAllMeetings.mutate();
  };

  const generateAllMeetings = trpc.admin.generateAllMeetings.useMutation({
    onSuccess: () => {
      // The mutation returns immediately (fire-and-forget); progress is tracked via SSE.
      // Invalidate after completion is handled by the SSE 'done' event.
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate all meetings");
    },
  });

  const { data: allMeetingsExport, refetch: refetchExport } = trpc.admin.getAllMeetingsExport.useQuery(
    { includeTestAccounts },
    { enabled: false }
  );

  const handleExportAllMatches = async () => {
    const result = await refetchExport();
    const rows = result.data;
    if (!rows || rows.length === 0) {
      toast.info('No meetings to export yet.');
      return;
    }
    // Build CSV
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row =>
        headers.map(h => `"${String((row as any)[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rlx-all-matches-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} meeting rows to CSV!`);
  };

  const handleMatchAllSponsors = () => {
    if (!confirm(`This will generate and save meetings for ALL sponsors (respecting test mode). This may take several minutes. Continue?`)) return;
    // Show the overlay immediately so the user gets instant visual feedback
    setMatchProgress({
      isVisible: true,
      phase: 'scoring',
      totalSponsors: 0,
      completedSponsors: 0,
      sponsors: [],
    });
    // Start SSE progress tracking BEFORE firing the mutation
    startProgressTracking();
    generateAllMeetings.mutate({ includeTestAccounts });
  };
  
  const saveMeetings = trpc.admin.saveMeetings.useMutation({
    onSuccess: () => {
      toast.success("Draft saved successfully! Click 'Publish to Sponsor' to make meetings visible.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save meetings");
    },
  });
  
  const clearMeetings = trpc.admin.clearMeetings.useMutation({
    onSuccess: () => {
      toast.success("Meetings cleared! AI matching data retained for future use.");
      setEditedMatches([]);
      setGeneratedMatches([]);
      utils.admin.getAllSubmissions.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to clear meetings");
    },
  });
  
  const publishMeetings = trpc.admin.publishMeetings.useMutation({
    onSuccess: (data) => {
      if (data.publishedCount > 0) {
        toast.success(`Published ${data.publishedCount} new meetings to sponsor!`);
      } else if (data.alreadyPublished > 0) {
        toast.success(`All ${data.totalMeetings} meetings are already published to sponsor.`);
      } else {
        toast.info('No meetings to publish.');
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish meetings");
    },
  });
  
  const toggleVisibility = trpc.admin.toggleMeetingsVisibility.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.isVisible ? "Meetings are now visible to sponsor" : "Meetings hidden from sponsor view");
      refetchSavedMeetings();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle visibility");
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
        attendeeNumber: m.attendeeNumber || 1,
      })),
    });
  };
  
  const handleClearMeetings = () => {
    if (!selectedSponsorId) return;
    
    if (!confirm('Are you sure you want to clear all meetings for this sponsor? AI matching data will be retained for future use.')) {
      return;
    }
    
    clearMeetings.mutate({ sponsorId: selectedSponsorId });
  };
  
  const handlePublishMeetings = () => {
    if (!selectedSponsorId) return;
    
    publishMeetings.mutate({
      sponsorId: selectedSponsorId,
    });
  };
  
  const handleToggleVisibility = () => {
    if (!selectedSponsorId) return;
    
    const currentVisibility = savedMeetings?.[0]?.isVisible === 1;
    toggleVisibility.mutate({
      sponsorId: selectedSponsorId,
      isVisible: !currentVisibility,
    });
  };
  
  const selectedSubmission = submissions?.find(s => s.sponsorId === selectedSponsorId);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AdminHeader />

      {/* ─── Match All Progress Overlay ─────────────────────────────────────── */}
      {matchProgress?.isVisible && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    {matchProgress.phase === 'done'
                      ? <span className="text-emerald-400 text-lg">✓</span>
                      : <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />}
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">
                      {matchProgress.phase === 'done' ? 'Matching Complete!' : 'Matching All Sponsors...'}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {matchProgress.phase === 'scoring' && 'Phase 1 of 2 — AI scoring delegates'}
                      {matchProgress.phase === 'saving' && 'Phase 2 of 2 — Saving meetings to database'}
                      {matchProgress.phase === 'done' && `${matchProgress.totalSponsors} sponsors matched successfully`}
                    </p>
                  </div>
                </div>
                {matchProgress.phase === 'done' && (
                  <button
                    onClick={() => setMatchProgress(null)}
                    className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{matchProgress.completedSponsors} of {matchProgress.totalSponsors} sponsors</span>
                  <span>{matchProgress.totalSponsors > 0 ? Math.round((matchProgress.completedSponsors / matchProgress.totalSponsors) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${matchProgress.totalSponsors > 0 ? (matchProgress.completedSponsors / matchProgress.totalSponsors) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            {/* Sponsor timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {matchProgress.sponsors.map((s) => (
                <div
                  key={s.sponsorId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                    s.status === 'done' ? 'bg-emerald-900/20 border-emerald-600/30'
                    : s.status === 'error' ? 'bg-red-900/20 border-red-600/30'
                    : s.status === 'saving' ? 'bg-blue-900/20 border-blue-600/30'
                    : 'bg-purple-900/20 border-purple-600/30 animate-pulse'
                  }`}
                >
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                    {s.status === 'done' && <span className="text-emerald-400 text-sm">✓</span>}
                    {s.status === 'error' && <span className="text-red-400 text-sm">✗</span>}
                    {s.status === 'saving' && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
                    {s.status === 'scoring' && <Sparkles className="w-3 h-3 text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.sponsorName}</p>
                    <p className="text-xs text-slate-400">
                      {s.status === 'scoring' && 'Scoring delegates...'}
                      {s.status === 'saving' && 'Saving meetings...'}
                      {s.status === 'done' && `${s.meetingCount ?? 0} meetings saved`}
                      {s.status === 'error' && (s.error ?? 'Failed')}
                    </p>
                  </div>
                  {s.status === 'done' && s.meetingCount !== undefined && (
                    <span className="text-xs font-bold text-emerald-400 flex-shrink-0">{s.meetingCount}</span>
                  )}
                </div>
              ))}
              {matchProgress.phase !== 'done' && matchProgress.sponsors.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Preparing sponsors...</p>
                </div>
              )}
            </div>
            {/* Total meetings counter — shown when done */}
            {matchProgress.phase === 'done' && matchProgress.totalMeetingsCreated !== undefined && (
              <div className="border-t border-slate-700 p-4 bg-emerald-900/20">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm font-medium">Total meetings created</span>
                  <span className="text-2xl font-bold text-emerald-400">{matchProgress.totalMeetingsCreated}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Across {matchProgress.totalSponsors} sponsors · {matchProgress.sponsors.filter(s => s.status === 'done').length} matched successfully
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="container mx-auto p-6 space-y-6 max-w-full overflow-x-hidden">
        {/* Sponsor Selection */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Meetings
            </CardTitle>
            <CardDescription className="text-slate-300">
              Select a sponsor and generate intelligent meeting matches based on opt-in meetings, challenge alignment, and rankings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sponsor Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Select Sponsor</label>
                <Select
                  value={selectedSponsorId?.toString() || ""}
                  onValueChange={async (value) => {
                    const sponsorId = parseInt(value);
                    setSelectedSponsorId(sponsorId);
                    
                    // CRITICAL: Clear state immediately to prevent cross-sponsor contamination
                    setGeneratedMatches([]);
                    setEditedMatches([]);
                    
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
                            matchReason: meeting.matchReason || '',
                            isPriority: meeting.isPriority === 1,
                            isTopRanked: meeting.isTopRanked === 1,
                            isTop20: meeting.isTopRanked === 1, // Assuming isTopRanked maps to isTop20
                            timeSlot: meeting.timeSlot,
                            attendeeNumber: meeting.attendeeNumber || 1, // Load attendeeNumber from database
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
                      ?.map((submission) => {
                        // Check if submission was updated in last 48 hours
                        const submittedDate = new Date(submission.submittedAt);
                        const now = new Date();
                        const hoursSinceSubmission = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
                        const isRecent = hoursSinceSubmission <= 48;
                        
                        return (
                          <SelectItem key={submission.sponsorId} value={submission.sponsorId.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{submission.companyName} - {submission.contactEmail}</span>
                              {isRecent && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                                  Updated
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
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
                    <SelectItem value="12">12 Meetings (1 attendee)</SelectItem>
                    <SelectItem value="20">20 Meetings (2 attendees)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
            </div>

            {/* Row 2: Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Generate Meetings */}
              <Button
                onClick={handleGenerateMeetings}
                disabled={!selectedSponsorId || generateMeetings.isPending}
                className="bg-primary hover:bg-primary/90"
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

              {/* Match All Sponsors */}
              <Button
                onClick={handleMatchAllSponsors}
                disabled={generateAllMeetings.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generateAllMeetings.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Matching all...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Match All Sponsors
                  </>
                )}
              </Button>

              {/* Clear All Meetings */}
              <Button
                onClick={handleClearAllMeetings}
                disabled={clearAllMeetings.isPending}
                variant="outline"
                className="border-red-500/50 text-red-300 hover:bg-red-500/10"
              >
                {clearAllMeetings.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Meetings
                  </>
                )}
              </Button>

              {/* Export All Matches */}
              <Button
                onClick={handleExportAllMatches}
                variant="outline"
                className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export All Matches (CSV)
              </Button>
            </div>

            

          </CardContent>
        </Card>
        
        {/* Selected Sponsor Info */}
        {selectedSubmission && (
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-start gap-4">
                {selectedSubmission.intakeData?.companyLogoUrl && (
                  <img
                    src={selectedSubmission.intakeData.companyLogoUrl}
                    alt={`${selectedSubmission.companyName} logo`}
                    className="w-16 h-16 object-contain rounded-md bg-white/10 p-2"
                    onError={(e) => {
                      // Hide image if it fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1">
                  <CardTitle className="text-white">{selectedSubmission.companyName}</CardTitle>
                  <CardDescription className="text-slate-300">
                    {selectedSubmission.contactName} • {selectedSubmission.contactEmail}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-8">
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-slate-400">Meeting Package:</span>
                  <span className="ml-2 text-white font-medium">
                    {selectedSubmission.intakeData?.meetingPackage || "Not set"} meetings
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Opt In Meetings:</span>
                  <span className="ml-2 text-white font-medium">
                    {selectedSubmission.priorityDelegates?.length || 0} opted in
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
                <div className="flex gap-2">
                  <Button
                    onClick={handleClearMeetings}
                    disabled={clearMeetings.isPending || !selectedSponsorId || editedMatches.length === 0}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-950"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Meetings
                  </Button>
                  <Button
                    onClick={handleSaveMeetings}
                    disabled={saveMeetings.isPending}
                    variant="outline"
                    className="border-slate-600 text-slate-200 hover:bg-slate-800"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={handlePublishMeetings}
                    disabled={publishMeetings.isPending || !selectedSponsorId}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Publish to Sponsor
                  </Button>
                </div>
              </div>
              
              {/* Visibility Toggle - Only show if meetings are published (confirmed status) */}
              {savedMeetings && savedMeetings.length > 0 && savedMeetings.some(m => m.status === 'confirmed') && (
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 mt-4">
                  <input
                    type="checkbox"
                    id="visibility-toggle"
                    checked={savedMeetings[0]?.isVisible === 1}
                    onChange={handleToggleVisibility}
                    className="w-5 h-5 rounded border-slate-600 text-primary focus:ring-primary focus:ring-offset-slate-900"
                  />
                  <label htmlFor="visibility-toggle" className="text-slate-200 text-sm font-medium cursor-pointer">
                    Show meetings to sponsor (toggle off to temporarily hide from sponsor view)
                  </label>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Attendee Tab Switcher for 20-meeting packages */}
              {meetingCount === 20 && (() => {
                const intake = submissions?.find(s => s.sponsorId === selectedSponsorId)?.intakeData;
                const attendee1Name = intake ? `${intake.firstName} ${intake.lastName}` : "Attendee 1";
                const attendee2Name = intake?.secondRepName || "Attendee 2";
                
                return (
                  <div className="mb-6 flex gap-2 border-b border-slate-700">
                    <Button
                      variant={selectedAttendee === 1 ? "default" : "ghost"}
                      onClick={() => setSelectedAttendee(1)}
                      className={selectedAttendee === 1 ? "bg-primary" : "text-slate-300 hover:text-white"}
                    >
                      {attendee1Name} ({editedMatches.filter(m => m.attendeeNumber === 1).length} meetings)
                    </Button>
                    <Button
                      variant={selectedAttendee === 2 ? "default" : "ghost"}
                      onClick={() => setSelectedAttendee(2)}
                      className={selectedAttendee === 2 ? "bg-primary" : "text-slate-300 hover:text-white"}
                    >
                      {attendee2Name} ({editedMatches.filter(m => m.attendeeNumber === 2).length} meetings)
                    </Button>
                  </div>
                );
              })()}
              
              <TimeSlotScheduler
                meetings={editedMatches
                  .filter(match => meetingCount === 20 ? match.attendeeNumber === selectedAttendee : true)
                  .map((match, index) => ({
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
                onAddDelegate={async (attendeeId, slot) => {
                  // Find delegate info
                  const delegate = attendees.find(a => a.id === attendeeId);
                  if (!delegate) return;
                  
                  // If replacing, remove the old meeting first
                  if (replacingMeetingId !== null) {
                    setEditedMatches(prev => prev.filter((_, index) => index !== replacingMeetingId));
                    setReplacingMeetingId(null);
                  }
                  
                  // For 20-meeting packages, assign to current selected attendee
                  const attendeeNumber = meetingCount === 20 ? selectedAttendee : 1;
                  
                  // Fetch delegate's actual match score and reasoning
                  let matchScore = 0;
                  let matchReason = "Manually added";
                  let isPriority = false;
                  let isTopRanked = false;
                  let isTop20 = false;
                  
                  try {
                    const delegateScores = await utils.admin.calculateDelegateScores.fetch({
                      sponsorId: selectedSponsorId!,
                    });
                    
                    const delegateScore = delegateScores.find(s => s.attendeeId === attendeeId);
                    if (delegateScore) {
                      matchScore = delegateScore.matchScore;
                      matchReason = delegateScore.matchReason;
                      // Note: isPriority, isTopRanked, isTop20 are not returned by calculateDelegateScores
                      // These are calculated during generateMeetings, so we'll leave them as false for manually added delegates
                    }
                  } catch (error) {
                    console.error('Failed to fetch delegate scores:', error);
                  }
                  
                  // Create new match result
                  const newMatch: MatchResult = {
                    attendeeId: delegate.id,
                    matchScore,
                    matchReason,
                    isPriority,
                    isTopRanked,
                    isTop20,
                    timeSlot: slot,
                    attendeeNumber,
                    delegateInfo: {
                      firstName: delegate.firstName,
                      lastName: delegate.lastName,
                      company: delegate.company,
                      jobTitle: delegate.jobTitle,
                      currentMeetingCount: 0,
                    },
                  };
                  
                  setEditedMatches(prev => [...prev, newMatch]);
                  toast.success(replacingMeetingId !== null 
                    ? `Replaced with ${delegate.firstName} ${delegate.lastName}`
                    : `Added ${delegate.firstName} ${delegate.lastName} to schedule`);
                }}
                onReplaceMeeting={(meetingId) => {
                  setReplacingMeetingId(meetingId);
                  toast.info("Drag a delegate from the list to replace this meeting");
                }}
                sponsorId={selectedSponsorId}
                sponsorData={selectedSponsorId ? {
                  companyName: submissions?.find(s => s.sponsorId === selectedSponsorId)?.companyName || '',
                  solutions: submissions?.find(s => s.sponsorId === selectedSponsorId)?.intakeData?.companyBoilerplate || '',
                  painPointsSolved: submissions?.find(s => s.sponsorId === selectedSponsorId)?.intakeData?.keyChallenges || '',
                  targetOrgSize: submissions?.find(s => s.sponsorId === selectedSponsorId)?.intakeData?.targetOrgSize || '',
                  targetIndustries: submissions?.find(s => s.sponsorId === selectedSponsorId)?.intakeData?.targetIndustries || '',
                } : null}
                attendeeNames={selectedSponsorId ? {
                  attendee1Name: (() => {
                    const intake = submissions?.find(s => s.sponsorId === selectedSponsorId)?.intakeData;
                    if (!intake) return undefined;
                    return `${intake.firstName} ${intake.lastName} (${intake.companyName})`;
                  })(),
                  attendee2Name: (() => {
                    const intake = submissions?.find(s => s.sponsorId === selectedSponsorId)?.intakeData;
                    if (!intake?.secondRepName) return undefined;
                    return `${intake.secondRepName} (${intake.companyName})`;
                  })(),
                } : null}
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
