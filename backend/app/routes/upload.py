from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
from datetime import datetime, timezone

from app.services.opencv_services import process_image
from app.services.mistral_ocr_services import mistral_process_ocr
from app.services.claude_service import process_document
from app.services.sheets_service import push_to_sheets
from app.utils.file_utils import save_uploaded_file, save_result_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/")
async def upload_images(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No images were provided.")

    processed_results = []

    for file in files:
        saved_path = save_uploaded_file(file)
        processed_path = process_image(saved_path)
        ocr_result = mistral_process_ocr(processed_path)
        llm_result = process_document(ocr_result["text"])
        logger.info(f"LLM result: {llm_result}")

        await push_to_sheets(llm_result, file.filename)

        output_path = save_result_json(file.filename, {
            "original_filename": file.filename,
            "original_path": saved_path,
            "processed_path": processed_path,
            "ocr_text": ocr_result["text"],
            "llm_result": llm_result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        processed_results.append({
            "filename": file.filename,
            "output_path": output_path,
            "extracted_data": llm_result,
        })

    final_result = processed_results[-1]["extracted_data"]

    return {
        "message": "Document batch processed successfully",
        "file_count": len(files),
        "files": [item["filename"] for item in processed_results],
        "output_paths": [item["output_path"] for item in processed_results],
        "extracted_data": final_result,
    }
