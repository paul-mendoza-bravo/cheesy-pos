# Cheesy POS — Documentación Técnica
**Versión:** 2.0 (B2C + BI Release)
**Stack:** React 19 + Vite · Node.js + Express 5 · PostgreSQL (Supabase) · Socket.io
**Deploy:** Frontend → Vercel · Backend → Render · DB → Supabase (IPv4 Transaction Pooler)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Vercel)                                          │
│  React + Vite                                               │
│                                                             │
│  Zona B2B (Staff)          Zona B2C (Cliente)              │
│  /login                    /client/login                    │
│  /pos  /kitchen            /client/menu                     │
│  /delivery  /admin         /client/order-status/:id         │
└──────────────────┬──────────────────┬───────────────────────┘
                   │ REST + Socket.io  │
┌──────────────────▼──────────────────▼───────────────────────┐
│  BACKEND (Render)                                           │
│  Express 5 + Socket.io 4                                    │
│                                                             │
│  /api/*         → Staff POS routes                          │
│  /api/client/*  → B2C Customer routes                       │
│  /api/bi/*      → Business Intelligence                     │
│  /api/cash-outflows → Ledger de egresos                     │
│                                                             │
│  Rooms Socket.io:                                           │
│  'staff'         → broadcasts a todo el personal            │
│  'customer_<id>' → canal privado por cliente B2C            │
└──────────────────┬──────────────────────────────────────────┘
                   │ pg (Pool)
┌──────────────────▼──────────────────────────────────────────┐
│  DATABASE (Supabase / PostgreSQL)                           │
│  users · orders · order_items · order_events                │
│  inventory_reports · customers · cash_outflows              │
└─────────────────────────────────────────────────────────────┘
```

---

## Base de Datos

### `backend/schema.sql`
Schema inicial. Se ejecuta automáticamente al boot del servidor vía `setupDatabase()`.

| Tabla | Descripción |
|---|---|
| `users` | Personal del POS. Roles: `admin`, `ayudante`, `parillero`, `repartidor`, `marketer`. Status: `ACTIVE`, `PENDING_APPROVAL`. Incluye seed del usuario `SUPERADMIN`. |
| `orders` | Pedidos. Campos clave: `id` (varchar), `customer_name`, `status`, `total`, `source` (`POS`\|`CLIENT`), `customer_client_id` (FK → customers), `cajero_id`, `cocinero_id`, `repartidor_id`, `delivery_link`, `customer_phone`. |
| `order_items` | Ítems de cada pedido. `modifiers` almacenado como JSONB. |
| `order_events` | Audit trail de cambios de estado. Cada transición inserta un registro con `usuario_id` y `timestamp`. |
| `inventory_reports` | Reportes de faltantes enviados por cocineros. `missing_items` en JSONB. |

### `backend/migration_b2c.sql`
**Ejecutar manualmente en Supabase SQL Editor.**

- Crea tabla `customers` (id, name, phone, email UNIQUE, password_hash, created_at).
- Agrega columna `orders.source` VARCHAR(20) CHECK (`POS`|`CLIENT`), default `POS`.
- Agrega columna `orders.customer_client_id` INTEGER FK → `customers(id)` ON DELETE SET NULL.
- Extiende constraint `orders_status_check` para incluir: `ACCEPTED`, `REJECTED`, `COOKING`.

### `backend/migration_bi.sql`
**Ejecutar manualmente en Supabase SQL Editor.**

- Crea tabla `cash_outflows` (id SERIAL, amount DECIMAL CHECK > 0, description TEXT, recorded_by VARCHAR, created_at TIMESTAMPTZ).

---

## Backend

### `backend/package.json`
```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```
`"type": "module"` requerido para ESM nativo. Dependencias: `bcrypt`, `cors`, `dotenv`, `express 5`, `jsonwebtoken`, `pg`, `socket.io`.

---

### `backend/database.js`
Inicializa el `Pool` de PostgreSQL. Lee `DATABASE_URL` del entorno (Supabase connection string con SSL). Al arrancar el servidor ejecuta `setupDatabase()` que:
1. Corre `schema.sql` completo (CREATE TABLE IF NOT EXISTS).
2. Ejecuta un array de migraciones incrementales (ALTER TABLE IF NOT EXISTS) para columnas añadidas post-schema.
3. Incluye la creación automática de `cash_outflows` en el array de migraciones.

**Variables de entorno requeridas:** `DATABASE_URL`

---

### `backend/server.js`
Punto de entrada. Responsabilidades:

**CORS dinámico:** Política de reflexión — permite `localhost`, `FRONTEND_URL`, `CLIENT_FRONTEND_URL`. Cualquier otro origen se refleja con log de advertencia (fail-open para compatibilidad en producción).

**Socket.io — eventos manejados:**
| Evento (cliente → server) | Acción |
|---|---|
| `join_staff_room` | Añade el socket al room `'staff'` |
| `join_customer_room({ token })` | Verifica JWT (`type === 'customer'`), añade al room `customer_<id>` |

**Rutas montadas:**
- `GET /api/health` — heartbeat para mitigar cold starts en Render.
- `/api` → `createApiRoutes(io)` — rutas del staff POS.
- `/api/client` → `createClientRoutes(io)` — portal B2C.

**Variables de entorno requeridas:** `PORT`, `JWT_SECRET`, `FRONTEND_URL`, `CLIENT_FRONTEND_URL`

---

### `backend/middleware/auth.js`
Middleware exclusivo para el portal B2C.

**`authenticateCustomer(req, res, next)`**
Valida Bearer JWT. Verifica que `decoded.type === 'customer'`. Inyecta `req.customer = { id, name, email, type }`. Retorna 401/403 en caso de fallo.

**`generateCustomerToken(customer)`**
Firma JWT con payload `{ id, name, email, type: 'customer' }`, expira en 7 días. Usa `JWT_SECRET || 'dev_secret_key_b2c_123'` como fallback seguro para desarrollo.

---

### `backend/routes/api.js`
Factory `createApiRoutes(io)`. Rutas del personal interno del POS.

#### Usuarios (`/api/users/*`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/users/login` | Login con `userId` + master password. SUPERADMIN usa contraseña `'12345'`. Nuevos usuarios se crean con status `PENDING_APPROVAL`. |
| GET | `/users` | Lista todos los usuarios. |
| PUT | `/users/:id` | Actualiza `role` y/o `status`. |
| DELETE | `/users/:id` | Elimina usuario (no aplica a SUPERADMIN). |

#### Órdenes (`/api/orders/*`)
| Método | Ruta | Socket emitido | Descripción |
|---|---|---|---|
| GET | `/orders` | — | Obtiene todas las órdenes con items. JOIN con `customers` para nombre B2C. |
| POST | `/orders` | `nuevo_pedido` → all | Crea orden POS en transacción. Inserta `order_items` y evento `CREADO`. |
| PUT | `/orders/:id/status` | `pedido_actualizado` → all + eventos privados → `customer_<id>` | Actualiza estado. Asigna `cocinero_id` en READY, `repartidor_id` en DELIVERED. Emite eventos específicos al room del cliente B2C (`order_accepted`, `order_rejected`, `order_cooking`, `order_ready`, `order_delivered`). |
| GET | `/orders/:id/events` | — | Timeline de auditoría de una orden. |
| DELETE | `/orders/:id` | `pedido_eliminado` → all | Elimina permanentemente orden e items (transacción). |

#### Inventario (`/api/inventory/*`)
| Método | Ruta | Socket emitido | Descripción |
|---|---|---|---|
| GET | `/inventory` | — | Lista todos los reportes de faltantes. |
| POST | `/inventory` | `nuevo_inventario` → all | Registra reporte de faltantes de cocinero. |

#### Business Intelligence (`/api/bi/*`, `/api/cash-outflows`)
Toda la agregación ocurre en PostgreSQL. Cero procesamiento de arrays en el cliente.

**`GET /api/bi/summary`**
CTE de dos fases para evitar doble-conteo en el JOIN orders↔order_items. Retorna métricas del día (órdenes con `status = 'DELIVERED'` y `created_at >= CURRENT_DATE`):
```json
{ "orderCount": 12, "grossRevenue": 980.00, "aov": 81.67, "totalCogs": 354.50 }
```
COGS calculado con `CASE WHEN oi.name WHEN '...' THEN costo END * quantity` en SQL.

**`GET /api/bi/top-products`**
`GROUP BY oi.name` con margen de contribución por unidad via CASE WHEN. `ORDER BY total_qty DESC, contribution_margin DESC LIMIT 3`. Retorna array con `productName`, `totalQty`, `grossRevenue`, `contributionMargin`.

**`POST /api/cash-outflows`**
Registra egreso en `cash_outflows`. Body: `{ amount, description, recordedBy }`. Valida monto positivo y descripción no vacía.

**`GET /api/cash-outflows/today`**
Usa `SUM(amount) OVER ()` (window function) para retornar total diario en el mismo query. Retorna `{ outflows: [...], dailyTotal: 200.00 }`.

**Unit Economics hardcodeadas (base de COGS y márgenes):**
| Producto | Precio | Costo | Utilidad |
|---|---|---|---|
| COMBO MEXA | $140.00 | $50.50 | $89.50 |
| La Mexa | $80.00 | $32.50 | $47.50 |
| La BBQ | $75.00 | $31.00 | $44.00 |
| La Hawaiana | $75.00 | $30.00 | $45.00 |
| Clásica | $65.00 | $25.00 | $40.00 |
| Papas Especiales | $60.00 | $26.00 | $34.00 |
| Papas Sencillas | $35.00 | $18.00 | $17.00 |
| **OPEX Diario** | — | **$750.00** | — |

---

### `backend/routes/client.js`
Factory `createClientRoutes(io)`. Portal B2C. Menú estático espejo del catálogo frontend.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | Pública | Crea cuenta con bcrypt (12 salt rounds). Retorna JWT 7d. |
| POST | `/login` | Pública | Valida email/password. Retorna JWT 7d. |
| GET | `/menu` | Pública | Catálogo de productos y modificadores. |
| POST | `/orders` | JWT Customer | Crea orden en transacción: INSERT en `orders`, `order_items`, `order_events`. Genera ID con prefijo `CLIENT-`. Emite `nuevo_pedido_cliente` al room `'staff'`. |
| GET | `/orders/:orderId/status` | JWT Customer | Estado de una orden propia (valida ownership por `customer_client_id`). |

---

## Frontend

### `src/main.jsx` / `src/App.jsx`
Punto de entrada y árbol de rutas. Arquitectura post-refactor:

```
BrowserRouter
  └── AuthProvider          (global — solo localStorage)
        └── CustomerAuthProvider  (global — solo localStorage)
              ├── /login              Pública
              ├── /client/login       Pública
              │
              ├── StaffShell (Layout Route)
              │     ├── Verifica currentUser → redirect /login
              │     ├── Monta: OrdersProvider → InventoryProvider → CartProvider
              │     ├── Renderiza: RoleSwitcher + chrome del layout
              │     └── StaffRoleGuard (sub-layout por ruta)
              │           ├── /pos          (roles: ayudante)
              │           ├── /kitchen      (roles: parillero)
              │           ├── /delivery     (roles: repartidor)
              │           ├── /admin        (roles: marketer, admin)
              │           └── /admin/users  (roles: admin)
              │
              └── ClientAuthGuard (Layout Route)
                    ├── Verifica customer JWT → redirect /client/login
                    ├── /client/menu
                    └── /client/order-status/:orderId
```

**Aislamiento crítico:** `OrdersProvider` (y su conexión Socket.io) solo se instancia dentro de `StaffShell`. Un cliente B2C que visita `/client/menu` nunca abre un socket de staff ni llama a `GET /api/orders`.

---

### `src/context/AuthContext.jsx`
Sesión del personal interno (B2B). Persiste en `localStorage` como `'cheesy_session'`. Provee: `currentUser`, `pendingUsers`, `login`, `logout`, `approveUser`, `rejectUser`, `updateUserRole`. Filtra SUPERADMIN de las listas editables. Llama a `/api/users` para sincronizar el estado de usuarios.

---

### `src/context/CustomerAuthContext.jsx`
Sesión del cliente B2C. Persiste token JWT en `localStorage` como `'cheesy_customer_token'`. Al montar, parsea el payload del JWT (`atob(token.split('.')[1])`) y verifica expiración. Provee: `customer`, `token`, `loading`, `error`, `register`, `login`, `logout`. Llama a `/api/client/register` y `/api/client/login`.

---

### `src/context/OrdersContext.jsx`
Gestión de órdenes en tiempo real. **Solo activo para staff** (montado en `StaffShell`).

**Socket.io — eventos escuchados:**
| Evento | Acción |
|---|---|
| `connect` | Emite `join_staff_room` |
| `nuevo_pedido` | Agrega orden POS al estado. Sonido en `/kitchen` y `/admin`. |
| `nuevo_pedido_cliente` | Agrega orden B2C al estado. Sonido en `/admin`. |
| `pedido_actualizado` | Actualiza status en el estado. Sonido en READY (delivery/admin) y DELIVERED (admin). |
| `pedido_eliminado` | Elimina orden del estado. |

**Fix anti-patrón:** Reemplazado `window.location.pathname` por `useLocation()` + `pathnameRef` (ref sincronizado en `useEffect([pathname])`) para evitar closures stale en handlers de socket.

**Métodos expuestos:** `addOrder`, `updateOrderStatus`, `deleteOrder` (→ TRASHED), `restoreOrder` (→ PENDING), `permanentlyDeleteOrder`.

---

### `src/context/InventoryContext.jsx`
Reportes de faltantes del turno. Conecta Socket.io independiente. Escucha `nuevo_inventario`. Provee `reports` y `addReport`. Sonido en `/admin` al recibir nuevo reporte.

---

### `src/context/CartContext.jsx`
Carrito del POS (staff). Maneja ítems con modificadores vía `cartItemId` compuesto (`productId-modIds`). Calcula `unitPrice` = precio base + suma de modificadores. Provee: `cart`, `addToCart`, `decreaseQuantity`, `clearCart`, `cartTotal`, `cartCount`.

---

### `src/pages/Login.jsx`
Login del personal. Campos: `userId` (auto-uppercase) + contraseña maestra. Redirige por rol al autenticarse: `admin` → `/admin`, `parillero` → `/kitchen`, `repartidor` → `/delivery`, resto → `/pos`. Muestra estado `PENDING_APPROVAL` con mensaje informativo.

---

### `src/pages/PosMenu.jsx`
Interfaz del cajero. Catálogo en grid con filtro por categoría. `ProductOptionsModal` para productos con modificadores. `CustomOrderModal` para pedidos especiales. Checkout flotante con total y conteo. Usa `CartContext` + `OrdersContext.addOrder`.

---

### `src/pages/KitchenView.jsx`
Vista del parillero. Lista pedidos PENDING como tickets. Modal "Reportar Faltantes" con checklist de ingredientes (`INGREDIENTS_LIST` hardcodeado). Marca órdenes como READY. Usa `InventoryContext.addReport`.

---

### `src/pages/DeliveryView.jsx`
Vista del repartidor. Sección READY (pedidos para entregar) y PENDING (en cocina, deshabilitados). Marca órdenes como DELIVERED vía `updateOrderStatus`.

---

### `src/pages/AdminDashboard.jsx`
Panel de administración. 6 tabs:

**Tab `bi` — Terminal BI (nuevo)**
Fetcha en paralelo (`Promise.all`) los 3 endpoints de BI. Re-fetcha cuando `deliveredCount` cambia (proxy de socket events) y al entrar al tab.

| Módulo | Fórmula |
|---|---|
| Free Cash Flow | `(grossRevenue − totalCogs) − OPEX($750) − dailyOutflowTotal` |
| AOV | `AVG(orders.total)` calculado en PostgreSQL |
| Break-Even Tracker | `min((grossProfit / 750) × 100, 100%)` · barra animada CSS con color dinámico rojo/amarillo/verde |
| Top Performers | Top 3 por volumen + margen de contribución del turno |
| Cash Outflows | Lista de egresos del día + modal para registrar nuevos (`OutflowModal`) |

**Tab `active`** — Estadísticas del día (ventas, órdenes, completadas, burgers) + lista de órdenes activas con acción de trash.

**Tab `trash`** — Papelera con restore y eliminación permanente.

**Tab `history`** — Renderiza `<OrderHistory />`.

**Tab `client_orders`** — Pedidos B2C con máquina de estados: PENDING → ACCEPTED/REJECTED → COOKING → READY → DELIVERED.

**Tab `inventory`** — Reportes de faltantes con descarga JSON.

---

### `src/pages/UserManagement.jsx`
Gestión de usuarios (admin only). `MultiRoleSelect` permite asignar múltiples roles (stored como `"admin,marketer"`). Eliminación requiere contraseña SUPERADMIN. Roles disponibles: `parillero`, `ayudante`, `repartidor`, `marketer`, `admin`.

---

### `src/pages/ClientLogin.jsx`
Auth UI del portal B2C. Tabs Login/Registro. Registro: name, phone (opcional), email, password. Login: email, password. Usa `CustomerAuthContext`. Redirige a `/client/menu` al autenticarse. Estética glassmorphism con gradiente.

---

### `src/pages/ClientMenu.jsx`
Interfaz de pedido para clientes directos. Catálogo con filtro por categoría (Todo / Combos / Hamburguesas / Guarniciones). Cart drawer (bottom sheet) con +/- por ítem, notas especiales y total. Submit a `POST /api/client/orders` con JWT. Redirige a `/client/order-status/:orderId`.

---

### `src/pages/ClientOrderStatus.jsx`
Tracking en tiempo real del pedido B2C. Conecta Socket.io y emite `join_customer_room({ token })` para entrar al room privado `customer_<id>`. Stepper visual de estados: PENDING → ACCEPTED → COOKING → READY → DELIVERED (o REJECTED). Indicador de conexión en vivo (punto verde). Muestra minutos estimados en ACCEPTED y razón de rechazo en REJECTED.

---

### `src/components/RoleSwitcher.jsx`
Barra de navegación del staff. Botones por rol según `currentUser.role` (split por coma). Badges de notificación: órdenes pendientes en `/kitchen`, órdenes READY en `/delivery`. Ruta activa resaltada. Logout y user ID a la derecha.

---

### `src/components/OrderHistory.jsx`
Historial de órdenes con búsqueda (por ID o nombre), filtro por status, y ordenamiento (fecha, cliente, total, status). Órdenes agrupadas por fecha con totales diarios. Filas expandibles con detalle de ítems y modificadores.

---

## Variables de Entorno

### Backend (Render)
| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string Supabase (IPv4 Transaction Pooler) |
| `JWT_SECRET` | Secreto para firmar tokens B2C |
| `FRONTEND_URL` | URL de Vercel (staff frontend) |
| `CLIENT_FRONTEND_URL` | URL del portal cliente (puede ser la misma) |
| `PORT` | Puerto del servidor (Render lo inyecta automáticamente) |

### Frontend (Vercel)
| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL del backend en Render (ej. `https://cheesy-api.onrender.com`) |
| `VITE_BACKEND_URL` | Misma URL — usada por `CustomerAuthContext` |

---

## Flujo de Datos Completo

### Pedido POS (B2B)
```
Cajero selecciona ítems (PosMenu)
  → CartContext.addToCart()
  → OrdersContext.addOrder()
  → POST /api/orders
  → DB: INSERT orders + order_items + order_events(CREADO)
  → io.emit('nuevo_pedido') → todos los sockets
  → KitchenView recibe evento, muestra ticket
  → Parillero marca READY → PUT /api/orders/:id/status
  → io.emit('pedido_actualizado') → DeliveryView
  → Repartidor marca DELIVERED → FCF se actualiza en BI
```

### Pedido B2C
```
Cliente se registra/loguea (ClientLogin)
  → POST /api/client/register|login → JWT 7d
  → ClientMenu: arma carrito, confirma
  → POST /api/client/orders (Bearer JWT)
  → DB: INSERT orders(source=CLIENT) + order_items + order_events
  → io.to('staff').emit('nuevo_pedido_cliente')
  → AdminDashboard tab "Pedidos Online" recibe badge + orden
  → Admin acepta → PUT /api/orders/:id/status → ACCEPTED
  → io.to('customer_<id>').emit('order_accepted', { estimatedMinutes: 15 })
  → ClientOrderStatus stepper avanza en tiempo real
```

### Dashboard BI (tiempo real)
```
Orden marcada DELIVERED (cualquier fuente)
  → OrdersContext actualiza estado → deliveredCount++
  → useEffect([deliveredCount]) → fetchBIData()
  → Promise.all([/bi/summary, /bi/top-products, /cash-outflows/today])
  → PostgreSQL: CTE + GROUP BY + CASE WHEN → métricas agregadas
  → FCF, AOV, Break-Even barra se re-renderizan
```
