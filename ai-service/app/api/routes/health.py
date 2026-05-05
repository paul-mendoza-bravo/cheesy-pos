"""
Health check endpoint para monitoreo.
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    """Endpoint para verificar que el servicio está vivo."""
    return {
        "status": "ok",
        "service": "Cheesy POS API",
        "version": "0.1.0"
    }
