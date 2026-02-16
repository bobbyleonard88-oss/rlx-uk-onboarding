/**
 * Meeting Schedule - Sponsor View
 * Shows sponsor's confirmed meeting schedule with delegate profiles
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, FileText, Clock, Building2, User, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { attendees } from "@/lib/attendees";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TIME_SLOTS = [
  // Day 1
  { day: 1, slot: 1, label: "Slot 1" },
  { day: 1, slot: 2, label: "Slot 2" },
  { day: 1, slot: 3, label: "Slot 3" },
  // Day 2
  { day: 2, slot: 4, label: "Slot 1" },
  { day: 2, slot: 5, label: "Slot 2" },
  { day: 2, slot: 6, label: "Slot 3" },
];

export default function MeetingSchedule() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  
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

  const downloadDelegateProfile = (attendeeId: string, format: 'pdf' | 'individual') => {
    const delegate = attendees.find(a => a.id === attendeeId);
    if (!delegate) {
      toast.error("Delegate not found");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; }
          h1 { color: #7B4B94; border-bottom: 3px solid #d4af37; padding-bottom: 10px; }
          h2 { color: #2C3E5A; margin-top: 30px; border-left: 4px solid #7B4B94; padding-left: 15px; }
          .section { margin-bottom: 30px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
          .value { margin-top: 5px; font-size: 14px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        </style>
      </head>
      <body>
        <h1>${delegate.firstName} ${delegate.lastName} - Delegate Profile</h1>
        
        <div class="section">
          <h2>Professional Information</h2>
          <div class="grid">
            <div class="field">
              <div class="label">Name</div>
              <div class="value">${delegate.firstName} ${delegate.lastName}</div>
            </div>
            <div class="field">
              <div class="label">Company</div>
              <div class="value">${delegate.company || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Job Title</div>
              <div class="value">${delegate.jobTitle || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Industry</div>
              <div class="value">${delegate!.industry || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Assessment & Needs</h2>
          <div class="field">
            <div class="label">Assessment Tool</div>
            <div class="value">${delegate!.assessmentTool || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">ATS</div>
            <div class="value">${delegate!.ats || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">CRM</div>
            <div class="value">${delegate!.crm || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">Market Intelligence</div>
            <div class="value">${delegate!.marketIntelligence || 'N/A'}</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Budget & Organization</h2>
          <div class="grid">
          <div class="field">
            <div class="label">Budget Authority</div>
            <div class="value">${delegate.budgetAuthority || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">Company Size</div>
            <div class="value">${delegate.companySize || 'N/A'}</div>
          </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const downloadAllProfiles = () => {
    if (!meetings || meetings.length === 0) {
      toast.error("No meetings to download");
      return;
    }

    const allDelegates = meetings.map(m => attendees.find(a => a.id === m.attendeeId)).filter((d): d is typeof attendees[number] => d !== undefined);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; }
          h1 { color: #7B4B94; border-bottom: 3px solid #d4af37; padding-bottom: 10px; page-break-after: avoid; }
          h2 { color: #2C3E5A; margin-top: 30px; border-left: 4px solid #7B4B94; padding-left: 15px; }
          h3 { color: #7B4B94; margin-top: 40px; page-break-before: always; }
          .section { margin-bottom: 30px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
          .value { margin-top: 5px; font-size: 14px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        </style>
      </head>
      <body>
        <h1>${sponsor?.companyName || 'Your'} Meeting Schedule - All Delegate Profiles</h1>
        
        ${allDelegates.map((delegate, index) => `
          <h3>Delegate ${index + 1}: ${delegate.firstName} ${delegate.lastName}</h3>
          
          <div class="section">
            <h2>Professional Information</h2>
            <div class="grid">
              <div class="field">
                <div class="label">Name</div>
                <div class="value">${delegate.firstName} ${delegate.lastName}</div>
              </div>
              <div class="field">
                <div class="label">Company</div>
                <div class="value">${delegate.company || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Job Title</div>
                <div class="value">${delegate.jobTitle || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Industry</div>
                <div class="value">${delegate.industry || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Assessment & Needs</h2>
            <div class="field">
              <div class="label">Assessment Tool</div>
              <div class="value">${delegate.assessmentTool || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">ATS</div>
              <div class="value">${delegate.ats || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">CRM</div>
              <div class="value">${delegate.crm || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Market Intelligence</div>
              <div class="value">${delegate.marketIntelligence || 'N/A'}</div>
            </div>
          </div>
          
          <div class="section">
            <h2>Budget & Organization</h2>
            <div class="grid">
            <div class="field">
              <div class="label">Budget Authority</div>
              <div class="value">${delegate!.budgetAuthority || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Company Size</div>
              <div class="value">${delegate!.companySize || 'N/A'}</div>
            </div>
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
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

  // Group meetings by time slot (filter out meetings without timeSlot)
  const meetingsBySlot = meetings
    .filter(m => m.timeSlot !== null && m.timeSlot !== undefined)
    .reduce((acc, meeting) => {
      const slot = meeting.timeSlot!;
      if (!acc[slot]) acc[slot] = [];
      acc[slot].push(meeting);
      return acc;
    }, {} as Record<number, typeof meetings>);
  
  // Count only meetings with assigned time slots
  const assignedMeetingsCount = meetings.filter(m => m.timeSlot !== null && m.timeSlot !== undefined).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
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
                </CardDescription>
              </div>
              <Button
                onClick={downloadAllProfiles}
                className="bg-accent hover:bg-accent/90 gap-2"
              >
                <Download className="w-4 h-4" />
                Download All Profiles
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Meeting Schedule by Day */}
        {[1, 2].map(day => (
          <div key={day}>
            <h2 className="text-2xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-accent" />
              Day {day}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TIME_SLOTS.filter(ts => ts.day === day).map(({ slot, label }) => {
                const slotMeetings = meetingsBySlot[slot] || [];
                
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
                            <div className="text-xs text-slate-400 mb-2 font-medium">Meeting {meetingNum}</div>
                            {delegate ? (
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-accent" />
                                    <span className="font-semibold text-white text-lg">
                                      {delegate.firstName} {delegate.lastName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
                                    <Building2 className="w-3 h-3" />
                                    {delegate.company}
                                  </div>
                                  <div className="text-slate-400 text-sm">{delegate.jobTitle}</div>
                                </div>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full gap-2">
                                      <FileText className="w-4 h-4" />
                                      Download Profile
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
        ))}
      </div>
    </div>
  );
}
