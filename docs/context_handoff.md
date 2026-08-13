# MCL Patr — Context Handoff (August 12, 2026)

## What is this?
MCL Patr is a document digitization system for Municipal Corporation Ludhiana (MCL). Extracts and structures text from multilingual municipal correspondence (English, Hindi, Punjabi/Gurmukhi).

Yuvraj is learning-by-doing — wants explanation of what/why during coding, not handed solutions. Wants directness, no hedging, first-principles reasoning. Minimal unsolicited recommendations.

## Repository
- https://github.com/yuvrajsingh0125/MCL-OCR.git (public)
- `main` — merged, deployed
- `uv-dev` — Yuvraj: backend, LLM, routing, UI, persistence
- `AD-dev` — Arshdeep (AD): OpenCV preprocessing, OCR engine layer, frontend camera
- Arshdeep's files are off-limits during refactors; changes to shared interfaces need coordination
- Git workflow: Yuvraj pushes to `uv-dev`; Arshdeep does `git fetch origin` + `git checkout origin/uv-dev -- .` before her PR

## Live Deployments
- Frontend: https://mcl-ocr.vercel.app (Vercel, auto-deploy on push to main)
- Backend: https://mcl-ocr.onrender.com (Render free tier — ~50s cold start, upgrade to Starter $7/mo recommended before commissioner demo)

## Current Stack (verified from repo's docs/CODEBASE_REPORT.md)
```
React 19 + Vite + TS → FastAPI → OpenCV → Mistral OCR (primary) / PaddleOCR (fallback) → Claude → JSON file output
```
Supabase and Google Sheets are configured in `config.py` but **not yet wired into the processing flow** — this was previously misreported as "working," corrected on inspection of actual repo docs.

## File Structure (current, real)
```
backend/app/
  main.py                       # FastAPI init, CORS (localhost:5173 only), router registration
  config.py                     # API client init: Anthropic, Mistral, Gemini(optional), Supabase(unused)
  routes/
    upload.py                   # POST /upload/ — orchestrates full pipeline
    health.py
  services/
    mistral_ocr_services.py     # Primary OCR, returns pages[0].markdown
    paddle_ocr_service.py       # Fallback OCR (renamed from ocr_service.py)
    claude_service.py           # Structured extraction, 8 fields
    opencv_services.py          # Preprocessing: blur, sharpen, denoise, brightness/contrast
  utils/
    file_utils.py                # save_uploaded_file(), save_result_json()
  schemas/                       # EMPTY — no Pydantic models yet
frontend/src/
  App.tsx                        # Single-file-upload UI, dark theme, scanner aesthetic
  main.tsx
```
Note: earlier session context described `CameraScreen.tsx`, `ReviewScreen.tsx`, `ProcessingScreen.tsx`, `ResultScreen.tsx` as separate components — the actual repo report shows a single `App.tsx` handling everything. **This discrepancy is unresolved — verify actual frontend file structure next session.**

## Extracted Fields (8, all English, null if not found)
```json
{
  "date": "", "subject": "", "summary": "", "department": "",
  "sender_name": "", "sender_contact": null, "receiver": "", "reference_number": null
}
```
`department` matched against hardcoded list of 22 MCL departments (currently hardcoded in claude_service.py — flagged as tech debt).

## Hard Constraints (non-negotiable)
- No auth / RBAC
- No agents
- No streaming
- No permanent image storage in DB
- No centralized MCL platform

## Deliverables Produced This Session
1. **Mermaid flowcharts** — pipeline flow, sequence diagram, planned multi-image flow
2. **README.md** — rewritten to reflect actual current state (old repo README was stale, referenced Google Document AI which is gone)
3. **DESIGN.md** — rationale doc covering: why OCR/LLM are separate services, why Mistral is primary over PaddleOCR, why Claude gets text not images, why `vid` is server-generated, why `img_index` is local not global, why object is created before files are saved, why OCR runs per-image but extraction runs once on combined text, why Supabase isn't wired yet, and two **open unresolved risks**: Punjabi/Gurmukhi OCR fallback quality (unverified), and undefined behavior for partial multi-image OCR failure

Both files are in `/mnt/user-data/outputs/` from prior turns — not yet committed to the repo.

## Multi-Image Object Structure (designed, not yet implemented)
Worked out via whiteboard photos across two sessions:

```python
class ImageItem(BaseModel):
    img_path: str
    img_index: int          # local to the DocumentSubmission — avoids concurrency collisions
    ocr_md: str | None = None

class DocumentSubmission(BaseModel):
    vid: str                 # uuid4(), generated server-side on request receipt
    status: str = "pending"  # pending → processing → complete
    images_list: list[ImageItem]
    # 8 fields below — null until Claude processes combined OCR text
    date: str | None = None
    subject: str | None = None
    summary: str | None = None
    department: str | None = None
    sender_name: str | None = None
    sender_contact: str | None = None
    receiver: str | None = None
    reference_number: str | None = None
```

**Key sequencing decisions (settled, reasoning in DESIGN.md):**
- `vid` generated first, before any file is saved
- `DocumentSubmission` object created next (empty `images_list`) — before files are saved, so a mid-request crash doesn't orphan files with no tracked owner
- Files saved in a loop, each appended as an `ImageItem`
- OCR runs per-image (Mistral can't batch)
- All `ocr_md` values concatenated → sent to Claude **once** → populates the top-level 8 fields (not per-image) — avoids contradictory field values across pages
- Function initiates the object; the object does not call functions itself (dumb data container)

## Unanswered / Needs Decision Next Session
1. **Partial OCR failure** — if image 2 of 3 fails, does the whole submission fail, or proceed with `ocr_md: null` for that image?
2. **Frontend file structure discrepancy** — confirm whether `App.tsx` is monolithic or split into Camera/Review/Processing/Result screens (conflicting info between sessions)
3. **Supabase schema** — not yet designed. Should mirror `DocumentSubmission` fields directly. **Reminder: use Supabase MCP to create/manage the table from within the chat**, don't hand-write SQL blind
4. **API contract change** — `/upload/` currently takes a single file; needs to become `files: list[UploadFile]` for multi-image. Frontend and backend must change together.
5. **Prompt update needed** — Claude's extraction prompt needs to explicitly state it's receiving concatenated multi-page OCR text, or it may misinterpret page boundaries as separate documents

## Pending / Roadmap (unordered, from repo + sessions)
- Multi-image support (1–3 images) — designed, not implemented
- Supabase integration — schema not started
- Google Sheets sync — configured, not implemented in flow (per actual repo report — contradicts earlier "working" claim)
- Pydantic schemas — `schemas/` directory is empty
- Human review flow — edit extracted fields before save
- Document view/browse page (depends on Supabase)
- Punjabi/Gurmukhi OCR verification on PaddleOCR fallback path — known risk, not resolved
- Remove `pytest` from production requirements
- Office network IP restriction

## Known Bug Patterns in This Codebase (for review passes)
Missing imports, defined-but-uncalled functions, hardcoded paths ignoring parameters, stale config variables, trailing commas creating unintended tuples, try/except blocks misplaced inside dict literals, json.dumps on already-string output.

## Communication Preferences (Yuvraj)
- Learning-by-doing — don't hand over full solutions, explain what/why during code
- Only give code when explicitly asked
- Keep recommendations minimal, not padded
- Be direct — say when something is wrong, no hedging
- Under deadline pressure, he'll explicitly ask for more directive output — follow that shift when stated
