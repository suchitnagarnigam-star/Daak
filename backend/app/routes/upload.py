from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.opencv_services import process_image
from app.services.ocr_service import process_ocr
from app.services.gemini_service import process_document
from app.utils.file_utils import save_uploaded_file

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/")
async def upload_image(file: UploadFile = File(...)):
    saved_path = save_uploaded_file(file)
    processed_path = process_image(saved_path)
    ocr_result = process_ocr(processed_path)
    llm_result = process_document(ocr_result["text"])

    return {
        "message": "Document processed successfully",
        "filename": file.filename,
        "extracted_data": llm_result
    }