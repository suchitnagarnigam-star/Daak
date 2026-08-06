from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# ==========================
# Google Document AI
# ==========================

DOCUMENT_AI_PROJECT_ID = os.getenv("DOCUMENT_AI_PROJECT_ID")
DOCUMENT_AI_LOCATION = os.getenv("DOCUMENT_AI_LOCATION")
DOCUMENT_AI_PROCESSOR_ID = os.getenv("DOCUMENT_AI_PROCESSOR_ID")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# ==========================
# Anthropic Claude
# ==========================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# ==========================
# Supabase
# ==========================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ==========================
# Google Sheets & Drive
# ==========================

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID")