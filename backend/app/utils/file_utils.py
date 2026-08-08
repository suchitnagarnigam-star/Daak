from pathlib import Path
import shutil
from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")
# this will create the uploads directory if it doesn't exist
UPLOAD_DIR.mkdir(exist_ok=True) 

def save_uploaded_file(file: UploadFile) -> str:
    """
    Save uploaded image to the uploads folder 
    Returns the saved file path
    """
    file_path = UPLOAD_DIR / file.filename
    
    # save the file to the uploads directory
    with open(file_path, "wb") as buffer:
        # this will save the file in chunks to avoid memory issues with large files
        shutil.copyfileobj(file.file, buffer)
    return str(file_path)