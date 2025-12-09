import { Home, Globe, Plus, Bell, User, Film, MessageCircleDashed, Zap } from "lucide-react";
import { GlintLogo } from "./GlintLogo"; // Updated Import
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

// 1. Define all items in a single pool first
const allNavOptions = [
  { id: "home" as const, icon: Home, label: "Feed" },
  { id: "explore" as const, icon: Globe, label: "Explore" },
  { id: "reels" as const, icon: Film, label: "Reels" },
  { id: "create" as const, icon: Plus, label: "Post", highlight: true },
  { id: "messages" as const, icon: MessageCircleDashed, label: "Messages" },
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

  // 2. Define Desktop Order specifically
  const desktopItems = [
    "home",
    "explore",
    "reels",
    "create",
    "messages",
    "notifications",
    "profile",
  ].map(id => allNavOptions.find(item => item.id === id)!);

  // 3. Define Mobile Splits (Bottom vs Top)
  const mobileBottomItems = [
    "home",
    "explore",
    "create",
    "reels",
    "profile"
  ].map(id => allNavOptions.find(item => item.id === id)!);

  const mobileTopItems = [
    "notifications",
    "messages"
  ].map(id => allNavOptions.find(item => item.id === id)!);
  
  if (isMobile) {
    return (
      <>
        {/* Mobile Top Header - Classic Glass */}
        <div className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-background/40 backdrop-blur-2xl border-b border-white/10 shadow-sm supports-[backdrop-filter]:bg-background/40">
          <div className="flex items-center gap-2">
            <GlintLogo size="sm" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Glint
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {mobileTopItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewType)}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <item.icon size={22} strokeWidth={2} />
                {item.id === "messages" && unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 bg-primary text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shadow-lg ring-2 ring-background">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
                {item.id === "notifications" && unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-red-500 w-2.5 h-2.5 rounded-full ring-2 ring-background animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Bottom Navigation - Floating Glass Island */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[400px]">
          <div className="bg-background/60 backdrop-blur-3xl border border-white/15 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-2 h-16 flex items-center justify-between relative ring-1 ring-white/5">
            
            {/* Grid Layout for Perfect Spacing */}
            <div className="grid grid-cols-5 w-full items-center justify-items-center">
              
              {mobileBottomItems.map((item) => {
                const isActive = currentView === item.id;
                
                if (item.highlight) {
                  return (
                    <div key={item.id} className="relative -top-6">
                      <button
                        onClick={() => setView(item.id as ViewType)}
                        className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary via-blue-500 to-accent flex items-center justify-center shadow-lg shadow-primary/40 transform transition-transform active:scale-95 hover:scale-105 ring-4 ring-background/50 backdrop-blur-sm"
                      >
                        <Plus className="text-white" size={28} strokeWidth={3} />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as ViewType)}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300",
                      isActive ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "relative p-2 rounded-xl transition-all duration-300",
                      isActive && "bg-primary/10"
                    )}>
                      <item.icon 
                        size={24} 
                        strokeWidth={isActive ? 2.5 : 2}
                        className={cn("transition-all", isActive && "scale-105")}
                      />
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop sidebar - Ordered List
  return (
    <div className="w-64 h-screen sticky top-0 p-6 flex flex-col border-r border-white/10 bg-background/20 backdrop-blur-3xl shadow-[5px_0_30px_rgba(0,0,0,0.02)]">
      {/* Logo */}
      <div className="flex items-center space-x-3 mb-10 px-2 cursor-pointer group">
        <GlintLogo size="sm" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">Glint</h1>
      </div>

      {/* Nav Items - Now using the specific desktopItems order */}
      <div className="space-y-2 flex-1">
        {desktopItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as ViewType)}
            className={cn(
              "flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all w-full relative group duration-300 ease-out",
              currentView === item.id
                ? "bg-primary/10 text-primary font-bold shadow-[0_0_20px_rgba(59,130,246,0.1)] border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <div className="relative group-hover:scale-105 transition-transform">
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              
              {/* Badges */}
              {item.id === "messages" && unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm ring-2 ring-background">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
              {item.id === "notifications" && unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm ring-2 ring-background">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </div>
            <span>{item.label}</span>
            
            {/* Hover Glow Effect for desktop */}
            {currentView === item.id && (
                 <div className="absolute inset-0 rounded-xl bg-primary/5 blur-lg -z-10" />
            )}
          </button>
        ))}
      </div>

      {/* Pro Upsell - Glass Card */}
      {!isPro && (
        <div className="p-4 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl mt-4 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          
          <div className="flex items-center space-x-2 mb-2 relative z-10">
            <div className="p-1.5 bg-yellow-400/10 rounded-lg ring-1 ring-yellow-400/20">
                <Zap className="text-primary fill-yellow-400" size={14} />
            </div>
            <span className="font-bold text-foreground text-sm">Glint Pro</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed relative z-10">Unlock analytics, badges & exclusive features.</p>
          <button
            onClick={() => setView("settings")}
            className="w-full py-2.5 bg-foreground text-background font-bold rounded-xl text-xs hover:opacity-90 transition-all shadow-lg relative z-10 active:scale-95"
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
};