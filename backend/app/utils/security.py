import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, Response, make_response
from app.config import config
from app.utils.responses import api_error

def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_jwt(user_id: str, email: str, role: str = "student") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + config.JWT_ACCESS_TOKEN_EXPIRES
    }
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm="HS256")

def decode_jwt(token: str):
    try:
        return jwt.decode(token, config.JWT_SECRET_KEY, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def set_auth_cookie(response, token: str):
    """
    Sets secure HTTP-Only cookie with SameSite protection for web clients.
    """
    resp = make_response(response)
    max_age = int(config.JWT_ACCESS_TOKEN_EXPIRES.total_seconds())
    resp.set_cookie(
        key="access_token",
        value=token,
        max_age=max_age,
        httponly=True,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,
        path="/"
    )
    return resp

def clear_auth_cookie(response):
    """Clears the access_token HTTP-only cookie upon logout."""
    resp = make_response(response)
    resp.delete_cookie(
        key="access_token",
        path="/"
    )
    return resp

def token_required(f):
    """
    Authentication middleware supporting both:
    1. HTTP-Only Cookie (`access_token`)
    2. Authorization Header (`Bearer <token>`)
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 1. Prefer Authorization Bearer Header if provided
        auth_header = request.headers.get("Authorization", "")
        if auth_header:
            parts = auth_header.split(" ")
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
                
        # 2. Fall back to secure HTTP-Only Cookie
        if not token:
            token = request.cookies.get("access_token")
            
        if not token:
            return api_error("Authentication required. Missing token or session cookie.", code="UNAUTHORIZED", status_code=401)
        
        decoded = decode_jwt(token)
        if not decoded:
            return api_error("Invalid or expired session token.", code="UNAUTHORIZED", status_code=401)
        
        request.current_user = decoded
        return f(*args, **kwargs)
    return decorated

def enforce_ownership(owner_id: str, current_user_id: str):
    """
    Guarantees strict multi-tenant student data isolation.
    Throws 403 Forbidden if Student A attempts to access Student B's data.
    """
    if str(owner_id) != str(current_user_id):
        return False
    return True

def admin_required(f):
    """
    Guarantees that only users with role='ADMIN' (Sundaram) can access the route.
    """
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        user_id = request.current_user.get("sub")
        from app.models.user import User
        user = User.query.get(user_id)
        if not user or user.role != "ADMIN":
            return api_error("Access restricted: Only Sundaram (Admin) has permission to perform this action.", code="FORBIDDEN", status_code=403)
        return f(*args, **kwargs)
    return decorated
