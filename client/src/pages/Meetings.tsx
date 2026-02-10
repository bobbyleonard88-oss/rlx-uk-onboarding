/**
 * RLX Onboarding - 1:1 Meetings Details Page
 * Design: Luxury Editorial
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Target, TrendingUp, Briefcase, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Meetings() {
  const dataPoints = [
    "Active project timelines and priorities",
    "Solution areas under evaluation",
    "Budget size and sign off",
    "Technology stack and integrations",
    "Current pain points and buying triggers",
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-5xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">1:1 Meetings - Key Details</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
          </div>
        </AnimatedSection>

        {/* Meeting Length */}
        <AnimatedSection delay={100}>
          <div className="glass-card p-8 md:p-12 rounded-lg mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                <Clock className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h2 className="text-3xl font-display font-bold text-foreground">Meeting Length</h2>
                <p className="text-xl text-accent font-heading">20 minutes</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Delegate Detail */}
        <AnimatedSection delay={200}>
          <div className="glass-card p-8 md:p-12 rounded-lg mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                <FileText className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">Delegate Detail</h2>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              Each meeting is backed by a comprehensive profile outlining organisational challenges, budget cycle, 
              solution priorities, and purchasing intent.
            </p>
            <p className="text-lg text-foreground/90 leading-relaxed">
              All delegate attendance is by <strong className="text-accent">application only</strong>. Criteria and data points 
              captured at application include:
            </p>
          </div>
        </AnimatedSection>

        {/* Data Points */}
        <AnimatedSection delay={300}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {dataPoints.map((point, index) => (
              <div key={index} className="glass-card p-6 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-foreground/90 leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Qualification */}
        <AnimatedSection delay={400}>
          <div className="glass-card p-8 bg-accent/10 border-accent/30 rounded-lg mb-12">
            <div className="flex items-center gap-4 mb-4">
              <Target className="w-8 h-8 text-accent" />
              <h3 className="text-2xl font-display font-bold text-foreground">Quality Assurance</h3>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed">
              Only <strong className="text-accent">fully qualified senior leaders</strong> will be approved to attend. 
              This ensures every meeting is a high-value opportunity aligned with your solution offerings and business objectives.
            </p>
          </div>
        </AnimatedSection>

        {/* Value Proposition */}
        <AnimatedSection delay={500}>
          <div className="glass-card p-8 md:p-12 rounded-lg mb-12">
            <h2 className="text-3xl font-display font-bold text-foreground mb-6 text-center">
              The RLX Meeting Advantage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-accent/30">
                  <Target className="w-8 h-8 text-accent" />
                </div>
                <h4 className="font-heading font-bold text-foreground mb-2">Pre-Qualified</h4>
                <p className="text-sm text-muted-foreground">
                  Every attendee is vetted for active buying intent
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-accent/30">
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
                <h4 className="font-heading font-bold text-foreground mb-2">High-Intent</h4>
                <p className="text-sm text-muted-foreground">
                  Move directly from introduction to partnership conversation
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-accent/30">
                  <Briefcase className="w-8 h-8 text-accent" />
                </div>
                <h4 className="font-heading font-bold text-foreground mb-2">Pipeline Impact</h4>
                <p className="text-sm text-muted-foreground">
                  Verifiable commercial outcomes for your sales pipeline
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={600}>
          <div className="flex justify-center gap-4">
            <Link href="/intake">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
                Complete Intake Form
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/prioritize">
              <Button size="lg" variant="outline" className="font-heading border-accent/30 hover:border-accent hover:bg-accent/10">
                Prioritize Meetings
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
