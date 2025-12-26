import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Shield,
  Moon,
  Sun,
  Globe,
  Lock,
  Zap,
  Crown,
  Eye,
  EyeOff,
  Palette,
  BarChart3,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  LogOut,
  HelpCircle,
  Video,
  Smartphone,
  Ban,
  Keyboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView = ({ onBack }: SettingsViewProps) => {
  const { user, profile, signOut } = useAuth();
  const isPro = profile?.is_pro || false;
  const [activePage, setActivePage] = useState<"main" | "pro">("main");

  // Local state for UI
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    privateAccount: false, // Default false, will update from DB
    darkMode: true,
    ghostMode: false,
    showActivity: true,
    hdUploads: true,
    stealthTyping: false,
  });

  // --- 1. LOAD SETTINGS FROM DB & LOCAL STORAGE ---
  useEffect(() => {
    // Load Dark Mode
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("glint_theme");
      const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
      setSettings(prev => ({ ...prev, darkMode: isDark }));
    }

    // Load Private Account Status
    if (profile) {
      const fetchProfileSettings = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("is_private")
          .eq("id", user?.id)
          .single();
        
        if (data) {
          // @ts-ignore - Supabase types might not be updated yet
          setSettings(prev => ({ ...prev, privateAccount: data.is_private || false }));
        }
      };
      fetchProfileSettings();
    }
  }, [profile, user]);

  // --- 2. APPLY DARK MODE ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.darkMode) {
      root.classList.add("dark");
      localStorage.setItem("glint_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("glint_theme", "light");
    }
  }, [settings.darkMode]);

  // --- 3. HANDLE UPDATES ---
  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
    // Gate Pro Features
    const proKeys = ["ghostMode", "hdUploads", "stealthTyping"];
    if (!isPro && proKeys.includes(key)) {
      toast.error("Unlock Glint Pro to use this feature", {
        icon: <Crown className="text-amber-500" size={15} />
      });
      return;
    }

    // Update Local State
    setSettings((prev) => ({ ...prev, [key]: value }));

    // ✅ Handle Database Updates for "Private Account"
    if (key === "privateAccount") {
      if (!user) return;
      
      const { error } = await supabase
        .from("profiles")
        .update({ is_private: value })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating privacy:", error);
        toast.error("Failed to update privacy settings");
        setSettings((prev) => ({ ...prev, [key]: !value }));
      } else {
        toast.success(value ? "Account is now Private" : "Account is now Public");
      }
      return;
    }

    // Success Toast for other local settings
    if (isPro || !proKeys.includes(key)) {
        if (key !== "darkMode") toast.success("Setting updated");
    }
  };

  // ==========================================
  // VIEW 1: PRO PAGE
  // ==========================================
  if (activePage === "pro") {
    return (
      <div className="max-w-2xl mx-auto pb-24 px-4 sm:px-6 animate-in slide-in-from-right-8 duration-300">
        
        {/* Pro Header */}
        <div className="flex items-center gap-4 py-6 sticky top-0 z-20 bg-background/0 backdrop-blur-sm -mx-4 px-4 mb-2">
          <button
            onClick={() => setActivePage("main")}
            className="p-3 rounded-full bg-secondary/50 backdrop-blur-md hover:bg-secondary transition-all hover:scale-105 active:scale-95 shadow-sm border border-white/10"
          >
            <ArrowLeft size={15} className="text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Glint Pro
            </h2>
            {isPro && <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">MEMBER</span>}
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Hero Card */}
          <div className="relative overflow-hidden rounded-[32px] p-8 bg-gradient-to-br from-amber-500/20 via-black/40 to-black/60 border border-amber-500/30 shadow-2xl shadow-amber-500/10">
            <div className="absolute top-0 right-0 p-12 opacity-20 bg-amber-500 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/40 rotate-3 hover:rotate-6 transition-transform">
                <Crown size={40} className="text-white fill-white/20" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {isPro ? "You are a Pro Member" : "Unlock Exclusive Features"}
              </h1>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                {isPro 
                  ? "Enjoy your premium experience with full access to all features." 
                  : "Join the elite club. Get analytics, ghost mode, verified badge, and more."}
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Exclusive Features</h3>
            </div>
            
            <div className="divide-y divide-white/5">
              <SettingItem
                icon={EyeOff}
                title="Ghost Mode"
                description="View stories without them knowing"
                value={settings.ghostMode}
                onChange={(v) => updateSetting("ghostMode", v)}
                highlight
                locked={!isPro}
              />
              <SettingItem
                icon={Video}
                title="4K HD Uploads"
                description="Upload photos & videos in full quality"
                value={settings.hdUploads}
                onChange={(v) => updateSetting("hdUploads", v)}
                highlight
                locked={!isPro}
              />
              <SettingItem
                icon={Keyboard}
                title="Stealth Typing"
                description="Hide typing indicator in chats"
                value={settings.stealthTyping}
                onChange={(v) => updateSetting("stealthTyping", v)}
                highlight
                locked={!isPro}
              />
              
              {/* Static Features */}
              <div className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500"><CheckCircle size={20} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Verified Badge</p>
                  <p className="text-xs text-muted-foreground">Gold badge on your profile</p>
                </div>
                {isPro && <CheckCircle size={20} className="text-yellow-400 fill-yellow-400/20" />}
              </div>
              
              <div className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500"><BarChart3 size={20} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Advanced Analytics</p>
                  <p className="text-xs text-muted-foreground">See who viewed your profile</p>
                </div>
                {isPro && <ChevronRight size={18} className="text-muted-foreground" />}
              </div>
              
               <div className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500"><Palette size={20} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Custom App Themes</p>
                  <p className="text-xs text-muted-foreground">Change the look of Glint</p>
                </div>
              </div>
            </div>
          </div>

          {!isPro && (
            <div className="sticky bottom-24 p-4 glass rounded-2xl border border-amber-500/20 shadow-2xl">
              <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                Subscribe for $4.99/mo
              </Button>
              <p className="text-center text-[10px] text-muted-foreground mt-3">
                Cancel anytime. Terms & conditions apply.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MAIN SETTINGS MENU
  // ==========================================
  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 sm:px-6 animate-in slide-in-from-left-8 duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 py-6 sticky top-0 z-20 bg-background/0 backdrop-blur-sm -mx-4 px-4 mb-4">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-secondary/50 backdrop-blur-md hover:bg-secondary transition-all hover:scale-105 active:scale-95 shadow-sm border border-white/10"
        >
          <ArrowLeft size={15} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Settings
        </h2>
      </div>

      <div className="space-y-6">
        
        {/* Glint Pro Banner */}
        <button 
          onClick={() => setActivePage("pro")}
          className="w-full relative overflow-hidden rounded-[28px] p-[1px] group transition-all duration-300 hover:scale-[1.01]"
        >
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r",
            isPro ? "from-amber-400 via-orange-500 to-amber-600" : "from-secondary to-secondary/50"
          )} />
          
          <div className="relative bg-background/80 backdrop-blur-xl rounded-[27px] p-5 flex items-center justify-between overflow-hidden">
            {isPro && <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 blur-[60px] rounded-full pointer-events-none" />}
            
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn(
                "p-3 rounded-2xl shadow-lg",
                isPro ? "bg-gradient-to-br from-amber-400 to-orange-600 text-white" : "bg-secondary text-muted-foreground"
              )}>
                <Crown size={24} className={cn(isPro ? "fill-white/20" : "")} />
              </div>
              <div className="text-left">
                <h3 className={cn("text-lg font-bold", isPro ? "text-foreground" : "text-muted-foreground")}>
                  Glint Pro
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isPro ? "Manage your membership" : "Upgrade to unlock features"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isPro && <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg border border-amber-500/20">NEW</span>}
              <ChevronRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>

        {/* Account Settings */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4">Account</h3>
          <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-white/5">
              <SettingItem
                icon={Lock}
                title="Private Account"
                description="Only approved followers can see you"
                value={settings.privateAccount}
                onChange={(v) => updateSetting("privateAccount", v)}
              />
              <SettingItem
                icon={Globe}
                title="Language"
                description="English (US)"
                type="link"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4">Notifications</h3>
          <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-white/5">
              <SettingItem
                icon={Bell}
                title="Push Notifications"
                description="On mobile and desktop"
                value={settings.notifications}
                onChange={(v) => updateSetting("notifications", v)}
              />
              <SettingItem
                icon={Bell}
                title="Email Updates"
                description="Weekly digest and security"
                value={settings.emailNotifications}
                onChange={(v) => updateSetting("emailNotifications", v)}
              />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4">Appearance</h3>
          <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-white/5">
              <SettingItem
                icon={settings.darkMode ? Moon : Sun}
                title="Dark Mode"
                description="Switch theme"
                value={settings.darkMode}
                onChange={(v) => updateSetting("darkMode", v)}
              />
              <div className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => isPro ? toast.success("Opening theme picker...") : toast.error("Requires Pro")}>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-secondary/50 text-foreground">
                    <Palette size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">App Theme</p>
                    <p className="text-xs text-muted-foreground">Default Blue</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border border-background" />
                    <div className="w-4 h-4 rounded-full bg-purple-500 border border-background" />
                    <div className="w-4 h-4 rounded-full bg-amber-500 border border-background" />
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logout */}
        <div className="pt-4">
          <button 
            onClick={() => signOut()}
            className="w-full p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium flex items-center justify-center transition-colors border border-red-500/20"
          >
            <LogOut size={15} className="mr-2" /> Log Out
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-6 pb-8 opacity-50">
            Glint v2.2.0 •
          </p>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// Reusable Setting Item Component
// ==========================================
interface SettingItemProps {
  icon: any;
  title: string;
  description: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
  type?: "toggle" | "link";
  locked?: boolean;
  highlight?: boolean;
}

const SettingItem = ({
  icon: Icon,
  title,
  description,
  value,
  onChange,
  type = "toggle",
  locked = false,
  highlight = false,
}: SettingItemProps) => {
  return (
    <div className={cn("p-5 flex items-center justify-between hover:bg-white/5 transition-colors group", locked && "opacity-80")}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-xl transition-colors",
          highlight ? "bg-amber-500/10 text-amber-500" : "bg-secondary/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          <Icon size={15} />
        </div>
        <div>
          <p className={cn("font-semibold flex items-center gap-2", highlight ? "text-amber-500" : "text-foreground")}>
            {title}
            {locked && <Lock size={15} className="text-muted-foreground" />}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      
      {type === "toggle" && onChange ? (
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={locked}
          className={cn(highlight && "data-[state=checked]:bg-amber-500")}
        />
      ) : (
        <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      )}
    </div>
  );
};