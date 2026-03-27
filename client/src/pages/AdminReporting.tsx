import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle2, AlertCircle, FileText, Download } from "lucide-react";
import { toast } from "sonner";

const SLOT_TIMES: Record<number, string> = {
  1: "Wed 10:15", 2: "Wed 10:45", 3: "Wed 13:30", 4: "Wed 14:00",
  5: "Wed 14:45", 6: "Wed 15:15", 7: "Thu 10:30", 8: "Thu 11:00",
  9: "Thu 13:15", 10: "Thu 13:45", 11: "Thu 14:30", 12: "Thu 15:00",
};

type Tier = "green" | "amber" | "red";

function TierBadge({ tier }: { tier: Tier }) {
  if (tier === "green") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
        🟢 Active
      </span>
    );
  }
  if (tier === "amber") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
        🟡 Future
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
      🔴 No fit
    </span>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  const colors =
    rating >= 4 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    rating === 3 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                  "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {rating}/5
    </span>
  );
}

function OptInBadge({ optedIn }: { optedIn: boolean }) {
  return optedIn ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30">
      ✓ Opted in
    </span>
  ) : (
    <span className="text-slate-500 text-xs">—</span>
  );
}

const TIER_LABELS: Record<Tier, string> = {
  green: "🟢 Active opportunity",
  amber: "🟡 Future potential",
  red: "🔴 Not a fit",
};

