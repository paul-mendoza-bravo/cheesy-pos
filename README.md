# 🧀 Cheesy POS — Sistema de Punto de Venta & Portal B2C 🚀

Bienvenido al repositorio de **Cheesy POS**. Este es un sistema integral diseñado para hamburgueserías que combina un Punto de Venta (POS) para personal interno con un Portal de Clientes (B2C) para pedidos en línea en tiempo real.

---

## 🛠️ Stack Tecnológico & Despliegue

- **Frontend:** React 19 + Vite + Tailwind CSS / Lucide React.
  - *Despliegue:* [Vercel](https://vercel.com)
- **Backend:** Node.js + Express 5 + Socket.io 4.
  - *Despliegue:* [Render](https://render.com)
- **Base de Datos:** PostgreSQL (Supabase / Render).
  - *Pooling:* IPv4 Transaction Pooler.
- **Comunicación:** WebSockets (Socket.io) para actualizaciones de pedidos e inventario en tiempo real.

---

## 🔐 Sistemas de Autenticación

El sistema tiene dos flujos de acceso completamente independientes:

### 1. Personal Interno (B2B/Staff)
- **Acceso:** Vía ID de Usuario (ej. `CARLOS`) + Contraseña Maestra.
- **Contraseña Maestra General:** `Cheesy12345`
- **SuperAdmin:** ID `SUPERADMIN` con contraseña `12345`.
- **Roles:** `admin` (todo), `marketer` (BI), `parillero` (Cocina), `repartidor` (Delivery), `ayudante` (Caja/POS).
- **Persistencia:** `localStorage` (`cheesy_session`).

### 2. Clientes Directos (B2C)
- **Registro:** Requiere Nombre, **Teléfono (Obligatorio/10 dígitos)**, Correo y Contraseña.
- **Login:** Se realiza mediante **Número de Teléfono** + Contraseña.
- **Seguridad:** Contraseñas encriptadas con `bcrypt` (12 salt rounds).
- **Estado Inicial:** Los clientes nuevos son pre-aprobados (`APPROVED`) automáticamente para evitar fricción en ventas.
- **Persistencia:** JWT (7 días) guardado en `localStorage`.

---

## 🏗️ Arquitectura de Directorios

- `/src`: Frontend React.
  - `/context`: Lógica global (Auth, Orders, Inventory, Cart).
  - `/pages`: Vistas segmentadas por rol y portal.
  - `/components`: Elementos reutilizables (Modales, NavBars, etc).
- `/backend`: Servidor Express (POS principal — `:3001`).
  - `server.js`: Punto de entrada y configuración de Sockets.
  - `/routes`: `api.js` (B2B) y `client.js` (B2C).
  - `database.js`: Gestión del Pool y migraciones automáticas.
  - `schema.sql`: Definición base de tablas.
- `/ai-service`: 🆕 Microservicio FastAPI WhatsApp + IA (`:8000`).
  - `app/api/routes/webhook.py`: webhook que recibe mensajes de Meta.
  - `app/core/llm_processor.py`: extracción de orden con LLM (Claude/OpenAI).
  - `app/core/menu_definitions.py`: catálogo canónico (precios + COGS).
  - `app/core/database.py`: **NO toca Postgres directo** — hace `POST /api/orders` al backend Node, que persiste y emite `nuevo_pedido` por socket.io.
- `/docs`: Documentación técnica (AI service, integración, `documentation.html`).
- `docker-compose.yml`: Orquesta backend + ai-service en local.

---

## 📦 Flujo de Pedidos (Real-Time)

### 🍔 Pedido desde POS (Cajero)
1. El cajero arma el carrito → `OrdersContext.addOrder()`.
2. Se emite evento `nuevo_pedido`.
3. El **Parrillero** en `/kitchen` ve el ticket al instante y lo marca como **Listo (READY)**.
4. El **Repartidor** en `/delivery` ve la notificación y lo marca como **Entregado (DELIVERED)**.
5. El stock de insumos se descuenta automáticamente en la base de datos tras la entrega.

### 📱 Pedido Online (B2C)
1. El cliente elige desde `/client/menu` → `POST /api/client/orders`.
2. El Admin recibe una alerta visual y auditiva en la pestaña **"Pedidos Online"**.
3. El Admin **Acepta o Rechaza** el pedido (con tiempo estimado).
4. El cliente ve el progreso en vivo (`ClientOrderStatus`) vía un room privado de Socket.io (`customer_<id>`).

---

## 📊 Business Intelligence (BI) y Gestión
El sistema incluye un tablero de BI en el Admin Dashboard que calcula métricas diarias en tiempo real usando consultas complejas (CTE) en PostgreSQL:
- **FCF (Free Cash Flow):** Ingresos Brutos - COGS - OPEX ($750) - Egresos.
- **AOV (Average Order Value):** Promedio de venta por pedido.
- **Break-Even:** Barra visual de progreso hacia el punto de equilibrio diario.
- **Insumos/Recetas (BOM):** Gestión de existencias y recetas por producto.
- **Gestión de Clientes:** Pestaña especial en "Administrar Perfiles" para bloquear (`REJECTED`) o eliminar cuentas fraudulentas.

---

## 🚀 Variables de Entorno Requeridas

### Frontend (Vercel)
- `VITE_API_URL`: URL del backend en Render (ej. `https://api.cheesy.com`).

### Backend (Render)
- `DATABASE_URL`: Connection string de PostgreSQL.
- `JWT_SECRET`: Llave segura para tokens B2C.
- `FRONTEND_URL`: URL del frontend (para CORS).
- `CLIENT_FRONTEND_URL`: URL del portal cliente (para CORS).

---

## 🛠️ Desarrollo Local
1. Instalar dependencias en raíz y `/backend` con `npm install`.
2. Configurar `.env` local en `/backend` y en `/ai-service` (ver `.env.example`).
3. Correr backend: `cd backend && npm run dev` (puerto 3001).
4. Correr frontend: `npm run dev` (puerto 5173).
5. Correr ai-service (opcional, solo si quieres WhatsApp+IA):
   ```bash
   cd ai-service
   python -m venv venv && venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
   o todo junto vía `docker-compose up --build` desde la raíz.

---

## 🤖 Flujo WhatsApp → POS (ai-service)

```
Cliente WhatsApp
      │
      ▼
Meta Cloud API ──► POST /webhook/cheesy-pos  (ai-service :8000)
                        │
                        ├─► LLM extrae orden estructurada
                        ├─► validación contra menu_definitions
                        ├─► recosteo determinista
                        │
                        ▼
                  POST /api/orders  (backend Node :3001)
                        │
                        ├─► INSERT transaccional en Postgres
                        ├─► socket.io emit('nuevo_pedido')  ──► Cocina UI
                        │
                        ▼
                 ai-service envía respuesta al cliente
                        por WhatsApp Cloud API
```

Toda la inteligencia de negocio (BI, inventario, eventos, deducción de stock, BOM)
sigue viviendo en el backend Node. El ai-service solo traduce lenguaje natural → orden.
