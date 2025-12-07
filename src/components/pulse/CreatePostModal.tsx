import { useState, useRef } from "react";
import { X, Image, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WaveLoader } from "./WaveLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const FILTERS = [
  { name: "Normal", class: "" },
  { name: "Vivid", class: "saturate-150 contrast-110" },
  { name: "B&W", class: "grayscale contrast-125" },
  { name: "Vintage", class: "sepia contrast-90 brightness-110" },
  { name: "Warm", class: "sepia-[.3] contrast-100 brightness-105" },
  { name: "Cool", class: "hue-rotate-15 contrast-100" },
];

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostModal = ({ onClose, onPostCreated }: CreatePostModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "edit" | "caption">("select");
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaData(event.target?.result as string);
      setStep("edit");
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!mediaData || !user) return;
    
    setLoading(true);
    
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      image_url: mediaData,
      caption: caption.trim() || null,
      filter: mediaType === "image" ? (selectedFilter.class || null) : null,
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post shared!");
      onPostCreated();
      onClose();
    }
    
    setLoading(false);
  };

  const isVideo = mediaType === "video";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl glass-strong rounded-3xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="icon" size="iconSm" onClick={onClose}>
            <X />
          </Button>
          <h3 className="font-bold text-foreground">
            {step === "select" && "Create Post"}
            {step === "edit" && "Edit"}
            {step === "caption" && "New Post"}
          </h3>
          {step === "edit" && (
            <Button variant="ghost" size="sm" onClick={() => setStep("caption")}>
              Next
            </Button>
          )}
          {step === "caption" && (
            <Button
              variant="gradient"
              size="sm"
              onClick={handlePost}
              disabled={loading}
            >
              {loading ? <WaveLoader /> : "Share"}
            </Button>
          )}
          {step === "select" && <div className="w-10" />}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "select" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 glass rounded-full flex items-center justify-center mb-6">
                <Image size={40} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-6">
                Drag photos and videos here
              </p>
              <div className="flex gap-4">
                <Button variant="gradient" onClick={() => fileInputRef.current?.click()}>
                  <Image size={18} className="mr-2" />
                  Photo
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Video size={18} className="mr-2" />
                  Video
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {step === "edit" && mediaData && (
            <div>
              <div className="aspect-square max-h-[400px] mx-auto rounded-2xl overflow-hidden bg-background mb-6">
                {isVideo ? (
                  <video
                    src={mediaData}
                    className="w-full h-full object-contain"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={mediaData}
                    alt="Preview"
                    className={cn("w-full h-full object-contain", selectedFilter.class)}
                  />
                )}
              </div>

              {/* Filters - only for images */}
              {!isVideo && (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => setSelectedFilter(filter)}
                      className={cn(
                        "flex flex-col items-center flex-shrink-0",
                        selectedFilter.name === filter.name && "opacity-100",
                        selectedFilter.name !== filter.name && "opacity-60 hover:opacity-80"
                      )}
                    >
                      <div
                        className={cn(
                          "w-16 h-16 rounded-xl overflow-hidden mb-2 ring-2 transition-all",
                          selectedFilter.name === filter.name
                            ? "ring-primary"
                            : "ring-transparent"
                        )}
                      >
                        <img
                          src={mediaData}
                          alt={filter.name}
                          className={cn("w-full h-full object-cover", filter.class)}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{filter.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {isVideo && (
                <p className="text-center text-muted-foreground text-sm">Filters are not available for videos</p>
              )}
            </div>
          )}

          {step === "caption" && mediaData && (
            <div className="flex gap-6">
              <div className="w-1/3 flex-shrink-0">
                <div className="aspect-square rounded-2xl overflow-hidden bg-background">
                  {isVideo ? (
                    <video
                      src={mediaData}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={mediaData}
                      alt="Preview"
                      className={cn("w-full h-full object-cover", selectedFilter.class)}
                    />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className="w-full h-40 bg-transparent border-none resize-none focus:outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
