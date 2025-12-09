import { useState, useEffect, useRef } from "react";
import { X, Heart, Send, Eye, Share2, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StoryGroup } from "./Stories"; // Import shared type

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onMarkViewed: (storyId: string) => void;
}

export const StoryViewer = ({ storyGroups, initialGroupIndex, onClose, onMarkViewed }: StoryViewerProps) => {
  const { user } = useAuth();
  
  // Navigation State
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0); 
  
  // UI State
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [viewCount, setViewCount] = useState(0);
  
  // Animation State
  const [direction, setDirection] = useState<"next" | "prev" | "init">("init");

  // Timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const DURATION = 5000;

  // Safety Check
  if (!storyGroups || !storyGroups[currentGroupIndex]) {
     return null;
  }

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup.stories[currentStoryIndex];
  
  // Fallback if empty group
  if (!currentStory) return null;

  const isOwnStory = user?.id === currentGroup.user_id;

  // --- 1. RESET STATE ON CHANGE ---
  useEffect(() => {
    setProgress(0);
    setLiked(false);
    setReplyText("");
    startTimeRef.current = Date.now();
    setDirection("init");
    
    // Mark as viewed in Parent
    if (onMarkViewed && currentStory?.id) {
      onMarkViewed(currentStory.id);
    }

    // Record view in DB
    const recordView = async () => {
      if (!user || isOwnStory) return;
      await supabase.from("story_views").insert({
        story_id: currentStory.id,
        viewer_id: user.id
      }).maybeSingle();
    };
    recordView();

    // Get view count
    if (isOwnStory) {
      const getViewCount = async () => {
        const { count } = await supabase
          .from("story_views")
          .select("*", { count: "exact", head: true })
          .eq("story_id", currentStory.id);
        setViewCount(count || 0);
      };
      getViewCount();
    }

  }, [currentGroupIndex, currentStoryIndex, currentStory.id]);

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
      setDirection("next");
      setTimeout(() => setCurrentStoryIndex((prev) => prev + 1), 0);
    } else if (currentGroupIndex < storyGroups.length - 1) {
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

  // --- 4. INTERACTIONS ---
  const handleTouchStart = () => {
    setIsPaused(true);
    setTimeout(() => setIsHolding(true), 200); 
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    setIsHolding(false);
    startTimeRef.current = Date.now() - (progress / 100) * DURATION;
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => !prev);
    if (!liked) toast("❤️ Liked story");
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!replyText.trim()) return;
    
    toast.success("Reply sent via Glint DM");
    setReplyText("");
    setIsPaused(false);
  };

  const handleDelete = async () => {
    setIsPaused(true);
    if (confirm("Delete from Glint?")) {
      await supabase.from("stories").delete().eq("id", currentStory.id);
      toast.success("Story removed");
      onClose();
    } else {
      setIsPaused(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
      
      {/* Container */}
      <div className="relative w-full h-full md:w-[400px] md:h-[90vh] md:rounded-[40px] overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        
        {/* MEDIA LAYER */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center bg-black"
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentStory.type === "video" || currentStory.image_url.startsWith("data:video") ? (
            <video
              key={currentStory.id} 
              src={currentStory.image_url}
              className={cn(
                "w-full h-full object-cover",
                direction === "next" && "animate-in slide-in-from-right duration-500",
                direction === "prev" && "animate-in slide-in-from-left duration-500",
                direction === "init" && "animate-in zoom-in-105 duration-700"
              )}
              autoPlay
              muted={false}
              playsInline
            />
          ) : (
            <img
              key={currentStory.id}
              src={currentStory.image_url}
              alt="Glint Story"
              className={cn(
                "w-full h-full object-cover",
                direction === "next" && "animate-in slide-in-from-right duration-500",
                direction === "prev" && "animate-in slide-in-from-left duration-500",
                direction === "init" && "animate-in zoom-in-105 duration-700"
              )}
            />
          )}
          
          <div className={cn("absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none transition-opacity", isHolding && "opacity-0")} />
        </div>

        {/* UI LAYER */}
        <div className={cn("absolute inset-0 z-20 flex flex-col justify-between p-4 pt-6 pb-8 transition-opacity duration-300", isHolding && "opacity-0 pointer-events-none")}>
          
          {/* Header */}
          <div className="space-y-3">
            <div className="flex gap-1.5 h-1">
              {currentGroup.stories.map((story, idx) => (
                <div key={story.id} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-white/90 shadow-[0_0_10px_white] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: idx < currentStoryIndex ? "100%" : idx === currentStoryIndex ? `${progress}%` : "0%" }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 ring-2 ring-white/20">
                  <AvatarImage src={currentGroup.avatar_url || ""} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold flex items-center gap-2 drop-shadow-md tracking-wide">
                    {currentGroup.username}
                    <span className="text-white/60 font-normal text-xs opacity-80">• Now</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwnStory && (
                  <button onClick={handleDelete} className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-red-500/20 hover:text-red-500 transition-all">
                    <Trash2 size={18} />
                  </button>
                )}
                <button onClick={onClose} className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* TAP ZONES */}
          <div className="absolute inset-0 z-[-1] flex">
            <div className="w-1/3 h-full" onClick={handlePrev} />
            <div className="w-2/3 h-full" onClick={handleNext} />
          </div>

          {/* Footer */}
          <div>
            {isOwnStory ? (
              <div 
                className="flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-transform"
                onClick={(e) => { e.stopPropagation(); toast.info("Viewers list coming soon"); }}
              >
                <div className="flex -space-x-3 mb-1 pl-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[8px] text-white font-bold">
                      {String.fromCharCode(64+i)}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-white font-semibold text-sm bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5">
                  <Eye size={16} />
                  <span>{viewCount} Views</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 relative group">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send message..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-full h-12 pr-12 focus-visible:ring-0 focus-visible:border-white/50 backdrop-blur-xl transition-all"
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {replyText && (
                    <button onClick={handleReply} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-full hover:scale-110 transition-transform shadow-lg">
                      <Send size={14} fill="white" />
                    </button>
                  )}
                </div>
                <button onClick={handleLike} className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 active:scale-90 transition-all">
                  <Heart size={24} className={cn("transition-all duration-300 drop-shadow-md", liked ? "fill-red-500 text-red-500 scale-110" : "text-white hover:scale-110")} />
                </button>
                <button className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 active:scale-90 transition-all">
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