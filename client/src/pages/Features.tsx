/**
 * RLX Onboarding - Features & Values Page
 * Design: Luxury Editorial
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Award, Sparkles, Wine, TrendingUp, Target, Handshake, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Features() {
  const coreFeatures = [
    { icon: Calendar, text: "Two-day curated exchange format" },
    { icon: Award, text: "By invitation only" },
    { icon: Users, text: "Targeted 1:1 meetings on both days" },
    { icon: Sparkles, text: "Leadership panels and small-group workshops" },
    { icon: Wine, text: "Experiential sessions (e.g., wellness, culinary, creative)" },
    { icon: TrendingUp, text: "Black tie gala dinner" },
    { icon: Calendar, text: "Optional pre-event dinner and ice-breaker" },
  ];

  const partnerValues = [
    { icon: Target, text: "ROI through data-driven meetings" },
    { icon: TrendingUp, text: "Brand immersion and multi-touch engagement" },
    { icon: Handshake, text: "Opportunities for authentic relationship-building" },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-6xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Core Features & Partner Values</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Core Features */}
          <AnimatedSection delay={100}>
            <div className="glass-card p-8 rounded-lg h-full">
              <h2 className="text-3xl font-display font-bold text-foreground mb-8">Core Features</h2>
              <ul className="space-y-4">
                {coreFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <li key={index} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 border border-accent/30">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-lg text-foreground/90 leading-relaxed pt-1.5">{feature.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </AnimatedSection>

          {/* Partner Values */}
          <AnimatedSection delay={200}>
            <div className="glass-card p-8 rounded-lg h-full">
              <h2 className="text-3xl font-display font-bold text-foreground mb-8">Partner Values</h2>
              <ul className="space-y-4">
                {partnerValues.map((value, index) => {
                  const Icon = value.icon;
                  return (
                    <li key={index} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 border border-accent/30">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-lg text-foreground/90 leading-relaxed pt-1.5">{value.text}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-8 p-6 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-foreground/90 leading-relaxed italic">
                  "RLX is designed for depth, not volume, ensuring every interaction contributes directly to your sales 
                  pipeline and elevates your brand positioning among the industry's most influential leaders."
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={300}>
          <div className="flex justify-center gap-4">
            <Link href="/rules">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
                View Rules of Engagement
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
