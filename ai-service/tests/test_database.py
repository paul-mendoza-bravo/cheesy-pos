"""
Tests para la inyección en Supabase.
"""
import pytest
from app.models.schemas import OrdenExtraida, ItemPedido
from app.core.database import generar_id_orden

def test_generar_id_orden():
    """Verifica que se genera un ID válido."""
    id1 = generar_id_orden()
    id2 = generar_id_orden()
    assert len(id1) == 12
    assert id1 != id2

def test_inyectar_orden_mock():
    """Mock test (sin conectar a Supabase real)."""
    # Este test requeriría variables de entorno de Supabase configuradas
    # Por ahora, solo verificamos que la función existe
    from app.core.database import inyectar_orden_en_supabase
    assert callable(inyectar_orden_en_supabase)
