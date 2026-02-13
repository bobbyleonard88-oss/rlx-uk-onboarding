/**
 * RLX Onboarding - Timeline & Deadlines Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Calendar, Clock, MapPin, CheckCircle2 } from "lucide-react";

interface Deadline {
  task: string;
  date: string;
  important?: boolean;
}

export default function Timeline() {
  const deadlines: Deadline[] = [
    { task: "Partner Intake Form", date: "24th February", important: true },
    { task: "Dietary Requirements Form", date: "24th February", important: true },
    { task: "Registration list shared with sponsors", date: "18th February (5 weeks before)", important: false },
    { task: "Meeting prioritisation completed", date: "25th February (4 weeks before)", important: false },
    { task: "Confirmed meeting schedules shared", date: "11th March (2 weeks before)", important: false },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-5xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Timeline & Deadlines</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Key dates and deadlines for the Resourcing Leaders Exchange UK event. Please ensure all submissions 
              are completed by the specified dates to maximize your event experience.
            </p>
          </div>
        </AnimatedSection>

        {/* Event Details */}
        <AnimatedSection delay={100}>
          <div className="glass-card p-8 md:p-12 rounded-lg mb-12 bg-gradient-to-br from-primary/20 to-accent/20 border-accent/30">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-heading font-bold text-foreground mb-2">RLUK Exchange</h2>
              <div className="gold-divider max-w-xs mx-auto my-6"></div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4 border-2 border-accent/30">
                  <Calendar className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-foreground mb-2">24-26th March</h3>
                <p className="text-muted-foreground text-sm">
                  Arrival evening of 24 March<br />
                  Event days 25-26 March
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4 border-2 border-accent/30">
                  <MapPin className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-heading font-bold text-foreground mb-2">The Grove</h3>
                <p className="text-muted-foreground text-sm">
                  Hertfordshire, United Kingdom
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4 border-2 border-accent/30">
                  <Clock className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-heading font-bold text-foreground mb-2">2 Days</h3>
                <p className="text-muted-foreground text-sm">
                  Of curated meetings<br />
                  and networking
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Key Deadlines */}
        <AnimatedSection delay={200}>
          <div className="mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-8 text-center">Key Deadlines</h2>
            
            <div className="space-y-4">
              {deadlines.map((deadline, index) => (
                <div 
                  key={index} 
                  className={`glass-card p-6 rounded-lg flex items-center justify-between hover:border-accent/50 transition-all duration-300 ${
                    deadline.important ? 'border-accent/50 bg-accent/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      deadline.important ? 'bg-accent/20 border-2 border-accent/40' : 'bg-primary/20 border-2 border-primary/30'
                    }`}>
                      <CheckCircle2 className={`w-6 h-6 ${deadline.important ? 'text-accent' : 'text-primary'}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-semibold text-foreground">{deadline.task}</h3>
                      {deadline.important && (
                        <span className="text-xs text-accent font-heading font-semibold uppercase tracking-wide">Required</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-heading font-bold text-accent">{deadline.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Important Notes */}
        <AnimatedSection delay={300}>
          <div className="glass-card p-8 bg-accent/10 border-accent/30 rounded-lg mb-12">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-accent" />
              Important Notes
            </h3>
            <ul className="space-y-3 text-foreground/90 leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Failure to hit deadlines will result in missed marketing opportunities and potentially less relevancy of attendees</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>The registration list will be shared with sponsors 5 weeks before the event</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Meeting prioritization should be completed 4 weeks before the event</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Confirmed meeting schedules will be shared 2 weeks before the event</span>
              </li>
            </ul>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <NextButton href="/addons" label="Next: Add-Ons" />
        </AnimatedSection>
      </div>
    </div>
  );
}
