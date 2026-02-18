import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface MeetingNotesModalProps {
  open: boolean;
  onClose: () => void;
  meetingId: number;
  delegateName: string;
  initialNotes: string;
  onSave: (meetingId: number, notes: string) => Promise<void>;
}

export function MeetingNotesModal({
  open,
  onClose,
  meetingId,
  delegateName,
  initialNotes,
  onSave,
}: MeetingNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(meetingId, notes);
      onClose();
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            Admin Notes - {delegateName}
          </DialogTitle>
          <p className="text-slate-400 text-sm mt-1">
            These notes are only visible to admins and will not be shared with sponsors.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add private notes about this meeting (e.g., VIP delegate, follow-up needed, special requirements...)"
            className="min-h-[150px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="bg-slate-800 border-slate-700 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Notes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
