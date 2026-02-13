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
import { Shield, UserPlus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

  const [searchEmail, setSearchEmail] = useState("");

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

  const filteredUsers = allUsers?.filter(u => 
    !searchEmail || u.email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
            User Management
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage admin access for users
          </p>
        </div>

        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Search Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="searchEmail">Search by Email</Label>
              <Input
                id="searchEmail"
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredUsers && filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <Card key={u.id} className="glass-card">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-foreground">
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
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined: {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {u.role !== "admin" && (
                      <Button
                        onClick={() => handlePromote(u.id, u.email || "this user")}
                        disabled={promoteUser.isPending}
                        size="sm"
                        className="gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        Promote to Admin
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchEmail ? "No users found matching your search." : "No users yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
