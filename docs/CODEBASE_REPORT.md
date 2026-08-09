# MCL-OCR Codebase Report

## Overview
This repository contains a backend FastAPI application for OCR and document processing, a placeholder frontend file, and project documentation. The current implementation is primarily backend-focused and centered around image preprocessing, OCR extraction, and LLM-based document field extraction.

## Repository Structure

- `.gitignore` - ignores environment files, virtualenv, uploads, processed images, node_modules, and IDE files.
- `backend/` - Python backend application and deployment resources.
  - `Dockerfile` - image build instructions for the backend.
  - `docker-compose.yml` - local container stack for backend service.
  - `.dockerignore` - excluded files for Docker build.
  - `requirements.txt` - Python dependencies.
  - `.env.example` - example environment variables.
  - `app/` - FastAPI application package.
    - `main.py` - FastAPI app and route registration.
    - `config.py` - environment loading and external client initialization.
    - `routes/` - HTTP route definitions.
    - `services/` - OCR, image processing, and LLM document extraction.
    - `utils/` - file handling and image helper code.
    - `schemas/` - currently empty placeholder schema files.
  - `tests/` - unit tests.
- `frontend/fend` - empty placeholder file for frontend.
- `docs/README.md` - project overview, scope, and architecture notes.

## Backend Detailed File Report

### `backend/app/main.py`

- Creates the FastAPI app instance.
- Registers two routers: `health_router` and `upload_router`.

### `backend/app/config.py`

- Loads environment variables with `dotenv`.
- Tries to import `anthropic` and `google.genai`.
- Sets up:
  - `GEMINI_API_KEY`
  - `gemini_client` using `genai.Client(api_key=...)`
  - `ANTHROPIC_API_KEY`
  - `anthropic_client = anthropic.Client(api_key=...)`
  - `SUPABASE_URL`, `SUPABASE_KEY`
  - `GOOGLE_SHEET_ID`, `GOOGLE_DRIVE_FOLDER_ID`

#### Notes
- The code uses `google.genai`, not `google.generativeai`.
- No Supabase or Google Sheets behavior is implemented elsewhere in the backend.

### `backend/app/routes/health.py`

- `GET /` returns `{"message": "MCL OCR Backend is running 🚀"}`.
- `GET /health` returns `{"status": "healthy"}`.

### `backend/app/routes/upload.py`

- `POST /upload/` accepts `UploadFile`.
- Uses `save_uploaded_file(file)` to store the upload in `uploads/`.
- Uses `process_image(saved_path)` to preprocess the image.
- Uses `process_ocr(processed_path)` to run OCR.
- Uses `process_document(ocr_result["text"])` to extract structured fields via Gemini.
- Returns:
  - `message`
  - `filename`
  - `extracted_data`

#### Key code

```python
ocr_result = process_ocr(processed_path)
llm_result = process_document(ocr_result["text"])

return {
    "message": "Document processed successfully",
    "filename": file.filename,
    "extracted_data": llm_result
}
```

### `backend/app/utils/file_utils.py`

- Saves uploaded files into `uploads/`.
- Creates the `uploads/` folder if missing.
- Writes binary upload data via `shutil.copyfileobj`.

### `backend/app/utils/image_utils.py`

- Empty placeholder file.

### `backend/app/services/opencv_services.py`

- Implements image preprocessing with OpenCV.
- Creates `processed/` directory.
- `process_image(file_path: str) -> str`:
  - Reads image via `cv2.imread`.
  - Converts BGR to RGB.
  - Applies brightness and contrast adjustments (currently no-op defaults).
  - Applies Gaussian blur and sharpening.
  - Validates image has 3 RGB channels.
  - Converts back to BGR and writes to `processed/<filename>`.
  - Returns path of processed image.

#### Example behavior

```python
output_bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
success = cv2.imwrite(str(destination), output_bgr)
return str(destination)
```

### `backend/app/services/ocr_service.py`

- Loads PaddleOCR pipeline at module import:

```python
ocr_pipeline = create_pipeline(
    pipeline="OCR",
    device="cpu",
)
```

- `process_ocr(file_path: str) -> dict`:
  - Validates that file exists and is a file.
  - Calls `ocr_pipeline.predict(input=str(source))`.
  - Collects raw OCR results.
  - Converts each result to a string and joins them into a single `text` value.
  - Returns a dict with `file`, `results`, and `text`.

#### Output shape

```python
return {
    "file": str(source),
    "results": ocr_results,
    "text": combined_text,
}
```

### `backend/app/services/gemini_service.py`

- Imports `gemini_client` from config.
- Defines a long `DEPARTMENTS` list for Mumbai Corporation Ludhiana departments.
- `process_document(ocr_results: str) -> dict`:
  - If `gemini_client` is missing, returns an error dict.
  - Builds a prompt that asks Gemini to translate Hindi/Punjabi/English text and extract fields.
  - Calls `gemini_client.models.generate_content(model="gemini-2.0-flash", contents=prompt)`.
  - Parses `response.text` as JSON and returns it.
  - On parse failure, returns `{"error": "Unable to parse Gemini response as JSON."}`.

#### Output structure expected from Gemini

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

### `backend/app/services/claude_service.py`

- Imports `anthropic_client` from config.
- Uses the same `DEPARTMENTS` list as Gemini service.
- `process_document(ocr_output: str) -> dict`:
  - Builds a similar prompt for Claude.
  - Sends the prompt using `anthropic_client.messages.create(...)`.
  - Parses `response.content[0].text` as JSON.
  - Returns a dict or error string on parse failure.

