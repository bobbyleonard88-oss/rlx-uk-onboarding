import { useState, useCallback } from "react";
import { Star, CheckCircle2, Loader2, Save, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

function StarRating({
  rating,
  onRate,
  saving,
}: {
  rating: number | null | undefined;
  onRate: (r: number) => void;
  saving: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? rating ?? 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => !saving && onRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          disabled={saving}
          className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              star <= display
                ? "fill-amber-400 text-amber-400"
                : "text-white/20 fill-transparent"
            }`}
          />
        </button>
      ))}
      {saving && <Loader2 className="w-4 h-4 text-white/40 animate-spin ml-1" />}
      {!saving && rating && (
        <CheckCircle2 className="w-4 h-4 text-green-400 ml-1" />
      )}
    </div>
  );
}

const SLOT_TIMES: Record<number, string> = {
  1: "Wed 10:15",
  2: "Wed 10:45",
  3: "Wed 13:30",
  4: "Wed 14:00",
  5: "Wed 14:45",
  6: "Wed 15:15",
  7: "Thu 10:30",
  8: "Thu 11:00",
  9: "Thu 13:15",
  10: "Thu 13:45",
  11: "Thu 14:30",
  12: "Thu 15:00",
};

function MeetingCard({
  meeting,
  savingRatingId,
  onRate,
}: {
  meeting: {
    id: number;
    timeSlot: number | null;
    meetingRating: number | null;
    meetingNotes: string | null;
    delegateProfile: {
      firstName?: string | null;
      lastName?: string | null;
      jobTitle?: string | null;
      company?: string | null;
    } | null;
  };
  savingRatingId: number | null;
  onRate: (meetingId: number, rating: number) => void;
}) {
  const utils = trpc.useUtils();
  const delegate = meeting.delegateProfile;
  const name = delegate
    ? `${delegate.firstName ?? ""} ${delegate.lastName ?? ""}`.trim()
    : "Delegate";
  const jobTitle = delegate?.jobTitle ?? "";
  const company = delegate?.company ?? "";
  const slotTime = SLOT_TIMES[meeting.timeSlot ?? 0] ?? `Slot ${meeting.timeSlot}`;

  const [notes, setNotes] = useState(meeting.meetingNotes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const noteMutation = trpc.rankings.saveMeetingNote.useMutation({
    onMutate: () => {
      setSavingNote(true);
      setNoteSaved(false);
    },
    onSuccess: () => {
      setSavingNote(false);
      setNoteSaved(true);
      utils.sponsor.getMyMeetings.invalidate();
      setTimeout(() => setNoteSaved(false), 3000);
    },
    onError: () => {
      setSavingNote(false);
    },
  });

  const handleBlur = useCallback(() => {
    const trimmed = notes.trim();
    if (trimmed !== (meeting.meetingNotes ?? "").trim()) {
      noteMutation.mutate({ meetingId: meeting.id, notes: trimmed });
    }
  }, [notes, meeting.meetingNotes, meeting.id, noteMutation]);

  return (
    <div
      className={`glass-card rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 ${
        meeting.meetingRating ? "border border-amber-400/20" : "border border-white/5"
      }`}
    >
      {/* Top row: slot badge + name + stars */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 whitespace-nowrap mt-0.5">
          {slotTime}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{name}</p>
          {(jobTitle || company) && (
            <p className="text-white/50 text-xs truncate">
              {[jobTitle, company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <StarRating
            rating={meeting.meetingRating}
            saving={savingRatingId === meeting.id}
            onRate={(r) => onRate(meeting.id, r)}
          />
        </div>
      </div>

      {/* Notes textarea — locked until a star rating is given */}
      <div className="relative">
        <textarea
          value={notes}
          onChange={(e) => meeting.meetingRating && setNotes(e.target.value)}
          onBlur={meeting.meetingRating ? handleBlur : undefined}
          placeholder={meeting.meetingRating ? "Add notes about this meeting…" : "Rate this meeting first to add notes…"}
          rows={2}
          disabled={!meeting.meetingRating}
          className={`w-full border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none transition-all ${
            meeting.meetingRating
              ? "bg-white/5 border-white/10 text-white/80 placeholder:text-white/25 focus:border-purple-500/50 focus:bg-white/8 cursor-text"
              : "bg-white/2 border-white/5 text-white/20 placeholder:text-white/20 cursor-not-allowed opacity-50"
          }`}
        />
        {!meeting.meetingRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/25 text-[10px] flex items-center gap-1">
              <Star className="w-3 h-3" /> Rate first
            </span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {savingNote && <Loader2 className="w-3 h-3 text-white/30 animate-spin" />}
          {noteSaved && !savingNote && (
            <span className="text-green-400/70 text-[10px] flex items-center gap-1">
              <Save className="w-3 h-3" /> Saved
            </span>
          )}
          {!savingNote && !noteSaved && notes.trim() && meeting.meetingRating && (
            <MessageSquare className="w-3 h-3 text-white/20" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Feedback() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const { data: meetings, isLoading } = trpc.sponsor.getMyMeetings.useQuery(undefined, {
    enabled: !!user,
  });

  const [savingRatingId, setSavingRatingId] = useState<number | null>(null);

  const rateMutation = trpc.rankings.rateMeeting.useMutation({
    onMutate: ({ meetingId }) => setSavingRatingId(meetingId),
    onSettled: () => {
      setSavingRatingId(null);
      utils.sponsor.getMyMeetings.invalidate();
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/60">Please log in to leave feedback.</p>
          <a href={getLoginUrl()} className="text-purple-400 underline text-sm">Log in</a>
        </div>
      </div>
    );
  }

  const confirmedMeetings = (meetings ?? []).filter(
    (m) => m.status === "confirmed" || m.status === "suggested"
  ).sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0));

  const allRated = confirmedMeetings.length > 0 &&
    confirmedMeetings.every((m) => m.meetingRating != null && m.meetingRating > 0);

  const ratedCount = confirmedMeetings.filter(
    (m) => m.meetingRating != null && m.meetingRating > 0
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-10 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white mb-1">Meeting Feedback</h1>
        <p className="text-white/60 text-sm">
          Rate each of your 1:1 meetings and add any notes. Once all meetings are rated, the event feedback form will appear below.
        </p>
      </div>

      {/* Progress */}
      {confirmedMeetings.length > 0 && (
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/70 text-sm">Meetings rated</span>
              <span className="text-white font-medium text-sm">{ratedCount} / {confirmedMeetings.length}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${confirmedMeetings.length > 0 ? (ratedCount / confirmedMeetings.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          {allRated && (
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>All rated!</span>
            </div>
          )}
        </div>
      )}

      {/* Meeting grid */}
      {confirmedMeetings.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-white/40 text-sm">No confirmed meetings yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {confirmedMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={{
                id: meeting.id,
                timeSlot: meeting.timeSlot,
                meetingRating: meeting.meetingRating,
                meetingNotes: meeting.meetingNotes,
                delegateProfile: meeting.delegateProfile,
              }}
              savingRatingId={savingRatingId}
              onRate={(id, r) => rateMutation.mutate({ meetingId: id, rating: r })}
            />
          ))}
        </div>
      )}

      {/* Monday.com feedback form — shown once all meetings are rated */}
      {allRated && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-heading font-semibold text-white">
              Event Feedback Form
            </h2>
          </div>
          <p className="text-white/50 text-sm">
            You've rated all your meetings — please take a moment to complete our short event feedback form.
          </p>
          <div className="glass-card rounded-2xl overflow-hidden p-4 flex justify-center">
            <iframe
              src="https://forms.monday.com/forms/embed/72bb02339d10616b3f55d5ddd78070e4?r=use1"
              width="650"
              height="500"
              style={{ border: 0, boxShadow: "5px 5px 56px 0px rgba(0,0,0,0.25)", maxWidth: "100%" }}
              title="RLX Event Feedback Form"
            />
          </div>
        </div>
      )}

      {/* Teaser when not all rated */}
      {!allRated && confirmedMeetings.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-dashed border-white/10 text-center space-y-2">
          <Star className="w-8 h-8 text-white/20 mx-auto" />
          <p className="text-white/40 text-sm">
            Rate all {confirmedMeetings.length} meetings to unlock the event feedback form.
          </p>
          <p className="text-white/25 text-xs">
            {confirmedMeetings.length - ratedCount} remaining
          </p>
        </div>
      )}
    </div>
  );
}
