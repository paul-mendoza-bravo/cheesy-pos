"""
Financials: Lógica de cálculo del Free Cash Flow, costos fijos, punto de equilibrio.
"""
from typing import List, Dict, Optional
from app.models.schemas import ItemPedido
from app.core.order_calculator import calcular_total_orden, calcular_cogs_orden, calcular_metricas_financieras_orden
from app.core.menu_definitions import obtener_cogs_producto

# ==========================================
# COSTOS FIJOS DIARIOS (NÓMINA OPERATIVA)
# ==========================================
COSTOS_FIJOS_DIARIOS = {
    "parrillero_jeremy": 150.00,      # Jeremy: $150 MXN por turno
    "repartidor_sebastian": 200.00,   # Sebastián: $200 MXN por turno
}

TOTAL_EGRESOS_FIJOS = sum(COSTOS_FIJOS_DIARIOS.values())  # $350 MXN

# ==========================================
# NOTA: Los COGS por producto están centralizados en menu_definitions.py
# ==========================================

def calcular_margen_bruto_orden(items: List[ItemPedido]) -> Dict[str, float]:
    """
    Calcula el margen bruto de una orden.
    Retorna: {ventas_brutas, cogs, margen_bruto, porcentaje_margen}
    """
    return calcular_metricas_financieras_orden(items)

# ==========================================
# FREE CASH FLOW (Utilidad Neta del Turno)
# ==========================================
def calcular_free_cash_flow(
    ventas_brutas_turno: float,
    cogs_total_turno: float,
    egresos_operativos_adicionales: float = 0.0
) -> Dict[str, float]:
    """
    Calcula el Free Cash Flow (Utilidad Neta) del turno.
    
    Fórmula:
    Free Cash Flow = Ventas Brutas - COGS - Egresos Fijos ($350) - Otros Egresos
    
    Args:
        ventas_brutas_turno: Total de ventas del turno
        cogs_total_turno: Costo de ingredientes totales
        egresos_operativos_adicionales: Otros egresos (no nómina)
    
    Returns:
        {
            "ventas_brutas": ...,
            "cogs": ...,
            "margen_bruto": ...,
            "egresos_fijos": 350.00,
            "otros_egresos": ...,
            "free_cash_flow": ...
        }
    """
    margen_bruto = ventas_brutas_turno - cogs_total_turno
    egresos_totales = TOTAL_EGRESOS_FIJOS + egresos_operativos_adicionales
    free_cash_flow = margen_bruto - egresos_totales
    
    return {
        "ventas_brutas": ventas_brutas_turno,
        "cogs": cogs_total_turno,
        "margen_bruto": margen_bruto,
        "egresos_fijos": TOTAL_EGRESOS_FIJOS,
        "detalles_egresos_fijos": COSTOS_FIJOS_DIARIOS,
        "otros_egresos": egresos_operativos_adicionales,
        "egresos_totales": egresos_totales,
        "free_cash_flow": free_cash_flow,
        "porcentaje_margen": (margen_bruto / ventas_brutas_turno * 100) if ventas_brutas_turno > 0 else 0
    }

