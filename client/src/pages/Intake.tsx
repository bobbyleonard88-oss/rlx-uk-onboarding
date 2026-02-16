/**
 * RLX Onboarding - Native Intake Form
 * Design: Luxury Editorial with RLX branding
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormInput, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const TECHNOLOGY_TYPES = [
  "Background Screening",
  "Applicant Tracking System (ATS)",
  "Assessment & Selection",
  "CRM (Marketing Automation)",
  "Diversity & Inclusion Solutions",
  "Early Careers Marketplace",
  "Embedded Talent Consultancy",
  "Employee Referral",
  "Employer Branding",
  "Global Mobility Solutions",
  "Talent Attraction Solutions",
  "Onboarding Technology",
  "Recruitment Process Outsourcing (RPO)",
  "Reference Checking",
  "Talent Analytics/Talent Mapping",
  "Tech Talent Marketplace",
  "Interviewing Platform",
  "Workforce Planning Solution",
  "AI & Automation",
  "Training & Development",
  "Candidate Experience",
];

const ORG_SIZES = [
  "1-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1,000 employees",
  "1,001-5,000 employees",
  "5,001-10,000 employees",
  "10,000+ employees",
];

export default function Intake() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  
  const { data: sponsor } = trpc.sponsor.getProfile.useQuery();
  const { data: existingIntake } = trpc.intake.getSubmission.useQuery();
  
  const submitIntake = trpc.intake.submit.useMutation({
    onSuccess: () => {
      toast.success("Intake form submitted successfully!");
      navigate("/prioritize");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit form");
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    companyName: existingIntake?.companyName || "",
    technologyType: existingIntake?.technologyType || "",
    companyBoilerplate: existingIntake?.companyBoilerplate || "",
    keyChallenges: existingIntake?.keyChallenges || "",
    targetOrgSize: existingIntake?.targetOrgSize || "",
    firstName: existingIntake?.firstName || "",
    lastName: existingIntake?.lastName || "",
    email: existingIntake?.email || user?.email || "",
    jobTitle: existingIntake?.jobTitle || "",
    linkedinUrl: existingIntake?.linkedinUrl || "",
    meetingPackage: (existingIntake?.meetingPackage as "12" | "20") || "12",
    // Second rep (optional)
    secondRepName: existingIntake?.secondRepName || "",
    secondRepEmail: existingIntake?.secondRepEmail || "",
    secondRepJobTitle: existingIntake?.secondRepJobTitle || "",
    secondRepLinkedinUrl: existingIntake?.secondRepLinkedinUrl || "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validation
    if (!formData.companyName || !formData.technologyType || !formData.companyBoilerplate ||
        !formData.keyChallenges || !formData.targetOrgSize || !formData.firstName ||
        !formData.lastName || !formData.email || !formData.jobTitle || !formData.linkedinUrl) {
      toast.error("Please fill in all required fields");
      return;
    }

    // TODO: Upload logo to S3 if provided
    let logoUrl = "";
    if (logoFile) {
      // For now, just store filename
      logoUrl = logoFile.name;
    }

    submitIntake.mutate({
      ...formData,
      companyLogoUrl: logoUrl,
    });
  }

  const showSecondRep = formData.meetingPackage === "20";

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-4xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center border border-accent/30">
                <FormInput className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-foreground">Partner Intake Form</h1>
            </div>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Please complete this intake form to help us understand your organization and partnership goals. 
              This information will be shared with relevant delegates to facilitate meaningful connections.
            </p>
          </div>
        </AnimatedSection>

        <form onSubmit={handleSubmit}>
          {/* Company Information Section */}
          <AnimatedSection delay={100}>
            <div className="glass-card p-8 mb-8">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <span className="text-accent font-bold">1</span>
                </div>
                Company Information
              </h2>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    placeholder="Your company name"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="technologyType">Technology Type *</Label>
                  <Select
                    value={formData.technologyType}
                    onValueChange={(value) => handleChange("technologyType", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Please select one category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TECHNOLOGY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="logo">Company Logo * (Transparent Background)</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    HD png logo (svg or eps if available)
                  </p>
                  <div className="relative">
                    <Input
                      id="logo"
                      type="file"
                      accept=".png,.svg,.eps"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="mt-2"
                    />
                    {logoFile && (
                      <p className="text-sm text-accent mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {logoFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="boilerplate">Company Boilerplate *</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    A short, standardised description of your company, including mission, core services, and key details. 
                    This will be used in event and marketing materials. Max 200 words.
                  </p>
                  <Textarea
                    id="boilerplate"
                    value={formData.companyBoilerplate}
                    onChange={(e) => handleChange("companyBoilerplate", e.target.value)}
                    placeholder="Tell us about your company..."
                    rows={5}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="challenges">Key Challenges Your Solution Solves *</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    Please identify specific pain points you address, such as fragmented tech stacks, 
                    slow time-to-hire or low hiring manager adoption, etc...
                  </p>
                  <Textarea
                    id="challenges"
                    value={formData.keyChallenges}
                    onChange={(e) => handleChange("keyChallenges", e.target.value)}
                    placeholder="Describe the key challenges you solve..."
                    rows={4}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="orgSize">What's the org size bracket for your key ICP? *</Label>
                  <Select
                    value={formData.targetOrgSize}
                    onValueChange={(value) => handleChange("targetOrgSize", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select organization size" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="meetingPackage">Meeting Package *</Label>
                  <Select
                    value={formData.meetingPackage}
                    onValueChange={(value) => handleChange("meetingPackage", value as "12" | "20")}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 Meetings Package</SelectItem>
                      <SelectItem value="20">20 Meetings Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Primary Representative Section */}
          <AnimatedSection delay={200}>
            <div className="glass-card p-8 mb-8">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <span className="text-accent font-bold">2</span>
                </div>
                Your Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    placeholder="John"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    placeholder="Doe"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="john.doe@company.com"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => handleChange("jobTitle", e.target.value)}
                    placeholder="VP of Sales"
                    required
                    className="mt-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL *</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleChange("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                    required
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Second Representative Section (only for 20-meeting package) */}
          {showSecondRep && (
            <AnimatedSection delay={300}>
              <div className="glass-card p-8 mb-8 border-accent/30">
                <h2 className="text-2xl font-heading font-bold text-foreground mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent font-bold">3</span>
                  </div>
                  Second Representative Information
                  <span className="text-sm text-muted-foreground font-normal ml-auto">
                    (20-Meeting Package)
                  </span>
                </h2>

                <p className="text-muted-foreground mb-6">
                  Please add Name, Email Address, Job Title & LinkedIn URL for your 2nd sponsor representative.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor="secondRepName">Full Name</Label>
                    <Input
                      id="secondRepName"
                      value={formData.secondRepName}
                      onChange={(e) => handleChange("secondRepName", e.target.value)}
                      placeholder="Jane Smith"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="secondRepEmail">Email Address</Label>
                    <Input
                      id="secondRepEmail"
                      type="email"
                      value={formData.secondRepEmail}
                      onChange={(e) => handleChange("secondRepEmail", e.target.value)}
                      placeholder="jane.smith@company.com"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="secondRepJobTitle">Job Title</Label>
                    <Input
                      id="secondRepJobTitle"
                      value={formData.secondRepJobTitle}
                      onChange={(e) => handleChange("secondRepJobTitle", e.target.value)}
                      placeholder="Director of Marketing"
                      className="mt-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="secondRepLinkedinUrl">LinkedIn URL</Label>
                    <Input
                      id="secondRepLinkedinUrl"
                      type="url"
                      value={formData.secondRepLinkedinUrl}
                      onChange={(e) => handleChange("secondRepLinkedinUrl", e.target.value)}
                      placeholder="https://linkedin.com/in/janesmith"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Submit Section */}
          <AnimatedSection delay={400}>
            <div className="glass-card p-6 bg-accent/10 border-accent/30 rounded-lg mb-8">
              <p className="text-sm text-foreground/90 leading-relaxed text-center">
                <strong className="text-accent">Note:</strong> All information provided will be handled in accordance with our 
                data privacy policy and shared only with pre-qualified attendees to facilitate relevant business connections.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={submitIntake.isPending}
                className="px-12"
              >
                {submitIntake.isPending ? "Submitting..." : "Submit & Continue"}
              </Button>
            </div>
          </AnimatedSection>
        </form>
      </div>
    </div>
  );
}
