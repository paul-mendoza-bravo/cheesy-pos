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
  const formatOrder = (row) => ({
    id: row.id,
    customerName: row.customer_name || row.customerName || 'Cliente',
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
      const ordersResult = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');

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

      const validStatuses = ['PENDING', 'READY', 'DELIVERED', 'TRASHED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Update status
      let updateQuery = 'UPDATE orders SET status = $1';
      const values = [status];
      let paramIdx = 2;

      // Assign the employee based on what status they're setting
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
        return res.status(404).json({ error: 'Order not found' });
      }

      // Record the event
      await client.query(
        'INSERT INTO order_events (order_id, estado, usuario_id) VALUES ($1, $2, $3)',
        [id, status, userId || null]
      );

      await client.query('COMMIT');

      const updatedOrder = formatOrder(result.rows[0]);

      // 🔴 Emit real-time event
      io.emit('pedido_actualizado', updatedOrder);
      console.log(`[Socket] Emitido: pedido_actualizado #${updatedOrder.id} → ${status} (por: ${userId || 'N/A'})`);

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

  return router;
};

// Also keep a default export for backwards compat (not used anymore but safe to have)
export default createApiRoutes;
