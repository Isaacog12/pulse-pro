import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StoryViewer } from "./StoryViewer";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  type?: "image" | "video";
  profile?: { username?: string; avatar_url?: string | null };
}

interface StoriesProps {
  stories: Story[];
  onStoryAdded: () => void;
}

const isVideoUrl = (url: string) => {
  return url.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const Stories = ({ stories = [], onStoryAdded }: StoriesProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Track index for the Viewer
  const [initialGroupIndex, setInitialGroupIndex] = useState<number | null>(null);
  
  // REAL DB STATE: Set of Story IDs that the current user has viewed
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && stories.length > 0) {
      fetchViewedStatus();
    }
  }, [user, stories]);

  // 1. Fetch which stories I have already seen from DB
  const fetchViewedStatus = async () => {
    if (!user) return;
    const storyIds = stories.map(s => s.id);
    
    const { data } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", user.id)
      .in("story_id", storyIds);

    if (data) {
      const viewedSet = new Set(data.map(v => v.story_id));
      setViewedStoryIds(viewedSet);
    }
  };

  // 2. Refresh views when closing viewer to update Grey/Gold rings
  const handleViewerClose = () => {
    setInitialGroupIndex(null);
    fetchViewedStatus();
  };

  // 3. Grouping Logic (Updated for DB state)
  const grouped = Object.values(
    stories.reduce((acc, story) => {
      if (!acc[story.user_id]) {
        acc[story.user_id] = { 
          ...story, 
          stories: [], // Store all stories for this user
          hasUnviewed: false 
        };
      }
      
      // Add story to the group array
      if (!acc[story.user_id].stories) acc[story.user_id].stories = [];
      acc[story.user_id].stories.push(story);

      // If ID is NOT in our DB set, it's Unviewed (Gold)
      if (!viewedStoryIds.has(story.id)) {
        acc[story.user_id].hasUnviewed = true;
      }
      return acc;
    }, {} as Record<string, Story & { stories: Story[]; hasUnviewed: boolean }>)
  );

  // Sorting: Users with New Stories (Gold) go first
  const sortedGroups = grouped.sort((a, b) => (b.hasUnviewed ? 1 : 0) - (a.hasUnviewed ? 1 : 0));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
        toast.error("File is too large (Max 10MB)");
        return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const isVideo = file.type.startsWith("video/");

      try {
        const { error } = await supabase.from("stories").insert({
          user_id: user.id,
          image_url: base64Data,
          type: isVideo ? "video" : "image"
        });

        if (error) throw error;

        toast.success("Story added!");
        onStoryAdded();
        setSheetOpen(false);
      } catch (error) {
        console.error("Error posting story:", error);
        toast.error("Failed to post story");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsDataURL(file);
  };

  const openGallery = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <>
      <div className="w-full border-b border-white/5 bg-background/20 backdrop-blur-2xl pt-4 pb-5 shadow-sm relative z-10">
        <div className="flex space-x-4 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
          
          {/* Add Story Button */}
          <div className="flex flex-col items-center flex-shrink-0 relative snap-start">
            <button
              className={cn(
                "relative w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full p-[3px] transition-transform hover:scale-105 active:scale-95",
                uploading && "opacity-70 cursor-wait"
              )}
              onClick={() => !uploading && setSheetOpen(true)}
              disabled={uploading}
            >
              <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
                    <Plus className="text-amber-500 w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-full flex items-center justify-center border-[2px] border-background shadow-sm">
                       <Plus className="text-white w-3 h-3" strokeWidth={3} />
                    </div>
                  </>
                )}
              </div>
            </button>
            <span className="text-[11px] sm:text-xs mt-1.5 font-medium text-muted-foreground">My Story</span>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*"
              onChange={handleFileSelect}
            />
          </div>

          {/* User Stories Rail */}
          {sortedGroups.map((group, idx) => {
            // Display the LATEST story in the thumbnail
            const latestStory = group.stories[group.stories.length - 1];
            const isVideo = isVideoUrl(latestStory.image_url || "");
            const hasUnviewed = group.hasUnviewed;

            return (
              <div
                key={group.user_id}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group snap-start"
                onClick={() => setInitialGroupIndex(idx)}
              >
                <div className="relative w-[72px] h-[72px] sm:w-20 sm:h-20 transition-transform duration-300 ease-out group-hover:scale-105 group-active:scale-95">
                  
                  {/* RING LOGIC: Gold vs Grey based on DB state */}
                  <div className={cn(
                    "absolute inset-0 rounded-full transition-all duration-500",
                    hasUnviewed 
                      ? "bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-600 animate-in fade-in" 
                      : "bg-white/20 border border-white/10"
                  )} />
                  
                  <div className="absolute inset-[2.5px] rounded-full bg-background" />

                  <div className="absolute inset-[5px] rounded-full overflow-hidden bg-secondary ring-1 ring-white/10">
                    {isVideo ? (
                      <video src={latestStory.image_url} className={cn("w-full h-full object-cover", !hasUnviewed && "opacity-60")} muted />
                    ) : (
                      <img
                        src={latestStory.image_url}
                        alt="story"
                        className={cn("w-full h-full object-cover", !hasUnviewed && "opacity-60")}
                        loading="lazy"
                      />
                    )}
                  </div>

                  {isVideo && (
                    <div className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-md border border-white/20 p-1 rounded-full shadow-sm">
                      <Video size={10} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </div>

                <span className={cn(
                  "text-[11px] sm:text-xs mt-1.5 font-medium truncate w-[74px] text-center transition-colors",
                  hasUnviewed ? "text-foreground font-semibold" : "text-muted-foreground"
                )}>
                  {group.profile?.username || "User"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {sheetOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSheetOpen(false)} />
          <div className="relative w-full max-w-sm bg-background/80 backdrop-blur-3xl border-t sm:border border-white/10 sm:rounded-[32px] shadow-2xl transition-all duration-300 ease-out animate-in slide-in-from-bottom-full sm:zoom-in-95">
            <div className="p-6 pb-8">
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-6 opacity-50" />
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold tracking-tight mb-1 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Create Story</h3>
                <p className="text-sm text-muted-foreground">Share your moments with friends</p>
              </div>
              <div className="space-y-3">
                <button
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
                  onClick={openGallery}
                >
                  <ImageIcon size={20} strokeWidth={2.5} />
                  <span className="font-semibold">Select from Gallery</span>
                </button>
                <button
                  className="w-full p-4 rounded-2xl font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                  onClick={() => setSheetOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Viewer Portal - NOW PASSING GROUPED STORIES */}
      {initialGroupIndex !== null && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black">
          <StoryViewer 
            storyGroups={sortedGroups} 
            initialGroupIndex={initialGroupIndex} 
            onClose={handleViewerClose} 
          />
        </div>,
        document.body
      )}
    </>
  );
};