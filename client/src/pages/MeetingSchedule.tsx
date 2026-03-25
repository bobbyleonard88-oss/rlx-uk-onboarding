/**
 * Meeting Schedule - Sponsor View
 * Shows sponsor's confirmed meeting schedule with delegate profiles
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Download, FileText, Clock, Building2, User, ChevronDown, Eye, AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/PageHeader";
import DelegateProfileModal from "@/components/DelegateProfileModal";
import { useState } from "react";
import { toast } from "sonner";
// attendees data now fetched server-side via sponsor.getDelegates
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 12 slots total — 6 per day, 2 × 30-min slots per 1-hour meeting block
// Day 1 (Event Day 2): slots 1-6 | Day 2 (Event Day 3): slots 7-12
const TIME_SLOTS = [
  // Day 1 (Event Day 2 - Wed 25 Mar)
  { day: 1, slot: 1, label: "10:15 – 10:45" },
  { day: 1, slot: 2, label: "10:45 – 11:15" },
  { day: 1, slot: 3, label: "13:30 – 14:00" },
  { day: 1, slot: 4, label: "14:00 – 14:30" },
  { day: 1, slot: 5, label: "14:45 – 15:15" },
  { day: 1, slot: 6, label: "15:15 – 15:45" },
  // Day 2 (Event Day 3)
  { day: 2, slot: 7, label: "10:30 – 11:00" },
  { day: 2, slot: 8, label: "11:00 – 11:30" },
  { day: 2, slot: 9, label: "13:15 – 13:45" },
  { day: 2, slot: 10, label: "13:45 – 14:15" },
  { day: 2, slot: 11, label: "14:30 – 15:00" },
  { day: 2, slot: 12, label: "15:00 – 15:30" },
];

export default function MeetingSchedule() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [selectedDelegate, setSelectedDelegate] = useState<any>(null);
  const [selectedMatchReason, setSelectedMatchReason] = useState<string | undefined>(undefined);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Pre-event contact agreement — persisted in localStorage so it survives page refresh
  const AGREEMENT_KEY = 'rlx_pre_event_agreement_accepted';
  const [agreementAccepted, setAgreementAccepted] = useState<boolean>(
    () => localStorage.getItem(AGREEMENT_KEY) === 'true'
  );
  const handleAgreementChange = (checked: boolean) => {
    setAgreementAccepted(checked);
    localStorage.setItem(AGREEMENT_KEY, checked ? 'true' : 'false');
  };
  
  // Get meetings for this sponsor
  const { data: meetings, isLoading } = trpc.sponsor.getMyMeetings.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Track activity
  const trackActivity = trpc.sponsor.trackActivity.useMutation();
  
  // Get sponsor data for current user
  const { data: sponsor } = trpc.sponsor.getProfile.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Get sponsor intake data for attendee names
  const { data: intake } = trpc.sponsor.getMyIntake.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch delegate list server-side (replaces client-side attendees import)
  const { data: delegateList = [] } = trpc.sponsor.getDelegates.useQuery(
    undefined,
    { enabled: !!user }
  );
  // Helper to look up a delegate by ID
  const findDelegate = (id: string) => delegateList.find((a: any) => a.id === id);

  // Derive attendee display names from intake data
  const attendee1Name = intake ? `${intake.firstName} ${intake.lastName}` : 'Attendee 1';
  const attendee2Name = intake?.secondRepName || 'Attendee 2';

  const clean = (text: string | undefined | null) => {
    if (!text) return 'N/A';
    return text.replace(/\s*\([^)]*\)/g, '').trim() || 'N/A';
  };

  const toBullets = (text: string | undefined | null) => {
    const cleaned = clean(text);
    if (cleaned === 'N/A') return '<p style="margin:0;color:#374151;">N/A</p>';
    const lines = cleaned.split(/\n|;|,(?=\s)/).map((l: string) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return `<p style="margin:0;color:#374151;">${cleaned}</p>`;
    return `<ul style="margin:0;padding-left:18px;color:#374151;">${lines.map((l: string) => `<li style="margin-bottom:3px;">${l}</li>`).join('')}</ul>`;
  };

  const buildDelegatePdfHtml = (delegate: any) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 20mm 18mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111; background: white; font-size: 10.5pt; line-height: 1.6; }
        .doc-title { font-size: 22pt; font-weight: bold; margin-bottom: 6mm; color: #111; }
        .name { font-size: 16pt; font-weight: bold; margin-bottom: 4mm; color: #111; }
        .meta-block { margin-bottom: 6mm; }
        .meta-block p { margin-bottom: 1.5mm; font-size: 10.5pt; color: #111; }
        .meta-block strong { font-weight: bold; }
        hr { border: none; border-top: 1px solid #d1d5db; margin: 5mm 0; }
        .section { margin-bottom: 6mm; page-break-inside: avoid; }
        .section h2 { font-size: 13pt; font-weight: bold; margin-bottom: 3mm; color: #111; }
        .section .body { font-size: 10.5pt; color: #374151; line-height: 1.7; }
        .tech-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-bottom: 2mm; }
        .tech-item strong { display: block; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3pt; color: #6b7280; margin-bottom: 1mm; }
        .footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #d1d5db; font-size: 8.5pt; color: #9ca3af; text-align: center; }
      </style>
    </head>
    <body>
      <div class="doc-title">Delegate Meeting Briefing</div>
      <div class="name">${delegate.firstName} ${delegate.lastName}</div>
      <div class="meta-block">
        <p><strong>${delegate.jobTitle || ''}</strong></p>
        <p><strong>${delegate.company || ''}</strong></p>
        ${delegate.industry ? `<p><strong>Industry:</strong> ${delegate.industry}</p>` : ''}
        ${delegate.companySize ? `<p><strong>Employees:</strong> ${delegate.companySize}</p>` : ''}
        ${delegate.regionalRemit ? `<p><strong>Regions:</strong> ${delegate.regionalRemit}</p>` : ''}
        ${(delegate as any).activeBudgetRange ? `<p><strong>Active Project Budget:</strong> ${(delegate as any).activeBudgetRange}</p>` : ''}
        ${delegate.budgetAuthority ? `<p><strong>Sign-off Authority:</strong> ${delegate.budgetAuthority}</p>` : ''}
      </div>
      <hr/>
      <div class="section">
        <h2>Active Projects and Buying Intent</h2>
        <div class="body">
          ${(delegate as any).currentProjectStage ? `<p style="margin-bottom:2mm;"><strong>Stage:</strong> ${clean((delegate as any).currentProjectStage)}</p>` : ''}
          ${toBullets((delegate as any).activeConfirmedProjects)}
          ${(delegate as any).primaryMeetingObjective ? `<p style="margin-top:3mm;"><strong>Meeting Objective:</strong> ${clean((delegate as any).primaryMeetingObjective)}</p>` : ''}
        </div>
      </div>
      <hr/>
      <div class="section">
        <h2>Pain Points and Challenges</h2>
        <div class="body">${toBullets((delegate as any).currentPainPoints)}</div>
      </div>
      <hr/>
      <div class="section">
        <h2>Solution Areas of Interest</h2>
        <div class="body">${toBullets((delegate as any).keySolutionAreasOfInterest)}</div>
      </div>
      <hr/>
      <div class="section">
        <h2>Current Technology Stack</h2>
        <div class="tech-grid">
          <div class="tech-item"><strong>ATS</strong>${clean(delegate.ats)}</div>
          <div class="tech-item"><strong>CRM</strong>${clean(delegate.crm)}</div>
          <div class="tech-item"><strong>Assessment Tools</strong>${clean((delegate as any).assessmentTool)}</div>
          <div class="tech-item"><strong>Talent Intelligence</strong>${clean(delegate.marketIntelligence)}</div>
          ${delegate.otherTools ? `<div class="tech-item" style="grid-column:1/-1;"><strong>Other Tools</strong>${clean(delegate.otherTools)}</div>` : ''}
        </div>
      </div>
      <div class="footer">Resourcing Leaders Exchange &mdash; Confidential Delegate Profile &mdash; Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </body>
    </html>
  `;

  const downloadDelegateProfileCSV = (attendeeId: string) => {
    const delegate = findDelegate(attendeeId);
    if (!delegate) {
      toast.error("Delegate not found");
      return;
    }
    const headers = ['Name', 'Job Title', 'Company', 'Industry', 'Employees', 'Regions', 'Budget Authority', 'Active Project Budget', 'Sign-off Authority', 'Project Stage', 'Active Projects', 'Meeting Objective', 'Pain Points', 'Solution Areas', 'ATS', 'CRM', 'Assessment Tools', 'Talent Intelligence', 'Other Tools'];
    const row = [
      `${delegate.firstName} ${delegate.lastName}`,
      delegate.jobTitle || '',
      delegate.company || '',
      delegate.industry || '',
      delegate.companySize || '',
      delegate.regionalRemit || '',
      (delegate as any).budgetAuthority || '',
      (delegate as any).activeBudgetRange || '',
      (delegate as any).contractSignOff || '',
      (delegate as any).currentProjectStage || '',
      (delegate as any).activeConfirmedProjects || '',
      (delegate as any).primaryMeetingObjective || '',
      (delegate as any).currentPainPoints || '',
      (delegate as any).keySolutionAreasOfInterest || '',
      (delegate as any).ats || '',
      (delegate as any).crm || '',
      (delegate as any).assessmentTool || '',
      (delegate as any).marketIntelligence || '',
      (delegate as any).otherTools || '',
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`);
    const csvContent = [headers.map(h => `"${h}"`).join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${delegate.firstName}_${delegate.lastName}_Profile.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${delegate.firstName} ${delegate.lastName}'s profile downloaded`);
    trackActivity.mutate({ eventType: 'download', downloadType: 'delegate_profile_csv', downloadLabel: `${delegate.firstName} ${delegate.lastName} Profile CSV` });
  };

  const downloadAllProfilesPDF = async () => {
    if (!meetings || meetings.length === 0) {
      toast.error("No meetings to download");
      return;
    }
    const allDelegates = meetings
      .map(m => findDelegate(m.attendeeId))
      .filter((d): d is any => d !== undefined);

    // Build a multi-page PDF: each delegate gets its own page-break section
    const combinedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 20mm 18mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #111; background: white; font-size: 10.5pt; line-height: 1.6; }
          .delegate-page { page-break-before: always; }
          .delegate-page:first-child { page-break-before: avoid; }
          .doc-title { font-size: 22pt; font-weight: bold; margin-bottom: 6mm; color: #111; }
          .name { font-size: 16pt; font-weight: bold; margin-bottom: 4mm; color: #111; }
          .meta-block { margin-bottom: 6mm; }
          .meta-block p { margin-bottom: 1.5mm; font-size: 10.5pt; color: #111; }
          .meta-block strong { font-weight: bold; }
          hr { border: none; border-top: 1px solid #d1d5db; margin: 5mm 0; }
          .section { margin-bottom: 6mm; page-break-inside: avoid; }
          .section h2 { font-size: 13pt; font-weight: bold; margin-bottom: 3mm; color: #111; }
          .section .body { font-size: 10.5pt; color: #374151; line-height: 1.7; }
          .tech-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-bottom: 2mm; }
          .tech-item strong { display: block; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3pt; color: #6b7280; margin-bottom: 1mm; }
          .footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #d1d5db; font-size: 8.5pt; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        ${allDelegates.map((delegate) => `
          <div class="delegate-page">
            <div class="doc-title">Delegate Meeting Briefing</div>
            <div class="name">${delegate.firstName} ${delegate.lastName}</div>
            <div class="meta-block">
              <p><strong>${delegate.jobTitle || ''}</strong></p>
              <p><strong>${delegate.company || ''}</strong></p>
              ${delegate.industry ? `<p><strong>Industry:</strong> ${delegate.industry}</p>` : ''}
              ${delegate.companySize ? `<p><strong>Employees:</strong> ${delegate.companySize}</p>` : ''}
              ${delegate.regionalRemit ? `<p><strong>Regions:</strong> ${delegate.regionalRemit}</p>` : ''}
              ${(delegate as any).activeBudgetRange ? `<p><strong>Active Project Budget:</strong> ${(delegate as any).activeBudgetRange}</p>` : ''}
              ${delegate.budgetAuthority ? `<p><strong>Sign-off Authority:</strong> ${delegate.budgetAuthority}</p>` : ''}
            </div>
            <hr/>
            <div class="section">
              <h2>Active Projects and Buying Intent</h2>
              <div class="body">
                ${(delegate as any).currentProjectStage ? `<p style="margin-bottom:2mm;"><strong>Stage:</strong> ${clean((delegate as any).currentProjectStage)}</p>` : ''}
                ${toBullets((delegate as any).activeConfirmedProjects)}
                ${(delegate as any).primaryMeetingObjective ? `<p style="margin-top:3mm;"><strong>Meeting Objective:</strong> ${clean((delegate as any).primaryMeetingObjective)}</p>` : ''}
              </div>
            </div>
            <hr/>
            <div class="section"><h2>Pain Points and Challenges</h2><div class="body">${toBullets((delegate as any).currentPainPoints)}</div></div>
            <hr/>
            <div class="section"><h2>Solution Areas of Interest</h2><div class="body">${toBullets((delegate as any).keySolutionAreasOfInterest)}</div></div>
            <hr/>
            <div class="section">
              <h2>Current Technology Stack</h2>
              <div class="tech-grid">
                <div class="tech-item"><strong>ATS</strong>${clean(delegate.ats)}</div>
                <div class="tech-item"><strong>CRM</strong>${clean(delegate.crm)}</div>
                <div class="tech-item"><strong>Assessment Tools</strong>${clean((delegate as any).assessmentTool)}</div>
                <div class="tech-item"><strong>Talent Intelligence</strong>${clean(delegate.marketIntelligence)}</div>
                ${delegate.otherTools ? `<div class="tech-item" style="grid-column:1/-1;"><strong>Other Tools</strong>${clean(delegate.otherTools)}</div>` : ''}
              </div>
            </div>
            <div class="footer">Resourcing Leaders Exchange &mdash; Confidential &mdash; ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          html: combinedHtml,
          filename: 'All_Delegate_Profiles',
        }),
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'All_Delegate_Profiles.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('PDF generation failed. Please try again.');
    }
  };

  const downloadBriefingPack = () => {
    if (!meetings || meetings.length === 0) {
      toast.error("No meetings to download");
      return;
    }
    const slotLabels: Record<number, { day: string; time: string }> = {
      1:  { day: 'Wed 25 Mar (Day 2)', time: '10:15 – 10:45' },
      2:  { day: 'Wed 25 Mar (Day 2)', time: '10:45 – 11:15' },
      3:  { day: 'Wed 25 Mar (Day 2)', time: '13:30 – 14:00' },
      4:  { day: 'Wed 25 Mar (Day 2)', time: '14:00 – 14:30' },
      5:  { day: 'Wed 25 Mar (Day 2)', time: '14:45 – 15:15' },
      6:  { day: 'Wed 25 Mar (Day 2)', time: '15:15 – 15:45' },
      7:  { day: 'Thu 26 Mar (Day 3)', time: '10:30 – 11:00' },
      8:  { day: 'Thu 26 Mar (Day 3)', time: '11:00 – 11:30' },
      9:  { day: 'Thu 26 Mar (Day 3)', time: '13:15 – 13:45' },
      10: { day: 'Thu 26 Mar (Day 3)', time: '13:45 – 14:15' },
      11: { day: 'Thu 26 Mar (Day 3)', time: '14:30 – 15:00' },
      12: { day: 'Thu 26 Mar (Day 3)', time: '15:00 – 15:30' },
    };

    const headers = [
      // Schedule fields
      'Your Attendee',
      'Day',
      'Time',
      'Table No.',
      // Match fields
      'Match Score (%)',
      'Delegate Opted In',
      'Match Reason',
      // Delegate identity
      'Delegate Name',
      'Job Title',
      'Company',
      'Industry',
      'Employees',
      'Regions',
      // Buying intent
      'Active Project Budget',
      'Sign-off Authority',
      'Project Stage',
      'Active / Confirmed Projects',
      'Primary Meeting Objective',
      // Needs
      'Current Pain Points',
      'Solution Areas of Interest',
      // Tech stack
      'ATS',
      'CRM',
      'Assessment Tools',
      'Talent Intelligence',
      'Other Tools',
    ];

    const rows = meetings
      .filter(m => m.timeSlot !== null && m.timeSlot !== undefined)
      .sort((a, b) => {
        const attendeeDiff = (a.attendeeNumber ?? 1) - (b.attendeeNumber ?? 1);
        if (attendeeDiff !== 0) return attendeeDiff;
        return (a.timeSlot ?? 0) - (b.timeSlot ?? 0);
      })
      .map(m => {
        const staticDelegate = findDelegate(m.attendeeId);
        const d = staticDelegate ? { ...staticDelegate, ...(m.delegateProfile || {}) } as any : null;
        const slot = slotLabels[m.timeSlot!] || { day: '', time: `Slot ${m.timeSlot}` };
        const attendeeName = (m.attendeeNumber === 2) ? attendee2Name : attendee1Name;
        return [
          attendeeName,
          slot.day,
          slot.time,
          (m as any).tableNumber ? String((m as any).tableNumber) : '',
          m.matchScore !== null && m.matchScore !== undefined ? String(m.matchScore) : '',
          m.hasDelegateOptIn ? 'Yes' : 'No',
          m.matchReason || '',
          d ? `${d.firstName} ${d.lastName}` : m.attendeeId,
          d?.jobTitle || '',
          d?.company || '',
          d?.industry || '',
          d?.companySize || '',
          d?.regionalRemit || '',
          d?.activeBudgetRange || '',
          d?.budgetAuthority || '',
          clean(d?.currentProjectStage),
          clean(d?.activeConfirmedProjects),
          clean(d?.primaryMeetingObjective),
          clean(d?.currentPainPoints),
          clean(d?.keySolutionAreasOfInterest),
          clean(d?.ats),
          clean(d?.crm),
          clean(d?.assessmentTool),
          clean(d?.marketIntelligence),
          clean(d?.otherTools),
        ].map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`);
      });

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sponsor?.companyName || 'RLX'}_Meeting_Briefing_Pack.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Meeting briefing pack downloaded');
    trackActivity.mutate({ eventType: 'download', downloadType: 'briefing_pack_csv', downloadLabel: 'Meeting Briefing Pack CSV' });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading your meeting schedule...</div>
      </div>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="glass-card border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-2xl">No Meetings Scheduled</CardTitle>
              <CardDescription className="text-slate-300">
                Your meeting schedule will appear here once it has been finalized by the admin team.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Group meetings by attendee number first, then by time slot
  const attendee1Meetings = meetings.filter(m => 
    m.timeSlot !== null && 
    m.timeSlot !== undefined && 
    (m.attendeeNumber === 1 || m.attendeeNumber === null)
  );
  
  const attendee2Meetings = meetings.filter(m => 
    m.timeSlot !== null && 
    m.timeSlot !== undefined && 
    m.attendeeNumber === 2
  );
  
  const hasAttendee2 = attendee2Meetings.length > 0;
  
  // Group meetings by time slot for each attendee
  const groupBySlot = (meetingList: typeof meetings) => 
    meetingList.reduce((acc, meeting) => {
      const slot = meeting.timeSlot!;
      if (!acc[slot]) acc[slot] = [];
      acc[slot].push(meeting);
      return acc;
    }, {} as Record<number, typeof meetings>);
  
  const attendee1BySlot = groupBySlot(attendee1Meetings);
  const attendee2BySlot = groupBySlot(attendee2Meetings);
  
  // Count only meetings with assigned time slots
  const assignedMeetingsCount = meetings.filter(m => m.timeSlot !== null && m.timeSlot !== undefined).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <PageHeader title="Your Meeting Schedule" description="View and download your confirmed meetings" />
      <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Pre-event Contact Agreement Banner */}
        {!agreementAccepted ? (
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5 flex gap-4 items-start">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-200 font-semibold text-base mb-1">Important: Pre-Event Contact Policy</p>
              <p className="text-amber-100/80 text-sm leading-relaxed mb-4">
                The delegate profiles and contact details shared here are strictly confidential and provided solely to help you prepare for your meetings at the event. <strong className="text-amber-200">You must not contact, reach out to, or approach any of your scheduled delegates before the event.</strong> Any sponsor found to have made unsolicited pre-event contact with delegates may be removed from the event without refund.
              </p>
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  id="pre-event-agreement"
                  checked={agreementAccepted}
                  onCheckedChange={handleAgreementChange}
                  className="border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-amber-100 text-sm font-medium group-hover:text-white transition-colors">
                  I understand and agree not to contact any delegates before the event
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 flex gap-3 items-center">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-green-200 text-sm">
              <strong>Pre-event contact policy acknowledged.</strong> Please remember not to contact any delegates before the event.
            </p>
            <button
              onClick={() => handleAgreementChange(false)}
              className="ml-auto text-xs text-green-400/60 hover:text-green-300 transition-colors underline underline-offset-2"
            >
              Review policy
            </button>
          </div>
        )}

        {/* Meeting Schedule — gated behind agreement */}
        {agreementAccepted && (
        <>

        {/* Header */}
        <Card className="glass-card border-slate-700">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white text-3xl mb-2 flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-accent" />
                  Your Meeting Schedule
                </CardTitle>
                <CardDescription className="text-slate-300 text-lg">
                  {sponsor?.companyName} - {assignedMeetingsCount} scheduled meetings
                  {hasAttendee2 && (
                    <span className="block mt-1 text-accent font-medium">
                      20-Meeting Package: 2 Attendees
                    </span>
                  )}
                  {meetings && meetings.length > 0 && (() => {
                    const latestUpdate = meetings.reduce((latest, m) => {
                      const t = m.updatedAt ? new Date(m.updatedAt).getTime() : 0;
                      return t > latest ? t : latest;
                    }, 0);
                    return latestUpdate > 0 ? (
                      <span className="block mt-2 text-slate-400 text-sm flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span>
                        Schedule last updated: {new Date(latestUpdate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : null;
                  })()}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-accent hover:bg-accent/90 gap-2"
                  onClick={downloadBriefingPack}
                >
                  <Download className="w-4 h-4" />
                  Download Briefing Pack
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Meeting Schedule — compact table layout */}
        {hasAttendee2 && (
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-heading font-semibold text-white">{attendee1Name}'s Schedule</h2>
            <span className="text-slate-400 text-sm">({attendee1Meetings.length} meetings)</span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {[1, 2].map(day => (
            <Card key={day} className="glass-card border-slate-700">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  {day === 1 ? 'Wed 25 Mar' : 'Thu 26 Mar'}
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-emerald-400/80">
                    <MapPin className="w-3 h-3" />
                    Ivory Suite
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 pt-0">
                <div className="divide-y divide-slate-700/60">
                  {TIME_SLOTS.filter(ts => ts.day === day).map(({ slot, label }) => {
                    const meeting = (attendee1BySlot[slot] || [])[0];
                        const staticDelegate = meeting ? findDelegate(meeting.attendeeId) : null;
                    const delegate = staticDelegate ? { ...staticDelegate, ...(meeting?.delegateProfile || {}) } : null;
                    return (
                      <div key={slot} className="flex items-center gap-3 px-2 py-2.5 hover:bg-slate-800/40 rounded transition-colors">
                        {/* Time */}
                        <div className="w-24 shrink-0">
                          <span className="text-xs font-mono text-accent font-semibold">{label}</span>
                        </div>
                        {/* Delegate info */}
                        <div className="flex-1 min-w-0">
                          {delegate ? (
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm font-semibold text-white cursor-help leading-tight">
                                        {delegate.firstName} {delegate.lastName}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-sm">{meeting?.matchReason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {meeting?.hasDelegateOptIn && (
                                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500/20 text-green-300 border-green-500/40 border">Opt-in</Badge>
                                )}
                                {meeting?.matchScore != null && (
                                  <span className="text-[10px] text-slate-400">{meeting.matchScore}%</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                                {delegate.company} · {delegate.jobTitle}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600 italic">No meeting scheduled</span>
                          )}
                        </div>
                        {/* Actions */}
                        {delegate && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                              onClick={() => {
                                setSelectedDelegate(delegate);
                                setSelectedMatchReason(meeting?.matchReason || undefined);
                                setProfileModalOpen(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Profile
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                              onClick={() => downloadDelegateProfileCSV(delegate.id)}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attendee 2 Schedule (if 20-meeting package) */}
        {hasAttendee2 && (
          <>
            <div className="flex items-center gap-2 mt-2 mb-2">
              <User className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-heading font-semibold text-white">{attendee2Name}'s Schedule</h2>
              <span className="text-slate-400 text-sm">({attendee2Meetings.length} meetings)</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2].map(day2 => (
                <Card key={day2} className="glass-card border-slate-700">
                  <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  {day2 === 1 ? 'Wed 25 Mar' : 'Thu 26 Mar'}
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-emerald-400/80">
                    <MapPin className="w-3 h-3" />
                    Ivory Suite
                  </span>
                </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-3 pt-0">
                    <div className="divide-y divide-slate-700/60">
                      {TIME_SLOTS.filter(ts => ts.day === day2).map(({ slot, label }) => {
                        const meeting = (attendee2BySlot[slot] || [])[0];
                        const staticDelegate = meeting ? findDelegate(meeting.attendeeId) : null;
                        const delegate = staticDelegate ? { ...staticDelegate, ...(meeting?.delegateProfile || {}) } : null;
                        return (
                          <div key={slot} className="flex items-center gap-3 px-2 py-2.5 hover:bg-slate-800/40 rounded transition-colors">
                            <div className="w-24 shrink-0">
                              <span className="text-xs font-mono text-accent font-semibold">{label}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              {delegate ? (
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-sm font-semibold text-white cursor-help leading-tight">
                                            {delegate.firstName} {delegate.lastName}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-sm">{meeting?.matchReason}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {meeting?.hasDelegateOptIn && (
                                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500/20 text-green-300 border-green-500/40 border">Opt-in</Badge>
                                    )}
                                    {meeting?.matchScore != null && (
                                      <span className="text-[10px] text-slate-400">{meeting.matchScore}%</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                                    {delegate.company} · {delegate.jobTitle}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-600 italic">No meeting scheduled</span>
                              )}
                            </div>
                            {delegate && (
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                                  onClick={() => {
                                    setSelectedDelegate(delegate);
                                    setSelectedMatchReason(meeting?.matchReason || undefined);
                                    setProfileModalOpen(true);
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Profile
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                                  onClick={() => downloadDelegateProfileCSV(delegate.id)}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Delegate Profile Modal */}
        <DelegateProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          delegate={selectedDelegate}
          matchReason={selectedMatchReason}
        />
        </>
        )}
      </div>
      </div>
    </div>
  );
}
