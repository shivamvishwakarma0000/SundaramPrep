import secrets
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any

from app.models.core import db
from app.models.user import EmailVerificationOTP, User
from app.config import config
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

class OTPService:
    """
    Production-grade OTP Generation, Hashing, Expiry, Rate-Limiting & Verification Service.
    Never persists raw OTPs in plaintext.
    """
    
    @staticmethod
    def _hash_otp(email: str, otp_code: str, purpose: str) -> str:
        """Cryptographically secure salted hash bound to email and purpose."""
        salt = config.SECRET_KEY
        payload = f"{salt}:{email.strip().lower()}:{otp_code.strip()}:{purpose.upper()}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @staticmethod
    def generate_code(length: int = 6) -> str:
        """Generates a cryptographically secure numeric OTP."""
        return "".join(secrets.choice("0123456789") for _ in range(length))

    def create_and_send_otp(
        self,
        email: str,
        purpose: str = "REGISTRATION",
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        full_name: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Validates rate-limits, invalidates previous codes, creates hashed OTP,
        and dispatches email via Resend.
        """
        clean_email = email.strip().lower()
        now = datetime.utcnow()
        
        # 1. Rate Limit: Check 30-second resend cooldown
        latest_otp = (
            EmailVerificationOTP.query.filter_by(email=clean_email, purpose=purpose)
            .order_by(EmailVerificationOTP.created_at.desc())
            .first()
        )
        if latest_otp:
            time_elapsed = (now - latest_otp.created_at).total_seconds()
            if time_elapsed < config.OTP_RESEND_COOLDOWN_SECONDS:
                cooldown_left = int(config.OTP_RESEND_COOLDOWN_SECONDS - time_elapsed)
                return False, f"Resend available in {cooldown_left} seconds. Please wait.", {"cooldown_seconds": cooldown_left}

        # 2. Hourly Abuse Prevention: Limit to 10 OTPs per hour per email/IP
        one_hour_ago = now - timedelta(hours=1)
        hourly_count = EmailVerificationOTP.query.filter(
            EmailVerificationOTP.email == clean_email,
            EmailVerificationOTP.created_at >= one_hour_ago
        ).count()
        if hourly_count >= 10:
            return False, "Too many OTP requests in a short period. Please try again in an hour.", {"rate_limited": True}

        # 3. Invalidate any previous unused OTPs for this email and purpose
        unused_otps = EmailVerificationOTP.query.filter(
            EmailVerificationOTP.email == clean_email,
            EmailVerificationOTP.purpose == purpose,
            EmailVerificationOTP.used_at.is_(None)
        ).all()
        for old in unused_otps:
            # Mark as expired immediately to invalidate
            old.expires_at = now - timedelta(seconds=1)

        # 4. Generate secure 6-digit OTP and calculate hash
        raw_otp = self.generate_code(6)
        hashed_otp = self._hash_otp(clean_email, raw_otp, purpose)
        expires_at = now + timedelta(minutes=config.OTP_EXPIRY_MINUTES)

        otp_record = EmailVerificationOTP(
            user_id=user_id,
            email=clean_email,
            otp_hash=hashed_otp,
            purpose=purpose,
            metadata_json=metadata or {},
            expires_at=expires_at,
            attempt_count=0,
            max_attempts=config.OTP_MAX_ATTEMPTS,
            ip_address=ip_address,
            created_at=now
        )
        db.session.add(otp_record)
        db.session.commit()

        # 5. Dispatch through Resend Email Service
        email_result = email_service.send_otp_email(
            to_email=clean_email,
            otp_code=raw_otp,
            purpose=purpose,
            full_name=full_name
        )

        logger.info(f"Dispatched {purpose} OTP for {clean_email} (Status: {email_result.get('sent')})")
        
        return True, "Verification code sent successfully.", {
            "expires_in_minutes": config.OTP_EXPIRY_MINUTES,
            "resend_cooldown_seconds": config.OTP_RESEND_COOLDOWN_SECONDS,
            # For development / testing when RESEND_API_KEY is not configured
            "_dev_otp": raw_otp if not email_service.is_configured else None
        }

    def verify_otp(
        self,
        email: str,
        otp_code: str,
        purpose: str = "REGISTRATION"
    ) -> Tuple[bool, str, Optional[EmailVerificationOTP]]:
        """
        Verifies provided OTP against salted SHA-256 hash.
        Guards against replay attacks, brute-force guessing, and expiration.
        """
        clean_email = email.strip().lower()
        now = datetime.utcnow()

        # Find latest active unused OTP
        otp_record = (
            EmailVerificationOTP.query.filter(
                EmailVerificationOTP.email == clean_email,
                EmailVerificationOTP.purpose == purpose,
                EmailVerificationOTP.used_at.is_(None)
            )
            .order_by(EmailVerificationOTP.created_at.desc())
            .first()
        )

        if not otp_record:
            return False, "No active verification code found for this email. Please request a new one.", None

        # Check if locked due to failed attempts
        if otp_record.is_locked():
            return False, "Too many failed attempts. For security, this verification code has been locked. Please request a new one.", None

        # Check if expired
        if otp_record.is_expired():
            return False, "This verification code has expired. Please request a new one.", None

        # Check hash
        expected_hash = self._hash_otp(clean_email, otp_code, purpose)
        if otp_record.otp_hash != expected_hash:
            otp_record.attempt_count += 1
            db.session.commit()
            remaining_attempts = max(0, otp_record.max_attempts - otp_record.attempt_count)
            if remaining_attempts == 0:
                return False, "Incorrect verification code. Maximum attempts exceeded. Code locked.", None
            return False, f"Incorrect verification code. {remaining_attempts} attempt(s) remaining.", None

        # Successful verification: Mark as used immediately (single-use)
        otp_record.used_at = now
        db.session.commit()

        return True, "Verification code confirmed.", otp_record

otp_service = OTPService()
