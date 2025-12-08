import { useState, useEffect, useRef } from "react";
import { X, Heart, Send, Eye, Share2, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Reuse the types from Stories.tsx if needed or redefine
interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  type?: "image" | "video";
  profile?: { username?: string; avatar_url?: string | null };
}

interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: Story[];
  hasUnviewed: boolean;
}

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

export const StoryViewer = ({ storyGroups, initialGroupIndex, onClose }: StoryViewerProps) => {
  const { user } = useAuth();
  
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0); 
  
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [viewCount, setViewCount] = useState(0);
  
  const [direction, setDirection] = useState<"next" | "prev" | "init">("init");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const DURATION = 5000;

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup.stories[currentStoryIndex];
  const isOwnStory = user?.id === currentGroup.user_id;

  // --- 1. HANDLE VIEW COUNT & RECORDING ---
  useEffect(() => {
    setProgress(0);
    setLiked(false);
    setReplyText("");
    startTimeRef.current = Date.now();
    
    // RECORD VIEW (If not own story)
    const recordView = async () => {
      if (!user || isOwnStory) return;
      
      // Try insert (ignore duplicates due to UNIQUE constraint in DB)
      await supabase.from("story_views").insert({
        story_id: currentStory.id,
        viewer_id: user.id
      }).maybeSingle(); // maybeSingle ignores error if row exists
    };
    recordView();

    // GET VIEW COUNT (If own story)
    const getViewCount = async () => {
      if (isOwnStory) {
        const { count } = await supabase
          .from("story_views")
          .select("*", { count: "exact", head: true })
          .eq("story_id", currentStory.id);
        
        setViewCount(count || 0);
      }
    };
    getViewCount();

  }, [currentGroupIndex, currentStoryIndex, isOwnStory, currentStory.id, user]);

  // --- 2. PROGRESS TIMER ---
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = (elapsed / DURATION) * 100;

      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentGroupIndex, currentStoryIndex, isPaused]);

  // --- 3. NAVIGATION ---
  const handleNext = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      // Next story, same user
      setDirection("next"); // optional: use 'fade' for same user
      setTimeout(() => setCurrentStoryIndex((prev) => prev + 1), 0);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      // Next user
      setDirection("next");
      setTimeout(() => {
        setCurrentGroupIndex((prev) => prev + 1);
        setCurrentStoryIndex(0);
      }, 0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStoryIndex > 0) {
      setDirection("prev");
      setTimeout(() => setCurrentStoryIndex((prev) => prev - 1), 0);
    } else if (currentGroupIndex > 0) {
      setDirection("prev");
      setTimeout(() => {
        setCurrentGroupIndex((prev) => prev - 1);
        setCurrentStoryIndex(storyGroups[currentGroupIndex - 1].stories.length - 1);
      }, 0);
    } else {
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  };

  // --- 4. ACTIONS ---
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => !prev);
    if (!liked) toast("❤️ Liked story");
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!replyText.trim()) return;
    
    // In real app, create a conversation or add message
    // For now we just mock success
    toast.success("Reply sent!");
    setReplyText("");
    setIsPaused(false);
  };

  const handleDelete = async () => {
    setIsPaused(true);
    if (confirm("Delete this story?")) {
      await supabase.from("stories").delete().eq("id", currentStory.id);
      toast.success("Story deleted");
      onClose();
    } else {
      setIsPaused(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      
      {/* 3D CUBE CONTAINER */}
      <div 
        className={cn(
          "relative w-full h-full md:w-[400px] md:h-[90vh] md:rounded-[32px] overflow-hidden bg-gray-900 shadow-2xl transition-all duration-500 ease-out",
          // Animation classes...
        )}
      >
        
        {/* --- MEDIA LAYER --- */}
        <div 
          className="absolute inset-0 z-0 bg-black flex items-center justify-center"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => { setIsPaused(false); startTimeRef.current = Date.now() - (progress / 100) * DURATION; }}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => { setIsPaused(false); startTimeRef.current = Date.now() - (progress / 100) * DURATION; }}
        >
          {currentStory.type === "video" || currentStory.image_url.startsWith("data:video") ? (
            <video
              key={currentStory.id} 
              src={currentStory.image_url}
              className={cn("w-full h-full object-cover", direction !== "init" && "animate-in fade-in zoom-in-105 duration-500")}
              autoPlay
              muted={false}
              playsInline
            />
          ) : (
            <img
              key={currentStory.id}
              src={currentStory.image_url}
              alt="Story"
              className={cn("w-full h-full object-cover", direction !== "init" && "animate-in fade-in zoom-in-105 duration-500")}
            />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* --- UI LAYER --- */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 pt-6 pb-8">
          
          {/* Header */}
          <div className="space-y-3">
            <div className="flex gap-1 h-1">
              {currentGroup.stories.map((story, idx) => (
                <div key={story.id} className="h-full flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_10px_white]"
                    style={{ 
                      width: idx < currentStoryIndex ? "100%" : idx === currentStoryIndex ? `${progress}%` : "0%" 
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 border border-white/20">
                  <AvatarImage src={currentGroup.avatar_url || ""} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold flex items-center gap-2 drop-shadow-md">
                    {currentGroup.username}
                    <span className="text-white/70 font-normal text-xs">• Now</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isOwnStory && (
                  <button onClick={handleDelete} className="p-2 text-white/80 hover:text-red-500 transition-colors">
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 text-white/90 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* TAP ZONES */}
          <div className="absolute inset-0 z-[-1] flex">
            <div className="w-1/3 h-full" onClick={handlePrev} />
            <div className="w-2/3 h-full" onClick={handleNext} />
          </div>

          {/* Footer Interactive Area */}
          <div>
            {isOwnStory ? (
              <div 
                className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <div className="flex items-center gap-2 text-white font-semibold text-sm bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5">
                  <Eye size={16} />
                  <span>{viewCount} Views</span>
                </div>
                <div className="w-12 h-1 bg-white/20 rounded-full mt-1" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 relative group">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send a message..."
                    className="bg-transparent border border-white/40 text-white placeholder:text-white/70 rounded-full h-12 pr-12 focus-visible:ring-0 focus-visible:border-white backdrop-blur-md"
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {replyText && (
                    <button onClick={handleReply} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white bg-primary p-2 rounded-full hover:scale-110 transition-transform">
                      <Send size={14} fill="white" />
                    </button>
                  )}
                </div>
                <button onClick={handleLike} className="p-3 rounded-full bg-transparent hover:bg-white/10 active:scale-75 transition-all">
                  <Heart size={28} className={cn("transition-all drop-shadow-md", liked ? "fill-red-500 text-red-500 scale-110" : "text-white hover:scale-110")} />
                </button>
                <button onClick={handleShare} className="p-3 rounded-full bg-transparent hover:bg-white/10 active:scale-90 transition-all">
                  <Share2 size={24} className="text-white -mt-0.5" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};