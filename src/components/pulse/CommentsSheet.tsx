import { useState } from "react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  text: string;
  username: string;
  avatar: string;
  timestamp?: Date;
  isPro?: boolean;
}

interface Post {
  id: string;
  username: string;
  comments: Comment[];
}

interface User {
  displayName: string;
  photoURL: string;
  isPro?: boolean;
}

interface CommentsSheetProps {
  post: Post;
  user: User;
  onClose: () => void;
  onAddComment: (postId: string, comment: Comment) => void;
}

export const CommentsSheet = ({ post, user, onClose, onAddComment }: CommentsSheetProps) => {
  const [comment, setComment] = useState("");
  const [commentsList, setCommentsList] = useState<Comment[]>(post.comments || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      text: comment,
      username: user.displayName,
      avatar: user.photoURL,
      timestamp: new Date(),
      isPro: user.isPro || false,
    };

    setCommentsList([...commentsList, newComment]);
    setComment("");
    onAddComment(post.id, newComment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-strong sm:rounded-3xl h-[70vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-card/90 backdrop-blur">
          <h3 className="font-bold text-foreground">Comments</h3>
          <Button variant="icon" size="iconSm" onClick={onClose}>
            <X />
          </Button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {commentsList.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex space-x-3 p-2 rounded-xl transition-colors",
                c.isPro && "bg-gradient-to-r from-yellow-900/20 to-transparent border border-yellow-500/20"
              )}
            >
              <div className="relative">
                <img
                  src={c.avatar}
                  className={cn(
                    "w-8 h-8 rounded-full bg-secondary object-cover",
                    c.isPro && "ring-1 ring-yellow-500"
                  )}
                  alt=""
                />
                {c.isPro && (
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-background text-[8px] px-1 rounded font-bold">
                    PRO
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  <span
                    className={cn(
                      "font-bold mr-2",
                      c.isPro ? "text-yellow-400" : "text-foreground"
                    )}
                  >
                    {c.username}
                    {c.isPro && <Zap size={10} className="inline ml-1 fill-current" />}
                  </span>
                  <span className="text-muted-foreground">{c.text}</span>
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  {c.timestamp?.toLocaleTimeString ? c.timestamp.toLocaleTimeString() : "Just now"}
                </div>
              </div>
            </div>
          ))}

          {commentsList.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              No comments yet. Be the first!
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/90">
          <div className="flex items-center glass rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <img src={user.photoURL} className="w-6 h-6 rounded-full mr-2" alt="" />
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-foreground text-sm placeholder:text-muted-foreground"
              placeholder={`Reply as ${user.displayName}...`}
              autoFocus
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="text-primary font-bold ml-2 disabled:opacity-50 transition-opacity"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
