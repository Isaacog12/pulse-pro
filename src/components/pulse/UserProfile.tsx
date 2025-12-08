import { useState, useEffect } from "react";
import { Settings, CheckCircle, Grid, Bookmark, Zap, Edit3, LogOut, MapPin, Calendar, Share2, MoreHorizontal } from "lucide-react";
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
    const { data } = await supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPosts(data || []);
  };

  const fetchSavedPosts = async () => {
    if (!user) return;
    const { data } = await supabase.from("saved_posts").select("post_id, posts(*)").eq("user_id", user.id);
    setSavedPosts(data?.map((s) => s.posts) || []);
  };

  const fetchFollowCounts = async () => {
    if (!user) return;
    const { count: followers } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id);
    const { count: following } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", user.id);
    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const displayPosts = activeTab === "posts" ? posts : savedPosts;

  if (!user || !profile) return null;

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6 relative">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Profile Card */}
      <div className="relative mt-4 sm:mt-8 mb-8 group">
        
        {/* Glass Container */}
        <div className={cn(
          "relative overflow-hidden rounded-[32px] bg-background/40 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-500",
          profile.is_pro && "border-amber-500/20 shadow-amber-500/5"
        )}>
          
          {/* Banner Gradient */}
          <div className="h-32 sm:h-48 w-full bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            
            {/* Top Actions */}
            <div className="absolute top-4 right-4 flex gap-2 z-20">
              <Button size="icon" variant="ghost" className="rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md border border-white/10" onClick={onOpenSettings}>
                <Settings size={18} />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full bg-black/20 hover:bg-red-500/20 text-white hover:text-red-400 backdrop-blur-md border border-white/10" onClick={signOut}>
                <LogOut size={18} />
              </Button>
            </div>
          </div>

          <div className="px-6 pb-8 relative">
            
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 md:-mt-16">
              
              {/* Avatar */}
              <div className="relative group/avatar">
                <div className={cn(
                  "absolute -inset-1 rounded-full blur opacity-50 transition-opacity duration-500 group-hover/avatar:opacity-100",
                  profile.is_pro ? "bg-gradient-to-tr from-amber-400 to-yellow-600" : "bg-gradient-to-tr from-blue-500 to-purple-500"
                )} />
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-[4px] bg-background">
                  <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                    alt={profile.username}
                    className="w-full h-full rounded-full object-cover bg-secondary"
                  />
                </div>
                {profile.is_pro && (
                  <div className="absolute bottom-0 right-0 sm:right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full shadow-lg border-2 border-background flex items-center gap-1">
                    <Zap size={10} fill="currentColor" /> PRO
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center md:text-left space-y-2 min-w-0 w-full">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
                  
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                      {profile.username}
                      {profile.is_verified && <CheckCircle className="text-blue-500 fill-blue-500/10" size={24} />}
                    </h1>
                    {profile.bio && (
                      <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-md mx-auto md:mx-0 leading-relaxed">
                        {profile.bio}
                      </p>
                    )}
                    
                    {/* Metadata (Optional) */}
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-xs text-muted-foreground/60">
                      <span className="flex items-center gap-1"><MapPin size={12} /> Global</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> Joined 2024</span>
                    </div>
                  </div>

                  {/* Desktop Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowEditModal(true)} 
                      className="bg-secondary/50 hover:bg-secondary text-foreground backdrop-blur-md border border-white/10 rounded-xl"
                    >
                      <Edit3 size={16} className="mr-2" /> Edit Profile
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-xl border border-white/5">
                      <Share2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

            {/* Stats Row */}
            <div className="flex justify-around md:justify-start md:gap-16">
              <StatItem label="Posts" value={posts.length} />
              <StatItem label="Followers" value={followersCount} />
              <StatItem label="Following" value={followingCount} />
            </div>

          </div>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:rounded-2xl sm:border sm:top-4 transition-all">
        <div className="flex justify-center max-w-md mx-auto">
          <TabButton 
            active={activeTab === "posts"} 
            onClick={() => setActiveTab("posts")} 
            icon={Grid} 
            label="Posts" 
          />
          <TabButton 
            active={activeTab === "saved"} 
            onClick={() => setActiveTab("saved")} 
            icon={Bookmark} 
            label="Saved" 
          />
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-3 gap-1 sm:gap-4 pb-20">
        {displayPosts.length > 0 ? (
          displayPosts.map((post) => (
            <div 
              key={post.id} 
              className="group relative aspect-square bg-secondary/30 rounded-lg sm:rounded-2xl overflow-hidden cursor-pointer"
            >
              <img 
                src={post.image_url} 
                alt="" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))
        ) : (
          <div className="col-span-3 py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-white/10 rounded-3xl">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              {activeTab === "posts" ? <Grid size={24} /> : <Bookmark size={24} />}
            </div>
            <p className="font-medium">No {activeTab} yet</p>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditProfileModal
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={() => {
            fetchUserPosts();
            // You might want to refresh profile data here too
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// Helper Components
// ==========================================

const StatItem = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col items-center md:items-start cursor-pointer group">
    <span className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
      {value}
    </span>
    <span className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">
      {label}
    </span>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all relative",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    )}
  >
    <Icon size={18} className={cn(active && "text-primary")} />
    <span className="hidden sm:inline">{label}</span>
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_theme(colors.primary.DEFAULT)]" />
    )}
  </button>
);