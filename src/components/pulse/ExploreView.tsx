import { useState, useEffect } from "react";
import { Search, UserPlus, Loader2, Sparkles, X, Heart, MapPin, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  image_url: string;
  likes_count?: number;
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
    const { data: following } = await supabase.from("followers").select("following_id").eq("follower_id", user.id);
    const followingIds = following?.map((f) => f.following_id) || [];

    const { data, error } = await supabase
      .from("profiles")
      .select(`id, username, avatar_url, bio, is_verified, is_pro`)
      .neq("id", user.id)
      .not("id", "in", followingIds.length > 0 ? `(${followingIds.join(",")})` : "()")
      .limit(isNewUser ? 8 : 4);

    if (!error && data) setSuggestedUsers(data);
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
    <div className="min-h-screen pb-24 sm:pb-8 relative">
      
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
        
        {/* New User Welcome */}
        {isNewUser && suggestedUsers.length > 0 && !searchQuery && (
          <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden rounded-[32px] p-8 mb-8 border border-white/10 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-background shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-20 animate-pulse" style={{ animationDuration: '4s' }}>
                <Sparkles size={140} className="text-blue-400" />
              </div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/5 text-xs font-medium text-white mb-4 backdrop-blur-md">
                  <Sparkles size={12} className="text-yellow-400" /> New to Pulse?
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Welcome Aboard!</h3>
                <p className="text-white/60 mb-6 max-w-sm text-sm leading-relaxed">
                  Your feed is looking a little empty. Here are some top creators to help you get started.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-2">
                <UserPlus size={14} /> Suggested for you
              </h3>
              <div className="bg-background/30 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg">
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
        <div className="space-y-6">
          {!isNewUser && (
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent flex items-center gap-2">
                <TrendingUp size={20} className="text-yellow-400" /> Explore
              </h3>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-4">
            {posts.map((post) => (
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
                      <span className="text-xs font-bold">Like</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Reusable Glassy User Row
// ==========================================
const UserRow = ({ profile, onFollowChange, onViewProfile }: { profile: UserProfile, onFollowChange: () => void, onViewProfile: (id: string) => void }) => {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-all duration-300 group cursor-pointer" onClick={() => onViewProfile(profile.id)}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        
        {/* Avatar with Glow */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-md group-hover:blur-lg transition-all duration-500 opacity-0 group-hover:opacity-100" />
          <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-white/5 to-white/10 group-hover:from-blue-500 group-hover:to-purple-500 transition-colors duration-500">
            <img
              src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
              alt={profile.username}
              className="w-full h-full rounded-full object-cover bg-background border-2 border-background"
            />
          </div>
        </div>
        
        {/* Text Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-semibold text-sm text-foreground truncate group-hover:text-yello-400 transition-colors">{profile.username}</p>
            {profile.is_verified && <span className="text-yellow-400 text-[10px] bg-blue-500/10 p-0.5 rounded-full px-1">✓</span>}
            {profile.is_pro && (
              <span className="text-[9px] bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-1.5 py-px rounded-full font-bold shadow-sm">
                PRO
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate max-w-[200px] group-hover:text-muted-foreground/80">
            {profile.bio || "No bio yet"}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="pl-3" onClick={(e) => e.stopPropagation()}>
        <FollowButton targetUserId={profile.id} onFollowChange={onFollowChange} size="sm" />
      </div>
    </div>
  );
};