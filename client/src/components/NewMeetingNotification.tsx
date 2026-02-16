/**
 * New Meeting Notification Dialog
 * Shows a popup when sponsor logs in and has new scheduled meetings
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function NewMeetingNotification() {
  const [showDialog, setShowDialog] = useState(false);
  const { user, loading } = useAuth();
  
  // Get sponsor's meetings
  const { data: meetings } = trpc.sponsor.getMyMeetings.useQuery(
    undefined,
    { enabled: !!user }
  );

  useEffect(() => {
    if (!loading && user && meetings && meetings.length > 0) {
      // Check if user has already seen the notification
      const hasSeenNotification = localStorage.getItem('rlx-meetings-notification-seen');
      const hasMeetings = localStorage.getItem('rlx-has-meetings');
      
      // Show notification if meetings exist and user hasn't seen it yet
      if (hasMeetings && !hasSeenNotification) {
        setShowDialog(true);
      }
    }
  }, [user, loading, meetings]);

  const handleClose = () => {
    // Mark notification as seen
    localStorage.setItem('rlx-meetings-notification-seen', 'true');
    setShowDialog(false);
  };

  if (!meetings || meetings.length === 0) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md glass-card border-green-500/30">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <DialogTitle className="text-2xl text-white">
              Your Meetings Are Ready!
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-base">
            Great news! Your meeting schedule has been finalized. You have{" "}
            <span className="font-semibold text-accent">{meetings.length} meetings</span>{" "}
            scheduled across the event.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-accent" />
            <h4 className="font-semibold text-white">What's Next?</h4>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>View your complete meeting schedule with delegate details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Download individual or bulk delegate profiles for preparation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Review meeting times and plan your event schedule</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            I'll Check Later
          </Button>
          <Link href="/meeting-schedule" className="flex-1">
            <Button
              onClick={handleClose}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              View Schedule
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
