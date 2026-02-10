/**
 * RLX Onboarding - Rules of Engagement Page
 * Design: Luxury Editorial
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Rules() {
  const rules = [
    "20-meeting package partners can bring 2 attendees",
    "12-meeting package partners can bring 1 attendee",
    "Hotel allocation is provided - 2 nights",
    "No vendor guest speakers will be permitted",
    "Guest speakers must be signed off by The Recruitment Events Co.",
    "Guest speakers will not count towards your attendee allocation",
    "Attendee representatives must be in leadership positions unless signed off by The Recruitment Events Co.",
    "No delegate list will be shared pre-event",
    "Session content will be reviewed by The Recruitment Events Co.",
    "Failure to hit deadlines will result in missed marketing opportunities, potentially less relevancy of attendees",
    "No contact details are provided unless specifically requested (however, LinkedIn profiles will be)",
    "Contacts data (connection requests) won't be shared until you complete the Vendor Feedback survey",
    "If you requested to connect with a delegate and you didn't speak with them on the day, then we will not facilitate any further introductions",
    "You will be placed on a table with another sponsor (who is not a direct competitor)",
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
          <div className="glass-card p-8 bg-accent/10 border-accent/30 rounded-lg mb-12">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4">Important Note</h3>
            <p className="text-lg text-foreground/90 leading-relaxed">
              These guidelines are designed to maintain the premium, focused nature of RLX and ensure maximum value 
              for all partners and attendees. Adherence to deadlines and requirements is essential for optimal outcomes.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={300}>
          <div className="flex justify-center gap-4">
            <Link href="/team">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
                Meet The Team
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
