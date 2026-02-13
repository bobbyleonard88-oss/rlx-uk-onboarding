/**
 * Admin Profiles Management
 * Upload and manage vendor and delegate profiles
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Users, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminProfiles() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  
  const { data: vendorProfiles, refetch: refetchVendors } = trpc.admin.getVendorProfiles.useQuery();
  const { data: delegateProfiles, refetch: refetchDelegates } = trpc.admin.getDelegateProfiles.useQuery();
  
  const uploadVendorProfile = trpc.admin.uploadVendorProfile.useMutation({
    onSuccess: () => {
      refetchVendors();
      toast.success("Vendor profile uploaded successfully!");
      setVendorData("");
    },
  });

  const uploadDelegateProfile = trpc.admin.uploadDelegateProfile.useMutation({
    onSuccess: () => {
      refetchDelegates();
      toast.success("Delegate profile uploaded successfully!");
      setDelegateData("");
    },
  });

  const deleteVendorProfile = trpc.admin.deleteVendorProfile.useMutation({
    onSuccess: () => {
      refetchVendors();
      toast.success("Vendor profile deleted");
    },
  });

  const deleteDelegateProfile = trpc.admin.deleteDelegateProfile.useMutation({
    onSuccess: () => {
      refetchDelegates();
      toast.success("Delegate profile deleted");
    },
  });

  const [vendorData, setVendorData] = useState("");
  const [delegateData, setDelegateData] = useState("");

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

  function handleUploadVendor() {
    try {
      const profiles = JSON.parse(vendorData);
      if (!Array.isArray(profiles)) {
        toast.error("Data must be an array of profiles");
        return;
      }
      
      profiles.forEach((profile) => {
        uploadVendorProfile.mutate({ profileData: JSON.stringify(profile) });
      });
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  }

  function handleUploadDelegate() {
    try {
      const profiles = JSON.parse(delegateData);
      if (!Array.isArray(profiles)) {
        toast.error("Data must be an array of profiles");
        return;
      }
      
      profiles.forEach((profile) => {
        uploadDelegateProfile.mutate({ profileData: JSON.stringify(profile) });
      });
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
            Profile Management
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload and manage vendor and delegate profiles for AI matchmaking
          </p>
        </div>

        <Tabs defaultValue="vendors" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="vendors">
              <FileText className="w-4 h-4 mr-2" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="delegates">
              <Users className="w-4 h-4 mr-2" />
              Delegates
            </TabsTrigger>
          </TabsList>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Vendor Profiles
                </CardTitle>
                <CardDescription>
                  Paste JSON array of vendor profiles. Each profile should include: companyName, solutions, painPoints, targetIndustries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorData">JSON Data</Label>
                  <Textarea
                    id="vendorData"
                    value={vendorData}
                    onChange={(e) => setVendorData(e.target.value)}
                    placeholder='[{"companyName": "Acme Corp", "solutions": "Cloud infrastructure", "painPoints": "Scalability issues", "targetIndustries": ["Tech", "Finance"]}]'
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleUploadVendor}
                  disabled={uploadVendorProfile.isPending || !vendorData}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadVendorProfile.isPending ? "Uploading..." : "Upload Profiles"}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Uploaded Vendor Profiles ({vendorProfiles?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendorProfiles && vendorProfiles.length > 0 ? (
                    vendorProfiles.map((profile) => (
                      <div key={profile.id} className="flex justify-between items-start p-4 bg-background/50 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-2">{profile.companyName}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{profile.solutions}</p>
                          <Badge variant="secondary">ID: {profile.id}</Badge>
                        </div>
                        <Button
                          onClick={() => deleteVendorProfile.mutate({ id: profile.id })}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No vendor profiles uploaded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delegates Tab */}
          <TabsContent value="delegates" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Delegate Profiles
                </CardTitle>
                <CardDescription>
                  Paste JSON array of delegate profiles. Each profile should include: attendeeId, firstName, lastName, company, challenges, interests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delegateData">JSON Data</Label>
                  <Textarea
                    id="delegateData"
                    value={delegateData}
                    onChange={(e) => setDelegateData(e.target.value)}
                    placeholder='[{"attendeeId": "att_001", "firstName": "John", "lastName": "Smith", "company": "Tech Inc", "challenges": "Need better analytics", "interests": "AI solutions"}]'
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleUploadDelegate}
                  disabled={uploadDelegateProfile.isPending || !delegateData}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadDelegateProfile.isPending ? "Uploading..." : "Upload Profiles"}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Uploaded Delegate Profiles ({delegateProfiles?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {delegateProfiles && delegateProfiles.length > 0 ? (
                    delegateProfiles.map((profile) => (
                      <div key={profile.id} className="flex justify-between items-start p-4 bg-background/50 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-2">
                            {profile.firstName} {profile.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {profile.jobTitle} at {profile.company}
                          </p>
                          <Badge variant="secondary">ID: {profile.attendeeId}</Badge>
                        </div>
                        <Button
                          onClick={() => deleteDelegateProfile.mutate({ id: profile.id })}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No delegate profiles uploaded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
