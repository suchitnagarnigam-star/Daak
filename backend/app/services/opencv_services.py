"""THIS WHOLE CODE IS LIKE A TEMPLATE SO THAT THE FUNCTION NAMES STAY THE SAME WHILE YOU STILL HAVE TO COMPLETE THE ENTIRE FUNCTIONALITY"""

from pathlib import Path
import cv2

PROCESSED_DIR = Path("processed")
# this will create the processed directory if it doesn't exist
PROCESSED_DIR.mkdir(exist_ok=True)


# placeholder for openCV preprocessing.
def process_image(file_path: str) -> str:
    """
    Load  the uploaded image and perform the first preprocessing step
    (convert to grayscale)
    """
    
    source = Path(file_path)
    destination = PROCESSED_DIR / source.name

    # Read image using OpenCV
    image = cv2.imread(str(source))

    if image is None:
        raise ValueError(f"Could not read the image file: {source}")

    # convert image to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # save processed image
    cv2.imwrite(str(destination), gray)

    return str(destination)