# ==========================================
# PUNTO DE EQUILIBRIO (Break-Even)
# ==========================================
def calcular_punto_equilibrio() -> Dict[str, any]:
    """
    Calcula el punto de equilibrio: cuántas órdenes/hamburguesas se necesitan
    para cubrir los egresos fijos diarios.
    
    Returns:
        {
            "egresos_fijos": 350.00,
            "margen_promedio_orden": ...,
            "ordenes_necesarias": ...,
            "hamburguesas_aproximadas": ...
        }
    """
    # Estimamos un margen promedio por orden
    # Asumimos una orden promedio: 1 hamburguesa + 1 bebida
    estimacion_orden_promedio = [
        ItemPedido(producto="Mexa", cantidad=1, es_doble=False, notas="Sin notas"),
        ItemPedido(producto="Agua de Jamaica", cantidad=1, es_doble=False, notas="Sin notas")
    ]
    
    margen_orden_promedio = calcular_margen_bruto_orden(estimacion_orden_promedio)["margen_bruto"]
    
    if margen_orden_promedio <= 0:
        return {
            "error": "No hay margen positivo para cubrir egresos",
            "egresos_fijos": TOTAL_EGRESOS_FIJOS
        }
    
    ordenes_necesarias = TOTAL_EGRESOS_FIJOS / margen_orden_promedio
    # Aproximamos: 1 hamburguesa = 1 orden (para simplificar)
    hamburguesas_aproximadas = round(ordenes_necesarias)
    
    return {
        "egresos_fijos": TOTAL_EGRESOS_FIJOS,
        "margen_promedio_por_orden": margen_orden_promedio,
        "ordenes_necesarias_exactas": ordenes_necesarias,
        "ordenes_necesarias_redondeadas": round(ordenes_necesarias, 1),
        "hamburguesas_aproximadas": hamburguesas_aproximadas,
        "mensaje": f"Se necesitan aproximadamente {hamburguesas_aproximadas} hamburguesas (o {round(ordenes_necesarias)} órdenes) para cubrir los egresos de ${TOTAL_EGRESOS_FIJOS:.2f} MXN."
    }

def calcular_faltante_para_equilibrio(
    ventas_brutas_turno: float,
    cogs_total_turno: float
) -> Dict[str, any]:
    """
    Calcula cuántas hamburguesas/dinero falta para llegar al punto de equilibrio.
    
    Returns:
        {
            "margen_actual": ...,
            "margen_necesario": 350.00,
            "faltante_dinero": ...,
            "faltante_hamburguesas": ...,
            "estado": "DEFICITARIO" | "PUNTO_EQUILIBRIO" | "RENTABLE"
        }
    """
    margen_actual = ventas_brutas_turno - cogs_total_turno
    faltante_dinero = TOTAL_EGRESOS_FIJOS - margen_actual
    
    # Estimamos el margen promedio por hamburguesa
    menu_item = ItemPedido(producto="Mexa", cantidad=1, es_doble=False)
    margen_promedio_item = calcular_margen_bruto_orden([menu_item])["margen_bruto"]
    
    if margen_promedio_item > 0:
        faltante_hamburguesas = max(0, faltante_dinero / margen_promedio_item)
    else:
        faltante_hamburguesas = float('inf')
    
    # Determinar estado
    if margen_actual < TOTAL_EGRESOS_FIJOS:
        estado = "DEFICITARIO"
    elif abs(margen_actual - TOTAL_EGRESOS_FIJOS) < 5:  # Dentro de $5 de margen
        estado = "PUNTO_EQUILIBRIO"
    else:
        estado = "RENTABLE"
    
    return {
        "margen_actual": margen_actual,
        "margen_necesario": TOTAL_EGRESOS_FIJOS,
        "faltante_dinero": max(0, faltante_dinero),
        "faltante_hamburguesas": max(0, round(faltante_hamburguesas, 1)),
        "estado": estado,
        "mensaje_estado": f"Faltan ${max(0, faltante_dinero):.2f} MXN o aprox. {max(0, round(faltante_hamburguesas, 1))} hamburguesas más para cubrir los egresos."
    }

# ==========================================
# MODELOS PARA LA BD: CASH OUTFLOWS
# ==========================================
def generar_registro_egresos_diarios() -> Dict:
    """
    Genera el registro de egresos fijos del día para la tabla `cash_outflows`.
    """
    return {
        "concepto": "NÓMINA OPERATIVA DIARIA",
        "detalles": [
            {"cargo": "Parrillero (Jeremy)", "monto": COSTOS_FIJOS_DIARIOS["parrillero_jeremy"]},
            {"cargo": "Repartidor (Sebastián)", "monto": COSTOS_FIJOS_DIARIOS["repartidor_sebastian"]}
        ],
        "monto_total": TOTAL_EGRESOS_FIJOS,
        "usuario_registrador": "SUPERADMIN",
        "descripcion": "Costos fijos de nómina operativa del turno"
    }
