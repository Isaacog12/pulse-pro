import { useState } from "react";
import { Lock, Globe, Bell, Moon, Sun, Palette, ChevronRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MainSettingsProps {
  isPro: boolean;
  settings: any;
  updateSetting: (key: string, value: boolean) => void;
  setActivePage: (page: "main" | "pro") => void;
}

export const MainSettings = ({ isPro, settings, updateSetting, setActivePage }: MainSettingsProps) => {
  return (
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