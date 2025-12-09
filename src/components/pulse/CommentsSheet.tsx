import { useState, useEffect, useRef } from "react";
import { X, Zap, Send, MessageCircle, Loader2 } from "lucide-react";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        async (payload) => {
          const { data } = await supabase
            .from("comments")
            .select("*, profile:profiles(username, avatar_url, is_pro)")
            .eq("id", payload.new.id)
            .single();
          
          if (data) {
            setComments((prev) => [...prev, data]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*, profile:profiles(username, avatar_url, is_pro)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) setComments(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;

    setSubmitting(true);
    const { data: newComment, error } = await supabase.from("comments").insert({ user_id: user.id, post_id: postId, text: comment.trim() }).select().single();

    if (error) {
      toast.error("Failed to post comment");
    } else {
      // Notification logic here (omitted for brevity, same as before)
      const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
      if (post && post.user_id !== user.id) {
         await supabase.from("notifications").insert({
           user_id: post.user_id, from_user_id: user.id, type: "comment", post_id: postId, comment_id: newComment?.id, message: comment.trim().substring(0, 50)
         });
      }
      setComment("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSubmitting(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Sheet Container */}
      <div className="relative w-full max-w-lg h-[85vh] sm:h-[80vh] bg-background/60 backdrop-blur-3xl border-t sm:border border-white/10 sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Glass Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
               <MessageCircle size={18} className="text-primary" />
            </div>
            <h3 className="font-bold text-lg text-foreground tracking-tight">Comments</h3>
            <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {loading ? (
            // Skeletons
            <div className="space-y-4 pt-4">
               {[1,2,3].map(i => (
                 <div key={i} className="flex gap-3 animate-pulse">
                   <div className="w-9 h-9 bg-secondary/70 rounded-full" />
                   <div className="space-y-2 flex-1">
                     <div className="h-3 w-24 bg-secondary/70 rounded" />
                     <div className="h-3 w-3/4 bg-secondary/50 rounded" />
                   </div>
                 </div>
               ))}
            </div>
          ) : comments.length === 0 ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 pb-20">
              <MessageCircle size={48} className="mb-4 stroke-[1.5]" />
              <p className="font-medium">No comments yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            // Comments
            comments.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex space-x-3 p-3 rounded-2xl transition-all duration-300 group hover:bg-white/5",
                  c.profile?.is_pro && "bg-gradient-to-r from-amber-500/10 to-transparent border-l-2 border-amber-500/50"
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={cn("p-[1px] rounded-full", c.profile?.is_pro ? "bg-gradient-to-tr from-amber-500 to-orange-600" : "bg-transparent")}>
                    <img
                      src={c.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`}
                      className="w-9 h-9 rounded-full object-cover border-2 border-background"
                      alt=""
                    />
                  </div>
                  {c.profile?.is_pro && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[8px] px-1.5 py-px rounded-full font-bold shadow-sm ring-2 ring-background">
                      PRO
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-sm font-semibold", c.profile?.is_pro ? "text-amber-500" : "text-foreground")}>
                        {c.profile?.username || "User"}
                      </span>
                      {c.profile?.is_pro && <Zap size={10} className="fill-amber-500 text-amber-500" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">{formatTime(c.created_at)}</span>
                  </div>
                  
                  <p className="text-sm text-foreground/90 leading-relaxed break-words mt-0.5">
                    {c.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Floating Input Area */}
        <div className="p-4 bg-gradient-to-t from-background/80 to-transparent z-10">
          <form onSubmit={handleSubmit} className="relative">
            <div className="bg-secondary/40 backdrop-blur-xl border border-white/10 rounded-[24px] p-1.5 pl-4 flex items-center shadow-lg focus-within:ring-1 focus-within:ring-primary/50 transition-all duration-300">
              
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                className="w-7 h-7 rounded-full mr-3 opacity-80"
                alt=""
              />
              
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-muted-foreground/70 h-10"
                placeholder={`Reply as ${profile?.username || "you"}...`}
                disabled={submitting}
                autoFocus
              />
              
              <Button
                type="submit"
                disabled={!comment.trim() || submitting}
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-full transition-all duration-300 ml-2",
                  comment.trim() 
                    ? "bg-primary text-primary-foreground hover:scale-105 shadow-md shadow-primary/20" 
                    : "bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} className={comment.trim() ? "ml-0.5" : ""} />}
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};