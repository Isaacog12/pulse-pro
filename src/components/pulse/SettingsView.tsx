import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView = ({ onBack }: SettingsViewProps) => {
  const { profile, signOut } = useAuth();
  const isPro = profile?.is_pro || false;

  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    privateAccount: false,
    darkMode: true,
    ghostMode: false,
    showActivity: true,
  });

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    if (!isPro && (key === "ghostMode" || key === "showActivity")) {
      toast.error("This feature requires Pulse Pro");
      return;
    }
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success("Setting updated");
  };

  const proFeatures = [
    { icon: BarChart3, title: "Advanced Analytics", description: "Track views & engagement" },
    { icon: CheckCircle, title: "Verified Badge", description: "Get the blue tick" },
    { icon: Palette, title: "Custom Themes", description: "Personalize app colors" },
    { icon: Eye, title: "Ghost Mode", description: "Browse anonymously" },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 sm:px-6 animate-in slide-in-from-right-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4 py-6 sticky top-0 z-20 bg-background/0 backdrop-blur-sm -mx-4 px-4 mb-4">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-secondary/50 backdrop-blur-md hover:bg-secondary transition-all hover:scale-105 active:scale-95 shadow-sm border border-white/10"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Settings
        </h2>
      </div>

      <div className="space-y-8">
        
        {/* Pro Upgrade Banner */}
        {!isPro ? (
          <div className="relative overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/20 shadow-2xl shadow-amber-500/5 group">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-xl rounded-[30px]" />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 text-white">
                    <Crown size={28} className="fill-white/20" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Pulse Pro</h3>
                    <p className="text-sm text-muted-foreground">Unlock the full experience</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500">
                  RECOMMENDED
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {proFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <feature.icon size={18} className="text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                      <p className="text-[10px] text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                Upgrade Now <Zap size={18} className="ml-2 fill-white" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] p-6 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 backdrop-blur-sm" />
            <div className="relative p-3 rounded-full bg-amber-500/20 text-amber-500">
              <Crown size={24} className="fill-current" />
            </div>
            <div className="relative">
              <p className="font-bold text-lg text-foreground">Pro Active</p>
              <p className="text-sm text-muted-foreground">Thank you for supporting Pulse</p>
            </div>
          </div>
        )}

        {/* Settings Groups */}
        <div className="space-y-6">
          
          {/* Account */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-2">
              <Settings size={14} /> Account
            </h3>
            <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg">
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
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-2">
              <Bell size={14} /> Notifications
            </h3>
            <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg">
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
                  description="Weekly digest and security alerts"
                  value={settings.emailNotifications}
                  onChange={(v) => updateSetting("emailNotifications", v)}
                />
              </div>
            </div>
          </section>

          {/* Privacy (Pro) */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-2">
              <Shield size={14} /> Privacy
              {!isPro && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                  PRO
                </span>
              )}
            </h3>
            <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg">
              <div className="divide-y divide-white/5">
                <SettingItem
                  icon={EyeOff}
                  title="Ghost Mode"
                  description="View stories anonymously"
                  value={settings.ghostMode}
                  onChange={(v) => updateSetting("ghostMode", v)}
                  locked={!isPro}
                />
                <SettingItem
                  icon={Eye}
                  title="Activity Status"
                  description="Show when you're active"
                  value={settings.showActivity}
                  onChange={(v) => updateSetting("showActivity", v)}
                  locked={!isPro}
                />
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-2">
              <Palette size={14} /> Appearance
            </h3>
            <div className="bg-background/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg">
              <div className="divide-y divide-white/5">
                <SettingItem
                  icon={settings.darkMode ? Moon : Sun}
                  title="Dark Mode"
                  description="Easier on the eyes"
                  value={settings.darkMode}
                  onChange={(v) => updateSetting("darkMode", v)}
                />
                
                {/* Theme Picker */}
                <div className="p-5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                        <Palette size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-2">
                          App Theme
                          {!isPro && <Lock size={12} className="text-muted-foreground" />}
                        </p>
                        <p className="text-xs text-muted-foreground">Customize accent color</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn("flex gap-3 overflow-x-auto pb-2 scrollbar-hide", !isPro && "opacity-50 pointer-events-none")}>
                    {["#3B82F6", "#EF4444", "#F97316", "#EAB308", "#10B981", "#8B5CF6", "#EC4899"].map((color) => (
                      <button
                        key={color}
                        onClick={() => isPro && toast.success("Theme updated")}
                        style={{ backgroundColor: color }}
                        className="w-8 h-8 rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all ring-2 ring-transparent hover:ring-white/20"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Support & Logout */}
          <div className="pt-4 space-y-3">
            <button className="w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 text-foreground font-medium flex items-center justify-between transition-colors group">
              <span className="flex items-center gap-3">
                <HelpCircle size={18} className="text-muted-foreground" /> Help & Support
              </span>
              <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => signOut()}
              className="w-full p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium flex items-center justify-center transition-colors"
            >
              <LogOut size={18} className="mr-2" /> Log Out
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-4 pb-8">
            Pulse Version 2.0.4 (Build 492)
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
}

const SettingItem = ({
  icon: Icon,
  title,
  description,
  value,
  onChange,
  type = "toggle",
  locked = false,
}: SettingItemProps) => {
  return (
    <div className={cn("p-5 flex items-center justify-between hover:bg-white/5 transition-colors group", locked && "opacity-60")}>
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-secondary/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Icon size={20} />
        </div>
        <div>
          <p className="font-semibold text-foreground flex items-center gap-2">
            {title}
            {locked && <Lock size={12} className="text-muted-foreground" />}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      
      {type === "toggle" && onChange ? (
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={locked}
          className="data-[state=checked]:bg-primary"
        />
      ) : (
        <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      )}
    </div>
  );
};