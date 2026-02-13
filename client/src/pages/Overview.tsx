/**
 * RLX Onboarding - Overview Page
 * Design: Luxury Editorial - Iconographic with Buzzwords
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Crown, Target, Users, TrendingUp, Award, Sparkles } from "lucide-react";

export default function Overview() {
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-6xl">
        <AnimatedSection>
          <div className="mb-16 text-center">
            <h1 className="text-foreground mb-6">Overview</h1>
            <div className="gold-divider mb-8 mx-auto"></div>
            <p className="text-2xl text-accent font-heading font-bold">
              Five-Star Leadership Exchange
            </p>
          </div>
        </AnimatedSection>

        {/* Hero Buzzwords Grid */}
        <AnimatedSection delay={100}>
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="glass-card p-8 text-center hover:scale-105 transition-transform">
              <Crown className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-4xl font-heading font-bold text-foreground mb-2">
                INVITATION
              </h3>
              <h3 className="text-4xl font-heading font-bold text-foreground mb-3">
                ONLY
              </h3>
              <p className="text-lg text-muted-foreground">
                Exclusive access
              </p>
            </div>

            <div className="glass-card p-8 text-center hover:scale-105 transition-transform">
              <Target className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-4xl font-heading font-bold text-foreground mb-2">
                PRE-QUALIFIED
              </h3>
              <h3 className="text-4xl font-heading font-bold text-foreground mb-3">
                BUYERS
              </h3>
              <p className="text-lg text-muted-foreground">
                Active budgets
              </p>
            </div>

            <div className="glass-card p-8 text-center hover:scale-105 transition-transform">
              <TrendingUp className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-4xl font-heading font-bold text-foreground mb-2">
                VERIFIABLE
              </h3>
              <h3 className="text-4xl font-heading font-bold text-foreground mb-3">
                OUTCOMES
              </h3>
              <p className="text-lg text-muted-foreground">
                Pipeline impact
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* What You Get */}
        <AnimatedSection delay={200}>
          <div className="glass-card p-10 md:p-14 rounded-lg mb-12">
            <div className="flex items-center gap-4 mb-8">
              <Sparkles className="w-12 h-12 text-accent" />
              <h2 className="text-4xl font-heading font-bold text-foreground">
                What You Get
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <Users className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-2xl font-heading font-bold text-foreground mb-2">
                    40+ Senior Leaders
                  </h4>
                  <p className="text-lg text-foreground/80">
                    Enterprise & high-growth TA decision-makers
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Award className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-2xl font-heading font-bold text-foreground mb-2">
                    Fully Hosted Luxury
                  </h4>
                  <p className="text-lg text-foreground/80">
                    Five-star venue, accommodation & dining
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Target className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-2xl font-heading font-bold text-foreground mb-2">
                    1:1 Curated Meetings
                  </h4>
                  <p className="text-lg text-foreground/80">
                    Matched to your ideal customer profile
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <TrendingUp className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-2xl font-heading font-bold text-foreground mb-2">
                    Direct Pipeline Impact
                  </h4>
                  <p className="text-lg text-foreground/80">
                    Introduction to partnership in 2 days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* The Difference */}
        <AnimatedSection delay={300}>
          <div className="glass-card p-10 bg-accent/10 border-accent/30 rounded-lg mb-12">
            <h2 className="text-4xl font-heading font-bold text-center text-foreground mb-8">
              The RLX Difference
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-5xl font-heading font-bold text-accent mb-2">NO</p>
                <p className="text-xl text-foreground/90">Random encounters</p>
              </div>
              <div>
                <p className="text-5xl font-heading font-bold text-accent mb-2">NO</p>
                <p className="text-xl text-foreground/90">Wasted time</p>
              </div>
              <div>
                <p className="text-5xl font-heading font-bold text-accent mb-2">NO</p>
                <p className="text-xl text-foreground/90">Noise</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <NextButton href="/features" label="Next: Features & Values" />
        </AnimatedSection>
      </div>
    </div>
  );
}
