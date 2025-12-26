import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MediaUploadStep } from "./MediaUploadStep";
import { MediaEditStep } from "./MediaEditStep";
import { CaptionStep } from "./CaptionStep";

const FILTERS = [
  { name: "Normal", class: "" },
  { name: "Vivid", class: "saturate-150 contrast-110" },
  { name: "B&W", class: "grayscale contrast-125" },
  { name: "Vintage", class: "sepia contrast-90 brightness-110" },
  { name: "Warm", class: "sepia-[.3] contrast-100 brightness-105" },
  { name: "Cool", class: "hue-rotate-15 contrast-100" },
  { name: "Dramatic", class: "contrast-125 saturate-110 brightness-90" },
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaData(event.target?.result as string);
      setStep("edit");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handlePost = async () => {
    if (!mediaData || !user) return;
    setLoading(true);
    
    // Convert base64 to blob (simplified for demo, usually you upload the file directly)
    // For this example, we assume mediaData is handled by your backend or Supabase storage logic correctly
    // In a real app, you'd upload the FILE object to Supabase Storage, get a URL, then insert the row.
    
    // Simulating upload for now, assuming base64 string is what your DB takes (not recommended for prod, but matches your code)
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      image_url: mediaData, 
      caption: caption.trim() || null,
      filter: mediaType === "image" ? (selectedFilter.class || null) : null,
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post shared successfully!");
      onPostCreated();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      {/* Modal Content */}
      <div className={cn(
        "relative w-[95%] md:w-full max-w-4xl bg-background/30 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col",
        step === "select" ? "h-auto" : "h-[85vh] md:max-h-[800px]"
      )}>
        {step === "select" && (
          <MediaUploadStep
            onClose={onClose}
            onFileSelect={processFile}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        )}

        {step === "edit" && mediaData && (
          <MediaEditStep
            mediaData={mediaData}
            mediaType={mediaType}
            selectedFilter={selectedFilter}
            onFilterSelect={setSelectedFilter}
            onBack={() => setStep("select")}
            onNext={() => setStep("caption")}
          />
        )}

        {step === "caption" && mediaData && (
          <CaptionStep
            mediaData={mediaData}
            mediaType={mediaType}
            selectedFilter={selectedFilter}
            caption={caption}
            onCaptionChange={setCaption}
            onBack={() => setStep("edit")}
            onPost={handlePost}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};