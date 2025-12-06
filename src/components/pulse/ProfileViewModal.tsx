import { useState, useEffect } from "react";
import { X, CheckCircle, Grid, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";
import { cn } from "@/lib/utils";

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_pro: boolean;
  status: string | null;
  last_seen: string | null;
}

interface ProfileViewModalProps {
  userId: string;
  onClose: () => void;
  onViewPost?: (postId: string) => void;
}

export const ProfileViewModal = ({ userId, onClose, onViewPost }: ProfileViewModalProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<{ id: string; image_url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;
    return diffMinutes < 5; // Online if seen in last 5 minutes
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, image_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(9);

    if (postsData) {
      setPosts(postsData);
    }

    // Fetch stats
    const { count: postsCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: followersCount } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    const { count: followingCount } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setStats({
      posts: postsCount || 0,
      followers: followersCount || 0,
      following: followingCount || 0,
    });

    setLoading(false);
  };

  const isOwnProfile = user?.id === userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Profile</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X size={20} className="text-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : profile ? (
          <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
            {/* Profile Header */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className={`w-24 h-24 rounded-full p-1 ${profile.is_verified ? "bg-gradient-to-tr from-yellow-400 to-yellow-600" : "bg-gradient-to-br from-primary to-accent"}`}>
                  <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                    alt={profile.username}
                    className="w-full h-full rounded-full object-cover bg-secondary"
                  />
                </div>
                {/* Online indicator */}
                <div 
                  className={cn(
                    "absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-background",
                    isOnline(profile.last_seen) ? "bg-green-500" : "bg-muted-foreground/50"
                  )}
                  title={isOnline(profile.last_seen) ? "Online" : "Offline"}
                />
                {profile.is_pro && (
                  <div className="absolute -bottom-1 -left-1 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    PRO
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-foreground">{profile.username}</h2>
                {profile.is_verified && (
                  <CheckCircle size={18} className="text-yellow-400 fill-current" />
                )}
              </div>

              {profile.status && (
                <p className="text-sm text-muted-foreground mb-2">{profile.status}</p>
              )}

              {profile.bio && (
                <p className="text-foreground text-sm mb-4 max-w-xs">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex gap-8 mb-4">
                <div className="text-center">
                  <p className="font-bold text-foreground">{stats.posts}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">{stats.followers}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">{stats.following}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>

              {/* Follow Button */}
              {!isOwnProfile && (
                <FollowButton
                  targetUserId={userId}
                  onFollowChange={fetchProfileData}
                  size="default"
                />
              )}
            </div>

            {/* Posts Grid */}
            {posts.length > 0 && (
              <div className="px-4 pb-6">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                  <Grid size={16} />
                  <span className="text-sm font-medium">Posts</span>
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className={cn(
                        "aspect-square group",
                        onViewPost && "cursor-pointer"
                      )}
                      onClick={() => {
                        if (onViewPost) {
                          onClose();
                          onViewPost(post.id);
                        }
                      }}
                    >
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {posts.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No posts yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>User not found</p>
          </div>
        )}
      </div>
    </div>
  );
};