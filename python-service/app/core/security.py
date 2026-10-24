from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer()

def verify_internal_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not settings.PYTHON_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service authentication is not configured.",
        )
    if credentials.credentials != settings.PYTHON_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or unauthorized internal service token.",
        )
    return credentials.credentials
