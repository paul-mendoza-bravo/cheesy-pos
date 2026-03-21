import express from 'express';
import pool from '../database.js';

const MASTER_PASSWORD = 'Cheesy12345';

// Factory function receives the Socket.io instance
export const createApiRoutes = (io) => {
  const router = express.Router();

  // ==========================================
  // USERS ENDPOINTS
  // ==========================================

  // Login / Register Pending User
  router.post('/users/login', async (req, res) => {
    try {
      const { userId, password } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Se requiere ID de usuario' });
      }

      const uppercaseId = userId.trim().toUpperCase();

      // SUPERADMIN Bypass
      if (uppercaseId === 'SUPERADMIN') {
        if (password !== '12345') {
          return res.status(401).json({ success: false, message: 'Contraseña de administrador incorrecta' });
        }
        const adminResult = await pool.query('SELECT * FROM users WHERE id = $1', ['SUPERADMIN']);
        return res.json({ success: true, user: adminResult.rows[0] });
      }

      // For all other staff, validate master password
      if (password !== MASTER_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
      }

      const result = await pool.query('SELECT * FROM users WHERE id = $1', [uppercaseId]);

      if (result.rows.length === 0) {
        const newUserResult = await pool.query(
          'INSERT INTO users (id, role, status) VALUES ($1, $2, $3) RETURNING *',
          [uppercaseId, 'ayudante', 'PENDING_APPROVAL']
        );
        return res.status(201).json({
          success: false,
          message: 'Usuario registrado. Esperando aprobación del Admin.',
          user: newUserResult.rows[0]
        });
      }

      const user = result.rows[0];

      if (user.status === 'PENDING_APPROVAL') {
        return res.status(403).json({ success: false, message: 'Cuenta en espera de aprobación por el Administrador.' });
      }

      if (user.status === 'ACTIVE') {
        return res.json({ success: true, user });
      }

      return res.status(400).json({ success: false, message: 'Estado de cuenta inválido.' });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  });

  // Get all users
  router.get('/users', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Fetch users error:', error);
      res.status(500).json({ error: 'Error fetching users' });
    }
  });

  // Update user (Approve or change role)
  router.put('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { role, status } = req.body;

      let updateQuery = 'UPDATE users SET ';
      const values = [];
      let paramCount = 1;

      if (role) {
        updateQuery += `role = $${paramCount}`;
        values.push(role);
        paramCount++;
      }

      if (status) {
        if (paramCount > 1) updateQuery += ', ';
        updateQuery += `status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      if (values.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
      values.push(id);

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Error updating user' });
    }
  });

  // Delete (Reject) user
  router.delete('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (id === 'SUPERADMIN') {
        return res.status(403).json({ error: 'Cannot delete SUPERADMIN' });
      }

      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, message: 'User deleted' });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Error deleting user' });
    }
  });

  // ==========================================
  // ORDERS ENDPOINTS
  // ==========================================

  // Helper: transform DB row to frontend-friendly format
  // Helper: transform DB row to frontend-friendly format
  const formatOrder = (row) => ({
    id: row.id,
    customerName: row.b2c_customer_name || row.customer_name || 'Cliente',
    source: row.source || 'POS',
    customerClientId: row.customer_client_id || null,
    status: row.status,
    total: parseFloat(row.total) || 0,
    createdAt: row.created_at || row.createdAt,
    cajeroId: row.cajero_id || null,
    cocineroId: row.cocinero_id || null,
    repartidorId: row.repartidor_id || null,
    deliveryLink: row.delivery_link || null,
    customerPhone: row.customer_phone || null,
    items: row.items || [],
    events: row.events || []
  });

  // Get all orders (with their items)
  router.get('/orders', async (req, res) => {
    try {
      const ordersResult = await pool.query(`
        SELECT o.*, c.name as b2c_customer_name 
        FROM orders o
        LEFT JOIN customers c ON o.customer_client_id = c.id
        ORDER BY o.created_at DESC
      `);

      const orders = [];
      for (let row of ordersResult.rows) {
        const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [row.id]);
        const order = formatOrder(row);
        order.items = itemsResult.rows.map(item => ({
          ...item,
          modifiers: item.modifiers ? JSON.parse(item.modifiers) : []
        }));
        orders.push(order);
      }

      res.json(orders);
    } catch (error) {
      console.error('Fetch orders error:', error);
      res.status(500).json({ error: 'Error fetching orders' });
    }
  });

  // Create new order  ← emits 'nuevo_pedido' to all clients
  router.post('/orders', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { id, customerName, customerPhone, total, status, items, cajeroId, deliveryLink } = req.body;

      const orderResult = await client.query(
        `INSERT INTO orders (id, customer_name, customer_phone, status, total, cajero_id, delivery_link) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, customerName, customerPhone || null, status || 'PENDING', total, cajeroId || null, deliveryLink || null]
      );
      const newOrderRow = orderResult.rows[0];

      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            'INSERT INTO order_items (order_id, product_id, name, quantity, price, modifiers) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, item.id || item.productId, item.name, item.quantity, item.price || item.unitPrice, JSON.stringify(item.modifiers || [])]
          );
        }
      }

      // Record the CREADO event
      await client.query(
        'INSERT INTO order_events (order_id, estado, usuario_id) VALUES ($1, $2, $3)',
        [id, 'CREADO', cajeroId || null]
      );

      await client.query('COMMIT');

      const newOrder = formatOrder(newOrderRow);
      newOrder.items = items;

      // 🔴 Emit real-time event
      io.emit('nuevo_pedido', newOrder);
      console.log(`[Socket] Emitido: nuevo_pedido #${newOrder.id} (cajero: ${cajeroId || 'N/A'})`);

      res.status(201).json(newOrder);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Error creating order' });
    } finally {
      client.release();
    }
  });

  // Update order status  ← emits 'pedido_actualizado' to all clients
  router.put('/orders/:id/status', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { id } = req.params;
      const { status, userId } = req.body;

      // Estados válidos: incluye ciclo de vida B2C (ACCEPTED, REJECTED, COOKING)
      const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'COOKING', 'READY', 'DELIVERED', 'TRASHED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado de orden inválido.' });
      }

      const currentOrderQuery = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
      if (currentOrderQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Orden no encontrada.' });
      }
      const oldStatus = currentOrderQuery.rows[0].status;

      let updateQuery = 'UPDATE orders SET status = $1';
      const values = [status];
      let paramIdx = 2;

      // Asignar empleado responsable según el estado
      if (status === 'READY' && userId) {
        updateQuery += `, cocinero_id = $${paramIdx}`;
        values.push(userId);
        paramIdx++;
      } else if (status === 'DELIVERED' && userId) {
        updateQuery += `, repartidor_id = $${paramIdx}`;
        values.push(userId);
        paramIdx++;
      }

      updateQuery += ` WHERE id = $${paramIdx} RETURNING *`;
      values.push(id);

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Orden no encontrada.' });
      }

      // Registrar evento de auditoría
      await client.query(
        'INSERT INTO order_events (order_id, estado, usuario_id) VALUES ($1, $2, $3)',
        [id, status, userId || null]
      );

      // Deduct inventory if transitioning to DELIVERED
      if (status === 'DELIVERED' && oldStatus !== 'DELIVERED') {
        const itemsRes = await client.query('SELECT product_id, quantity, modifiers FROM order_items WHERE order_id = $1', [id]);
        for (const item of itemsRes.rows) {
          // Base product deduction
          await client.query(`
            UPDATE insumos i
            SET current_stock = i.current_stock - (r.quantity * $2)
            FROM recipes r
            WHERE r.insumo_id = i.id AND r.product_id = $1
          `, [item.product_id, item.quantity]);
          
          // Modifiers deduction
          const modifiers = item.modifiers ? (typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers) : [];
          for (const mod of modifiers) {
            await client.query(`
              UPDATE insumos i
              SET current_stock = i.current_stock - (r.quantity * $2)
              FROM recipes r
              WHERE r.insumo_id = i.id AND r.product_id = $1
            `, [mod.id, item.quantity]);
          }
        }
      }

      await client.query('COMMIT');

      const updatedOrder = formatOrder(result.rows[0]);

      // Emitir al canal general de staff (POS)
      io.emit('pedido_actualizado', updatedOrder);
      console.log(`[Socket] Emitido: pedido_actualizado #${updatedOrder.id} → ${status} (por: ${userId || 'N/A'})`);

      // Emitir eventos privados al room del cliente B2C (si la orden proviene de CLIENT)
      const customerClientId = result.rows[0].customer_client_id;
      if (customerClientId) {
        const customerRoom = `customer_${customerClientId}`;
        const clientPayload = { orderId: id, status };

        if (status === 'ACCEPTED') {
          io.to(customerRoom).emit('order_accepted', { ...clientPayload, estimatedMinutes: 15 });
          console.log(`[Socket] Emitido: order_accepted → ${customerRoom}`);
        } else if (status === 'REJECTED') {
          const { reason } = req.body;
          io.to(customerRoom).emit('order_rejected', { ...clientPayload, reason: reason || 'El local no puede procesar tu pedido en este momento.' });
          console.log(`[Socket] Emitido: order_rejected → ${customerRoom}`);
        } else if (status === 'COOKING') {
          io.to(customerRoom).emit('order_cooking', clientPayload);
          console.log(`[Socket] Emitido: order_cooking → ${customerRoom}`);
        } else if (status === 'READY') {
          io.to(customerRoom).emit('order_ready', clientPayload);
          console.log(`[Socket] Emitido: order_ready → ${customerRoom}`);
        } else if (status === 'DELIVERED') {
          io.to(customerRoom).emit('order_delivered', clientPayload);
          console.log(`[Socket] Emitido: order_delivered → ${customerRoom}`);
        }
      }

      res.json(updatedOrder);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update order status error:', error);
      res.status(500).json({ error: 'Error updating order status' });
    } finally {
      client.release();
    }
  });

  // Get events for a specific order (timeline)
  router.get('/orders/:id/events', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM order_events WHERE order_id = $1 ORDER BY timestamp ASC',
        [id]
      );
      res.json(result.rows.map(e => ({
        id: e.id,
        orderId: e.order_id,
        estado: e.estado,
        usuarioId: e.usuario_id,
        timestamp: e.timestamp
      })));
    } catch (error) {
      console.error('Fetch order events error:', error);
      res.status(500).json({ error: 'Error fetching order events' });
    }
  });

  // Permanently delete an order and its items
  router.delete('/orders/:id', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { id } = req.params;

      // Delete items first (foreign key)
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      const result = await client.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      await client.query('COMMIT');

      // Emit real-time event
      io.emit('pedido_eliminado', { id });
      console.log(`[Socket] Emitido: pedido_eliminado #${id}`);

      res.json({ success: true, message: 'Orden eliminada permanentemente' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete order error:', error);
      res.status(500).json({ error: 'Error deleting order' });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // INVENTORY ENDPOINTS
  // ==========================================

  // Get all inventory reports
  router.get('/inventory', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT r.*, u.id as cook_name
        FROM inventory_reports r
        LEFT JOIN users u ON r.cook_id = u.id
        ORDER BY r.created_at DESC
      `);
      res.json(result.rows.map(row => ({
        id: row.id,
        cookId: row.cook_id,
        cookName: row.cook_name || 'Desconocido',
        missingItems: typeof row.missing_items === 'string' ? JSON.parse(row.missing_items) : row.missing_items,
        createdAt: row.created_at
      })));
    } catch (error) {
      console.error('Fetch inventory error:', error);
      res.status(500).json({ error: 'Error fetching inventory reports' });
    }
  });

  // Submit new inventory report
  router.post('/inventory', async (req, res) => {
    try {
      const { missingItems, cookId } = req.body;
      
      if (!missingItems || !Array.isArray(missingItems)) {
        return res.status(400).json({ error: 'missingItems array is required' });
      }

      const result = await pool.query(
        'INSERT INTO inventory_reports (cook_id, missing_items) VALUES ($1, $2) RETURNING *',
        [cookId || null, JSON.stringify(missingItems)]
      );
      
      const newReport = {
        id: result.rows[0].id,
        cookId: result.rows[0].cook_id,
        missingItems: missingItems,
        createdAt: result.rows[0].created_at
      };

      // Emit realtime event
      io.emit('nuevo_inventario', newReport);
      console.log(`[Socket] Emitido: nuevo_inventario por ${cookId || 'N/A'}`);
      
      res.status(201).json(newReport);

    } catch (error) {
      console.error('Submit inventory error:', error);
      res.status(500).json({ error: 'Error submitting inventory report' });
    }
  });

  // ==========================================
  // BUSINESS INTELLIGENCE ENDPOINTS
  // Unit economics hardcoded per business spec.
  // All aggregation runs in PostgreSQL — zero array processing on the client.
  // ==========================================

  // Diccionario de costos unitarios (base de cálculo de COGS)
  // Refleja el mismo catálogo de client.js y el POS frontend.
  const COST_MAP_SQL = `
    CASE oi.name
      WHEN 'COMBO MEXA'        THEN 63.25
      WHEN 'La Mexa'           THEN 37.25
      WHEN 'La BBQ'            THEN 35.75
      WHEN 'La Hawaiana'       THEN 35.75
      WHEN 'Clásica'           THEN 29.75
      WHEN 'Papas Especiales'  THEN 26.00
      WHEN 'Papas Sencillas'   THEN 18.00
      ELSE 0
    END
  `;

  const MARGIN_MAP_SQL = `
    CASE oi.name
      WHEN 'COMBO MEXA'        THEN 76.75
      WHEN 'La Mexa'           THEN 42.75
      WHEN 'La BBQ'            THEN 39.25
      WHEN 'La Hawaiana'       THEN 39.25
      WHEN 'Clásica'           THEN 35.25
      WHEN 'Papas Especiales'  THEN 34.00
      WHEN 'Papas Sencillas'   THEN 17.00
      ELSE 0
    END
  `;

  // GET /api/bi/summary
  // Retorna métricas agregadas del día: ingresos brutos, COGS, AOV, conteo de órdenes.
  // Usa CTE para evitar doble-conteo en el JOIN entre orders y order_items.
  router.get('/bi/summary', async (req, res) => {
    try {
      const result = await pool.query(`
        WITH delivered_today AS (
          SELECT id, total
          FROM orders
          WHERE status = 'DELIVERED'
            AND created_at >= CURRENT_DATE
        ),
        item_costs AS (
          SELECT
            oi.order_id,
            SUM(${COST_MAP_SQL} * oi.quantity) AS cost
          FROM order_items oi
          INNER JOIN delivered_today dt ON dt.id = oi.order_id
          GROUP BY oi.order_id
        )
        SELECT
          COUNT(dt.id)::int                                AS order_count,
          ROUND(COALESCE(SUM(dt.total), 0)::numeric, 2)   AS gross_revenue,
          ROUND(COALESCE(AVG(dt.total), 0)::numeric, 2)   AS aov,
          ROUND(COALESCE(SUM(ic.cost), 0)::numeric, 2)    AS total_cogs
        FROM delivered_today dt
        LEFT JOIN item_costs ic ON ic.order_id = dt.id
      `);

      const row = result.rows[0];
      res.json({
        orderCount:   parseInt(row.order_count)       || 0,
        grossRevenue: parseFloat(row.gross_revenue)   || 0,
        aov:          parseFloat(row.aov)             || 0,
        totalCogs:    parseFloat(row.total_cogs)      || 0,
      });
    } catch (error) {
      console.error('[BI Summary] Error:', error);
      res.status(500).json({ error: 'Error calculando métricas BI.' });
    }
  });

  // GET /api/bi/top-products
  // Top 3 productos del turno clasificados por volumen y margen de contribución.
  router.get('/bi/top-products', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          oi.name                                           AS product_name,
          SUM(oi.quantity)::int                             AS total_qty,
          ROUND(SUM(oi.price * oi.quantity)::numeric, 2)   AS gross_revenue,
          ROUND(SUM(${MARGIN_MAP_SQL} * oi.quantity)::numeric, 2) AS contribution_margin
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'DELIVERED'
          AND o.created_at >= CURRENT_DATE
        GROUP BY oi.name
        ORDER BY total_qty DESC, contribution_margin DESC
        LIMIT 3
      `);

      res.json(result.rows.map(r => ({
        productName:          r.product_name,
        totalQty:             parseInt(r.total_qty),
        grossRevenue:         parseFloat(r.gross_revenue),
        contributionMargin:   parseFloat(r.contribution_margin),
      })));
    } catch (error) {
      console.error('[BI Top Products] Error:', error);
      res.status(500).json({ error: 'Error calculando top productos.' });
    }
  });

  // POST /api/cash-outflows
  // Registra un egreso de efectivo no planificado en el ledger.
  router.post('/cash-outflows', async (req, res) => {
    try {
      const { amount, description, recordedBy } = req.body;

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'El monto debe ser un número positivo.' });
      }
      if (!description || description.trim().length === 0) {
        return res.status(400).json({ error: 'La descripción es requerida.' });
      }

      const result = await pool.query(
        `INSERT INTO cash_outflows (amount, description, recorded_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [parseFloat(amount).toFixed(2), description.trim(), recordedBy || null]
      );

      const row = result.rows[0];
      console.log(`[BI] Egreso registrado: $${row.amount} — ${row.description} (por: ${row.recorded_by || 'N/A'})`);

      res.status(201).json({
        id:          row.id,
        amount:      parseFloat(row.amount),
        description: row.description,
        recordedBy:  row.recorded_by,
        createdAt:   row.created_at,
      });
    } catch (error) {
      console.error('[Cash Outflow POST] Error:', error);
      res.status(500).json({ error: 'Error registrando egreso.' });
    }
  });

  // GET /api/cash-outflows/today
  // Retorna todos los egresos del día junto con el total acumulado.
  router.get('/cash-outflows/today', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          amount,
          description,
          recorded_by,
          created_at,
          SUM(amount) OVER () AS daily_total
        FROM cash_outflows
        WHERE created_at >= CURRENT_DATE
        ORDER BY created_at DESC
      `);

      const outflows = result.rows.map(r => ({
        id:          r.id,
        amount:      parseFloat(r.amount),
        description: r.description,
        recordedBy:  r.recorded_by,
        createdAt:   r.created_at,
      }));

      const dailyTotal = result.rows.length > 0
        ? parseFloat(result.rows[0].daily_total)
        : 0;

      res.json({ outflows, dailyTotal: Math.round(dailyTotal * 100) / 100 });
    } catch (error) {
      console.error('[Cash Outflows GET] Error:', error);
      res.status(500).json({ error: 'Error obteniendo egresos.' });
    }
  });

  // ==========================================
  // INVENTARIO BOM ENDPOINTS
  // ==========================================

  router.get('/insumos', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM insumos ORDER BY name ASC');
      res.json(result.rows.map(r => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        currentStock: parseFloat(r.current_stock)
      })));
    } catch (error) {
      console.error('Fetch insumos error:', error);
      res.status(500).json({ error: 'Error fetching insumos' });
    }
  });

  router.post('/insumos', async (req, res) => {
    try {
      const { name, unit, currentStock } = req.body;
      const result = await pool.query(
        'INSERT INTO insumos (name, unit, current_stock) VALUES ($1, $2, $3) RETURNING *',
        [name, unit, currentStock || 0]
      );
      res.status(201).json({
        id: result.rows[0].id,
        name: result.rows[0].name,
        unit: result.rows[0].unit,
        currentStock: parseFloat(result.rows[0].current_stock)
      });
    } catch (error) {
      console.error('Create insumo error:', error);
      res.status(500).json({ error: 'Error creating insumo' });
    }
  });

  router.put('/insumos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, unit, currentStock } = req.body;
      const result = await pool.query(
        'UPDATE insumos SET name = $1, unit = $2, current_stock = $3 WHERE id = $4 RETURNING *',
        [name, unit, currentStock, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Insumo not found' });
      res.json({
        id: result.rows[0].id,
        name: result.rows[0].name,
        unit: result.rows[0].unit,
        currentStock: parseFloat(result.rows[0].current_stock)
      });
    } catch (error) {
      console.error('Update insumo error:', error);
      res.status(500).json({ error: 'Error updating insumo' });
    }
  });

  router.get('/recipes', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT r.id, r.product_id, r.insumo_id, r.quantity, i.name as insumo_name, i.unit
        FROM recipes r
        JOIN insumos i ON r.insumo_id = i.id
      `);
      res.json(result.rows.map(r => ({
        id: r.id,
        productId: r.product_id,
        insumoId: r.insumo_id,
        quantity: parseFloat(r.quantity),
        insumoName: r.insumo_name,
        unit: r.unit
      })));
    } catch (error) {
      console.error('Fetch recipes error:', error);
      res.status(500).json({ error: 'Error fetching recipes' });
    }
  });

  router.post('/recipes/:productId', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { productId } = req.params;
      const { ingredients } = req.body; // Array of { insumoId, quantity }
      
      // Replace entire recipe
      await client.query('DELETE FROM recipes WHERE product_id = $1', [productId]);
      
      for (const ing of ingredients) {
        await client.query(
          'INSERT INTO recipes (product_id, insumo_id, quantity) VALUES ($1, $2, $3)',
          [productId, ing.insumoId, ing.quantity]
        );
      }
      
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update recipe error:', error);
      res.status(500).json({ error: 'Error updating recipe' });
    } finally {
      client.release();
    }
  });

  router.post('/inventory/bom-reconcile', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { inventoryCounts, userId } = req.body; // Array of { insumoId, actualStock, predictedStock }
      
      for (const count of inventoryCounts) {
        const difference = count.actualStock - count.predictedStock;
        
        await client.query(
          'INSERT INTO inventory_counts (insumo_id, predicted_stock, actual_stock, difference, counted_by) VALUES ($1, $2, $3, $4, $5)',
          [count.insumoId, count.predictedStock, count.actualStock, difference, userId || null]
        );
        
        // Update actual stock
        await client.query('UPDATE insumos SET current_stock = $1 WHERE id = $2', [count.actualStock, count.insumoId]);
      }
      
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Reconcile inventory error:', error);
      res.status(500).json({ error: 'Error reconciling inventory' });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // CIERRE DE CAJA Y REINICIO DE CUENTAS
  // ==========================================
  
  router.post('/reports/close-day', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Obtener la información actual (las cuentas)
      const ordersRes = await client.query('SELECT * FROM orders ORDER BY created_at ASC');
      // Asegurarse de que hay órdenes por borrar
      if (ordersRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No hay cuentas (órdenes) para cerrar y reiniciar.' });
      }

      const orderItemsRes = await client.query('SELECT * FROM order_items');
      const orderEventsRes = await client.query('SELECT * FROM order_events');
      const inventoryReportsRes = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'inventory_reports'
        );
      `);
      
      let inventoryReports = [];
      if (inventoryReportsRes.rows[0].exists) {
        const invRes = await client.query('SELECT * FROM inventory_reports');
        inventoryReports = invRes.rows;
      }

      const cashOutflowsRes = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'cash_outflows'
        );
      `);
      
      let cashOutflows = [];
      if (cashOutflowsRes.rows[0].exists) {
        const cashRes = await client.query('SELECT * FROM cash_outflows');
        cashOutflows = cashRes.rows;
      }

      const firstOrder = ordersRes.rows[0];
      const lastOrder = ordersRes.rows[ordersRes.rows.length - 1];

      // Formatear fechas: ej. 2026-03-20
      const minDate = new Date(firstOrder.created_at || firstOrder.createdAt).toISOString().split('T')[0];
      const maxDate = new Date(lastOrder.created_at || lastOrder.createdAt).toISOString().split('T')[0];

      // 2. Estructurar el JSON
      const exportData = {
          dateRange: { start: minDate, end: maxDate },
          exportedAt: new Date().toISOString(),
          orders: ordersRes.rows,
          orderItems: orderItemsRes.rows,
          orderEvents: orderEventsRes.rows,
          inventoryReports: inventoryReports,
          cashOutflows: cashOutflows,
      };

      // 3. Definir nombre de archivo y Reiniciar las cuentas
      const fileName = `cuentas_cierre_${minDate}_al_${maxDate}.json`;
      
      let truncateTables = ['orders'];
      if(inventoryReportsRes.rows[0].exists) truncateTables.push('inventory_reports');
      if(cashOutflowsRes.rows[0].exists) truncateTables.push('cash_outflows');

      await client.query(`TRUNCATE TABLE ${truncateTables.join(', ')} RESTART IDENTITY CASCADE`);

      await client.query('COMMIT');

      // 4. Notificar clientes para recargar la interfaz
      io.emit('corte_caja_realizado', { message: 'Se han reiniciado las cuentas exitosamente para el día de hoy.' });

      res.json({ success: true, message: 'Cuentas reiniciadas. Descarga iniciada.', fileName, exportData });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Close day error:', error);
      res.status(500).json({ error: 'Error al reiniciar las cuentas' });
    } finally {
      client.release();
    }
  });

  return router;
};

// Also keep a default export for backwards compat (not used anymore but safe to have)
export default createApiRoutes;
