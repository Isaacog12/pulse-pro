import { Heart, MessageSquare, Send, Bookmark, MoreVertical, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PostActionsProps {
  liked: boolean;
  likeCount: number;
  saved: boolean;
  commentsCount: number;
  likeAnim: boolean;
  onLike: () => void;
  onSave: () => void;
  onViewComments: () => void;
  onShare: () => void;
  onMenuToggle: () => void;
  showMenu: boolean;
  isOwnPost: boolean;
  onDelete?: () => void;
}

export const PostActions = ({
  liked,
  likeCount,
  saved,
  commentsCount,
  likeAnim,
  onLike,
  onSave,
  onViewComments,
  onShare,
  onMenuToggle,
  showMenu,
  isOwnPost,
  onDelete,
}: PostActionsProps) => {
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/post/${onShare}`;
    if (navigator.share) {
      navigator.share({
        title: "Check out this post on Glint",
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Post link copied!");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {/* Left Actions */}
      <div className="flex items-center gap-6">
        <button
          onClick={onLike}
          className={cn(
            "flex items-center gap-2 transition-all duration-200 hover:scale-110 active:scale-95",
            liked && "text-red-500"
          )}
        >
          <div className="relative">
            <Heart
              size={24}
              className={cn(
                "transition-all duration-200",
                liked ? "fill-red-500 text-red-500" : "text-foreground hover:text-red-500"
              )}
            />
            {likeAnim && (
              <Heart
                size={24}
                className="absolute inset-0 fill-red-500 text-red-500 animate-ping"
              />
            )}
          </div>
          <span className="text-sm font-medium">{likeCount}</span>
        </button>

        <button
          onClick={onViewComments}
          className="flex items-center gap-2 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <MessageSquare size={22} className="text-foreground hover:text-primary transition-colors" />
          <span className="text-sm font-medium">{commentsCount}</span>
        </button>

        <button
          onClick={handleShare}
          className="transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Send size={22} className="text-foreground hover:text-primary transition-colors" />
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className={cn(
            "transition-all duration-200 hover:scale-110 active:scale-95",
            saved && "text-yellow-500"
          )}
        >
          <Bookmark
            size={22}
            className={cn(
              "transition-colors",
              saved ? "fill-yellow-500 text-yellow-500" : "text-foreground hover:text-yellow-500"
            )}
          />
        </button>

        <div className="relative">
          <button
            onClick={onMenuToggle}
            className="p-1 rounded-full hover:bg-secondary/50 transition-colors"
          >
            <MoreVertical size={18} className="text-foreground" />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50">
              <button
                onClick={handleShare}
                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3"
              >
                <Share2 size={16} />
                <span className="text-sm">Share Post</span>
              </button>
              {isOwnPost && onDelete && (
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-3 text-left hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-3"
                >
                  <span className="text-sm">Delete Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};