#### Notes
- `claude_service` does not check whether `anthropic_client` is configured before calling it.
- It assumes the response object has `content[0].text`.

### `backend/app/schemas/request.py` and `backend/app/schemas/response.py`

- Both files are empty placeholders.
- No Pydantic request/response models are implemented.

### `backend/app/services/__init__.py` and `backend/app/routes/__init__.py`

- Both are empty package initializer files.

### `backend/tests/test_gemini_service.py`

- Contains unit tests for `app.services.gemini_service.process_document`.
- Uses `unittest.mock.patch("app.services.gemini_service.gemini_client")`.
- Tests include:
  - Punjabi document extraction.
  - Hindi document extraction.
  - English document extraction.
  - JSON decode failure handling.
  - No-department match behavior.

## Deployment & Environment Files

### `backend/requirements.txt`

Contains these dependencies:

- `fastapi`
- `uvicorn[standard]`
- `opencv-python`
- `numpy`
- `python-dotenv`
- `python-multipart`
- `paddlex`
- `paddlepaddle`
- `supabase`
- `anthropic`
- `google-generativeai`
- `pytest`

#### Notes
- `google-generativeai` is deprecated; the code uses `google.genai`.
- `paddlex` and `paddlepaddle` are heavy native packages requiring extra system support.

### `backend/Dockerfile`

- Uses `python:3.12-slim`.
- Installs OpenCV system dependencies.
- Installs Python dependencies from `requirements.txt`.
- Copies repository contents into `/app`.
- Exposes port `8000` and starts `uvicorn app.main:app`.

### `backend/docker-compose.yml`

- Defines a single service `backend`.
- Uses `.env` for environment variables.
- Binds host port `8000` to container port `8000`.
- Mounts the repository into the container.

### `backend/.dockerignore`

Ignores local virtualenvs, git metadata, Dockerfile, README, and `.env`.

### `.gitignore`

Ignores backend virtualenv, `.env`, credentials, node modules, build artifacts, uploads, processed images, and IDE folders.

## Frontend

- `frontend/fend`
  - Empty placeholder file.
  - No actual frontend implementation exists in the current repository.

## Documentation

### `docs/README.md`

This document describes a broader intended architecture, including:
- camera capture
- OpenCV preprocessing
- Google Document AI OCR
- Supabase storage
- Google Sheets background sync
- manual verification
- retention policy and caching

#### Mismatch with current code
The implementation in `backend/` does not yet include:
- Google Document AI integration
- Supabase storage
- Google Sheets sync
- any actual frontend UI
- any manual verification workflow

Instead, the current backend is built around:
- OpenCV preprocessing
- PaddleOCR via `paddlex`
- LLM extraction via Gemini and Claude

## Current Running Pipeline

The commit state shows an executable backend flow in `upload.py`:

1. Upload image to `/upload/`.
2. Save the uploaded file locally (`uploads/`).
3. Preprocess it using OpenCV (`processed/`).
4. Run OCR via PaddleOCR.
5. Build a single joined OCR text string.
6. Send that text to Gemini for field extraction.
7. Return extracted structured data.

## Implementation Gaps and Risks

### 1. Incomplete features
- No Supabase, Google Sheets, Google Drive, or manual review flow implemented.
- `schemas/` files are empty.
- Frontend is not implemented.

### 2. Backend fragility
- `ocr_service.py` imports `paddlex` at module load time. If `paddlex` is missing, the app will fail on import.
- `gemini_service.py` assumes `gemini_client.models.generate_content` exists.
- `claude_service.py` does not guard against missing `anthropic_client`.

### 3. Dependency mismatch
- `requirements.txt` includes `google-generativeai`, but code imports `google.genai`.
- `docs/README.md` describes Google Document AI, while code uses PaddleOCR.

### 4. Code quality
- There are no Pydantic schemas for API validation.
- There is no frontend UI or user flow.
- Empty placeholders exist in `utils/image_utils.py` and `schemas/`.

## Recommended Next Steps

1. Clean up and align the docs with actual implementation.
2. Add API request/response models in `schemas/`.
3. Guard optional SDK imports and add clear runtime errors.
4. Add end-to-end tests for `/upload/`.
5. Implement or remove empty frontend placeholder.
6. Decide whether to keep Gemini/Claude or move to Google Document AI as the docs describe.
7. Pin dependency versions in `requirements.txt` and remove deprecated packages.

## File List Summary

- `.gitignore`
- `CODEBASE_REPORT.md`
- `backend/.dockerignore`
- `backend/.env.example`
- `backend/Dockerfile`
- `backend/docker-compose.yml`
- `backend/requirements.txt`
- `backend/app/__init__.py`
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/routes/__init__.py`
- `backend/app/routes/health.py`
- `backend/app/routes/upload.py`
- `backend/app/services/__init__.py`
- `backend/app/services/ocr_service.py`
- `backend/app/services/gemini_service.py`
- `backend/app/services/claude_service.py`
- `backend/app/services/opencv_services.py`
- `backend/app/utils/__init__.py`
- `backend/app/utils/file_utils.py`
- `backend/app/utils/image_utils.py`
- `backend/app/schemas/__init__.py`
- `backend/app/schemas/request.py`
- `backend/app/schemas/response.py`
- `backend/tests/test_gemini_service.py`
- `docs/README.md`
- `frontend/fend`
