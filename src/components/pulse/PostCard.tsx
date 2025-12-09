import { useState, useEffect, useRef } from "react";
import { Heart, MessageSquare, Send, Bookmark, MoreVertical, CheckCircle, Pin, Lock, Repeat, Share2, Trash2, Volume2, VolumeX, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const handleShare = async () => {
    const link = `${window.location.origin}?post=${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.profile?.username}`,
          text: post.caption || "Check out this post on Glint",
          url: link,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
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
        "glass rounded-[32px] mb-8 overflow-hidden shadow-xl transition-all border border-white/5 bg-background/20 backdrop-blur-xl",
        post.is_exclusive && "border-amber-500/30 shadow-amber-500/10",
        post.pinned && "border-primary/30 shadow-primary/10"
      )}
    >
      {post.reposted_by && (
        <div className="flex items-center px-5 pt-4 pb-1 text-xs text-muted-foreground font-medium">
          <Repeat size={12} className="mr-2 text-green-400" />
          Reposted by <span className="text-foreground ml-1">{post.reposted_by}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 px-5 relative">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => onViewProfile?.(post.user_id)}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full p-[2px] transition-transform group-hover:scale-105",
              post.profile?.is_verified
                ? "bg-gradient-to-tr from-yellow-400 to-orange-500"
                : "bg-gradient-to-tr from-white/10 to-transparent"
            )}
          >
            <img
              src={post.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
              className="w-full h-full rounded-full object-cover bg-secondary border border-background"
              alt=""
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground text-sm hover:text-primary transition-colors">{post.profile?.username || "User"}</span>
              {post.profile?.is_verified && (
                <CheckCircle size={14} className="text-yellow-400 fill-yellow-400/20" />
              )}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center font-medium">
              {post.pinned && <Pin size={10} className="mr-1.5 text-primary fill-primary/20" />}
              {post.is_exclusive && <Lock size={10} className="mr-1.5 text-amber-500 fill-amber-500/20" />}
              {formatTime(post.created_at)}
            </div>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-white/5 text-muted-foreground"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical size={20} />
        </Button>

        {showMenu && (
          <div className="absolute right-5 top-12 bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 w-48 overflow-hidden animate-in zoom-in-95 duration-200">
            {isOwner && (
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-500/10 flex items-center text-sm transition-colors font-medium"
              >
                <Trash2 size={16} className="mr-2" /> Delete Post
              </button>
            )}
            <button
              onClick={handleShare}
              className="w-full text-left px-4 py-3 text-foreground hover:bg-white/5 flex items-center text-sm transition-colors font-medium"
            >
              <Share2 size={16} className="mr-2" /> Share Link
            </button>
          </div>
        )}
      </div>

      {/* Media Content */}
      <div className="relative w-full bg-black/5" onDoubleClick={handleLike}>
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
                className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="text-white" size={16} />
                ) : (
                  <Volume2 className="text-white" size={16} />
                )}
              </button>
            </div>
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="p-4 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                  <Play className="text-white ml-1" size={32} fill="white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={post.image_url}
            className={cn("w-full h-auto max-h-[600px] object-contain mx-auto", post.filter)}
            alt="Post"
            loading="lazy"
          />
        )}
        
        {/* Like Animation Overlay */}
        {likeAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart size={120} className="text-white/90 fill-white/90 animate-heart-pop drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 px-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLike} 
              className="hover:bg-transparent active:scale-125 transition-transform"
            >
              <Heart 
                size={26} 
                className={cn(
                  "transition-colors duration-300", 
                  liked ? "fill-red-500 text-red-500" : "text-foreground stroke-[1.5px]"
                )} 
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onViewComments}
              className="hover:bg-transparent active:scale-125 transition-transform hover:text-primary"
            >
              <MessageSquare size={26} className="stroke-[1.5px]" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleShare} 
              className="hover:bg-transparent active:scale-125 transition-transform hover:text-green-400"
            >
              <Send size={26} className="stroke-[1.5px] -rotate-45 mb-1 ml-1" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSave} 
            className="hover:bg-transparent active:scale-125 transition-transform"
          >
            <Bookmark 
              size={26} 
              className={cn(
                "stroke-[1.5px] transition-colors", 
                saved ? "fill-amber-400 text-amber-400" : "text-foreground"
              )} 
            />
          </Button>
        </div>

        {/* Likes & Caption */}
        <div className="font-bold text-sm text-foreground mb-2 flex items-center gap-1">
          {likeCount > 0 ? `${likeCount} likes` : <span className="text-muted-foreground font-normal">Be the first to like</span>}
        </div>

        <div className="text-sm text-foreground/90 leading-relaxed mb-2">
          <span 
            className="font-bold mr-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onViewProfile?.(post.user_id)}
          >
            {post.profile?.username}
          </span>
          {post.caption}
        </div>

        <button
          onClick={onViewComments}
          className="text-muted-foreground/60 text-xs font-medium hover:text-muted-foreground transition-colors"
        >
          View all {post.comments_count} comments
        </button>
      </div>
    </div>
  );
};