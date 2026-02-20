/**
 * RLX Onboarding - Add-Ons Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Presentation, Users, CheckCircle2 } from "lucide-react";

export default function AddOns() {
  const workshopFeatures = [
    "1-hour private session",
    "5-8 senior leaders in attendance",
    "Dedicated session space",
    "Custom content tailored to your solution",
    "Direct engagement with qualified audience",
  ];

  const experienceFeatures = [
    "1-hour private experiential session",
    "5-8 senior leaders in attendance",
    "Unique, memorable format",
    "Interactive demonstration opportunity",
    "Premium networking environment",
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-6xl">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h1 className="text-foreground mb-6">Partnership Add-Ons</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Enhance your partnership with exclusive opportunities to showcase your solutions and engage directly with senior TA leaders
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Workshop Add-On */}
          <AnimatedSection delay={100}>
            <div className="glass-card p-8 rounded-lg h-full flex flex-col border-accent/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                  <Presentation className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground">Private Workshop</h2>
                  <p className="text-3xl font-heading font-bold text-accent">£3,000</p>
                </div>
              </div>

              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Host an intimate, focused workshop session with a curated group of senior talent acquisition leaders.
              </p>

              <div className="space-y-3 mb-8 flex-grow">
                {workshopFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="glass-card p-4 bg-accent/10 border-accent/30 rounded-lg">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  <strong className="text-accent">Perfect for:</strong> Interactive discussions on specific TA challenges.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Experience Add-On */}
          <AnimatedSection delay={200}>
            <div className="glass-card p-8 rounded-lg h-full flex flex-col border-accent/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                  <Users className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground">Private Experience</h2>
                  <p className="text-3xl font-heading font-bold text-accent">£3,000</p>
                </div>
              </div>

              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Create a memorable, interactive experience that showcases your brand and solutions in a unique format.
              </p>

              <div className="space-y-3 mb-8 flex-grow">
                {experienceFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="glass-card p-4 bg-accent/10 border-accent/30 rounded-lg">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  <strong className="text-accent">Perfect for:</strong> Immersive brand experiences, creative demonstrations, and building deeper connections beyond traditional presentations.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={300}>
          <div className="glass-card p-8 rounded-lg mb-12">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4 text-center">Why Add These to Your Partnership?</h3>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-4xl font-heading font-bold text-accent mb-2">5-8</div>
                <p className="text-muted-foreground">Senior Leaders</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-heading font-bold text-accent mb-2">60min</div>
                <p className="text-muted-foreground">Dedicated Time</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-heading font-bold text-accent mb-2">100%</div>
                <p className="text-muted-foreground">Qualified Audience</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <NextButton href="/timeline" label="Next: Timeline & Deadlines" />
        </AnimatedSection>
      </div>
    </div>
  );
}
