import { useRef, useState, useEffect } from "react";

interface CameraScreenProps {
  onAccept: (blob: Blob) => void;
}

export default function CameraScreen({ onAccept }: CameraScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Initialize camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    async function setupCamera() {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (err) {
        console.error("Failed to access camera", err);
      }
    }
    
    setupCamera();

    // Cleanup function to stop tracks when component unmounts
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Listen for the custom dock button event
  useEffect(() => {
    const handleCaptureEvent = () => {
      captureFrame();
    };

    window.addEventListener('trigger-camera-capture', handleCaptureEvent);
    return () => {
      window.removeEventListener('trigger-camera-capture', handleCaptureEvent);
    };
  }, [stream]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a Blob and accept it
        canvas.toBlob((blob) => {
          if (blob) {
            onAccept(blob);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Create previews
    const newPreviews = Array.from(files).slice(0, 3).map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);
    
    // Just accept the first file for now to proceed to processing
    const firstFile = files[0];
    onAccept(firstFile);
  };

  return (
    <div className="capture-wrap">
      <div className="screen-head" style={{position: 'relative', zIndex: 10}}>
        <div>
          <p className="eyebrow">DOCUMENT DIGITIZATION</p>
          <h1>SCAN</h1>
        </div>
      </div>
      
      <div className="scanner" data-od-id="scanner" style={{ overflow: 'hidden', position: 'relative' }}>
        {/* Live Video Feed */}
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0
          }}
        />
        
        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="scanner-grid" style={{ zIndex: 1 }}></div>
        <i className="bracket tl" style={{ zIndex: 2 }}></i>
        <i className="bracket tr" style={{ zIndex: 2 }}></i>
        <i className="bracket bl" style={{ zIndex: 2 }}></i>
        <i className="bracket br" style={{ zIndex: 2 }}></i>
        <div className="scan-center" style={{ zIndex: 2, background: 'color-mix(in oklab, var(--bg) 60%, transparent)', padding: '16px', borderRadius: '12px' }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M6 3h9l3 3v15H6zM15 3v4h4M9 12h6M9 16h6" />
          </svg>
          <strong>A4 DETECT</strong>
          <span>Place document inside frame</span>
        </div>
      </div>
      
      <div className="capture-actions" style={{position: 'relative', zIndex: 10}}>
        <input 
          id="camera-file-input"
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          multiple 
          hidden 
          onChange={handleFileUpload} 
        />
        <button 
          className="btn btn-primary" 
          data-od-id="upload-image"
          onClick={() => fileInputRef.current?.click()}
        >
          UPLOAD IMAGE
        </button>
        <span className="hint">1–3 images per submission</span>
        
        {previews.length > 0 && (
          <div className="preview-strip" aria-live="polite">
            {previews.map((src, i) => (
              <img key={i} src={src} alt="Preview" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}