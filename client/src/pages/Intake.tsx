/**
 * RLX Onboarding - Intake Form Page
 * Design: Luxury Editorial
 * Integrates HubSpot form
 */

import { useEffect } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { FormInput } from "lucide-react";

declare global {
  interface Window {
    hbspt: any;
  }
}

export default function Intake() {
  useEffect(() => {
    // Load HubSpot forms script
    const script = document.createElement("script");
    script.src = "//js.hsforms.net/forms/embed/v2.js";
    script.charset = "utf-8";
    script.type = "text/javascript";
    script.async = true;
    
    script.onload = () => {
      if (window.hbspt) {
        window.hbspt.forms.create({
          portalId: "2813205",
          formId: "b1778d3a-4f75-41f1-b1cd-6019c4518c26",
          region: "na1",
          target: "#hubspot-form-container",
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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
              This information will be shared with relevant clients to facilitate meaningful connections.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="p-8 md:p-12 rounded-lg bg-white">
            {/* HubSpot form will be injected here */}
            <div id="hubspot-form-container" className="hubspot-form-wrapper"></div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <div className="mt-8 glass-card p-6 bg-accent/10 border-accent/30 rounded-lg">
            <p className="text-sm text-foreground/90 leading-relaxed text-center">
              <strong className="text-accent">Note:</strong> All information provided will be handled in accordance with our 
              data privacy policy and shared only with pre-qualified attendees to facilitate relevant business connections.
            </p>
          </div>
        </AnimatedSection>
      </div>

      <style>{`
        /* Style HubSpot form to match RLX theme */
        #hubspot-form-container .hs-form {
          font-family: 'Crimson Pro', serif;
        }
        
        #hubspot-form-container .hs-form label {
          color: oklch(0.2 0.015 240);
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        
        #hubspot-form-container .hs-form input[type="text"],
        #hubspot-form-container .hs-form input[type="email"],
        #hubspot-form-container .hs-form input[type="tel"],
        #hubspot-form-container .hs-form textarea,
        #hubspot-form-container .hs-form select {
          background: white;
          border: 1px solid oklch(0.8 0.01 240);
          border-radius: 0.5rem;
          color: oklch(0.2 0.015 240);
          padding: 0.75rem;
          width: 100%;
          font-family: 'Crimson Pro', serif;
          font-size: 1rem;
        }
        
        #hubspot-form-container .hs-form input[type="text"]:focus,
        #hubspot-form-container .hs-form input[type="email"]:focus,
        #hubspot-form-container .hs-form input[type="tel"]:focus,
        #hubspot-form-container .hs-form textarea:focus,
        #hubspot-form-container .hs-form select:focus {
          outline: none;
          border-color: oklch(0.75 0.15 85);
          box-shadow: 0 0 0 2px oklch(0.75 0.15 85 / 0.2);
        }
        
        #hubspot-form-container .hs-form .hs-button {
          background: oklch(0.45 0.12 290);
          color: oklch(0.98 0.01 290);
          border: none;
          border-radius: 0.5rem;
          padding: 0.75rem 2rem;
          font-family: 'Montserrat', sans-serif;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        #hubspot-form-container .hs-form .hs-button:hover {
          background: oklch(0.40 0.12 290);
        }
        
        #hubspot-form-container .hs-form .hs-error-msgs {
          color: oklch(0.577 0.245 27.325);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        
        #hubspot-form-container .hs-form .hs-form-field {
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}
