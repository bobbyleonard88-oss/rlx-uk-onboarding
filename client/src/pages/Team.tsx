/**
 * RLX Onboarding - Meet The Team Page
 * Design: Luxury Editorial
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Team() {
  const commercialTeam = [
    { name: "Denise Stupart", role: "Commercial Partner" },
    { name: "Lorna Butler", role: "Commercial Partner" },
    { name: "James Morris", role: "Commercial Partner" },
    { name: "Lauren Windsor", role: "Marketing Executive" },
    { name: "Will Barritt", role: "RL Community Manager" },
    { name: "Megan Thomson", role: "RL Global Events Manager" },
  ];

  const csTeam = [
    { name: "Natalija Tosheva", role: "CS Team Lead", email: "natalija@recruitmentevents.co" },
    { name: "Nino Bogevski", role: "CS Admin", email: "nino@recruitmentevents.co" },
    { name: "Stefan Davidovski", role: "CS Admin", email: "stefan@recruitmentevents.co" },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-6xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Meet The Team</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Your dedicated RLX team is here to ensure a seamless and exceptional experience throughout your partnership journey.
            </p>
          </div>
        </AnimatedSection>

        {/* Commercial Team */}
        <AnimatedSection delay={100}>
          <div className="mb-16">
            <h2 className="text-3xl font-display font-bold text-foreground mb-8">Commercial & Events Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {commercialTeam.map((member, index) => (
                <div key={index} className="glass-card p-6 rounded-lg hover:border-accent/50 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 border border-accent/30">
                    <span className="text-2xl font-display font-bold text-accent">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-foreground mb-1">{member.name}</h3>
                  <p className="text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* CS Team */}
        <AnimatedSection delay={200}>
          <div className="mb-12">
            <h2 className="text-3xl font-display font-bold text-foreground mb-8">Customer Success Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {csTeam.map((member, index) => (
                <div key={index} className="glass-card p-6 rounded-lg hover:border-accent/50 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 border border-accent/30">
                    <span className="text-2xl font-display font-bold text-accent">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-foreground mb-1">{member.name}</h3>
                  <p className="text-muted-foreground mb-3">{member.role}</p>
                  <a 
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors text-sm font-heading"
                  >
                    <Mail className="w-4 h-4" />
                    {member.email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={300}>
          <div className="glass-card p-8 bg-accent/10 border-accent/30 rounded-lg mb-12">
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              Our team is committed to delivering an exceptional RLX experience. Don't hesitate to reach out 
              to your Customer Success contacts for any questions or support throughout your partnership.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <div className="flex justify-center gap-4">
            <Link href="/packages">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
                View Sponsorship Packages
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
