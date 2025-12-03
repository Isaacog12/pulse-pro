import { useState } from "react";
import { Heart, MessageSquare, Send, Bookmark, MoreVertical, CheckCircle, Pin, Lock, Repeat, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  username: string;
  userAvatar: string;
  userIsVerified?: boolean;
  imageUrl: string;
  caption: string;
  likes: string[];
  comments: Comment[];
  timestamp: Date;
  pinned?: boolean;
  isExclusive?: boolean;
  repostedBy?: string;
}

interface Comment {
  id: string;
  text: string;
  username: string;
  avatar: string;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  isSaved?: boolean;
  onLike: (postId: string, liked: boolean) => void;
  onViewComments: (post: Post) => void;
  onSave: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export const PostCard = ({
  post,
  currentUserId,
  isSaved,
  onLike,
  onViewComments,
  onSave,
  onDelete,
}: PostCardProps) => {
  const [liked, setLiked] = useState(post.likes?.includes(currentUserId));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = () => {
    const isNowLiked = !liked;
    setLiked(isNowLiked);
    setLikeCount((prev) => (isNowLiked ? prev + 1 : prev - 1));
    if (isNowLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 1000);
    }
    onLike(post.id, isNowLiked);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(`Check out this post by ${post.username}`);
    setShowMenu(false);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const isOwner = currentUserId === post.username;

  return (
    <div
      className={cn(
        "glass rounded-3xl mb-6 overflow-hidden shadow-xl transition-all hover:border-muted-foreground/30",
        post.isExclusive && "border-yellow-500/50 shadow-yellow-500/10",
        post.pinned && "border-primary/50"
      )}
    >
      {/* Repost indicator */}
      {post.repostedBy && (
        <div className="flex items-center px-4 pt-3 pb-1 text-xs text-muted-foreground">
          <Repeat size={12} className="mr-2 text-green-400" />
          Reposted by <span className="font-bold text-foreground ml-1">{post.repostedBy}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 relative">
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full p-0.5",
              post.userIsVerified
                ? "bg-gradient-to-tr from-yellow-400 to-yellow-600"
                : "bg-gradient-to-br from-muted to-background"
            )}
          >
            <img
              src={post.userAvatar}
              className="w-full h-full rounded-full object-cover bg-secondary"
              alt=""
            />
          </div>
          <div>
            <div className="flex items-center">
              <span className="font-bold text-foreground mr-1">{post.username}</span>
              {post.userIsVerified && (
                <CheckCircle size={14} className="text-yellow-400 fill-current" />
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              {post.pinned && <Pin size={10} className="mr-1 text-primary" />}
              {post.isExclusive && <Lock size={10} className="mr-1 text-yellow-500" />}
              {formatTime(post.timestamp)}
            </div>
          </div>
        </div>

        <Button
          variant="icon"
          size="iconSm"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical size={20} />
        </Button>

        {/* Menu dropdown */}
        {showMenu && (
          <div className="absolute right-4 top-14 glass-strong rounded-xl shadow-2xl z-20 w-48 overflow-hidden animate-scale-in">
            {isOwner && onDelete && (
              <button
                onClick={() => {
                  onDelete(post.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-destructive hover:bg-secondary flex items-center text-sm transition-colors"
              >
                <Trash2 size={16} className="mr-2" /> Delete Post
              </button>
            )}
            <button
              onClick={handleShare}
              className="w-full text-left px-4 py-3 text-foreground hover:bg-secondary flex items-center text-sm transition-colors"
            >
              <Share2 size={16} className="mr-2" /> Share Link
            </button>
          </div>
        )}
      </div>

      {/* Image */}
      <div className="relative w-full bg-background" onDoubleClick={handleLike}>
        <img
          src={post.imageUrl}
          className="w-full h-auto max-h-[600px] object-contain mx-auto"
          alt="Post"
        />
        {likeAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart
              size={100}
              className="text-accent fill-current animate-heart-pop drop-shadow-2xl"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="icon"
              size="icon"
              onClick={handleLike}
              className="transition-transform active:scale-125"
            >
              <Heart
                size={28}
                className={cn(
                  liked ? "text-accent fill-current" : "text-foreground"
                )}
              />
            </Button>
            <Button
              variant="icon"
              size="icon"
              onClick={() => onViewComments(post)}
              className="transition-transform active:scale-125 hover:text-primary"
            >
              <MessageSquare size={28} />
            </Button>
            <Button
              variant="icon"
              size="icon"
              onClick={handleShare}
              className="transition-transform active:scale-125 hover:text-green-400"
            >
              <Send size={28} />
            </Button>
          </div>
          <Button
            variant="icon"
            size="icon"
            onClick={() => onSave(post.id)}
            className="transition-transform active:scale-125"
          >
            <Bookmark
              size={28}
              className={cn(isSaved ? "text-yellow-400 fill-current" : "text-foreground")}
            />
          </Button>
        </div>

        <div className="font-bold text-foreground mb-2">{likeCount} likes</div>
        <div className="text-foreground mb-2">
          <span className="font-bold mr-2">{post.username}</span>
          {post.caption}
        </div>
        <button
          onClick={() => onViewComments(post)}
          className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
        >
          View all {post.comments?.length || 0} comments
        </button>
      </div>
    </div>
  );
};
