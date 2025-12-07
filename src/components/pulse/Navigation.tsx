import { Home, Globe, Plus, Bell, User, Film, Zap, MessageSquare } from "lucide-react";
import { PulseLogo } from "./PulseLogo";
import { cn } from "@/lib/utils";

type ViewType =
  | "home"
  | "explore"
  | "create"
  | "notifications"
  | "profile"
  | "reels"
  | "settings"
  | "messages";

interface NavigationProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  isMobile: boolean;
  isPro?: boolean;
  unreadMessages?: number;
  unreadNotifications?: number;
}

const navItems = [
  { id: "home" as const, icon: Home, label: "Feed" },
  { id: "explore" as const, icon: Globe, label: "Explore" },
  { id: "reels" as const, icon: Film, label: "Reels" },
  { id: "create" as const, icon: Plus, label: "Post", highlight: true },
  { id: "messages" as const, icon: MessageSquare, label: "Messages" },
  { id: "notifications" as const, icon: Bell, label: "Notifications" },
  { id: "profile" as const, icon: User, label: "Profile" },
];

export const Navigation = ({
  currentView,
  setView,
  isMobile,
  isPro,
  unreadMessages = 0,
  unreadNotifications = 0,
}: NavigationProps) => {
  if (isMobile) {
    const leftItems = navItems.filter(
      (i) => !i.highlight && ["home", "explore", "reels"].includes(i.id)
    );
    const centerItem = navItems.find((i) => i.highlight);
    const rightItems = navItems.filter(
      (i) => !i.highlight && ["messages", "notifications", "profile"].includes(i.id)
    );

    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-card/70 backdrop-blur-lg rounded-3xl shadow-2xl flex justify-between items-center px-4 py-3 z-50">
        {/* Left side */}
        <div className="flex space-x-6">
          {leftItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center transition-transform duration-200",
                currentView === item.id ? "text-foreground scale-110" : "text-muted-foreground"
              )}
            >
              <item.icon size={24} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Center Create button */}
        {centerItem && (
          <button
            onClick={() => setView(centerItem.id)}
            className="bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400 p-4 rounded-full shadow-xl -mt-6 border-4 border-card flex items-center justify-center"
          >
            <centerItem.icon size={28} className="text-white" />
          </button>
        )}

        {/* Right side */}
        <div className="flex space-x-6">
          {rightItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center transition-transform duration-200",
                currentView === item.id ? "text-foreground scale-110" : "text-muted-foreground"
              )}
            >
              <item.icon size={24} />
              <span className="text-[10px] mt-1">{item.label}</span>

              {/* Badges */}
              {item.id === "messages" && unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
              {item.id === "notifications" && unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="w-64 h-screen sticky top-0 p-6 flex flex-col border-r border-border/50 bg-card/30 backdrop-blur">
      {/* Logo */}
      <div className="flex items-center space-x-2 mb-10 px-2 cursor-pointer group">
        <PulseLogo size="sm" />
        <h1 className="text-2xl font-bold text-gradient tracking-tight ml-2">Pulse</h1>
      </div>

      {/* Nav Items */}
      <div className="space-y-2 flex-1">
        {[...navItems].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "flex items-center space-x-4 px-4 py-3 rounded-xl transition-all w-full relative",
              currentView === item.id
                ? "bg-gradient-to-r from-primary/20 to-transparent text-primary font-bold border-l-4 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <div className="relative">
              <item.icon size={22} />
              {item.id === "messages" && unreadMessages > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
              {item.id === "notifications" && unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Pro Upsell */}
      {!isPro && (
        <div className="p-4 glass rounded-2xl mt-4">
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
