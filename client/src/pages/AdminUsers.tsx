/**
 * Admin User Management
 * Allows admins to promote users to admin role
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus, RefreshCw, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import AdminHeader from "@/components/AdminHeader";

export default function AdminUsers() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: allUsers, isLoading, refetch } = trpc.admin.getAllUsers.useQuery();
  
  const promoteUser = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("User promoted to admin successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to promote user");
    },
  });

  const promoteByEmail = trpc.admin.promoteUserByEmail.useMutation({
    onSuccess: () => {
      setNewAdminEmail("");
      refetch();
      toast.success("User promoted to admin successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to promote user");
    },
  });

  const removeAdmin = trpc.admin.removeAdmin.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Admin privileges removed successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove admin");
    },
  });




  const [newAdminEmail, setNewAdminEmail] = useState("");

  // Check if user is admin
  if (!loading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  function handlePromote(userId: number, email: string) {
    if (confirm(`Promote ${email} to admin? They will have full access to the admin dashboard and user management.`)) {
      promoteUser.mutate({ userId });
    }
  }

  function handlePromoteByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminEmail) {
      toast.error("Please enter an email address");
      return;
    }
    promoteByEmail.mutate({ email: newAdminEmail });
  }

  const filteredUsers = allUsers?.filter(u => u.role === "admin");

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AdminHeader />

      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-white mb-2">
            User Management
          </h1>
          <p className="text-lg text-slate-300">
            Manage admin access for users
          </p>
        </div>

        {/* Add Admin by Email */}
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
              <Button
                type="submit"
                disabled={promoteByEmail.isPending}
                className="gap-2"
              >
                {promoteByEmail.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Promote
              </Button>
            </form>
          </CardContent>
        </Card>



        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers && filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <Card key={u.id} className="glass-card border-slate-700">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {u.name || "Unnamed User"}
                        </h3>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            "User"
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300">{u.email}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Joined: {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {u.role !== "admin" ? (
                      <Button
                        onClick={() => handlePromote(u.id, u.email || "this user")}
                        disabled={promoteUser.isPending}
                        size="sm"
                        className="gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        Promote to Admin
                      </Button>
                    ) : (
                      <Button
                        onClick={() => removeAdmin.mutate({ userId: u.id })}
                        disabled={removeAdmin.isPending}
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${removeAdmin.isPending ? 'animate-spin' : ''}`} />
                        Remove Admin
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-slate-300">
                  No admin users yet
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
