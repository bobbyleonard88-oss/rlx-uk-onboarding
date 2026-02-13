/**
 * RLX Onboarding Journey - Home/Hero Page
 * Design: Luxury Editorial - Playfair Display headlines, Montserrat structure, Crimson Pro body
 * Color: Deep navy (#2C3E5A) to near-black (#1a1a2e) gradient, purple (#7B4B94) accents, gold (#d4af37) highlights
 */

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import AnimatedSection from "@/components/AnimatedSection";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection>
              <div className="flex justify-center mb-8">
                <img 
                  src="/rlx-logo.png" 
                  alt="RLX Logo" 
                  className="h-32 w-auto object-contain"
                />
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-6">
                Resourcing Leaders Exchange
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
                An invitation-only, five-star leadership exchange event meticulously crafted to remove the noise 
                and inefficiency of traditional B2B events.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <div className="flex justify-center items-center mb-12">
                <Link href="/overview">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2 px-8">
                    Begin Your Journey
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <div className="gold-divider max-w-md mx-auto mb-12"></div>
            </AnimatedSection>

            <AnimatedSection delay={500}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="glass-card p-6 rounded-lg">
                  <div className="text-5xl font-heading font-bold text-accent mb-2">40+</div>
                  <div className="text-sm font-heading text-muted-foreground uppercase tracking-wider">Senior Leaders</div>
                </div>
                <div className="glass-card p-6 rounded-lg">
                  <div className="text-5xl font-heading font-bold text-accent mb-2">2</div>
                  <div className="text-sm font-heading text-muted-foreground uppercase tracking-wider">Days of Excellence</div>
                </div>
                <div className="glass-card p-6 rounded-lg">
                  <div className="text-5xl font-heading font-bold text-accent mb-2">1:1</div>
                  <div className="text-sm font-heading text-muted-foreground uppercase tracking-wider">Curated Meetings</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>


      </section>


    </div>
  );
}
