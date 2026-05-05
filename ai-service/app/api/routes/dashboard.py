"""
Endpoints del Dashboard Financiero para el SUPERADMIN.
"""
from fastapi import APIRouter, HTTPException
from app.core.financials import (
    calcular_free_cash_flow,
    calcular_punto_equilibrio,
    calcular_faltante_para_equilibrio,
    generar_registro_egresos_diarios,
    TOTAL_EGRESOS_FIJOS
)
from app.models.financial_schemas import (
    FinancialSummary,
    BreakEvenAnalysis,
    EquilibriumStatus,
    DashboardFinancialView
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/financial-summary", response_model=dict, summary="Resumen financiero del turno")
async def obtener_resumen_financiero(
    ventas_brutas: float,
    cogs_total: float,
    egresos_adicionales: float = 0.0
):
    """
    Calcula el resumen financiero completo del turno.
    
    Query params:
    - ventas_brutas: Total de ventas del turno
    - cogs_total: Costo de ingredientes
    - egresos_adicionales: Otros gastos operativos (opcional)
    """
    try:
        resumen = calcular_free_cash_flow(
            ventas_brutas_turno=ventas_brutas,
            cogs_total_turno=cogs_total,
            egresos_operativos_adicionales=egresos_adicionales
        )
        return resumen
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error calculando resumen: {str(e)}")

@router.get("/break-even", response_model=dict, summary="Análisis de punto de equilibrio")
async def obtener_punto_equilibrio():
    """
    Retorna el punto de equilibrio: cuántas órdenes/hamburguesas se necesitan
    para cubrir los $350 MXN de egresos fijos diarios.
    """
    try:
        analisis = calcular_punto_equilibrio()
        return analisis
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error calculando punto de equilibrio: {str(e)}")

@router.get("/equilibrium-status", response_model=dict, summary="Estado respecto al equilibrio")
async def obtener_status_equilibrio(
    ventas_brutas: float,
    cogs_total: float
):
    """
    Retorna cuánto falta (dinero o hamburguesas) para cubrir los egresos fijos.
    
    Query params:
    - ventas_brutas: Total de ventas hasta ahora
    - cogs_total: Costo de ingredientes hasta ahora
    """
    try:
        status = calcular_faltante_para_equilibrio(
            ventas_brutas_turno=ventas_brutas,
            cogs_total_turno=cogs_total
        )
        return status
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error calculando status: {str(e)}")

@router.get("/costos-fijos", response_model=dict, summary="Detalles de costos fijos diarios")
async def obtener_costos_fijos():
    """
    Retorna el desglose de costos fijos (nómina operativa diaria).
    """
    return generar_registro_egresos_diarios()

@router.get("/health-check", response_model=dict, summary="Health check financiero")
async def health_check_financiero():
    """
    Verifica que el módulo financiero esté operativo.
    """
    return {
        "status": "ok",
        "modulo": "Financials",
        "egresos_fijos_diarios": TOTAL_EGRESOS_FIJOS,
        "detalle": "Sistema de cálculo financiero operativo"
    }
