# MCL OCR Automation Project

## Project Overview

The goal of this project is to reduce manual paperwork in Municipal
Corporation Ludhiana (MCL) by digitizing physical documents. The MVP
focuses on capturing documents, extracting information using OCR,
allowing human verification, and saving the verified data.

## MVP Scope

### Included

-   Camera capture (1--3 images)
-   OpenCV image preprocessing
-   Google Document AI OCR
-   Multilingual support (English, Hindi, Punjabi)
-   Printed and handwritten documents
-   Manual verification
-   Save structured data to Supabase
-   Background synchronization to Google Sheets
-   Automatic monthly sheet creation
-   30-day database retention
-   OCR cache (10 minutes)

### Excluded

-   Authentication
-   Role-based access
-   LLM correction (future)
-   Image storage in database

## Technology Stack

  -----------------------------------------------------------------------
  Component               Technology              Reason
  ----------------------- ----------------------- -----------------------
  Frontend                React                   Simple and fast UI

  Backend                 FastAPI (Python)        Best ecosystem for
                                                  OCR/OpenCV

  Image Processing        OpenCV                  Perspective correction
                                                  & enhancement

  OCR                     Google Document AI      Best multilingual
                                                  accuracy

  Database                Supabase (PostgreSQL)   Structured relational
                                                  storage

  Spreadsheet             Google Sheets API       Existing workflow
                                                  compatibility

  Storage                 Google Drive            Store document images
                          (preferred)             and link them
  -----------------------------------------------------------------------

## Workflow

``` mermaid
flowchart TD
A[Capture 1-3 Images] --> B[OpenCV Processing]
B --> C[Google Document AI]
C --> D[Merge OCR Results]
D --> E[Extract Fields]
E --> F{Field Review Required?}
F -->|No| G[Save to Supabase]
F -->|Yes| H[Manual Verification]
H --> G
G --> I[Return Success]
I --> J[Background Sync]
J --> K{Monthly Sheet Exists?}
K -->|Yes| L[Append Row]
K -->|No| M[Create Monthly Sheet]
M --> L
```

## Extracted Fields

-   Date
-   Subject
-   Body / Description
-   Receiver
-   Sender
-   Reference Number (optional)

## Supported Documents

-   English
-   Hindi
-   Punjabi
-   Printed
-   Handwritten (manual verification expected)

## Data Retention

-   Database: 30 days
-   Google Sheets: Permanent
-   Images: Stored in Google Drive (preferred), not in database

## Processing States

-   CAPTURED
-   PREPROCESSED
-   OCR_COMPLETED
-   UNDER_REVIEW
-   DATABASE_SAVED
-   SHEET_SYNC_PENDING
-   COMPLETED

## Cache Strategy

-   OCR results cached for 10 minutes.
-   Cache cleared after successful save or timeout.
-   Used to avoid duplicate OCR requests and recover failed saves.

## Confirmed Decisions

-   React + FastAPI
-   OpenCV
-   Google Document AI
-   Supabase
-   Google Sheets API
-   OCR abstraction layer
-   Background sheet synchronization
-   Monthly sheet creation based on document month
-   Multi-image support
-   Human verification
-   No authentication
-   No role-based access
-   No image storage in database

## Pending

-   Final Google Drive folder structure
-   Monthly sheet naming convention
-   Final Google Sheet column format
