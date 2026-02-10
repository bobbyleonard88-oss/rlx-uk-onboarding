/**
 * RLX Onboarding - Meet The Team Page
 */

import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface TeamMember {
  name: string;
  role: string;
  email?: string;
  photo?: string;
}

export default function Team() {
  const commercialTeam: TeamMember[] = [
    { name: "Denise Stupart", role: "Commercial Partner", photo: "/denise.png" },
    { name: "Lorna Butler", role: "Commercial Partner", photo: "/lorna.png" },
    { name: "James Morris", role: "Commercial Partner", photo: "/james.png" },
    { name: "Lauren Windsor", role: "Marketing Executive" },
    { name: "Will Barritt", role: "RL Community Manager" },
    { name: "Megan Thomson", role: "RL Global Events Manager", photo: "/megan.png" },
  ];

  const csTeam: TeamMember[] = [
    { name: "Natalija Tosheva", role: "CS Team Lead", email: "natalija@recruitmentevents.co", photo: "/natalija.png" },
    { name: "Nino Bogevski", role: "CS Admin", email: "nino@recruitmentevents.co", photo: "/nino.png" },
    { name: "Stefan Davidovski", role: "CS Admin", email: "stefan@recruitmentevents.co", photo: "/stefan.png" },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-6xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Meet The Team</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Your dedicated team is here to ensure a seamless and exceptional experience throughout your Resourcing Leaders Exchange journey.
            </p>
          </div>
        </AnimatedSection>

        {/* Commercial Team */}
        <AnimatedSection delay={100}>
          <div className="mb-16">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-8">Commercial & Events Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {commercialTeam.map((member, index) => (
                <div key={index} className="glass-card p-6 rounded-lg hover:border-accent/50 transition-all duration-300">
                  {member.photo ? (
                    <img 
                      src={member.photo} 
                      alt={member.name}
                      className="w-24 h-24 rounded-full object-cover mb-4 mx-auto border-2 border-accent/30"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-4 border-2 border-accent/30 mx-auto">
                      <span className="text-2xl font-heading font-bold text-foreground">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-heading font-bold text-foreground mb-1 text-center">{member.name}</h3>
                  <p className="text-muted-foreground text-center text-sm">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* CS Team */}
        <AnimatedSection delay={200}>
          <div className="mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-8">Customer Success Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {csTeam.map((member, index) => (
                <div key={index} className="glass-card p-6 rounded-lg hover:border-accent/50 transition-all duration-300">
                  <img 
                    src={member.photo} 
                    alt={member.name}
                    className="w-24 h-24 rounded-full object-cover mb-4 mx-auto border-2 border-accent/30"
                  />
                  <h3 className="text-xl font-heading font-bold text-foreground mb-1 text-center">{member.name}</h3>
                  <p className="text-muted-foreground mb-3 text-center text-sm">{member.role}</p>
                  {member.email && (
                    <a 
                      href={`mailto:${member.email}`}
                      className="flex items-center justify-center gap-2 text-accent hover:text-accent/80 transition-colors text-sm font-heading"
                    >
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={300}>
          <div className="glass-card p-8 bg-accent/10 border-accent/30 rounded-lg mb-12">
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              Our team is committed to delivering an exceptional experience. Don't hesitate to reach out 
              to your Customer Success contacts for any questions or support throughout your partnership.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={400}>
          <div className="flex justify-center gap-4">
            <Link href="/addons">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
                View Add-Ons
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/intake">
              <Button size="lg" variant="outline" className="font-heading border-accent/30 hover:border-accent hover:bg-accent/10">
                Complete Intake Form
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
