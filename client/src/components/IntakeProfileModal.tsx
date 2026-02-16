/**
 * Intake Profile Preview Modal
 * Displays full intake form data in a formatted, readable view
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Building2, Users, Mail, Briefcase, Linkedin } from "lucide-react";

interface IntakeProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakeData: any;
  companyName: string;
}

export default function IntakeProfileModal({ open, onOpenChange, intakeData, companyName }: IntakeProfileModalProps) {
  if (!intakeData) return null;

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            {companyName} - Intake Profile
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Complete intake form submission details
          </DialogDescription>
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
              <Button onClick={downloadCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
