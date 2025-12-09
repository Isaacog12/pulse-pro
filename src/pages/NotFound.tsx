import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { GlintLogo } from "@/components/pulse/GlintLogo"; // Updated Logo Import
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 text-center space-y-6 p-8 glass rounded-3xl border border-white/10 shadow-2xl max-w-md w-full mx-4">
        
        <div className="flex justify-center mb-4">
          <GlintLogo size="lg" animated />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Page Not Found
          </h1>
          <p className="text-muted-foreground">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="pt-4">
          <Button asChild className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <a href="/">Return to Home</a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/50 pt-4 font-mono">
          Error 404 • Path: {location.pathname}
        </p>
      </div>
    </div>
  );
};

export default NotFound;