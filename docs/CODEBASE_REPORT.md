# MCL-OCR Codebase Report

**Last updated:** August 14, 2026

## Overview

This repository contains a full-stack OCR document processing system for Municipal Corporation Ludhiana (MCL). The implementation combines a FastAPI backend with Mistral OCR, OpenCV preprocessing, Claude LLM extraction, Supabase persistence, and Google Sheets archival — paired with a React + Vite frontend for multi-image document capture and result display.

## Current Repository Structure

- `backend/` — Python backend service and deployment assets.
  - `app/` — FastAPI application package.
    - `main.py` — FastAPI app initialization with CORS middleware and router registration.
    - `config.py` — environment variable loading and external API client initialization.
    - `routes/` — API endpoints: upload, history, health.
    - `services/` — image preprocessing, OCR, LLM extraction, persistence services.
    - `utils/` — file I/O and result persistence helpers.
    - `schemas/` — request/response model placeholders (currently empty).
  - `requirements.txt` — Python dependencies.
  - `Dockerfile` and `docker-compose.yml` — container deployment configuration.
- `frontend/` — React + Vite frontend application.
  - `src/App.tsx` — app shell with global header and `CircularNavigation` footer.
  - `src/screens/` — individual screen components (Camera, Processing, Result, History, Queue).
  - `src/components/` — shared components (CircularNavigation, etc.).
  - `src/index.css` — global design system styles.
  - `package.json` — frontend dependencies and build scripts.
- `docs/` — project documentation.

## Backend Architecture

### 1. Application Entry
`backend/app/main.py`:
- Initializes FastAPI with logging configuration.
- CORS middleware configured for localhost:5173 and the deployed Vercel frontend.
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
   - Save original → OpenCV preprocessing → Mistral OCR.
   - Store `{ img_index, filename, img_path, processed_path, ocr_md }` per image.
4. **Combine OCR** — concatenate all page texts with `===== BEGIN PAGE N =====` / `===== END PAGE N =====` markers.
5. **Claude** — single LLM call on the combined OCR text.
6. **Supabase** — `insert_data(llm_result)` generates and stores a `serial_number` (`MCL/{year}/{N}`).
7. **Google Sheets** — `push_to_sheets(llm_result, filename, serial_number)` via webhook.
8. **Save JSON** — full result written to `output/` with `serial_number`, `submission_id`, per-image metadata, combined OCR, and `extracted_data`.
9. **Response** — returns `serial_number`, `extracted_data`, `submission_id`, `file_count`, per-image list, `output_path`.

### 4. Serial Number Generation
`backend/app/services/supabase_service.py` — `insert_data(llm_result)`:
- Queries Supabase `document_submissions` table for highest existing serial in `MCL/{year}/%` pattern.
- Increments from 1000 if no records exist for the current year.
- Inserts a new row with all 8 extracted fields + `status: pending`.
- Returns the new `serial_number` string (e.g. `MCL/2026/1001`).

### 5. Google Sheets Sync
`backend/app/services/sheets_service.py` — `push_to_sheets(llm_result, filename, serial_number)`:
- Skips gracefully if `SHEETS_WEBHOOK_URL` is not configured.
- POSTs payload `{ secret, data: { ...llm_result, serial_number, filename, processed_at (IST) } }` to the Apps Script webhook.

### 6. History Endpoint
`backend/app/routes/history.py` — `GET /history/`:
- Scans all JSON files in the `output/` directory.
- Reads `extracted_data` (new format) or falls back to `llm_result` (old format).
- Reads `combined_ocr` (new) or falls back to `ocr_text` (old).
- Returns items sorted by `created_at` descending (newest first).
- Each item includes: `id`, `serial_number`, `created_at`, `llm_result`, `ocr_text`.

### 7. File Handling
`backend/app/utils/file_utils.py`:
- `save_uploaded_file()` — stores raw uploads in `uploads/`.
- `save_result_json()` — writes to `output/<sanitized_filename>_<timestamp>.json`.

### 8. Image Preprocessing
`backend/app/services/opencv_services.py`:
- BGR → RGB conversion, brightness/contrast adjustment, Gaussian blur, sharpening kernel.
- Writes processed image to `processed/<filename>`.

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
- Global `mcl-global-header` with MCL DAAK branding and logo (hidden during processing).
- `CircularNavigation` footer (Camera | Queue | History) — hidden during processing.
- Screen routing: `camera` → `processing` → `result`; `history` and `queue` via nav.
- API base URL from `VITE_API_URL` env var, defaults to `http://localhost:8000`.

