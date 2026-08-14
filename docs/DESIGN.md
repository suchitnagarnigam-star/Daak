<div align="center">

# MCL Patr — Design Document

Architecture decisions and the reasoning behind them.

</div>

---

## 1. Why FastAPI + separate OCR/LLM services

OCR and structured extraction are two distinct problems and should not live in the same function:

- **OCR** (Mistral / PaddleOCR) converts pixels → raw text. It knows nothing about MCL's business fields.
- **LLM extraction** (Claude) converts raw text → structured fields. It knows nothing about images.

Keeping these as separate services means either can be swapped independently. This already happened once — Gemini was replaced with Claude without touching the OCR layer, and PaddleOCR was demoted from primary to fallback without touching the extraction layer. That's the payoff of the separation, not a hypothetical benefit.

---

## 2. Why Mistral OCR is primary and PaddleOCR is fallback, not the reverse

PaddleOCR was tested first and kept as a safety net for a concrete reason: it runs **locally**, no external API dependency. If Mistral's API is down or rate-limited, the pipeline doesn't fully break — it degrades.

The tradeoff: PaddleOCR's standard language list does not cleanly separate Punjabi as a distinct language. This is a **known, unresolved risk** — not a solved problem. If a document fails through to the fallback and happens to be Punjabi, extraction quality is unverified. This should be flagged in any demo, not glossed over.

---

## 3. Why Claude receives markdown text, not images

Mistral OCR already returns `pages[0].markdown` — structured text with layout preserved. Sending this to Claude instead of raw images is a deliberate choice:

- Cheaper (text tokens vs image tokens)
- Faster (no image encoding round-trip)
- More reliable (Claude parses text semantics, not visual layout — that job already belongs to OCR)

If OCR quality degrades on a document, that's a Mistral/Paddle problem. If field extraction is wrong on clean OCR text, that's a Claude prompt problem. Separating inputs makes it obvious which layer failed.

---

## 4. Why `vid` is generated server-side, not client-side

The frontend is not a trustworthy source of identity. A page refresh, a duplicate tap, or a retried request could generate colliding or missing IDs if the client owned this responsibility.

`vid = uuid4()` is generated the moment FastAPI receives the request, before any file is touched. This means:

- Every submission has exactly one ID, guaranteed unique, regardless of frontend behavior
- The ID exists even if every image in the submission fails to process — the object itself never has a missing identity

---

## 5. Why `img_index` is a local variable inside the object, not a global counter

Two documents could be submitted concurrently. A shared global counter for image indexing would need locking or would risk collisions under concurrent requests.

Making `img_index` local to each `DocumentSubmission` object sidesteps this entirely — each request builds its own list, indexes it independently, and no cross-request state is shared. This is a concurrency decision, not a cosmetic one.

---

## 6. Why the object is created before files are saved

Sequencing matters here:

```
Generate vid → Create DocumentSubmission (empty images_list) → Loop: save file → append ImageItem
```

Not the reverse. If files were saved first and the object created after, a crash mid-save would leave orphaned files on disk with no corresponding tracked object — no `vid`, no way to associate them with a submission. Creating the object first means every file that gets saved is already accounted for in a tracked structure, even if the request fails partway through.

---

## 7. Why OCR runs per-image but extraction runs once on combined text

For a 3-image document (e.g., a 3-page letter):

- **OCR must run per image** — Mistral processes one image at a time, there's no batching at that layer.
- **Extraction should run once** — the 8 fields (date, subject, sender, etc.) describe the *document*, not any single page. Running Claude 3 times and merging results risks contradictory field values across pages (e.g., page 1 says one sender, page 3's OCR misreads it as another). Concatenating all OCR text and extracting once gives Claude the full context to resolve this itself.

This is why `images_list` holds per-image `ocr_md`, but the 8 extracted fields sit on the top-level `DocumentSubmission`, not nested per image.

---

## 8. Why no Supabase yet, despite `config.py` referencing it

`config.py` initializes a Supabase client, but nothing writes to it. This is intentional ordering, not an oversight: the **schema** needs to be finalized before any write code is built, because writing first and migrating the schema later means rewriting the same code twice.

The schema should mirror `DocumentSubmission` directly — `vid`, `status`, the 8 fields, timestamps. No separate `images` table planned yet since images aren't persisted (hard constraint: no permanent image storage).

---

## 9. Hard constraints and why they hold

| Constraint | Reason |
|---|---|
| No auth / RBAC | MVP scope — municipal staff access is not gated at this layer. Adding auth later is additive, not a rearchitecture, as long as routes stay stateless. |
| No agents | Pipeline is a fixed, deterministic sequence (OCR → extract → store). An agent implies dynamic tool selection, which this pipeline doesn't need and would add unpredictable latency/cost. |
| No streaming | Claude's output is a small JSON object (8 fields), not long-form text. Streaming adds complexity with no UX benefit at this size. |
| No permanent image storage | Government correspondence may contain sensitive information. Images are processed and discarded — only extracted structured data persists. |

These aren't defaults — they were chosen deliberately and should be revisited only with an explicit reason, not convenience.

---

## 10. Open risks (not yet resolved)

- **Punjabi/Gurmukhi OCR fallback path** — unverified on PaddleOCR. If Mistral fails on a Punjabi document, output quality is unknown.
- **Partial failure in multi-image submissions** — if image 2 of 3 fails OCR, there's currently no defined behavior: fail the whole submission, or proceed with partial `ocr_md` (null for that image) and let Claude extract from what succeeded. This needs a decision before multi-image ships.
- **Render cold start** — 50s delay on first request after inactivity. Acceptable for development, not acceptable for a live commissioner demo.
