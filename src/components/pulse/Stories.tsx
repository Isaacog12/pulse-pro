import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Story {
  id: string;
  username: string;
  userAvatar: string;
  imageUrl: string;
}

interface StoriesProps {
  stories: Story[];
  currentUserAvatar: string;
}

export const Stories = ({ stories, currentUserAvatar }: StoriesProps) => {
  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.username]) {
      acc[story.username] = { ...story, count: 0 };
    }
    acc[story.username].count++;
    return acc;
  }, {} as Record<string, Story & { count: number }>);

  return (
    <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide pb-6">
      {/* Add Story Button */}
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer relative group">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-muted-foreground/30 group-hover:border-primary flex items-center justify-center transition-colors bg-secondary/50">
            <Plus className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg shadow-primary/30">
            <Plus size={12} />
          </div>
        </div>
        <span className="text-xs mt-2 font-medium text-muted-foreground">Add Story</span>
      </div>

      {/* Story Items */}
      {Object.values(groupedStories).map((story) => (
        <div
          key={story.id}
          className="flex flex-col items-center flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 p-[2px] rounded-2xl bg-gradient-pulse">
            <div className="bg-background w-full h-full rounded-[14px] overflow-hidden border-2 border-background">
              <img
                src={story.imageUrl || story.userAvatar}
                alt={story.username}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <span className="text-xs mt-2 font-medium text-muted-foreground truncate w-16 text-center">
            {story.username}
          </span>
        </div>
      ))}
    </div>
  );
};
