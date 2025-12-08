import { cn } from "@/lib/utils";

// ==========================================
// 1. Sonic Wave Loader (Audio/Voice Vibe)
// ==========================================
export const WaveLoader = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-1 h-4", className)}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={cn(
          "w-1 rounded-full bg-gradient-to-t from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
          "animate-[wave_1s_ease-in-out_infinite]"
        )}
        style={{
          height: "100%",
          animationDelay: `${i * 0.1}s`,
          // We define keyframes inline or in global css, but for tailwind arbitrary:
          // Ideally 'wave' is defined in tailwind.config. 
          // Here is a workaround using style for height modulation if config isn't available,
          // OR we use a simple scaleY animation.
          animationName: "wave-stretch", 
        }}
      />
    ))}
    <style>
      {`
        @keyframes wave-stretch {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}
    </style>
  </div>
);

// ==========================================
// 2. Bouncing Pulse Loader (Typing/Waiting Vibe)
// ==========================================
export const PulseLoader = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center gap-1.5", className)}>
    {[0, 150, 300].map((delay) => (
      <div
        key={delay}
        className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-[0_0_10px_currentColor]"
        style={{ 
          animationDuration: "1s",
          animationDelay: `${delay}ms`,
          animationFillMode: "both"
        }}
      />
    ))}
  </div>
);

// ==========================================
// 3. Glass Spinner (System/Page Load Vibe)
// ==========================================
export const GlassSpinner = ({ size = 24 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center animate-spin"
    style={{ width: size, height: size }}
  >
    {/* Outer blurred ring */}
    <div className="absolute inset-0 rounded-full border-[3px] border-white/10 blur-[1px]" />
    
    {/* Inner sharp ring with gap */}
    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary/50 shadow-[0_0_10px_theme(colors.primary.DEFAULT)]" />
  </div>
);