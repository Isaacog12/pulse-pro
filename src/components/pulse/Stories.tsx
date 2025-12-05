import { useState, useRef } from "react";
import { Plus, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { StoryViewer } from "./StoryViewer";

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

interface StoriesProps {
  stories: Story[];
  onStoryAdded: () => void;
}

export const Stories = ({ stories, onStoryAdded }: StoriesProps) => {
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = { ...story, count: 0 };
    }
    acc[story.user_id].count++;
    return acc;
  }, {} as Record<string, Story & { count: number }>);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setShowOptions(false);

    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const { error } = await supabase.from("stories").insert({
          user_id: user.id,
          image_url: base64,
        });

        if (error) {
          toast.error("Failed to upload story");
        } else {
          toast.success("Story uploaded!");
          onStoryAdded();
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to upload story");
      setUploading(false);
    }
  };

  return (
    <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide pb-6">
      {/* Add Story Button */}
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer relative group">
        <div
          className="relative w-16 h-16 sm:w-20 sm:h-20"
          onClick={() => setShowOptions(!showOptions)}
        >
          <div className={cn(
            "w-full h-full rounded-2xl border-2 border-dashed border-muted-foreground/30 group-hover:border-primary flex items-center justify-center transition-colors bg-secondary/50",
            uploading && "animate-pulse"
          )}>
            {uploading ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg shadow-primary/30">
            <Plus size={12} />
          </div>
        </div>
        <span className="text-xs mt-2 font-medium text-muted-foreground">Add Story</span>

        {/* Options Dropdown */}
        {showOptions && (
          <div className="absolute top-20 left-0 glass-strong rounded-xl p-2 shadow-xl z-20 w-32 flex flex-col gap-2 animate-scale-in">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center text-xs text-foreground p-2 hover:bg-secondary rounded transition-colors"
            >
              <ImageIcon size={14} className="mr-2" /> Gallery
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
      </div>

      {/* Story Items */}
      {Object.values(groupedStories).map((story, index) => (
        <div
          key={story.id}
          className="flex flex-col items-center flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
          onClick={() => setViewingStoryIndex(stories.findIndex(s => s.id === story.id))}
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 p-[2px] rounded-2xl bg-gradient-pulse">
            <div className="bg-background w-full h-full rounded-[14px] overflow-hidden border-2 border-background">
              <img
                src={story.image_url}
                alt={story.profile?.username || "Story"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <span className="text-xs mt-2 font-medium text-muted-foreground truncate w-16 text-center">
            {story.profile?.username || "User"}
          </span>
        </div>
      ))}

      {stories.length === 0 && (
        <div className="flex items-center justify-center text-muted-foreground text-sm py-4">
          No stories yet. Be the first!
        </div>
      )}

      {/* Story Viewer Modal */}
      {viewingStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewingStoryIndex}
          onClose={() => setViewingStoryIndex(null)}
        />
      )}
    </div>
  );
};
