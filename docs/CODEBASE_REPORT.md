# MCL-OCR Codebase Report

## Overview
This repository contains a full-stack OCR document processing prototype for Municipal Corporation Ludhiana (MCL). The current implementation combines a FastAPI backend for image preprocessing, OCR, and structured extraction with a React + Vite frontend for uploading documents and viewing extracted fields.

## Current Repository Structure

- `backend/` - Python backend service and deployment assets.
  - `app/` - FastAPI application package.
    - `main.py` - creates the FastAPI app and registers routers.
    - `config.py` - loads environment variables and initializes Gemini and Anthropic clients.
    - `routes/` - API routes for health checks and document upload.
    - `services/` - image preprocessing, OCR, and LLM extraction logic.
    - `utils/` - file persistence helpers for uploads and generated output.
    - `schemas/` - request/response model placeholders.
  - `tests/` - backend unit tests.
  - `requirements.txt` - Python dependencies.
  - `Dockerfile` and `docker-compose.yml` - container deployment configuration.
- `frontend/` - React frontend application.
  - `src/App.tsx` - main upload UI with image preview and results view.
  - `src/main.tsx` - app bootstrap.
  - `package.json` - frontend dependencies and scripts.
- `docs/` - project documentation.

## Backend Architecture

### 1. Application Entry
The backend entry point is [backend/app/main.py](backend/app/main.py). It initializes the FastAPI app and registers:
- `health_router` for service health endpoints.
- `upload_router` for document processing.

### 2. Configuration and Clients
The file [backend/app/config.py](backend/app/config.py) loads environment variables and initializes external clients used by the OCR pipeline. It prepares configuration for:
- Gemini API access.
- Anthropic API access.
- optional Supabase and Google Sheets related variables.

### 3. Upload Flow
The upload endpoint in [backend/app/routes/upload.py](backend/app/routes/upload.py) handles the complete processing pipeline:
1. Saves the uploaded file to the `uploads/` folder.
2. Preprocesses the image using OpenCV.
3. Runs OCR using PaddleOCR.
4. Passes OCR text to Gemini for structured extraction.
5. Saves a JSON result file into the `output/` folder.
6. Returns the extracted result to the frontend.

### 4. File Handling
The utility module [backend/app/utils/file_utils.py](backend/app/utils/file_utils.py) now supports:
- saving uploaded images to the `uploads/` folder.
- writing processing metadata to the `output/` folder as JSON.
- keeping traceability between the source image and generated output.

### 5. Image Processing
The preprocessing service in [backend/app/services/opencv_services.py](backend/app/services/opencv_services.py):
- reads the uploaded image.
- converts it to RGB.
- applies enhancement operations.
- writes a processed image to `processed/<filename>`.
- returns the processed image path for OCR.

### 6. OCR Service
The OCR logic in [backend/app/services/ocr_service.py](backend/app/services/ocr_service.py):
- loads a PaddleOCR pipeline.
- validates the input image file.
- runs OCR inference.
- returns OCR text and raw results.

### 7. LLM-Based Extraction
The service in [backend/app/services/gemini_service.py](backend/app/services/gemini_service.py) builds a prompt for Gemini and extracts fields such as:
- date
- subject
- summary
- department
- sender_name
- sender_contact
- receiver
- reference_number

### 8. Tests
The backend test suite in [backend/tests/test_gemini_service.py](backend/tests/test_gemini_service.py) covers:
- Punjabi document extraction.
- Hindi document extraction.
- English document extraction.
- JSON parsing error handling.
- missing department handling.

## Frontend Architecture

### 1. Framework and Tooling
The frontend is built with React, TypeScript, and Vite using the setup in [frontend/package.json](frontend/package.json).

### 2. Main UI
The main interface is implemented in [frontend/src/App.tsx](frontend/src/App.tsx). It provides:
- file selection from the device.
- image preview before upload.
- a scan button that sends the image to the backend.
- a results card that displays extracted document fields.

### 3. Current User Flow
1. The user selects a document image.
2. The image preview appears in the UI.
3. The frontend sends the file to the backend endpoint `/upload/`.
4. The backend processes the document and returns structured extraction data.
5. The frontend displays the extracted fields.

## End-to-End Processing Flow

1. User uploads an image from the frontend.
2. Backend saves the original file to `uploads/`.
3. OpenCV preprocesses the image and saves a processed copy to `processed/`.
4. OCR extracts text from the processed image.
5. Gemini converts OCR text into structured JSON.
6. Backend stores a JSON summary in `output/` and returns it to the frontend.

## Current Status

### Implemented
- backend upload processing pipeline.
- OCR and LLM-based extraction flow.
- file persistence for uploaded and processed images.
- JSON output saving for each processed document.
- React-based document upload UI.

### Still Pending / Improvement Areas
- stronger schema validation for request and response models.
- persistent database integration.
- frontend display of output file links and source image references.
- more robust error handling and status reporting.
- authentication and user management.

## Notes
The project has moved beyond the initial placeholder frontend and now includes a working end-to-end OCR demo path from upload to structured extraction. The next logical step is to connect the saved output artifacts to richer UI and persistence workflows.