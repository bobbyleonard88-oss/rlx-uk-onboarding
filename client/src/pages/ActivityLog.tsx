import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Archive,
  ArchiveRestore,
  Calendar,
  Eye,
  EyeOff,
  Trash2,
  Users,
  RefreshCw,
  Activity,
  Clock,
  Download,
  LogIn,
  Building2,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";

const ADMIN_ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  reviewed: { label: "Marked Reviewed", icon: <CheckCircle className="w-4 h-4" />, color: "text-green-400", badgeVariant: "default" },
  reset_to_pending: { label: "Reset to Pending", icon: <RefreshCw className="w-4 h-4" />, color: "text-yellow-400", badgeVariant: "secondary" },
  archived: { label: "Archived", icon: <Archive className="w-4 h-4" />, color: "text-slate-400", badgeVariant: "outline" },
  unarchived: { label: "Restored", icon: <ArchiveRestore className="w-4 h-4" />, color: "text-blue-400", badgeVariant: "secondary" },
  saved_meetings: { label: "Meetings Saved", icon: <Calendar className="w-4 h-4" />, color: "text-purple-400", badgeVariant: "default" },
  cleared_meetings: { label: "Meetings Cleared", icon: <Trash2 className="w-4 h-4" />, color: "text-red-400", badgeVariant: "destructive" },
  published_meetings: { label: "Meetings Published", icon: <Eye className="w-4 h-4" />, color: "text-green-400", badgeVariant: "default" },
  meetings_made_visible: { label: "Meetings Visible", icon: <Eye className="w-4 h-4" />, color: "text-green-400", badgeVariant: "default" },
  meetings_hidden: { label: "Meetings Hidden", icon: <EyeOff className="w-4 h-4" />, color: "text-slate-400", badgeVariant: "outline" },
  imported_delegates: { label: "Delegates Imported", icon: <Users className="w-4 h-4" />, color: "text-blue-400", badgeVariant: "secondary" },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatFullDate(date: Date | null | undefined): string {
  if (!date) return "Never";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

type Tab = "sponsor" | "admin" | "lastlogin";

export default function ActivityLog() {
  const [activeTab, setActiveTab] = useState<Tab>("sponsor");
  const { data: adminLogs, isLoading: adminLoading, refetch: refetchAdmin } = trpc.admin.getActivityLog.useQuery({ limit: 200 });
  const { data: sponsorLogs, isLoading: sponsorLoading, refetch: refetchSponsor } = trpc.admin.getSponsorActivityLog.useQuery({ limit: 500 });
  const { data: lastLogins, isLoading: lastLoginsLoading, refetch: refetchLastLogins } = trpc.admin.getSponsorLastLogins.useQuery();

  const handleRefresh = () => {
    refetchAdmin();
    refetchSponsor();
    refetchLastLogins();
  };

  const loginCount = sponsorLogs?.filter(l => l.eventType === 'login').length ?? 0;
  const downloadCount = sponsorLogs?.filter(l => l.eventType === 'download').length ?? 0;
  const neverLoggedIn = lastLogins?.filter(l => !l.lastLogin).length ?? 0;

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <AdminHeader />
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Activity className="w-6 h-6 text-purple-400" />
                <h1 className="text-2xl font-bold text-white font-montserrat">Activity Log</h1>
              </div>
              <p className="text-slate-400 text-sm">Track sponsor logins, downloads, and admin actions.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{loginCount}</div>
                <div className="text-xs text-slate-400 mt-1">Sponsor Logins</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{downloadCount}</div>
                <div className="text-xs text-slate-400 mt-1">CSV Downloads</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{neverLoggedIn}</div>
                <div className="text-xs text-slate-400 mt-1">Never Logged In</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{adminLogs?.length ?? 0}</div>
                <div className="text-xs text-slate-400 mt-1">Admin Actions</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {([
              { id: "sponsor" as Tab, label: "Sponsor Activity" },
              { id: "lastlogin" as Tab, label: "Last Login per Sponsor" },
              { id: "admin" as Tab, label: "Admin Actions" },
            ] as { id: Tab; label: string }[]).map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? "bg-primary" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Sponsor Activity Tab */}
          {activeTab === "sponsor" && (
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Sponsor Logins & Downloads
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sponsorLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !sponsorLogs || sponsorLogs.length === 0 ? (
                  <div className="text-center py-16">
                    <Activity className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">No sponsor activity recorded yet.</p>
                    <p className="text-slate-600 text-xs mt-1">Logins and CSV downloads will appear here once sponsors start using the portal.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {sponsorLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center ${log.eventType === 'login' ? 'text-blue-400' : 'text-green-400'}`}>
                          {log.eventType === 'login' ? <LogIn className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="text-white text-sm font-medium">{log.companyName || `Sponsor #${log.sponsorId}`}</span>
                            <Badge
                              variant={log.eventType === 'login' ? 'secondary' : 'default'}
                              className="text-xs py-0"
                            >
                              {log.eventType === 'login' ? 'Login' : 'Download'}
                            </Badge>
                            {log.downloadLabel && (
                              <span className="text-slate-400 text-xs">— {log.downloadLabel}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right" title={formatFullDate(log.createdAt)}>
                          <span className="text-slate-500 text-xs whitespace-nowrap">{formatRelativeTime(log.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Last Login per Sponsor Tab */}
          {activeTab === "lastlogin" && (
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-slate-400" />
                  Last Login per Sponsor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {lastLoginsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !lastLogins || lastLogins.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-slate-500 text-sm">No data available.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {[...lastLogins]
                      .sort((a, b) => {
                        if (!a.lastLogin && !b.lastLogin) return a.companyName.localeCompare(b.companyName);
                        if (!a.lastLogin) return 1;
                        if (!b.lastLogin) return -1;
                        return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
                      })
                      .map((entry) => (
                        <div key={entry.sponsorId} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-white text-sm font-medium flex-1">{entry.companyName}</span>
                          {entry.lastLogin ? (
                            <div className="text-right">
                              <div className="text-slate-300 text-sm">{formatRelativeTime(entry.lastLogin)}</div>
                              <div className="text-slate-500 text-xs">{formatFullDate(entry.lastLogin)}</div>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Never logged in</Badge>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Actions Tab */}
          {activeTab === "admin" && (
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Admin Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {adminLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !adminLogs || adminLogs.length === 0 ? (
                  <div className="text-center py-16">
                    <Activity className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">No admin actions recorded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {adminLogs.map((log) => {
                      const config = ADMIN_ACTION_CONFIG[log.action] ?? {
                        label: log.action.replace(/_/g, " "),
                        icon: <Activity className="w-4 h-4" />,
                        color: "text-slate-400",
                        badgeVariant: "outline" as const,
                      };
                      return (
                        <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                          <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center ${config.color}`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white text-sm font-medium">{log.adminName}</span>
                              <Badge variant={config.badgeVariant} className="text-xs py-0">{config.label}</Badge>
                              {log.entityName && (
                                <span className="text-slate-300 text-sm truncate">— <span className="font-medium">{log.entityName}</span></span>
                              )}
                            </div>
                            {log.details && <p className="text-slate-500 text-xs mt-0.5">{log.details}</p>}
                          </div>
                          <div className="flex-shrink-0 text-right" title={formatFullDate(log.createdAt)}>
                            <span className="text-slate-500 text-xs whitespace-nowrap">{formatRelativeTime(log.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
