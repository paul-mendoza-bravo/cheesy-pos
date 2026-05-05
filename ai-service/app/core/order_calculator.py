"""
Calculador de órdenes: valida cantidades, suma precios, genera totales.
Este módulo NUNCA confía en lo que dice el LLM sobre precios.
"""
from typing import List, Tuple
from app.models.schemas import ItemPedido
from app.core.menu_definitions import obtener_precio_producto, obtener_cogs_producto

def calcular_total_orden(items: List[ItemPedido]) -> float:
    """Calcula el total de venta exacto de la orden sumando item por item."""
    total = 0.0
    for item in items:
        precio_unitario = obtener_precio_producto(item.producto, item.es_doble)
        total += precio_unitario * item.cantidad
    return total

def calcular_cogs_orden(items: List[ItemPedido]) -> float:
    """Calcula el costo total de ingredientes (COGS) de la orden."""
    cogs_total = 0.0
    for item in items:
        cogs_unitario = obtener_cogs_producto(item.producto, item.es_doble)
        cogs_total += cogs_unitario * item.cantidad
    return cogs_total

def calcular_metricas_financieras_orden(items: List[ItemPedido]) -> dict:
    """
    Calcula todas las métricas financieras de una orden:
    - total_order: Precio de venta al público
    - total_cogs: Costo de ingredientes
    - ganancia_bruta: Utilidad bruta (total_order - total_cogs)
    - porcentaje_margen: Margen como porcentaje
    """
    total_order = calcular_total_orden(items)
    total_cogs = calcular_cogs_orden(items)
    ganancia_bruta = total_order - total_cogs
    porcentaje_margen = (ganancia_bruta / total_order * 100) if total_order > 0 else 0
    
    return {
        "total_order": total_order,
        "total_cogs": total_cogs,
        "ganancia_bruta": ganancia_bruta,
        "porcentaje_margen": porcentaje_margen
    }

def validar_orden(items: List[ItemPedido]) -> tuple[bool, str]:
    """
    Valida que la orden tenga sentido:
    - Al menos 1 item
    - Cantidades > 0
    - Productos existentes
    """
    if not items or len(items) == 0:
        return False, "La orden debe tener al menos 1 producto."
    
    for item in items:
        if item.cantidad <= 0:
            return False, f"Cantidad inválida para '{item.producto}': debe ser mayor a 0."
        
        try:
            obtener_precio_producto(item.producto, item.es_doble)
        except ValueError as e:
            return False, str(e)
    
    return True, "Orden válida."

def generar_resumen_orden(items: List[ItemPedido]) -> str:
    """Genera un resumen amigable de la orden para mostrar al cliente."""
    metricas = calcular_metricas_financieras_orden(items)
    
    resumen = "📋 **Resumen de tu orden:**\n"
    for item in items:
        precio_unit = obtener_precio_producto(item.producto, item.es_doble)
        subtotal = precio_unit * item.cantidad
        doble_str = " (Doble)" if item.es_doble else ""
        resumen += f"• {item.cantidad}x {item.producto}{doble_str}: ${subtotal}\n"
    
    resumen += f"\n💰 **Total: ${metricas['total_order']:.2f}**"
    return resumen
