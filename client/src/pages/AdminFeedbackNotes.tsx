import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Star, Download, MessageSquare, ChevronDown, ChevronRight, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SLOT_TIMES: Record<number, string> = {
  1: "Wed 10:15", 2: "Wed 10:45", 3: "Wed 13:30", 4: "Wed 14:00",
  5: "Wed 14:45", 6: "Wed 15:15", 7: "Thu 10:30", 8: "Thu 11:00",
  9: "Thu 13:15", 10: "Thu 13:45", 11: "Thu 14:30", 12: "Thu 15:00",
};

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

function SponsorGroup({
  sponsorName,
  meetings,
}: {
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
}) {
  const [open, setOpen] = useState(true);
  const avgRating = useMemo(() => {
    const rated = meetings.filter(m => m.meetingRating != null && m.meetingRating > 0);
    if (!rated.length) return null;
    return rated.reduce((s, m) => s + (m.meetingRating ?? 0), 0) / rated.length;
  }, [meetings]);
  const notedCount = meetings.filter(m => m.meetingNotes?.trim()).length;

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="text-white font-semibold text-sm">{sponsorName}</span>
          <span className="text-slate-500 text-xs">{meetings.length} meeting{meetings.length !== 1 ? "s" : ""}</span>
          {notedCount > 0 && (
            <span className="flex items-center gap-1 text-purple-400 text-xs">
              <MessageSquare className="w-3 h-3" /> {notedCount} note{notedCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {avgRating != null && (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-slate-500 text-xs">avg</span>
            </div>
          )}
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

              {/* Rating */}
              <div className="flex justify-end">
                <StarDisplay rating={m.meetingRating} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminFeedbackNotes() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.admin.getFeedbackNotes.useQuery(
    { includeTestAccounts: false },
    { refetchOnWindowFocus: false }
  );

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, typeof data>();
    for (const m of data) {
      const key = m.sponsorName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).map(([name, meetings]) => ({ name, meetings }));
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped
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
  }, [grouped, search]);

  const handleExport = () => {
    if (!data) return;
    const headers = ["Sponsor", "Delegate", "Company", "Job Title", "Time Slot", "Rating", "Notes"];
    const rows = data.map(m => [
      m.sponsorName,
      m.delegateName,
      m.delegateCompany,
      m.delegateJobTitle,
      SLOT_TIMES[m.timeSlot ?? 0] ?? `Slot ${m.timeSlot}`,
      m.meetingRating != null ? `${m.meetingRating}/5` : "",
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{overallAvg != null ? overallAvg.toFixed(1) : "—"}</p>
              <p className="text-slate-400 text-xs mt-1">Overall avg rating</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{totalRated}</p>
              <p className="text-slate-400 text-xs mt-1">Meetings rated</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{totalNotes}</p>
              <p className="text-slate-400 text-xs mt-1">Notes left</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by sponsor, delegate, company or note content…"
            className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          />
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
            <SponsorGroup key={g.name} sponsorName={g.name} meetings={g.meetings} />
          ))
        )}
      </div>
    </div>
  );
}
