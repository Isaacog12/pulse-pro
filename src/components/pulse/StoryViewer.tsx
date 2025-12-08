import { useState, useEffect, useRef } from "react";
import { X, Heart, Send, Eye, Share2, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  type?: "image" | "video";
  profile?: { username?: string; avatar_url?: string | null };
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

export const StoryViewer = ({ stories, initialIndex, onClose }: StoryViewerProps) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [viewCount, setViewCount] = useState(0);
  
  // Animation Direction State
  const [direction, setDirection] = useState<"next" | "prev" | "init">("init");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const DURATION = 5000;

  const currentStory = stories[currentIndex];
  const isOwnStory = user?.id === currentStory.user_id;

  // --- 1. RESET STATE ---
  useEffect(() => {
    setProgress(0);
    setLiked(false);
    setReplyText("");
    startTimeRef.current = Date.now();
    
    if (isOwnStory) setViewCount(Math.floor(Math.random() * 100) + 12);
  }, [currentIndex, isOwnStory]);

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
  }, [currentIndex, isPaused]);

  // --- 3. NAVIGATION (Cinematic Depth Logic) ---
  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setDirection("next");
      // Small delay to ensure React renders the new state with the animation class
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection("prev");
      setTimeout(() => setCurrentIndex((prev) => prev - 1), 0);
    } else {
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  };

  // --- 4. ACTIONS ---
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => !prev);
    if (!liked) {
      // Floating heart effect could be added here
      toast("❤️ Liked story", {
        position: "bottom-center",
        style: { background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }
      });
    }
  };

  const handleReply = (e: React.FormEvent) => {
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
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-3xl flex items-center justify-center animate-in fade-in duration-300">
      
      {/* Container */}
      <div className="relative w-full h-full md:w-[400px] md:h-[90vh] md:rounded-[40px] overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        
        {/* --- MEDIA LAYER (With Cinematic Animation) --- */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center bg-black"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => { setIsPaused(false); startTimeRef.current = Date.now() - (progress / 100) * DURATION; }}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => { setIsPaused(false); startTimeRef.current = Date.now() - (progress / 100) * DURATION; }}
        >
          {/* ANIMATION KEY:
             We use the `key` prop to force React to remount the element when the story changes.
             The `animate-in` classes then trigger based on the `direction` state.
          */}
          {currentStory.type === "video" || currentStory.image_url.startsWith("data:video") ? (
            <video
              key={currentStory.id}
              src={currentStory.image_url}
              className={cn(
                "w-full h-full object-cover",
                direction === "next" && "animate-in zoom-in-110 fade-in slide-in-from-right-10 duration-700 ease-out-expo",
                direction === "prev" && "animate-in zoom-in-50 fade-in slide-in-from-left-10 duration-700 ease-out-expo",
                direction === "init" && "animate-in zoom-in-95 fade-in duration-500"
              )}
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
                // CINEMATIC TRANSITIONS
                direction === "next" && "animate-in zoom-in-110 fade-in slide-in-from-right-4 duration-700 ease-out-expo",
                direction === "prev" && "animate-in zoom-in-90 fade-in slide-in-from-left-4 duration-700 ease-out-expo",
                direction === "init" && "animate-in zoom-in-95 fade-in duration-500"
              )}
            />
          )}
          
          {/* Premium Gradients for Text Readability */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        </div>

        {/* --- UI LAYER --- */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 pt-6 pb-8">
          
          {/* Header */}
          <div className="space-y-4">
            {/* Progress Bars */}
            <div className="flex gap-1.5 h-1">
              {stories.map((story, idx) => (
                <div key={story.id} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-white/90 shadow-[0_0_10px_white] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%" }}
                  />
                </div>
              ))}
            </div>

            {/* User Row */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 ring-2 ring-white/20">
                  <AvatarImage src={currentStory.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold flex items-center gap-2 drop-shadow-md tracking-wide">
                    {currentStory.profile?.username}
                    <span className="text-white/60 font-normal text-xs opacity-80">• 3h</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwnStory ? (
                  <button onClick={handleDelete} className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-red-500/20 hover:text-red-500 transition-all">
                    <Trash2 size={18} />
                  </button>
                ) : (
                  <button className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
                    <MoreHorizontal size={18} />
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

          {/* Footer Interactive Area */}
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
                <div className="w-12 h-1 bg-white/20 rounded-full mt-1" />
              </div>
            ) : (
              <div className="flex items-end gap-3 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 relative group">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send a message..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-full h-12 pr-12 focus-visible:ring-0 focus-visible:border-white/50 backdrop-blur-xl transition-all"
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {replyText && (
                    <button 
                      onClick={handleReply}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                    >
                      <Send size={14} fill="white" />
                    </button>
                  )}
                </div>

                <button 
                  onClick={handleLike}
                  className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 active:scale-90 transition-all"
                >
                  <Heart 
                    size={24} 
                    className={cn(
                      "transition-all duration-300 drop-shadow-md", 
                      liked ? "fill-red-500 text-red-500 scale-110" : "text-white hover:scale-110"
                    )} 
                  />
                </button>

                <button 
                  onClick={handleShare}
                  className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 active:scale-90 transition-all"
                >
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