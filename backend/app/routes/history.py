import os
import json
from pathlib import Path
from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/history", tags=["history"])

OUTPUT_DIR = Path(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "output"))

@router.get("/")
def get_history():
    history_items = []
    
    if not OUTPUT_DIR.exists():
        return history_items
        
    for filename in os.listdir(OUTPUT_DIR):
        if filename.endswith(".json"):
            filepath = OUTPUT_DIR / filename
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                # Support both new format (extracted_data / combined_ocr)
                # and old format (llm_result / ocr_text)
                llm_result = data.get("extracted_data") or data.get("llm_result", {})
                ocr_text = data.get("combined_ocr") or data.get("ocr_text", "No raw text available")

                item = {
                    "id": filename,
                    "serial_number": data.get("serial_number"),
                    "created_at": data.get("created_at"),
                    "llm_result": llm_result,
                    "ocr_text": ocr_text,
                }

                # If llm_result is present and valid, add to history
                if item["llm_result"]:
                    history_items.append(item)
                    
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                
    # Sort by created_at descending (newest first)
    history_items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    return history_items
