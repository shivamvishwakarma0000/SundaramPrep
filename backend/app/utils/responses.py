from flask import jsonify
from datetime import datetime

def api_response(data=None, error=None, status_code=200, meta=None):
    """
    Standardized API response envelope:
    {
        "success": bool,
        "data": any,
        "error": { "code": str, "message": str, "details": any } | null,
        "meta": { "timestamp": str, "version": "1.0.0", ... }
    }
    """
    if meta is None:
        meta = {}
    
    meta["timestamp"] = datetime.utcnow().isoformat() + "Z"
    meta["version"] = "1.0.0"
    
    success = (error is None) and (status_code < 400)
    
    payload = {
        "success": success,
        "data": data,
        "error": error,
        "meta": meta
    }
    return jsonify(payload), status_code

def api_success(data=None, status_code=200, meta=None):
    return api_response(data=data, error=None, status_code=status_code, meta=meta)

def api_error(message, code="BAD_REQUEST", status_code=400, details=None, meta=None):
    error_payload = {
        "code": code,
        "message": message,
        "details": details
    }
    return api_response(data=None, error=error_payload, status_code=status_code, meta=meta)
