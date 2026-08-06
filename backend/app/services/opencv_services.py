"""THIS WHOLE CODE IS LIKE A TEMPLATE SO THAT THE FUNCTION NAMES STAY THE SAME WHILE YOU STILL HAVE TO COMPLETE THE ENTIRE FUNCTIONALITY"""

from pathlib import Path
import shutil

PROCESSED_DIR = Path("processed")
# this will create the processed directory if it doesn't exist
PROCESSED_DIR.mkdir(exist_ok=True)


# placeholder for openCV preprocessing.
def process_image(file_path: str) -> str:
    """
    placeholder for openCV preprocessing.
    currently copies the upload image
    
    
    NOW ARSH THIS IS FOR YOU TO IMPLEMENT I'VE GIVEN YOU A STRUCTURE AND NOW YOU JUST WORK ON THESE THINGS 
    I HOPE IT'LL HELP YOU  
    """
    
    source = Path(file_path)
    destination = PROCESSED_DIR / source.name
    # this will copy the file to the processed directory
    shutil.copy(source, destination)
    return str(destination)