/**
 * Sponsor Profile Setup
 * Allows sponsors to set up their company information before submitting rankings
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SponsorProfile() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  
  const { data: profile, isLoading } = trpc.sponsor.getProfile.useQuery();
  const updateProfile = trpc.sponsor.updateProfile.useMutation();

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.companyName);
      setContactName(profile.contactName);
      setContactEmail(profile.contactEmail);
    } else if (user) {
      setContactName(user.name || "");
      setContactEmail(user.email || "");
    }
  }, [profile, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      await updateProfile.mutateAsync({
        companyName,
        contactName,
        contactEmail,
      });
      
      toast.success("Profile updated successfully!");
      setLocation("/prioritize");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container max-w-2xl">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-2xl font-heading">
              Sponsor Profile
            </CardTitle>
            <CardDescription>
              Please provide your company information before submitting rankings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  placeholder="john@acme.com"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex-1"
                >
                  {updateProfile.isPending ? "Saving..." : "Save & Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/prioritize")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
