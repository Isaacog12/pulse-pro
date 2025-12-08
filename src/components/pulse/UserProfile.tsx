import { useState, useEffect } from "react";
import { Settings, CheckCircle, Grid, Bookmark, Zap, Edit3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EditProfileModal } from "./EditProfileModal";

interface UserProfileProps {
  onOpenSettings: () => void;
}

export const UserProfile = ({ onOpenSettings }: UserProfileProps) => {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
      fetchSavedPosts();
      fetchFollowCounts();
    }
  }, [user]);

  const fetchUserPosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPosts(data || []);
  };

  const fetchSavedPosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_posts")
      .select("post_id, posts(*)")
      .eq("user_id", user.id);
    setSavedPosts(data?.map((s) => s.posts) || []);
  };

  const fetchFollowCounts = async () => {
    if (!user) return;
    const { count: followers } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id);
    const { count: following } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id);
    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const displayPosts = activeTab === "posts" ? posts : savedPosts;

  if (!user || !profile) {
    return <div className="text-center py-10 text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div
        className={cn(
          "glass rounded-3xl p-6 mb-6 relative overflow-hidden transition-all duration-500",
          profile.is_pro ? "border-yellow-500/50 shadow-yellow-500/10" : "border-border"
        )}
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/30 to-accent/30" />

        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 glass rounded-full hover:bg-secondary transition-colors"
          >
            <Settings size={20} className="text-foreground" />
          </button>
          <button
            onClick={signOut}
            className="p-2 glass rounded-full hover:bg-secondary transition-colors"
          >
            <LogOut size={20} className="text-foreground" />
          </button>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-16">
          <div className="relative group">
            <div
              className={cn(
                "w-28 h-28 rounded-full p-1",
                profile.is_pro ? "bg-gradient-to-tr from-yellow-400 to-yellow-600" : "bg-gradient-pulse"
              )}
            >
              <img
                src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                alt={profile.username}
                className="w-full h-full rounded-full object-cover bg-secondary border-4 border-background"
              />
            </div>
            {profile.is_pro && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-background text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-lg">
                <Zap size={12} className="mr-1 fill-current" /> PRO
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <h2 className="text-2xl font-bold text-foreground">{profile.username}</h2>
              {profile.is_verified && <CheckCircle size={20} className="text-yellow-400 fill-current" />}
            </div>
            {profile.bio && <p className="text-muted-foreground text-sm mb-4 max-w-md">{profile.bio}</p>}

            <div className="flex justify-center sm:justify-start gap-8 mb-4">
              <div className="text-center">
                <div className="font-bold text-foreground">{posts.length}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">{followersCount}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">{followingCount}</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit3 size={16} className="mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("posts")}
          className={cn(
            "flex-1 py-4 flex items-center justify-center gap-2 transition-colors border-b-2",
            activeTab === "posts"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Grid size={18} />
          <span className="font-medium">Posts</span>
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={cn(
            "flex-1 py-4 flex items-center justify-center gap-2 transition-colors border-b-2",
            activeTab === "saved"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Bookmark size={18} />
          <span className="font-medium">Saved</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {displayPosts.map((post) => (
          <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg">
            <img src={post.image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
          </div>
        ))}
      </div>

      {displayPosts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm">Start sharing your moments!</p>
        </div>
      )}

      {showEditModal && (
        <EditProfileModal
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={() => {
            fetchUserPosts();
          }}
        />
      )}
    </div>
  );
};
