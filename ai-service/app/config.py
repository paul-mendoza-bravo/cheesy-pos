"""
Configuración centralizada: variables de entorno, constantes del negocio.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# SUPABASE
# ==========================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# ==========================================
# LLM / IA
# ==========================================
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4")  # o "claude-3-opus-20240229"

# ==========================================
# WHATSAPP (META)
# ==========================================
WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL", "https://graph.instagram.com/v18.0")
WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "cheesy-pos-verify-2026")
# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ==========================================
# APP
# ==========================================
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
