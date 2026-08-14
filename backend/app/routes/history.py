import os
import json
from pathlib import Path
from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/history", tags=["history"])

from app.services.supabase_service import get_recent_documents

OUTPUT_DIR = Path(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "output"))

@router.get("/")
def get_history():
    # 1. Try fetching from Supabase first
    supabase_docs = get_recent_documents(limit=10)
    if supabase_docs:
        history_items = []
        for row in supabase_docs:
            llm_result = {
                "date": row.get("date"),
                "subject": row.get("subject"),
                "summary": row.get("summary"),
                "department": row.get("department"),
                "sender_name": row.get("sender_name"),
                "sender_contact": row.get("sender_contact"),
                "receiver": row.get("receiver"),
                "reference_number": row.get("reference_number")
            }
            history_items.append({
                "id": str(row.get("id") or row.get("serial_number")),
                "serial_number": row.get("serial_number"),
                "created_at": row.get("created_at") or "",
                "llm_result": llm_result,
                "ocr_text": "No raw text available"
            })
        return history_items

    # 2. Fallback to local JSON files if Supabase is empty or unconfigured
    history_items = []
    if not OUTPUT_DIR.exists():
        return history_items
        
    for filename in os.listdir(OUTPUT_DIR):
        if filename.endswith(".json"):
            filepath = OUTPUT_DIR / filename
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                llm_result = data.get("extracted_data") or data.get("llm_result", {})
                ocr_text = data.get("combined_ocr") or data.get("ocr_text", "No raw text available")

                item = {
                    "id": filename,
                    "serial_number": data.get("serial_number"),
                    "created_at": data.get("created_at"),
                    "llm_result": llm_result,
                    "ocr_text": ocr_text,
                }

                if item["llm_result"]:
                    history_items.append(item)
                    
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                
    history_items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return history_items[:10]

