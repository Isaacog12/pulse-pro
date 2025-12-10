import { useState } from "react";
import { X, Camera, Loader2, User, FileText, Check, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditProfileModalProps {
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const EditProfileModal = ({ onClose, onProfileUpdated }: EditProfileModalProps) => {
  const { user, profile, updateProfile } = useAuth();
  
  // Profile State
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  
  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    setLoading(true);

    try {
      // 1. Update Password (if provided)
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
        toast.success("Password updated successfully");
      }

      // 2. Upload Avatar (if changed)
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // 3. Update Profile Data
      await updateProfile({
        username: username.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      });

      toast.success("Profile updated successfully!");
      onProfileUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      
      {/* Darkened Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Main Glass Modal */}
      <div className="relative w-full max-w-lg bg-background/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </Button>
          <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Edit Profile
          </h2>
          <div className="w-10" /> 
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative w-32 h-32 rounded-full p-[3px] bg-gradient-to-br from-white/20 to-white/5 border border-white/10 shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-black/50 relative">
                  <img
                    src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                    alt="Avatar"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                    <Camera size={32} className="text-white drop-shadow-md scale-90 group-hover:scale-100 transition-transform" />
                  </div>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
              <div className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-background z-10 pointer-events-none">
                <Camera size={14} />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground font-medium">Change Profile Photo</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            
            {/* Username */}
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Username</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  maxLength={30}
                  className="pl-11 h-12 bg-secondary/30 border-transparent focus:bg-background/80 focus:border-primary/50 rounded-2xl transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2 group">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bio</label>
                <span className={cn("text-[10px] font-mono", bio.length > 140 ? "text-red-500" : "text-muted-foreground")}>
                  {bio.length}/150
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <FileText size={18} />
                </div>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={150}
                  rows={4}
                  className="pl-11 pt-3.5 bg-secondary/30 border-transparent focus:bg-background/80 focus:border-primary/50 rounded-2xl resize-none transition-all shadow-sm min-h-[100px]"
                />
              </div>
            </div>

            {/* Change Password Section */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="flex items-center justify-between w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <span className="font-semibold text-sm">Change Password</span>
                </div>
                {showPasswordSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showPasswordSection && (
                <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="h-12 bg-secondary/30 border-transparent focus:bg-background/80 focus:border-primary/50 rounded-2xl transition-all shadow-sm"
                  />
                  <p className="text-[10px] text-muted-foreground ml-1">Leave empty to keep current password.</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-white/5">
          <Button 
            onClick={handleSave} 
            disabled={loading} 
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <span className="flex items-center gap-2">
                Save Changes <Check size={18} />
              </span>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};