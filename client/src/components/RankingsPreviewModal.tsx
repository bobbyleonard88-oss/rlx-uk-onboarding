/**
 * Rankings Preview Modal
 * Displays sponsor's ranked delegate preferences in a formatted view
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ListOrdered, Trophy, Medal, Award } from "lucide-react";

interface RankingsPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rankingsData: string; // JSON string of ranked attendee IDs
  companyName: string;
  attendees: any[]; // Full attendee list to look up names
}

export default function RankingsPreviewModal({ 
  open, 
  onOpenChange, 
  rankingsData, 
  companyName,
  attendees 
}: RankingsPreviewModalProps) {
  if (!rankingsData) return null;

  let rankedIds: string[] = [];
  try {
    rankedIds = JSON.parse(rankingsData);
  } catch (e) {
    console.error("Failed to parse rankings data:", e);
    return null;
  }

  // Look up attendee details for each ranked ID
  const rankedAttendees = rankedIds.map((id, index) => {
    const attendee = attendees.find(a => a.id === id);
    return {
      rank: index + 1,
      id,
      name: attendee ? `${attendee.firstName} ${attendee.lastName}` : "Unknown Delegate",
      company: attendee?.company || "N/A",
      jobTitle: attendee?.jobTitle || "N/A",
    };
  });

  const downloadCSV = () => {
    const headers = ["Rank", "Delegate ID", "Name", "Company", "Job Title"];
    const rows = rankedAttendees.map(a => [
      a.rank,
      a.id,
      a.name,
      a.company,
      a.jobTitle,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${companyName.replace(/[^a-z0-9]/gi, '_')}_rankings.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <ListOrdered className="w-5 h-5 text-slate-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[520px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-white flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-primary" />
            {companyName} - Meeting Rankings
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Sponsor's prioritized delegate list ({rankedAttendees.length} delegates ranked)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Top 3 Highlights */}
          {rankedAttendees.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {rankedAttendees.slice(0, 3).map((attendee) => (
                <div 
                  key={attendee.id}
                  className="glass-card p-4 border-slate-700 text-center"
                >
                  <div className="flex justify-center mb-2">
                    {getRankIcon(attendee.rank)}
                  </div>
                  <p className="text-sm text-slate-400">Rank #{attendee.rank}</p>
                  <p className="text-white font-semibold mt-1">{attendee.name}</p>
                  <p className="text-sm text-slate-300">{attendee.company}</p>
                </div>
              ))}
            </div>
          )}

          {/* Full Rankings List */}
          <div className="glass-card p-6 border-slate-700">
            <h3 className="text-lg font-heading font-semibold text-white mb-4">
              Complete Rankings
            </h3>
            <div className="space-y-2">
              {rankedAttendees.map((attendee) => (
                <div 
                  key={attendee.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(attendee.rank)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-500">#{attendee.rank}</span>
                      <span className="text-white font-semibold">{attendee.name}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                      <span>{attendee.company}</span>
                      <span>•</span>
                      <span>{attendee.jobTitle}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download Button */}
          <div className="flex justify-end">
            <Button onClick={downloadCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download Rankings CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
