import { useState, useEffect } from "react";
import { Search, UserPlus, Loader2, Sparkles, X, Heart, MapPin, TrendingUp, Grid3X3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  image_url: string;
  // We removed likes_count/comments_count to prevent database errors
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
  posts?: Post[]; 
  onViewProfile: (userId: string) => void;
  onViewPost: (postId: string) => void;
}

export const ExploreView = ({ onViewProfile, onViewPost }: ExploreViewProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      checkIfNewUser();
      fetchSuggestedUsers();
      fetchGlobalPosts();
    }
  }, [user]);

  // ✅ FIXED: Safe Fetch Function (No DB Changes Required)
  const fetchGlobalPosts = async () => {
    if (!user) return;
    setLoadingPosts(true);

    // 1. Fetch ONLY the columns we know exist (id, image_url)
    // We do NOT ask for likes_count here to avoid errors.
    const { data, error } = await supabase
      .from("posts")
      .select("id, image_url, user_id") 
      .neq("user_id", user.id) // Don't show my own posts
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      console.error("Explore Fetch Error:", error);
    } else if (data) {
      // 2. Client-Side Shuffle
      // This creates the "Random Explore" effect without complex DB plugins
      const shuffled = [...data].sort(() => 0.5 - Math.random());
      setExplorePosts(shuffled);
    }
    setLoadingPosts(false);
  };

  const checkIfNewUser = async () => {
    if (!user) return;
    // We wrap these in try/catch to be safe, but they should work if tables exist
    try {
      const { count: followersCount } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id);
      const { count: followingCount } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", user.id);
      setIsNewUser((followersCount || 0) === 0 && (followingCount || 0) === 0);
    } catch (e) {
      console.log("Stats error", e);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (!user) return;
    try {
      const { data: following } = await supabase.from("followers").select("following_id").eq("follower_id", user.id);
      const followingIds = following?.map((f) => f.following_id) || [];

      const { data } = await supabase
        .from("profiles")
        .select(`id, username, avatar_url, bio, is_verified, is_pro`)
        .neq("id", user.id)
        .not("id", "in", followingIds.length > 0 ? `(${followingIds.join(",")})` : "()")
        .limit(isNewUser ? 8 : 4);

      if (data) setSuggestedUsers(data);
    } catch (e) {
      console.log("Suggestion error", e);
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

    if (!error && data) setSearchResults(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-24 sm:pb-8 relative animate-in fade-in duration-500">
      
      {/* Sticky Header & Search */}
      <div className="sticky top-0 z-40 px-4 py-4 -mx-4 mb-6 bg-background/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-3xl mx-auto">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-background/40 border border-white/10 rounded-2xl flex items-center shadow-sm group-focus-within:border-primary/30 group-focus-within:shadow-lg transition-all duration-300">
              <Search className="ml-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <Input
                placeholder="Search for people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none bg-transparent h-12 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="mr-3 p-1.5 hover:bg-secondary rounded-full text-muted-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showResults && (
              <>
                <div className="absolute top-full left-0 right-0 mt-3 bg-background/80 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-200 z-50">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/50 animate-pulse" />
                          <div className="h-4 w-24 bg-secondary/50 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No users found</p>
                    </div>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                      {searchResults.map((profile) => (
                        <UserRow
                          key={profile.id}
                          profile={profile}
                          onFollowChange={() => { fetchSuggestedUsers(); checkIfNewUser(); }}
                          onViewProfile={onViewProfile}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="fixed inset-0 top-[80px] bg-black/40 backdrop-blur-[2px] z-40 animate-in fade-in" onClick={() => setShowResults(false)} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-1">
        
        {/* Discovery Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent flex items-center gap-2">
              <TrendingUp size={20} className="text-yellow-400" /> Explore
            </h3>
          </div>
          
          {loadingPosts ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-4 pb-10">
               {[1,2,3,4,5,6,7,8,9].map(i => (
                 <div key={i} className="aspect-square bg-secondary/20 rounded-xl animate-pulse" />
               ))}
            </div>
          ) : explorePosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
               <Grid3X3 size={32} className="mb-2 opacity-50" />
               <p className="font-medium">No posts found.</p>
               <p className="text-xs mt-1 max-w-[200px] text-center opacity-70">
                 (If posts exist, check your database Row Level Security policies)
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-4 pb-10">
              {explorePosts.map((post) => (
                <div
                  key={post.id}
                  className="group relative aspect-[4/5] sm:aspect-square cursor-pointer overflow-hidden rounded-xl bg-secondary/20 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
                  onClick={() => onViewPost(post.id)}
                >
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  
                  {/* Modern Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                    <div className="flex items-center gap-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                      <div className="flex items-center gap-1.5 text-white/90">
                        <Heart size={18} className="fill-white/20" />
                        {/* We hide the count since we aren't fetching it to avoid errors */}
                        <span className="text-xs font-bold">View</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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