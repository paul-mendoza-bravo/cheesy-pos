# 🍔 CONTEXTO MAESTRO DE PROYECTO: Integración WhatsApp AI a Cheesy POS

## 📌 Resumen del Proyecto
Cheesy POS es una aplicación full-stack ya en producción (Frontend en Vercel, Backend Node Express en Render, Postgres en Supabase/Render) que maneja el flujo operativo: `Tomar orden → Cocina → Repartidor → BI`.

El microservicio **`ai-service`** (FastAPI, puerto `:8000`) automatiza el módulo "Tomar orden" desde WhatsApp:
1. Recibe el mensaje del cliente vía WhatsApp Cloud API.
2. Lo pasa por un LLM con _system prompt_ estricto que devuelve la orden estructurada en JSON.
3. Valida y **recostea** los precios contra el catálogo canónico (`menu_definitions.py`).
4. **Delega la persistencia al backend Node** mediante `POST /api/orders` — el Node es el único dueño de la BD, los eventos `socket.io` y la deducción de inventario (BOM).

El `ai-service` **NO** habla con Supabase ni con Postgres directamente. Esa decisión evita duplicar la lógica de negocio (BOM, deducción de stock, eventos, BI) que ya vive en el Node.

## 🛠️ Tech Stack del Microservicio
*   **Lenguaje:** Python 3.10+
*   **Framework Web:** FastAPI
*   **Persistencia:** `httpx` async → `POST /api/orders` al backend Node Express (`:3001`).
*   **IA / LLM:** Anthropic Claude o OpenAI, con System Prompt estricto que fuerza salida JSON. _Hoy mockeado en `llm_processor.py` — pendiente conectar SDK real._
*   **Audio Local:** Eliminado. Las alertas sonoras las dispara el frontend en Vercel al recibir el evento `nuevo_pedido` por `socket.io` desde el Node.

## 🍔 Reglas del Negocio y Menú (CRÍTICO PARA EL LLM)
El LLM debe mapear el texto informal del cliente **estrictamente** a estos elementos. Esta es la **fuente de verdad** del catálogo (también vive en [`ai-service/app/core/menu_definitions.py`](../ai-service/app/core/menu_definitions.py)):

### Hamburguesas Base
| Producto | Precio venta | COGS |
|---|---|---|
| Clásica | $75 | $47.19 |
| BBQ | $85 | $57.19 |
| Hawaiana | $85 | $55.19 |
| Mexa | $90 | $55.32 |

### Modificadores
| Modificador | Precio extra | COGS extra | Aplica a |
|---|---|---|---|
| Doble carne | +$30 | +$18.00 | Hamburguesas |

### Complementos
| Producto | Precio venta | COGS |
|---|---|---|
| Papas Sencillas | $40 | $20.00 |
| Papas Especiales | $60 | $40.00 |

### Bebidas
| Producto | Precio venta | COGS |
|---|---|---|
| Agua de Jamaica | $20 | $0.00 |
| Agua de Horchata | $20 | $0.00 |

### Upselling
Si el pedido está completo pero falta bebida, sugerir **Agua de Jamaica** o **Agua de Horchata** UNA SOLA VEZ. Si el cliente la rechaza, no insistir.

## 🗄️ Esquema de Persistencia (gestionado por el Node, no por el ai-service)

El `ai-service` arma este payload y lo envía a `POST /api/orders` del Node:

```jsonc
{
  "id": "WA-XXXXXXXXXX",                    // generado en database.generar_id_orden()
  "customerName": "WhatsApp · 9488",        // últimos 4 dígitos del teléfono
  "customerPhone": "5215512345678",
  "total": 300.0,                            // recosteado por order_calculator
  "status": "PENDING",
  "items": [
    {
      "id": "PROD-MEXA",
      "productId": "PROD-MEXA",
      "name": "Mexa",
      "quantity": 2,
      "price": 120,                          // Mexa $90 + Doble $30
      "unitPrice": 120,
      "modifiers": [
        { "id": "MOD-DOBLE", "name": "Doble carne", "priceDelta": 30 }
      ]
    }
  ],
  "cajeroId": "WHATSAPP_BOT",                // identifica órdenes automatizadas
  "deliveryLink": "Centro"
}
```

El Node se encarga de:
- INSERT transaccional en `orders / order_items / order_events`.
- `socket.io emit('nuevo_pedido')` al room `staff` → la cocina ve el ticket.
- Deducción de inventario (BOM) cuando la orden pase a `DELIVERED`.

## 🚀 Estado del Proyecto

| Tarea | Estado |
|---|---|
| Estructura FastAPI (`main.py`, schemas Pydantic, routers) | ✅ Hecho |
| Bridge HTTP al Node (`POST /api/orders`) | ✅ Hecho |
| Webhook `/webhook/cheesy-pos` | ✅ Hecho |
| Recosteo determinista contra `menu_definitions.py` | ✅ Hecho |
| Endpoints `/dashboard/*` (FCF, break-even, costos fijos) | ✅ Hecho |
| Conectar LLM real (Claude / OpenAI) | ⏳ Pendiente — hoy mockeado |
| Verify-token `GET /webhook/cheesy-pos` para Meta | ⏳ Pendiente |
| Idempotencia por `message_id` de Meta | ⏳ Pendiente |
| Sesiones persistentes (Redis o Postgres vía Node) | ⏳ Pendiente — hoy in-memory |
| Catálogo único (mover `MENU` a la BD del Node) | ⏳ Pendiente |
| Reintento / cola si el Node está caído | ⏳ Pendiente |

## 📚 Documentación relacionada
- [README principal](../README.md) — visión general del POS completo.
- [AI_SERVICE.md](AI_SERVICE.md) — arquitectura interna del microservicio.
- [INTEGRACION_MERGE.md](INTEGRACION_MERGE.md) — contrato HTTP con el Node, deploy, checklist.
