import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container max-w-2xl text-center">
        <div className="glass-card p-12 rounded-lg">
          <h1 className="text-9xl font-heading font-bold text-accent mb-4">404</h1>
          <h2 className="text-3xl font-heading font-bold text-foreground mb-4">Page Not Found</h2>
          <p className="text-lg text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2">
              <Home className="w-5 h-5" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
