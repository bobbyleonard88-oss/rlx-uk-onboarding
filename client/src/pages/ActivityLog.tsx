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
} from "lucide-react";
import { Link } from "wouter";

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  reviewed: {
    label: "Marked Reviewed",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-400",
    badgeVariant: "default",
  },
  reset_to_pending: {
    label: "Reset to Pending",
    icon: <RefreshCw className="w-4 h-4" />,
    color: "text-yellow-400",
    badgeVariant: "secondary",
  },
  archived: {
    label: "Archived",
    icon: <Archive className="w-4 h-4" />,
    color: "text-slate-400",
    badgeVariant: "outline",
  },
  unarchived: {
    label: "Restored from Archive",
    icon: <ArchiveRestore className="w-4 h-4" />,
    color: "text-blue-400",
    badgeVariant: "secondary",
  },
  saved_meetings: {
    label: "Meetings Saved",
    icon: <Calendar className="w-4 h-4" />,
    color: "text-purple-400",
    badgeVariant: "default",
  },
  cleared_meetings: {
    label: "Meetings Cleared",
    icon: <Trash2 className="w-4 h-4" />,
    color: "text-red-400",
    badgeVariant: "destructive",
  },
  published_meetings: {
    label: "Meetings Published",
    icon: <Eye className="w-4 h-4" />,
    color: "text-green-400",
    badgeVariant: "default",
  },
  meetings_made_visible: {
    label: "Meetings Made Visible",
    icon: <Eye className="w-4 h-4" />,
    color: "text-green-400",
    badgeVariant: "default",
  },
  meetings_hidden: {
    label: "Meetings Hidden",
    icon: <EyeOff className="w-4 h-4" />,
    color: "text-slate-400",
    badgeVariant: "outline",
  },
  imported_delegates: {
    label: "Delegates Imported",
    icon: <Users className="w-4 h-4" />,
    color: "text-blue-400",
    badgeVariant: "secondary",
  },
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
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLog() {
  const { data: logs, isLoading, refetch } = trpc.admin.getActivityLog.useQuery({ limit: 200 });

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-bold text-white font-montserrat">Activity Log</h1>
            </div>
            <p className="text-slate-400 text-sm">
              A chronological record of all admin actions taken in the portal.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                ← Admin Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        {logs && logs.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white">{logs.length}</div>
                <div className="text-xs text-slate-400 mt-1">Total Actions</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {logs.filter((l) => l.action === "reviewed").length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Submissions Reviewed</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a2e] border-slate-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {logs.filter((l) => l.action === "published_meetings").length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Meeting Schedules Published</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Log feed */}
        <Card className="bg-[#1a1a2e] border-slate-800">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-16">
                <Activity className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">No activity recorded yet.</p>
                <p className="text-slate-600 text-xs mt-1">
                  Actions like reviewing submissions, archiving sponsors, and publishing meetings will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {logs.map((log, index) => {
                  const config = ACTION_CONFIG[log.action] ?? {
                    label: log.action.replace(/_/g, " "),
                    icon: <Activity className="w-4 h-4" />,
                    color: "text-slate-400",
                    badgeVariant: "outline" as const,
                  };

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Icon */}
                      <div
                        className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center ${config.color}`}
                      >
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium">{log.adminName}</span>
                          <Badge variant={config.badgeVariant} className="text-xs py-0">
                            {config.label}
                          </Badge>
                          {log.entityName && (
                            <span className="text-slate-300 text-sm truncate">
                              — <span className="font-medium">{log.entityName}</span>
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-slate-500 text-xs mt-0.5">{log.details}</p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div
                        className="flex-shrink-0 text-right"
                        title={formatFullDate(log.createdAt)}
                      >
                        <span className="text-slate-500 text-xs whitespace-nowrap">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
