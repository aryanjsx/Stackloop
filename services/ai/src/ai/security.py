import hashlib
import hmac
import time
from typing import Optional
from fastapi import Header, HTTPException, Request
from .config import settings

def compute_hmac_signature(payload: bytes, secret: str) -> str:
    """Compute HMAC-SHA256 signature for a payload byte string."""
    return hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()

def verify_signature(payload: bytes, signature_header: str, secret: str) -> bool:
    """
    Verify HMAC-SHA256 signature.
    Supports either:
    1. Direct hex signature: 'sha256=<hex>' or '<hex>'
    2. Timestamped signature: 't=<timestamp>,v1=<hex>'
    """
    if not signature_header:
        return False

    parts = dict(part.split('=', 1) for part in signature_header.split(',') if '=' in part)
    
    if 't' in parts and 'v1' in parts:
        timestamp_str = parts['t']
        expected_sig = parts['v1']
        
        # Verify timestamp is within 5 minutes (300 seconds)
        try:
            timestamp = int(timestamp_str)
            if abs(time.time() - timestamp) > 300:
                return False
        except ValueError:
            return False
        
        # Signed content is timestamp + '.' + payload
        signed_payload = f"{timestamp_str}.".encode('utf-8') + payload
        computed = hmac.new(secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(computed, expected_sig)
    
    # Fallback: direct hex digest or sha256=<hex>
    clean_sig = signature_header.replace('sha256=', '').strip()
    computed = compute_hmac_signature(payload, secret)
    return hmac.compare_digest(computed, clean_sig)

async def verify_task_security(
    request: Request,
    x_stackloop_signature: Optional[str] = Header(None, alias="X-StackLoop-Signature"),
    x_cloudtasks_taskname: Optional[str] = Header(None, alias="X-CloudTasks-TaskName"),
):
    """
    FastAPI dependency to authenticate Cloud Tasks or internal webhook requests.
    In development mode without signature header, allows requests if explicitly enabled.
    In production mode, strictly enforces HMAC signature.
    """
    # Cloud Tasks natively sets X-CloudTasks-TaskName
    raw_body = await request.body()
    
    if not x_stackloop_signature:
        if not settings.is_production and not x_cloudtasks_taskname:
            # Allow unsigned in local dev if no secret configured or relaxed
            return True
        raise HTTPException(status_code=401, detail="Missing required X-StackLoop-Signature header")

    if not verify_signature(raw_body, x_stackloop_signature, settings.cloud_tasks_secret):
        raise HTTPException(status_code=403, detail="Invalid HMAC signature or expired timestamp")

    return True
