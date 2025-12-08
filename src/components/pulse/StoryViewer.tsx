import { useState, useEffect, useRef } from "react";
import { X, Heart, Send, Eye, Share2, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// --- TYPES ---
interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  type?: "image" | "video";
  profile?: { username?: string; avatar_url?: string | null };
}

export interface StoryGroup {
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
  onMarkViewed: (storyId: string) => void;
}

// ✅ NAMED EXPORT (Crucial for the fix)
export const StoryViewer = ({ storyGroups, initialGroupIndex, onClose, onMarkViewed }: StoryViewerProps) => {
  const { user } = useAuth();
  
  // Navigation State
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0); 
  
  // UI State
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false); // Hide UI on long press
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [viewCount, setViewCount] = useState(0);
  
  // Animation State
  const [direction, setDirection] = useState<"next" | "prev" | "init">("init");

  // Timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const DURATION = 5000; // 5 seconds per story

  // Derived Data (Safety check included)
  const currentGroup = storyGroups[currentGroupIndex];
  if (!currentGroup) {
    onClose();
    return null;
  }
  const currentStory = currentGroup.stories[currentStoryIndex];
  const isOwnStory = user?.id === currentGroup.user_id;

  // --- 1. RESET STATE ON CHANGE ---
  useEffect(() => {
    setProgress(0);
    setLiked(false);
    setReplyText("");
    startTimeRef.current = Date.now();
    setDirection("init");
    
    // Mark as viewed in Parent (Stories.tsx)
    if (onMarkViewed && currentStory?.id) {
      onMarkViewed(currentStory.id);
    }

    // Record view in DB (if not own story)
    const recordView = async () => {
      if (!user || isOwnStory) return;
      await supabase.from("story_views").insert({
        story_id: currentStory.id,
        viewer_id: user.id
      }).maybeSingle();
    };
    recordView();

    // Get view count (if own story)
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

  }, [currentGroupIndex, currentStoryIndex, currentStory?.id]);

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

  // --- 3. NAVIGATION LOGIC ---
  const handleNext = () => {
    // 1. Next Story in Group
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setDirection("next");
      setTimeout(() => setCurrentStoryIndex((prev) => prev + 1), 0);
    } 
    // 2. Next Group (User)
    else if (currentGroupIndex < storyGroups.length - 1) {
      setDirection("next");
      setTimeout(() => {
        setCurrentGroupIndex((prev) => prev + 1);
        setCurrentStoryIndex(0);
      }, 0);
    } 
    // 3. End of all stories
    else {
      onClose();
    }
  };

  const handlePrev = () => {
    // 1. Previous Story in Group
    if (currentStoryIndex > 0) {
      setDirection("prev");
      setTimeout(() => setCurrentStoryIndex((prev) => prev - 1), 0);
    } 
    // 2. Previous Group (User)
    else if (currentGroupIndex > 0) {
      setDirection("prev");
      setTimeout(() => {
        setCurrentGroupIndex((prev) => prev - 1);
        setCurrentStoryIndex(storyGroups[currentGroupIndex - 1].stories.length - 1);
      }, 0);
    } 
    // 3. Restart first story
    else {
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
    if (!liked) {
        toast("❤️ Liked story", {
            position: "bottom-center",
            style: { background: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }
        });
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!replyText.trim()) return;
    
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

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      
      {/* Container - Fullscreen Mobile, Constrained Desktop */}
      <div className="relative w-full h-full md:w-[400px] md:h-[90vh] md:rounded-[20px] overflow-hidden bg-black shadow-2xl">
        
        {/* --- MEDIA LAYER --- */}
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
              className="w-full h-full object-cover"
              autoPlay
              muted={false}
              playsInline
            />
          ) : (
            <img
              key={currentStory.id}
              src={currentStory.image_url}
              alt="Story"
              className={cn(
                "w-full h-full object-cover",
                direction === "next" && "animate-in slide-in-from-right duration-300",
                direction === "prev" && "animate-in slide-in-from-left duration-300",
                direction === "init" && "animate-in zoom-in-105 duration-500"
              )}
            />
          )}
          
          {/* Gradients (Hide when holding) */}
          <div className={cn(
            "absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none transition-opacity duration-300",
            isHolding ? "opacity-0" : "opacity-100"
          )} />
          <div className={cn(
            "absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none transition-opacity duration-300",
            isHolding ? "opacity-0" : "opacity-100"
          )} />
        </div>

        {/* --- UI LAYER (Hidden when holding) --- */}
        <div className={cn(
          "absolute inset-0 z-20 flex flex-col justify-between p-3 pt-4 pb-6 transition-opacity duration-300",
          isHolding ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          
          {/* Header */}
          <div className="space-y-2">
            {/* Progress Bars */}
            <div className="flex gap-1 h-[2px]">
              {currentGroup.stories.map((story, idx) => (
                <div key={story.id} className="h-full flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_10px_white]"
                    style={{ width: idx < currentStoryIndex ? "100%" : idx === currentStoryIndex ? `${progress}%` : "0%" }}
                  />
                </div>
              ))}
            </div>

            {/* User Info Row */}
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 ring-1 ring-white/20 shadow-md">
                  <AvatarImage src={currentGroup.avatar_url || ""} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold flex items-center gap-2 drop-shadow-md tracking-wide">
                    {currentGroup.username}
                    <span className="text-white/60 font-normal text-xs opacity-80">12h</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isOwnStory ? (
                  <button onClick={handleDelete} className="p-2 text-white hover:text-red-500 transition-colors">
                    <Trash2 size={20} />
                  </button>
                ) : (
                  <button className="p-2 text-white hover:opacity-80 transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 text-white hover:opacity-80 transition-colors">
                  <X size={26} />
                </button>
              </div>
            </div>
          </div>

          {/* TAP ZONES (Invisible) */}
          <div className="absolute inset-0 z-[-1] flex">
            <div className="w-1/3 h-full" onClick={handlePrev} />
            <div className="w-2/3 h-full" onClick={handleNext} />
          </div>

          {/* Footer Interactive Area */}
          <div className="px-1">
            {isOwnStory ? (
              // Own Story View (Activity)
              <div 
                className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                onClick={(e) => { e.stopPropagation(); toast.info("Viewers list coming soon"); }}
              >
                <div className="flex -space-x-2 mb-1">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border border-black" />
                   ))}
                </div>
                <div className="flex items-center gap-2 text-white font-medium text-sm bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                  <Eye size={16} />
                  <span>{viewCount} Views</span>
                </div>
                <div className="w-full h-1 bg-white/20 rounded-full mt-2 mx-auto w-12" />
              </div>
            ) : (
              // Reply Bar
              <div className="flex items-center gap-3">
                <form 
                  onSubmit={handleReply}
                  className="flex-1 relative"
                  onClick={(e) => e.stopPropagation()} 
                >
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send message"
                    className="w-full bg-transparent border border-white/50 text-white placeholder:text-white/80 rounded-full h-11 px-5 focus:outline-none focus:border-white focus:bg-black/20 backdrop-blur-md transition-all text-sm font-medium"
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                  />
                  {replyText && (
                    <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white font-semibold text-sm px-3 py-1">
                      Send
                    </button>
                  )}
                </form>

                <button 
                  onClick={handleLike}
                  className="p-2 active:scale-75 transition-all"
                >
                  <Heart 
                    size={28} 
                    className={cn(
                      "transition-all drop-shadow-md", 
                      liked ? "fill-red-500 text-red-500" : "text-white stroke-[1.5px]"
                    )} 
                  />
                </button>

                <button className="p-2 active:scale-90 transition-all">
                  <Share2 size={26} className="text-white stroke-[1.5px] -mt-1" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};