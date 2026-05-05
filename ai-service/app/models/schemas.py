"""
Esquemas Pydantic para validación de datos de entrada y salida.
"""
from pydantic import BaseModel, Field
from typing import List, Optional

class ItemPedido(BaseModel):
    """Representa un item dentro de una orden."""
    producto: str = Field(
        ..., 
        description="Nombre del producto: Clásica, BBQ, Hawaiana, Mexa, etc."
    )
    cantidad: int = Field(..., gt=0, description="Cantidad (debe ser > 0)")
    es_doble: bool = Field(
        default=False, 
        description="¿Es doble carne? (solo para hamburguesas)"
    )
    notas: Optional[str] = Field(
        default="Sin notas",
        description="Notas especiales: 'sin cebolla', 'extra mayonesa', etc."
    )

class OrdenExtraida(BaseModel):
    """Orden estructurada extraída por el LLM."""
    estado_pedido: str = Field(
        ...,
        description="'EN_PROCESO' o 'COMPLETO'"
    )
    respuesta_bot: str = Field(
        ...,
        description="Mensaje amigable para enviar al cliente por WhatsApp"
    )
    items: List[ItemPedido] = Field(
        ...,
        description="Lista de items en la orden"
    )
    direccion: Optional[str] = Field(
        default=None,
        description="Dirección de entrega (opcional para EN_PROCESO)"
    )
    total_order: Optional[float] = Field(
        default=None,
        description="Precio de venta total (calculado por el backend)"
    )
    total_cogs: Optional[float] = Field(
        default=None,
        description="Costo de ingredientes total (calculado por el backend)"
    )

class IncomingMessage(BaseModel):
    """Mensaje que llega desde WhatsApp o testing."""
    mensaje_cliente: str = Field(
        ...,
        description="Texto del cliente"
    )
    numero_telefono: str = Field(
        ...,
        description="Número de WhatsApp (con código de país)"
    )

class WebhookResponse(BaseModel):
    """Respuesta de la API después de procesar el webhook."""
    status: str
    accion: str
    numero: str
    mensaje_para_enviar: str
    datos_pos: dict
    order_id: Optional[str] = None
