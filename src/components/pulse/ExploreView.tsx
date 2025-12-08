import { useState, useEffect } from "react";
import { Search, UserPlus, Loader2, Sparkles, X, Heart, MessageCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface Post {
  id: string;
  image_url: string;
  likes_count?: number; // Optional: for grid overlay
  comments_count?: number;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_pro: boolean;
  last_seen?: string | null;
}

interface ExploreViewProps {
  posts: Post[];
  onViewProfile: (userId: string) => void;
  onViewPost: (postId: string) => void;
}

export const ExploreView = ({ posts, onViewProfile, onViewPost }: ExploreViewProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 400); // 400ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      checkIfNewUser();
      fetchSuggestedUsers();
    }
  }, [user]);

  const checkIfNewUser = async () => {
    if (!user) return;
    const { count: followersCount } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id);
    const { count: followingCount } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", user.id);
    setIsNewUser((followersCount || 0) === 0 && (followingCount || 0) === 0);
  };

  const fetchSuggestedUsers = async () => {
    if (!user) return;
    
    // Get currently following
    const { data: following } = await supabase.from("followers").select("following_id").eq("follower_id", user.id);
    const followingIds = following?.map((f) => f.following_id) || [];

    // Fetch potential suggestions
    const { data, error } = await supabase
      .from("profiles")
      .select(`id, username, avatar_url, bio, is_verified, is_pro`)
      .neq("id", user.id)
      .not("id", "in", followingIds.length > 0 ? `(${followingIds.join(",")})` : "()")
      .limit(isNewUser ? 8 : 4);

    if (!error && data) {
      setSuggestedUsers(data);
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, is_verified, is_pro")
      .neq("id", user?.id)
      .ilike("username", `%${searchQuery}%`)
      .limit(10);

    if (!error && data) {
      setSearchResults(data);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Explore
        </h2>
      </div>

      {/* Search Bar - Floating Glass */}
      <div className="relative mb-8 z-30">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <Input
            placeholder="Search for people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 bg-background/50 backdrop-blur-xl border-border/50 focus:border-primary/50 focus:bg-background/80 transition-all rounded-2xl shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full transition-colors"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <>
            <div className="absolute top-full left-0 right-0 mt-2 glass-strong border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              {loading ? (
                <div className="p-4 space-y-3">
                   {/* Skeletons */}
                   {[1,2,3].map(i => (
                     <div key={i} className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-secondary/70 animate-pulse" />
                       <div className="h-4 w-24 bg-secondary/70 rounded animate-pulse" />
                     </div>
                   ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                   <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                   <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
                  {searchResults.map((profile) => (
                    <UserRow
                      key={profile.id}
                      profile={profile}
                      onFollowChange={() => {
                        fetchSuggestedUsers();
                        checkIfNewUser();
                      }}
                      onViewProfile={onViewProfile}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Backdrop */}
            <div className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-sm" onClick={() => setShowResults(false)} />
          </>
        )}
      </div>

      {/* Welcome Section (New Users) */}
      {isNewUser && suggestedUsers.length > 0 && !searchQuery && (
        <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl p-6 mb-6 border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/30">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-primary/20 backdrop-blur-md">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold">Welcome to Pulse!</h3>
              </div>
              <p className="text-muted-foreground mb-4 max-w-sm text-sm">
                Your feed is looking a little empty. Follow some popular creators to get started.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <UserPlus size={16} /> Suggested for you
            </h3>
            <div className="bg-background/40 backdrop-blur-lg border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
              {suggestedUsers.map((profile) => (
                <UserRow
                  key={profile.id}
                  profile={profile}
                  onFollowChange={fetchSuggestedUsers}
                  onViewProfile={onViewProfile}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Discovery Grid */}
      <div className="space-y-4">
         {!isNewUser && (
           <h3 className="text-lg font-semibold flex items-center gap-2">
             <MapPin size={18} className="text-primary" /> Discover
           </h3>
         )}
         
         <div className="grid grid-cols-3 gap-1 sm:gap-4 pb-10">
           {posts.map((post) => (
             <div
               key={post.id}
               className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-secondary/30"
               onClick={() => onViewPost(post.id)}
             >
               <img
                 src={post.image_url}
                 alt="Post"
                 className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                 loading="lazy"
               />
               
               {/* Hover Overlay */}
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Heart size={18} fill="white" />
                    <span className="text-sm font-bold">Like</span>
                  </div>
               </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
};

// Sub-component for Cleaner Code
const UserRow = ({ profile, onFollowChange, onViewProfile }: { profile: UserProfile, onFollowChange: () => void, onViewProfile: (id: string) => void }) => {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => onViewProfile(profile.id)}>
        <div className="relative">
           <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-transparent to-transparent group-hover:from-primary group-hover:to-purple-400 transition-colors">
             <img
               src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
               alt={profile.username}
               className="w-full h-full rounded-full object-cover bg-secondary border-2 border-background"
             />
           </div>
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm text-foreground truncate">{profile.username}</p>
            {profile.is_verified && <span className="text-blue-500 text-[10px] bg-blue-500/10 p-0.5 rounded-full px-1">✓</span>}
            {profile.is_pro && <span className="text-[9px] bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-1.5 py-0.5 rounded font-bold">PRO</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
            {profile.bio || "No bio yet"}
          </p>
        </div>
      </div>
      <div className="pl-2">
        <FollowButton targetUserId={profile.id} onFollowChange={onFollowChange} size="sm" />
      </div>
    </div>
  );
};