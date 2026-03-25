/**
 * Sponsor Dashboard - Post-Event View
 * Shows sponsor their meetings and prompts them to rate meetings and leave notes
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, LogOut, User, ArrowRight, Calendar, MessageSquare, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import AnimatedSection from "@/components/AnimatedSection";
import { useEffect, useRef } from "react";

export default function SponsorDashboard() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  const { data: meetings = [], isLoading: meetingsLoading } = trpc.sponsor.getMyMeetings.useQuery();
  const trackActivity = trpc.sponsor.trackActivity.useMutation();
  const hasTrackedLogin = useRef(false);

  // Track login once per session when user is authenticated
  useEffect(() => {
    if (user && !hasTrackedLogin.current) {
      hasTrackedLogin.current = true;
      trackActivity.mutate({ eventType: 'login' });
    }
  }, [user]);

  const ratedCount = meetings.filter(m => m.meetingRating != null).length;
  const notedCount = meetings.filter(m => m.meetingNotes && m.meetingNotes.trim().length > 0).length;
  const allRated = meetings.length > 0 && ratedCount === meetings.length;

  if (loading || meetingsLoading) {
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
                onClick={() => { window.location.href = '/api/auth/logout'; }}
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-destructive/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6">
        <div className="container max-w-6xl">
          {/* Page title */}
          <AnimatedSection>
            <div className="mb-5">
              <h1 className="text-2xl font-heading font-bold text-foreground leading-tight">Welcome Back</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Thank you for attending RLX UK. Here's a summary of your event.</p>
            </div>
          </AnimatedSection>

          {/* Meeting summary row */}
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {/* Total meetings */}
            <AnimatedSection delay={50}>
              <Card className="glass-card">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{meetings.length}</p>
                      <p className="text-xs text-muted-foreground">Confirmed meetings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* Rated */}
            <AnimatedSection delay={100}>
              <Card className="glass-card">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${allRated ? 'bg-green-500/20' : 'bg-yellow-500/10'}`}>
                      <Star className={`w-5 h-5 ${allRated ? 'text-green-500' : 'text-yellow-500'}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{ratedCount}<span className="text-base text-muted-foreground font-normal"> / {meetings.length}</span></p>
                      <p className="text-xs text-muted-foreground">Meetings rated</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* Notes */}
            <AnimatedSection delay={150}>
              <Card className="glass-card">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{notedCount}<span className="text-base text-muted-foreground font-normal"> / {meetings.length}</span></p>
                      <p className="text-xs text-muted-foreground">Meetings with notes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>

          {/* Rate Your Meetings CTA */}
          <AnimatedSection delay={200}>
            <Card className={`glass-card mb-5 ${allRated ? 'border-green-500/40 bg-green-500/5' : 'border-accent/40 bg-accent/5'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${allRated ? 'bg-green-500/20' : 'bg-accent/20'}`}>
                    {allRated
                      ? <CheckCircle className="w-6 h-6 text-green-500" />
                      : <Star className="w-6 h-6 text-accent" />
                    }
                  </div>
                  <div className="flex-1">
                    <CardTitle className={`text-lg ${allRated ? 'text-green-400' : 'text-accent'}`}>
                      {allRated ? 'All meetings rated — thank you!' : 'Rate Your Meetings'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {allRated
                        ? `You've rated all ${meetings.length} meetings. The post-event feedback form is now available on the Feedback tab.`
                        : `You've rated ${ratedCount} of ${meetings.length} meetings. Once all are rated, the post-event feedback form will unlock.`
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate("/feedback")}
                  className={`gap-2 ${allRated ? 'bg-green-600 hover:bg-green-700' : 'bg-accent hover:bg-accent/90'} text-white`}
                >
                  {allRated ? 'View Feedback & Notes' : 'Go to Feedback Tab'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Quick links */}
          <AnimatedSection delay={250}>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Link href="/meeting-schedule">
                    <Button variant="outline" className="w-full">
                      Meeting Schedule
                    </Button>
                  </Link>
                  <Link href="/event-details">
                    <Button variant="outline" className="w-full">
                      Event Details
                    </Button>
                  </Link>
                  <Link href="/agenda">
                    <Button variant="outline" className="w-full">
                      Agenda
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
