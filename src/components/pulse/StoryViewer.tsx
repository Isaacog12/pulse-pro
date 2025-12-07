import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

// Helper to check if URL is video
const isVideoUrl = (url: string) => {
  return url.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const StoryViewer = ({ stories, initialIndex, onClose }: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory ? isVideoUrl(currentStory.image_url) : false;
  const STORY_DURATION = isVideo ? 15000 : 5000; // 15s for video, 5s for image

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Progress timer for images
  useEffect(() => {
    if (isPaused || isVideo) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, goToNext, isVideo, STORY_DURATION]);

  // Handle video progress
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      goToNext();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [isVideo, currentIndex, goToNext]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "Escape") onClose();
      if (e.key === "m") setIsMuted(!isMuted);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, onClose, isMuted]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      goToPrev();
    } else if (x > (width * 2) / 3) {
      goToNext();
    }
  };

  const handlePauseToggle = (paused: boolean) => {
    setIsPaused(paused);
    if (videoRef.current) {
      if (paused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
      >
        <X className="text-white" size={24} />
      </button>

      {/* Mute button for video */}
      {isVideo && (
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-16 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="text-white" size={24} />
          ) : (
            <Volume2 className="text-white" size={24} />
          )}
        </button>
      )}

      {/* Navigation arrows for desktop */}
      <button
        onClick={goToPrev}
        className={cn(
          "absolute left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-all hidden md:flex",
          currentIndex === 0 && "opacity-50 cursor-not-allowed"
        )}
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="text-white" size={28} />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-all hidden md:flex"
      >
        <ChevronRight className="text-white" size={28} />
      </button>

      {/* Story container */}
      <div
        className="relative w-full max-w-md h-[85vh] max-h-[800px] mx-4 rounded-2xl overflow-hidden cursor-pointer"
        onClick={handleTap}
        onMouseDown={() => handlePauseToggle(true)}
        onMouseUp={() => handlePauseToggle(false)}
        onMouseLeave={() => handlePauseToggle(false)}
        onTouchStart={() => handlePauseToggle(true)}
        onTouchEnd={() => handlePauseToggle(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100 rounded-full"
                style={{
                  width:
                    index < currentIndex
                      ? "100%"
                      : index === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="absolute top-10 left-4 right-4 z-10 flex items-center gap-3">
          <img
            src={
              currentStory.profile?.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentStory.user_id}`
            }
            alt={currentStory.profile?.username || "User"}
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
          <div>
            <p className="text-white font-semibold text-sm">
              {currentStory.profile?.username || "User"}
            </p>
            <p className="text-white/70 text-xs">
              {new Date(currentStory.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Story content */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentStory.image_url}
            className="w-full h-full object-cover"
            autoPlay
            muted={isMuted}
            playsInline
            loop={false}
          />
        ) : (
          <img
            src={currentStory.image_url}
            alt="Story"
            className="w-full h-full object-cover"
          />
        )}

        {/* Tap zones indicator (visible on hover) */}
        <div className="absolute inset-0 flex opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-1/3 h-full flex items-center justify-center">
            <ChevronLeft className="text-white/50" size={40} />
          </div>
          <div className="w-1/3" />
          <div className="w-1/3 h-full flex items-center justify-center">
            <ChevronRight className="text-white/50" size={40} />
          </div>
        </div>
      </div>
    </div>
  );
};
