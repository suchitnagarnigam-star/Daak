<div align="center">

# MCL Patr

### Municipal Corporation Ludhiana — Document Digitization System

Captures physical government correspondence, extracts text via OCR, and structures it into searchable fields using an LLM.
Multilingual support: **English · Hindi · Punjabi (Gurmukhi)**

[![Frontend](https://img.shields.io/badge/frontend-live-brightgreen)](https://mcl-ocr.vercel.app)
[![Backend](https://img.shields.io/badge/backend-Render-blue)](https://mcl-ocr.onrender.com)
[![Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20React%20%7C%20Claude-orange)]()

</div>

---

## Live Deployments

| Service  | URL                                                              |
| -------- | ---------------------------------------------------------------- |
| Frontend | [mcl-ocr.vercel.app](https://mcl-ocr.vercel.app)               |
| Backend  | [mcl-ocr.onrender.com](https://mcl-ocr.onrender.com)           |

> **Note:** Backend runs on Render free tier — expect a ~50s cold start after inactivity.

---

## Stack

| Layer            | Technology                  | Purpose                                        |
| ---------------- | --------------------------- | ---------------------------------------------- |
| Frontend         | React 19 + Vite + TypeScript | Document scanner UI                            |
| Backend          | FastAPI + Uvicorn           | REST API, pipeline orchestration               |
| Image Processing | OpenCV                      | Preprocessing — blur, sharpen, denoise         |
| Primary OCR      | Mistral OCR (`mistral-ocr-latest`) | Text extraction, multilingual         |
| Fallback OCR     | PaddleOCR (PaddleX)         | Local fallback if Mistral fails                |
| LLM Extraction   | Anthropic Claude (`claude-sonnet-4-6`) | Structured field extraction from OCR text |
| Sheets Sync      | Google Apps Script webhook  | Appends extracted data to monthly Google Sheet |
| Database         | Supabase (PostgreSQL)       | Planned — 30-day TTL storage                   |
| Deployment       | Render (backend), Vercel (frontend) | Cloud hosting                          |

---

## Pipeline

```mermaid
flowchart TD
    A([User uploads image]) --> B[POST /upload/]
    B --> C[Save file → uploads/]
    C --> D[OpenCV preprocessing → processed/]
    D --> E{Mistral OCR}
    E -->|success| G[OCR markdown text]
    E -->|failure| F[PaddleOCR fallback]
    F --> G
    G --> H[Claude: extract 8 fields]
    H --> I[Save result JSON → output/]
    I --> J[Google Sheets sync via webhook]
    J --> K([Return extracted_data to frontend])

    style A fill:#2d333b,stroke:#8b949e,color:#fff
    style K fill:#2d333b,stroke:#8b949e,color:#fff
    style E fill:#1f6feb,stroke:#58a6ff,color:#fff
    style H fill:#8957e5,stroke:#bc8cff,color:#fff
    style F fill:#3d2a1f,stroke:#f0883e,color:#fff
```

**Request lifecycle, sequence view:**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React)
    participant B as Backend (FastAPI)
    participant CV as OpenCV
    participant M as Mistral OCR
    participant P as PaddleOCR
    participant C as Claude
    participant S as Google Sheets

    U->>F: Select/capture image
    F->>B: POST /upload/ (multipart)
    B->>B: Save to uploads/
    B->>CV: process_image()
    CV-->>B: processed image path
    B->>M: OCR request
    alt Mistral succeeds
        M-->>B: markdown text
    else Mistral fails
        B->>P: fallback OCR
        P-->>B: extracted text
    end
    B->>C: process_document(ocr_text)
    C-->>B: 8 structured fields (JSON)
    B->>S: sync row (async)
    B-->>F: extracted_data JSON
    F-->>U: Render ResultScreen
```

---

## Extracted Fields

All fields extracted in English. Null when not found in document.

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

`department` is matched against a hardcoded list of 22 MCL departments.

---

## Repository Structure

```
MCL-OCR/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI init, CORS, router registration
│   │   ├── config.py                   # API client init (Anthropic, Mistral, Supabase)
│   │   ├── routes/
│   │   │   ├── upload.py               # POST /upload/ — full pipeline
│   │   │   └── health.py               # GET /health
│   │   ├── services/
│   │   │   ├── mistral_ocr_services.py # Primary OCR — Mistral API
│   │   │   ├── paddle_ocr_service.py   # Fallback OCR — PaddleX
│   │   │   ├── claude_service.py       # LLM structured extraction
│   │   │   ├── opencv_services.py      # Image preprocessing
│   │   │   └── sheets_service.py       # Google Sheets sync
│   │   ├── utils/
│   │   │   └── file_utils.py           # File save, result JSON persistence
│   │   └── schemas/                    # Pydantic models (planned)
│   ├── tests/
│   │   └── test_mistral_service.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   └── src/
│       ├── App.tsx                     # Screen state, API call, flow wiring
│       ├── CameraScreen.tsx            # Camera capture + file upload
│       ├── ReviewScreen.tsx            # Image review before processing
│       ├── ProcessingScreen.tsx        # Pipeline animation with stage states
│       └── ResultScreen.tsx            # 8-field extraction display
└── docs/
    └── CODEBASE_REPORT.md
```

---

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (optional)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY=your_key
export MISTRAL_API_KEY=your_key
export GOOGLE_SHEETS_WEBHOOK_URL=your_url

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and expects backend at `http://localhost:8000`.

### Docker

```bash
cd backend
docker-compose up --build
```

---

## Environment Variables

| Variable                   | Required | Purpose                          |
| -------------------------- | -------- | -------------------------------- |
| `ANTHROPIC_API_KEY`        | Yes      | Claude LLM extraction            |
| `MISTRAL_API_KEY`          | Yes      | Primary OCR                      |
| `GOOGLE_SHEETS_WEBHOOK_URL`| Yes      | Sheets sync via Apps Script      |
| `SUPABASE_URL`             | No       | Planned DB integration           |
| `SUPABASE_KEY`             | No       | Planned DB integration           |

---

## Google Sheets Structure

- Organized by month — August sheet, September sheet, etc.
- Apps Script creates the month sheet if it doesn't exist.
- Columns: all 8 extracted fields + original filename + `processed_at` (IST timestamp).

---

## Hard Constraints

These will not change for this project:

- No authentication or RBAC
- No agents or streaming
- No permanent image storage in database
- No centralized MCL platform

---

## Branches

| Branch   | Owner      | Scope                                      |
| -------- | ---------- | ------------------------------------------ |
| `main`   | Both       | Merged, deployed                           |
| `uv-dev` | Yuvraj     | Backend, LLM, pipeline wiring, routing, UI |
| `AD-dev` | Arshdeep   | Frontend camera, OpenCV preprocessing      |

---

## What's Working

- Mistral OCR handles English, Hindi, and Punjabi/Gurmukhi correctly
- Claude extracts all 8 fields accurately from OCR text
- PaddleOCR fallback activates if Mistral fails
- Google Sheets updated per document with IST timestamp
- Full frontend flow: camera/upload → review → processing animation → result
- Deployed and tested on mobile

---

## Pending / Next Steps

1. **Multi-image support** — 1–3 images per submission, combined OCR fed to Claude
2. **Supabase integration** — persistent storage with 30-day TTL
3. **Document submission object** — `vid` (uuid4), `status`, `images_list` with per-image OCR
4. **Human review flow** — edit extracted fields before saving
5. **Pydantic schemas** — request/response validation in `schemas/`
6. **Document view page** — browse and filter past documents
7. **Render upgrade** — move to Starter ($7/month) before commissioner demo to eliminate cold start
8. **Office network restriction** — firewall to MCL IP range only

### Planned: Multi-Image Flow

```mermaid
flowchart TD
    A([Request received]) --> B[Generate vid = uuid4]
    B --> C["Create DocumentSubmission\nvid, status=pending, images_list=[], 8 fields=null"]
    C --> D{For each uploaded file}
    D --> E[Save file → img_path]
    E --> F["ImageItem: img_path, img_index, ocr_md=None"]
    F --> G[Append to images_list]
    G --> D
    D -->|done| H[status = processing]
    H --> I{For each ImageItem}
    I --> J[OpenCV preprocess]
    J --> K[Mistral OCR → ocr_md]
    K --> I
    I -->|done| L[Concatenate all ocr_md]
    L --> M[Claude: extract 8 fields from combined text]
    M --> N[Populate fields on DocumentSubmission]
    N --> O[status = complete]
    O --> P[Save to Supabase]
    P --> Q[Sync to Google Sheets]
    Q --> R([Return DocumentSubmission])

    style A fill:#2d333b,stroke:#8b949e,color:#fff
    style R fill:#2d333b,stroke:#8b949e,color:#fff
    style M fill:#8957e5,stroke:#bc8cff,color:#fff
    style P fill:#1f6feb,stroke:#58a6ff,color:#fff
```

See [`DESIGN.md`](./DESIGN.md) for the reasoning behind this structure.