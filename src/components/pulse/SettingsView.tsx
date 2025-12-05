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
  const { profile } = useAuth();
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
    { icon: BarChart3, title: "Advanced Analytics", description: "Track profile views, engagement rates, and growth" },
    { icon: CheckCircle, title: "Verified Badge", description: "Get a verified badge on your profile" },
    { icon: Palette, title: "Custom Themes", description: "Personalize your Pulse experience" },
    { icon: Eye, title: "Ghost Mode", description: "Browse stories without being seen" },
    { icon: Crown, title: "Priority Support", description: "Get help faster with dedicated support" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
      </div>

      {/* Pro Upgrade Banner (for non-pro users) */}
      {!isPro && (
        <div className="glass rounded-2xl p-6 mb-6 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-yellow-500/20">
              <Zap className="text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Upgrade to Pulse Pro</h3>
              <p className="text-sm text-muted-foreground">Unlock exclusive features</p>
            </div>
          </div>

          <div className="grid gap-3 mb-6">
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <feature.icon size={16} className="text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-background font-bold">
            <Crown size={18} className="mr-2" />
            Upgrade to Pro - Coming Soon
          </Button>
        </div>
      )}

      {/* Pro User Badge */}
      {isPro && (
        <div className="glass rounded-2xl p-4 mb-6 border border-yellow-500/30 flex items-center gap-3">
          <div className="p-2 rounded-full bg-yellow-500/20">
            <Crown className="text-yellow-400" size={20} />
          </div>
          <div>
            <p className="font-bold text-foreground">Pulse Pro Active</p>
            <p className="text-xs text-muted-foreground">All premium features unlocked</p>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Account Settings */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Settings size={18} /> Account
            </h3>
          </div>
          <div className="divide-y divide-border">
            <SettingItem
              icon={Lock}
              title="Private Account"
              description="Only approved followers can see your posts"
              value={settings.privateAccount}
              onChange={(v) => updateSetting("privateAccount", v)}
            />
            <SettingItem
              icon={Globe}
              title="Language"
              description="English"
              type="link"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Bell size={18} /> Notifications
            </h3>
          </div>
          <div className="divide-y divide-border">
            <SettingItem
              icon={Bell}
              title="Push Notifications"
              description="Receive notifications on your device"
              value={settings.notifications}
              onChange={(v) => updateSetting("notifications", v)}
            />
            <SettingItem
              icon={Bell}
              title="Email Notifications"
              description="Receive important updates via email"
              value={settings.emailNotifications}
              onChange={(v) => updateSetting("emailNotifications", v)}
            />
          </div>
        </div>

        {/* Privacy (Pro Features) */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield size={18} /> Privacy
              {!isPro && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap size={10} /> PRO
                </span>
              )}
            </h3>
          </div>
          <div className="divide-y divide-border">
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
              title="Show Activity Status"
              description="Let others see when you're online"
              value={settings.showActivity}
              onChange={(v) => updateSetting("showActivity", v)}
              locked={!isPro}
            />
          </div>
        </div>

        {/* Appearance */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Palette size={18} /> Appearance
            </h3>
          </div>
          <div className="divide-y divide-border">
            <SettingItem
              icon={settings.darkMode ? Moon : Sun}
              title="Dark Mode"
              description="Switch between light and dark theme"
              value={settings.darkMode}
              onChange={(v) => updateSetting("darkMode", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingItemProps {
  icon: React.ElementType;
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
    <div
      className={cn(
        "flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors",
        locked && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-secondary">
          <Icon size={18} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
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
        />
      ) : (
        <ChevronRight size={20} className="text-muted-foreground" />
      )}
    </div>
  );
};
