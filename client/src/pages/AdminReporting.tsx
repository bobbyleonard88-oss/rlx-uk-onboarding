import { useState, useRef, useCallback, useMemo } from "react";
import { ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, FileText, Download, Camera } from "lucide-react";
import { toast } from "sonner";
// @ts-ignore
import domtoimage from "dom-to-image-more";

const SLOT_TIMES: Record<number, string> = {
  1: "Wed 10:15", 2: "Wed 10:45", 3: "Wed 13:30", 4: "Wed 14:00",
  5: "Wed 14:45", 6: "Wed 15:15", 7: "Thu 10:30", 8: "Thu 11:00",
  9: "Thu 13:15", 10: "Thu 13:45", 11: "Thu 14:30", 12: "Thu 15:00",
};

type Tier = "green" | "yellow" | "orange" | "red";

function TierBadge({ tier }: { tier: Tier }) {
  if (tier === "green") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
        🟢 Immediate Opportunity
      </span>
    );
  }
  if (tier === "yellow") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
        🟡 Medium Term
      </span>
    );
  }
  if (tier === "orange") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 whitespace-nowrap">
        🟠 Longer Term
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
      🔴 No Fit
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
  green: "🟢 Immediate Opportunity",
  yellow: "🟡 Medium Term",
  orange: "🟠 Longer Term",
  red: "🔴 No Fit",
};

const TIER_ORDER: Record<string, number> = { green: 0, yellow: 1, orange: 2, red: 3 };

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

type SortCol = "slot" | "delegate" | "company" | "rank" | "match" | "optedin" | "rating" | "opportunity";
type SortDir = "asc" | "desc";

