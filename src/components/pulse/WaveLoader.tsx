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
// 2. Multi-Color Pulse Loader (Updated!)
// ==========================================
export const PulseLoader = ({ className }: { className?: string }) => {
  // Define colors for each dot
  const dots = [
    { color: "bg-cyan-400", shadow: "shadow-cyan-400/50", delay: 0 },
    { color: "bg-blue-500", shadow: "shadow-blue-500/50", delay: 150 },
    { color: "bg-purple-500", shadow: "shadow-purple-500/50", delay: 300 },
  ];

  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {dots.map((dot, index) => (
        <div
          key={index}
          className={cn(
            "w-2.5 h-2.5 rounded-full animate-bounce shadow-[0_0_10px]",
            dot.color,  // The background color
            dot.shadow  // The glowing shadow color
          )}
          style={{
            animationDuration: "1s",
            animationDelay: `${dot.delay}ms`,
            animationFillMode: "both",
          }}
        />
      ))}
    </div>
  );
};

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