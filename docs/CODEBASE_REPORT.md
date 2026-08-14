# MCL-OCR Codebase Report

**Last updated:** August 14, 2026

## Overview

This repository contains a full-stack OCR document processing system for Municipal Corporation Ludhiana (MCL). The implementation combines a FastAPI backend with Mistral OCR, OpenCV preprocessing, Claude LLM extraction, Supabase persistence, and Google Sheets archival — paired with a React + Vite frontend for multi-image document capture and result display.

**The system is fully stateless on disk.** Images are deleted from disk immediately after OCR completes. No JSON output files are written. Supabase is the sole persistence layer.

## Current Repository Structure

- `backend/` — Python backend service and deployment assets.
  - `app/` — FastAPI application package.
    - `main.py` — FastAPI app initialization with CORS middleware and router registration.
    - `config.py` — environment variable loading and external API client initialization.
    - `routes/` — API endpoints: upload, history, health.
    - `services/` — image preprocessing, OCR, LLM extraction, persistence services.
    - `utils/` — file I/O helpers (`save_uploaded_file`, `save_result_json`, `delete_file`).
    - `schemas/` — request/response model placeholders (currently empty).
  - `requirements.txt` — Python dependencies.
  - `Dockerfile` and `docker-compose.yml` — container deployment configuration.
- `frontend/` — React + Vite frontend application.
  - `src/App.tsx` — app shell with global header and `DockNavigation` footer.
  - `src/screens/` — individual screen components (Camera, Processing, Result, History).
  - `src/components/` — shared components (TopNav, DockNavigation).
  - `src/index.css` — global design system styles.
  - `package.json` — frontend dependencies and build scripts.
- `docs/` — project documentation.

## Backend Architecture

### 1. Application Entry
`backend/app/main.py`:
- Initializes FastAPI with logging configuration.
- CORS middleware configured for `localhost:5173`, `https://mcl-ocr.vercel.app`, and Vercel preview deployments.
- Registers three routers: `health_router`, `upload_router`, `history_router`.

### 2. Configuration and API Clients
`backend/app/config.py`:
- **Anthropic Claude** — structured field extraction.
- **Mistral** — loaded separately in the OCR service.
- **Gemini** — optional, available but not in the main pipeline.
- **Supabase** — `create_client()` initialized at startup; used by `supabase_service.py`.
- **Google Sheets** — webhook URL and secret loaded from env.

> Note: line 1 has a stale unused import `from anthropic.types import completion_create_params` — safe to remove.

### 3. Multi-Image Upload Flow
`backend/app/routes/upload.py` — `POST /upload/` accepts `files: list[UploadFile]`:

1. **Validate** — reject empty file list.
2. **submission_id** — `uuid4()` generated immediately on request receipt.
3. **Per-image loop**:
   - Save original to `uploads/` → OpenCV preprocessing → Mistral OCR.
   - **Delete both files from disk** immediately after OCR completes (success or failure).
   - Store only `{ img_index, filename, ocr_md }` per image — no file paths retained.
4. **Combine OCR** — concatenate all page texts with `===== BEGIN PAGE N =====` / `===== END PAGE N =====` markers.
5. **Claude** — single LLM call on the combined OCR text.
6. **Supabase** — `insert_data(llm_result)` generates and stores a `serial_number` (`MCL/{year}/{N}`).
7. **Google Sheets** — `push_to_sheets(llm_result, filename, serial_number)` via webhook.
8. **Response** — returns `serial_number`, `extracted_data`, `submission_id`, `file_count`, per-image filename list.

> **No local JSON output is written.** The `save_result_json` utility still exists but is no longer called from `upload.py`. The `output/` directory is fully obsolete.

### 4. File Handling
`backend/app/utils/file_utils.py`:
- `save_uploaded_file()` — stores raw uploads in `uploads/` temporarily.
- `save_result_json()` — writes to `output/<sanitized_filename>_<timestamp>.json` (no longer called).
- `delete_file(file_path)` — deletes a file from disk using `Path.unlink(missing_ok=True)`; silently swallows errors.

Images are deleted **inside the per-image try/except block** — both on success and on failure — so disk is never left with orphaned files.

