import { useState, useEffect } from "react";
import { X, Heart, MessageSquare, Bookmark, Send, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PostDetailModalProps {
  postId: string;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

interface PostData {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  profile: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profile: {
    username: string;
    avatar_url: string | null;
  };
}

export const PostDetailModal = ({ postId, onClose, onViewProfile }: PostDetailModalProps) => {
  const { user } = useAuth();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPostData();
  }, [postId]);

  const fetchPostData = async () => {
    setLoading(true);

    // Fetch post
    const { data: postData } = await supabase
      .from("posts")
      .select("*, profile:profiles(username, avatar_url, is_verified)")
      .eq("id", postId)
      .single();

    if (postData) {
      setPost(postData as PostData);
    }

    // Fetch comments
    const { data: commentsData } = await supabase
      .from("comments")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (commentsData) {
      setComments(commentsData as Comment[]);
    }

    // Check if liked
    if (user) {
      const { data: likeData } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      setLiked(!!likeData);

      const { data: savedData } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      setSaved(!!savedData);
    }

    // Get like count
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    setLikeCount(count || 0);
    setLoading(false);
  };

  const handleLike = async () => {
    if (!user) return;

    const isNowLiked = !liked;
    setLiked(isNowLiked);
    setLikeCount((prev) => (isNowLiked ? prev + 1 : prev - 1));

    if (isNowLiked) {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const isNowSaved = !saved;
    setSaved(isNowSaved);

    if (isNowSaved) {
      await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: user.id, text: newComment.trim() })
      .select("*, profile:profiles(username, avatar_url)")
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setNewComment("");
    }
    setSubmitting(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
        >
          <X size={20} className="text-foreground" />
        </button>

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : post ? (
          <>
            {/* Image */}
            <div className="md:w-1/2 bg-black flex items-center justify-center">
              <img
                src={post.image_url}
                alt=""
                className="w-full h-full max-h-[50vh] md:max-h-[90vh] object-contain"
              />
            </div>

            {/* Details */}
            <div className="md:w-1/2 flex flex-col max-h-[40vh] md:max-h-[90vh]">
              {/* Header */}
              <div 
                className="p-4 border-b border-border flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  onViewProfile(post.user_id);
                  onClose();
                }}
              >
                <img
                  src={post.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-secondary"
                />
                <div className="flex items-center gap-1">
                  <span className="font-bold text-foreground hover:underline">{post.profile.username}</span>
                  {post.profile.is_verified && (
                    <CheckCircle size={14} className="text-yellow-400 fill-current" />
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Caption */}
                {post.caption && (
                  <div className="flex gap-3">
                    <img
                      src={post.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover bg-secondary flex-shrink-0"
                    />
                    <div>
                      <span className="font-bold text-foreground mr-2">{post.profile.username}</span>
                      <span className="text-foreground">{post.caption}</span>
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(post.created_at)}</p>
                    </div>
                  </div>
                )}

                {/* Comments list */}
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img
                      src={comment.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover bg-secondary flex-shrink-0 cursor-pointer"
                      onClick={() => {
                        onViewProfile(comment.user_id);
                        onClose();
                      }}
                    />
                    <div>
                      <span 
                        className="font-bold text-foreground mr-2 cursor-pointer hover:underline"
                        onClick={() => {
                          onViewProfile(comment.user_id);
                          onClose();
                        }}
                      >
                        {comment.profile.username}
                      </span>
                      <span className="text-foreground">{comment.text}</span>
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(comment.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <button onClick={handleLike} className="transition-transform active:scale-125">
                      <Heart size={24} className={cn(liked ? "text-accent fill-current" : "text-foreground")} />
                    </button>
                    <MessageSquare size={24} className="text-foreground" />
                    <Send size={24} className="text-foreground" />
                  </div>
                  <button onClick={handleSave} className="transition-transform active:scale-125">
                    <Bookmark size={24} className={cn(saved ? "text-yellow-400 fill-current" : "text-foreground")} />
                  </button>
                </div>
                <p className="font-bold text-foreground text-sm mb-2">{likeCount} likes</p>
                <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
              </div>

              {/* Add comment */}
              <form onSubmit={handleSubmitComment} className="p-4 border-t border-border flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={!newComment.trim() || submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : "Post"}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex justify-center items-center py-20 text-muted-foreground">
            Post not found
          </div>
        )}
      </div>
    </div>
  );
};