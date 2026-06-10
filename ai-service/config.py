import os
from dotenv import load_dotenv

load_dotenv()
# Also try loading from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))

def validate_config():
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not GROQ_API_KEY:
        missing.append("GROQ_API_KEY")
    if missing:
        print(f"WARNING: Missing environment variables: {', '.join(missing)}")
        print("Some features may not work correctly.")
