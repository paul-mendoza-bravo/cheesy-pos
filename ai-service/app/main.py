"""
main.py: Punto de entrada de la aplicación FastAPI.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import webhook, health, dashboard
from app.config import DEBUG

app = FastAPI(
    title="Cheesy POS API",
    description="Microservicio de integración WhatsApp + IA para Cheeseburguers",
    version="0.1.0"
)

# ==========================================
# MIDDLEWARE: CORS
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if DEBUG else ["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# RUTAS
# ==========================================
app.include_router(health.router)
app.include_router(webhook.router)
app.include_router(dashboard.router)

@app.get("/")
async def root():
    """Endpoint raíz."""
    return {
        "mensaje": "🍔 Bienvenido a Cheesy POS API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG
    )
