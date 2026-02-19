import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart3, Users, Calendar, TrendingUp, Award } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";

export default function Analytics() {
  const { data: analytics, isLoading } = trpc.admin.getAnalytics.useQuery();

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <AdminHeader />
      <div className="p-6">
        <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Meeting Analytics</h1>

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
              <p className="text-xs text-slate-400 mt-1">
                Across all meetings
              </p>
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
              <div className="text-2xl font-bold text-white">
                {analytics.totalMeetings}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Scheduled meetings
              </p>
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
              <div className="text-2xl font-bold text-white">
                {analytics.delegatesBooked}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Out of {analytics.totalDelegates} total
              </p>
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
              <p className="text-xs text-slate-400 mt-1">
                Delegate capacity used
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Match Score Distribution */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Match Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.scoreDistribution.map((bucket) => (
                  <div key={bucket.range} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{bucket.range}</span>
                      <span className="text-white font-medium">{bucket.count} meetings</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${(bucket.count / analytics.totalMeetings) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time Slot Distribution */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Time Slot Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.timeSlotDistribution.map((slot) => (
                  <div key={slot.slot} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{slot.label}</span>
                      <span className="text-white font-medium">{slot.count} meetings</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${(slot.count / analytics.totalMeetings) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Priority Delegates */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5" />
                Top 10 Priority Delegates
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Delegates who requested to meet vendors
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.topDelegates.map((delegate, index) => (
                  <div
                    key={delegate.attendeeId}
                    className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="text-white font-medium">{delegate.name}</div>
                        <div className="text-slate-400 text-xs">{delegate.company}</div>
                      </div>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {delegate.meetingCount} meetings
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most In-Demand Delegates */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Most In-Demand Delegates
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Based on sponsor rankings - higher ranked delegates score more points
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.mostInDemandDelegates.map((delegate, index) => (
                  <div
                    key={delegate.attendeeId}
                    className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary" 
                        className={`w-6 h-6 flex items-center justify-center p-0 ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          index === 1 ? 'bg-slate-400/20 text-slate-300 border-slate-400/30' :
                          index === 2 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                          ''
                        }`}
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="text-white font-medium">{delegate.name}</div>
                        <div className="text-slate-400 text-xs">{delegate.company}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {delegate.demandScore} pts
                      </Badge>
                      <Badge variant="outline" className="text-slate-400 border-slate-600">
                        {delegate.rankingCount} sponsors
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sponsor Statistics */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Sponsor Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.sponsorStats.map((sponsor) => (
                  <div key={sponsor.sponsorId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 truncate flex-1">{sponsor.companyName}</span>
                      <span className="text-white font-medium ml-2">
                        {sponsor.meetingsScheduled}/{sponsor.totalSlots}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            sponsor.meetingsScheduled === sponsor.totalSlots
                              ? 'bg-green-500'
                              : 'bg-yellow-500'
                          }`}
                          style={{
                            width: `${(sponsor.meetingsScheduled / sponsor.totalSlots) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        Avg: {sponsor.avgMatchScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
