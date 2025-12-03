import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface PulseLogoProps {
  size?: "sm" | "lg";
  animated?: boolean;
  className?: string;
}

export const PulseLogo = ({ size = "lg", animated = false, className }: PulseLogoProps) => {
  const dim = size === "lg" ? "w-24 h-24" : "w-10 h-10";
  const iconSize = size === "lg" ? 48 : 20;

  return (
    <div className={cn("relative flex items-center justify-center", dim, className)}>
      {/* Glow effect */}
      <div 
        className={cn(
          "absolute inset-0 bg-primary rounded-full blur-2xl opacity-30",
          animated && "animate-pulse"
        )}
      />
      
      {/* Main logo container */}
      <div className="relative z-10 w-full h-full bg-gradient-to-tr from-background to-card rounded-2xl flex items-center justify-center border border-border/50 shadow-[0_0_30px_hsl(var(--primary)/0.3)] overflow-hidden">
        {/* Inner gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-50" />
        
        {/* Icon */}
        <Activity 
          size={iconSize} 
          className="text-primary relative z-20 drop-shadow-[0_0_10px_hsl(var(--primary)/0.8)]" 
        />
        
        {/* Shine effect */}
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-foreground/20 rotate-45 blur-lg transform transition-transform group-hover:translate-x-20" />
      </div>
      
      {/* Status indicator */}
      <div 
        className={cn(
          "absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-background z-30 shadow-[0_0_15px_hsl(var(--accent)/1)]",
          animated && "animate-ping"
        )}
        style={{ animationDuration: "3s" }}
      />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-background z-30" />
    </div>
  );
};
