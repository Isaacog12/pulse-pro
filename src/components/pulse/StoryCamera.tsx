import React, { useEffect, useRef, useState } from "react";
import { Camera, RotateCw, Video, X, Check, Image as ImageIcon } from "lucide-react";

interface StoryCameraProps {
  onCapture: (blob: Blob, filenameHint?: string) => void;
  onClose: () => void;
}

/**
 * StoryCamera
 * - shows video preview
 * - supports switching camera (if device supports multiple inputs)
 * - capture photo (snapshot) or record video (MediaRecorder)
 */
const StoryCamera: React.FC<StoryCameraProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // init camera
  useEffect(() => {
    let mounted = true;

    const getDevicesAndStream = async () => {
      try {
        // request camera permission and stream
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (!mounted) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((d) => d.kind === "videoinput"));
      } catch (err: any) {
        console.error("camera error", err);
        setError(err?.message || "Failed to access camera");
      }
    };

    getDevicesAndStream();

    return () => {
      mounted = false;
      // stop tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // switch camera by toggling facing mode (works on many phones)
  const switchCamera = () => {
    setFacingMode((f) => (f === "user" ? "environment" : "user"));
  };

  // take photo: draw to canvas then convert to blob
  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((res) => {
      canvas.toBlob((b) => res(b), "image/jpeg", 0.92);
    });
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    setPhotoPreview(url);
  };

  // start recording video
  const startRecording = () => {
    if (!streamRef.current) return;
    try {
      recordedChunksRef.current = [];
      const options = { mimeType: "video/webm;codecs=vp8,opus" } as any;
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      recorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoPreview(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("recorder err", err);
      setError("Video recording not supported on this device");
    }
  };

  // stop recording
  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // confirm photo capture
  const confirmPhoto = async () => {
    if (!photoPreview) return;
    // fetch blob from preview url
    const resp = await fetch(photoPreview);
    const blob = await resp.blob();
    onCapture(blob, "photo.jpg");
    URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  // confirm video capture
  const confirmVideo = async () => {
    if (!videoPreview) return;
    const resp = await fetch(videoPreview);
    const blob = await resp.blob();
    onCapture(blob, "video.webm");
    URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  };

  // cancel previews
  const cancelPreview = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  return (
    <div className="w-full h-full max-w-xl mx-auto relative bg-black flex flex-col">
      <div className="flex items-center justify-between p-3">
        <button onClick={() => { cancelPreview(); onClose(); }} className="p-2 rounded-full bg-black/40">
          <X size={20} className="text-white" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={switchCamera}
            title="Switch camera"
            className="p-2 rounded-full bg-black/30"
          >
            <RotateCw size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Video preview area */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {/* live preview */}
        {!photoPreview && !videoPreview && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />
        )}

        {/* captured photo preview */}
        {photoPreview && (
          <img src={photoPreview} alt="preview" className="w-full h-full object-contain" />
        )}

        {/* recorded video preview */}
        {videoPreview && (
          <video src={videoPreview} className="w-full h-full object-contain" controls />
        )}

        {/* small overlay hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80">
          {!photoPreview && !videoPreview ? "Tap Capture for Photo — Hold to Record" : ""}
        </div>
      </div>

      {/* controls */}
      <div className="p-4 bg-gradient-to-t from-black/60 to-transparent flex flex-col gap-3">
        {/* preview actions */}
        {(photoPreview || videoPreview) ? (
          <div className="flex gap-3 items-center justify-center">
            <button onClick={cancelPreview} className="px-4 py-2 rounded-lg border border-white/20 text-white/90">Retake</button>
            <button
              onClick={photoPreview ? confirmPhoto : confirmVideo}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold"
            >
              Post
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              {/* Capture button: click -> photo, long-press -> record */}
              <CaptureButton
                isRecording={isRecording}
                onClick={() => takePhoto()}
                onHoldStart={() => startRecording()}
                onHoldEnd={() => stopRecording()}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      // preview it immediately
                      const previewUrl = URL.createObjectURL(f);
                      if (f.type.startsWith("video")) setVideoPreview(previewUrl);
                      else setPhotoPreview(previewUrl);
                    }
                  }}
                />
                <div className="p-2 rounded-full bg-black/30">
                  <ImageIcon size={18} className="text-white" />
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* error message */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs px-3 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default StoryCamera;

/**
 * CaptureButton: handles click for photo, hold for recording.
 * - onClick: short press -> photo
 * - onHoldStart: press and hold -> start recording
 * - onHoldEnd: release -> stop recording
 */
const CaptureButton: React.FC<{
  isRecording: boolean;
  onClick: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}> = ({ isRecording, onClick, onHoldStart, onHoldEnd }) => {
  const holdTimeout = useRef<number | null>(null);
  const holding = useRef(false);

  // start hold after small delay to avoid accidental
  const handlePointerDown = () => {
    holding.current = false;
    // 250ms threshold for hold
    holdTimeout.current = window.setTimeout(() => {
      holding.current = true;
      onHoldStart();
    }, 250);
  };

  const handlePointerUp = () => {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
    if (holding.current) {
      // was recording -> stop
      onHoldEnd();
      holding.current = false;
    } else {
      // quick tap -> take photo
      onClick();
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div
        role="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center",
          isRecording ? "bg-red-600/80" : "bg-white/90"
        )}
      >
        <div className={cn("w-14 h-14 rounded-full", isRecording ? "bg-white/30" : "bg-black/90")} />
      </div>
    </div>
  );
};
