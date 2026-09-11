from flask import Blueprint, request, make_response
from datetime import datetime

from app.models import db, User, EmailVerificationOTP, UserProfile
from app.utils.responses import api_success, api_error
from app.utils.security import (
    hash_password,
    verify_password,
    generate_jwt,
    token_required,
    set_auth_cookie,
    clear_auth_cookie
)
from app.services.otp_service import otp_service
from app.services.email_service import email_service

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Step 01: Account Creation.
    Creates account in PENDING state (email_verified=False) and sends 6-digit OTP via Resend.
    """
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    full_name = (payload.get("full_name") or payload.get("name", "")).strip()
    target_exam = payload.get("target_exam", "UPSC_CSE")
    
    if not email or not password or not full_name:
        return api_error("Full Name, Primary Email, and Password are required.", status_code=400)
        
    if len(password) < 6:
        return api_error("Password must be at least 6 characters long.", status_code=400)

    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        if existing_user.email_verified:
            return api_error(
                "An account with this email already exists. Please sign in.",
                code="USER_EXISTS",
                status_code=409
            )
        else:
            # User exists but is unverified: update credentials and resend OTP
            existing_user.name = full_name
            existing_user.password_hash = hash_password(password)
            existing_user.target_exam = target_exam
            user = existing_user
    else:
        user = User(
            email=email,
            name=full_name,
            password_hash=hash_password(password),
            target_exam=target_exam,
            status="PENDING",
            email_verified=False
        )
        db.session.add(user)
    
    db.session.commit()

    # Generate and send 6-digit OTP via Resend
    ip_addr = request.headers.get("X-Forwarded-For", request.remote_addr)
    success, msg, otp_info = otp_service.create_and_send_otp(
        email=user.email,
        purpose="REGISTRATION",
        user_id=user.id,
        ip_address=ip_addr,
        full_name=user.name
    )

    if not success:
        return api_error(msg, code="OTP_DISPATCH_FAILED", status_code=429, details=otp_info)

    response_data = {
        "email": user.email,
        "name": user.name,
        "requires_otp": True,
        "status": "PENDING",
        "message": "Account created in pending state. Verification code sent to your email.",
        "otp_info": {
            "expires_in_minutes": otp_info.get("expires_in_minutes", 10),
            "resend_cooldown_seconds": otp_info.get("resend_cooldown_seconds", 30),
            "_dev_otp": otp_info.get("_dev_otp")
        }
    }
    return api_success(response_data, status_code=201)

@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    """
    Step 02: Email OTP Verification.
    Verifies 6-digit hashed OTP, marks email_verified=True, sets status=ACTIVE,
    creates secure HTTP-only session cookie, and returns auth response.
    """
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    otp_code = str(payload.get("otp") or payload.get("otp_code") or "").strip()
    purpose = payload.get("purpose", "REGISTRATION").upper()

    if not email or not otp_code:
        return api_error("Email and 6-digit verification code are required.", status_code=400)

    # Verify OTP against cryptographic hash
    valid, msg, otp_record = otp_service.verify_otp(email, otp_code, purpose=purpose)
    if not valid:
        return api_error(msg, code="OTP_INVALID", status_code=400)

    if purpose == "REGISTRATION":
        user = User.query.filter_by(email=email).first()
        if not user:
            return api_error("User not found.", code="NOT_FOUND", status_code=404)

        # Activate account
        user.email_verified = True
        user.status = "ACTIVE"
        user.last_login_at = datetime.utcnow()
        db.session.commit()

        # Send welcome email
        email_service.send_welcome_email(user.email, user.name, user.target_exam)

        token = generate_jwt(user.id, user.email)
        res = api_success({
            "verified": True,
            "next_step": "PERSONALIZE",
            "user": user.to_dict(),
            "token": token
        })
        return set_auth_cookie(res, token)

    elif purpose == "FORGOT_PASSWORD":
        return api_success({
            "verified": True,
            "email": email,
            "reset_token": otp_record.id,
            "message": "Verification code accepted. Please set your new password."
        })

    elif purpose == "EMAIL_CHANGE":
        metadata = otp_record.metadata_json or {}
        new_email = metadata.get("new_email", "").strip().lower()
        if not new_email:
            return api_error("Invalid email change record.", status_code=400)

        user = User.query.get(otp_record.user_id)
        if not user:
            return api_error("User not found.", status_code=404)

        user.email = new_email
        db.session.commit()

        token = generate_jwt(user.id, user.email)
        res = api_success({
            "verified": True,
            "user": user.to_dict(),
            "token": token,
            "message": "Email address updated successfully."
        })
        return set_auth_cookie(res, token)

    return api_success({"verified": True})

@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    """
    Rate-limited Resend OTP endpoint. Enforces 30-second cooldown and hourly limits.
    """
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    purpose = payload.get("purpose", "REGISTRATION").upper()

    if not email:
        return api_error("Email address is required to resend verification code.", status_code=400)

    user = User.query.filter_by(email=email).first()
    user_id = user.id if user else None
    full_name = user.name if user else None

    ip_addr = request.headers.get("X-Forwarded-For", request.remote_addr)
    success, msg, data = otp_service.create_and_send_otp(
        email=email,
        purpose=purpose,
        user_id=user_id,
        ip_address=ip_addr,
        full_name=full_name
    )

    if not success:
        return api_error(msg, code="RESEND_COOLDOWN", status_code=429, details=data)

    return api_success(data or {"message": "Verification code resent successfully."})

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Standard Email & Password Login with verified email check.
    Sets secure HTTP-Only cookie and returns Bearer token.
    """
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        return api_error("Email and password are required.", status_code=400)

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return api_error("Invalid email or password.", code="INVALID_CREDENTIALS", status_code=401)

    # Check email verification status
    if not user.email_verified:
        # Dispatch new OTP so user can verify seamlessly
        otp_service.create_and_send_otp(
            email=user.email,
            purpose="REGISTRATION",
            user_id=user.id,
            full_name=user.name
        )
        return api_error(
            "Your email address is not yet verified. A new 6-digit verification code has been sent to your inbox.",
            code="EMAIL_NOT_VERIFIED",
            status_code=403,
            details={"email": user.email, "requires_otp": True}
        )

    user.last_login_at = datetime.utcnow()
    db.session.commit()

    token = generate_jwt(user.id, user.email)
    res = api_success({
        "user": user.to_dict(),
        "token": token
    })
    return set_auth_cookie(res, token)