### 3. Screens (`src/screens/`)
| Screen | File | Purpose |
|--------|------|---------|
| Camera | `CameraScreen.tsx` | Live camera + file upload, image review |
| Processing | `ProcessingScreen.tsx` | Animated upload/OCR/LLM stage tracker |
| Result | `ResultScreen.tsx` | Displays extracted data grid + raw OCR preview |
| History | `HistoryScreen.tsx` | Paginated list of past submissions, detail modal |
| Queue | `QueueScreen.tsx` | Placeholder for pending submissions |

### 4. History Screen
- Fetches `GET /history/` on mount.
- Displays cards sorted latest-first (backend handles sorting).
- Each card shows: timestamp, `serial_number` (if present), subject, VIEW MORE button.
- Modal shows full `result-grid` of all extracted fields + raw OCR collapsible section.

### 5. Multi-Image Upload (Frontend → Backend)
- `CameraScreen` captures image(s) and calls `onAccept(blob)`.
- `App.tsx` `handleProceed()` sends `POST /upload/` with `FormData` containing `files` (single file currently; backend accepts multiple).

## Current Status

### Fully Implemented
- **Multi-image upload pipeline** — `files: list[UploadFile]`, per-image OCR, combined Claude call.
- **Supabase persistence** — serial number generation, document row insertion.
- **Google Sheets sync** — webhook push with serial number.
- **History endpoint** — newest-first, supports both old and new JSON formats.
- **History screen** — card list with detail modal, serial number display.
- **OpenCV preprocessing** — blur, sharpen, denoise.
- **Mistral OCR** — primary OCR engine.
- **Claude extraction** — 8 structured fields.
- **Local JSON output** — full result with serial number, submission ID, per-image metadata.
- **Docker deployment** — `docker-compose.yml` for local backend.
- **Frontend restructure** — screens in `src/screens/`, shared components in `src/components/`.

### Partial / Planned
- **Supabase-backed history** — currently reads from local `output/` JSON files; needs to switch to querying Supabase directly.
- **Deployed backend integration** — frontend `VITE_API_URL` needs to point to `https://mcl-ocr.onrender.com` for production; currently uses `localhost:8000`.
- **Human review/edit flow** — edit extracted fields before final save.
- **Pydantic schemas** — `schemas/` directory is empty.
- **Multi-image failure behavior** — if one image fails OCR, behavior is undefined (currently raises HTTP 500).
- **Authentication** — not implemented.

### Known Issues / Tech Debt
- `config.py` line 1: stale unused import `from anthropic.types import completion_create_params`.
- `department` matched against hardcoded list in `claude_service.py`.
- `pytest` is in `requirements.txt` and gets installed in the production Docker image.
- Partial multi-image OCR failure raises a hard 500; no partial-success path exists.
- `schemas/` directory is empty; no Pydantic request/response models.

## Technical Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | FastAPI + Uvicorn | REST API server |
| Frontend | React 19 + Vite + TypeScript | Document scanner UI |
| Image Processing | OpenCV | Preprocessing and enhancement |
| Primary OCR | Mistral OCR API | Document text extraction |
| LLM Extraction | Anthropic Claude | Structured field extraction |
| Persistence | Supabase (PostgreSQL) | Serial number generation + document storage |
| Archival | Google Sheets (Apps Script webhook) | Long-term record archive |
| Local Cache | JSON files (`output/`) | Audit trail, history fallback |
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
- `backend/app/services/supabase_service.py` — serial number + DB insert
- `backend/app/services/sheets_service.py` — Google Sheets webhook

### History
- `backend/app/routes/history.py` — GET /history/ endpoint
- `frontend/src/screens/HistoryScreen.tsx` — history UI

### Configuration
- `backend/app/config.py` — environment and API client setup
- `backend/requirements.txt` — Python dependencies
- `frontend/.env` / `VITE_API_URL` — backend URL configuration

## Next Steps

1. Switch history data source from `output/` JSON files to Supabase query.
2. Point `VITE_API_URL` to deployed backend for production.
3. Resolve partial multi-image OCR failure behavior.
4. Implement human review/edit step in the frontend.
5. Add Pydantic models to `schemas/`.
6. Remove `pytest` from production Docker image.
7. Add office-network/IP restriction.