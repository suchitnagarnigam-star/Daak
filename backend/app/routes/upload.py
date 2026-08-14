from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.services.opencv_services import process_image
from app.services.mistral_ocr_services import mistral_process_ocr
from app.services.claude_service import process_document
from app.services.sheets_service import push_to_sheets
from app.utils.file_utils import save_uploaded_file, save_result_json
from app.services.supabase_service import insert_data

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/upload",
    tags=["Upload"],
)


@router.post("/")
async def upload_images(
    files: list[UploadFile] = File(...)
):
    """
    Process one or multiple images as ONE document submission.

    Pipeline:

        Upload
          ↓
        OpenCV
          ↓
        Mistral OCR
          ↓
        Combine OCR from all pages
          ↓
        Claude / LLM
          ↓
        Save final result
          ↓
        Google Sheets
    """

    # =========================================================
    # VALIDATE UPLOAD
    # =========================================================

    if not files:
        raise HTTPException(
            status_code=400,
            detail="No images were provided.",
        )

    # =========================================================
    # CREATE SUBMISSION ID
    # =========================================================

    submission_id = str(uuid4())

    logger.info(
        "Starting document submission %s with %d image(s)",
        submission_id,
        len(files),
    )

    # =========================================================
    # IMAGE-LEVEL RESULTS
    #
    # Each image gets its own:
    #   - index
    #   - filename
    #   - original path
    #   - processed path
    #   - OCR markdown/text
    #
    # Claude is NOT called here.
    # =========================================================

    image_items = []

    # =========================================================
    # PROCESS EACH IMAGE
    # =========================================================

    for index, file in enumerate(files, start=1):

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail=f"Image {index} does not have a filename.",
            )

        logger.info(
            "[%s] Processing page %d/%d: %s",
            submission_id,
            index,
            len(files),
            file.filename,
        )

        try:
            # -------------------------------------------------
            # SAVE ORIGINAL IMAGE
            # -------------------------------------------------

            saved_path = save_uploaded_file(file)

            logger.info(
                "[%s] Page %d saved: %s",
                submission_id,
                index,
                saved_path,
            )

            # -------------------------------------------------
            # OPENCV
            # -------------------------------------------------

            processed_path = process_image(saved_path)

            logger.info(
                "[%s] Page %d OpenCV processing complete",
                submission_id,
                index,
            )

            # -------------------------------------------------
            # MISTRAL OCR
            # -------------------------------------------------

            ocr_result = mistral_process_ocr(
                processed_path
            )

            ocr_text = ocr_result.get("text", "")

            if not ocr_text:
                logger.warning(
                    "[%s] Page %d returned empty OCR text",
                    submission_id,
                    index,
                )

            logger.info(
                "[%s] Page %d OCR complete",
                submission_id,
                index,
            )

            # -------------------------------------------------
            # STORE IMAGE ITEM
            # -------------------------------------------------

            image_items.append(
                {
                    "img_index": index,
                    "filename": file.filename,
                    "img_path": saved_path,
                    "processed_path": processed_path,
                    "ocr_md": ocr_text,
                }
            )

        except Exception as exc:
            logger.exception(
                "[%s] Failed while processing page %d: %s",
                submission_id,
                index,
                exc,
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    f"Failed to process image "
                    f"{index} ({file.filename})."
                ),
            ) from exc

    # =========================================================
    # COMBINE OCR FROM ALL PAGES
    #
    # IMPORTANT:
    #
    # The page boundaries are explicitly preserved.
    #
    # This allows Claude to understand that:
    #
    # PAGE 1
    # PAGE 2
    # PAGE 3
    #
    # are parts of the SAME document.
    # =========================================================

    page_sections = []

    for image in image_items:

        page_sections.append(
            "\n".join(
                [
                    f"===== BEGIN PAGE {image['img_index']} =====",
                    "",
                    image["ocr_md"],
                    "",
                    f"===== END PAGE {image['img_index']} =====",
                ]
            )
        )

    combined_ocr = "\n\n".join(page_sections)

    logger.info(
        "[%s] Combined OCR created from %d page(s)",
        submission_id,
        len(image_items),
    )

    # =========================================================
    # ONE CLAUDE / LLM CALL
    #
    # This is intentionally OUTSIDE the image loop.
    #
    # Claude receives the complete document.
    # =========================================================

    try:

        llm_result = process_document(
            combined_ocr
        )

        logger.info(
            "[%s] LLM extraction complete",
            submission_id,
        )

    except Exception as exc:

        logger.exception(
            "[%s] LLM processing failed: %s",
            submission_id,
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to extract structured document data.",
        ) from exc

    # =========================================================
    # ONE GOOGLE SHEETS ENTRY
    #
    # We push the final document result only once.
    # =========================================================
    try:
        serial_number = insert_data(llm_result)
    except Exception as exc:
        logger.exception(
            "[%s] Failed to insert data into database: %s",
            submission_id,
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to insert data into database.",
        ) from exc

    try:

        # For a single image, keep the original filename.
        #
        # For multiple images, use a submission-level name
        # rather than treating every page as a separate document.

        if len(files) == 1:
            sheets_filename = files[0].filename
        else:
            sheets_filename = (
                f"submission_{submission_id}"
            )



        await push_to_sheets(
            llm_result,
            sheets_filename,
            serial_number
        )

        logger.info(
            "[%s] Google Sheets sync complete",
            submission_id,
        )

    except Exception as exc:

        logger.exception(
            "[%s] Google Sheets sync failed: %s",
            submission_id,
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail="Document processed but Google Sheets sync failed.",
        ) from exc

    # =========================================================
    # SAVE ONE FINAL RESULT
    #
    # The saved JSON represents the COMPLETE document,
    # not individual pages.
    # =========================================================

    try:

        if len(files) == 1:
            result_filename = files[0].filename
        else:
            result_filename = (
                f"submission_{submission_id}"
            )

        output_path = save_result_json(
            result_filename,
            {
                "serial_number": serial_number,

                "submission_id": submission_id,

                "file_count": len(image_items),

                "status": "complete",

                "created_at": (
                    datetime.now(timezone.utc)
                    .isoformat()
                ),

                # ---------------------------------------------
                # Ordered image information
                # ---------------------------------------------

                "images": image_items,

                # ---------------------------------------------
                # Combined OCR
                # ---------------------------------------------

                "combined_ocr": combined_ocr,

                # ---------------------------------------------
                # ONE final LLM result
                # ---------------------------------------------

                "extracted_data": llm_result,
            },
        )

        logger.info(
            "[%s] Final result saved: %s",
            submission_id,
            output_path,
        )

    except Exception as exc:

        logger.exception(
            "[%s] Failed to save final result: %s",
            submission_id,
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail="Document processed but final result could not be saved.",
        ) from exc

    # =========================================================
    # FINAL RESPONSE
    # =========================================================

    return {
        "serial_number": serial_number,

        "message": "Document processed successfully",

        "submission_id": submission_id,

        "status": "complete",

        "file_count": len(image_items),

        "files": [
            image["filename"]
            for image in image_items
        ],

        "images": image_items,

        "output_path": output_path,

        "extracted_data": llm_result,
    }