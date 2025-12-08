import { useState, useRef, useEffect } from "react";
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

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);

export const Stories = ({ stories = [], onStoryAdded }: StoriesProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Group stories by user (showing the latest story for the thumbnail)
  const grouped = Object.values(
    stories.reduce((acc, s) => {
      // We keep the existing entry to preserve order, or update count
      if (!acc[s.user_id]) {
        acc[s.user_id] = { ...s, count: 0 };
      }
      (acc[s.user_id] as any).count++;
      return acc;
    }, {} as Record<string, Story & { count: number }>)
  );

  const uploadFileToStorage = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload a story");
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `stories/${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("stories").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: publicUrl,
      });

      if (dbErr) throw dbErr;

      toast.success("Story uploaded successfully");
      onStoryAdded();
      return publicUrl;
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload story");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileToStorage(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSheetOpen(false);
  };

  const openGallery = () => {
    if (fileInputRef.current) fileInputRef.current.click();
    setSheetOpen(false);
  };

  const openViewerForStory = (storyId: string) => {
    const idx = stories.findIndex((s) => s.id === storyId);
    if (idx >= 0) setViewerIndex(idx);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewerIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Stories Rail */}
      <div className="w-full border-b border-border/40 bg-background/50 backdrop-blur-sm pt-4 pb-5">
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
              {/* Dashed Border container */}
              <div className="w-full h-full rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/30 relative overflow-hidden group">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                    <Plus className="text-primary w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
                    
                    {/* Small badge overlay */}
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-[2px] border-background">
                       <Plus className="text-primary-foreground w-3 h-3" strokeWidth={3} />
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

          {/* User Stories */}
          {grouped.map((g) => {
            const isVideo = isVideoUrl(g.image_url || "");
            return (
              <div
                key={g.id}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group snap-start"
                onClick={() => openViewerForStory(g.id)}
              >
                {/* The Story Ring Container */}
                <div className="relative w-[72px] h-[72px] sm:w-20 sm:h-20 transition-transform duration-300 ease-out group-hover:scale-105 group-active:scale-95">
                  
                  {/* Premium Gradient Ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-fuchsia-600 animate-in fade-in zoom-in duration-500" />
                  
                  {/* Background gap (creates the separation between ring and image) */}
                  <div className="absolute inset-[2.5px] rounded-full bg-background" />

                  {/* Image Container */}
                  <div className="absolute inset-[5px] rounded-full overflow-hidden bg-secondary ring-1 ring-black/5">
                    {isVideo ? (
                      <video src={g.image_url} className="w-full h-full object-cover opacity-90" muted />
                    ) : (
                      <img
                        src={g.image_url}
                        alt={g.profile?.username || "story"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Video Indicator Badge */}
                  {isVideo && (
                    <div className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-md border border-white/20 p-1 rounded-full shadow-sm">
                      <Video size={10} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </div>

                <span className="text-[11px] sm:text-xs mt-1.5 text-foreground/80 font-medium truncate w-[74px] text-center">
                  {g.profile?.username || "User"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-end justify-center sm:items-center pointer-events-none",
          sheetOpen ? "pointer-events-auto" : ""
        )}
      >
        {/* Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            sheetOpen ? "opacity-100" : "opacity-0"
          )} 
          onClick={() => setSheetOpen(false)} 
        />
        
        {/* Content */}
        <div
          className={cn(
            "relative w-full max-w-sm bg-background/90 backdrop-blur-xl border-t sm:border border-border/50 sm:rounded-2xl shadow-2xl transition-all duration-300 ease-out transform",
            sheetOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-full opacity-0 sm:translate-y-10 sm:scale-95"
          )}
        >
          <div className="p-6 pb-8">
            <div className="w-12 h-1.5 rounded-full bg-muted mx-auto mb-6 opacity-50" />
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold tracking-tight mb-1">Create Story</h3>
              <p className="text-sm text-muted-foreground">Share your moments with friends</p>
            </div>

            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                onClick={openGallery}
              >
                <ImageIcon size={20} strokeWidth={2.5} />
                <span className="font-semibold">Select from Gallery</span>
              </button>

              <button
                className="w-full p-4 rounded-xl font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Story Viewer Overlay */}
      {viewerIndex !== null && (
        <StoryViewer 
          stories={stories} 
          initialIndex={viewerIndex} 
          onClose={() => setViewerIndex(null)} 
        />
      )}
    </>
  );
};

export default Stories;