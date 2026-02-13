/**
 * RLX Onboarding - Matchmaking Process Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Calendar } from "lucide-react";

export default function Matchmaking() {
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-6xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Matchmaking Process</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Understanding how we deliver 12–20 high-quality, strategically aligned meetings per partner
            </p>
          </div>
        </AnimatedSection>

        {/* Purpose */}
        <AnimatedSection delay={100}>
          <div className="glass-card p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Our Approach</h2>
            <p className="text-base text-foreground/90 leading-relaxed mb-3">
              We deliver <strong className="text-accent">12–20 high-quality, strategically aligned meetings</strong> per 
              partner through a structured, preference-led but RLX-controlled matchmaking process.
            </p>
            <p className="text-base text-foreground/90 leading-relaxed">
              This ensures relevance for delegates, commercial value for partners, fair distribution across all participants, 
              and full internal governance and consistency. <strong className="text-accent">No meetings are guaranteed based 
              purely on rankings</strong>—RLX curates final allocations.
            </p>
          </div>
        </AnimatedSection>

        {/* Three-Part Model Table */}
        <AnimatedSection delay={200}>
          <div className="mb-8">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-6 text-center">Three-Part Matchmaking Model</h2>
            
            <div className="glass-card rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-accent/10">
                    <th className="text-left p-4 font-heading font-bold text-foreground">Part</th>
                    <th className="text-left p-4 font-heading font-bold text-foreground">Description</th>
                    <th className="text-left p-4 font-heading font-bold text-foreground">Key Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20">
                    <td className="p-4 align-top">
                      <div className="font-heading font-bold text-accent text-sm">Part 1</div>
                      <div className="text-foreground text-sm">Delegate-Driven Preference</div>
                    </td>
                    <td className="p-4 align-top text-sm text-foreground/90">
                      Delegates review abridged partner profiles and select 4–8 partners based on live priorities and active projects.
                    </td>
                    <td className="p-4 align-top text-sm text-foreground/90">
                      Ensures meetings are opt-in and commercially relevant
                    </td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-4 align-top">
                      <div className="font-heading font-bold text-accent text-sm">Part 2</div>
                      <div className="text-foreground text-sm">Partner ICP Ranking</div>
                    </td>
                    <td className="p-4 align-top text-sm text-foreground/90">
                      You receive the full list of confirmed delegates and rank all based on ICP fit—considering company, seniority, hiring volume, industry, region, and known projects.
                    </td>
                    <td className="p-4 align-top text-sm text-foreground/90 italic">
                      No guarantees are provided on ranking outcomes. This protects your investment and meeting quality.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 align-top">
                      <div className="font-heading font-bold text-accent text-sm">Part 3</div>
                      <div className="text-foreground text-sm">RLX Curated Matching</div>
                    </td>
                    <td className="p-4 align-top text-sm text-foreground/90">
                      We combine delegate preferences, partner rankings, and application context through AI-assisted matching with human oversight to ensure balanced allocation and strong commercial pairings.
                    </td>
                    <td className="p-4 align-top text-sm text-foreground/90">
                      <strong className="text-accent">Final decisions sit with RLX</strong> to maintain fairness and quality across all participants
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>

        {/* Strong Match Criteria Table */}
        <AnimatedSection delay={300}>
          <div className="mb-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4">What Makes a Strong Match</h3>
            <p className="text-base text-foreground/90 leading-relaxed mb-4">
              Matches are prioritised where multiple criteria align:
            </p>
            <div className="glass-card rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-accent/10">
                    <th className="text-left p-3 font-heading font-bold text-foreground text-sm">Criterion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Delegate ranked sponsor High or Medium</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Sponsor ranked delegate High or Medium</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Buying stage is active or near-term</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Budget authority is present</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Solution area overlaps</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-sm text-foreground/90">Timeline aligns within 12 months</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>

        {/* Meeting Structure */}
        <AnimatedSection delay={400}>
          <div className="glass-card p-6 rounded-lg mb-8">
            <h3 className="text-xl font-heading font-bold text-foreground mb-4">Meeting Structure & Capacity</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-4">
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-accent mb-1">12-20</div>
                <p className="text-sm text-muted-foreground">Curated Meetings</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-accent mb-1">30min</div>
                <p className="text-sm text-muted-foreground">Per Meeting</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-accent mb-1">6hrs</div>
                <p className="text-sm text-muted-foreground">Total Meeting Time</p>
              </div>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Meetings are spread across two days in structured blocks (morning, post-lunch, late afternoon), 
              with content sessions, roundtables, and networking in between.
            </p>
          </div>
        </AnimatedSection>

        {/* Timeline Table */}
        <AnimatedSection delay={500}>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-accent" />
              <h3 className="text-2xl font-heading font-bold text-foreground">Process Timeline</h3>
            </div>
            <div className="glass-card rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-accent/10">
                    <th className="text-left p-3 font-heading font-bold text-foreground text-sm">Timeline</th>
                    <th className="text-left p-3 font-heading font-bold text-foreground text-sm">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-accent font-heading font-bold text-sm whitespace-nowrap">5 Weeks Before</td>
                    <td className="p-3 text-sm text-foreground/90">Registration list shared (no contact details) • Partners begin ranking</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-accent font-heading font-bold text-sm whitespace-nowrap">4 Weeks Before</td>
                    <td className="p-3 text-sm text-foreground/90">Partner rankings completed • Delegate selections completed</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-accent font-heading font-bold text-sm whitespace-nowrap">3 Weeks Before</td>
                    <td className="p-3 text-sm text-foreground/90">AI-assisted matchmaking begins • Internal review and adjustments</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-accent font-heading font-bold text-sm whitespace-nowrap">10 Days Before</td>
                    <td className="p-3 text-sm text-foreground/90">Final meeting lists delivered with full delegate briefing packs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>

        {/* Briefing Packs Table */}
        <AnimatedSection delay={600}>
          <div className="mb-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4">What You'll Receive</h3>
            <p className="text-base text-foreground/90 leading-relaxed mb-4">
              Each delegate briefing includes comprehensive context to prepare for high-value conversations:
            </p>
            <div className="glass-card rounded-lg overflow-hidden bg-accent/10 border-accent/30">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-accent/20">
                    <th className="text-left p-3 font-heading font-bold text-foreground text-sm">Briefing Component</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Name, Role, and Company</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Region and Hiring Volume</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Decision Level and Budget Authority</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Active Projects and Buying Stage</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="p-3 text-sm text-foreground/90">Pain Points and Current Tech Stack</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-sm text-foreground/90">Meeting Objectives and Commercial Drivers</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed mt-4 text-center">
              <strong className="text-accent">This depth of preparation is central to the RLX value proposition.</strong>
            </p>
          </div>
        </AnimatedSection>

        {/* Key Principles */}
        <AnimatedSection delay={700}>
          <div className="glass-card p-6 rounded-lg mb-12">
            <h3 className="text-xl font-heading font-bold text-foreground mb-4">Key Principles</h3>
            <div className="space-y-2 text-sm">
              <p className="text-foreground/90 leading-relaxed">
                • RLX owns final allocation decisions to ensure balanced value across all participants
              </p>
              <p className="text-foreground/90 leading-relaxed">
                • Matchmaking is <strong className="text-accent">preference-led, not preference-guaranteed</strong>
              </p>
              <p className="text-foreground/90 leading-relaxed">
                • Changes require internal approval after final lists are released
              </p>
              <p className="text-foreground/90 leading-relaxed">
                • Rankings must be completed on time—deadlines protect the entire process
              </p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={800}>
          <NextButton href="/team" label="Next: Meet The Team" />
        </AnimatedSection>
      </div>
    </div>
  );
}