### 5. Serial Number Generation
`backend/app/services/supabase_service.py` — `insert_data(llm_result)`:
- Queries Supabase `document_submission` table for highest existing serial in `MCL/{year}/%` pattern.
- Increments from 1000 if no records exist for the current year.
- Inserts a new row with all 8 extracted fields + `status: pending`.
- Returns the new `serial_number` string (e.g. `MCL/2026/1001`).

`get_recent_documents(limit: int = 10)`:
- Queries `document_submission` ordered by `created_at` descending, limited to `limit` rows.
- Returns `response.data` or `[]` on error/unavailable client.

### 6. Google Sheets Sync
`backend/app/services/sheets_service.py` — `push_to_sheets(llm_result, filename, serial_number)`:
- Skips gracefully if `SHEETS_WEBHOOK_URL` is not configured.
- POSTs payload `{ secret, data: { ...llm_result, serial_number, filename, processed_at (IST) } }` to the Apps Script webhook.

### 7. History Endpoint
`backend/app/routes/history.py` — `GET /history/`:
- Calls `get_recent_documents(limit=10)` from `supabase_service`.
- Maps Supabase row columns into history item shape: `id`, `serial_number`, `created_at`, `llm_result` dict, `ocr_text: "No raw text available"`.
- Returns empty list if Supabase client is unavailable or table is empty.
- **No local file fallback.** Supabase is the sole source of truth.

### 8. Image Preprocessing
`backend/app/services/opencv_services.py`:
- BGR → RGB conversion, brightness/contrast adjustment, Gaussian blur, sharpening kernel.
- Writes processed image to `processed/<filename>` temporarily.

### 9. OCR: Mistral (Primary)
`backend/app/services/mistral_ocr_services.py`:
- Base64-encodes image, sends to Mistral OCR API (`mistral-ocr-latest`).
- Returns `pages[0].markdown` text.

### 10. LLM Extraction: Claude
`backend/app/services/claude_service.py`:
- Receives combined multi-page OCR text.
- Extracts 8 fields as JSON: `date`, `subject`, `summary`, `department`, `sender_name`, `sender_contact`, `receiver`, `reference_number`.
- `department` matched against hardcoded list of 22 MCL departments (known tech debt).

## Frontend Architecture

### 1. Framework
- React 19 + TypeScript + Vite.
- Custom CSS design system (`index.css`) — no Tailwind.
- Dev server: `http://localhost:5173`.

### 2. App Shell (`App.tsx`)
- Global `TopNav` header with MCL DAAK branding and logo.
- `DockNavigation` footer (QUEUE | SCAN | LISTS) — three tabs.
- Screen routing: `camera` → `processing` → `result`; `history` via LISTS tab; QUEUE tab shows last result if available, else camera.
- API base URL from `VITE_API_URL` env var, defaults to `http://localhost:8000`.
- `serial_number` stored in state alongside `extractedData` and passed to `ResultScreen`.

### 3. Screens (`src/screens/`)
| Screen | File | Purpose |
|--------|------|---------|
| Camera | `CameraScreen.tsx` | Live camera + file upload, image review |
| Processing | `ProcessingScreen.tsx` | Upload/OCR/LLM animated stage tracker; idle state shows latest doc from `/history/` |
| Result | `ResultScreen.tsx` | Extracted data grid + serial number badge + raw OCR collapsible |
| History | `HistoryScreen.tsx` | Paginated list (latest 10) of past submissions, detail modal |

### 4. History Screen
- Fetches `GET /history/` on mount.
- Displays cards sorted latest-first (Supabase handles ordering).
- Header shows `LATEST {n} ENTRIES`.
- Each card shows: timestamp pill, `serial_number` pill (if present), subject, sender, VIEW MORE button.
- Modal shows full `result-grid` of all extracted fields. Raw OCR preview removed (not stored in Supabase).

### 5. Queue (ProcessingScreen idle state)
- Fetches `GET /history/` when all stages are `pending`.
- Shows `data[0]` — the most recent document from Supabase.
- Displays `serial_number` badge if present.
- Empty state message if no documents exist yet.

