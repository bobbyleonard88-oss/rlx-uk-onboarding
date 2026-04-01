import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Star, Download, MessageSquare, ChevronDown, ChevronRight, Search, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SLOT_TIMES: Record<number, string> = {
  1: "Wed 10:15", 2: "Wed 10:45", 3: "Wed 13:30", 4: "Wed 14:00",
  5: "Wed 14:45", 6: "Wed 15:15", 7: "Thu 10:30", 8: "Thu 11:00",
  9: "Thu 13:15", 10: "Thu 13:45", 11: "Thu 14:30", 12: "Thu 15:00",
};

type Tier = "green" | "yellow" | "orange" | "red";

function getTier(rating: number | null): Tier | null {
  if (!rating || rating <= 0) return null;
  if (rating >= 4) return "green";
  if (rating === 3) return "yellow";
  if (rating === 2) return "orange";
  return "red";
}

function TierBadge({ tier }: { tier: Tier }) {
  if (tier === "green") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
      🟢 Immediate Opportunity
    </span>
  );
  if (tier === "yellow") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
      🟡 Medium Term
    </span>
  );
  if (tier === "orange") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 whitespace-nowrap">
      🟠 Longer Term
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
      🔴 No Fit
    </span>
  );
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-slate-500 text-xs">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600 fill-transparent"}`}
        />
      ))}
      <span className="text-amber-400 text-xs ml-1 font-medium">{rating}/5</span>
    </div>
  );
}

function ConfirmDialog({
  sponsorName,
  onConfirm,
  onCancel,
}: {
  sponsorName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">Clear All Ratings?</h3>
            <p className="text-slate-400 text-sm mt-1">
              This will permanently wipe all star ratings for <span className="text-white font-medium">{sponsorName}</span>. Notes will not be affected. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-slate-600 text-slate-300 hover:text-white bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Clear Ratings
          </Button>
        </div>
      </div>
    </div>
  );
}

function SponsorGroup({
  sponsorId,
  sponsorName,
  meetings,
  onRatingsCleared,
}: {
  sponsorId: number;
  sponsorName: string;
  meetings: Array<{
    meetingId: number;
    delegateName: string;
    delegateCompany: string;
    delegateJobTitle: string;
    timeSlot: number | null;
    meetingRating: number | null;
    meetingNotes: string;
  }>;
  onRatingsCleared: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const clearRatings = trpc.admin.clearSponsorRatings.useMutation({
    onSuccess: () => {
      toast.success(`Ratings cleared for ${sponsorName}`);
      setConfirmOpen(false);
      onRatingsCleared();
    },
    onError: () => {
      toast.error("Failed to clear ratings. Please try again.");
      setConfirmOpen(false);
    },
  });

  const avgRating = useMemo(() => {
    const rated = meetings.filter(m => m.meetingRating != null && m.meetingRating > 0);
    if (!rated.length) return null;
    return rated.reduce((s, m) => s + (m.meetingRating ?? 0), 0) / rated.length;
  }, [meetings]);
  const notedCount = meetings.filter(m => m.meetingNotes?.trim()).length;
  const ratedCount = meetings.filter(m => m.meetingRating != null && m.meetingRating > 0).length;
  const greenCount = meetings.filter(m => (m.meetingRating ?? 0) >= 4).length;
  const yellowCount = meetings.filter(m => (m.meetingRating ?? 0) === 3).length;
  const orangeCount = meetings.filter(m => (m.meetingRating ?? 0) === 2).length;
  const redCount = meetings.filter(m => (m.meetingRating ?? 0) === 1).length;

  return (
    <>
      {confirmOpen && (
        <ConfirmDialog
          sponsorName={sponsorName}
          onConfirm={() => clearRatings.mutate({ sponsorId })}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      <div className="border border-slate-700 rounded-xl overflow-hidden mb-3">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {open ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            <span className="text-white font-semibold text-sm truncate">{sponsorName}</span>
            <span className="text-slate-500 text-xs flex-shrink-0">{meetings.length} meeting{meetings.length !== 1 ? "s" : ""}</span>
            <span className="text-slate-400 text-xs flex-shrink-0">
              {ratedCount}/{meetings.length} rated
            </span>
            {notedCount > 0 && (
              <span className="flex items-center gap-1 text-purple-400 text-xs flex-shrink-0">
                <MessageSquare className="w-3 h-3" /> {notedCount} note{notedCount !== 1 ? "s" : ""}
              </span>
            )}
            {ratedCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs flex-shrink-0">
                {greenCount > 0 && <span className="text-emerald-400">🟢 {greenCount} ({Math.round((greenCount / ratedCount) * 100)}%)</span>}
                {yellowCount > 0 && <span className="text-yellow-400">🟡 {yellowCount} ({Math.round((yellowCount / ratedCount) * 100)}%)</span>}
                {orangeCount > 0 && <span className="text-orange-400">🟠 {orangeCount} ({Math.round((orangeCount / ratedCount) * 100)}%)</span>}
                {redCount > 0 && <span className="text-red-400">🔴 {redCount} ({Math.round((redCount / ratedCount) * 100)}%)</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
            {avgRating != null && (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-slate-500 text-xs">avg</span>
              </div>
            )}
{/* Clear ratings button temporarily hidden — ratings backed up 2026-03-27 */
            /* {ratedCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2.5 py-1 bg-red-500/10 hover:bg-red-500/15 transition-colors"
                title={`Clear all ratings for ${sponsorName}`}
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear ratings</span>
              </button>
            )} */}
          </div>
        </button>

        {open && (
          <div className="divide-y divide-slate-700/50">
            {meetings.map((m) => (
              <div key={m.meetingId} className="px-5 py-3 bg-slate-900/30 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                {/* Delegate info */}
                <div>
                  <p className="text-white text-sm font-medium">{m.delegateName}</p>
                  <p className="text-slate-400 text-xs">{[m.delegateJobTitle, m.delegateCompany].filter(Boolean).join(" · ")}</p>
                  <span className="inline-block mt-1 text-xs text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {SLOT_TIMES[m.timeSlot ?? 0] ?? `Slot ${m.timeSlot}`}
                  </span>
                </div>

                {/* Notes */}
                <div>
                  {m.meetingNotes?.trim() ? (
                    <p className="text-slate-300 text-sm leading-relaxed italic">"{m.meetingNotes}"</p>
                  ) : (
                    <p className="text-slate-600 text-xs">No notes left</p>
                  )}
                </div>

                {/* Rating + Tier */}
                <div className="flex flex-col items-end gap-1.5">
                  <StarDisplay rating={m.meetingRating} />
                  {getTier(m.meetingRating) && (
                    <TierBadge tier={getTier(m.meetingRating)!} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminFeedbackNotes() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getFeedbackNotes.useQuery(
    { includeTestAccounts: false },
    { refetchOnWindowFocus: false }
  );

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { sponsorId: number; meetings: typeof data }>();
    for (const m of data) {
      const key = m.sponsorName;
      if (!map.has(key)) map.set(key, { sponsorId: m.sponsorId, meetings: [] });
      map.get(key)!.meetings.push(m);
    }
    return Array.from(map.entries()).map(([name, { sponsorId, meetings }]) => ({ name, sponsorId, meetings }));
  }, [data]);

  const filtered = useMemo(() => {
    let result = grouped;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result
        .map(g => ({
          ...g,
          meetings: g.meetings.filter(
            m =>
              m.delegateName.toLowerCase().includes(q) ||
              m.delegateCompany.toLowerCase().includes(q) ||
              g.name.toLowerCase().includes(q) ||
              m.meetingNotes?.toLowerCase().includes(q)
          ),
        }))
        .filter(g => g.meetings.length > 0);
    }
    if (tierFilter) {
      result = result
        .map(g => ({
          ...g,
          meetings: g.meetings.filter(m => getTier(m.meetingRating ?? null) === tierFilter),
        }))
        .filter(g => g.meetings.length > 0);
    }
    return result;
  }, [grouped, search, tierFilter]);

  const handleExport = () => {
    if (!data) return;
    const tierLabel = (rating: number | null) => {
      if (rating == null || rating === 0) return "";
      if (rating >= 4) return "Immediate Opportunity";
      if (rating === 3) return "Medium Term";
      if (rating === 2) return "Longer Term";
      if (rating === 1) return "No Fit";
      return "";
    };
    const headers = ["Sponsor", "Delegate", "Company", "Job Title", "Time Slot", "Rating", "Opportunity", "Notes"];
    const rows = data.map(m => [
      m.sponsorName,
      m.delegateName,
      m.delegateCompany,
      m.delegateJobTitle,
      SLOT_TIMES[m.timeSlot ?? 0] ?? `Slot ${m.timeSlot}`,
      m.meetingRating != null ? `${m.meetingRating}/5` : "",
      tierLabel(m.meetingRating ?? null),
      m.meetingNotes ?? "",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rlx-meeting-feedback-notes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalNotes = data?.filter(m => m.meetingNotes?.trim()).length ?? 0;
  const totalRated = data?.filter(m => m.meetingRating != null && m.meetingRating > 0).length ?? 0;
  const overallAvg = useMemo(() => {
    if (!data) return null;
    const rated = data.filter(m => m.meetingRating != null && m.meetingRating > 0);
    if (!rated.length) return null;
    return rated.reduce((s, m) => s + (m.meetingRating ?? 0), 0) / rated.length;
  }, [data]);

  const tierTotals = useMemo(() => {
    if (!data) return { green: 0, yellow: 0, orange: 0, red: 0 };
    const rated = data.filter(m => m.meetingRating != null && m.meetingRating > 0);
    return {
      green: rated.filter(m => (m.meetingRating ?? 0) >= 4).length,
      yellow: rated.filter(m => (m.meetingRating ?? 0) === 3).length,
      orange: rated.filter(m => (m.meetingRating ?? 0) === 2).length,
      red: rated.filter(m => (m.meetingRating ?? 0) === 1).length,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Feedback &amp; Notes</h1>
            <p className="text-slate-400 text-sm mt-1">
              Post-event meeting ratings and sponsor notes across all vendors
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={!data || data.length === 0}
            variant="outline"
            className="flex items-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 bg-slate-800"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Summary stats */}
        {data && data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{overallAvg != null ? overallAvg.toFixed(1) : "—"}</p>
              <p className="text-slate-400 text-xs mt-1">Avg rating</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{totalRated}</p>
              <p className="text-slate-400 text-xs mt-1">Meetings rated</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{totalNotes}</p>
              <p className="text-slate-400 text-xs mt-1">Notes left</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{tierTotals.green}</p>
              <p className="text-emerald-400/70 text-xs mt-1">🟢 Immediate Opportunity</p>
              {totalRated > 0 && <p className="text-emerald-400/50 text-xs">{Math.round((tierTotals.green / totalRated) * 100)}% of rated</p>}
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{tierTotals.yellow}</p>
              <p className="text-yellow-400/70 text-xs mt-1">🟡 Medium Term</p>
              {totalRated > 0 && <p className="text-yellow-400/50 text-xs">{Math.round((tierTotals.yellow / totalRated) * 100)}% of rated</p>}
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">{tierTotals.orange}</p>
              <p className="text-orange-400/70 text-xs mt-1">🟠 Longer Term</p>
              {totalRated > 0 && <p className="text-orange-400/50 text-xs">{Math.round((tierTotals.orange / totalRated) * 100)}% of rated</p>}
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{tierTotals.red}</p>
              <p className="text-red-400/70 text-xs mt-1">🔴 No Fit</p>
              {totalRated > 0 && <p className="text-red-400/50 text-xs">{Math.round((tierTotals.red / totalRated) * 100)}% of rated</p>}
            </div>
          </div>
        )}

        {/* Search + Tier Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by sponsor, delegate, company or note content…"
              className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTierFilter(null)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                tierFilter === null
                  ? 'bg-slate-600 border-slate-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTierFilter(tierFilter === 'green' ? null : 'green')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                tierFilter === 'green'
                  ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40'
              }`}
            >
              🟢 Immediate Opportunity
            </button>
            <button
              onClick={() => setTierFilter(tierFilter === 'yellow' ? null : 'yellow')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                tierFilter === 'yellow'
                  ? 'bg-yellow-500/25 border-yellow-500/60 text-yellow-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/40'
              }`}
            >
              🟡 Medium Term
            </button>
            <button
              onClick={() => setTierFilter(tierFilter === 'orange' ? null : 'orange')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                tierFilter === 'orange'
                  ? 'bg-orange-500/25 border-orange-500/60 text-orange-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-orange-400 hover:border-orange-500/40'
              }`}
            >
              🟠 Longer Term
            </button>
            <button
              onClick={() => setTierFilter(tierFilter === 'red' ? null : 'red')}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                tierFilter === 'red'
                  ? 'bg-red-500/25 border-red-500/60 text-red-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40'
              }`}
            >
              🔴 No Fit
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{search ? "No results match your search." : "No feedback submitted yet."}</p>
          </div>
        ) : (
          filtered.map(g => (
            <SponsorGroup
              key={g.name}
              sponsorId={g.sponsorId}
              sponsorName={g.name}
              meetings={g.meetings}
              onRatingsCleared={() => utils.admin.getFeedbackNotes.invalidate()}
            />
          ))
        )}
      </div>
    </div>
  );
}
