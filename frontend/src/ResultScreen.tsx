import { useMemo, useState } from "react";
import "./ResultScreen.css";

export interface OCRResultData {
  /**
   * Actual OCR text returned by the backend.
   */
  text: string;

  /**
   * Languages actually detected by the OCR pipeline.
   *
   * Example:
   * ["en", "hi", "pa"]
   *
   * This should come from the backend.
   */
  detectedLanguages?: string[];

  /**
   * Overall OCR confidence if the backend/OCR engine
   * provides one.
   *
   * IMPORTANT:
   * Do not calculate or invent this value on the UI.
   */
  confidence?: number;

  /**
   * Backend processing status.
   */
  status?: "valid" | "partial" | "failed" | "processing";

  /**
   * Optional backend/session information.
   */
  documentId?: string;
  fileName?: string;
  processedAt?: string;

  /**
   * Optional error returned by the backend.
   */
  error?: string;
}

interface ResultScreenProps {
  result: OCRResultData;

  /**
   * Start another document capture.
   */
  onProcessAnother?: () => void;
}

export default function ResultScreen({
  result,
  onProcessAnother,
}: ResultScreenProps) {

  const [copied, setCopied] = useState(false);

  /*
   * Normalize language values only for display.
   *
   * We are NOT detecting languages here.
   * The backend remains the source of truth.
   */
  const languages = useMemo(() => {
    if (!result.detectedLanguages) {
      return [];
    }

    return result.detectedLanguages.map((language) =>
      language.toUpperCase()
    );
  }, [result.detectedLanguages]);


  /* =========================================
     COPY OCR TEXT
     ========================================= */

  const handleCopy = async () => {
    if (!result.text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.text);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);

    } catch (error) {
      console.error("Unable to copy OCR text:", error);
    }
  };


  /* =========================================
     DOWNLOAD OCR TEXT
     ========================================= */

  const handleDownload = () => {
    if (!result.text) {
      return;
    }

    const blob = new Blob(
      [result.text],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;

    /*
     * Use the real file name when available.
     * Otherwise use a generic filename.
     */
    const baseName = result.fileName
      ? result.fileName.replace(/\.[^/.]+$/, "")
      : "mcl-ocr-result";

    anchor.download = `${baseName}.txt`;

    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };


  /* =========================================
     STATUS DISPLAY
     ========================================= */

  const statusLabel = (() => {
    switch (result.status) {
      case "valid":
        return "Valid";

      case "partial":
        return "Partial";

      case "failed":
        return "Failed";

      case "processing":
        return "Processing";

      default:
        return null;
    }
  })();


  return (
    <div className="result-screen">

      {/* =========================================
          HEADER
          ========================================= */}

      <header className="result-header">

        <button
          className="result-header-button"
          type="button"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">
            menu
          </span>
        </button>


        <h1 className="result-brand">
          MCL PATR
        </h1>


        <button
          className="result-header-button"
          type="button"
          aria-label="Account"
        >
          <span className="material-symbols-outlined">
            account_circle
          </span>
        </button>

      </header>


      {/* =========================================
          MAIN
          ========================================= */}

      <main className="result-main">

        {/* =======================================
            RESULT HEADER
            ======================================= */}

        <section className="result-heading">

          <div>

            <h2>
              OCR Extraction Result
            </h2>

            <p>
              Document successfully processed via Mistral OCR engine.
            </p>

          </div>


          {/* STATUS */}

          <div className="result-badges">

            {statusLabel && (
              <span
                className={`result-badge ${
                  result.status === "failed"
                    ? "error"
                    : ""
                }`}
              >

                <span className="material-symbols-outlined">
                  {result.status === "failed"
                    ? "error"
                    : "check_circle"}
                </span>

                Status: {statusLabel}

              </span>
            )}


            {/* =================================
                CONFIDENCE

                Only render if the backend
                actually provided confidence.
                ================================= */}

            {typeof result.confidence === "number" && (
              <span className="result-badge confidence">

                <span className="material-symbols-outlined">
                  psychology
                </span>

                Conf: {result.confidence.toFixed(1)}%

              </span>
            )}

          </div>

        </section>


        {/* =========================================
            ERROR
            ========================================= */}

        {result.error && (
          <div className="result-error">

            <span className="material-symbols-outlined">
              error
            </span>

            <span>
              {result.error}
            </span>

          </div>
        )}


        {/* =========================================
            DETECTED LANGUAGES
            ========================================= */}

        {languages.length > 0 && (

          <section className="language-section">

            <span className="language-label">
              Detected Languages:
            </span>

            <div className="language-list">

              {languages.map((language) => (

                <span
                  className="language-tag"
                  key={language}
                >
                  {language}
                </span>

              ))}

            </div>

          </section>

        )}


        {/* =========================================
            DOCUMENT METADATA

            Only display values actually supplied
            by backend.
            ========================================= */}

        {(result.documentId ||
          result.fileName ||
          result.processedAt) && (

          <section className="document-meta">

            {result.documentId && (
              <div>
                <span>ID</span>
                <strong>
                  {result.documentId}
                </strong>
              </div>
            )}

            {result.fileName && (
              <div>
                <span>File</span>
                <strong>
                  {result.fileName}
                </strong>
              </div>
            )}

            {result.processedAt && (
              <div>
                <span>Processed</span>
                <strong>
                  {result.processedAt}
                </strong>
              </div>
            )}

          </section>
        )}


        {/* =========================================
            OCR TEXT CANVAS
            ========================================= */}

        <section className="ocr-canvas">

          {/* Action bar */}

          <div className="ocr-action-bar">

            <button
              type="button"
              onClick={handleCopy}
              disabled={!result.text}
              title="Copy to clipboard"
            >

              <span className="material-symbols-outlined">
                {copied
                  ? "check"
                  : "content_copy"}
              </span>

            </button>


            <button
              type="button"
              onClick={handleDownload}
              disabled={!result.text}
              title="Download TXT"
            >

              <span className="material-symbols-outlined">
                download
              </span>

            </button>

          </div>


          {/* Actual OCR result */}

          <div className="ocr-text">

            {result.text ? (
              result.text
            ) : (
              <div className="empty-result">

                <span className="material-symbols-outlined">
                  description
                </span>

                <span>
                  No OCR text was returned by the processing pipeline.
                </span>

              </div>
            )}

          </div>

        </section>


        {/* =========================================
            PROCESS ANOTHER DOCUMENT
            ========================================= */}

        {onProcessAnother && (

          <div className="result-footer">

            <button
              type="button"
              className="process-another-button"
              onClick={onProcessAnother}
            >

              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings:
                    "'FILL' 1",
                }}
              >
                add_a_photo
              </span>

              Process Another Document

            </button>

          </div>

        )}

      </main>

    </div>
  );
}