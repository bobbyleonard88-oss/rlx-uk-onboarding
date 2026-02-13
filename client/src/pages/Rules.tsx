/**
 * RLX Onboarding - Rules of Engagement Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { CheckCircle2 } from "lucide-react";


export default function Rules() {
  const rules = [
    "20-meeting package partners can bring 2 attendees",
    "12-meeting package partners can bring 1 attendee",
    "Hotel allocation is provided - 2 nights",
    "Attendee representatives must be in leadership positions unless signed off by The Recruitment Events Co.",
    "Partners will receive the delegate list to prioritise meeting preferences. Final schedules use a blend of partner priorities, current audience needs, and attendee vendor rankings. Meetings are guaranteed but there's no guarantee we'll match your top 12/20.",
    "Failure to hit deadlines will result in potential mismatch of meetings, not attendees",
    "No contact details are provided unless specifically requested (however, LinkedIn profiles will be)",
    "Follow-ups must be made during the meetings. No contact details will be shared.",
    "Dress Code: Smart casual during the day, with a black-tie dress code for the gala dinner",
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-4xl">
        <AnimatedSection>
          <div className="mb-12">
            <h1 className="text-foreground mb-6">Rules of Engagement</h1>
            <div className="gold-divider mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed">
              To ensure the highest quality experience for all participants, please review and adhere to the following guidelines.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="glass-card p-8 md:p-12 rounded-lg mb-12">
            <ul className="space-y-5">
              {rules.map((rule, index) => (
                <li key={index} className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-lg text-foreground/90 leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <div className="glass-card p-8 bg-accent/10 border-accent/30 rounded-lg mb-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4">Important Note</h3>
            <p className="text-lg text-foreground/90 leading-relaxed">
              These guidelines are designed to maintain the premium, focused nature of the Resourcing Leaders Exchange and ensure maximum value 
              for all partners and attendees. Adherence to deadlines and requirements is essential for optimal outcomes.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={250}>
          <div className="glass-card p-6 bg-primary/10 border-primary/30 rounded-lg mb-12">
            <p className="text-sm text-foreground/80 leading-relaxed italic text-center">
              Meetings are guaranteed but there's no guarantee we'll match your top 12/20.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={300}>
          <NextButton href="/timeline" label="Next: Timeline & Deadlines" />
        </AnimatedSection>
      </div>
    </div>
  );
}
