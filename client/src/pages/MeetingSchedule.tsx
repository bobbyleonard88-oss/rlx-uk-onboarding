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
import { Calendar, Download, FileText, Clock, Building2, User, ChevronDown, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DelegateProfileModal from "@/components/DelegateProfileModal";
import { useState } from "react";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 12 slots total — 6 per day, 2 × 30-min slots per 1-hour meeting block
// Day 1 (Event Day 2): slots 1-6 | Day 2 (Event Day 3): slots 7-12
const TIME_SLOTS = [
  // Day 1 (Event Day 2)
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
  
  // Get meetings for this sponsor
  const { data: meetings, isLoading } = trpc.sponsor.getMyMeetings.useQuery(
    undefined,
    { enabled: !!user }
  );
  
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

  const buildDelegatePdfHtml = (delegate: typeof attendees[number]) => `
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
        ${delegate.hiresPerYear ? `<p><strong>Annual Hiring Volume:</strong> ${delegate.hiresPerYear}</p>` : ''}
        ${delegate.decisionLevel ? `<p><strong>Decision Level:</strong> ${delegate.decisionLevel}</p>` : ''}
        ${delegate.activeProjectBudget ? `<p><strong>Active Project Budget:</strong> ${delegate.activeProjectBudget}</p>` : ''}
        ${delegate.budgetAuthority ? `<p><strong>Sign-off Authority:</strong> ${delegate.budgetAuthority}</p>` : ''}
      </div>
      <hr/>
      <div class="section">
        <h2>Active Projects and Buying Intent</h2>
        <div class="body">
          ${delegate.projectStage ? `<p style="margin-bottom:2mm;"><strong>Stage:</strong> ${clean(delegate.projectStage)}</p>` : ''}
          ${toBullets(delegate.activeProjects)}
          ${delegate.meetingObjective ? `<p style="margin-top:3mm;"><strong>Meeting Objective:</strong> ${clean(delegate.meetingObjective)}</p>` : ''}
        </div>
      </div>
      <hr/>
      <div class="section">
        <h2>Pain Points and Challenges</h2>
        <div class="body">${toBullets(delegate.painPoints)}</div>
      </div>
      <hr/>
      <div class="section">
        <h2>Solution Areas of Interest</h2>
        <div class="body">${toBullets(delegate.solutionAreas)}</div>
      </div>
      <hr/>
      <div class="section">
        <h2>Current Technology Stack</h2>
        <div class="tech-grid">
          <div class="tech-item"><strong>ATS</strong>${clean(delegate.ats)}</div>
          <div class="tech-item"><strong>CRM</strong>${clean(delegate.crm)}</div>
          <div class="tech-item"><strong>Assessment Tools</strong>${clean(delegate.assessmentTools)}</div>
          <div class="tech-item"><strong>Talent Intelligence</strong>${clean(delegate.marketIntelligence)}</div>
          ${delegate.otherTools ? `<div class="tech-item" style="grid-column:1/-1;"><strong>Other Tools</strong>${clean(delegate.otherTools)}</div>` : ''}
        </div>
      </div>
      <div class="footer">Resourcing Leaders Exchange &mdash; Confidential Delegate Profile &mdash; Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </body>
    </html>
  `;

  const downloadDelegateProfile = async (attendeeId: string, _format: 'pdf' | 'individual') => {
    const delegate = attendees.find(a => a.id === attendeeId);
    if (!delegate) {
      toast.error("Delegate not found");
      return;
    }
    const htmlContent = buildDelegatePdfHtml(delegate);
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          html: htmlContent,
          filename: `${delegate.firstName}_${delegate.lastName}_Profile`,
        }),
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${delegate.firstName}_${delegate.lastName}_Profile.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('PDF generation failed. Please try again.');
    }
  };

  const downloadAllProfilesPDF = async () => {
    if (!meetings || meetings.length === 0) {
      toast.error("No meetings to download");
      return;
    }
    const allDelegates = meetings
      .map(m => attendees.find(a => a.id === m.attendeeId))
      .filter((d): d is typeof attendees[number] => d !== undefined);

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
              ${delegate.hiresPerYear ? `<p><strong>Annual Hiring Volume:</strong> ${delegate.hiresPerYear}</p>` : ''}
              ${delegate.decisionLevel ? `<p><strong>Decision Level:</strong> ${delegate.decisionLevel}</p>` : ''}
              ${delegate.activeProjectBudget ? `<p><strong>Active Project Budget:</strong> ${delegate.activeProjectBudget}</p>` : ''}
              ${delegate.budgetAuthority ? `<p><strong>Sign-off Authority:</strong> ${delegate.budgetAuthority}</p>` : ''}
            </div>
            <hr/>
            <div class="section">
              <h2>Active Projects and Buying Intent</h2>
              <div class="body">
                ${delegate.projectStage ? `<p style="margin-bottom:2mm;"><strong>Stage:</strong> ${clean(delegate.projectStage)}</p>` : ''}
                ${toBullets(delegate.activeProjects)}
                ${delegate.meetingObjective ? `<p style="margin-top:3mm;"><strong>Meeting Objective:</strong> ${clean(delegate.meetingObjective)}</p>` : ''}
              </div>
            </div>
            <hr/>
            <div class="section"><h2>Pain Points and Challenges</h2><div class="body">${toBullets(delegate.painPoints)}</div></div>
            <hr/>
            <div class="section"><h2>Solution Areas of Interest</h2><div class="body">${toBullets(delegate.solutionAreas)}</div></div>
            <hr/>
            <div class="section">
              <h2>Current Technology Stack</h2>
              <div class="tech-grid">
                <div class="tech-item"><strong>ATS</strong>${clean(delegate.ats)}</div>
                <div class="tech-item"><strong>CRM</strong>${clean(delegate.crm)}</div>
                <div class="tech-item"><strong>Assessment Tools</strong>${clean(delegate.assessmentTools)}</div>
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

  const downloadScheduleCSV = () => {
    if (!meetings || meetings.length === 0) {
      toast.error("No meetings to download");
      return;
    }
    const slotLabels: Record<number, string> = {
      1: 'Day 2 (Wed 13 May) – 10:15–10:45',
      2: 'Day 2 (Wed 13 May) – 10:45–11:15',
      3: 'Day 2 (Wed 13 May) – 13:30–14:00',
      4: 'Day 2 (Wed 13 May) – 14:00–14:30',
      5: 'Day 2 (Wed 13 May) – 14:45–15:15',
      6: 'Day 2 (Wed 13 May) – 15:15–15:45',
      7: 'Day 3 (Thu 14 May) – 10:30–11:00',
      8: 'Day 3 (Thu 14 May) – 11:00–11:30',
      9: 'Day 3 (Thu 14 May) – 13:15–13:45',
      10: 'Day 3 (Thu 14 May) – 13:45–14:15',
      11: 'Day 3 (Thu 14 May) – 14:30–15:00',
      12: 'Day 3 (Thu 14 May) – 15:00–15:30',
    };
    const headers = ['Attendee', 'Time Slot', 'Delegate Name', 'Job Title', 'Company', 'Match Score', 'Match Reason'];
    const rows = meetings
      .filter(m => m.timeSlot !== null && m.timeSlot !== undefined)
      .sort((a, b) => {
        const slotDiff = (a.timeSlot ?? 0) - (b.timeSlot ?? 0);
        if (slotDiff !== 0) return slotDiff;
        return (a.attendeeNumber ?? 1) - (b.attendeeNumber ?? 1);
      })
      .map(m => {
        const delegate = attendees.find(a => a.id === m.attendeeId);
        const attendeeName = (m.attendeeNumber === 2) ? attendee2Name : attendee1Name;
        return [
          attendeeName,
          slotLabels[m.timeSlot!] || `Slot ${m.timeSlot}`,
          delegate ? `${delegate.firstName} ${delegate.lastName}` : m.attendeeId,
          delegate?.jobTitle || '',
          delegate?.company || '',
          m.matchScore !== null && m.matchScore !== undefined ? String(m.matchScore) : '',
          m.matchReason || '',
        ].map(cell => `"${String(cell).replace(/"/g, '""')}"`);
      });
    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sponsor?.companyName || 'RLX'}_Meeting_Schedule.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Meeting schedule downloaded');
  };

  const downloadAllProfilesCSV = () => {
    if (!meetings || meetings.length === 0) {
      toast.error("No meetings to download");
      return;
    }
    const allDelegates = meetings
      .map(m => attendees.find(a => a.id === m.attendeeId))
      .filter((d): d is typeof attendees[number] => d !== undefined);

    const headers = ['Name', 'Job Title', 'Company', 'Industry', 'Employees', 'Regions', 'Annual Hiring Volume', 'Decision Level', 'Active Project Budget', 'Sign-off Authority', 'Project Stage', 'Active Projects', 'Meeting Objective', 'Pain Points', 'Solution Areas', 'ATS', 'CRM', 'Assessment Tools', 'Talent Intelligence', 'Other Tools'];
    const rows = allDelegates.map(d => [
      `${d.firstName} ${d.lastName}`,
      d.jobTitle || '',
      d.company || '',
      d.industry || '',
      d.companySize || '',
      d.regionalRemit || '',
      d.hiresPerYear || '',
      d.decisionLevel || '',
      d.activeProjectBudget || '',
      d.budgetAuthority || '',
      clean(d.projectStage),
      clean(d.activeProjects),
      clean(d.meetingObjective),
      clean(d.painPoints),
      clean(d.solutionAreas),
      clean(d.ats),
      clean(d.crm),
      clean(d.assessmentTools),
      clean(d.marketIntelligence),
      clean(d.otherTools),
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`));

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sponsor?.companyName || 'RLX'}_Delegate_Profiles.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-slate-500 text-white hover:bg-slate-700 gap-2">
                      <Calendar className="w-4 h-4" />
                      Download Schedule
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={downloadScheduleCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Download as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-accent hover:bg-accent/90 gap-2">
                      <Download className="w-4 h-4" />
                      Download All Profiles
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={downloadAllProfilesPDF}>
                      <FileText className="w-4 h-4 mr-2" />
                      Download as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadAllProfilesCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Download as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Meeting Schedule by Day - Two Column Layout */}
        {/* Attendee 1 Schedule */}
        {hasAttendee2 && (
          <Card className="glass-card border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <User className="w-6 h-6 text-accent" />
                {attendee1Name}'s Schedule
              </CardTitle>
              <CardDescription className="text-slate-300">
                {attendee1Meetings.length} meetings assigned
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Day 1 Column */}
          <div>
            <h2 className="text-2xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-accent" />
              Day 1
            </h2>
            <div className="space-y-4">
              {TIME_SLOTS.filter(ts => ts.day === 1).map(({ slot, label}) => {
                const slotMeetings = attendee1BySlot[slot] || [];
                
                return (
                  <Card key={slot} className="glass-card border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-xl">{label}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {slotMeetings.length} meeting{slotMeetings.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[1, 2].map(meetingNum => {
                        const meeting = slotMeetings[meetingNum - 1];
                        const delegate = meeting ? attendees.find(a => a.id === meeting.attendeeId) : null;
                        
                        return (
                          <div key={meetingNum} className="border-2 border-dashed border-slate-600 rounded-lg p-4 min-h-[200px] flex flex-col">
                            <div className="text-sm text-slate-400 mb-2 font-medium">Meeting {meetingNum}</div>
                            {delegate ? (
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-accent" />
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="font-semibold text-white text-lg cursor-help border-b border-dotted border-slate-500">
                                            {delegate.firstName} {delegate.lastName}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-sm">{meeting.matchReason}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
                                    <Building2 className="w-3 h-3" />
                                    {delegate.company}
                                  </div>
                                  <div className="text-slate-400 text-sm">{delegate.jobTitle}</div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 gap-2"
                                    onClick={() => {
                                      setSelectedDelegate(delegate);
                                      setSelectedMatchReason(meeting.matchReason || undefined);
                                      setProfileModalOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Profile
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                                        <Download className="w-4 h-4" />
                                        <ChevronDown className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => downloadDelegateProfile(delegate.id, 'pdf')}>
                                        Download as PDF
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                                No meeting scheduled
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Day 2 Column */}
          <div>
            <h2 className="text-2xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-accent" />
              Day 2
            </h2>
            <div className="space-y-4">
              {TIME_SLOTS.filter(ts => ts.day === 2).map(({ slot, label }) => {
                const slotMeetings = attendee1BySlot[slot] || [];
                
                return (
                  <Card key={slot} className="glass-card border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-xl">{label}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {slotMeetings.length} meeting{slotMeetings.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[1, 2].map(meetingNum => {
                        const meeting = slotMeetings[meetingNum - 1];
                        const delegate = meeting ? attendees.find(a => a.id === meeting.attendeeId) : null;
                        
                        return (
                          <div key={meetingNum} className="border-2 border-dashed border-slate-600 rounded-lg p-4 min-h-[200px] flex flex-col">
                            <div className="text-sm text-slate-400 mb-2 font-medium">Meeting {meetingNum}</div>
                            {delegate ? (
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-accent" />
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="font-semibold text-white text-lg cursor-help border-b border-dotted border-slate-500">
                                            {delegate.firstName} {delegate.lastName}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-sm">{meeting.matchReason}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
                                    <Building2 className="w-3 h-3" />
                                    <span>{delegate.company}</span>
                                  </div>
                                  <div className="text-slate-400 text-sm">{delegate.jobTitle}</div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedDelegate(delegate);
                                      setSelectedMatchReason(meeting.matchReason || undefined);
                                      setProfileModalOpen(true);
                                    }}
                                    className="flex-1 gap-2"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View Profile
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="gap-2">
                                        <Download className="w-3 h-3" />
                                        <ChevronDown className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => downloadDelegateProfile(delegate.id, 'pdf')}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Download PDF
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                                No meeting scheduled
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Attendee 2 Schedule (if 20-meeting package) */}
        {hasAttendee2 && (
          <>
            <Card className="glass-card border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center gap-2">
                  <User className="w-6 h-6 text-accent" />
                  {attendee2Name}'s Schedule
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {attendee2Meetings.length} meetings assigned
                </CardDescription>
              </CardHeader>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Day 1 Column */}
              <div>
                <h2 className="text-2xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-accent" />
                  Day 1
                </h2>
                <div className="space-y-4">
                  {TIME_SLOTS.filter(ts => ts.day === 1).map(({ slot, label}) => {
                    const slotMeetings = attendee2BySlot[slot] || [];
                    
                    return (
                      <Card key={slot} className="glass-card border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white text-xl">{label}</CardTitle>
                          <CardDescription className="text-slate-400">
                            {slotMeetings.length} meeting{slotMeetings.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {[1, 2].map(meetingNum => {
                            const meeting = slotMeetings[meetingNum - 1];
                            const delegate = meeting ? attendees.find(a => a.id === meeting.attendeeId) : null;
                            
                            return (
                              <div key={meetingNum} className="border-2 border-dashed border-slate-600 rounded-lg p-4">
                                <div className="text-sm text-slate-400 mb-2 font-medium">Meeting {meetingNum}</div>
                                {delegate ? (
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-accent" />
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="font-semibold text-white text-lg cursor-help border-b border-dotted border-slate-500">
                                                {delegate.firstName} {delegate.lastName}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <p className="text-sm">{meeting.matchReason}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
                                        <Building2 className="w-3 h-3" />
                                        {delegate.company}
                                      </div>
                                      <div className="text-slate-400 text-sm">{delegate.jobTitle}</div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="flex-1 gap-2"
                                        onClick={() => {
                                          setSelectedDelegate(delegate);
                                          setProfileModalOpen(true);
                                        }}
                                      >
                                        <Eye className="w-4 h-4" />
                                        View Profile
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm" className="flex-1 gap-2">
                                            <Download className="w-4 h-4" />
                                            <ChevronDown className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => downloadDelegateProfile(delegate.id, 'pdf')}>
                                            Download as PDF
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center text-slate-500 text-sm py-4">
                                    No meeting scheduled
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Day 2 Column */}
              <div>
                <h2 className="text-2xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-accent" />
                  Day 2
                </h2>
                <div className="space-y-4">
                  {TIME_SLOTS.filter(ts => ts.day === 2).map(({ slot, label }) => {
                    const slotMeetings = attendee2BySlot[slot] || [];
                    
                    return (
                      <Card key={slot} className="glass-card border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white text-xl">{label}</CardTitle>
                          <CardDescription className="text-slate-400">
                            {slotMeetings.length} meeting{slotMeetings.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {[1, 2].map(meetingNum => {
                            const meeting = slotMeetings[meetingNum - 1];
                            const delegate = meeting ? attendees.find(a => a.id === meeting.attendeeId) : null;
                            
                            return (
                              <div key={meetingNum} className="border-2 border-dashed border-slate-600 rounded-lg p-4">
                                <div className="text-sm text-slate-400 mb-2 font-medium">Meeting {meetingNum}</div>
                                {delegate ? (
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-accent" />
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="font-semibold text-white text-lg cursor-help border-b border-dotted border-slate-500">
                                                {delegate.firstName} {delegate.lastName}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <p className="text-sm">{meeting.matchReason}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
                                        <Building2 className="w-3 h-3" />
                                        <span>{delegate.company}</span>
                                      </div>
                                      <div className="text-slate-400 text-sm">{delegate.jobTitle}</div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={() => {
                                          setSelectedDelegate(delegate);
                                          setProfileModalOpen(true);
                                        }}
                                      >
                                        <Eye className="w-4 h-4" />
                                        View Profile
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm" className="flex-1 gap-2">
                                            <Download className="w-4 h-4" />
                                            <ChevronDown className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => downloadDelegateProfile(delegate.id, 'pdf')}>
                                            Download as PDF
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center text-slate-500 text-sm py-4">
                                    No meeting scheduled
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
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
      </div>
      </div>
    </div>
  );
}
