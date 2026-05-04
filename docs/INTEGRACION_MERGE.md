# 🔧 Guía de Integración: ai-service ↔ Backend Node

> Esta guía describe cómo el microservicio `ai-service` (FastAPI) se acopla al **Cheesy POS** ya existente (Node Express + PostgreSQL + Frontend Vercel). Para el detalle interno del servicio ver [AI_SERVICE.md](AI_SERVICE.md).

---

## 📌 Resumen de la integración

El `ai-service` **NO** se conecta a Postgres ni a Supabase directamente. Toda la persistencia se delega al backend Node mediante una sola llamada HTTP:

```
ai-service ──POST /api/orders──▶ backend Node :3001 ──INSERT──▶ Postgres
                                       │
                                       └─emit('nuevo_pedido')─▶ Socket.io ─▶ Frontend
```

El Node sigue siendo el único dueño de:
- Esquema de BD y migraciones (`schema.sql`).
- Persistencia transaccional `orders / order_items / order_events`.
- Eventos en tiempo real (`socket.io`).
- BOM, recetas y deducción de inventario.
- Endpoints B2B y B2C.

El `ai-service` solo aporta:
- Webhook WhatsApp (`POST /webhook/cheesy-pos`).
- Extracción IA del mensaje a una `OrdenExtraida`.
- Recosteo determinista contra `menu_definitions.py`.
- Endpoints derivados de cálculo financiero (`/dashboard/*`).

---

## 🔗 Contrato HTTP entre ai-service y Node

El bridge vive en [ai-service/app/core/database.py](../ai-service/app/core/database.py). El payload que envía coincide con el contrato existente de `POST /api/orders` del POS:

```jsonc
{
  "id": "WA-1A2B3C4D5E",
  "customerName": "WhatsApp · 9488",
  "customerPhone": "5215512345678",
  "total": 300.0,
  "status": "PENDING",
  "items": [
    {
      "id": "PROD-MEXA",
      "productId": "PROD-MEXA",
      "name": "Mexa",
      "quantity": 2,
      "price": 120,
      "unitPrice": 120,
      "modifiers": [
        { "id": "MOD-DOBLE", "name": "Doble carne", "priceDelta": 30 }
      ]
    }
  ],
  "cajeroId": "WHATSAPP_BOT",
  "deliveryLink": "Centro"
}
```

### Reglas del payload

| Campo | Valor | Notas |
|---|---|---|
| `id` | `WA-XXXXXXXXXX` | Generado en `database.generar_id_orden()`. Prefijo `WA-` identifica origen WhatsApp. |
| `customerName` | `"WhatsApp · {ultimos4}"` | El número va en `customerPhone`. |
| `total` | número | Recosteado en el ai-service (`order_calculator`). El Node puede revalidar pero el ai-service ya lo dejó canónico. |
| `status` | `"PENDING"` | Siempre. El Node arranca el flujo de cocina. |
| `cajeroId` | `"WHATSAPP_BOT"` | Identifica órdenes automatizadas en BI. |
| `items[].price` | precio con modificadores aplicados | Mexa $90 + Doble $30 = `120`. |
| `items[].modifiers[]` | array | Solo `MOD-DOBLE` y `MOD-NOTA` por ahora. |

### Códigos de respuesta esperados

| Status del Node | Significado en ai-service |
|---|---|
| `200` / `201` | Orden creada. Se loguea `order_id`. |
| Cualquier otro | Se loguea el `status_code` + `text[:300]` y se devuelve `None` (el cliente recibe igual la respuesta del bot pero sin `order_id`). |
| Timeout / `RequestError` | Se loguea "no se pudo contactar al Node POS". Hoy **NO hay reintento** — pendiente. |

---

## 🍔 Catálogo y precios

### Fuente de verdad actual (duplicada — pendiente unificar)

| Lugar | Qué tiene | Uso |
|---|---|---|
| [ai-service/app/core/menu_definitions.py](../ai-service/app/core/menu_definitions.py) | Hamburguesas, modificadores, complementos, bebidas con `precio_venta` y `cogs`. | Recosteo del ai-service. |
| Backend Node (BD + BOM) | Productos, recetas, ingredientes, stock. | Operación del POS, deducción de inventario. |

### Precios vigentes (al 2026-05-04)

| Producto | Precio venta | COGS |
|---|---|---|
| Clásica | $75 | $47.19 |
| BBQ | $85 | $57.19 |
| Hawaiana | $85 | $55.19 |
| Mexa | $90 | $55.32 |
| **Modificador: Doble carne** | **+$30** | **+$18.00** |
| Papas Sencillas | $40 | $20.00 |
| Papas Especiales | $60 | $40.00 |
| Agua de Jamaica | $20 | $0.00 |
| Agua de Horchata | $20 | $0.00 |

> ⚠️ Si actualizas precios en el POS (BD del Node), actualiza también `menu_definitions.py` o, mejor, planifica migrarlo a un endpoint `GET /api/menu` consumido al boot del ai-service.

### Costos fijos diarios (en `financials.py`)

| Concepto | Monto |
|---|---|
| Parrillero (Jeremy) | $150.00 |
| Repartidor (Sebastián) | $200.00 |
| **Total** | **$350.00** |

Se usan para el cálculo de punto de equilibrio (~13 hamburguesas) y los endpoints `/dashboard/*`.

---

## 🎛️ Variables de entorno

Copiar [ai-service/.env.example](../ai-service/.env.example) a `ai-service/.env`:

