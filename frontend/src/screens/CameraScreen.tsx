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
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const imagesRef = useRef<CapturedImage[]>([]);
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanHint, setShowScanHint] = useState(true);
  const [uploadNotice, setUploadNotice] = useState("");
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScanHint(false);
    },3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!uploadNotice) {
      return;
    }
    const timer = setTimeout(() => {
      setUploadNotice("");
    }, 1800);

    return () => clearTimeout(timer);
  }, [uploadNotice]);

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
    setUploadNotice("Image added!");
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
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        setStream(activeStream);
        const track = activeStream.getVideoTracks()[0];
        cameraTrackRef.current = track ?? null;

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
    return () => {
      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          addImage(blob);
          setCameraError("");
          setFocusPoint(null);
        }
      }, "image/jpeg", 0.95);
    }
  }, [addImage, stream]);

  const triggerFocus = useCallback((x: number, y: number) => {
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
    }

    setFocusPoint({ x, y });

    const track = cameraTrackRef.current;
    if (track && typeof track.applyConstraints === "function") {
      const focusConstraints = {
        advanced: [{
          focusMode: "continuous",
          exposureMode: "continuous",
        }],
      } as unknown as MediaTrackConstraints;

      void track
        .applyConstraints(focusConstraints)
        .catch(() => {
          // Some browsers do not support focus/exposure constraint tuning; the tap still shows the focus ring.
        });
    }

    focusTimerRef.current = window.setTimeout(() => {
      setFocusPoint(null);
    }, 700);
  }, []);

  useEffect(() => {
    const handleCaptureEvent = () => {
      const rect = videoRef.current?.getBoundingClientRect();
      const x = rect ? rect.width / 2 : 0;
      const y = rect ? rect.height / 2 : 0;
      triggerFocus(x, y);
      window.setTimeout(() => {
        captureFrame();
      }, 200);
    };

    window.addEventListener("trigger-camera-capture", handleCaptureEvent);
    return () => {
      window.removeEventListener("trigger-camera-capture", handleCaptureEvent);
    };
  }, [captureFrame, triggerFocus]);

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

  const handleScannerTap = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    triggerFocus(x, y);
  };

  return (
    <div className="capture-wrap">
      <div className="screen-head" style={{ position: "relative", zIndex: 10 }}>
        <div>
          <p className="eyebrow">DOCUMENT DIGITIZATION</p>
          <h1>SCAN</h1>
        </div>
      </div>

      {uploadNotice && (
        <div
          aria-live="polite"
          style={{
            margin: "0 16px 8px",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "#d1fae5",
            border: "1px solid #15803d",
            color: "#0f172a",
            fontSize: "14px",
            fontWeight: 700,
            textAlign: "center",
            zIndex: 30,
            position: "relative",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
          }}
        >
          {uploadNotice}
        </div>
      )}

      <div
        className="scanner"
        data-od-id="scanner"
        onPointerDown={handleScannerTap}
        style={{ overflow: "hidden", position: "relative", cursor: "pointer" }}
      >
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

        {focusPoint && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${focusPoint.x}px`,
              top: `${focusPoint.y}px`,
              width: "72px",
              height: "72px",
              border: "2px solid rgba(255, 255, 255, 0.95)",
              borderRadius: "50%",
              boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), 0 0 12px rgba(255,255,255,0.6)",
              transform: "translate(-50%, -50%)",
              zIndex: 4,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "18px",
                border: "2px solid rgba(255,255,255,0.8)",
                borderRadius: "50%",
              }}
            />
          </div>
        )}

        <div className="scanner-grid" style={{ zIndex: 1 }}></div>
        <i className="bracket tl" style={{ zIndex: 2 }}></i>
        <i className="bracket tr" style={{ zIndex: 2 }}></i>
        <i className="bracket bl" style={{ zIndex: 2 }}></i>
        <i className="bracket br" style={{ zIndex: 2 }}></i>

        {showScanHint &&(
        <div className="scan-center" style={{ zIndex: 2, background: "color-mix(in oklab, var(--bg) 60%, transparent)", padding: "16px", borderRadius: "12px" }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M6 3h9l3 3v15H6zM15 3v4h4M9 12h6M9 16h6" />
          </svg>
          <strong>A4 DETECT</strong>
          <span>Place document inside frame</span>
        </div>
        )}
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

            <div
              className="preview-strip"
              aria-live="polite"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "12px",
                width: "100%",
              }}
            >
              {images.map((image, index) => (
                <div
                  key={image.id}
                  onClick={() => setSelectedImage(image.previewUrl)}
                  style={{
                    position: "relative",
                    width: "calc((100% - 20px) / 3)",
                    minWidth: "88px",
                    maxWidth: "110px",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={image.previewUrl}
                    alt={`Page ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "110px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      display: "block",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", gap: "6px" }}>
                    <span className="hint">Page {index + 1}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeImage(image.id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", width: "100%" }}>
              <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                Upload Image
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

        {selectedImage && (
          <div
            onClick={() => setSelectedImage(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "20px",
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "relative",
                width: "min(90vw, 420px)",
                background: "#111",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  width: "32px",
                  height: "32px",
                  fontSize: "20px",
                  cursor: "pointer",
                  zIndex: 2,
                }}
              >
                ×
              </button>
              <img
                src={selectedImage}
                alt="Selected document page"
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  background: "#000",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}