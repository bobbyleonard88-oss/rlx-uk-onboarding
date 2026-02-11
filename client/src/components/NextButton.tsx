import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface NextButtonProps {
  href: string;
  label: string;
}

export default function NextButton({ href, label }: NextButtonProps) {
  return (
    <div className="flex justify-center mt-12">
      <Link href={href}>
        <Button 
          size="lg" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2 px-8"
        >
          {label}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </Link>
    </div>
  );
}
