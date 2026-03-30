import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart3, Users, Calendar, TrendingUp, Download, Star } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import MeetingFloorPlan from "@/components/MeetingFloorPlan";
import { useTestMode } from "@/hooks/useTestMode";

export default function Analytics() {
  const includeTestAccounts = useTestMode();

  const { data: analytics, isLoading } = trpc.admin.getAnalytics.useQuery(
    { includeTestAccounts }
  );

  if (isLoading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Meeting Analytics</h1>
          <div className="text-white">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Meeting Analytics</h1>
          <div className="text-white">No analytics data available.</div>
        </div>
      </div>
    );
  }

  // Split time slots into Day 2 (slots 1-6) and Day 3 (slots 7-12)
  const day1Slots = analytics.timeSlotDistribution.filter(s => s.slot <= 6);
  const day2Slots = analytics.timeSlotDistribution.filter(s => s.slot >= 7);
  const maxSlotCount = Math.max(
    ...analytics.timeSlotDistribution.map(s => s.count),
    1
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <AdminHeader />
      <div className="p-6">
        <div className="container mx-auto">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">Meeting Analytics</h1>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Average Match Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {analytics.averageMatchScore.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-400 mt-1">Across all meetings</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{analytics.totalMeetings}</div>
                <p className="text-xs text-slate-400 mt-1">Scheduled meetings</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Delegates Booked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{analytics.delegatesBooked}</div>
                <p className="text-xs text-slate-400 mt-1">Out of {analytics.totalDelegates} total</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Avg Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {analytics.averageUtilization.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-400 mt-1">Delegate capacity used</p>
              </CardContent>
            </Card>
          </div>

          {/* Row 1: Time Slot Distribution split into Day 1 | Day 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Day 2 (Wed 25 Mar) */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Time Slot Distribution — Day 1 (Wed 25 Mar)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {day1Slots.map((slot) => (
                    <div key={slot.slot} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">{slot.label.replace(/Day \d+ — /, "")}</span>
                        <span className="text-white font-medium">{slot.count} meetings</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(slot.count / maxSlotCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Day 3 (Thu 26 Mar) */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Time Slot Distribution — Day 2 (Thu 26 Mar)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {day2Slots.map((slot) => (
                    <div key={slot.slot} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">{slot.label.replace(/Day \d+ — /, "")}</span>
                        <span className="text-white font-medium">{slot.count} meetings</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${(slot.count / maxSlotCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Most In-Demand Delegates | Sponsor Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
            {/* Most In-Demand Delegates */}
            <Card className="bg-slate-800/50 border-slate-700 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Most In-Demand Delegates
                    </CardTitle>
                    <p className="text-sm text-slate-400 mt-1">
                      Based on sponsor rankings — higher ranked = more points
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:text-white shrink-0 gap-1.5"
                    onClick={() => {
                      const rows = analytics.mostInDemandDelegates.map((d, i) =>
                        [`${i + 1}`, d.name, d.company, `${d.demandScore}`, `${d.rankingCount}`]
                      );
                      const csv = [
                        ["Rank", "Name", "Company", "Demand Score", "Sponsors Ranked By"].join(","),
                        ...rows.map(r => r.map(c => `"${c}"`).join(","))
                      ].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `delegate-rankings-${new Date().toISOString().split("T")[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div
                  className="space-y-2 overflow-y-auto pr-1"
                  style={{ maxHeight: `${Math.max(analytics.sponsorStats.length * 44, 440)}px` }}
                >
                  {analytics.mostInDemandDelegates.map((delegate, index) => (
                    <div
                      key={delegate.attendeeId}
                      className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={`w-6 h-6 flex items-center justify-center p-0 shrink-0 ${
                            index === 0
                              ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                              : index === 1
                              ? "bg-slate-400/20 text-slate-300 border-slate-400/30"
                              : index === 2
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                              : ""
                          }`}
                        >
                          {index + 1}
                        </Badge>
                        <div>
                          <div className="text-white font-medium text-sm">{delegate.name}</div>
                          <div className="text-slate-400 text-xs">{delegate.company}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                          {delegate.demandScore} pts
                        </Badge>
                        <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                          {(delegate as any).meetingCount ?? delegate.rankingCount} meetings
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sponsor Statistics */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Sponsor Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {analytics.sponsorStats.map((sponsor) => (
                    <div key={sponsor.sponsorId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 truncate flex-1">{sponsor.companyName}</span>
                        <span className="text-white font-medium ml-2">
                          {sponsor.meetingsScheduled}/{sponsor.totalSlots}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              sponsor.meetingsScheduled >= sponsor.totalSlots
                                ? "bg-green-500"
                                : sponsor.meetingsScheduled >= Math.ceil(sponsor.totalSlots * 0.8)
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.min((sponsor.meetingsScheduled / sponsor.totalSlots) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-14 text-right">
                          Avg: {sponsor.avgMatchScore.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Match Score Distribution — compact, full width */}
          <div className="grid grid-cols-1 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  Match Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {analytics.scoreDistribution.map((bucket) => {
                    const pct =
                      analytics.totalMeetings > 0
                        ? Math.round((bucket.count / analytics.totalMeetings) * 100)
                        : 0;
                    return (
                      <div key={bucket.range} className="flex flex-col items-center gap-1">
                        <div className="relative w-full bg-slate-700 rounded-lg overflow-hidden h-20 flex items-end">
                          <div
                            className="w-full bg-purple-500 rounded-b-lg transition-all"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-300 font-medium">{bucket.range}</span>
                        <span className="text-xs text-slate-400">{bucket.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Per-Sponsor Meeting Ratings */}
          {(() => {
            const ratedSponsors = analytics.sponsorStats
              .filter((s: any) => s.avgMeetingRating != null)
              .sort((a: any, b: any) => (b.avgMeetingRating ?? 0) - (a.avgMeetingRating ?? 0));
            const totalRated = analytics.sponsorStats.reduce((sum: number, s: any) => sum + (s.ratedMeetingsCount ?? 0), 0);
            const overallAvgRating = ratedSponsors.length > 0
              ? ratedSponsors.reduce((sum: number, s: any) => sum + (s.avgMeetingRating ?? 0), 0) / ratedSponsors.length
              : null;
            return (
              <div className="grid grid-cols-1 mb-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400" />
                          Post-Event Meeting Ratings
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          {totalRated} meeting{totalRated !== 1 ? 's' : ''} rated across {ratedSponsors.length} sponsor{ratedSponsors.length !== 1 ? 's' : ''}
                          {overallAvgRating != null && (
                            <span className="ml-2 text-amber-400 font-medium">
                              — Overall avg: {overallAvgRating.toFixed(1)}/5
                            </span>
                          )}
                        </p>
                      </div>
                      {ratedSponsors.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:text-white shrink-0 gap-1.5"
                          onClick={() => {
                            const rows = analytics.sponsorStats
                              .filter((s: any) => s.ratedMeetingsCount > 0)
                              .sort((a: any, b: any) => (b.avgMeetingRating ?? 0) - (a.avgMeetingRating ?? 0))
                              .map((s: any) => [
                                s.companyName,
                                s.ratedMeetingsCount,
                                s.meetingsScheduled,
                                s.avgMeetingRating != null ? s.avgMeetingRating.toFixed(2) : '',
                              ]);
                            const csv = [
                              ['Sponsor', 'Meetings Rated', 'Total Meetings', 'Avg Rating (1-5)'].join(','),
                              ...rows.map((r: string[]) => r.map((c: string) => `"${c}"`).join(','))
                            ].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `sponsor-ratings-${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export CSV
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ratedSponsors.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">
                        No meeting ratings submitted yet. Ratings will appear here once sponsors rate their meetings in the Feedback tab.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {ratedSponsors.map((sponsor: any, index: number) => (
                          <div key={sponsor.sponsorId} className="flex items-center gap-3 p-2.5 bg-slate-700/40 rounded-lg">
                            <span className="text-slate-500 text-xs w-5 text-right shrink-0">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{sponsor.companyName}</p>
                              <p className="text-slate-400 text-xs">
                                {sponsor.ratedMeetingsCount}/{sponsor.meetingsScheduled} meetings rated
                              </p>
                              {/* Opportunity tier mini-bar */}
                              {sponsor.ratedMeetingsCount > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {(sponsor.greenCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      🟢 {sponsor.greenCount}
                                    </span>
                                  )}
                                  {(sponsor.amberCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                      🟡 {sponsor.amberCount}
                                    </span>
                                  )}
                                  {(sponsor.redCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400 border border-red-500/30">
                                      🔴 {sponsor.redCount}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {[1,2,3,4,5].map(star => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= Math.round(sponsor.avgMeetingRating ?? 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-600 fill-transparent'
                                  }`}
                                />
                              ))}
                              <span className="text-amber-400 text-sm font-semibold ml-1">
                                {(sponsor.avgMeetingRating ?? 0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Row 5: Notes summary link */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-5 pb-4 px-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-white font-semibold text-base mb-1">Meeting Notes &amp; Feedback</h3>
                  <p className="text-slate-400 text-sm">
                    Sponsors can leave per-meeting notes and star ratings on their Feedback page. View all submitted notes, search by sponsor or delegate, and export to CSV.
                  </p>
                </div>
                <a
                  href="/admin/feedback-notes"
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  View Feedback &amp; Notes →
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Row 6: Meeting Floor Plan — full width */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <MeetingFloorPlan includeTestAccounts={includeTestAccounts} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
