/**
 * RLX Onboarding - Sponsorship Packages Page
 * Design: Luxury Editorial
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Check, Star, ArrowRight, Users, Calendar, FileText, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function Packages() {
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-6xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Sponsorship Packages</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Choose the partnership level that aligns with your business objectives and engagement goals.
            </p>
          </div>
        </AnimatedSection>

        {/* Main Packages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Foundation Package */}
          <AnimatedSection delay={100}>
            <div className="glass-card p-8 rounded-lg h-full border-2 border-border/50 hover:border-accent/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                  <Star className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground">Foundation Package</h2>
                  <p className="text-muted-foreground">12-Meeting Partner</p>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90"><strong className="text-accent">12 Meetings</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90"><strong className="text-accent">1 Attendee</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">20-30 Leader Attendees</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">12 x 20-min meetings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">Luxury retreat experience</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">Pre-meeting profiles</span>
                </li>
              </ul>

              <div className="p-6 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  These structured, 20-minute one-to-one meetings form the backbone of the event. They are meticulously 
                  pre-scheduled based on mutual interest, ensuring your team sits across the table from a leader whose 
                  organisational challenges, budget size, and active project timelines align directly with your capabilities.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Executive Package */}
          <AnimatedSection delay={200}>
            <div className="glass-card p-8 rounded-lg h-full border-2 border-accent/50 hover:border-accent transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-4 py-1 text-xs font-heading font-bold">
                RECOMMENDED
              </div>
              
              <div className="flex items-center gap-3 mb-6 mt-4">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center border border-accent">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground">Executive Package</h2>
                  <p className="text-muted-foreground">20-Meeting Partner</p>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90"><strong className="text-accent">20 Meetings</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90"><strong className="text-accent">2 Attendees</strong> (Incl. Speaker)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">20-30 Leader Attendees</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">20 x 20-min meetings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">Luxury retreat experience</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">Pre-meeting profiles</span>
                </li>
              </ul>

              <div className="p-6 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Maximize your ROI with additional meetings and the ability to bring a second attendee. Perfect for 
                  organizations seeking deeper engagement and broader team exposure to senior TA leaders.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* Add-Ons */}
        <AnimatedSection delay={300}>
          <div className="mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-8 text-center">Sponsorship Add-Ons</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Private Workshop */}
              <div className="glass-card p-8 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-8 h-8 text-accent" />
                  <h3 className="text-2xl font-heading font-bold text-foreground">Private Workshop</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Available as an exclusive enhancement to both packages
                </p>
                <p className="text-foreground/90 leading-relaxed mb-6">
                  These 60 minute small group sessions are limited to 4–5 pre-qualified leaders and focus on solution 
                  discovery and deep exploration of a specific industry challenge. By facilitating these intimate discussions, 
                  you position your brand as a strategic thought partner rather than just a vendor, earning valuable trust 
                  and demonstrating niche expertise in a focused, non-competitive setting.
                </p>
                <div className="text-sm text-accent font-heading">
                  Limited inventory to maintain exclusivity
                </div>
              </div>

              {/* Private Experiential Session */}
              <div className="glass-card p-8 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-8 h-8 text-accent" />
                  <h3 className="text-2xl font-heading font-bold text-foreground">Private Experiential Session</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Available as an exclusive enhancement to both packages
                </p>
                <p className="text-foreground/90 leading-relaxed mb-6">
                  Beyond the structured business agenda, the RLX is defined by its premium experiential sessions. From 
                  wellness classes to private culinary events, these hour-long, small-group activities are designed to 
                  deepen rapport in a relaxed, informal setting. By stepping away from the conference room, you build 
                  authentic, lasting relationships with senior leaders, which is the necessary foundation for closing 
                  large enterprise deals.
                </p>
                <div className="text-sm text-accent font-heading">
                  Connect with 5-7 leaders intimately
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <div className="flex justify-center gap-4">
            <Link href="/meetings">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
                Learn About 1:1 Meetings
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
