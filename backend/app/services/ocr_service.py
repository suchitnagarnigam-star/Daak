from pathlib import Path
from paddlex import create_pipeline

# -----------------------------------
# PaddleOCR Pipeline
# -----------------------------------
ocr_pipeline = create_pipeline(
    pipeline="OCR",
    device="cpu",
)

# -----------------------------------
# OCR Processing
# -----------------------------------
def process_ocr(file_path: str)-> dict:
    """
    Run paddleocr on processed image.
    Args: file_path (str): Path to the image file.
    Returns: dict:  dictionary containing OCR results.
    """
    source = Path(file_path)
    
    # -----------------------------------
    # 1. validate input file
    # -----------------------------------
    if not source.exists():
        raise FileNotFoundError(
            f"File not found: {source}"
        )

    if not source.is_file():
        raise ValueError(
            f"Provide OCR Path is not a file: {source}"
        )

    # -----------------------------------
    # 2. Run Paddle OCR
    # -----------------------------------
    results = ocr_pipeline.predict(
        input=str(source)
    )

    # -----------------------------------
    # 3. Process prediction results
    # -----------------------------------
    ocr_results = []
    extracted_texts = []
    
    for result in results:

        # Store PaddleOCR's structured result.
        #
        # We keep the original result object here for
        # the moment because we first want to inspect
        # exactly what PaddleOCR 3.7 returns.

        ocr_results.append(result)
        
        # Extract text string from result
        text = str(result)
        if text:
            extracted_texts.append(text)

    # Join all extracted texts into a single string
    combined_text = "\n".join(extracted_texts)

    #-----------------------------------
    # 4. Return results
    #-----------------------------------
    return {
        "file": str(source),
        "results": ocr_results,
        "text": combined_text,
    }