### 6. Multi-Image Upload (Frontend → Backend)
- `CameraScreen` captures image(s) and calls `onAccept(blobs[])`.
- `App.tsx` `handleProceed()` sends `POST /upload/` with `FormData` containing `files` (one per image).
- On success: stores `data.serial_number` and `data.extracted_data` in state, navigates to result screen.

## Current Status

### Fully Implemented
- **Multi-image upload pipeline** — `files: list[UploadFile]`, per-image OCR, combined Claude call.
- **Stateless file handling** — images deleted from disk after OCR; no local output files written.
- **Supabase persistence** — serial number generation, document row insertion.
- **Supabase-backed history** — `GET /history/` queries Supabase directly, returns top 10 newest.
- **Google Sheets sync** — webhook push with serial number.
- **History screen** — card list with detail modal, serial number display, LATEST N ENTRIES label.
- **Queue screen** — shows most recent Supabase document with serial number badge.
- **Result screen** — serial number badge, PROCESS ANOTHER button.
- **OpenCV preprocessing** — blur, sharpen, denoise (temporary files, deleted after OCR).
- **Mistral OCR** — primary OCR engine.
- **Claude extraction** — 8 structured fields.
- **Docker deployment** — `docker-compose.yml` for local backend.
- **Frontend deployment env** — `.env.production` sets `VITE_API_URL` to Render backend for Vercel builds.
- **CORS** — configured for localhost dev, Vercel production, and Vercel preview URLs.

### Partial / Planned
- **Human review/edit flow** — edit extracted fields before final save.
- **Pydantic schemas** — `schemas/` directory is empty.
- **Multi-image failure behavior** — if one image fails OCR, entire submission fails (HTTP 500).
- **Authentication** — not implemented.

### Known Issues / Tech Debt
- `config.py` line 1: stale unused `from anthropic.types import completion_create_params` import.
- `department` matched against hardcoded list of 22 MCL departments in `claude_service.py`.
- `pytest` is in `requirements.txt` and gets installed in the production Docker image.
- Partial multi-image OCR failure raises a hard 500; no partial-success path exists.
- `schemas/` directory is empty; no Pydantic request/response validation models.
- `save_result_json()` still exists in `file_utils.py` but is no longer called anywhere — dead code.
- The `output/` directory may still exist on disk from earlier runs but is no longer written to.
- `save_result_json` is still imported in `upload.py` but unused — should be removed.

## Technical Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | FastAPI + Uvicorn | REST API server |
| Frontend | React 19 + Vite + TypeScript | Document scanner UI |
| Image Processing | OpenCV | Preprocessing and enhancement (temp files) |
| Primary OCR | Mistral OCR API | Document text extraction |
| LLM Extraction | Anthropic Claude | Structured field extraction |
| Persistence | Supabase (PostgreSQL) | Serial number generation + document storage + history |
| Archival | Google Sheets (Apps Script webhook) | Long-term record archive |
| Containerization | Docker + docker-compose | Local and Render deployment |

## Key Files by Purpose

### Entry Points
- `backend/app/main.py` — FastAPI initialization
- `frontend/src/main.tsx` — React entry point

### Core Pipeline
- `backend/app/routes/upload.py` — multi-image upload orchestration
- `backend/app/services/mistral_ocr_services.py` — Mistral OCR
- `backend/app/services/claude_service.py` — structured extraction
- `backend/app/services/opencv_services.py` — image preprocessing
- `backend/app/services/supabase_service.py` — serial number + DB insert + history query
- `backend/app/services/sheets_service.py` — Google Sheets webhook
- `backend/app/utils/file_utils.py` — temporary file save + delete

### History
- `backend/app/routes/history.py` — GET /history/ (Supabase only)
- `frontend/src/screens/HistoryScreen.tsx` — history UI

### Configuration
- `backend/app/config.py` — environment and API client setup
- `backend/requirements.txt` — Python dependencies
- `frontend/.env` — local dev backend URL
- `frontend/.env.production` — production backend URL (Render)

## Next Steps

1. Remove unused `save_result_json` import and dead code from `upload.py`.
2. Implement human review/edit step in the frontend before final Supabase save.
3. Add Pydantic models to `schemas/`.
4. Remove `pytest` from production Docker image.
5. Clean up stale import in `config.py` line 1.
6. Add office-network/IP restriction or basic auth before commissioner demo.