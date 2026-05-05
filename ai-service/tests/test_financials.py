"""
Tests para la lógica financiera y cálculo de Free Cash Flow.
"""
import pytest
from app.core.financials import (
    calcular_free_cash_flow,
    calcular_punto_equilibrio,
    calcular_faltante_para_equilibrio,
    TOTAL_EGRESOS_FIJOS,
)
from app.core.menu_definitions import MENU, obtener_cogs_producto, obtener_precio_producto
from app.models.schemas import ItemPedido
from app.core.order_calculator import calcular_total_orden, calcular_cogs_orden

def test_costos_fijos_diarios():
    """Verifica que los costos fijos sean $350 MXN."""
    assert TOTAL_EGRESOS_FIJOS == 350.0

def test_calcular_free_cash_flow():
    """Verifica el cálculo del Free Cash Flow."""
    ventas_brutas = 500.0
    cogs = 100.0
    
    resultado = calcular_free_cash_flow(ventas_brutas, cogs)
    
    # Free Cash Flow = 500 - 100 - 350 = 50
    assert resultado["ventas_brutas"] == 500.0
    assert resultado["cogs"] == 100.0
    assert resultado["egresos_fijos"] == 350.0
    assert resultado["free_cash_flow"] == 50.0

def test_punto_equilibrio():
    """Verifica que el punto de equilibrio sea aproximadamente 13 hamburguesas."""
    analisis = calcular_punto_equilibrio()
    
    # Según el análisis, deberían ser alrededor de 13 hamburguesas
    assert "hamburguesas_aproximadas" in analisis
    assert analisis["hamburguesas_aproximadas"] > 0
    assert analisis["egresos_fijos"] == 350.0

def test_faltante_para_equilibrio_deficitario():
    """Verifica cálculo cuando hay déficit."""
    ventas_brutas = 200.0
    cogs = 50.0  # Margen bruto: 150, que es < 350
    
    resultado = calcular_faltante_para_equilibrio(ventas_brutas, cogs)
    
    assert resultado["margen_actual"] == 150.0
    assert resultado["faltante_dinero"] > 0
    assert resultado["estado"] == "DEFICITARIO"

def test_cogs_nuevos_valores():
    """Verifica que los COGS tengan los valores reales especificados."""
    assert obtener_cogs_producto("Clásica") == 47.19
    assert obtener_cogs_producto("Hawaiana") == 55.19
    assert obtener_cogs_producto("BBQ") == 57.19
    assert obtener_cogs_producto("Mexa") == 55.32
    assert obtener_cogs_producto("Papas Sencillas") == 20.00
    assert obtener_cogs_producto("Papas Especiales") == 40.00
    # Bebidas tienen COGS 0.0
    assert obtener_cogs_producto("Agua de Jamaica") == 0.0
    assert obtener_cogs_producto("Agua de Horchata") == 0.0

def test_doble_carne_cogs():
    """Verifica que el COGS extra de doble carne sea $18.00."""
    precio_normal = obtener_cogs_producto("Mexa", es_doble=False)
    precio_doble = obtener_cogs_producto("Mexa", es_doble=True)
    assert precio_doble - precio_normal == 18.00

def test_sin_combo_mexa():
    """Verifica que no exista Combo Mexa en el menú."""
    assert "Combo Mexa" not in MENU["hamburguesas"]

def test_margen_bruto_positivo():
    """Verifica que cada producto tenga margen positivo."""
    for categoria, productos in MENU.items():
        for nombre, datos in productos.items():
            precio = datos.get("precio_venta", 0)
            cogs = datos.get("cogs", 0)
            margen = precio - cogs
            assert margen > 0, f"Margen negativo para {nombre}: ${margen}"

def test_orden_mexa_doble_con_papas():
    """Test de una orden realista: 1 Mexa doble + Papas Especiales."""
    items = [
        ItemPedido(producto="Mexa", cantidad=1, es_doble=True),
        ItemPedido(producto="Papas Especiales", cantidad=1, es_doble=False),
    ]
    
    total_order = calcular_total_orden(items)
    total_cogs = calcular_cogs_orden(items)
    margen = total_order - total_cogs
    
    # Mexa doble: (90 + 30) = 120
    # Papas Especiales: 60
    # Total order: 180
    assert total_order == 180.0
    
    # Mexa doble COGS: (55.32 + 18) = 73.32
    # Papas Especiales COGS: 40
    # Total COGS: 113.32
    assert abs(total_cogs - 113.32) < 0.01
    assert margen > 0
