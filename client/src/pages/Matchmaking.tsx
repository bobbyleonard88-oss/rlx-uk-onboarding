/**
 * RLX Onboarding - Matchmaking Process Page
 * Design: Concise, scannable layout with key information
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Users, Target, Brain, Calendar } from "lucide-react";

export default function Matchmaking() {
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-5xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Matchmaking Process</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              How we deliver 12–20 strategically aligned meetings per partner
            </p>
          </div>
        </AnimatedSection>

        {/* Three-Part Model */}
        <AnimatedSection delay={100}>
          <div className="mb-10">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-6 text-center">Three-Part Model</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Part 1 */}
              <div className="glass-card p-6 rounded-lg border-accent/30">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30 mb-3">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-foreground">Delegate Preference</h3>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Delegates review partner profiles and select 4–8 based on active priorities and projects.
                </p>
              </div>

              {/* Part 2 */}
              <div className="glass-card p-6 rounded-lg border-accent/30">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30 mb-3">
                    <Target className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-foreground">Partner Ranking</h3>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  You rank all delegates by ICP fit—company, seniority, volume, industry, region, and projects.
                </p>
              </div>

              {/* Part 3 */}
              <div className="glass-card p-6 rounded-lg border-accent/30">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30 mb-3">
                    <Brain className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-foreground">RLX Curation</h3>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  We combine preferences, rankings, and context with AI-assisted matching and human oversight.
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Key Points */}
        <AnimatedSection delay={200}>
          <div className="glass-card p-8 rounded-lg mb-8">
            <h3 className="text-xl font-heading font-bold text-foreground mb-4">Key Principles</h3>
            <div className="space-y-3 text-foreground/90">
              <p className="leading-relaxed">
                • <strong className="text-accent">Preference-led, not preference-guaranteed</strong> — RLX owns final allocations to ensure balanced value
              </p>
              <p className="leading-relaxed">
                • <strong className="text-accent">No guarantees on rankings</strong> — protects your investment and meeting quality
              </p>
              <p className="leading-relaxed">
                • Strong matches align on: delegate interest, partner ICP, buying stage, budget authority, solution overlap, and timeline
              </p>
              <p className="leading-relaxed">
                • Changes require approval after final lists are released
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Meeting Stats */}
        <AnimatedSection delay={300}>
          <div className="glass-card p-8 rounded-lg mb-8">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl font-heading font-bold text-accent mb-2">12-20</div>
                <p className="text-sm text-muted-foreground">Curated Meetings</p>
              </div>
              <div>
                <div className="text-4xl font-heading font-bold text-accent mb-2">30min</div>
                <p className="text-sm text-muted-foreground">Per Meeting</p>
              </div>
              <div>
                <div className="text-4xl font-heading font-bold text-accent mb-2">6hrs</div>
                <p className="text-sm text-muted-foreground">Total Time</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Timeline */}
        <AnimatedSection delay={400}>
          <div className="glass-card p-8 rounded-lg mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-accent" />
              <h3 className="text-xl font-heading font-bold text-foreground">Timeline</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[120px]">5 Weeks Before</div>
                <div className="text-foreground/90">List shared • Rankings begin</div>
              </div>
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[120px]">4 Weeks Before</div>
                <div className="text-foreground/90">Rankings completed</div>
              </div>
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[120px]">3 Weeks Before</div>
                <div className="text-foreground/90">AI-assisted matching begins</div>
              </div>
              <div className="flex gap-4">
                <div className="text-accent font-heading font-bold min-w-[120px]">10 Days Before</div>
                <div className="text-foreground/90">Final lists delivered with comprehensive briefing packs</div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={500}>
          <NextButton href="/intake" label="Next: Intake Form" />
        </AnimatedSection>
      </div>
    </div>
  );
}