@auth_bp.route("/forgot-password/request", methods=["POST"])
def forgot_password_request():
    """
    Initiates password recovery. Dispatches 6-digit OTP without leaking user existence.
    """
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()

    if not email:
        return api_error("Email address is required.", status_code=400)

    user = User.query.filter_by(email=email).first()
    if user:
        ip_addr = request.headers.get("X-Forwarded-For", request.remote_addr)
        otp_service.create_and_send_otp(
            email=user.email,
            purpose="FORGOT_PASSWORD",
            user_id=user.id,
            ip_address=ip_addr,
            full_name=user.name
        )

    # Generic response prevents account enumeration
    return api_success({
        "message": "If an account exists with this email, a verification code has been sent."
    })

@auth_bp.route("/forgot-password/reset", methods=["POST"])
def forgot_password_reset():
    """
    Resets password after verifying OTP. Never sends plaintext passwords.
    """
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    otp_code = str(payload.get("otp") or payload.get("otp_code") or "").strip()
    new_password = payload.get("new_password", "")

    if not email or not otp_code or not new_password:
        return api_error("Email, verification code, and new password are required.", status_code=400)

    if len(new_password) < 6:
        return api_error("New password must be at least 6 characters long.", status_code=400)

    # Verify OTP
    valid, msg, _ = otp_service.verify_otp(email, otp_code, purpose="FORGOT_PASSWORD")
    if not valid:
        return api_error(msg, code="OTP_INVALID", status_code=400)

    user = User.query.filter_by(email=email).first()
    if not user:
        return api_error("User not found.", code="NOT_FOUND", status_code=404)

    user.password_hash = hash_password(new_password)
    user.email_verified = True  # Verified through OTP
    db.session.commit()

    return api_success({"message": "Password reset successfully. You can now log in with your new password."})

