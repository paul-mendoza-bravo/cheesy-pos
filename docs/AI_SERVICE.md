# 🍔 Cheesy POS — Microservicio de Toma de Órdenes vía WhatsApp + IA

Microservicio backend (FastAPI, puerto `:8000`) que automatiza el módulo "Tomar Orden" del **Cheesy POS**. Recibe mensajes de WhatsApp, los pasa por un LLM con _system prompt_ estricto para extraer la orden en JSON, valida y recalcula precios contra el catálogo canónico y **delega la persistencia al backend Node Express vía `POST /api/orders`** — el Node se encarga del INSERT transaccional en Postgres y del `socket.io emit('nuevo_pedido')` que el frontend en Vercel ya consume.

> ⚠️ **Arquitectura actual (autoritativa)**
> Este servicio **NO** habla con Supabase directamente. Todo se persiste pasando por el Node backend (`:3001`), que sigue siendo el único dueño de la BD, BOM, inventario y eventos en tiempo real. Versiones anteriores de esta doc describían inserción directa con `supabase-py` — ese flujo fue reemplazado.

---

## 1. Descripción general

**Qué hace:** convierte un mensaje de texto informal de WhatsApp (ej: _"mándame 2 mexas dobles y unas papas especiales al centro"_) en una orden estructurada, validada, costeada y enviada al backend Node como si fuera una orden del POS.

**Para qué sirve:**
- Eliminar la captura manual de órdenes durante horas pico.
- Centralizar el flujo `WhatsApp → IA → Node POS → Cocina (Socket.io) → BI` sin duplicar lógica.
- Calcular en línea **margen bruto, COGS y faltante para punto de equilibrio** ($350 MXN diarios de nómina fija) por orden y por turno.

**Lo que NO hace (a propósito):**
- No inserta en Postgres ni en Supabase. Llama al Node en `POST /api/orders`.
- No emite Socket.io ni reproduce audio. El Node ya emite `nuevo_pedido` y el frontend dispara las alertas.
- No descuenta inventario. El BOM y la deducción de stock viven en el Node.
- No reemplaza el POS principal — solo automatiza la captura.

---

## 2. Arquitectura del sistema

```
┌──────────────┐    ┌──────────────────────────────────────────────┐
│  WhatsApp    │    │              Microservicio FastAPI :8000     │
│  Cloud API   │──▶ │                                              │
│  (Meta)      │    │  ┌──────────┐   ┌──────────────────────┐    │
└──────────────┘    │  │ webhook  │──▶│  session_manager     │    │
       ▲            │  │  router  │   │  (in-memory, TTL30m) │    │
       │            │  └──────────┘   └──────────┬───────────┘    │
       │            │       │                    ▼                 │
       │            │       │         ┌──────────────────────┐    │
       │            │       │         │  llm_processor       │    │
       │            │       │         │  (Claude / OpenAI)   │    │
       │            │       │         └──────────┬───────────┘    │
       │            │       │                    ▼                 │
       │            │       │         ┌──────────────────────┐    │
       │            │       │         │  order_calculator    │    │
       │            │       │         │  (menu_definitions)  │ ← fuente de verdad de precios/COGS
       │            │       │         └──────────┬───────────┘    │
       │            │       │                    ▼                 │
       │            │       │         ┌──────────────────────┐    │
       │            │       │         │  database.py         │    │
       │            │       │         │  POST /api/orders ───┼────┼──┐
       │            │       │         └──────────┬───────────┘    │  │
       │            │       │                    ▼                 │  │
       │            │       │         ┌──────────────────────┐    │  │
       │            └───────┴─────────│ whatsapp_client      │    │  │
       │                              │ (BackgroundTask)     │    │  │
       └──────────────────────────────┴──────────────────────┘    │  │
                                                                   │  │
                              ┌────────────────────────────────────┘  │
                              ▼                                       │
                      ┌──────────────┐    ┌──────────────────┐       │
                      │  Backend     │──▶ │  PostgreSQL      │       │
                      │  Node :3001  │    │  (Supabase /     │       │
                      │              │    │   Render)        │       │
                      │  socket.io   │    └──────────────────┘       │
                      │  nuevo_pedido│                                │
                      └──────┬───────┘                                │
                             │                                        │
                             ▼                                        │
                      ┌──────────────┐                                │
                      │  Frontend    │                                │
                      │  Vercel      │ ◀──────────────────────────────┘
                      │  (Cocina UI) │
                      └──────────────┘
```

### Componentes principales

