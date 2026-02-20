/**
 * Sponsor Meetings Page
 * Displays published meeting schedule for the logged-in sponsor
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, LogOut, ArrowLeft, MapPin } from "lucide-react";
import { Link } from "wouter";
import AnimatedSection from "@/components/AnimatedSection";

export default function SponsorMeetings() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  
  const { data: meetings, isLoading: meetingsLoading } = trpc.sponsor.getMyMeetings.useQuery();

  if (loading || meetingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your meetings...</p>
        </div>
      </div>
    );
  }

  // Helper function to convert timeSlot (1-6) to day and slot
  const getDaySlot = (timeSlot: number | null) => {
    if (!timeSlot) return { day: 0, slot: 0 };
    // timeSlot 1-3 = Day 1, Slot 1-3
    // timeSlot 4-6 = Day 2, Slot 1-3
    const day = timeSlot <= 3 ? 1 : 2;
    const slot = timeSlot <= 3 ? timeSlot : timeSlot - 3;
    return { day, slot };
  };

  const hasMeetings = meetings && meetings.length > 0;

  return (
    <div className="min-h-screen">
      {/* User Profile Header */}
      <div className="border-b border-border/30 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/sponsor">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h2 className="text-lg font-heading font-bold text-foreground">My Meetings</h2>
            </div>
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
              <h1 className="text-foreground mb-4">Your Meeting Schedule</h1>
              <div className="gold-divider max-w-md mx-auto mb-6"></div>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                {hasMeetings 
                  ? `You have ${meetings.length} confirmed meetings scheduled with senior leaders.`
                  : "Your meetings will appear here once they are published by the RLX team."}
              </p>
            </div>
          </AnimatedSection>

          {!hasMeetings && (
            <AnimatedSection delay={100}>
              <Card className="glass-card text-center py-12">
                <CardContent>
                  <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-heading font-bold text-foreground mb-2">No Meetings Yet</h3>
                  <p className="text-muted-foreground">
                    Your meeting schedule will be published here once the RLX team has finalized your matches.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
          )}

          {hasMeetings && (
            <div className="space-y-8">
              {/* Day 1 */}
              {[1, 2].map(day => {
                const dayMeetings = meetings.filter(m => {
                  const { day: meetingDay } = getDaySlot(m.timeSlot);
                  return meetingDay === day;
                });
                if (dayMeetings.length === 0) return null;

                return (
                  <AnimatedSection key={day} delay={100 * day}>
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <Calendar className="w-6 h-6 text-accent" />
                          Day {day}
                        </CardTitle>
                        <CardDescription>
                          {dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''} scheduled
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[1, 2, 3].map(slot => {
                            const slotMeetings = dayMeetings.filter(m => {
                              const { slot: meetingSlot } = getDaySlot(m.timeSlot);
                              return meetingSlot === slot;
                            });
                            if (slotMeetings.length === 0) return null;

                            return (
                              <div key={slot} className="border-l-4 border-accent pl-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">Slot {slot}</span>
                                </div>
                                <div className="space-y-3">
                                  {slotMeetings.map((meeting, idx) => (
                                    <Card key={idx} className="bg-muted/30 border-border/50">
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <h4 className="font-heading font-bold text-foreground mb-1">
                                              {meeting.attendeeFirstName} {meeting.attendeeLastName}
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-1">
                                              {meeting.attendeeJobTitle}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {meeting.attendeeCompany}
                                            </p>
                                            {meeting.matchReason && (
                                              <div className="mt-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                                                <p className="text-sm text-foreground/90 leading-relaxed">
                                                  <strong className="text-accent">Why this match:</strong> {meeting.matchReason}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                          {meeting.matchScore && (
                                            <div className="text-right">
                                              <div className="text-2xl font-bold text-accent">{meeting.matchScore}%</div>
                                              <div className="text-xs text-muted-foreground">match</div>
                                            </div>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
