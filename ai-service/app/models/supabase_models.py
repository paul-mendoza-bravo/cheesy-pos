"""
Modelos para mapear directamente a Supabase.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderRow(BaseModel):
    """Fila de la tabla 'orders' en Supabase."""
    id: str
    customer_name: str
    status: str  # CHECK constraint: PENDING, EN_COCINA, ENTREGADO
    total: float
    cajero_id: str
    created_at: str

class OrderItemRow(BaseModel):
    """Fila de la tabla 'order_items' en Supabase."""
    order_id: str
    product_id: str
    name: str
    quantity: int
    price: float
    modifiers: str  # JSON string

class OrderEventRow(BaseModel):
    """Fila de la tabla 'order_events' en Supabase."""
    order_id: str
    estado: str
    usuario_id: str
    created_at: str