```bash
# Backend Node (POS principal)
NODE_API_URL=http://localhost:3001       # en docker-compose: http://backend:3001
NODE_API_TIMEOUT=10.0

# LLM (Anthropic Claude o OpenAI)
LLM_API_KEY=
LLM_MODEL=claude-3-5-sonnet-20241022

# WhatsApp Cloud API (Meta)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=cheesy-pos-verify

# Logging
LOG_LEVEL=INFO
DEBUG=True
```

> No hay variables de Supabase. Si las ves en una rama vieja de `config.py`, son zombi y se pueden borrar.

---

## 🚀 Endpoints del ai-service

### Webhook WhatsApp

```
POST /webhook/cheesy-pos
Body: { "mensaje_cliente": "...", "numero_telefono": "..." }
Response: { "status": "success", "datos_pos": {...}, "order_id": "WA-..." | null }
```

### Dashboard financiero (cálculos derivados, sin BD)

```
GET /dashboard/financial-summary?ventas_brutas=X&cogs_total=Y&egresos_adicionales=Z
GET /dashboard/break-even
GET /dashboard/equilibrium-status?ventas_brutas=X&cogs_total=Y
GET /dashboard/costos-fijos
```

### Health checks

```
GET /health
GET /dashboard/health-check
```

---

## 🔄 Despliegue

La arquitectura recomendada y vigente es **dos servicios independientes**:

| Servicio | Puerto | Plataforma actual |
|---|---|---|
| `backend` (Node Express) | `:3001` | Render |
| `ai-service` (FastAPI) | `:8000` | Render / cualquier host con Python 3.10+ |
| `frontend` (React + Vite) | `:5173` dev | Vercel |

En desarrollo, todo arriba con un solo comando desde la raíz del repo:

```bash
docker-compose up --build
```

[docker-compose.yml](../docker-compose.yml) levanta `backend` y `ai-service`, configura `NODE_API_URL=http://backend:3001` para que el bridge funcione dentro de la red Docker.

> Versiones anteriores de esta guía proponían una "Opción B" con monorepo único corriendo todo en Node. Esa opción **no se implementó** y ya no se considera — Python sigue siendo un microservicio separado.

---

## 🧪 Testing pre-merge

```bash
cd ai-service
pip install -r requirements.txt
pytest tests/ -v
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

Para validar end-to-end:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd ai-service && uvicorn app.main:app --reload --port 8000

# Terminal 3 - simula un mensaje de WhatsApp
curl -X POST http://localhost:8000/webhook/cheesy-pos \
  -H "Content-Type: application/json" \
  -d '{"mensaje_cliente":"1 Mexa doble","numero_telefono":"5215500000000"}'

# Terminal 4 - verifica que llegó al Node
curl http://localhost:3001/api/orders | jq '.[] | select(.cajeroId=="WHATSAPP_BOT")'
```

Si la orden aparece en el Node y el frontend la muestra en `/kitchen`, el bridge está OK.

---

## 📊 Métricas que devuelve el ai-service por orden

```json
{
  "total_order": 150.00,
  "total_cogs": 87.51,
  "ganancia_bruta": 62.49,
  "porcentaje_margen": 41.66,
  "faltante_para_equilibrio": 287.51
}
```

Estas métricas viajan en `datos_pos` del response del webhook. El frontend del POS no las usa hoy — son consumibles desde los endpoints `/dashboard/*` o desde el log del ai-service.

---

## ⚠️ Puntos críticos en operación

1. **El Node debe estar arriba.** Si `backend:3001` cae, el ai-service no persiste; las órdenes se pierden (no hay cola/retry todavía).
2. **El LLM hoy está mockeado** en [llm_processor.py](../ai-service/app/core/llm_processor.py). Cualquier mensaje devuelve "1 Mexa, COMPLETO". Hay que conectar el SDK real antes de producción.
3. **Sin idempotencia** ante reintentos de Meta — un mismo `message_id` puede generar dos órdenes.
4. **Sesiones in-memory** — si reinicias el contenedor a media conversación, el cliente queda colgado.
5. **Sin `GET /webhook/cheesy-pos` para el verify_token** — Meta exige ese handshake para suscribir el webhook en producción.
6. **Catálogo duplicado** entre Python y la BD del Node — sincronizar manualmente hasta que se centralice.

---

## 🔗 Dependencias del ai-service

```txt
fastapi==0.104.1
pydantic==2.5.0
uvicorn==0.24.0
httpx==0.25.2
python-dotenv==1.0.0
pytest==7.4.3
```

> `supabase==2.1.0` ya no se requiere y debe quitarse de `requirements.txt` si aún aparece.

---

## ✅ Checklist pre-deploy

- [ ] `.env` del ai-service configurado con `NODE_API_URL` apuntando al Node de producción.
- [ ] `.env` del backend Node configurado con `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CLIENT_FRONTEND_URL`.
- [ ] Tests del ai-service pasan (`pytest tests/ -v`).
- [ ] LLM mock reemplazado por SDK real (Claude / OpenAI).
- [ ] Credenciales de WhatsApp Cloud API configuradas y verificadas con Meta.
- [ ] CORS del backend Node permite el dominio del ai-service si aplica.
- [ ] Verify-token endpoint implementado para Meta.
- [ ] Logs centralizados / observables.
- [ ] Plan de retry/cola para fallos del Node.

---

**Más detalle del servicio:** [AI_SERVICE.md](AI_SERVICE.md) · [README principal](../README.md)
