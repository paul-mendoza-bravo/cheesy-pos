"""
Tests para el webhook.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Verifica que el endpoint /health funciona."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_webhook_basico():
    """Prueba básica del webhook con un payload."""
    payload = {
        "mensaje_cliente": "Quiero 2 mexas",
        "numero_telefono": "5255123456789"
    }
    response = client.post("/webhook/cheesy-pos", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
