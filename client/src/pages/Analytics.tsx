import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart3, Users, Calendar, TrendingUp, Download, Star, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import MeetingFloorPlan from "@/components/MeetingFloorPlan";
import { useTestMode } from "@/hooks/useTestMode";

type DelegateSortKey = 'name' | 'company' | 'meetingCount' | 'avgMatchScore' | 'avgRating' | 'ratedCount';

export default function Analytics() {
  const includeTestAccounts = useTestMode();
  const [delegateSortKey, setDelegateSortKey] = React.useState<DelegateSortKey>('avgRating');
  const [delegateSortDir, setDelegateSortDir] = React.useState<'asc' | 'desc'>('desc');

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

          {/* Opportunity Tier Summary */}
          {(() => {
            const allRated = analytics.sponsorStats.filter((s: any) => s.ratedMeetingsCount > 0);
            const totalGreen = allRated.reduce((sum: number, s: any) => sum + (s.greenCount ?? 0), 0);
            const totalAmber = allRated.reduce((sum: number, s: any) => sum + (s.amberCount ?? 0), 0);
            const totalRed = allRated.reduce((sum: number, s: any) => sum + (s.redCount ?? 0), 0);
            const totalTiered = totalGreen + totalAmber + totalRed;
            if (totalTiered === 0) return null;
            return (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{totalGreen}</p>
                    <p className="text-emerald-400/80 text-sm mt-1 font-medium">🟢 Short Term Opp</p>
                    <p className="text-emerald-400/50 text-xs mt-0.5">{totalTiered > 0 ? Math.round((totalGreen / totalTiered) * 100) : 0}% of rated meetings</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className="text-3xl font-bold text-amber-400">{totalAmber}</p>
                    <p className="text-amber-400/80 text-sm mt-1 font-medium">🟡 Medium Term</p>
                    <p className="text-amber-400/50 text-xs mt-0.5">{totalTiered > 0 ? Math.round((totalAmber / totalTiered) * 100) : 0}% of rated meetings</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/30">
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className="text-3xl font-bold text-red-400">{totalRed}</p>
                    <p className="text-red-400/80 text-sm mt-1 font-medium">🔴 No Fit / Longer Term</p>
                    <p className="text-red-400/50 text-xs mt-0.5">{totalTiered > 0 ? Math.round((totalRed / totalTiered) * 100) : 0}% of rated meetings</p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

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
            {/* Most In-Demand Delegates — sortable table */}
            {(() => {
              const handleDelegateSort = (key: DelegateSortKey) => {
                if (delegateSortKey === key) {
                  setDelegateSortDir(d => d === 'asc' ? 'desc' : 'asc');
                } else {
                  setDelegateSortKey(key);
                  setDelegateSortDir('desc');
                }
              };

              const sortedDelegates = [...analytics.mostInDemandDelegates].sort((a, b) => {
                const dir = delegateSortDir === 'asc' ? 1 : -1;
                const av = (a as any);
                const bv = (b as any);
                switch (delegateSortKey) {
                  case 'name': return dir * a.name.localeCompare(b.name);
                  case 'company': return dir * a.company.localeCompare(b.company);
                  case 'meetingCount': return dir * ((av.meetingCount ?? 0) - (bv.meetingCount ?? 0));
                  case 'avgMatchScore': return dir * ((av.avgMatchScore ?? 0) - (bv.avgMatchScore ?? 0));
                  case 'avgRating': {
                    // Weighted sort: more ratings = more confidence; ties broken by ratedCount
                    const PRIOR_W = 3, PRIOR_M = 3.0;
                    const wa = av.ratedCount > 0 ? (av.avgRating * av.ratedCount + PRIOR_W * PRIOR_M) / (av.ratedCount + PRIOR_W) : PRIOR_M;
                    const wb = bv.ratedCount > 0 ? (bv.avgRating * bv.ratedCount + PRIOR_W * PRIOR_M) / (bv.ratedCount + PRIOR_W) : PRIOR_M;
                    if (wa !== wb) return dir * (wa - wb);
                    return dir * ((av.ratedCount ?? 0) - (bv.ratedCount ?? 0));
                  }
                  case 'ratedCount': return dir * ((av.ratedCount ?? 0) - (bv.ratedCount ?? 0));
                  default: return 0;
                }
              });

              const SortIcon = ({ col }: { col: DelegateSortKey }) => {
                if (delegateSortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-500" />;
                return delegateSortDir === 'asc'
                  ? <ChevronUp className="w-3 h-3 text-purple-400" />
                  : <ChevronDown className="w-3 h-3 text-purple-400" />;
              };

              const downloadCsv = () => {
                const rows = sortedDelegates.map((d, i) => [
                  `${i + 1}`,
                  d.name,
                  d.company,
                  `${(d as any).meetingCount ?? 0}`,
                  (d as any).avgMatchScore != null ? (d as any).avgMatchScore.toFixed(1) : 'N/A',
                  (d as any).avgRating != null ? (d as any).avgRating.toFixed(2) : 'N/A',
                  `${(d as any).ratedCount ?? 0}`,
                ]);
                const csv = [
                  ['#', 'Name', 'Company', 'Meetings', 'Avg Match Score', 'Avg Meeting Rating', 'Ratings Count'].join(','),
                  ...rows.map(r => r.map(c => `"${c}"`).join(','))
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `delegates-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              };

              return (
                <Card className="bg-slate-800/50 border-slate-700 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Delegate Performance
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          Click any column header to sort. Rating column weighted by number of ratings received.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:text-white shrink-0 gap-1.5"
                        onClick={downloadCsv}
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <div className="overflow-auto" style={{ maxHeight: `${Math.max(analytics.sponsorStats.length * 44, 440)}px` }}>
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-800 z-10">
                          <tr className="border-b border-slate-700">
                            <th className="text-left text-slate-400 font-medium px-4 py-2 w-8">#</th>
                            <th
                              className="text-left text-slate-400 font-medium px-3 py-2 cursor-pointer hover:text-white select-none"
                              onClick={() => handleDelegateSort('name')}
                            >
                              <span className="flex items-center gap-1">Name <SortIcon col="name" /></span>
                            </th>
                            <th
                              className="text-left text-slate-400 font-medium px-3 py-2 cursor-pointer hover:text-white select-none hidden lg:table-cell"
                              onClick={() => handleDelegateSort('company')}
                            >
                              <span className="flex items-center gap-1">Company <SortIcon col="company" /></span>
                            </th>
                            <th
                              className="text-right text-slate-400 font-medium px-3 py-2 cursor-pointer hover:text-white select-none"
                              onClick={() => handleDelegateSort('meetingCount')}
                            >
                              <span className="flex items-center justify-end gap-1">Meetings <SortIcon col="meetingCount" /></span>
                            </th>
                            <th
                              className="text-right text-slate-400 font-medium px-3 py-2 cursor-pointer hover:text-white select-none"
                              onClick={() => handleDelegateSort('avgMatchScore')}
                            >
                              <span className="flex items-center justify-end gap-1">Avg Match <SortIcon col="avgMatchScore" /></span>
                            </th>
                            <th
                              className="text-right text-slate-400 font-medium px-3 py-2 cursor-pointer hover:text-white select-none"
                              onClick={() => handleDelegateSort('avgRating')}
                            >
                              <span className="flex items-center justify-end gap-1">Avg Rating <SortIcon col="avgRating" /></span>
                            </th>
                            <th
                              className="text-right text-slate-400 font-medium px-3 py-2 cursor-pointer hover:text-white select-none"
                              onClick={() => handleDelegateSort('ratedCount')}
                            >
                              <span className="flex items-center justify-end gap-1"># Rated <SortIcon col="ratedCount" /></span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDelegates.map((delegate, index) => {
                            const d = delegate as any;
                            return (
                              <tr
                                key={delegate.attendeeId}
                                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                              >
                                <td className="px-4 py-2.5 text-slate-500 text-xs">{index + 1}</td>
                                <td className="px-3 py-2.5">
                                  <div className="text-white font-medium text-sm leading-tight">{delegate.name}</div>
                                  <div className="text-slate-400 text-xs lg:hidden">{delegate.company}</div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-300 text-sm hidden lg:table-cell">{delegate.company}</td>
                                <td className="px-3 py-2.5 text-right">
                                  <span className="text-slate-200 text-sm font-medium">{d.meetingCount ?? 0}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {d.avgMatchScore != null ? (
                                    <span className="text-purple-300 text-sm font-medium">{d.avgMatchScore.toFixed(0)}%</span>
                                  ) : (
                                    <span className="text-slate-600 text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {d.avgRating != null ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-amber-400 text-sm font-semibold">{d.avgRating.toFixed(1)}</span>
                                      <span className="text-amber-500/60 text-xs">/5</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 text-xs">unrated</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <span className="text-slate-400 text-sm">{d.ratedCount ?? 0}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

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
              .sort((a: any, b: any) => {
                const ratingDiff = (b.avgMeetingRating ?? 0) - (a.avgMeetingRating ?? 0);
                if (ratingDiff !== 0) return ratingDiff;
                return (b.ratedMeetingsCount ?? 0) - (a.ratedMeetingsCount ?? 0);
              });
            const totalRated = analytics.sponsorStats.reduce((sum: number, s: any) => sum + (s.ratedMeetingsCount ?? 0), 0);
            // Use true weighted mean (sum of all ratings / total rated meetings) not average-of-averages
            const totalRatingSum = analytics.sponsorStats.reduce((sum: number, s: any) => 
              sum + ((s.avgMeetingRating ?? 0) * (s.ratedMeetingsCount ?? 0)), 0);
            const overallAvgRating = totalRated > 0 ? totalRatingSum / totalRated : null;
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
                              .sort((a: any, b: any) => {
                                const ratingDiff = (b.avgMeetingRating ?? 0) - (a.avgMeetingRating ?? 0);
                                if (ratingDiff !== 0) return ratingDiff;
                                return (b.ratedMeetingsCount ?? 0) - (a.ratedMeetingsCount ?? 0);
                              })
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
                                  {(sponsor.yellowCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                                      🟡 {sponsor.yellowCount}
                                    </span>
                                  )}
                                  {(sponsor.orangeCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30">
                                      🟠 {sponsor.orangeCount}
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
