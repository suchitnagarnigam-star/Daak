# MCL Patr — Project Context Handoff

**Last updated:** August 14, 2026

## Purpose

MCL Patr is a document digitization system for Municipal Corporation Ludhiana (MCL). It extracts and structures multilingual municipal correspondence in English, Hindi, and Punjabi/Gurmukhi. Yuvraj is learning by doing and prefers direct explanations of what and why during coding, minimal unsolicited recommendations, and no unnecessary hedging.

## Repository / Git Workflow

- Repository: `yuvrajsingh0125/MCL-OCR`
- `main`: merged/deployed branch.
- `uv-dev`: Yuvraj's branch for backend, LLM, routing, UI, and persistence.
- `frontend`: Arshdeep's branch for OpenCV preprocessing, OCR engine layer, and frontend camera work.
- Arshdeep-owned files are off-limits during refactors. Shared interface changes must be coordinated.
- Arshdeep syncs from Yuvraj's branch before her PR with `git fetch origin` and `git checkout origin/uv-dev -- .`.

## Live Deployments

- Frontend: `https://mcl-ocr.vercel.app` — Vercel, auto-deploy from `main`.
- Backend: `https://mcl-ocr.onrender.com` — Render free tier; approximately 50-second cold starts. Upgrade to Starter ($7/month) is recommended before the commissioner demo.

## Current Architecture

```text
React 19 + Vite + TypeScript
        ↓
FastAPI
        ↓
OpenCV preprocessing
        ↓
Mistral OCR (primary)
        ↓
Claude (semantic extraction / classification)
        ↓
Structured JSON
        ↓
Supabase (serial number generation + operational storage)
        ↓
Google Sheets (long-term archive)
```

### Important OCR status

The current project context has standardized on **Mistral OCR as the primary OCR engine**. PaddleOCR is no longer part of the deployment target because of its memory/image-size cost. Any older repository documentation that still describes PaddleOCR as an active fallback is stale and must not be treated as the current plan.

## Current Repository Structure

```text
backend/app/
  main.py
  config.py
  routes/
    upload.py
    health.py
  services/
    mistral_ocr_services.py
    claude_service.py
    opencv_services.py
    sheets_service.py
    supabase_service.py
    gemini_service.py        # available but not in main pipeline
  utils/
    file_utils.py
  schemas/                   # currently empty

frontend/src/
  App.tsx
  index.css
  main.tsx
  assets/
  components/
  screens/
    CameraScreen.tsx
    ProcessingScreen.tsx
    ResultScreen.tsx
    HistoryScreen.tsx
    QueueScreen.tsx
```

## Extracted Fields

Claude currently targets these eight fields, all in English, using `null` when a value is not found:

```json
{
  "date": "",
  "subject": "",
  "summary": "",
  "department": "",
  "sender_name": "",
  "sender_contact": null,
  "receiver": "",
  "reference_number": null
}
```

`department` is matched against a hardcoded list of 22 MCL departments in `claude_service.py`; this is known technical debt.

## Multi-Image Upload (implemented)

The `/upload/` endpoint accepts 1–N images as a single document submission.

Pipeline per request:

1. Generate `submission_id` (uuid4) server-side immediately when the request is received.
2. For each uploaded image: save → OpenCV → Mistral OCR → store `ocr_md`.
3. Concatenate all page OCR texts with explicit `===== BEGIN PAGE N =====` / `===== END PAGE N =====` markers so Claude understands multi-page context.
4. Send combined OCR to Claude **once** — extraction is performed at document level.
5. Call `insert_data(llm_result)` → Supabase generates and returns a `serial_number` in the format `MCL/{year}/{number}` (e.g. `MCL/2026/1001`).
6. Push result to Google Sheets via webhook, including the `serial_number`.
7. Save the final JSON result file locally.
8. Return full response including `serial_number`, `extracted_data`, `submission_id`, and per-image metadata.

### API contract

```
POST /upload/
Content-Type: multipart/form-data
Body: files=[file1, file2, ...]

Response:
{
  "serial_number": "MCL/2026/1001",
  "message": "Document processed successfully",
  "submission_id": "<uuid>",
  "status": "complete",
  "file_count": 1,
  "files": ["document.jpg"],
  "images": [...],
  "output_path": "...",
  "extracted_data": { ... }
}
```

