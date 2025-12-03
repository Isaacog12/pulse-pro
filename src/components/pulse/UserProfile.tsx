import { useState } from "react";
import { Settings, CheckCircle, Grid, Bookmark, Zap, Edit3, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  status?: string;
  isPro?: boolean;
  isVerified?: boolean;
  followers?: string[];
  following?: string[];
}

interface Post {
  id: string;
  imageUrl: string;
  likes: string[];
  comments: any[];
  pinned?: boolean;
}

interface UserProfileProps {
  user: User;
  currentUser: User;
  isOwnProfile: boolean;
  posts: Post[];
  savedPosts: Post[];
  onOpenSettings: () => void;
}

export const UserProfile = ({
  user,
  currentUser,
  isOwnProfile,
  posts,
  savedPosts,
  onOpenSettings,
}: UserProfileProps) => {
  const [isFollowing, setIsFollowing] = useState(user.followers?.includes(currentUser.uid));
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [isEditing, setIsEditing] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const displayPosts = activeTab === "posts" ? posts : savedPosts;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Profile Header */}
      <div
        className={cn(
          "glass rounded-3xl p-6 mb-6 relative overflow-hidden transition-all duration-500",
          user.isPro ? "border-yellow-500/50 shadow-yellow-500/10" : "border-border"
        )}
      >
        {/* Background gradient */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/30 to-accent/30" />

        {/* Settings button */}
        {isOwnProfile && (
          <button
            onClick={onOpenSettings}
            className="absolute top-4 right-4 z-20 p-2 glass rounded-full hover:bg-secondary transition-colors"
          >
            <Settings size={20} className="text-foreground" />
          </button>
        )}

        {/* Profile content */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-16">
          {/* Avatar */}
          <div className="relative group">
            <div
              className={cn(
                "w-28 h-28 rounded-full p-1",
                user.isPro
                  ? "bg-gradient-to-tr from-yellow-400 to-yellow-600"
                  : "bg-gradient-pulse"
              )}
            >
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-full h-full rounded-full object-cover bg-secondary border-4 border-background"
              />
            </div>
            {isOwnProfile && (
              <button className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Camera size={16} />
              </button>
            )}
            {user.isPro && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-background text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-lg">
                <Zap size={12} className="mr-1 fill-current" /> PRO
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <h2 className="text-2xl font-bold text-foreground">{user.displayName}</h2>
              {user.isVerified && <CheckCircle size={20} className="text-yellow-400 fill-current" />}
            </div>
            {user.status && (
              <p className="text-sm text-primary mb-2">{user.status}</p>
            )}
            {user.bio && (
              <p className="text-muted-foreground text-sm mb-4 max-w-md">{user.bio}</p>
            )}

            {/* Stats */}
            <div className="flex justify-center sm:justify-start gap-8 mb-4">
              <div className="text-center">
                <div className="font-bold text-foreground">{posts.length}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">{user.followers?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">{user.following?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </div>
            </div>

            {/* Actions */}
            {isOwnProfile ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} className="mr-2" />
                Edit Profile
              </Button>
            ) : (
              <Button
                variant={isFollowing ? "outline" : "gradient"}
                size="sm"
                onClick={handleFollow}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
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
        {isOwnProfile && (
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
        )}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {displayPosts.map((post) => (
          <div
            key={post.id}
            className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg"
          >
            <img
              src={post.imageUrl}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <span className="text-foreground font-bold text-sm flex items-center">
                ❤️ {post.likes?.length || 0}
              </span>
              <span className="text-foreground font-bold text-sm flex items-center">
                💬 {post.comments?.length || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {displayPosts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm">Start sharing your moments!</p>
        </div>
      )}
    </div>
  );
};
