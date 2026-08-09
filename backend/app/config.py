from dotenv import load_dotenv
import os

<<<<<<< HEAD
# Load environment variables
load_dotenv()

=======
try:
    import anthropic
except ImportError:
    anthropic = None
try:
    from google import genai
except ImportError:
    genai = None

# Load environment variables
load_dotenv()


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if genai and GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

>>>>>>> 385251627864c45b8c1c19aa6a2b5568a9d32276
# ==========================
# Anthropic Claude
# ==========================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
<<<<<<< HEAD
=======
anthropic_client = None
if anthropic and ANTHROPIC_API_KEY:
    anthropic_client = anthropic.Client(api_key=ANTHROPIC_API_KEY)
>>>>>>> 385251627864c45b8c1c19aa6a2b5568a9d32276

# ==========================
# Supabase
# ==========================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ==========================
# Google Sheets & Drive
# ==========================

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
<<<<<<< HEAD
GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
=======
GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
>>>>>>> 385251627864c45b8c1c19aa6a2b5568a9d32276
