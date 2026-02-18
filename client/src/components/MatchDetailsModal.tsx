import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchScore: number;
  matchReason: string;
  delegate: {
    firstName: string;
    lastName: string;
    company: string;
    jobTitle: string;
    challenges?: string;
    interests?: string;
    painPoints?: string;
    budget?: string;
    orgSize?: string;
    regionalRemit?: string;
    industry?: string;
  };
  sponsor: {
    companyName: string;
    solutions?: string;
    painPointsSolved?: string;
    targetOrgSize?: string;
    targetIndustries?: string;
  };
}

export function MatchDetailsModal({
  isOpen,
  onClose,
  matchScore,
  matchReason,
  delegate,
  sponsor,
}: MatchDetailsModalProps) {
  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Match Details</DialogTitle>
        </DialogHeader>

        {/* Match Score and Reasoning */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium">Match Score:</span>
            <Badge variant={getScoreBadgeVariant(matchScore)} className="text-lg px-3 py-1">
              <span className={getScoreColor(matchScore)}>{matchScore}%</span>
            </Badge>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-base font-medium mb-2">AI Match Reasoning:</p>
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{matchReason}</p>
          </div>
        </div>

        <Separator />

        {/* Side-by-side comparison */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Delegate Profile - Left Panel */}
            <div className="space-y-4">
              <div className="sticky top-0 bg-background pb-2">
                <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                  Delegate Profile
                </h3>
                <p className="text-base font-medium mt-1">
                  {delegate.firstName} {delegate.lastName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {delegate.jobTitle} at {delegate.company}
                </p>
              </div>

              <Separator />

              {/* Delegate Details */}
              <div className="space-y-4">
                {delegate.industry && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Industry
                    </p>
                    <p className="text-base">{delegate.industry}</p>
                  </div>
                )}

                {delegate.orgSize && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Organization Size
                    </p>
                    <p className="text-base">{delegate.orgSize}</p>
                  </div>
                )}

                {delegate.regionalRemit && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Regional Remit
                    </p>
                    <p className="text-base">{delegate.regionalRemit === "Other" ? "Global" : delegate.regionalRemit}</p>
                  </div>
                )}

                {delegate.challenges && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 uppercase tracking-wide mb-2">
                      🎯 Challenges & Needs
                    </p>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {delegate.challenges}
                    </p>
                  </div>
                )}

                {delegate.painPoints && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-400 uppercase tracking-wide mb-2">
                      ⚠️ Pain Points
                    </p>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {delegate.painPoints}
                    </p>
                  </div>
                )}

                {delegate.interests && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-400 uppercase tracking-wide mb-2">
                      ✨ Solution Interests
                    </p>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {delegate.interests}
                    </p>
                  </div>
                )}

                {delegate.budget && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Budget
                    </p>
                    <p className="text-base">{delegate.budget}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sponsor Profile - Right Panel */}
            <div className="space-y-4">
              <div className="sticky top-0 bg-background pb-2">
                <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                  Sponsor Profile
                </h3>
                <p className="text-base font-medium mt-1">{sponsor.companyName}</p>
              </div>

              <Separator />

              {/* Sponsor Details */}
              <div className="space-y-4">
                {sponsor.targetOrgSize && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Target Organization Size
                    </p>
                    <p className="text-base">{sponsor.targetOrgSize}</p>
                  </div>
                )}

                {sponsor.targetIndustries && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Target Industries
                    </p>
                    <p className="text-base">{sponsor.targetIndustries}</p>
                  </div>
                )}

                {sponsor.solutions && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wide mb-2">
                      💡 Solutions & Offerings
                    </p>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {sponsor.solutions}
                    </p>
                  </div>
                )}

                {sponsor.painPointsSolved && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-400 uppercase tracking-wide mb-2">
                      ✅ Pain Points Solved
                    </p>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {sponsor.painPointsSolved}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Alignment Highlights */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Key Alignments
          </p>
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              {matchReason}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
