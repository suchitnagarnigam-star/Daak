import {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./CameraScreen.css";
import type { ChangeEvent } from "react";

import mclLogo from "./assets/mcl-logo.png";

<<<<<<< HEAD
export default function CameraScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
=======
interface CameraScreenProps {
  onAccept?: (image: Blob) => void | Promise<void>;
}

interface VideoCapabilitiesWithTorch
  extends MediaTrackCapabilities {
  torch?: boolean;
}

interface VideoConstraintsWithTorch
  extends MediaTrackConstraintSet {
  torch?: boolean;
}

export interface CameraScreenHandle {
  capture: () => void;
}
const CameraScreen = forwardRef<
  CameraScreenHandle,
  CameraScreenProps
>(function CameraScreen(
  {
    onAccept,
  },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
<<<<<<< Updated upstream
  const fileInputRef = useRef<HTMLInputElement | null>(null)
>>>>>>> c728c2079154a0934e29b17955cfa132b21c3d8b
=======
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
>>>>>>> Stashed changes

  const [cameraError, setCameraError] = useState("");
  const [capturedImage, setCapturedImage] =
    useState<string | null>(null);

  const [capturedBlob, setCapturedBlob] =
    useState<Blob | null>(null);

  const [torchAvailable, setTorchAvailable] =
    useState(false);

  const [torchEnabled, setTorchEnabled] =
    useState(false);

  const [isCapturing, setIsCapturing] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  /*
   * Start the device camera.
   */
  const startCamera = useCallback(async () => {
    try {
      setCameraError("");
      setTorchAvailable(false);
      setTorchEnabled(false);

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      /*
       * Stop an existing stream before opening another one.
       */
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
        trackRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1920,
            },
            height: {
              ideal: 1080,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];

      trackRef.current = track;

      /*
       * Check whether the physical camera supports
       * torch/flashlight control.
       */
      const capabilities =
        track.getCapabilities() as VideoCapabilitiesWithTorch;

      if (capabilities.torch === true) {
        setTorchAvailable(true);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera access error:", error);

      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to access the camera. Please allow camera permission."
      );
    }
  }, []);

  /*
   * Stop the current camera stream.
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    trackRef.current = null;
    setTorchEnabled(false);
  }, []);

  /*
   * Start camera on mount.
   */
  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  /*
   * Toggle the real device flashlight.
   *
   * This only works on devices/browsers which expose
   * the torch capability.
   */
  const toggleTorch = async () => {
    const track = trackRef.current;

    if (!track || !torchAvailable) {
      return;
    }

    try {
      const nextTorchState = !torchEnabled;

      await track.applyConstraints({
        advanced: [
          {
            torch: nextTorchState,
          } as VideoConstraintsWithTorch,
        ],
      });

      setTorchEnabled(nextTorchState);
    } catch (error) {
      console.error(
        "Unable to toggle camera torch:",
        error
      );
    }
  };

  /*
   * Calculate the actual source area represented
   * by the visible document guide.
   *
   * This is important because the <video> uses
   * object-fit: cover.
   *
   * We therefore cannot simply draw the entire video
   * into the canvas.
   */
  const calculateCrop = () => {
    const video = videoRef.current;

    if (!video) {
      return null;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      return null;
    }

    const videoRect =
      video.getBoundingClientRect();

    const guideElement =
      document.querySelector(
        ".camera-document-guide"
      ) as HTMLElement | null;

    if (!guideElement) {
      return null;
    }

    const guideRect =
      guideElement.getBoundingClientRect();

    /*
     * CSS object-fit: cover
     *
     * Determine how much the source image was scaled
     * to fill the video element.
     */
    const scale = Math.max(
      videoRect.width / videoWidth,
      videoRect.height / videoHeight
    );

    const renderedWidth =
      videoWidth * scale;

    const renderedHeight =
      videoHeight * scale;

    /*
     * Amount cropped by object-fit: cover.
     */
    const offsetX =
      (renderedWidth - videoRect.width) / 2;

    const offsetY =
      (renderedHeight - videoRect.height) / 2;

    /*
     * Position of the guide relative to the
     * displayed video.
     */
    const guideX =
      guideRect.left - videoRect.left;

    const guideY =
      guideRect.top - videoRect.top;

    /*
     * Convert displayed pixels back to camera
     * source pixels.
     */
    let sourceX =
      (guideX + offsetX) / scale;

    let sourceY =
      (guideY + offsetY) / scale;

    let sourceWidth =
      guideRect.width / scale;

    let sourceHeight =
      guideRect.height / scale;

    /*
     * Clamp the crop to the actual source image.
     */
    sourceX = Math.max(
      0,
      Math.min(sourceX, videoWidth)
    );

    sourceY = Math.max(
      0,
      Math.min(sourceY, videoHeight)
    );

    sourceWidth = Math.min(
      sourceWidth,
      videoWidth - sourceX
    );

    sourceHeight = Math.min(
      sourceHeight,
      videoHeight - sourceY
    );

    if (
      sourceWidth <= 0 ||
      sourceHeight <= 0
    ) {
      return null;
    }

    return {
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
    };
  };

  /*
   * Capture only the document area.
   */
  const captureImage = async () => {
    if (isCapturing) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (
      video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return;
    }

    setIsCapturing(true);

    try {
      const crop = calculateCrop();

      if (!crop) {
        throw new Error(
          "Unable to determine the document capture area."
        );
      }

      /*
       * Output dimensions correspond to the
       * actual cropped camera resolution.
       */
      canvas.width = Math.round(
        crop.sourceWidth
      );

      canvas.height = Math.round(
        crop.sourceHeight
      );

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Unable to create image processing canvas."
        );
      }

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      /*
       * Draw ONLY the guide rectangle from the
       * actual camera frame.
       */
      context.drawImage(
        video,
        crop.sourceX,
        crop.sourceY,
        crop.sourceWidth,
        crop.sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      /*
       * Convert the real canvas image into JPEG.
       */
      const blob =
        await new Promise<Blob | null>(
          (resolve) => {
            canvas.toBlob(
              resolve,
              "image/jpeg",
              0.95
            );
          }
        );

      if (!blob) {
        throw new Error(
          "Unable to create captured image."
        );
      }

      /*
       * Preview URL.
       */
      const previewUrl =
        URL.createObjectURL(blob);

      setCapturedBlob(blob);
      setCapturedImage(previewUrl);

      stopCamera();
    } catch (error) {
      console.error(
        "Document capture error:",
        error
      );

      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to capture the document."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return
    const
     url = URL.createObjectURL(file)
    const blob = await fetch(url).then(r => r.blob())
    stopCamera()
    onCapture(url, blob)
  }


  useImperativeHandle(ref, () => ({
    capture: () => {
      void captureImage();
    },
  }));

  /*
   * Discard current capture and open camera again.
   */
  const retakeImage = async () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }


    setCapturedImage(null);
    setCapturedBlob(null);
    setCameraError("");

    await startCamera();
  };

  const handleFileUpload = (
  event: ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

<<<<<<< Updated upstream
  const acceptImage = async (): Promise<void> => {
<<<<<<< HEAD
    if (!capturedImage) {
      return;
    }

    /*
      IMPORTANT:

      This is where the captured image will be
      passed to your REAL backend OCR pipeline.

      Example:

      const blob = await fetch(capturedImage)
        .then((response) => response.blob());

      const formData = new FormData();

      formData.append(
        "file",
        blob,
        "document.jpg"
      );

      await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      Do NOT add fake OCR results or fake
      processing values.
    */

    console.log(
      "Captured document ready for backend processing."
    );
=======
    if (!capturedImage) return
    const blob = await fetch(capturedImage).then(r => r.blob())
    onCapture(capturedImage, blob)
>>>>>>> c728c2079154a0934e29b17955cfa132b21c3d8b
=======
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setCameraError("Please select a valid image file.");
    return;
  }

  if (capturedImage) {
    URL.revokeObjectURL(capturedImage);
  }

  const previewUrl = URL.createObjectURL(file);

  setCapturedBlob(file);
  setCapturedImage(previewUrl);
  setCameraError("");

  stopCamera();
};

  /*
   * Accept the REAL captured image.
   *
   * No OCR data is generated here.
   * The parent application should send this
   * Blob to the actual backend pipeline.
   */
  const acceptImage = async () => {
    if (!capturedBlob || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (onAccept) {
        await onAccept(capturedBlob);
      } else {
        /*
         * No fake processing is performed.
         *
         * The application can connect this callback
         * to the real backend upload/OCR pipeline.
         */
        console.info(
          "Captured document ready for backend processing.",
          {
            size: capturedBlob.size,
            type: capturedBlob.type,
          }
        );
      }
    } catch (error) {
      console.error(
        "Document submission error:",
        error
      );

      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to submit the document."
      );
    } finally {
      setIsSubmitting(false);
    }
