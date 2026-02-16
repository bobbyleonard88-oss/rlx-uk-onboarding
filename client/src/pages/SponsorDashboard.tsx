/**
 * Sponsor Dashboard - Submission Tracking
 * Shows sponsor their submission status and provides quick access to forms
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, FileText, List, LogOut, User, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import AnimatedSection from "@/components/AnimatedSection";

export default function SponsorDashboard() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  
  const { data: intakeSubmission, isLoading: intakeLoading } = trpc.intake.getSubmission.useQuery();
  const { data: rankingsSubmission, isLoading: rankingsLoading } = trpc.rankings.myRankingsSubmission.useQuery();

  const hasIntake = !!intakeSubmission;
  const hasRankings = !!rankingsSubmission;
  const isComplete = hasIntake && hasRankings;

  if (loading || intakeLoading || rankingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* User Profile Header */}
      <div className="border-b border-border/30 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between h-14">
            <h2 className="text-lg font-heading font-bold text-foreground">RLX Sponsor Portal</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.href = '/api/auth/logout';
                }}
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-destructive/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20">
        <div className="container max-w-6xl">
          <AnimatedSection>
            <div className="mb-12 text-center">
              <h1 className="text-foreground mb-4">Welcome to Your Dashboard</h1>
              <div className="gold-divider max-w-md mx-auto mb-6"></div>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Track your onboarding progress and manage your submissions for the RLX event.
              </p>
            </div>
          </AnimatedSection>

          {/* Completion Status */}
          <AnimatedSection delay={100}>
            <Card className={`glass-card mb-8 ${isComplete ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {isComplete ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <span className="text-green-500">Onboarding Complete!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-6 h-6 text-yellow-500" />
                      <span className="text-yellow-500">Onboarding In Progress</span>
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {isComplete 
                    ? "You've completed both required submissions. The CS team will review and contact you soon."
                    : "Please complete both the intake form and meeting rankings to finish your onboarding."}
                </CardDescription>
              </CardHeader>
            </Card>
          </AnimatedSection>

          {/* Submission Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Intake Form Card */}
            <AnimatedSection delay={150}>
              <Card className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${hasIntake ? 'bg-green-500/20' : 'bg-muted'}`}>
                        <FileText className={`w-6 h-6 ${hasIntake ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Partner Intake Form</CardTitle>
                        <CardDescription>Company & attendee information</CardDescription>
                      </div>
                    </div>
                    {hasIntake ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {hasIntake ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Submitted on {new Date(intakeSubmission.submittedAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate("/intake")}
                            variant="outline"
                            className="flex-1"
                          >
                            Edit Submission
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-4">
                          Complete your company profile and attendee details to help us facilitate meaningful connections.
                        </p>
                        <Button
                          onClick={() => navigate("/intake")}
                          className="w-full gap-2"
                        >
                          Complete Intake Form
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* Rankings Card */}
            <AnimatedSection delay={200}>
              <Card className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${hasRankings ? 'bg-green-500/20' : 'bg-muted'}`}>
                        <List className={`w-6 h-6 ${hasRankings ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Meeting Rankings</CardTitle>
                        <CardDescription>Prioritize your delegate meetings</CardDescription>
                      </div>
                    </div>
                    {hasRankings ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {hasRankings ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Submitted on {new Date(rankingsSubmission.submittedAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate("/prioritize")}
                            variant="outline"
                            className="flex-1"
                          >
                            Edit Rankings
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-4">
                          Rank all delegates in order of meeting priority to help us schedule the most valuable meetings for your team.
                        </p>
                        <Button
                          onClick={() => navigate("/prioritize")}
                          className="w-full gap-2"
                        >
                          Prioritize Meetings
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>

          {/* Quick Links */}
          <AnimatedSection delay={250}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Navigate to other sections of the onboarding journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Link href="/overview">
                    <Button variant="outline" className="w-full">
                      Event Overview
                    </Button>
                  </Link>
                  <Link href="/timeline">
                    <Button variant="outline" className="w-full">
                      Event Timeline
                    </Button>
                  </Link>
                  <Link href="/faq">
                    <Button variant="outline" className="w-full">
                      FAQ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
