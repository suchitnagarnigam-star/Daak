<<<<<<< HEAD
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.opencv_services import process_image
from app.services.mistral_ocr_services import mistral_process_ocr
from app.services.claude_service import process_document
from app.services.sheets_service import push_to_sheets
import logging
from datetime import datetime, timezone


logger = logging.getLogger(__name__)

from app.utils.file_utils import save_uploaded_file, save_result_json
=======
<<<<<<< HEAD
#  this entire file is for testing the upload functionality. It will be removed later when the upload functionality is implemented in the frontend.
from fastapi import APIRouter, UploadFile, File
from app.services.opencv_services import process_image
=======
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.opencv_services import process_image
from app.services.ocr_service import process_ocr
from app.services.gemini_service import process_document
>>>>>>> 385251627864c45b8c1c19aa6a2b5568a9d32276
from app.utils.file_utils import save_uploaded_file
>>>>>>> 65f4fac43680272b690decec69c8d11c60706fbf

router = APIRouter(prefix="/upload", tags=["Upload"])

<<<<<<< HEAD

@router.post("/")
async def upload_image(file: UploadFile = File(...)):
    # save the uploaded file to the uploads directory
    saved_path = save_uploaded_file(file)
    
    processed_path = process_image(saved_path)

    return {
        # this message will be displayed in the frontend after the file is uploaded successfully
        "message": "Image uploaded successfully",
        "filename": file.filename,
        "saved_path": saved_path,
        "processed_path": processed_path
=======
@router.post("/")
async def upload_image(file: UploadFile = File(...)):
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
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "message": "Document processed successfully",
        "filename": file.filename,
        "output_path": output_path,
        "extracted_data": llm_result
>>>>>>> 385251627864c45b8c1c19aa6a2b5568a9d32276
    }