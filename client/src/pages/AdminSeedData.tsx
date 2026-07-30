/**
 * Admin Seed Data Page
 * One-click population of the database with realistic RLX UK 2026 demo data.
 * Shows current database status and allows wiping seed data for a fresh start.
 */

import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Database,
  Play,
  Trash2,
  CheckCircle,
  Calendar,
  Users,
  Building2,
  BookOpen,
  AlertTriangle,
  Loader2,
} from "lucide-react";

function StatPill({ icon: Icon, label, value, color = "text-purple-400" }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
      <Icon className={`w-5 h-5 ${color} shrink-0`} />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function AdminSeedData() {
  const { data: status, refetch, isLoading } = trpc.seed.status.useQuery();

  const runSeed = trpc.seed.run.useMutation({
    onSuccess: (data) => {
      toast.success(`Seed complete — ${data.summary.sessions} sessions, ${data.summary.sponsors} sponsors, ${data.summary.delegates} delegates created.`);
      refetch();
    },
    onError: (e) => toast.error(`Seed failed: ${e.message}`),
  });

  const wipeSeed = trpc.seed.wipe.useMutation({
    onSuccess: () => {
      toast.success("All seed data wiped. Database is clean.");
      refetch();
    },
    onError: (e) => toast.error(`Wipe failed: ${e.message}`),
  });

  const isSeeded = status?.seeded ?? false;

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-400" />
            Demo Data
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Populate the database with realistic RLX UK 2026 demo data — one click to get the full app working.
          </p>
        </div>

        {/* Status Card */}
        <Card className={`glass-card ${isSeeded ? "border-emerald-500/30" : "border-slate-700/50"}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2">
                {isSeeded ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Database Populated
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 text-slate-400" />
                    Database Empty
                  </>
                )}
              </CardTitle>
              {isSeeded && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  Ready
                </Badge>
              )}
            </div>
            <CardDescription className="text-slate-400 text-sm">
              {isSeeded
                ? "Demo data is loaded. The app is fully functional with test accounts."
                : "No event data found. Run the seed to populate the database."}
            </CardDescription>
          </CardHeader>
          {isLoading ? (
            <CardContent>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking database...
              </div>
            </CardContent>
          ) : (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill icon={Calendar}  label="Events"    value={status?.eventCount ?? 0}    color="text-purple-400" />
                <StatPill icon={BookOpen}  label="Sessions"  value={status?.sessionCount ?? 0}  color="text-blue-400" />
                <StatPill icon={Building2} label="Sponsors"  value={status?.sponsorCount ?? 0}  color="text-amber-400" />
                <StatPill icon={Users}     label="Delegates" value={status?.delegateCount ?? 0} color="text-emerald-400" />
              </div>
            </CardContent>
          )}
        </Card>

        {/* What Gets Created */}
        {!isSeeded && (
          <Card className="glass-card border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">What the seed creates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">RLX UK 2026 Event</p>
                  <p className="text-slate-400 text-xs mt-0.5">The Grove Hotel, Hertfordshire · 24–25 September 2026 · Active</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">29 Agenda Sessions across 2 days</p>
                  <p className="text-slate-400 text-xs mt-0.5">12 meeting blocks, 2 keynotes, panels, meals, breaks, wellness, gala dinner</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">8 Sponsor companies</p>
                  <p className="text-slate-400 text-xs mt-0.5">Workday, LinkedIn, SmartRecruiters, Beamery, Eightfold AI, Greenhouse, Lever, Pinpoint — with credits (6–12) and table numbers</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">12 Delegate profiles</p>
                  <p className="text-slate-400 text-xs mt-0.5">Senior TA leaders from HSBC, Revolut, Arm, Salesforce, Monzo, Sky, Deliveroo, Wise, Dyson, Ocado, Starling, Rolls-Royce</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isSeeded ? (
            <Button
              onClick={() => runSeed.mutate()}
              disabled={runSeed.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold h-11 text-sm"
            >
              {runSeed.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding database...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Populate with Demo Data
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => runSeed.mutate()}
                disabled={runSeed.isPending}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:border-purple-500 h-11 text-sm"
              >
                {runSeed.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" />Re-run Seed (safe — skips existing)</>
                )}
              </Button>
              <Button
                onClick={() => {
                  if (confirm("This will delete all seed data (events, sessions, test sponsors and delegates). Real user accounts are unaffected. Continue?")) {
                    wipeSeed.mutate();
                  }
                }}
                disabled={wipeSeed.isPending}
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500 h-11 text-sm"
              >
                {wipeSeed.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wiping...</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-2" />Wipe Seed Data</>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-400 space-y-1">
            <p className="font-medium text-amber-300">Test accounts only</p>
            <p>All seed data uses <code className="text-slate-300">@*.rlx</code> email addresses and are flagged as demo accounts. They will not receive real emails. Real sponsor/delegate accounts you create later are completely separate.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
