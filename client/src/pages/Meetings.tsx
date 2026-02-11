/**
 * RLX Onboarding - 1:1 Meetings Details Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Clock, FileText, Target, CheckCircle2 } from "lucide-react";

export default function Meetings() {
  const projectDetails = [
    "Active project timelines and priorities",
    "Solution areas under evaluation",
    "Budget size and sign off",
    "Technology stack and integrations",
  ];

  const painPoints = [
    "Current pain points in their TA operations",
    "Operational challenges and bottlenecks",
    "Resource constraints and gaps",
  ];

  const buyingTriggers = [
    "Key buying triggers and decision drivers",
    "Timeline for solution implementation",
    "Stakeholder involvement in decisions",
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
                <h2 className="text-3xl font-heading font-bold text-foreground">Meeting Length</h2>
                <p className="text-xl text-accent font-heading">30 minutes</p>
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
              <h2 className="text-3xl font-heading font-bold text-foreground">Delegate Detail</h2>
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

        {/* Project Details */}
        <AnimatedSection delay={300}>
          <div className="glass-card p-8 rounded-lg mb-8">
            <h3 className="text-xl font-heading font-semibold text-accent mb-4">Project & Solution Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectDetails.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90 leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Pain Points and Buying Triggers */}
        <AnimatedSection delay={400}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="glass-card p-8 rounded-lg">
              <h3 className="text-xl font-heading font-semibold text-accent mb-4">Pain Points</h3>
              <div className="space-y-3">
                {painPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90 leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8 rounded-lg">
              <h3 className="text-xl font-heading font-semibold text-accent mb-4">Buying Triggers</h3>
              <div className="space-y-3">
                {buyingTriggers.map((trigger, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90 leading-relaxed">{trigger}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Qualification */}
        <AnimatedSection delay={500}>
          <div className="glass-card p-8 bg-accent/10 border-accent/30 rounded-lg mb-12">
            <div className="flex items-center gap-4 mb-4">
              <Target className="w-8 h-8 text-accent" />
              <h3 className="text-2xl font-heading font-bold text-foreground">Quality Assurance</h3>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed">
              Only <strong className="text-accent">fully qualified senior leaders</strong> will be approved to attend. 
              This ensures every meeting is a high-value opportunity aligned with your solution offerings and business objectives.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={600}>
          <NextButton href="/matchmaking" label="Next: Matchmaking Process" />
        </AnimatedSection>
      </div>
    </div>
  );
}
