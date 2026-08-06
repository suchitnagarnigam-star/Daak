#  this entire file is for testing the upload functionality. It will be removed later when the upload functionality is implemented in the frontend.
from fastapi import APIRouter, UploadFile, File
from app.utils.file_utils import save_uploaded_file

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("/")
async def upload_image(file: UploadFile = File(...)):
    # save the uploaded file to the uploads directory
    saved_path = save_uploaded_file(file)

    return {
        # this message will be displayed in the frontend after the file is uploaded successfully
        "message": "Image uploaded successfully",
        "filename": file.filename,
        "saved_path": saved_path
    }