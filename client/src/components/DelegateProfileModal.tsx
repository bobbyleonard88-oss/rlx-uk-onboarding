/**
 * Delegate Profile Modal
 * Displays full delegate profile with all information
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Building2, Users, Briefcase, Target, DollarSign, TrendingUp, ChevronDown, Sparkles } from "lucide-react";
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

  const downloadPDF = () => {
    // Create professional HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm; 
            color: #1a1a2e; 
            background: white;
            line-height: 1.7;
            font-size: 11pt;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25mm 20mm;
            border-radius: 8px 8px 0 0;
            margin-bottom: 8mm;
            page-break-after: avoid;
          }
          .header h1 { 
            font-size: 24pt; 
            margin-bottom: 3mm;
            font-weight: 600;
            line-height: 1.3;
          }
          .header .subtitle { 
            font-size: 14pt; 
            opacity: 0.95;
            font-weight: 400;
            line-height: 1.5;
          }
          .header .company {
            font-size: 12pt;
            opacity: 0.9;
            margin-top: 2mm;
            line-height: 1.5;
          }
          
          .content {
            background: white;
            padding: 15mm 20mm;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
          }
          
          .section { 
            margin-bottom: 8mm;
            page-break-inside: avoid;
          }
          .section:last-child { margin-bottom: 0; }
          .section:not(:first-child) { margin-top: 8mm; }
          
          h2 { 
            color: #667eea; 
            font-size: 14pt;
            margin-bottom: 5mm;
            padding-bottom: 3mm;
            border-bottom: 2px solid #e0e7ff;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 3mm;
            line-height: 1.4;
            page-break-after: avoid;
          }
          
          .grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 5mm;
            margin-bottom: 5mm;
          }
          
          .field { 
            background: #f8f9fa;
            padding: 4mm;
            border-radius: 4px;
            border-left: 3px solid #667eea;
            page-break-inside: avoid;
          }
          
          .label { 
            font-weight: 600; 
            color: #4a5568; 
            font-size: 9pt; 
            text-transform: uppercase; 
            letter-spacing: 0.3pt;
            margin-bottom: 2mm;
            display: block;
            line-height: 1.3;
          }
          
          .value { 
            font-size: 11pt;
            color: #1a202c;
            line-height: 1.7;
          }
          
          .full-width {
            grid-column: 1 / -1;
          }
          
          .badge {
            display: inline-block;
            background: #e0e7ff;
            color: #667eea;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
            margin-bottom: 8px;
          }
          
          .footer {
            margin-top: 10mm;
            padding-top: 5mm;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 9pt;
            line-height: 1.6;
            page-break-before: avoid;
          }
          
          @media print {
            body { 
              background: white; 
              padding: 0;
              margin: 0;
            }
            .content { box-shadow: none; }
            .header { border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${delegate.firstName} ${delegate.lastName}</h1>
          <div class="subtitle">${delegate.jobTitle || 'N/A'}</div>
          <div class="company">${delegate.company || 'N/A'}</div>
        </div>
        
        <div class="content">
          <div class="section">
            <h2>📊 Organization Overview</h2>
            <div class="grid">
              <div class="field">
                <div class="label">Company</div>
                <div class="value">${delegate.company || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Industry</div>
                <div class="value">${delegate.industry || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Company Size</div>
                <div class="value">${delegate.companySize || 'N/A'} employees</div>
              </div>
              <div class="field">
                <div class="label">Hires per Year</div>
                <div class="value">${delegate.hiresPerYear || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Regional Remit</div>
                <div class="value">${delegate.regionalRemit || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Decision Making Level</div>
                <div class="value">${delegate.decisionLevel || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>💰 Budget & Authority</h2>
            <div class="grid">
              <div class="field">
                <div class="label">Active Project Budget</div>
                <div class="value">${delegate.activeProjectBudget || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Contract Sign-off Authority</div>
                <div class="value">${delegate.budgetAuthority || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>🎯 Current Projects & Objectives</h2>
            <div class="grid">
              <div class="field full-width">
                <div class="label">Active Confirmed Projects</div>
                <div class="value">${clean(delegate.activeProjects)}</div>
              </div>
              <div class="field full-width">
                <div class="label">Primary Meeting Objective</div>
                <div class="value">${clean(delegate.meetingObjective)}</div>
              </div>
              <div class="field">
                <div class="label">Current Project Stage</div>
                <div class="value">${clean(delegate.projectStage)}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>🔧 Current Technology Stack</h2>
            <div class="grid">
              <div class="field">
                <div class="label">ATS (Applicant Tracking System)</div>
                <div class="value">${clean(delegate.ats)}</div>
              </div>
              <div class="field">
                <div class="label">CRM</div>
                <div class="value">${clean(delegate.crm)}</div>
              </div>
              <div class="field">
                <div class="label">Assessment Tools</div>
                <div class="value">${clean(delegate.assessmentTools)}</div>
              </div>
              <div class="field">
                <div class="label">Talent Intelligence</div>
                <div class="value">${clean(delegate.marketIntelligence)}</div>
              </div>
              <div class="field full-width">
                <div class="label">Other Tools</div>
                <div class="value">${clean(delegate.otherTools)}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>💡 Solution Areas of Interest</h2>
            <div class="field full-width">
              <div class="value">${clean(delegate.solutionAreas)}</div>
            </div>
          </div>
          
          <div class="section">
            <h2>⚠️ Current Pain Points & Challenges</h2>
            <div class="field full-width">
              <div class="value">${clean(delegate.painPoints)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Resourcing Leaders Exchange - Confidential Delegate Profile</p>
            <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
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
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                  <ChevronDown className="w-4 h-4" />
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