>>>>>>> Stashed changes
  };

  /*
   * Release preview URL when component unmounts
   * or when a new capture replaces it.
   */
  useEffect(() => {
    return () => {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  return (
    <div className="camera-screen">  

      {/* ================= MAIN CAMERA ================= */}

      <main className="camera-main">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
            />

            {/* Darkened area outside document guide */}
            <div className="camera-overlay" />

            {/* ================= DOCUMENT GUIDE ================= */}

            <div className="camera-document-guide">
              <div className="camera-guide-corner camera-guide-corner--tl" />
              <div className="camera-guide-corner camera-guide-corner--tr" />
              <div className="camera-guide-corner camera-guide-corner--bl" />
              <div className="camera-guide-corner camera-guide-corner--br" />

              <div className="camera-scanner-line" />
            </div>

            {/* ================= CAMERA CONTROLS ================= */}

            <div className="camera-controls">

              {/* Flashlight */}

              {torchAvailable && (
    <button
      type="button"
      className={`camera-control-button ${
        torchEnabled
          ? "camera-control-button--active"
          : ""
      }`}
      onClick={toggleTorch}
      aria-label={
        torchEnabled
          ? "Turn flashlight off"
          : "Turn flashlight on"
      }
    >
      <span className="material-symbols-outlined">
        {torchEnabled ? "flash_on" : "flash_off"}
      </span>
    </button>
              )}

              {/* Upload Image */}

              <button
                type="button"
    className="upload-image-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined">             
      upload
                </span>

                <span>Upload Image</span>
              </button>

              <input
                ref={fileInputRef}             
    type="file"
    accept="image/*"
    hidden
                onChange={handleFileUpload}
              />

              {/* Keep upload button centered when flashlight exists */}

              {torchAvailable && (             
    <div className="camera-control-spacer" />
              )}

            </div>             

            {/* ================= CAMERA ERROR ================= */}

            {cameraError && (
              <div className="camera-error">
                <span className="material-symbols-outlined">
                  videocam_off
                </span>

                <p>{cameraError}</p>

                <button
                  type="button"
                  onClick={() => {
                    void startCamera();
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
<<<<<<< Updated upstream


            {/* DOCUMENT GUIDE */}

            <div className="document-guide">

              <div className="corner corner-tl" />
              <div className="corner corner-tr" />
              <div className="corner corner-bl" />
              <div className="corner corner-br" />


              {/* SCANNER LINE */}

              <div className="scanner-line" />


              {/* CENTER CROSSHAIR */}

              <div className="crosshair">

                <div />

                <span />

              </div>


              {/* CAMERA INFORMATION */}

              <div className="camera-readout">

                <span>
                  ISO: AUTO
                </span>

                <span>
                  EXP: 0.0
                </span>

                <strong>
                  ALIGN DOC
                </strong>

              </div>

            </div>


            {/* CAMERA CONTROL */}

            <div className="camera-controls">

              <button
<<<<<<< HEAD
=======
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload from gallery"
                type="button"
              >
                <span className="material-symbols-outlined">
                  upload_file
                </span>
              </button>

              <button
>>>>>>> c728c2079154a0934e29b17955cfa132b21c3d8b
                className="capture-button"
                onClick={captureImage}
                aria-label="Capture document"
                type="button"
              >
<<<<<<< HEAD

                <div className="capture-inner">

                  <span className="material-symbols-outlined">
                    photo_camera
                  </span>

                </div>

              </button>

=======
                <div className="capture-inner">
                  <span className="material-symbols-outlined">
                    photo_camera
                  </span>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

>>>>>>> c728c2079154a0934e29b17955cfa132b21c3d8b
            </div>

=======
>>>>>>> Stashed changes
          </>
        ) : (
          /* ================= REVIEW ================= */

          <div className="camera-review">
            <img
              src={capturedImage}
              alt="Captured document"
              className="captured-document"
            />

            <div className="review-top-bar">
              <span>
                Review Document
              </span>
            </div>

            <div className="review-actions">
              {/* CROSS */}

              <button
                type="button"
                className="review-action review-action--retake"
                onClick={() => {
                  void retakeImage();
                }}
                disabled={isSubmitting}
                aria-label="Retake document"
              >
                <span className="material-symbols-outlined">
                  close
                </span>

                <span>Retake</span>
              </button>

              {/* TICK */}

              <button
                type="button"
                className="review-action review-action--accept"
                onClick={() => {
                  void acceptImage();
                }}
                disabled={isSubmitting}
                aria-label="Accept document"
              >
                <span className="material-symbols-outlined">
                  check
                </span>

                <span>
                  {isSubmitting
                    ? "Processing..."
                    : "Proceed"}
                </span>
              </button>
            </div>

            {cameraError && (
              <div className="review-error">
                {cameraError}
              </div>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="capture-canvas"
        />
      </main>
      
    </div>
  );
})

export default CameraScreen;