import { useState } from "react";
import { ArrowLeft, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { name: "Normal", class: "" },
  { name: "Vivid", class: "saturate-150 contrast-110" },
  { name: "B&W", class: "grayscale contrast-125" },
  { name: "Vintage", class: "sepia contrast-90 brightness-110" },
  { name: "Warm", class: "sepia-[.3] contrast-100 brightness-105" },
  { name: "Cool", class: "hue-rotate-15 contrast-100" },
  { name: "Dramatic", class: "contrast-125 saturate-110 brightness-90" },
];

interface MediaEditStepProps {
  mediaData: string;
  mediaType: "image" | "video";
  selectedFilter: { name: string; class: string };
  onFilterSelect: (filter: { name: string; class: string }) => void;
  onBack: () => void;
  onNext: () => void;
}

export const MediaEditStep = ({
  mediaData,
  mediaType,
  selectedFilter,
  onFilterSelect,
  onBack,
  onNext,
}: MediaEditStepProps) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-xl font-bold">Edit Media</h2>
        <Button onClick={onNext} className="rounded-xl">
          Next
        </Button>
      </div>

      {/* Media Preview */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative max-w-md w-full">
          {mediaType === "video" ? (
            <video
              src={mediaData}
              className="w-full rounded-2xl"
              controls
              muted
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

      {/* Filters */}
      {mediaType === "image" && (
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Wand2 size={16} className="text-primary" />
            <span className="text-sm font-medium">Filters</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.name}
                onClick={() => onFilterSelect(filter)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all",
                  selectedFilter.name === filter.name
                    ? "border-primary scale-105"
                    : "border-white/20 hover:border-white/40"
                )}
              >
                <img
                  src={mediaData}
                  alt={filter.name}
                  className={cn("w-full h-full object-cover", filter.class)}
                />
              </button>
            ))}
          </div>

          <div className="text-center mt-2">
            <span className="text-sm text-muted-foreground">{selectedFilter.name}</span>
          </div>
        </div>
      )}
    </div>
  );
};