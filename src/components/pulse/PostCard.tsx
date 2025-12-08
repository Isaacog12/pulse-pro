import { useState, useEffect, useRef } from "react";
import { Heart, MessageSquare, Send, Bookmark, MoreVertical, CheckCircle, Pin, Lock, Repeat, Share2, Trash2, Volume2, VolumeX, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // Ensure you have this import

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  filter: string | null;
  is_exclusive: boolean;
  pinned: boolean;
  reposted_by: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_pro: boolean;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onViewComments: () => void;
  onPostDeleted?: () => void;
  onViewProfile?: (userId: string) => void;
}

// Helper to check if URL is video
const isVideoUrl = (url: string) => {
  return url.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const PostCard = ({
  post,
  currentUserId,
  onViewComments,
  onPostDeleted,
  onViewProfile,
}: PostCardProps) => {
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.is_saved);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = isVideoUrl(post.image_url);

  useEffect(() => {
    setLiked(post.is_liked);
    setLikeCount(post.likes_count);
    setSaved(post.is_saved);
  }, [post]);

  const handleLike = async () => {
    const isNowLiked = !liked;
    setLiked(isNowLiked);
    setLikeCount((prev) => (isNowLiked ? prev + 1 : prev - 1));
    
    if (isNowLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 1000);
      await supabase.from("likes").insert({ post_id: post.id, user_id: currentUserId });
      
      // Create notification for post owner (if not self)
      if (post.user_id !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          from_user_id: currentUserId,
          type: "like",
          post_id: post.id,
        });
      }
    } else {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    }
  };

  const handleSave = async () => {
    const isNowSaved = !saved;
    setSaved(isNowSaved);
    
    if (isNowSaved) {
      await supabase.from("saved_posts").insert({ post_id: post.id, user_id: currentUserId });
    } else {
      await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    }
  };

  const handleDelete = async () => {
    await supabase.from("posts").delete().eq("id", post.id);
    setShowMenu(false);
    onPostDeleted?.();
  };

  // ✅ FIXED SHARE LOGIC
  const handleShare = async () => {
    // 1. Create Deep Link (e.g., https://yourapp.com/?post=123)
    // We use window.location.origin to get the base URL automatically
    const link = `${window.location.origin}?post=${post.id}`;

    // 2. Try Mobile Native Share
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.profile?.username}`,
          text: post.caption || "Check out this post on Pulse",
          url: link,
        });
      } catch (err) {
        console.log("Share canceled");
      }
    } else {
      // 3. Fallback: Copy to Clipboard (Desktop)
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!");
    }
    
    setShowMenu(false);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const isOwner = currentUserId === post.user_id;

  return (
    <div
      className={cn(
        "glass rounded-3xl mb-6 overflow-hidden shadow-xl transition-all hover:border-muted-foreground/30",
        post.is_exclusive && "border-yellow-500/50 shadow-yellow-500/10",
        post.pinned && "border-primary/50"
      )}
    >
      {post.reposted_by && (
        <div className="flex items-center px-4 pt-3 pb-1 text-xs text-muted-foreground">
          <Repeat size={12} className="mr-2 text-green-400" />
          Reposted by <span className="font-bold text-foreground ml-1">{post.reposted_by}</span>
        </div>
      )}

      <div className="flex items-center justify-between p-4 relative">
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => onViewProfile?.(post.user_id)}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full p-0.5",
              post.profile?.is_verified
                ? "bg-gradient-to-tr from-yellow-400 to-yellow-600"
                : "bg-gradient-to-br from-muted to-background"
            )}
          >
            <img
              src={post.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
              className="w-full h-full rounded-full object-cover bg-secondary"
              alt=""
            />
          </div>
          <div>
            <div className="flex items-center">
              <span className="font-bold text-foreground mr-1 hover:underline">{post.profile?.username || "User"}</span>
              {post.profile?.is_verified && (
                <CheckCircle size={14} className="text-yellow-400 fill-current" />
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              {post.pinned && <Pin size={10} className="mr-1 text-primary" />}
              {post.is_exclusive && <Lock size={10} className="mr-1 text-yellow-500" />}
              {formatTime(post.created_at)}
            </div>
          </div>
        </div>

        <Button variant="icon" size="iconSm" onClick={() => setShowMenu(!showMenu)}>
          <MoreVertical size={20} />
        </Button>

        {showMenu && (
          <div className="absolute right-4 top-14 glass-strong rounded-xl shadow-2xl z-20 w-48 overflow-hidden animate-scale-in">
            {isOwner && (
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-3 text-destructive hover:bg-secondary flex items-center text-sm transition-colors"
              >
                <Trash2 size={16} className="mr-2" /> Delete Post
              </button>
            )}
            {/* Share Button in Menu */}
            <button
              onClick={handleShare}
              className="w-full text-left px-4 py-3 text-foreground hover:bg-secondary flex items-center text-sm transition-colors"
            >
              <Share2 size={16} className="mr-2" /> Share Link
            </button>
          </div>
        )}
      </div>

      <div className="relative w-full bg-background" onDoubleClick={handleLike}>
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={post.image_url}
              className="w-full h-auto max-h-[600px] object-contain mx-auto"
              muted={isMuted}
              playsInline
              loop
              onClick={togglePlayPause}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="text-white" size={18} />
                ) : (
                  <Volume2 className="text-white" size={18} />
                )}
              </button>
            </div>
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="p-4 rounded-full bg-black/50">
                  <Play className="text-white" size={32} />
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={post.image_url}
            className={cn("w-full h-auto max-h-[600px] object-contain mx-auto", post.filter)}
            alt="Post"
          />
        )}
        {likeAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart size={100} className="text-accent fill-current animate-heart-pop drop-shadow-2xl" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button variant="icon" size="icon" onClick={handleLike} className="transition-transform active:scale-125">
              <Heart size={28} className={cn(liked ? "text-accent fill-current" : "text-foreground")} />
            </Button>
            <Button
              variant="icon"
              size="icon"
              onClick={onViewComments}
              className="transition-transform active:scale-125 hover:text-primary"
            >
              <MessageSquare size={28} />
            </Button>
            {/* Share Button in Action Bar */}
            <Button variant="icon" size="icon" onClick={handleShare} className="transition-transform active:scale-125 hover:text-green-400">
              <Send size={28} />
            </Button>
          </div>
          <Button variant="icon" size="icon" onClick={handleSave} className="transition-transform active:scale-125">
            <Bookmark size={28} className={cn(saved ? "text-yellow-400 fill-current" : "text-foreground")} />
          </Button>
        </div>

        <div className="font-bold text-foreground mb-2">{likeCount} likes</div>
        <div className="text-foreground mb-2">
          <span 
            className="font-bold mr-2 cursor-pointer hover:underline"
            onClick={() => onViewProfile?.(post.user_id)}
          >
            {post.profile?.username}
          </span>
          {post.caption}
        </div>
        <button
          onClick={onViewComments}
          className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
        >
          View all {post.comments_count} comments
        </button>
      </div>
    </div>
  );
};