function downloadCSV(sponsorName: string, meetings: any[]) {
  const headers = ["Time Slot", "Delegate", "Company", "Job Title", "Rank", "Match %", "Opted In", "Rating", "Opportunity"];
  const rows = meetings.map((m) => [
    SLOT_TIMES[m.timeSlot] ?? `Slot ${m.timeSlot}`,
    m.delegateName,
    m.delegateCompany,
    m.delegateJobTitle,
    m.rankPosition ? `#${m.rankPosition}` : "Unranked",
    m.matchScore != null ? `${m.matchScore}%` : "—",
    m.optedIn ? "Yes" : "No",
    m.meetingRating != null ? `${m.meetingRating}/5` : "—",
    TIER_LABELS[m.opportunityTier as Tier] ?? "—",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `RLX-2026-${sponsorName.replace(/\s+/g, "-")}-Meeting-Report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReporting() {
  const [selectedSponsorId, setSelectedSponsorId] = useState<number | null>(null);
  const [reportRequested, setReportRequested] = useState(false);

  const { data: sponsorStatuses, isLoading: loadingStatuses } = trpc.admin.getReportableSponsorStatus.useQuery();

  const {
    data: report,
    isLoading: loadingReport,
    error: reportError,
    refetch: fetchReport,
  } = trpc.admin.getSponsorReport.useQuery(
    { sponsorId: selectedSponsorId! },
    { enabled: false, retry: false }
  );

  const selectedStatus = sponsorStatuses?.find((s) => s.id === selectedSponsorId);

  const handleGenerate = async () => {
    if (!selectedSponsorId) return;
    setReportRequested(true);
    await fetchReport();
  };

  const handleDownload = () => {
    if (!report) return;
    downloadCSV(report.sponsorName, report.meetings);
    toast.success("CSV downloaded");
  };

  const tierCounts = report
    ? {
        green: report.meetings.filter((m: any) => m.opportunityTier === "green").length,
        amber: report.meetings.filter((m: any) => m.opportunityTier === "amber").length,
        red: report.meetings.filter((m: any) => m.opportunityTier === "red").length,
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <AdminHeader />
      <div className="p-6 max-w-screen-2xl mx-auto">

        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-heading">Sponsor Reports</h1>
            <p className="text-slate-400 text-sm">Generate a full meeting report for any sponsor. All meetings must be rated first.</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">

          {/* Left column: sponsor list */}
          <div className="w-64 shrink-0">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sticky top-6">
              <h2 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Sponsors</h2>
              {loadingStatuses ? (
                <div className="text-slate-400 text-sm">Loading…</div>
              ) : (
                <div className="space-y-1.5">
                  {sponsorStatuses?.map((s) => {
                    const isSelected = selectedSponsorId === s.id;
                    const ready = s.allRated && s.totalMeetings > 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSponsorId(s.id);
                          setReportRequested(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-violet-500/20 border-violet-500/50 text-white"
                            : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-700/40 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{s.name}</span>
                          {ready ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs mt-0.5 text-slate-500">
                          {s.ratedMeetings}/{s.totalMeetings} rated
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column: full report panel */}
          <div className="flex-1 min-w-0">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">

              {/* No sponsor selected */}
              {!selectedSponsorId && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a sponsor to generate their report</p>
                  </div>
                </div>
              )}

              {selectedSponsorId && (
                <>
                  {/* Report header */}
                  <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-white font-bold text-lg">{selectedStatus?.name}</h2>
                      <p className="text-slate-400 text-sm">
                        {selectedStatus?.ratedMeetings} of {selectedStatus?.totalMeetings} meetings rated
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {report && reportRequested && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                          className="border-slate-600 text-slate-300 hover:text-white bg-slate-800 h-9 gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          CSV
                        </Button>
                      )}
                      <Button
                        onClick={handleGenerate}
                        disabled={loadingReport || !selectedStatus?.allRated}
                        className="bg-violet-600 hover:bg-violet-500 text-white h-9 px-4 gap-1.5 disabled:opacity-50"
                      >
                        {loadingReport ? (
                          <>
                            <span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            Generate Report
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Blocked state */}
                  {!selectedStatus?.allRated && (
                    <div className="m-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-300 font-medium text-sm">Report unavailable</p>
                        <p className="text-amber-400/70 text-xs mt-0.5">
                          {(selectedStatus?.totalMeetings ?? 0) - (selectedStatus?.ratedMeetings ?? 0)} meeting
                          {((selectedStatus?.totalMeetings ?? 0) - (selectedStatus?.ratedMeetings ?? 0)) !== 1 ? "s" : ""} still need to be rated before this report can be generated.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {reportError && reportRequested && (
                    <div className="m-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{reportError.message}</p>
                    </div>
                  )}

                  {/* Summary stats */}
                  {report && reportRequested && !loadingReport && tierCounts && (
                    <div className="px-5 py-4 border-b border-slate-700/50 grid grid-cols-5 gap-3">
                      <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-white">{report.totalMeetings}</div>
                        <div className="text-slate-400 text-xs mt-0.5">Meetings</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-amber-400">{report.avgRating.toFixed(2)}</div>
                        <div className="text-slate-400 text-xs mt-0.5">Avg ★</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-400">{tierCounts.green}</div>
                        <div className="text-slate-400 text-xs mt-0.5">🟢 Active</div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-amber-400">{tierCounts.amber}</div>
                        <div className="text-slate-400 text-xs mt-0.5">🟡 Future</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-red-400">{tierCounts.red}</div>
                        <div className="text-slate-400 text-xs mt-0.5">🔴 No fit</div>
                      </div>
                    </div>
                  )}

                  {/* Report table */}
                  {report && reportRequested && !loadingReport && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Slot</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Delegate</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Company</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Rank</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Match %</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Opted In</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Rating</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap">Opportunity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.meetings.map((m: any, i: number) => (
                            <tr
                              key={m.meetingId}
                              className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${
                                i % 2 === 0 ? "" : "bg-slate-800/20"
                              }`}
                            >
                              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                                {SLOT_TIMES[m.timeSlot] ?? `Slot ${m.timeSlot}`}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-white font-medium whitespace-nowrap">{m.delegateName}</div>
                                <div className="text-slate-400 text-xs mt-0.5">{m.delegateJobTitle}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{m.delegateCompany}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs">
                                {m.rankPosition ? (
                                  <span className="font-mono text-violet-300">#{m.rankPosition}</span>
                                ) : (
                                  <span className="text-slate-500">Unranked</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {m.matchScore != null ? (
                                  <span className={`font-mono text-sm font-semibold ${
                                    m.matchScore >= 80 ? "text-emerald-400" :
                                    m.matchScore >= 60 ? "text-amber-400" : "text-slate-400"
                                  }`}>
                                    {m.matchScore}%
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <OptInBadge optedIn={m.optedIn} />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <RatingBadge rating={m.meetingRating} />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <TierBadge tier={m.opportunityTier as Tier} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
