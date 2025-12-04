import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    is_pro: boolean;
  };
}

interface CommentsSheetProps {
  postId: string;
  onClose: () => void;
}

export const CommentsSheet = ({ postId, onClose }: CommentsSheetProps) => {
  const { user, profile } = useAuth();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime comments
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          // Fetch the new comment with profile
          const { data } = await supabase
            .from("comments")
            .select("*, profile:profiles(username, avatar_url, is_pro)")
            .eq("id", payload.new.id)
            .single();
          
          if (data) {
            setComments((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*, profile:profiles(username, avatar_url, is_pro)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;

    setSubmitting(true);
    
    const { data: newComment, error } = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        post_id: postId,
        text: comment.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to post comment");
    } else {
      // Create notification for post owner
      const { data: post } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (post && post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          from_user_id: user.id,
          type: "comment",
          post_id: postId,
          comment_id: newComment?.id,
          message: comment.trim().substring(0, 50),
        });
      }
      setComment("");
    }
    
    setSubmitting(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex space-x-3 p-2 rounded-xl transition-colors",
                    c.profile?.is_pro && "bg-gradient-to-r from-yellow-900/20 to-transparent border border-yellow-500/20"
                  )}
                >
                  <div className="relative">
                    <img
                      src={c.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`}
                      className={cn(
                        "w-8 h-8 rounded-full bg-secondary object-cover",
                        c.profile?.is_pro && "ring-1 ring-yellow-500"
                      )}
                      alt=""
                    />
                    {c.profile?.is_pro && (
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
                          c.profile?.is_pro ? "text-yellow-400" : "text-foreground"
                        )}
                      >
                        {c.profile?.username || "User"}
                        {c.profile?.is_pro && <Zap size={10} className="inline ml-1 fill-current" />}
                      </span>
                      <span className="text-muted-foreground">{c.text}</span>
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      {formatTime(c.created_at)}
                    </div>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  No comments yet. Be the first!
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/90">
          <div className="flex items-center glass rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <img
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
              className="w-6 h-6 rounded-full mr-2"
              alt=""
            />
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-foreground text-sm placeholder:text-muted-foreground"
              placeholder={`Reply as ${profile?.username || "you"}...`}
              autoFocus
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!comment.trim() || submitting}
              className="text-primary font-bold ml-2 disabled:opacity-50 transition-opacity"
            >
              {submitting ? "..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