### Multi-image failure behavior (unresolved)

If one of N images fails OCR, the project still needs an explicit decision: fail the entire submission or continue with that image's `ocr_md` set to `null`. Currently the endpoint raises HTTP 500 on any image failure.

## Storage

- **Supabase/PostgreSQL:** operational storage; generates `serial_number` via `insert_data()` in `supabase_service.py`. Stores document fields + `status: pending`. Maximum 30-day retention intended.
- **Google Sheets:** permanent archival record via webhook in `sheets_service.py`. Payload includes all LLM fields + `serial_number` + `filename` + `processed_at` (IST timestamp).
- Permanent image storage in the database is prohibited.

### Serial number format

```
MCL/{year}/{sequential_number}
```

- Starts at 1001 if no existing records for the year.
- Generated by querying Supabase for the max existing number for the current year, then incrementing by 1.

## Frontend / Camera

Arshdeep owns the camera functionality and frontend work on `frontend` branch. The frontend has been restructured — screens now live under `frontend/src/screens/`.

App.tsx renders a global header ("MCL DAAK") and a `CircularNavigation` footer. Individual screens do not have their own headers or footers.

Target UX:

```text
Capture / Upload
      ↓
Image preview
      ↓
Processing animation/status
      ↓
OCR + Claude processing
      ↓
Final structured result
      ↓
Human review/edit
      ↓
Save
```

The application must ultimately work on both mobile and web.

## Processing States

Real backend status tracking is planned but not required before the core persistence flow works. The intended state progression is approximately:

```text
CAPTURED
→ PREPROCESSED
→ OCR_COMPLETED
→ LLM_COMPLETED
→ UNDER_REVIEW
→ DATABASE_SAVED
→ SHEET_SYNC_PENDING
→ COMPLETED
```

Do not introduce a complex workflow engine for this.

## Deployment / Security

- Docker is the application runtime; Python `venv` is used for local development.
- Temporary deployment target is Render because HTTPS is needed for browser camera access (`navigator.mediaDevices`).
- Office-network/IP restriction is a later security task.
- No authentication or RBAC.
- No centralized MCL platform.
- No agents, no streaming, and no permanent image storage in DB.

## Current Deployment Optimization

PaddleOCR removal is part of the Render deployment preparation. The Docker image was reduced from approximately 3.27 GB to approximately 1.45 GB after clearing build cache and removing the previous cache-heavy layers.

The current Python dependency list is intentionally lightweight:

```text
fastapi
uvicorn[standard]
opencv-python-headless
numpy
python-dotenv
python-multipart
mistralai
supabase
anthropic
google-genai
pytest
httpx
```

`pytest` is only for testing and should eventually be kept out of the production image.

The Dockerfile should not upgrade pip during every build. The application dependency installation should be the direct `pip install --no-cache-dir -r requirements.txt` step because the previous pip upgrade failed due to a PyPI network timeout.

## Known Review Risks

- Missing imports.
- Defined-but-uncalled functions.
- Hardcoded paths that ignore parameters.
- Stale configuration variables.
- Trailing commas creating unintended tuples.
- Misplaced `try/except` blocks.
- `json.dumps()` applied to an already-string result.
- Punjabi/Gurmukhi OCR quality needs real verification.
- Partial multi-image OCR failure behavior is not yet decided.
- Claude prompt needs to explicitly say that its input is concatenated multi-page OCR text.
- `config.py` line 1 has a stale `from anthropic.types import completion_create_params` import that is unused; safe to remove.

## Immediate Roadmap

1. Verify Mistral OCR → Claude → Supabase → Sheets end-to-end flow with a real document.
2. Decide partial multi-image OCR failure behavior.
3. Implement human review/edit step in the frontend.
4. Deploy/test the MVP on Render.
5. Coordinate camera/mobile frontend work with Arshdeep.
6. Implement real document-specific processing states.
7. Add document browsing/filtering after persistence exists.
8. Add office-network/IP restriction later.
