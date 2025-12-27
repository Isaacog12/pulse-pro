import { useState, useEffect } from "react";
import { Crown, CheckCircle, BarChart3, Palette, Video, Keyboard, EyeOff, Lock, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ==========================================
// 1. The Main "Smart" Component
// ==========================================
export const ProSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Local state for the UI
  const [isPro, setIsPro] = useState(false);
  const [settings, setSettings] = useState({
    ghostMode: false,
    hdUploads: false,
    stealthTyping: false,
  });

  // A. Fetch Settings on Load
  useEffect(() => {
    if (!user) return;

    const fetchProSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_pro, ghost_mode, hd_uploads, stealth_typing")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setIsPro(data.is_pro || false);
          setSettings({
            ghostMode: data.ghost_mode || false,
            hdUploads: data.hd_uploads || false,
            stealthTyping: data.stealth_typing || false,
          });
        }
      } catch (error) {
        console.error("Error fetching pro settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProSettings();
  }, [user]);

  // B. Handle Toggle Updates
  const updateSetting = async (key: string, value: boolean) => {
    if (!user) return;

    // 1. Optimistic Update (Update UI immediately)
    setSettings((prev) => ({ ...prev, [key]: value }));

    // 2. Map frontend keys to DB columns
    const dbColumnMap: Record<string, string> = {
      ghostMode: "ghost_mode",
      hdUploads: "hd_uploads",
      stealthTyping: "stealth_typing",
    };

    const dbColumn = dbColumnMap[key];
    if (!dbColumn) return;

    // 3. Send to Supabase
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [dbColumn]: value })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Settings saved");
    } catch (error) {
      // Revert if error
      setSettings((prev) => ({ ...prev, [key]: !value }));
      toast.error("Failed to update setting");
    }
  };

  // C. Handle Subscribe (Placeholder)
  const handleSubscribe = () => {
    toast.loading("Redirecting to checkout...");
    // Here you would redirect to Stripe Payment Link
    // window.location.href = "YOUR_STRIPE_LINK";
    
    // FOR TESTING ONLY: Toggle Pro Status
    setTimeout(async () => {
      // This is just to demonstrate it working - remove in production!
      await supabase.from("profiles").update({ is_pro: true }).eq("id", user?.id);
      setIsPro(true);
      toast.dismiss();
      toast.success("Welcome to Pro! (Test Mode)");
    }, 1500);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-amber-500" /></div>;
  }

  return (
    <ProFeaturesView 
      isPro={isPro} 
      settings={settings} 
      updateSetting={updateSetting} 
      onSubscribe={handleSubscribe}
    />
  );
};

// ==========================================
// 2. The UI Component (Presentation Only)
// ==========================================
interface ProFeaturesProps {
  isPro: boolean;
  settings: any;
  updateSetting: (key: string, value: boolean) => void;
  onSubscribe: () => void;
}

const ProFeaturesView = ({ isPro, settings, updateSetting, onSubscribe }: ProFeaturesProps) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 bg-gradient-to-br from-amber-500/20 via-black/40 to-black/60 border border-amber-500/30 shadow-2xl shadow-amber-500/10 group">
        <div className="absolute top-0 right-0 p-12 opacity-20 bg-amber-500 blur-[80px] rounded-full pointer-events-none group-hover:opacity-30 transition-opacity duration-1000" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/40 rotate-3 hover:rotate-6 transition-transform duration-300">
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
          <StaticFeatureItem 
            icon={CheckCircle} 
            title="Verified Badge" 
            desc="Gold badge on your profile" 
            active={isPro} 
          />
          <StaticFeatureItem 
            icon={BarChart3} 
            title="Advanced Analytics" 
            desc="See who viewed your profile" 
            active={isPro} 
          />
          <StaticFeatureItem 
            icon={Palette} 
            title="Custom App Themes" 
            desc="Change the look of Glint" 
            active={isPro} 
          />
        </div>
      </div>

      {/* Subscribe Button */}
      {!isPro && (
        <div className="sticky bottom-6 p-4 glass rounded-2xl border border-amber-500/20 shadow-2xl backdrop-blur-md bg-black/60">
          <Button 
            onClick={onSubscribe}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
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
// 3. Helper Components
// ==========================================

interface SettingItemProps {
  icon: any;
  title: string;
  description: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
  locked?: boolean;
  highlight?: boolean;
}

const SettingItem = ({ icon: Icon, title, description, value, onChange, locked = false, highlight = false }: SettingItemProps) => {
  return (
    <div className={cn("p-5 flex items-center justify-between hover:bg-white/5 transition-colors group", locked && "opacity-60")}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-xl transition-colors",
          highlight ? "bg-amber-500/10 text-amber-500" : "bg-secondary/50 text-foreground"
        )}>
          <Icon size={15} />
        </div>
        <div>
          <p className={cn("font-semibold flex items-center gap-2", highlight ? "text-amber-500" : "text-foreground")}>
            {title}
            {locked && <Lock size={14} className="text-muted-foreground/70" />}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <Switch
        checked={value}
        onCheckedChange={(v) => {
           if (locked) {
             toast.error("Subscribe to Pro to unlock this feature");
             return;
           }
           if (onChange) onChange(v);
        }}
        // Only visually disabled if we want to force the user to see the "Subscribe" toast, 
        // but typically standard HTML disabled is better. Let's use visual cues + logic intercept.
        className={cn(highlight && "data-[state=checked]:bg-amber-500")}
      />
    </div>
  );
};

const StaticFeatureItem = ({ icon: Icon, title, desc, active }: { icon: any, title: string, desc: string, active: boolean }) => (
  <div className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500"><Icon size={20} /></div>
    <div className="flex-1">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
    {active && <CheckCircle size={20} className="text-yellow-400 fill-yellow-400/20 animate-in zoom-in" />}
  </div>
);