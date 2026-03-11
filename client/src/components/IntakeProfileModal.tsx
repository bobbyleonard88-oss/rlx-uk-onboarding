/**
 * Intake Profile Preview Modal
 * Displays full intake form data in a formatted, readable view
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Building2, Users, Mail, Briefcase, Linkedin, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IntakeProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakeData: any;
  companyName: string;
}

export default function IntakeProfileModal({ open, onOpenChange, intakeData, companyName }: IntakeProfileModalProps) {
  if (!intakeData) return null;

  const downloadPDF = () => {
    // Create HTML content for PDF
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
        <h1>${companyName} - Intake Profile</h1>
        
        <div class="section">
          <h2>Company Information</h2>
          <div class="grid">
            <div class="field">
              <div class="label">Company Name</div>
              <div class="value">${intakeData.companyName || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Technology Type</div>
              <div class="value">${intakeData.technologyType || 'N/A'}</div>
            </div>
          </div>
          <div class="field">
            <div class="label">Company Boilerplate</div>
            <div class="value">${intakeData.companyBoilerplate || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">Key Challenges Addressed</div>
            <div class="value">${intakeData.keyChallenges || 'N/A'}</div>
          </div>
          <div class="grid">
            <div class="field">
              <div class="label">Target Organization Size</div>
              <div class="value">${intakeData.targetOrgSize || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Meeting Package</div>
              <div class="value">${intakeData.meetingPackage || 'N/A'} meetings</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Primary Representative</h2>
          <div class="grid">
            <div class="field">
              <div class="label">Name</div>
              <div class="value">${intakeData.firstName} ${intakeData.lastName}</div>
            </div>
            <div class="field">
              <div class="label">Job Title</div>
              <div class="value">${intakeData.jobTitle || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Email</div>
              <div class="value">${intakeData.email || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">LinkedIn</div>
              <div class="value">${intakeData.linkedinUrl || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        ${intakeData.secondRepName ? `
        <div class="section">
          <h2>Second Representative</h2>
          <div class="grid">
            <div class="field">
              <div class="label">Name</div>
              <div class="value">${intakeData.secondRepName}</div>
            </div>
            <div class="field">
              <div class="label">Job Title</div>
              <div class="value">${intakeData.secondRepJobTitle || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">Email</div>
              <div class="value">${intakeData.secondRepEmail || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="label">LinkedIn</div>
              <div class="value">${intakeData.secondRepLinkedinUrl || 'N/A'}</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="field">
            <div class="label">Submitted At</div>
            <div class="value">${intakeData.submittedAt ? new Date(intakeData.submittedAt).toLocaleString() : 'N/A'}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Open print dialog which allows saving as PDF
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
    const headers = [
      "Company Name",
      "Technology Type",
      "Company Boilerplate",
      "Key Challenges",
      "Target Org Size",
      "First Name",
      "Last Name",
      "Email",
      "Job Title",
      "LinkedIn URL",
      "Second Rep Name",
      "Second Rep Email",
      "Second Rep Job Title",
      "Second Rep LinkedIn",
      "Meeting Package",
      "Submitted At",
    ];

    const row = [
      intakeData.companyName || "",
      intakeData.technologyType || "",
      intakeData.companyBoilerplate || "",
      intakeData.keyChallenges || "",
      intakeData.targetOrgSize || "",
      intakeData.firstName || "",
      intakeData.lastName || "",
      intakeData.email || "",
      intakeData.jobTitle || "",
      intakeData.linkedinUrl || "",
      intakeData.secondRepName || "",
      intakeData.secondRepEmail || "",
      intakeData.secondRepJobTitle || "",
      intakeData.secondRepLinkedinUrl || "",
      intakeData.meetingPackage || "",
      intakeData.submittedAt ? new Date(intakeData.submittedAt).toLocaleString() : "",
    ];

    const csvContent = [
      headers.join(","),
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${companyName.replace(/[^a-z0-9]/gi, '_')}_intake_profile.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[520px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {intakeData.companyLogoUrl && (intakeData.companyLogoUrl.startsWith('http://') || intakeData.companyLogoUrl.startsWith('https://')) ? (
                <img 
                  src={intakeData.companyLogoUrl} 
                  alt={`${companyName} logo`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                style={{ display: (intakeData.companyLogoUrl && (intakeData.companyLogoUrl.startsWith('http://') || intakeData.companyLogoUrl.startsWith('https://'))) ? 'none' : 'flex' }}
                className="w-full h-full items-center justify-center bg-primary/10 rounded text-primary font-bold text-lg"
              >
                {companyName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-heading text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                {companyName} - Intake Profile
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Complete intake form submission details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Company Information */}
          <div className="glass-card p-6 border-slate-700">
            <h3 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              Company Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400">Company Name</label>
                <p className="text-white font-medium">{intakeData.companyName}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Technology Type</label>
                <p className="text-white font-medium">{intakeData.technologyType}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-slate-400">Company Boilerplate</label>
                <p className="text-white">{intakeData.companyBoilerplate}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-slate-400">Key Challenges Addressed</label>
                <p className="text-white">{intakeData.keyChallenges}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Target Organization Size</label>
                <p className="text-white font-medium">{intakeData.targetOrgSize}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Meeting Package</label>
                <p className="text-white font-medium">{intakeData.meetingPackage} meetings</p>
              </div>
            </div>
          </div>

          {/* Primary Representative */}
          <div className="glass-card p-6 border-slate-700">
            <h3 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Primary Representative
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400">Name</label>
                <p className="text-white font-medium">{intakeData.firstName} {intakeData.lastName}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Job Title</label>
                <p className="text-white font-medium">{intakeData.jobTitle}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <p className="text-white">{intakeData.email}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400 flex items-center gap-1">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </label>
                <a 
                  href={intakeData.linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Profile
                </a>
              </div>
            </div>
          </div>

          {/* Second Representative (if provided) */}
          {intakeData.secondRepName && (
            <div className="glass-card p-6 border-slate-700">
              <h3 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Second Representative
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Name</label>
                  <p className="text-white font-medium">{intakeData.secondRepName}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Job Title</label>
                  <p className="text-white font-medium">{intakeData.secondRepJobTitle || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-white">{intakeData.secondRepEmail || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400 flex items-center gap-1">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </label>
                  {intakeData.secondRepLinkedinUrl ? (
                    <a 
                      href={intakeData.secondRepLinkedinUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Profile
                    </a>
                  ) : (
                    <p className="text-slate-400">N/A</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submission Info */}
          <div className="glass-card p-4 border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-slate-400">Submitted At</label>
                <p className="text-white font-medium">
                  {intakeData.submittedAt ? new Date(intakeData.submittedAt).toLocaleString() : "N/A"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={downloadCSV}>
                    Download as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadPDF}>
                    Download as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
