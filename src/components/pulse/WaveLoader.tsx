export const WaveLoader = () => (
  <div className="flex items-center space-x-1 h-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="w-1 bg-gradient-to-t from-primary to-accent rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--accent)/0.6)]"
        style={{
          height: `${20 + Math.random() * 80}%`,
          animationDelay: `${i * 0.1}s`,
          animationDuration: "0.6s",
        }}
      />
    ))}
  </div>
);

export const PulseLoader = () => (
  <div className="flex items-center justify-center space-x-2 animate-pulse">
    <div className="w-3 h-3 bg-primary rounded-full" />
    <div className="w-3 h-3 bg-pulse-violet rounded-full" />
    <div className="w-3 h-3 bg-accent rounded-full" />
  </div>
);
