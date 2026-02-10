/**
 * RLX Onboarding - Overview Page
 * Design: Luxury Editorial
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Overview() {
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-4xl">
        <AnimatedSection>
          <div className="mb-12">
            <h1 className="text-foreground mb-6">Overview</h1>
            <div className="gold-divider mb-8"></div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="glass-card p-8 md:p-12 rounded-lg mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-6">
              The Resourcing Leaders Exchange
            </h2>
            <div className="space-y-6 text-lg leading-relaxed text-foreground/90">
              <p>
                The Resourcing Leaders Exchange (RLX) is an <strong className="text-accent">invitation-only, five-star leadership summit</strong> meticulously 
                crafted to remove the noise and inefficiency of traditional B2B events. We bring together a highly selective cohort of 
                senior Talent Acquisition leaders from enterprise and high-growth organisations who are actively in the market for solutions.
              </p>
              <p>
                This is a <strong className="text-accent">fully hosted, luxury environment</strong> where all focus is placed on delivering verifiable commercial 
                outcomes for our solution partners. RLX is designed for depth, not volume, ensuring every interaction contributes directly 
                to your sales pipeline and elevates your brand positioning among the industry's most influential leaders.
              </p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <div className="glass-card p-8 md:p-12 rounded-lg mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-6">
              Why We Created The RL Exchange
            </h2>
            <div className="space-y-6 text-lg leading-relaxed text-foreground/90">
              <p>
                The modern TA leader operates at a strategic, C-suite level, yet existing industry events often fail to provide the 
                necessary focus or quality of engagement to match this seniority. We created the RLX to solve this disconnect.
              </p>
              <p>
                Our <strong className="text-accent">proprietary hosted-buyer model</strong> guarantees that every participating leader is pre-qualified based on 
                active budget cycles, specific solution priorities, and organisational context. This means we eliminate random encounters 
                and provide predictable, high-intent engagement, allowing your team to move directly from introduction to partnership 
                conversation.
              </p>
              <p>
                The result is a <strong className="text-accent">uniquely profitable platform</strong> built on the trust and credibility our brand has established 
                in the leadership community.
              </p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={300}>
          <div className="flex justify-center gap-4">
            <Link href="/features">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
                Explore Features & Values
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
