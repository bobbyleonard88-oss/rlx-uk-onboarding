/**
 * Match Reason Modal Component
 * Displays AI-generated match reasoning in a native modal dialog
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MatchReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delegateName: string;
  matchScore: number;
  matchReason: string;
}

export default function MatchReasonModal({
  open,
  onOpenChange,
  delegateName,
  matchScore,
  matchReason,
}: MatchReasonModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-white">
            Match Reasoning
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Why {delegateName} was matched for this meeting
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Match Score Badge */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Match Score:</span>
            <span className="text-3xl font-bold text-primary">
              {matchScore}%
            </span>
          </div>
          
          {/* Match Reasoning */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
              {matchReason}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
