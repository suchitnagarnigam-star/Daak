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
    ocr_result = process_ocr(processed_path)
    llm_result = process_document(ocr_result["text"])

    return {
        "message": "Document processed successfully",
        "filename": file.filename,
        "extracted_data": llm_result
>>>>>>> 385251627864c45b8c1c19aa6a2b5568a9d32276
    }