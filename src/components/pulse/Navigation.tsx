import { Home, Globe, Plus, Bell, User, Film, Zap } from "lucide-react";
import { PulseLogo } from "./PulseLogo";
import { cn } from "@/lib/utils";

type ViewType = "home" | "explore" | "create" | "notifications" | "profile" | "reels" | "settings";

interface NavigationProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  isMobile: boolean;
  isPro?: boolean;
}

const navItems = [
  { id: "home" as const, icon: Home, label: "Feed" },
  { id: "explore" as const, icon: Globe, label: "Explore" },
  { id: "create" as const, icon: Plus, label: "Create", highlight: true },
  { id: "notifications" as const, icon: Bell, label: "Alerts" },
  { id: "profile" as const, icon: User, label: "Profile" },
];

export const Navigation = ({ currentView, setView, isMobile, isPro }: NavigationProps) => {
  if (isMobile) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-strong rounded-full shadow-2xl z-50 px-6 py-3 flex justify-between items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "transition-all duration-300 relative",
              currentView === item.id ? "text-foreground scale-110" : "text-muted-foreground"
            )}
          >
            {item.highlight ? (
              <div className="bg-gradient-pulse p-3 rounded-full -mt-8 shadow-lg shadow-primary/30 border-4 border-background">
                <item.icon size={24} className="text-primary-foreground" />
              </div>
            ) : (
              <item.icon size={24} />
            )}
            {currentView === item.id && !item.highlight && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 h-screen sticky top-0 p-6 flex flex-col border-r border-border/50 bg-card/30 backdrop-blur">
      {/* Logo */}
      <div className="flex items-center space-x-2 mb-10 px-2 cursor-pointer group">
        <PulseLogo size="sm" />
        <h1 className="text-2xl font-bold text-gradient tracking-tight ml-2">Pulse</h1>
      </div>

      {/* Nav Items */}
      <div className="space-y-2 flex-1">
        {[...navItems, { id: "reels" as const, icon: Film, label: "Reels" }].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "flex items-center space-x-4 px-4 py-3 rounded-xl transition-all w-full",
              currentView === item.id
                ? "bg-gradient-to-r from-primary/20 to-transparent text-primary font-bold border-l-4 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Pro Upsell */}
      {!isPro && (
        <div className="p-4 glass rounded-2xl">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="text-yellow-400" size={16} />
            <span className="font-bold text-foreground text-sm">Pulse Pro</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Unlock analytics & badge.</p>
          <button
            onClick={() => setView("settings")}
            className="w-full py-2 bg-foreground text-background font-bold rounded-lg text-xs hover:bg-foreground/90 transition-colors"
          >
            Upgrade
          </button>
        </div>
      )}
    </div>
  );
};
