/**
 * RLX Onboarding - Matchmaking Process Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Users, Target, Brain, CheckCircle2, Calendar } from "lucide-react";

export default function Matchmaking() {
  const strongMatchCriteria = [
    "Delegate ranked sponsor High or Medium",
    "Sponsor ranked delegate High or Medium",
    "Buying stage is active or near-term",
    "Budget authority is present",
    "Solution area overlaps",
    "Timeline aligns within 12 months",
  ];

  const briefingIncludes = [
    "Name, Role, and Company",
    "Region and Hiring Volume",
    "Decision Level and Budget Authority",
    "Active Projects and Buying Stage",
    "Pain Points and Current Tech Stack",
    "Meeting Objectives and Commercial Drivers",
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-5xl">
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
          <div className="glass-card p-8 md:p-12 rounded-lg mb-8">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-6">Our Approach</h2>
            <p className="text-lg text-foreground/90 leading-relaxed mb-4">
              We deliver <strong className="text-accent">12–20 high-quality, strategically aligned meetings</strong> per 
              partner through a structured, preference-led but RLX-controlled matchmaking process.
            </p>
            <p className="text-lg text-foreground/90 leading-relaxed">
              This ensures relevance for delegates, commercial value for partners, fair distribution across all participants, 
              and full internal governance and consistency. <strong className="text-accent">No meetings are guaranteed based 
              purely on rankings</strong>—RLX curates final allocations.
            </p>
          </div>
        </AnimatedSection>

        {/* Three-Part Model */}
        <AnimatedSection delay={200}>
          <div className="mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-8 text-center">Three-Part Matchmaking Model</h2>
            
            <div className="space-y-6">
              {/* Part 1 */}
              <div className="glass-card p-8 rounded-lg border-accent/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-foreground">Part 1: Delegate-Driven Preference</h3>
                </div>
                <p className="text-lg text-foreground/90 leading-relaxed mb-4">
                  Delegates review abridged partner profiles and select 4–8 partners based on live priorities and active projects. 
                  This ensures meetings are opt-in and commercially relevant.
                </p>
              </div>

              {/* Part 2 */}
              <div className="glass-card p-8 rounded-lg border-accent/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                    <Target className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-foreground">Part 2: Partner ICP Ranking</h3>
                </div>
                <p className="text-lg text-foreground/90 leading-relaxed mb-4">
                  You receive the full list of confirmed delegates and rank all based on ICP fit—considering company, 
                  seniority, hiring volume, industry, region, and known projects.
                </p>
                <p className="text-foreground/80 italic">
                  No guarantees are provided on ranking outcomes. This protects your investment and meeting quality.
                </p>
              </div>

              {/* Part 3 */}
              <div className="glass-card p-8 rounded-lg border-accent/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                    <Brain className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-foreground">Part 3: RLX Curated Matching</h3>
                </div>
                <p className="text-lg text-foreground/90 leading-relaxed mb-4">
                  We combine delegate preferences, partner rankings, and application context through AI-assisted matching 
                  with human oversight to ensure balanced allocation and strong commercial pairings.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  <strong className="text-accent">Final decisions sit with RLX</strong> to maintain fairness and quality across all participants.
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Strong Match Criteria */}
        <AnimatedSection delay={300}>
          <div className="mb-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">What Makes a Strong Match</h3>
            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              Matches are prioritised where multiple criteria align:
            </p>
            <ul className="space-y-3 text-foreground/90 leading-relaxed">
              {strongMatchCriteria.map((criterion, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-accent mt-1">•</span>
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>

        {/* Meeting Structure */}
        <AnimatedSection delay={400}>
          <div className="glass-card p-8 rounded-lg mb-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">Meeting Structure & Capacity</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-heading font-bold text-accent mb-2">12-20</div>
                <p className="text-muted-foreground">Curated Meetings</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-heading font-bold text-accent mb-2">30min</div>
                <p className="text-muted-foreground">Per Meeting</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-heading font-bold text-accent mb-2">6hrs</div>
                <p className="text-muted-foreground">Total Meeting Time</p>
              </div>
            </div>
            <p className="text-foreground/90 leading-relaxed">
              Meetings are spread across two days in structured blocks (morning, post-lunch, late afternoon), 
              with content sessions, roundtables, and networking in between.
            </p>
          </div>
        </AnimatedSection>

        {/* Timeline */}
        <AnimatedSection delay={500}>
          <div className="glass-card p-8 rounded-lg mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Calendar className="w-8 h-8 text-accent" />
              <h3 className="text-2xl font-heading font-bold text-foreground">Process Timeline</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[140px]">5 Weeks Before</div>
                <div className="text-foreground/90">Registration list shared (no contact details) • Partners begin ranking</div>
              </div>
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[140px]">4 Weeks Before</div>
                <div className="text-foreground/90">Partner rankings completed • Delegate selections completed</div>
              </div>
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[140px]">3 Weeks Before</div>
                <div className="text-foreground/90">AI-assisted matchmaking begins • Internal review and adjustments</div>
              </div>
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[140px]">10 Days Before</div>
                <div className="text-foreground/90">Final meeting lists delivered with full delegate briefing packs</div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Briefing Packs */}
        <AnimatedSection delay={600}>
          <div className="glass-card p-8 rounded-lg mb-8 bg-accent/10 border-accent/30">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">What You'll Receive</h3>
            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              Each delegate briefing includes comprehensive context to prepare for high-value conversations:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {briefingIncludes.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-foreground/90 leading-relaxed mt-6">
              <strong className="text-accent">This depth of preparation is central to the RLX value proposition.</strong>
            </p>
          </div>
        </AnimatedSection>

        {/* Key Principles */}
        <AnimatedSection delay={700}>
          <div className="glass-card p-8 rounded-lg mb-12">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">Key Principles</h3>
            <div className="space-y-3">
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
