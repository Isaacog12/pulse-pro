import { useState } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EditProfileModalProps {
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const EditProfileModal = ({ onClose, onProfileUpdated }: EditProfileModalProps) => {
  const { user, profile, updateProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [status, setStatus] = useState(profile?.status || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
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
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Update profile
      await updateProfile({
        username: username.trim(),
        bio: bio.trim() || null,
        status: status.trim() || null,
        avatar_url: avatarUrl,
      });

      toast.success("Profile updated!");
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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass rounded-3xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={24} />
          </Button>
          <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
          <Button onClick={handleSave} disabled={loading} size="sm">
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Save"}
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-pulse p-0.5">
                <img
                  src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover bg-secondary"
                />
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera size={24} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              maxLength={30}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={150}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
          </div>
        </div>
      </div>
    </div>
  );
};