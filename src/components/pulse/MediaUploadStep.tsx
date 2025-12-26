import { useState, useRef } from "react";
import { X, Image as ImageIcon, Video, UploadCloud, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaUploadStepProps {
  onClose: () => void;
  onFileSelect: (file: File) => void;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export const MediaUploadStep = ({
  onClose,
  onFileSelect,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: MediaUploadStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <h2 className="text-xl font-bold">Create Post</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X size={20} />
        </Button>
      </div>

      {/* Upload Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className={cn(
            "relative w-full max-w-md aspect-square rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-6 p-8",
            isDragging
              ? "border-primary bg-primary/5 scale-105"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <ImageIcon size={32} />
            </div>
            <div className="p-4 rounded-2xl bg-secondary/50 text-muted-foreground">
              <Video size={32} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Upload your content</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop or click to select photos and videos
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl px-6"
          >
            <UploadCloud size={16} className="mr-2" />
            Choose File
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};