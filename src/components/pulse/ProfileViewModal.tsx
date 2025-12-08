import { useState, useEffect } from "react";
import { X, CheckCircle, Grid, Loader2, Play, MapPin, Calendar, Link as LinkIcon, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_pro: boolean;
  last_seen: string | null;
  created_at?: string;
}

interface ProfileViewModalProps {
  userId: string;
  onClose: () => void;
  onViewPost?: (postId: string) => void;
}

const isVideoUrl = (url: string) => {
  return url.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const ProfileViewModal = ({ userId, onClose, onViewPost }: ProfileViewModalProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<{ id: string; image_url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diffMinutes = (new Date().getTime() - new Date(lastSeen).getTime()) / 1000 / 60;
    return diffMinutes < 5;
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profileData) setProfile(profileData);

    // Fetch posts
    const { data: postsData } = await supabase.from("posts").select("id, image_url").eq("user_id", userId).order("created_at", { ascending: false }).limit(12);
    if (postsData) setPosts(postsData);

    // Fetch stats (Parallel execution for speed)
    const [postsCount, followersCount, followingCount] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", userId)
    ]);

    setStats({
      posts: postsCount.count || 0,
      followers: followersCount.count || 0,
      following: followingCount.count || 0,
    });

    setLoading(false);
  };

  const isOwnProfile = user?.id === userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-background/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 z-20">
          <h3 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {profile?.username || "Profile"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-secondary/50 animate-pulse" />
              <div className="h-6 w-32 bg-secondary/50 rounded animate-pulse" />
              <div className="h-4 w-48 bg-secondary/30 rounded animate-pulse" />
              <div className="flex gap-4 w-full justify-center mt-4">
                <div className="h-16 w-20 bg-secondary/30 rounded-xl animate-pulse" />
                <div className="h-16 w-20 bg-secondary/30 rounded-xl animate-pulse" />
                <div className="h-16 w-20 bg-secondary/30 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : profile ? (
            <div className="pb-8">
              
              {/* Profile Info */}
              <div className="p-6 flex flex-col items-center text-center relative">
                
                {/* Avatar with Ring */}
                <div className="relative mb-4 group">
                  <div className={cn(
                    "absolute -inset-1 rounded-full blur opacity-75 transition-all duration-1000",
                    profile.is_verified ? "bg-gradient-to-tr from-yellow-400 to-orange-500" : "bg-gradient-to-tr from-blue-500 to-purple-500",
                    "group-hover:opacity-100 group-hover:blur-md"
                  )} />
                  <div className="relative w-28 h-28 rounded-full p-[3px] bg-background">
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                      alt={profile.username}
                      className="w-full h-full rounded-full object-cover bg-secondary"
                    />
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="absolute bottom-2 right-2 p-1 bg-background rounded-full">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 border-background",
                      isOnline(profile.last_seen) ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-muted-foreground/30"
                    )} />
                  </div>

                  {profile.is_pro && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg ring-2 ring-background">
                      PRO MEMBER
                    </div>
                  )}
                </div>

                {/* Name & Bio */}
                <div className="space-y-1 mb-4 mt-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">{profile.username}</h2>
                    {profile.is_verified && <CheckCircle size={20} className="text-yellow-400 fill-blue-500/10" />}
                  </div>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed mx-auto">
                      {profile.bio}
                    </p>
                  )}
                </div>

                {/* Stats Bar - Glass Pill */}
                <div className="flex w-full max-w-sm justify-between bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 backdrop-blur-md">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-lg font-bold text-foreground">{stats.posts}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Posts</span>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-lg font-bold text-foreground">{stats.followers}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Followers</span>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-lg font-bold text-foreground">{stats.following}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Following</span>
                  </div>
                </div>

                {/* Actions */}
                {!isOwnProfile && (
                  <div className="w-full max-w-xs animate-in slide-in-from-bottom-2">
                    <FollowButton
                      targetUserId={userId}
                      onFollowChange={fetchProfileData}
                      size="lg"
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Grid Section */}
              <div className="bg-background/20 border-t border-white/5">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <Grid size={16} className="text-foreground" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Recent Posts</span>
                  </div>

                  {posts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                      {posts.map((post) => {
                        const isVideo = isVideoUrl(post.image_url);
                        return (
                          <div
                            key={post.id}
                            className={cn(
                              "aspect-[4/5] sm:aspect-square relative group overflow-hidden rounded-xl bg-secondary/30",
                              onViewPost && "cursor-pointer"
                            )}
                            onClick={() => {
                              if (onViewPost) {
                                onClose();
                                onViewPost(post.id);
                              }
                            }}
                          >
                            {isVideo ? (
                              <>
                                <video
                                  src={post.image_url}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  muted
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                    <Play size={14} className="text-white fill-white ml-0.5" />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <img
                                src={post.image_url}
                                alt="Post"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                              />
                            )}
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-white/10">
                      <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Grid size={20} className="text-muted-foreground opacity-50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">No posts yet</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground pb-20">
              <p>User not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};