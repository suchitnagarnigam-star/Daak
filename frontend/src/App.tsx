import { useRef, useState } from "react";

import CameraScreen, {
  type CameraScreenHandle,
} from "./CameraScreen";

import ProcessingScreen from "./ProcessingScreen";
import type { ProcessingStage } from "./ProcessingScreen";

import ResultScreen from "./ResultScreen";
import HistoryScreen from "./HistoryScreen";
import QueueScreen from "./QueueScreen";

import CircularNavigation, {
  type NavigationItem,
} from "./components/CircularNavigation";

import mclLogo from "./assets/mcl-logo.png";

import "./App.css";

type Screen = "camera" | "processing" | "result";

const INITIAL_STAGES: ProcessingStage[] = [
  {
    id: "upload",
    label: "Uploading Document",
    status: "pending",
  },
  {
    id: "processing",
    label: "Processing",
    status: "pending",
  },
  {
    id: "ocr",
    label: "OCR",
    status: "pending",
  },
  {
    id: "llm",
    label: "LLM",
    status: "pending",
  },
];

export default function App() {
  const [screen, setScreen] =
    useState<Screen>("camera");

  const [stages, setStages] =
    useState<ProcessingStage[]>(INITIAL_STAGES);

  const [extractedData, setExtractedData] =
    useState<Record<string, string | null> | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [activeNavItem, setActiveNavItem] =
    useState<NavigationItem>("camera");

  const cameraRef =
    useRef<CameraScreenHandle | null>(null);


  /*
   * =====================================================
   * NAVIGATION
   * =====================================================
   */

  const handleNavigation = (
    item: NavigationItem
  ) => {
    /*
     * Camera is already active.
     * The actual capture is handled by
     * onCameraCapture below.
     */
    if (item === "camera") {
      setActiveNavItem("camera");
      setScreen("camera");
      return;
    }

    setActiveNavItem(item);

    /*
     * History / Queue are normal navigation pages.
     */
    setScreen("camera");
  };


  /*
   * =====================================================
   * PROCESSING STAGE
   * =====================================================
   */

  const updateStage = (
    id: string,
    status: ProcessingStage["status"],
    message?: string
  ) => {
    setStages((previous) =>
      previous.map((stage) =>
        stage.id === id
          ? {
              ...stage,
              status,
              message,
            }
          : stage
      )
    );
  };


  /*
   * =====================================================
   * RESET
   * =====================================================
   */

  const handleReset = () => {
    setStages(INITIAL_STAGES);
    setExtractedData(null);
    setError(null);

    setActiveNavItem("camera");
    setScreen("camera");
  };


  /*
   * =====================================================
   * DOCUMENT PROCESSING
   * =====================================================
   */

  const handleProceed = async (
    blob: Blob
  ) => {
    setStages(INITIAL_STAGES);
    setError(null);
    setScreen("processing");

    const formData = new FormData();

    formData.append(
      "file",
      blob,
      "document.jpg"
    );

    try {
      updateStage(
        "upload",
        "processing",
        "Uploading document..."
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      updateStage(
        "upload",
        "complete"
      );

      updateStage(
        "processing",
        "processing",
        "Processing image..."
      );

      const apiUrl =
        import.meta.env.VITE_API_URL ??
        "http://localhost:8000";

      const response = await fetch(
        `${apiUrl}/upload/`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status}`
        );
      }

      const data =
        await response.json();

      updateStage(
        "processing",
        "complete"
      );

      updateStage(
        "ocr",
        "processing",
        "Extracting text..."
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      updateStage(
        "ocr",
        "complete"
      );

      updateStage(
        "llm",
        "processing",
        "Generating structured result..."
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );

      updateStage(
        "llm",
        "complete"
      );

      setExtractedData(
        data.extracted_data
      );

      setScreen("result");

    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unknown error";

      setError(message);

      updateStage(
        "upload",
        "error",
        message
      );

      updateStage(
        "processing",
        "error"
      );

      updateStage(
        "ocr",
        "error"
      );

      updateStage(
        "llm",
        "error"
      );
    }
  };


  /*
   * =====================================================
   * PAGE CONTENT
   * =====================================================
   */

  const renderPage = () => {

    /*
     * Processing is special because it is part
     * of the document workflow.
     */
    if (screen === "processing") {
      return (
        <ProcessingScreen
          stages={stages}
          session={{
            source: "Camera",
            timestamp:
              new Date().toLocaleString(),
          }}
          onAbort={handleReset}
        />
      );
    }


    /*
     * Result / review
     */
    if (
      screen === "result" &&
      extractedData
    ) {
      return (
        <ResultScreen
          data={extractedData}
          error={error ?? undefined}
          onProcessAnother={handleReset}
        />
      );
    }


    /*
     * Normal navigation pages.
     */
    switch (activeNavItem) {

      case "history":
        return <HistoryScreen />;

      case "queue":
        return <QueueScreen />;

      case "camera":
      default:
        return (
          <CameraScreen
            ref={cameraRef}
            onAccept={handleProceed}
          />
        );
    }
  };


  /*
   * =====================================================
   * GLOBAL APP LAYOUT
   * =====================================================
   */

  const isProcessing = screen === "processing";

  return (
    <div className="mcl-app">

      {/* ================= HEADER ================= */}
    {!isProcessing && (
      <header className="mcl-global-header">

        <div className="mcl-global-logo">
          <img
            src={mclLogo}
            alt="Municipal Corporation Ludhiana"
          />
        </div>

        <div className="mcl-global-title">
          <h1>MCL DAAK</h1>
          <span>
            Document Digitization
          </span>
        </div>

        <div className="mcl-global-spacer" />

      </header>
    )}

    <main
      className={
        isProcessing
          ? "mcl-page mcl-page--processing"
          : "mcl-page"
      }
    >
      {renderPage()}
    </main>

    {!isProcessing && (
      <CircularNavigation
        activeItem={activeNavItem}
        onNavigate={handleNavigation}
        onCameraCapture={() => {
          if (screen !== "camera") {
            handleReset();
          } else {
            cameraRef.current?.capture();
          }
        }}
      />
    )}

  </div>
);
}