| Módulo | Responsabilidad |
|---|---|
| [app/main.py](../ai-service/app/main.py) | Bootstrap FastAPI, CORS, registro de routers. |
| [app/api/routes/webhook.py](../ai-service/app/api/routes/webhook.py) | Endpoint `POST /webhook/cheesy-pos`. Orquesta el pipeline completo. |
| [app/api/routes/dashboard.py](../ai-service/app/api/routes/dashboard.py) | Endpoints financieros (`/dashboard/*`) — cálculos derivados, sin BD. |
| [app/api/routes/health.py](../ai-service/app/api/routes/health.py) | `GET /health` para liveness. |
| [app/core/session_manager.py](../ai-service/app/core/session_manager.py) | Sesiones de chat por número telefónico, TTL 30 min, **in-memory**. |
| [app/core/llm_processor.py](../ai-service/app/core/llm_processor.py) | Llama al LLM con _system prompt_ estricto y parsea la salida JSON. **Hoy mockeado** — pendiente conectar SDK real. |
| [app/core/menu_definitions.py](../ai-service/app/core/menu_definitions.py) | Catálogo canónico (`MENU`) con `precio_venta` y `cogs` por producto. **Fuente de verdad local** — el LLM nunca pone precios. |
| [app/core/order_calculator.py](../ai-service/app/core/order_calculator.py) | Recalcula `total_order`, `total_cogs`, `ganancia_bruta`, `% margen`. Valida items contra el menú. |
| [app/core/financials.py](../ai-service/app/core/financials.py) | Free Cash Flow del turno, punto de equilibrio (~13 hamburguesas/día), faltante dinero/hamburguesas. |
| [app/core/database.py](../ai-service/app/core/database.py) | **Bridge HTTP al Node**: arma payload y hace `POST /api/orders`. No habla con Postgres. |
| [app/core/whatsapp_client.py](../ai-service/app/core/whatsapp_client.py) | Cliente HTTP async (`httpx`) para WhatsApp Cloud API de Meta. |
| [app/models/schemas.py](../ai-service/app/models/schemas.py) | `IncomingMessage`, `OrdenExtraida`, `ItemPedido`, `WebhookResponse`. |
| [app/models/financial_schemas.py](../ai-service/app/models/financial_schemas.py) | Schemas del dashboard (FinancialSummary, BreakEvenAnalysis, etc.). |

> El nombre histórico `inyectar_orden_en_supabase()` se conserva por compatibilidad pero internamente delega al Node. No toca Supabase.

---

## 3. Pipeline de procesamiento (flujo paso a paso)

El endpoint `POST /webhook/cheesy-pos` ejecuta exactamente esta secuencia:

1. **Recepción.** Meta envía el mensaje del cliente. FastAPI valida el payload contra `IncomingMessage` (`mensaje_cliente`, `numero_telefono`).
2. **Sesión.** [obtener_o_crear_sesion()](../ai-service/app/core/session_manager.py) recupera el historial reciente del `numero_telefono` (TTL 30 min, in-memory). Se le agrega el mensaje entrante con rol `user`.
3. **Inferencia LLM.** [procesar_con_ia()](../ai-service/app/core/llm_processor.py) envía el `system_prompt` + historial al modelo. La salida obligatoria es un JSON con la forma `OrdenExtraida`:
   - `estado_pedido`: `"EN_PROCESO"` (faltan datos / upselling) o `"COMPLETO"`.
   - `respuesta_bot`: texto natural para responder al cliente.
   - `items[]`: lista de `ItemPedido` (`producto`, `cantidad`, `es_doble`, `notas`).
   - `direccion`: opcional.
4. **Validación de catálogo.** [validar_orden()](../ai-service/app/core/order_calculator.py) revisa que cada `producto` exista en `MENU` y que `cantidad > 0`. Si falla, fuerza `estado_pedido="EN_PROCESO"` y reescribe `respuesta_bot` con el motivo.
5. **Recosteo determinista.** [calcular_metricas_financieras_orden()](../ai-service/app/core/order_calculator.py) calcula `total_order` y `total_cogs` desde [menu_definitions.py](../ai-service/app/core/menu_definitions.py) (incluye modificador `+$30 venta / +$18 COGS` si `es_doble=True`). El precio del LLM se descarta.
6. **Persistencia delegada al Node** (solo si `estado_pedido == "COMPLETO"`): [inyectar_orden_en_supabase()](../ai-service/app/core/database.py) genera un `order_id` (`WA-XXXXXXXXXX`) y hace `POST /api/orders` al Node con el payload mapeado al contrato del POS (`id`, `customerName`, `customerPhone`, `total`, `status`, `items[]`, `cajeroId="WHATSAPP_BOT"`, `deliveryLink`). El Node:
   - Persiste en `orders / order_items / order_events` de forma transaccional.
   - Emite `socket.io emit('nuevo_pedido')` al room `staff` → la cocina ve el ticket.
   - Programa la deducción de stock (BOM) cuando la orden pase a `DELIVERED`.
