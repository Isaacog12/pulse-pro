import { useState, useEffect } from "react";
import { Crown, CheckCircle, BarChart3, Palette, Video, Keyboard, EyeOff, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProFeaturesProps {
  isPro: boolean;
  settings: any;
  updateSetting: (key: string, value: boolean) => void;
}

export const ProFeatures = ({ isPro, settings, updateSetting }: ProFeaturesProps) => {
  return (
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
            {isPro && <CheckCircle size={20} className="text-yellow-400 fill-yellow-400/20" />}
          </div>

          <div className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500"><Palette size={20} /></div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Custom App Themes</p>
              <p className="text-xs text-muted-foreground">Change the look of Glint</p>
            </div>
            {isPro && <CheckCircle size={20} className="text-yellow-400 fill-yellow-400/20" />}
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