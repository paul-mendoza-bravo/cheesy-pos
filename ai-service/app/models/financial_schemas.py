"""
Esquemas financieros para el dashboard y la base de datos.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class CashOutflowDetail(BaseModel):
    """Detalle de un egreso (concepto individual)."""
    cargo: str = Field(..., description="Nombre del cargo (ej: Parrillero)")
    monto: float = Field(..., description="Monto del egreso")

class CashOutflowRecord(BaseModel):
    """Registro de egresos (cash_outflows en BD)."""
    id: Optional[str] = None
    turno_date: datetime = Field(default_factory=datetime.utcnow)
    concepto: str = Field(..., description="Concepto general del egreso")
    detalles: List[CashOutflowDetail] = Field(..., description="Detalles por cargo")
    monto_total: float = Field(..., description="Total de egresos")
    usuario_registrador: str = Field(default="SUPERADMIN")
    descripcion: Optional[str] = None

class FinancialSummary(BaseModel):
    """Resumen financiero de un turno."""
    ventas_brutas: float
    cogs: float
    margen_bruto: float
    egresos_fijos: float
    otros_egresos: float = 0.0
    free_cash_flow: float
    porcentaje_margen: float

class BreakEvenAnalysis(BaseModel):
    """Análisis de punto de equilibrio."""
    egresos_fijos: float
    margen_promedio_por_orden: float
    ordenes_necesarias_exactas: float
    hamburguesas_aproximadas: int
    mensaje: str

class EquilibriumStatus(BaseModel):
    """Estado actual respecto al punto de equilibrio."""
    margen_actual: float
    margen_necesario: float
    faltante_dinero: float
    faltante_hamburguesas: float
    estado: str  # "DEFICITARIO" | "PUNTO_EQUILIBRIO" | "RENTABLE"
    mensaje_estado: str

class DashboardFinancialView(BaseModel):
    """Vista financiera completa para el dashboard del SUPERADMIN."""
    resumen_turno: FinancialSummary
    punto_equilibrio: BreakEvenAnalysis
    status_actual: EquilibriumStatus
    ordenes_completadas: int
    ingresos_totales: float
