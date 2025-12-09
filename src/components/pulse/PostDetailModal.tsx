import { useState, useEffect, useRef } from "react";
import { X, Heart, MessageSquare, Send, Bookmark, MoreVertical, Trash2, Share2, Loader2, CheckCircle, Volume2, VolumeX, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { GlintLogo } from "./GlintLogo"; // Use your new logo

interface PostDetailModalProps {
  postId: string;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

// Helper
const isVideoUrl = (url: string) => {
  return url.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const PostDetailModal = ({ postId, onClose, onViewProfile }: PostDetailModalProps) => {
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Media State
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPostDetails();

    const channel = supabase
      .channel(`post-detail-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, () => {
        fetchComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const fetchPostDetails = async () => {
    if (!user) return;
    
    // Fetch Post + Profile
    const { data: postData, error } = await supabase
      .from("posts")
      .select("*, profile:profiles(id, username, avatar_url, is_verified)")
      .eq("id", postId)
      .single();

    if (error || !postData) {
      toast.error("Post not found");
      onClose();
      return;
    }

    // Fetch Likes Count
    const { count } = await supabase.from("likes").select("*", { count: 'exact', head: true }).eq("post_id", postId);
    setLikeCount(count || 0);

    // Check Like Status
    const { data: likeData } = await supabase.from("likes").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    setLiked(!!likeData);

    // Check Save Status
    const { data: saveData } = await supabase.from("saved_posts").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    setSaved(!!saveData);

    setPost(postData);
    await fetchComments();
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    
    if (data) setComments(data);
  };

  const handleLike = async () => {
    const isNowLiked = !liked;
    setLiked(isNowLiked);
    setLikeCount(prev => isNowLiked ? prev + 1 : prev - 1);
    
    if (isNowLiked) {
      await supabase.from("likes").insert({ post_id: postId, user_id: user?.id });
    } else {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user?.id);
    }
  };

  const handleSave = async () => {
    const isNowSaved = !saved;
    setSaved(isNowSaved);
    if (isNowSaved) {
      await supabase.from("saved_posts").insert({ post_id: postId, user_id: user?.id });
    } else {
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user?.id);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      post_id: postId,
      text: newComment.trim()
    });

    if (!error) {
      setNewComment("");
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      toast.error("Failed to post comment");
    }
    setSubmitting(false);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isVideo = post ? isVideoUrl(post.image_url) : false;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
      >
        <X size={24} />
      </button>

      {/* Main Card */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-background/80 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : post ? (
          <>
            {/* LEFT: Media Section */}
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
              {isVideo ? (
                <>
                  <video 
                    ref={videoRef}
                    src={post.image_url} 
                    className="max-w-full max-h-full cursor-pointer"
                    muted={isMuted}
                    loop
                    playsInline
                    onClick={togglePlayPause}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Video Controls */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  >
                    {isMuted ? <VolumeX className="text-white" size={20} /> : <Volume2 className="text-white" size={20} />}
                  </button>
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="p-4 rounded-full bg-black/50 backdrop-blur-sm">
                        <Play className="text-white ml-1" size={32} fill="white" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img src={post.image_url} alt="Post" className="max-w-full max-h-full object-contain" />
              )}
              
              {/* Subtle Glint Logo Watermark */}
              <div className="absolute bottom-4 left-4 opacity-50 pointer-events-none grayscale hidden md:block">
                 <GlintLogo size="sm" />
              </div>
            </div>

            {/* RIGHT: Details & Comments */}
            <div className="w-full md:w-[400px] flex flex-col bg-background/40 border-l border-white/5 h-full">
              
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80" 
                  onClick={() => { onClose(); onViewProfile?.(post.user_id); }}
                >
                  <div className="relative">
                    <div className="absolute -inset-[1px] rounded-full bg-gradient-to-tr from-primary to-accent opacity-70" />
                    <Avatar className="w-9 h-9 border-2 border-background relative">
                      <AvatarImage src={post.profile?.avatar_url || ""} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm">{post.profile?.username}</span>
                    {post.profile?.is_verified && <CheckCircle size={14} className="text-yellow-400 fill-current" />}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical size={16} />
                </Button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Caption */}
                {post.caption && (
                  <div className="flex gap-3 mb-6">
                    <Avatar className="w-8 h-8 flex-shrink-0 border border-white/10">
                      <AvatarImage src={post.profile?.avatar_url || ""} />
                    </Avatar>
                    <div className="text-sm">
                      <span className="font-bold mr-2 text-foreground">{post.profile?.username}</span>
                      <span className="text-foreground/80">{post.caption}</span>
                      <div className="text-xs text-muted-foreground mt-1">{formatTime(post.created_at)}</div>
                    </div>
                  </div>
                )}

                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <Avatar className="w-8 h-8 flex-shrink-0 border border-white/10">
                      <AvatarImage src={comment.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} />
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-bold mr-2 text-foreground/90 cursor-pointer hover:text-primary transition-colors" onClick={() => { onClose(); onViewProfile?.(comment.user_id); }}>
                          {comment.profile?.username}
                        </span>
                        <span className="text-foreground/80">{comment.text}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">Reply</span>
                        {user?.id === comment.user_id && (
                           <button className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:underline">
                             <Trash2 size={10} /> Delete
                           </button>
                        )}
                      </div>
                    </div>
                    <button className="text-muted-foreground hover:text-red-500 transition-colors self-start pt-1">
                      <Heart size={12} />
                    </button>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              {/* Actions & Input */}
              <div className="border-t border-white/10 bg-background/60 backdrop-blur-md p-4 space-y-3">
                
                {/* Action Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={handleLike} className="hover:scale-110 transition-transform active:scale-95">
                      <Heart size={26} className={cn("transition-colors", liked ? "fill-red-500 text-red-500" : "text-foreground hover:text-muted-foreground")} />
                    </button>
                    <button className="hover:scale-110 transition-transform active:scale-95 text-foreground hover:text-primary">
                      <MessageSquare size={26} />
                    </button>
                    <button className="hover:scale-110 transition-transform active:scale-95 text-foreground hover:text-green-400">
                      <Send size={26} />
                    </button>
                  </div>
                  <button onClick={handleSave} className="hover:scale-110 transition-transform active:scale-95">
                    <Bookmark size={26} className={cn("transition-colors", saved ? "fill-yellow-500 text-yellow-500" : "text-foreground hover:text-muted-foreground")} />
                  </button>
                </div>

                <div className="font-bold text-sm text-foreground">
                  {likeCount} likes
                </div>

                {/* Input Field */}
                <form onSubmit={handleComment} className="relative flex items-center gap-2 pt-1">
                  <input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-secondary/50 border-none text-sm placeholder:text-muted-foreground h-10 px-4 rounded-full focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  {newComment.trim() && (
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="text-primary font-bold text-sm px-2 hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      Post
                    </button>
                  )}
                </form>
              </div>

            </div>
          </>
        ) : (
          <div className="flex-1 flex justify-center items-center text-muted-foreground">Post not found</div>
        )}
      </div>
    </div>
  );
};