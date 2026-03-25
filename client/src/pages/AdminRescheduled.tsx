import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Star, Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SLOT_TIMES: Record<number, string> = {
  1: "Wed 10:15", 2: "Wed 10:45", 3: "Wed 13:30", 4: "Wed 14:00",
  5: "Wed 14:45", 6: "Wed 15:15", 7: "Thu 10:30", 8: "Thu 11:00",
  9: "Thu 13:15", 10: "Thu 13:45", 11: "Thu 14:30", 12: "Thu 15:00",
};

export default function AdminRescheduled() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "starred">("starred");

  const { data: meetings, isLoading, refetch } = trpc.admin.getAllMeetingsWithRescheduled.useQuery();
  const utils = trpc.useUtils();

  const toggleMutation = trpc.admin.toggleMeetingRescheduled.useMutation({
    onMutate: async ({ meetingId, isRescheduled }) => {
      // Optimistic update
      await utils.admin.getAllMeetingsWithRescheduled.cancel();
      const prev = utils.admin.getAllMeetingsWithRescheduled.getData();
      utils.admin.getAllMeetingsWithRescheduled.setData(undefined, (old) =>
        old?.map((m) => m.id === meetingId ? { ...m, isRescheduled } : m)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.admin.getAllMeetingsWithRescheduled.setData(undefined, context.prev);
      }
      toast.error("Failed to update meeting");
    },
    onSuccess: (_data, { isRescheduled }) => {
      toast.success(isRescheduled ? "Meeting marked as rescheduled ★" : "Rescheduled star removed");
    },
    onSettled: () => {
      utils.admin.getAllMeetingsWithRescheduled.invalidate();
    },
  });

  const filtered = (meetings ?? []).filter((m) => {
    if (filter === "starred" && !m.isRescheduled) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.sponsorName.toLowerCase().includes(q) ||
      m.delegateName.toLowerCase().includes(q) ||
      m.delegateCompany.toLowerCase().includes(q)
    );
  });

  const starredCount = (meetings ?? []).filter((m) => m.isRescheduled).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AdminHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Rescheduled Meetings</h1>
              <p className="text-slate-400 text-sm">
                Star meetings to show the gold ★ badge on the public table plan
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {starredCount} rescheduled {starredCount === 1 ? "meeting" : "meetings"}
            </span>
            <span className="text-slate-500 text-sm">
              {(meetings ?? []).length} total meetings
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sponsor, delegate, or company…"
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter(filter === "starred" ? "all" : "starred")}
              className={`h-10 px-4 border-slate-600 text-sm font-medium transition-colors ${
                filter === "starred"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/20"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <Star className={`w-3.5 h-3.5 mr-1.5 ${filter === "starred" ? "fill-amber-400 text-amber-400" : ""}`} />
              {filter === "starred" ? "Showing starred" : "Show all"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-10 px-3 border-slate-600 bg-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {filter === "starred"
              ? "No rescheduled meetings yet. Switch to 'Show all' to star meetings."
              : "No meetings match your search."}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Sponsor</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Delegate</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Slot</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Rescheduled</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`border-b border-slate-700/50 transition-colors hover:bg-slate-800/40 ${
                      m.isRescheduled ? "bg-amber-500/5" : ""
                    } ${i === filtered.length - 1 ? "border-b-0" : ""}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{m.sponsorName}</td>
                    <td className="px-4 py-3 text-slate-200">{m.delegateName}</td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{m.delegateCompany}</td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {m.timeSlot ? SLOT_TIMES[m.timeSlot] ?? `Slot ${m.timeSlot}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({ meetingId: m.id, isRescheduled: !m.isRescheduled })
                        }
                        disabled={toggleMutation.isPending}
                        title={m.isRescheduled ? "Remove rescheduled star" : "Mark as rescheduled"}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                          m.isRescheduled
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
                            : "bg-slate-800 border-slate-600 text-slate-500 hover:border-amber-500/40 hover:text-amber-400"
                        }`}
                      >
                        <Star className={`w-4 h-4 ${m.isRescheduled ? "fill-amber-400" : ""}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-sm text-slate-400">
          <p>
            <span className="text-amber-400 font-medium">★ Starred meetings</span> appear with a gold "Rescheduled" badge on the public{" "}
            <a href="/table-plan" target="_blank" className="text-blue-400 hover:underline">
              /table-plan
            </a>{" "}
            page. Changes take effect immediately — no page reload required for visitors.
          </p>
        </div>
      </div>
    </div>
  );
}
