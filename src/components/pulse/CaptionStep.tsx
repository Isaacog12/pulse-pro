import { useState } from "react";
import { ArrowLeft, MapPin, Hash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CaptionStepProps {
  mediaData: string;
  mediaType: "image" | "video";
  selectedFilter: { name: string; class: string };
  caption: string;
  onCaptionChange: (caption: string) => void;
  onBack: () => void;
  onPost: () => void;
  loading: boolean;
}

export const CaptionStep = ({
  mediaData,
  mediaType,
  selectedFilter,
  caption,
  onCaptionChange,
  onBack,
  onPost,
  loading,
}: CaptionStepProps) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-xl font-bold">Add Caption</h2>
        <Button onClick={onPost} disabled={loading} className="rounded-xl">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Share"}
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Media Preview */}
        <div className="w-1/2 p-6 flex items-center justify-center">
          <div className="relative w-full max-w-sm">
            {mediaType === "video" ? (
              <video
                src={mediaData}
                className="w-full rounded-2xl"
                muted
                playsInline
              />
            ) : (
              <img
                src={mediaData}
                alt="Preview"
                className={cn("w-full rounded-2xl object-cover", selectedFilter.class)}
              />
            )}
          </div>
        </div>

        {/* Caption Input */}
        <div className="w-1/2 p-6 flex flex-col">
          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            className="flex-1 resize-none border-white/10 rounded-xl focus:border-primary"
            maxLength={2200}
          />

          <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
            <span>{caption.length}/2200</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <MapPin size={14} className="mr-1" />
                Location
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Hash size={14} className="mr-1" />
                Tags
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};