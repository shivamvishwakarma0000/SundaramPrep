import os
from datetime import timedelta
from dotenv import load_dotenv

# Load local .env if present
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "sundaram-prep-super-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sundaram-prep-jwt-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # Database: Supports Neon PostgreSQL or local fallback
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL:
        if DATABASE_URL.startswith("postgres://"):
            # Fix SQLAlchemy compatibility for postgres:// URLs
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        # Strip channel_binding if present as it can stall psycopg2 connection negotiations
        DATABASE_URL = DATABASE_URL.replace("&channel_binding=require", "").replace("?channel_binding=require&", "?").replace("?channel_binding=require", "")
        
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or "sqlite:///sundaram_prep.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # AI Keys (Gemini & OpenAI)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_REASONING_MODEL = os.getenv("OPENAI_REASONING_MODEL", "o3-mini")
    OPENAI_FAST_MODEL = os.getenv("OPENAI_FAST_MODEL", "gpt-4o-mini")
    
    # Resend Email & Sender Config
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    MAIL_FROM = os.getenv("MAIL_FROM") or os.getenv("FROM_EMAIL", "Sundaram Prep <onboarding@resend.dev>")
    FROM_EMAIL = MAIL_FROM  # Backwards compatibility
    
    # Optional SMTP Fallback (e.g. Gmail SMTP with App Password)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    
    # OTP Security Settings
    OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
    OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    
    # Cookie & Security
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")
    COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
    
    # Storage / Uploads
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    
    # CORS
    FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", FRONTEND_URL)

config = Config()
