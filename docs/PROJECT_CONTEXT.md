# MCL Patr — Project Context Handoff

**Last updated:** August 12, 2026

## Purpose

MCL Patr is a document digitization system for Municipal Corporation Ludhiana (MCL). It extracts and structures multilingual municipal correspondence in English, Hindi, and Punjabi/Gurmukhi. Yuvraj is learning by doing and prefers direct explanations of what and why during coding, minimal unsolicited recommendations, and no unnecessary hedging.

## Repository / Git Workflow

- Repository: `yuvrajsingh0125/MCL-OCR`
- `main`: merged/deployed branch.
- `uv-dev`: Yuvraj's branch for backend, LLM, routing, UI, and persistence.
- `AD-dev`: Arshdeep's branch for OpenCV preprocessing, OCR engine layer, and frontend camera work.
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
Human review
        ↓
Supabase (temporary operational storage)
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
    paddle_ocr_service.py       # legacy/current repo file; deployment removal is in progress
    claude_service.py
    opencv_services.py
  utils/
    file_utils.py
  schemas/                      # currently empty

frontend/src/
  App.tsx
  main.tsx
```

**Frontend discrepancy:** earlier discussions referred to separate `CameraScreen.tsx`, `ReviewScreen.tsx`, `ProcessingScreen.tsx`, and `ResultScreen.tsx`, but the actual repo report shows a monolithic `App.tsx`. Verify the actual frontend structure before refactoring it.

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

## Multi-Image Design

The planned submission supports 1–3 images:

```python
class ImageItem(BaseModel):
    img_path: str
    img_index: int
    ocr_md: str | None = None

class DocumentSubmission(BaseModel):
    vid: str
    status: str = "pending"
    images_list: list[ImageItem]
    date: str | None = None
    subject: str | None = None
    summary: str | None = None
    department: str | None = None
    sender_name: str | None = None
    sender_contact: str | None = None
    receiver: str | None = None
    reference_number: str | None = None
```

Settled sequencing:

1. Generate `vid` server-side as `uuid4()` immediately when the request is received.
2. Create the `DocumentSubmission` object with an empty `images_list` before saving files.
3. Save files in a loop and append one `ImageItem` per file.
4. OCR runs separately per image because Mistral OCR does not batch the images in this design.
5. Concatenate all successful `ocr_md` values.
6. Send the combined OCR text to Claude **once** so extraction is performed at document level rather than independently per image.
7. Populate the eight top-level fields from that single extraction result.
8. The submission object is a dumb data container; functions perform the processing.

### Unresolved multi-image failure behavior

If one of three images fails OCR, the project still needs an explicit decision: fail the entire submission or continue with that image's `ocr_md` set to `null`.

## Storage

- **Supabase/PostgreSQL:** temporary operational storage, maximum 30-day retention.
- **Google Sheets:** permanent archival record, organized by month; create the month's sheet when it does not exist.
- Supabase and Google Sheets are configured in `config.py` but are **not yet wired into the actual processing flow**.
- Permanent image storage in the database is prohibited.

## Frontend / Camera

Arshdeep owns the camera functionality and frontend work on `AD-dev`.

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
- API contract currently accepts a single upload; multi-image support requires `files: list[UploadFile]` and coordinated frontend/backend changes.
- Claude prompt needs to explicitly say that its input is concatenated multi-page OCR text.

## Immediate Roadmap

1. Finish local Docker build/deployment preparation.
2. Verify Mistral OCR → Claude end-to-end flow.
3. Wire Google Sheets and test real archival writes.
4. Design and integrate the Supabase schema/storage flow.
5. Deploy/test the MVP on Render.
6. Coordinate camera/mobile frontend work with Arshdeep.
7. Implement real document-specific processing states.
8. Add document browsing/filtering after persistence exists.
9. Add office-network/IP restriction later.
