import { useRef, useState, useEffect, useCallback } from "react";

interface CameraScreenProps {
  onAccept: (images: Blob[]) => void | Promise<void>;
}

interface CapturedImage {
  id: string;
  blob: Blob;
  previewUrl: string;
}

export default function CameraScreen({ onAccept }: CameraScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<CapturedImage[]>([]);
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const resetCollection = useCallback(() => {
    setImages((previous) => {
      previous.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const addImage = useCallback((blob: Blob) => {
    const previewUrl = URL.createObjectURL(blob);
    setImages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        blob,
        previewUrl,
      },
    ]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((previous) => {
      const target = previous.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return previous.filter((item) => item.id !== id);
    });
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function setupCamera() {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (err) {
        console.error("Failed to access camera", err);
        setCameraError("Camera access is unavailable.");
      }
    }

    void setupCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const handleCaptureEvent = () => {
      captureFrame();
    };

    window.addEventListener("trigger-camera-capture", handleCaptureEvent);
    return () => {
      window.removeEventListener("trigger-camera-capture", handleCaptureEvent);
    };
  }, [stream]);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          addImage(blob);
          setCameraError("");
        }
      }, "image/jpeg", 0.95);
    }
  }, [addImage, stream]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!validFiles.length) {
      setCameraError("Please select a valid image file.");
      return;
    }

    validFiles.forEach((file) => addImage(file));
    setCameraError("");
    event.target.value = "";
  };

  const handleProceed = async () => {
    if (!images.length || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onAccept(images.map((item) => item.blob));
    } catch (error) {
      console.error("Document submission error:", error);
      setCameraError(error instanceof Error ? error.message : "Unable to submit the document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="capture-wrap">
      <div className="screen-head" style={{ position: "relative", zIndex: 10 }}>
        <div>
          <p className="eyebrow">DOCUMENT DIGITIZATION</p>
          <h1>SCAN</h1>
        </div>
      </div>

      <div className="scanner" data-od-id="scanner" style={{ overflow: "hidden", position: "relative" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="scanner-grid" style={{ zIndex: 1 }}></div>
        <i className="bracket tl" style={{ zIndex: 2 }}></i>
        <i className="bracket tr" style={{ zIndex: 2 }}></i>
        <i className="bracket bl" style={{ zIndex: 2 }}></i>
        <i className="bracket br" style={{ zIndex: 2 }}></i>
        <div className="scan-center" style={{ zIndex: 2, background: "color-mix(in oklab, var(--bg) 60%, transparent)", padding: "16px", borderRadius: "12px" }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M6 3h9l3 3v15H6zM15 3v4h4M9 12h6M9 16h6" />
          </svg>
          <strong>A4 DETECT</strong>
          <span>Place document inside frame</span>
        </div>
      </div>

      <div className="capture-actions" style={{ position: "relative", zIndex: 10 }}>
        <input
          id="camera-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFileUpload}
        />

        {images.length > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "12px" }}>
              <span className="hint">Review {images.length} page{images.length > 1 ? "s" : ""}</span>
              <button type="button" className="btn btn-secondary" onClick={resetCollection}>
                Clear
              </button>
            </div>

            <div className="preview-strip" aria-live="polite" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: "10px", marginBottom: "12px" }}>
              {images.map((image, index) => (
                <div key={image.id} style={{ position: "relative" }}>
                  <img src={image.previewUrl} alt={`Page ${index + 1}`} style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "8px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", gap: "6px" }}>
                    <span className="hint">Page {index + 1}</span>
                    <button type="button" className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => removeImage(image.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                Add More
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void handleProceed()} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Proceed"}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="btn btn-primary"
              data-od-id="upload-image"
              onClick={() => fileInputRef.current?.click()}
            >
              UPLOAD IMAGE
            </button>
            <span className="hint">Capture or upload multiple pages before proceeding</span>
          </>
        )}

        {cameraError && (
          <div className="review-error" style={{ marginTop: "12px" }}>
            {cameraError}
          </div>
        )}
      </div>
    </div>
  );
}