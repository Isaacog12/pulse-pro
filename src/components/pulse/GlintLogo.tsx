import { cn } from "@/lib/utils";

interface GlintLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}

export const GlintLogo = ({ size = "md", animated = false, className }: GlintLogoProps) => {
  
  // Size mapping
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      
      {/* 1. The Glow (Background) */}
      <div className={cn(
        "absolute inset-0 bg-primary/20 blur-xl rounded-full",
        animated && "animate-pulse"
      )} />

      {/* 2. The Glint Icon (SVG) */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("relative z-10 w-full h-full drop-shadow-lg", animated && "animate-[spin_8s_linear_infinite]")}
      >
        <defs>
          <linearGradient id="glint-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />   {/* Cyan */}
            <stop offset="50%" stopColor="#fff" />                 {/* White center for shine */}
            <stop offset="100%" stopColor="hsl(var(--accent))" />  {/* Fuchsia/Purple */}
          </linearGradient>
        </defs>

        {/* The 4-Pointed Star (The Glint) */}
        <path
          d="M50 0 
             C55 35, 65 45, 100 50 
             C65 55, 55 65, 50 100 
             C45 65, 35 55, 0 50 
             C35 45, 45 35, 50 0 Z"
          fill="url(#glint-gradient)"
        />
        
        {/* Optional: Smaller cross glint for detail */}
        <path
          d="M50 25 L53 47 L75 50 L53 53 L50 75 L47 53 L25 50 L47 47 Z"
          fill="white"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};