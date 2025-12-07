import { useState, useRef, useEffect } from "react";
import { Plus, Image as ImageIcon } from "lucide-react";
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

  // group stories by user
  const grouped = Object.values(
    stories.reduce((acc, s) => {
      if (!acc[s.user_id]) acc[s.user_id] = { ...s, count: 0 } as Story & { count: number };
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

      toast.success("Story uploaded");
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
      <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide pb-6">
        {/* Add Story */}
        <div className="flex flex-col items-center flex-shrink-0 relative">
          <div
            className={cn(
              "relative w-16 h-16 sm:w-20 sm:h-20 cursor-pointer rounded-2xl p-[2px] bg-gradient-pulse transition-transform hover:scale-105",
              uploading && "opacity-60"
            )}
            onClick={() => setSheetOpen(true)}
            role="button"
            aria-label="Add story"
          >
            <div className="w-full h-full rounded-[12px] flex items-center justify-center bg-secondary/40 border-2 border-dashed border-muted-foreground/30">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="text-muted-foreground" />
              )}
            </div>
          </div>
          <span className="text-xs mt-2 font-medium text-muted-foreground">Add Story</span>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
          />
        </div>

        {/* Story Avatars */}
        {grouped.map((g) => {
          const isVideo = isVideoUrl(g.image_url || "");
          return (
            <div
              key={g.id}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => openViewerForStory(g.id)}
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 p-[2px] rounded-2xl bg-gradient-pulse">
                <div className="bg-background w-full h-full rounded-[14px] overflow-hidden border-2 border-background">
                  {isVideo ? (
                    <video src={g.image_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img
                      src={g.image_url}
                      alt={g.profile?.username || "story"}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Video   size={16} className="text-white drop-shadow-md" />
                  </div>
                )}
              </div>
              <span className="text-xs mt-2 text-muted-foreground font-medium truncate w-16 text-center">
                {g.profile?.username || "User"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-0 z-40 pointer-events-none transition-opacity",
          sheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0"
        )}
        aria-hidden={!sheetOpen}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
        <div
          className={cn(
            "absolute left-0 right-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl bg-background/95 border border-border shadow-2xl transition-transform",
            sheetOpen ? "translate-y-0" : "translate-y-full"
          )}
          style={{ transitionDuration: "260ms" }}
        >
          <div className="p-4">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground text-center mb-2">Add to story</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">Choose a photo or video from your gallery</p>

            <button
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-border bg-transparent hover:bg-secondary/50 transition"
              onClick={openGallery}
            >
              <ImageIcon size={18} />
              <span className="font-medium">Choose From Gallery</span>
            </button>

            <button
              className="w-full text-sm text-muted-foreground py-2"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Story Viewer */}
      {viewerIndex !== null && (
        <StoryViewer stories={stories} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </>
  );
};

export default Stories;
