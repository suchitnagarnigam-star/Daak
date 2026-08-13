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
                    
                # We extract llm_result and created_at
                # Also include filename as ID and raw ocr text
                item = {
                    "id": filename,
                    "created_at": data.get("created_at"),
                    "llm_result": data.get("llm_result", {}),
                    "ocr_text": data.get("ocr_text", "No raw text available")
                }
                
                # If llm_result is present and valid, add to history
                if item["llm_result"]:
                    history_items.append(item)
                    
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                
    # Sort by created_at descending (newest first)
    history_items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    return history_items
