import { useState, useRef } from "react";
import { Heart, Volume2, VolumeX, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { PostHeader } from "./PostHeader";
import { PostActions } from "./PostActions";

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
  const [showMenu, setShowMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = isVideoUrl(post.image_url);
  const isOwnPost = post.user_id === currentUserId;

  const {
    liked,
    likeCount,
    saved,
    likeAnim,
    handleLike,
    handleSave,
    handleDelete,
  } = usePostInteractions({
    postId: post.id,
    userId: currentUserId,
    postUserId: post.user_id,
    initialLiked: post.is_liked,
    initialLikeCount: post.likes_count,
    initialSaved: post.is_saved,
  });

  const handleDeletePost = async () => {
    await handleDelete();
    onPostDeleted?.();
    setShowMenu(false);
  };

  const handleShare = () => {
    const link = `${window.location.origin}?post=${post.id}`;
    // The share logic is handled in PostActions component
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

  return (
    <div
      className={cn(
        "glass rounded-[32px] mb-8 overflow-hidden shadow-xl transition-all border border-white/5 bg-background/20 backdrop-blur-xl",
        post.is_exclusive && "border-amber-500/30 shadow-amber-500/10",
        post.pinned && "border-primary/30 shadow-primary/10"
      )}
    >
      {/* Header */}
      <PostHeader
        username={post.profile?.username || "User"}
        avatarUrl={post.profile?.avatar_url}
        isVerified={post.profile?.is_verified || false}
        isPro={post.profile?.is_pro || false}
        createdAt={post.created_at}
        isExclusive={post.is_exclusive}
        pinned={post.pinned}
        repostedBy={post.reposted_by}
        onViewProfile={onViewProfile}
        userId={post.user_id}
      />

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

      {/* Actions */}
      <PostActions
        liked={liked}
        likeCount={likeCount}
        saved={saved}
        commentsCount={post.comments_count}
        likeAnim={likeAnim}
        onLike={handleLike}
        onSave={handleSave}
        onViewComments={onViewComments}
        onShare={() => handleShare()}
        onMenuToggle={() => setShowMenu(!showMenu)}
        showMenu={showMenu}
        isOwnPost={isOwnPost}
        onDelete={handleDeletePost}
      />

      {/* Caption */}
      <div className="px-4 pb-4">
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