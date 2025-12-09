import { useState, useRef } from "react";
import { X, Image as ImageIcon, Video, ArrowLeft, UploadCloud, Wand2, Loader2, MapPin, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-white/5 z-20">
          <div className="flex items-center gap-4">
            {step !== "select" && (
              <button 
                onClick={() => setStep(step === "caption" ? "edit" : "select")}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {step === "select" ? "Create New Post" : step === "edit" ? "Edit Media" : "New Post"}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {step === "edit" && (
              <Button 
                variant="ghost" 
                onClick={() => setStep("caption")}
                className="text-primary hover:text-primary hover:bg-primary/10 font-bold"
              >
                Next
              </Button>
            )}
            {step === "caption" && (
              <Button
                onClick={handlePost}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl px-6 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-105"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Share"}
              </Button>
            )}
            {step === "select" && (
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 relative">
          
          {/* STEP 1: SELECT */}
          {step === "select" && (
            <div 
              className={cn(
                "min-h-[400px] flex flex-col items-center justify-center transition-all duration-300 border-2 border-dashed m-6 rounded-3xl group",
                isDragging 
                  ? "border-primary bg-primary/5 scale-[0.99]" 
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary/50 to-secondary/10 flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                <UploadCloud size={48} className={cn("text-muted-foreground transition-colors", isDragging && "text-primary")} />
              </div>
              
              <h3 className="text-xl font-medium mb-2 text-center px-4">Drag photos and videos here</h3>
              <p className="text-muted-foreground mb-8 text-sm text-center px-4">Or browse from your device</p>
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 h-auto rounded-2xl shadow-lg shadow-primary/25 transition-all hover:-translate-y-1"
              >
                Select Media
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* STEP 2: EDIT */}
          {step === "edit" && mediaData && (
            <div className="flex flex-col h-full">
              {/* Preview Area */}
              <div className="flex-1 bg-black/40 flex items-center justify-center p-4 min-h-[300px] md:min-h-[400px]">
                {mediaType === "video" ? (
                  <video src={mediaData} className="max-h-[60vh] max-w-full rounded-lg shadow-2xl ring-1 ring-white/10" controls />
                ) : (
                  <img src={mediaData} alt="Edit" className={cn("max-h-[60vh] max-w-full rounded-lg shadow-2xl ring-1 ring-white/10 transition-all duration-300", selectedFilter.class)} />
                )}
              </div>

              {/* Filters Rail (Horizontal Scroll) */}
              {mediaType === "image" && (
                <div className="p-6 bg-background/40 backdrop-blur-xl border-t border-white/10 z-10">
                  <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                    <Wand2 size={16} className="text-primary" /> Filters
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {FILTERS.map((filter) => (
                      <button
                        key={filter.name}
                        onClick={() => setSelectedFilter(filter)}
                        className="group flex flex-col items-center gap-2 min-w-[80px] snap-start"
                      >
                        <div className={cn(
                          "w-20 h-20 rounded-xl overflow-hidden transition-all duration-300 ring-2 ring-offset-2 ring-offset-background/0",
                          selectedFilter.name === filter.name ? "ring-primary scale-105" : "ring-transparent opacity-70 group-hover:opacity-100 group-hover:scale-105"
                        )}>
                          <img src={mediaData} alt={filter.name} className={cn("w-full h-full object-cover", filter.class)} />
                        </div>
                        <span className={cn(
                          "text-xs font-medium transition-colors",
                          selectedFilter.name === filter.name ? "text-primary" : "text-muted-foreground"
                        )}>
                          {filter.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CAPTION */}
          {step === "caption" && mediaData && (
            <div className="flex flex-col md:flex-row h-full">
              
              {/* Media Preview Side (Top on Mobile, Left on Desktop) */}
              <div className="w-full md:w-[60%] bg-black/50 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/10 min-h-[300px]">
                 {mediaType === "video" ? (
                  <video src={mediaData} className="max-h-[40vh] md:max-h-[70vh] max-w-full rounded-xl shadow-2xl ring-1 ring-white/10" controls />
                ) : (
                  <img src={mediaData} alt="Final" className={cn("max-h-[40vh] md:max-h-[70vh] max-w-full rounded-xl shadow-2xl ring-1 ring-white/10", selectedFilter.class)} />
                )}
              </div>

              {/* Caption Side (Bottom on Mobile, Right on Desktop) */}
              <div className="w-full md:w-[40%] flex flex-col bg-background/40 backdrop-blur-xl h-full">
                
                {/* User Info */}
                <div className="p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px]">
                     <div className="w-full h-full rounded-full bg-background overflow-hidden">
                       <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} 
                        alt="User"
                        className="w-full h-full object-cover" 
                       />
                     </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">Create New Post</span>
                    <span className="text-xs text-muted-foreground">Share with your followers</span>
                  </div>
                </div>

                {/* Text Area */}
                <div className="flex-1 p-4">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="w-full h-full min-h-[150px] bg-transparent border-none resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/50 text-base leading-relaxed"
                    autoFocus
                  />
                </div>

                {/* Tools & Count */}
                <div className="p-4 border-t border-white/5 bg-white/5">
                   <div className="flex items-center gap-2 mb-4">
                     <button className="p-2 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                       <MapPin size={18} />
                     </button>
                     <button className="p-2 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                       <Hash size={18} />
                     </button>
                   </div>
                   <div className="flex justify-end text-xs text-muted-foreground font-medium">
                     {caption.length}/2200
                   </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};