7. **Respuesta al cliente.** Un `BackgroundTasks` dispara [enviar_mensaje_whatsapp()](../ai-service/app/core/whatsapp_client.py) para no bloquear la respuesta HTTP. El cliente recibe `respuesta_bot` por WhatsApp.
8. **Limpieza.** Si la orden se completó, la sesión se vacía (`sesion.limpiar()`) para que el próximo mensaje del mismo número arranque limpio.

---

## 4. Integraciones actuales

| Servicio | Uso | Configuración |
|---|---|---|
| **Backend Node (Express :3001)** | Único punto de persistencia. Recibe `POST /api/orders` y emite `nuevo_pedido` por Socket.io. | `NODE_API_URL` (default `http://localhost:3001`, en Docker `http://backend:3001`), `NODE_API_TIMEOUT`. |
| **LLM (Anthropic Claude / OpenAI)** | Extracción JSON estricta del mensaje del cliente. **Hoy mockeado** en `llm_processor.py`. | `LLM_API_KEY`, `LLM_MODEL` (default `claude-3-5-sonnet-20241022`). |
| **WhatsApp Cloud API (Meta)** | Recepción del mensaje del cliente y envío de la respuesta del bot. | `WHATSAPP_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_VERIFY_TOKEN`. |
| **PostgreSQL (Supabase / Render)** | **No accesible directamente desde este servicio.** Solo el Node escribe. | — |

### Contrato del payload `POST /api/orders` (lo que arma `database.py`)

```jsonc
{
  "id": "WA-1A2B3C4D5E",
  "customerName": "WhatsApp · 9488",   // últimos 4 del teléfono
  "customerPhone": "5215512345678",
  "total": 300.0,                        // recosteado en este servicio
  "status": "PENDING",
  "items": [
    {
      "id": "PROD-MEXA",
      "productId": "PROD-MEXA",
      "name": "Mexa",
      "quantity": 2,
      "price": 120,                      // Mexa $90 + Doble $30
      "unitPrice": 120,
      "modifiers": [
        {"id": "MOD-DOBLE", "name": "Doble carne", "priceDelta": 30}
      ]
    }
  ],
  "cajeroId": "WHATSAPP_BOT",
  "deliveryLink": "Centro"
}
```

El Node es responsable del esquema final en BD; este servicio solo respeta el contrato HTTP.

---

## 5. Cómo se integra la API

### Endpoints expuestos

| Método | Ruta | Propósito |
|---|---|---|
| `GET` | `/` | Bienvenida + punteros a `/docs` y `/health`. |
| `GET` | `/health` | Liveness probe. |
| `POST` | `/webhook/cheesy-pos` | **Endpoint principal.** Procesa un mensaje entrante. |
| `GET` | `/dashboard/financial-summary` | Free Cash Flow del turno (query: `ventas_brutas`, `cogs_total`, `egresos_adicionales`). |
| `GET` | `/dashboard/break-even` | Punto de equilibrio (~13 hamburguesas para cubrir $350 MXN). |
| `GET` | `/dashboard/equilibrium-status` | Faltante dinero/hamburguesas y estado (`DEFICITARIO` / `PUNTO_EQUILIBRIO` / `RENTABLE`). |
| `GET` | `/dashboard/costos-fijos` | Desglose de nómina diaria. |
| `GET` | `/dashboard/health-check` | Liveness del módulo financiero. |

### Flujo request/response del webhook

**Request** (Meta o test manual):
```json
POST /webhook/cheesy-pos
Content-Type: application/json

{
  "mensaje_cliente": "Mándame 2 mexas dobles y unas papas especiales al centro",
  "numero_telefono": "5215512345678"
}
```

**Response 200** (orden completada):
```json
{
  "status": "success",
  "accion": "enviar_whatsapp",
  "numero": "5215512345678",
  "mensaje_para_enviar": "¡Anotado! Marchando 2 Mexas Dobles y Papas Especiales para el Centro.",
  "datos_pos": {
    "estado_pedido": "COMPLETO",
    "respuesta_bot": "...",
    "items": [
      {"producto": "Mexa", "cantidad": 2, "es_doble": true, "notas": "Sin notas"},
      {"producto": "Papas Especiales", "cantidad": 1, "es_doble": false, "notas": ""}
    ],
    "direccion": "Centro",
    "total_order": 300.0,
    "total_cogs": 186.64
  },
  "order_id": "WA-1A2B3C4D5E"
}
```

**Response 500** ante fallo del pipeline (LLM, validación, Node down). El error se loggea con `exc_info=True` en [webhook.py](../ai-service/app/api/routes/webhook.py).

### Configuración del webhook en Meta

