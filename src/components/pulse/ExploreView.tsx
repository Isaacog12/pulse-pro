import { useState, useEffect } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  image_url: string;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_pro: boolean;
}

interface ExploreViewProps {
  posts: Post[];
}

export const ExploreView = ({ posts }: ExploreViewProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchSuggestedUsers();
  }, [user]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  const fetchSuggestedUsers = async () => {
    if (!user) return;

    // Get users the current user is NOT following
    const { data: following } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = following?.map((f) => f.following_id) || [];

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, is_verified, is_pro")
      .neq("id", user.id)
      .not("id", "in", followingIds.length > 0 ? `(${followingIds.join(",")})` : "()")
      .limit(5);

    if (data) {
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
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Explore</h2>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
          className="pl-10"
        />

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-2xl overflow-hidden z-20 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                No users found
              </p>
            ) : (
              searchResults.map((profile) => (
                <UserRow
                  key={profile.id}
                  profile={profile}
                  onFollowChange={fetchSuggestedUsers}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowResults(false)}
        />
      )}

      {/* Suggested Users */}
      {suggestedUsers.length > 0 && !showResults && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-primary" />
            Suggested for you
          </h3>
          <div className="glass rounded-2xl overflow-hidden">
            {suggestedUsers.map((profile) => (
              <UserRow
                key={profile.id}
                profile={profile}
                onFollowChange={fetchSuggestedUsers}
              />
            ))}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <h3 className="text-lg font-semibold text-foreground mb-4">Discover Posts</h3>
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post) => (
          <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg">
            <img src={post.image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
          </div>
        ))}
      </div>
    </div>
  );
};

interface UserRowProps {
  profile: UserProfile;
  onFollowChange: () => void;
}

const UserRow = ({ profile, onFollowChange }: UserRowProps) => {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <img
          src={
            profile.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`
          }
          alt={profile.username}
          className="w-12 h-12 rounded-full object-cover bg-secondary"
        />
        <div>
          <div className="flex items-center gap-1">
            <p className="font-medium text-foreground">{profile.username}</p>
            {profile.is_verified && (
              <span className="text-yellow-400">✓</span>
            )}
            {profile.is_pro && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 rounded">PRO</span>
            )}
          </div>
          {profile.bio && (
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {profile.bio}
            </p>
          )}
        </div>
      </div>
      <FollowButton
        targetUserId={profile.id}
        onFollowChange={onFollowChange}
        size="sm"
      />
    </div>
  );
};
