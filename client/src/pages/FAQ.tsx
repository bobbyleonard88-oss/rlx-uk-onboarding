/**
 * RLX Onboarding - FAQ Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does the matchmaking process work?",
    answer: "We use a three-part model: delegates select 4-8 partners based on their priorities, you rank all delegates by ICP fit, and RLX curates final matches using AI-assisted matching with human oversight. This ensures balanced, high-quality pairings across all participants."
  },
  {
    question: "Are my rankings guaranteed to result in meetings?",
    answer: "No. Rankings are preference-led, not preference-guaranteed. RLX maintains final decision authority to ensure fair distribution, meeting quality, and commercial relevance for all participants. This protects your investment and meeting outcomes."
  },
  {
    question: "When will I receive my final meeting schedule?",
    answer: "Final meeting lists with comprehensive delegate briefing packs are delivered 10 days before the event. This gives you time to prepare for meaningful conversations with full context on each delegate's priorities, pain points, and buying stage."
  },
  {
    question: "How many meetings should I expect?",
    answer: "Partners receive 12-20 curated meetings spread across two event days. Each meeting is 30 minutes, providing approximately 6 hours of total meeting time structured around content sessions, roundtables, and networking opportunities."
  },
  {
    question: "What information do I receive about each delegate before meetings?",
    answer: "Each briefing includes: name, role, and company; region and hiring volume; decision level and budget authority; active projects and buying stage; pain points and current tech stack; meeting objectives and commercial drivers. This depth of preparation is central to the RLX value proposition."
  },
  {
    question: "When is the deadline to submit my delegate rankings?",
    answer: "Partner rankings must be completed by 24th February 2026. Missing this deadline will impact the quality of your matches and may result in fewer strategically aligned meetings."
  },
  {
    question: "What is the event format?",
    answer: "The Resourcing Leaders Exchange runs 24-26th March 2026 at The Grove, Hertfordshire. Arrival evening is 24th March, with event days on 25-26th March. The format includes structured 1:1 meetings, content sessions, roundtables, networking, and a black-tie gala dinner."
  },
  {
    question: "What is the dress code?",
    answer: "Smart casual during the day, with a black-tie dress code for the gala dinner."
  },
  {
    question: "Will I receive delegate contact details before the event?",
    answer: "No contact details are provided unless specifically requested. However, LinkedIn profiles will be included in your briefing packs. Full contact data (connection requests) won't be shared until you complete the Vendor Feedback survey after the event."
  },
  {
    question: "Can I bring guest speakers?",
    answer: "No guest speakers are permitted at this event. The focus is on curated 1:1 meetings and structured content sessions designed to facilitate meaningful partnerships."
  },
  {
    question: "What are the add-on opportunities?",
    answer: "We offer two add-on experiences at £3,000 each (1-hour sessions with 5-8 leaders): Workshop - interactive learning session focused on a specific topic; Experience - immersive activity designed to build relationships and demonstrate thought leadership."
  },
  {
    question: "What happens if I miss a deadline?",
    answer: "Missing deadlines will result in missed marketing opportunities and potentially less relevancy of attendees matched to you. Timely submissions are essential to the matchmaking process and your event ROI."
  },
  {
    question: "Can I change my meeting schedule after it's finalized?",
    answer: "Changes require internal RLX approval after final lists are released. We maintain strict governance to protect the integrity of the matchmaking process and ensure fairness for all participants."
  },
  {
    question: "How is RLX different from traditional conferences?",
    answer: "RLX is an invitation-only, five-star leadership exchange event meticulously crafted to remove the noise and inefficiency of traditional B2B events. We deliver pre-qualified, high-intent meetings with comprehensive briefings, ensuring every conversation has commercial potential."
  },
  {
    question: "Who do I contact if I have questions?",
    answer: "Reach out to the Client Success Team at clientsuccess@recruitmentevents.co for any questions about the onboarding process, matchmaking, or event logistics."
  }
];

function FAQAccordion({ faq }: { faq: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-card rounded-lg border border-border/30 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors"
      >
        <span className="font-heading font-semibold text-foreground pr-4">
          {faq.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-accent flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      
      {isOpen && (
        <div className="px-6 py-4 border-t border-border/30 bg-secondary/10">
          <p className="text-foreground/90 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-4xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-accent/30 mb-6">
              <HelpCircle className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-foreground mb-6">Frequently Asked Questions</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Everything you need to know about the Resourcing Leaders Exchange onboarding process and event experience
            </p>
          </div>
        </AnimatedSection>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <AnimatedSection key={index} delay={index * 50}>
              <FAQAccordion faq={faq} />
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={800}>
          <div className="mt-12 glass-card p-8 rounded-lg border-accent/30 text-center">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4">
              Still have questions?
            </h3>
            <p className="text-foreground/90 mb-6">
              Our Client Success Team is here to help you get the most out of your RLX experience.
            </p>
            <a
              href="mailto:clientsuccess@recruitmentevents.co"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Contact Client Success
            </a>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
