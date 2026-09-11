from flask import Blueprint, jsonify
from app.services.ai_service import ai_service
from app.services.email_service import email_service

health_bp = Blueprint("health", __name__, url_prefix="/api")

@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Ultra-lightweight health probe for UptimeRobot and Render.
    Strictly performs zero database queries and zero external AI network calls
    to prevent unwanted Neon compute wakeups and rate-limit hits.
    """
    payload = {
        "status": "online",
        "provider": "OpenAI",
        "service": "Sundaram Prep API",
        "version": "1.0.0",
        "ai_configured": ai_service.is_configured,
        "email_configured": email_service.is_configured
    }
    return jsonify({
        **payload,
        "success": True,
        "data": payload
    }), 200


