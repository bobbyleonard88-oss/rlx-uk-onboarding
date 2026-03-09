/**
 * Delegate Profile Modal
 * Displays full delegate profile with all information
 */

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Building2, Users, Briefcase, Target, DollarSign, TrendingUp, ChevronDown, Sparkles, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DelegateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delegate: any;
  matchReason?: string; // AI-generated match reasoning
}

/**
 * Strip parenthetical commentary from free-text fields.
 * e.g. "Yello (terrible needs to be replaced, good for event management)" → "Yello"
 * Handles nested parens and multiple occurrences. Trims trailing punctuation/whitespace.
 */
function clean(value: string | null | undefined): string {
  if (!value) return 'N/A';
  // Remove content inside parentheses (including the parens themselves)
  let cleaned = value.replace(/\s*\([^)]*\)/g, '');
  // Collapse multiple spaces and trim
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  // Remove trailing commas/semicolons left behind
  cleaned = cleaned.replace(/[,;]+$/, '').trim();
  return cleaned || 'N/A';
}

export default function DelegateProfileModal({ open, onOpenChange, delegate, matchReason }: DelegateProfileModalProps) {
  if (!delegate) return null;

  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
    // Create professional HTML content for PDF - clean Google Doc style
    // Helper to convert newline-separated text into bullet list HTML
    const toBullets = (text: string) => {
      const cleaned = clean(text);
      if (cleaned === 'N/A') return '<p style="margin:0;color:#374151;">N/A</p>';
      const lines = cleaned.split(/\n|;|,(?=\s)/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return `<p style="margin:0;color:#374151;">${cleaned}</p>`;
      return `<ul style="margin:0;padding-left:18px;color:#374151;">${lines.map(l => `<li style="margin-bottom:3px;">${l}</li>`).join('')}</ul>`;
    };
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 20mm 18mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            background: white;
            font-size: 10.5pt;
            line-height: 1.6;
          }
          .doc-title {
            font-size: 22pt;
            font-weight: bold;
            margin-bottom: 6mm;
            color: #111;
          }
          .name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 4mm;
            color: #111;
          }
          .meta-block {
            margin-bottom: 6mm;
          }
          .meta-block p {
            margin-bottom: 1.5mm;
            font-size: 10.5pt;
            color: #111;
          }
          .meta-block strong {
            font-weight: bold;
          }
          hr {
            border: none;
            border-top: 1px solid #d1d5db;
            margin: 5mm 0;
          }
          .section {
            margin-bottom: 6mm;
            page-break-inside: avoid;
          }
          .section h2 {
            font-size: 13pt;
            font-weight: bold;
            margin-bottom: 3mm;
            color: #111;
          }
          .section .body {
            font-size: 10.5pt;
            color: #374151;
            line-height: 1.7;
          }
          .tech-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3mm 8mm;
            margin-bottom: 2mm;
          }
          .tech-item strong {
            display: block;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
            color: #6b7280;
            margin-bottom: 1mm;
          }
          .footer {
            margin-top: 10mm;
            padding-top: 4mm;
            border-top: 1px solid #d1d5db;
            font-size: 8.5pt;
            color: #9ca3af;
            text-align: center;
          }
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
            ${delegate.activeProjects ? toBullets(delegate.activeProjects) : '<p style="color:#374151;">N/A</p>'}
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
        <div class="footer">
          Resourcing Leaders Exchange &mdash; Confidential Delegate Profile &mdash; Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </body>
      </html>
    `;

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
      alert('PDF generation failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadCSV = () => {
    const csvContent = [
      ['Field', 'Value'],
      ['Name', `${delegate.firstName} ${delegate.lastName}`],
      ['Job Title', delegate.jobTitle || 'N/A'],
      ['Company', delegate.company || 'N/A'],
      ['Industry', delegate.industry || 'N/A'],
      ['Company Size', delegate.companySize || 'N/A'],
      ['Hires per Year', delegate.hiresPerYear || 'N/A'],
      ['Regional Remit', delegate.regionalRemit || 'N/A'],
      ['Decision Making Level', delegate.decisionLevel || 'N/A'],
      ['Active Project Budget', delegate.activeProjectBudget || 'N/A'],
      ['Contract Sign-off Authority', delegate.budgetAuthority || 'N/A'],
      ['Active Projects', clean(delegate.activeProjects)],
      ['Meeting Objective', clean(delegate.meetingObjective)],
      ['Project Stage', clean(delegate.projectStage)],
      ['ATS', clean(delegate.ats)],
      ['CRM', clean(delegate.crm)],
      ['Assessment Tools', clean(delegate.assessmentTools)],
      ['Talent Intelligence', clean(delegate.marketIntelligence)],
      ['Other Tools', clean(delegate.otherTools)],
      ['Solution Areas', clean(delegate.solutionAreas)],
      ['Pain Points', clean(delegate.painPoints)],
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${delegate.firstName}_${delegate.lastName}_Profile.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white text-2xl">
                {delegate.firstName} {delegate.lastName}
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-base mt-1">
                {delegate.jobTitle} at {delegate.company}
              </DialogDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={pdfLoading}>
                  {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {pdfLoading ? 'Generating...' : 'Download'}
                  {!pdfLoading && <ChevronDown className="w-4 h-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadPDF}>
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadCSV}>
                  Download as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Organization Overview */}
          <div>
            <h3 className="text-accent font-semibold text-lg mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Company</div>
                <div className="text-white">{delegate.company || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Industry</div>
                <div className="text-white">{delegate.industry || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Company Size</div>
                <div className="text-white">{delegate.companySize || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Hires per Year</div>
                <div className="text-white">{delegate.hiresPerYear || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Regional Remit</div>
                <div className="text-white">{delegate.regionalRemit || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Decision Making Level</div>
                <div className="text-white">{delegate.decisionLevel || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Budget & Authority */}
          <div>
            <h3 className="text-accent font-semibold text-lg mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Budget & Authority
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Active Project Budget</div>
                <div className="text-white">{delegate.activeProjectBudget || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Contract Sign-off Authority</div>
                <div className="text-white">{delegate.budgetAuthority || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Current Projects & Objectives */}
          <div>
            <h3 className="text-accent font-semibold text-lg mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Current Projects & Objectives
            </h3>
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Active Confirmed Projects</div>
                <div className="text-white">{clean(delegate.activeProjects)}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Primary Meeting Objective</div>
                <div className="text-white">{clean(delegate.meetingObjective)}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Current Project Stage</div>
                <div className="text-white">{clean(delegate.projectStage)}</div>
              </div>
            </div>
          </div>

          {/* Current Technology Stack */}
          <div>
            <h3 className="text-accent font-semibold text-lg mb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Current Technology Stack
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">ATS</div>
                <div className="text-white">{clean(delegate.ats)}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">CRM</div>
                <div className="text-white">{clean(delegate.crm)}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Assessment Tools</div>
                <div className="text-white">{clean(delegate.assessmentTools)}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Talent Intelligence</div>
                <div className="text-white">{clean(delegate.marketIntelligence)}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 col-span-2">
                <div className="text-xs text-slate-400 uppercase mb-1">Other Tools</div>
                <div className="text-white">{clean(delegate.otherTools)}</div>
              </div>
            </div>
          </div>

          {/* Solution Areas of Interest */}
          <div>
            <h3 className="text-accent font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Solution Areas of Interest
            </h3>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <div className="text-white whitespace-pre-wrap">{clean(delegate.solutionAreas)}</div>
            </div>
          </div>

          {/* Current Pain Points */}
          <div>
            <h3 className="text-accent font-semibold text-lg mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Current Pain Points & Challenges
            </h3>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <div className="text-white whitespace-pre-wrap">{clean(delegate.painPoints)}</div>
            </div>
          </div>

          {/* Why This Match? - AI-Generated Reasoning */}
          {matchReason && (
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 p-6 rounded-lg border-2 border-purple-500/30">
              <h3 className="text-purple-300 font-semibold text-lg mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Why This Match?
              </h3>
              <p className="text-white text-base leading-relaxed">
                {matchReason}
              </p>
              <div className="mt-4 text-sm text-purple-300/70 italic">
                This match was generated by analyzing the delegate's pain points, solution needs, and objectives against your company's offerings.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
