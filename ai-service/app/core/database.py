"""
Database bridge: en lugar de insertar en Supabase directamente,
delegamos al backend Node (Express) que ya hace:
  - INSERT transaccional en orders/order_items/order_events
  - emit('nuevo_pedido') por socket.io al room 'staff' (frontend lo escucha)
  - deducción de inventario en DELIVERED

Esto evita duplicar lógica y mantiene el frontend reactivo sin cambios.
"""
import os
import httpx
from typing import Optional
from uuid import uuid4
from app.models.schemas import OrdenExtraida
from app.core.menu_definitions import obtener_precio_producto
from app.utils.logger import get_logger

logger = get_logger()

NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:3001")
NODE_API_TIMEOUT = float(os.getenv("NODE_API_TIMEOUT", "10.0"))


def generar_id_orden() -> str:
    """ID corto para orders.id (VARCHAR 100). Prefijo WA = WhatsApp."""
    return f"WA-{uuid4().hex[:10].upper()}"


def _construir_payload_node(orden: OrdenExtraida, numero_telefonico: str, order_id: str) -> dict:
    """
    Mapea OrdenExtraida → payload que espera POST /api/orders del Node.
    El Node espera: { id, customerName, customerPhone, total, status, items, cajeroId, deliveryLink }
    Cada item: { id, name, quantity, price, modifiers: [...] }
    """
    items_payload = []
    for item in orden.items:
        precio = obtener_precio_producto(item.producto, item.es_doble)
        modifiers = []
        if item.es_doble:
            modifiers.append({"id": "MOD-DOBLE", "name": "Doble carne", "priceDelta": 30})
        if item.notas and item.notas.lower() not in ("sin notas", "", "none"):
            modifiers.append({"id": "MOD-NOTA", "name": item.notas})

        product_id = f"PROD-{item.producto.upper().replace(' ', '_')}"
        items_payload.append({
            "id": product_id,
            "productId": product_id,
            "name": item.producto,
            "quantity": item.cantidad,
            "price": precio,
            "unitPrice": precio,
            "modifiers": modifiers,
        })

    return {
        "id": order_id,
        "customerName": f"WhatsApp · {numero_telefonico[-4:]}",
        "customerPhone": numero_telefonico,
        "total": orden.total_order or sum(i["price"] * i["quantity"] for i in items_payload),
        "status": "PENDING",
        "items": items_payload,
        "cajeroId": "WHATSAPP_BOT",
        "deliveryLink": orden.direccion or None,
    }


def inyectar_orden_en_supabase(
    orden: OrdenExtraida,
    numero_telefonico: str
) -> Optional[str]:
    """
    Nombre conservado por compatibilidad con webhook.py.
    Internamente delega al Node vía POST /api/orders, que se encarga de:
      - Persistir en orders/order_items/order_events (transaccional)
      - Emitir 'nuevo_pedido' por socket.io al frontend
    """
    order_id = generar_id_orden()
    payload = _construir_payload_node(orden, numero_telefonico, order_id)

    try:
        with httpx.Client(timeout=NODE_API_TIMEOUT) as client:
            resp = client.post(f"{NODE_API_URL}/api/orders", json=payload)

        if resp.status_code in (200, 201):
            logger.info(f"✅ Orden {order_id} creada en Node POS (status={resp.status_code})")
            return order_id

        logger.error(f"❌ Node POS rechazó la orden ({resp.status_code}): {resp.text[:300]}")
        return None

    except httpx.RequestError as e:
        logger.error(f"❌ No se pudo contactar al Node POS en {NODE_API_URL}: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Error inesperado enviando orden al Node POS: {e}", exc_info=True)
        return None
