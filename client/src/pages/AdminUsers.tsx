/**
 * Admin User Management
 * Allows admins to promote users to admin role and impersonate sponsor users
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus, RefreshCw, LogIn, User, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AdminHeader from "@/components/AdminHeader";

export default function AdminUsers() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: allUsers, isLoading, refetch } = trpc.admin.getAllUsers.useQuery();
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "sponsor">("all");

  const promoteUser = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => { refetch(); toast.success("User promoted to admin successfully!"); },
    onError: (error) => toast.error(error.message || "Failed to promote user"),
  });

  const promoteByEmail = trpc.admin.promoteUserByEmail.useMutation({
    onSuccess: () => { setNewAdminEmail(""); refetch(); toast.success("User promoted to admin successfully!"); },
    onError: (error) => toast.error(error.message || "Failed to promote user"),
  });

  const removeAdmin = trpc.admin.removeAdmin.useMutation({
    onSuccess: () => { refetch(); toast.success("Admin privileges removed successfully!"); },
    onError: (error) => toast.error(error.message || "Failed to remove admin"),
  });

  const createImpersonationToken = trpc.admin.createImpersonationToken.useMutation({
    onSuccess: (data) => {
      // Redirect to the impersonation endpoint — this will set the session cookie and redirect to /dashboard
      window.open(`/api/impersonate?token=${encodeURIComponent(data.token)}`, '_blank');
    },
    onError: (error) => toast.error(error.message || "Failed to create impersonation token"),
  });

  function handleLoginAs(userId: number, name: string) {
    if (confirm(`Login as "${name}"? This will open a new tab with their sponsor portal session. The token expires in 5 minutes.`)) {
      createImpersonationToken.mutate({ targetUserId: userId });
    }
  }

  function handlePromote(userId: number, email: string) {
    if (confirm(`Promote ${email} to admin? They will have full access to the admin dashboard.`)) {
      promoteUser.mutate({ userId });
    }
  }

  function handlePromoteByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminEmail) { toast.error("Please enter an email address"); return; }
    promoteByEmail.mutate({ email: newAdminEmail });
  }

  if (!loading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredUsers = allUsers?.filter(u => {
    if (filter === "admin") return u.role === "admin";
    if (filter === "sponsor") return u.role !== "admin";
    return true;
  }) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AdminHeader />

      <div className="container mx-auto py-12 px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-white mb-2">User Management</h1>
          <p className="text-lg text-slate-300">Manage admin access and view sponsor accounts</p>
        </div>

        {/* Promote by email */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5 text-accent" />
              Promote User to Admin
            </CardTitle>
            <CardDescription className="text-slate-300">
              Enter the email address of a user who has logged in at least once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePromoteByEmail} className="flex gap-3">
              <Input
                type="email"
                placeholder="user@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" disabled={promoteByEmail.isPending} className="gap-2">
                {promoteByEmail.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Promote
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "sponsor", "admin"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-primary" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
            >
              {f === "all" ? `All (${allUsers?.length ?? 0})` : f === "sponsor" ? `Sponsors (${allUsers?.filter(u => u.role !== "admin").length ?? 0})` : `Admins (${allUsers?.filter(u => u.role === "admin").length ?? 0})`}
            </Button>
          ))}
        </div>

        {/* Users list */}
        <div className="space-y-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <Card key={u.id} className="glass-card border-slate-700">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm">{u.name || "Unnamed User"}</span>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                            {u.role === "admin" ? (
                              <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Admin</span>
                            ) : "Sponsor"}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-xs truncate">{u.email}</p>
                        <p className="text-slate-500 text-xs">
                          Joined {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {u.lastSignedIn && ` · Last login ${new Date(u.lastSignedIn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Login As button — only for non-admin users */}
                      {u.role !== "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoginAs(u.id, u.name || u.email || "this user")}
                          disabled={createImpersonationToken.isPending}
                          className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                          title="Open a new tab logged in as this sponsor"
                        >
                          <Eye className="w-4 h-4" />
                          Login As
                        </Button>
                      )}
                      {/* Promote / Remove admin */}
                      {u.role !== "admin" ? (
                        <Button
                          onClick={() => handlePromote(u.id, u.email || "this user")}
                          disabled={promoteUser.isPending}
                          size="sm"
                          variant="ghost"
                          className="gap-2 text-slate-400 hover:text-white"
                        >
                          <Shield className="w-4 h-4" />
                          Make Admin
                        </Button>
                      ) : (
                        <Button
                          onClick={() => removeAdmin.mutate({ userId: u.id })}
                          disabled={removeAdmin.isPending}
                          size="sm"
                          variant="destructive"
                          className="gap-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${removeAdmin.isPending ? "animate-spin" : ""}`} />
                          Remove Admin
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-slate-300">No users found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