En Meta Developers → WhatsApp Business → Configuration:
- **Callback URL:** `https://<tu-dominio>/webhook/cheesy-pos`
- **Verify token:** `WHATSAPP_VERIFY_TOKEN` del `.env` (handshake `GET` aún pendiente — ver §8).

---

## 6. Ejemplo de uso

### Test manual con `curl`

```bash
curl -X POST http://localhost:8000/webhook/cheesy-pos \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje_cliente": "Quiero una Mexa doble y un agua de jamaica",
    "numero_telefono": "5215512345678"
  }'
```

### Consultar el dashboard financiero a media jornada

```bash
curl "http://localhost:8000/dashboard/equilibrium-status?ventas_brutas=420&cogs_total=180"
# → { "margen_actual": 240, "faltante_dinero": 110, "estado": "DEFICITARIO", ... }
```

### Test desde Python

```python
import httpx

resp = httpx.post(
    "http://localhost:8000/webhook/cheesy-pos",
    json={"mensaje_cliente": "1 BBQ doble y papas especiales", "numero_telefono": "5215500000000"}
)
print(resp.json()["datos_pos"]["total_order"])
```

---

## 7. Instalación y ejecución

### Requisitos
- Python 3.10+
- Backend Node corriendo en `:3001` (mismo repo, carpeta `/backend`).
- Credenciales WhatsApp Business (Meta) — opcional para tests locales.
- API key de OpenAI o Anthropic — opcional mientras el LLM esté mockeado.

### Setup local (sin Docker)

```bash
# Levanta primero el Node POS
cd backend && npm install && npm run dev   # :3001

# En otra terminal, el ai-service
cd ai-service
python -m venv venv
# Linux/Mac:
source venv/bin/activate
# Windows PowerShell:
venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env   # editar con tus credenciales
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Docker (recomendado)

Desde la raíz del repo:

```bash
docker-compose up --build
```

[docker-compose.yml](../docker-compose.yml) levanta:
- `backend` (Node Express) en `:3001`.
- `ai-service` (FastAPI) en `:8000` con `NODE_API_URL=http://backend:3001`.

### Tests

```bash
cd ai-service
pytest tests/ -v
```

Cubre `test_database.py`, `test_financials.py`, `test_llm.py`, `test_webhook.py`.

---

## 8. Pendientes técnicos conocidos

| Área | Mejora propuesta | Motivación |
|---|---|---|
| **LLM real** | Reemplazar el mock de [llm_processor.py](../ai-service/app/core/llm_processor.py) por SDK de Anthropic (`claude-3-5-sonnet`) o OpenAI con _structured outputs_ / _tool use_. | Hoy el endpoint siempre devuelve la misma orden mockeada. |
| **Verificación de webhook Meta** | Implementar el handshake `GET /webhook/cheesy-pos?hub.mode=subscribe&hub.verify_token=...`. | Requerido por Meta para producción. |
| **Idempotencia** | Aceptar `message_id` de Meta y rechazar duplicados. | Meta reintenta webhooks; sin esto se duplican órdenes en cocina. |
| **Sesiones persistentes** | Mover `_chat_sessions` (in-memory) a Redis o tabla en Postgres. | Pierde estado al reiniciar el contenedor; impide escalar horizontalmente. |
| **Catálogo único** | Hoy `MENU` está hardcodeado en Python **y** existe un BOM en el Node. Mover el catálogo a la BD y exponerlo desde el Node (`GET /api/menu`); cachear en el ai-service. | Dos fuentes de verdad de precios → riesgo de desincronización. |
| **Limpieza de config zombi** | `SUPABASE_URL` / `SUPABASE_KEY` siguen en [config.py](../ai-service/app/config.py) pero no se usan. Quitar. | Confunde; sugiere dependencia que ya no existe. |
| **Reintentos al Node** | Si `POST /api/orders` falla por timeout, hoy se pierde. Agregar retry con backoff y/o cola persistente. | Una caída momentánea del Node descarta órdenes. |
| **Auth en `/dashboard/*`** | Proteger con JWT del POS principal. | Hoy son endpoints abiertos. |
| **Rate limiting** | Por número de teléfono y por IP. | Evita abuso del LLM (costo) y del WhatsApp API (rate limits de Meta). |
| **Observabilidad** | Estructurar logs (JSON), exponer métricas Prometheus, trazas OpenTelemetry. | Hoy solo `logger.info`. |

---

## 9. Stack técnico

- **FastAPI 0.104.1** + **Uvicorn 0.24.0** — framework async.
- **Pydantic 2.5.0** — validación de schemas.
- **httpx 0.25.2** — cliente HTTP async (WhatsApp + Node bridge).
- **python-dotenv 1.0.0** — variables de entorno.
- **pytest 7.4.3** + **pytest-asyncio** — testing.

## 10. Licencia

MIT