@auth_bp.route("/change-email/request", methods=["POST"])
@token_required
def change_email_request():
    """
    Step 01 of Email Change:
    Old email remains trusted until new email is verified.
    New email receives OTP.
    """
    current_user_id = request.current_user["sub"]
    payload = request.get_json() or {}
    new_email = payload.get("new_email", "").strip().lower()

    if not new_email:
        return api_error("New email address is required.", status_code=400)

    user = User.query.get(current_user_id)
    if not user:
        return api_error("User not found.", status_code=404)

    if user.email.lower() == new_email:
        return api_error("New email cannot be identical to your current email.", status_code=400)

    # Check if new email is in use by another verified user
    existing = User.query.filter_by(email=new_email).first()
    if existing and existing.email_verified:
        return api_error("This email is already associated with another account.", status_code=409)

    ip_addr = request.headers.get("X-Forwarded-For", request.remote_addr)
    success, msg, data = otp_service.create_and_send_otp(
        email=new_email,
        purpose="EMAIL_CHANGE",
        user_id=user.id,
        metadata={"new_email": new_email, "old_email": user.email},
        ip_address=ip_addr,
        full_name=user.name
    )

    if not success:
        return api_error(msg, code="RESEND_COOLDOWN", status_code=429, details=data)

    return api_success({
        "message": f"Verification code sent to {new_email}. Your current email remains active until verified.",
        "new_email": new_email
    })

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clears HTTP-only session cookies."""
    res = api_success({"message": "Logged out successfully."})
    return clear_auth_cookie(res)

@auth_bp.route("/demo-login", methods=["POST"])
def demo_login():
    """Instant 1-click test login for reviewers/students."""
    demo_email = "aspirant@sundaramprep.com"
    user = User.query.filter_by(email=demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            name="Sundaram Aspirant",
            password_hash=hash_password("DemoPass123!"),
            target_exam="UPSC_CSE",
            email_verified=True,
            status="ACTIVE"
        )
        db.session.add(user)
        db.session.commit()
    else:
        user.email_verified = True
        user.status = "ACTIVE"
        db.session.commit()
        
    token = generate_jwt(user.id, user.email)
    res = api_success({
        "user": user.to_dict(),
        "token": token
    })
    return set_auth_cookie(res, token)

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    user_id = request.current_user["sub"]
    user = User.query.get(user_id)
    if not user:
        return api_error("User not found.", code="NOT_FOUND", status_code=404)
    return api_success({"user": user.to_dict()})

@auth_bp.route("/personalize", methods=["POST", "PATCH"])
@token_required
def personalize():
    """
    Step 03: Personalization.
    Configures target exam, study goal, language, and optional profile fields.
    """
    user_id = request.current_user["sub"]
    user = User.query.get(user_id)
    if not user:
        return api_error("User not found.", code="NOT_FOUND", status_code=404)

    payload = request.get_json() or {}
    if "target_exam" in payload:
        user.target_exam = payload["target_exam"]
    if "daily_goal" in payload:
        try:
            user.daily_goal = int(payload["daily_goal"])
        except (ValueError, TypeError):
            pass
    if "language" in payload:
        user.language = payload["language"]

    # Profile extensions
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.session.add(profile)

    if "state" in payload:
        profile.state = payload["state"]
    if "college_or_institute" in payload:
        profile.college_or_institute = payload["college_or_institute"]

    db.session.commit()
    return api_success({
        "user": user.to_dict(),
        "profile": profile.to_dict(),
        "next_step": "DASHBOARD",
        "message": "Preferences updated successfully."
    })
