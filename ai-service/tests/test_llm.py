"""
Tests para el LLM processor.
"""
import pytest
from app.core.llm_processor import procesar_con_ia, extraer_json_del_llm

def test_procesar_con_ia_mock():
    """Verifica que procesar_con_ia retorna un objeto válido."""
    orden = procesar_con_ia("Quiero 2 mexas dobles")
    assert orden.estado_pedido in ["EN_PROCESO", "COMPLETO"]
    assert len(orden.items) > 0

def test_extraer_json_del_llm_markdown():
    """Verifica la extracción de JSON desde markdown."""
    respuesta_llm = """
    Entendido, aquí está el pedido:
    ```json
    {"estado_pedido": "COMPLETO", "items": []}
    ```
    """
    json_data = extraer_json_del_llm(respuesta_llm)
    assert json_data["estado_pedido"] == "COMPLETO"

def test_extraer_json_del_llm_directo():
    """Verifica la extracción de JSON directo."""
    respuesta_llm = '{"estado_pedido": "EN_PROCESO", "items": []}'
    json_data = extraer_json_del_llm(respuesta_llm)
    assert json_data["estado_pedido"] == "EN_PROCESO"
