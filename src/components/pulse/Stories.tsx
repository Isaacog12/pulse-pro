import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom"; // 👈 IMPORT THIS
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
      {/* Stories Rail - Ultra Glass Version */}
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
              {/* Dashed Border container */}
              <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5 relative overflow-hidden group hover:border-primary/50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                    <Plus className="text-primary w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
                    
                    {/* Small badge overlay */}
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full flex items-center justify-center border-[2px] border-background shadow-sm">
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
                  
                  {/* Premium Gradient Ring (Animated) */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-fuchsia-600 animate-in fade-in zoom-in duration-500 bg-[length:200%_200%] animate-pulse-ring" />
                  
                  {/* Background gap */}
                  <div className="absolute inset-[2.5px] rounded-full bg-background" />

                  {/* Image Container */}
                  <div className="absolute inset-[5px] rounded-full overflow-hidden bg-secondary ring-1 ring-white/10">
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

                <span className="text-[11px] sm:text-xs mt-1.5 text-foreground/80 font-medium truncate w-[74px] text-center group-hover:text-primary transition-colors">
                  {g.profile?.username || "User"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Bottom Sheet (Portal to Body for Safety) */}
      {sheetOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setSheetOpen(false)} 
          />
          
          {/* Content */}
          <div className="relative w-full max-w-sm bg-background/80 backdrop-blur-3xl border-t sm:border border-white/10 sm:rounded-[32px] shadow-2xl transition-all duration-300 ease-out animate-in slide-in-from-bottom-full sm:zoom-in-95">
            <div className="p-6 pb-8">
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-6 opacity-50" />
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold tracking-tight mb-1 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Create Story</h3>
                <p className="text-sm text-muted-foreground">Share your moments with friends</p>
              </div>

              <div className="space-y-3">
                <button
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20"
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

      {/* 🔴 THE CRITICAL FIX: 
          We use createPortal to move the Viewer OUT of the component tree 
          and attach it to the body. This prevents it from being covered by 
          the mobile header or getting stuck in the flow.
      */}
      {viewerIndex !== null && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black">
          <StoryViewer 
            stories={stories} 
            initialIndex={viewerIndex} 
            onClose={() => setViewerIndex(null)} 
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default Stories;