export default function AdminReporting() {
  const [selectedSponsorId, setSelectedSponsorId] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("slot");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const reportPanelRef = useRef<HTMLDivElement>(null);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

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

  // Auto-generate when a fully-rated sponsor is selected
  const handleSponsorClick = useCallback(async (sponsorId: number, allRated: boolean) => {
    setSelectedSponsorId(sponsorId);
    if (allRated) {
      // Small delay to let the query input update before refetching
      setTimeout(() => fetchReport(), 50);
    }
  }, [fetchReport]);

  const handleDownload = () => {
    if (!report) return;
    downloadCSV(report.sponsorName, report.meetings);
    toast.success("CSV downloaded");
  };

  const handleScreenshot = async () => {
    if (!reportPanelRef.current) return;
    setIsCapturing(true);
    try {
      const node = reportPanelRef.current;
      const dataUrl = await domtoimage.toPng(node, {
        bgcolor: "#1e293b",
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `RLX-2026-${report?.sponsorName?.replace(/\s+/g, "-") ?? "Report"}-Screenshot.png`;
      a.click();
      toast.success("Screenshot saved");
    } catch (err) {
      console.error("Screenshot error:", err);
      toast.error("Screenshot failed — please try again");
    } finally {
      setIsCapturing(false);
    }
  };

  const tierCounts = report
    ? {
        green: report.meetings.filter((m: any) => m.opportunityTier === "green").length,
        yellow: report.meetings.filter((m: any) => m.opportunityTier === "yellow").length,
        orange: report.meetings.filter((m: any) => m.opportunityTier === "orange").length,
        red: report.meetings.filter((m: any) => m.opportunityTier === "red").length,
      }
    : null;

  const showReport = report && !loadingReport;

  const sortedMeetings = useMemo(() => {
    if (!report?.meetings) return [];
    const meetings = [...report.meetings];
    meetings.sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (sortCol) {
        case "slot": av = a.timeSlot ?? 99; bv = b.timeSlot ?? 99; break;
        case "delegate": av = a.delegateName ?? ""; bv = b.delegateName ?? ""; break;
        case "company": av = a.delegateCompany ?? ""; bv = b.delegateCompany ?? ""; break;
        case "rank": av = a.rankPosition ?? 9999; bv = b.rankPosition ?? 9999; break;
        case "match": av = a.matchScore ?? -1; bv = b.matchScore ?? -1; break;
        case "optedin": av = a.optedIn ? 0 : 1; bv = b.optedIn ? 0 : 1; break;
        case "rating": av = a.meetingRating ?? -1; bv = b.meetingRating ?? -1; break;
        case "opportunity": av = TIER_ORDER[a.opportunityTier] ?? 99; bv = TIER_ORDER[b.opportunityTier] ?? 99; break;
        default: return 0;
      }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return meetings;
  }, [report, sortCol, sortDir]);

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
            <p className="text-slate-400 text-sm">Click a sponsor to generate their report. All meetings must be rated first.</p>
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
                        onClick={() => handleSponsorClick(s.id, ready)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-violet-500/20 border-violet-500/50 text-white"
                            : ready
                              ? "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-700/40 hover:text-white cursor-pointer"
                              : "bg-slate-800/20 border-slate-700/20 text-slate-500 cursor-default"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{s.name}</span>
                          {ready ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400/50 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs mt-0.5 text-slate-500">
                          {s.ratedMeetings}/{s.totalMeetings} rated
                          {ready && <span className="text-emerald-500/70 ml-1">· ready</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column: report panel */}
          <div className="flex-1 min-w-0">
            <div ref={reportPanelRef} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">

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
                      {showReport && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleScreenshot}
                            disabled={isCapturing}
                            className="border-slate-600 text-slate-300 hover:text-white bg-slate-800 h-9 gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {isCapturing ? "Capturing…" : "Screenshot"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            className="border-slate-600 text-slate-300 hover:text-white bg-slate-800 h-9 gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            CSV
                          </Button>
                        </>
                      )}
                      {loadingReport && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <span className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-violet-400 rounded-full" />
                          Generating…
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Blocked: not all rated */}
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
                  {reportError && (
                    <div className="m-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{reportError.message}</p>
                    </div>
                  )}

                  {/* Summary stats */}
                  {showReport && tierCounts && (
                    <div className="px-5 py-4 border-b border-slate-700/50 grid grid-cols-3 lg:grid-cols-6 gap-3">
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
                        <div className="text-slate-400 text-xs mt-0.5">🟢 Immediate Opportunity</div>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{tierCounts.yellow}</div>
                        <div className="text-slate-400 text-xs mt-0.5">🟡 Medium Term</div>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-orange-400">{tierCounts.orange}</div>
                        <div className="text-slate-400 text-xs mt-0.5">🟠 Longer Term</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-red-400">{tierCounts.red}</div>
                        <div className="text-slate-400 text-xs mt-0.5">🔴 No Fit</div>
                      </div>
                    </div>
                  )}

                  {/* Meeting table */}
                  {showReport && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            {([
                              { col: "slot" as SortCol, label: "Slot" },
                              { col: "delegate" as SortCol, label: "Delegate" },
                              { col: "company" as SortCol, label: "Company" },
                              { col: "rank" as SortCol, label: "Rank" },
                              { col: "match" as SortCol, label: "Match %" },
                              { col: "optedin" as SortCol, label: "Opted In" },
                              { col: "rating" as SortCol, label: "Rating" },
                              { col: "opportunity" as SortCol, label: "Opportunity" },
                            ]).map(({ col, label }) => (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-white transition-colors group"
                              >
                                <span className="inline-flex items-center gap-1">
                                  {label}
                                  <span className="inline-flex flex-col opacity-40 group-hover:opacity-80 transition-opacity">
                                    {sortCol === col ? (
                                      sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-violet-400 opacity-100" /> : <ChevronDownIcon className="w-3 h-3 text-violet-400 opacity-100" />
                                    ) : (
                                      <ChevronUp className="w-3 h-3" />
                                    )}
                                  </span>
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMeetings.map((m: any, i: number) => (
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
