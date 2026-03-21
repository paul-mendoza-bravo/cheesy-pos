import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../database.js';
import { authenticateCustomer, generateCustomerToken } from '../middleware/auth.js';

// Menú estático (espejo del catálogo frontend)
const MENU_PRODUCTS = [
  { id: 'h2', name: 'La Mexa', description: 'Nuestra especialidad de la casa.', price: 80.0, category: 'burgers', hasModifiers: true },
  { id: 'h3', name: 'La BBQ', description: 'Salsa BBQ especial y crujiente tocino.', price: 75.0, category: 'burgers', hasModifiers: true },
  { id: 'h4', name: 'La Hawaiana', description: 'Con piña asada, jamón y queso suizo.', price: 75.0, category: 'burgers', hasModifiers: true },
  { id: 'h1', name: 'Clásica', description: 'La hamburguesa tradicional.', price: 65.0, category: 'burgers', hasModifiers: true },
  { id: 's2', name: 'Papas Especiales', description: 'Con rajas, aderezo de la casa y tocineta.', price: 60.0, category: 'sides', hasModifiers: false },
  { id: 's1', name: 'Papas Sencillas', description: 'Papas a la francesa clásicas.', price: 35.0, category: 'sides', hasModifiers: false },
  { id: 'c1', name: 'COMBO MEXA', description: 'La Mexa + Papas Especiales', price: 140.0, category: 'combos', hasModifiers: false },
];

const MENU_MODIFIERS = [
  { id: 'mod1', name: 'Carne Doble', price: 15.0 },
  { id: 'mod2', name: 'Queso Extra', price: 10.0 },
];

const SALT_ROUNDS = 12;

export const createClientRoutes = (io) => {
  const router = express.Router();

  // ==========================================
  // POST /api/client/register
  // Registro de cliente nuevo con email y contraseña
  // ==========================================
  router.post('/register', async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos.' });
      }

      // Verificar si el email ya existe
      const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email.toLowerCase().trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Este correo electrónico ya está registrado.' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await pool.query(
        "INSERT INTO customers (name, phone, email, password_hash, status) VALUES ($1, $2, $3, $4, 'PENDING') RETURNING id, name, email, phone, created_at, status",
        [name.trim(), phone?.trim() || null, email.toLowerCase().trim(), passwordHash]
      );

      const customer = result.rows[0];
      const token = generateCustomerToken(customer);

      console.log(`[Client Auth] Nuevo cliente registrado: ${customer.email} (id: ${customer.id})`);

      return res.status(201).json({
        success: true,
        customerId: customer.id,
        token,
        customer: { id: customer.id, name: customer.name, email: customer.email },
      });
    } catch (error) {
      console.error('[Client Register] Error:', error);
      return res.status(500).json({ error: 'Error interno al registrar cliente.' });
    }
  });

  // ==========================================
  // POST /api/client/login
  // Login de cliente con email y contraseña
  // ==========================================
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
      }

      const result = await pool.query(
        'SELECT id, name, email, phone, password_hash, status FROM customers WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciales incorrectas.' });
      }

      const customer = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, customer.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenciales incorrectas.' });
      }

      if (customer.status === 'PENDING') {
        return res.status(403).json({ error: 'Tu cuenta está en revisión. Te notificaremos cuando el administrador la apruebe.' });
      }

      if (customer.status === 'REJECTED') {
        return res.status(403).json({ error: 'Tu cuenta ha sido rechazada.' });
      }

      const token = generateCustomerToken(customer);

      console.log(`[Client Auth] Login exitoso: ${customer.email} (id: ${customer.id})`);

      return res.json({
        success: true,
        token,
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      });
    } catch (error) {
      console.error('[Client Login] Error:', error);
      return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
    }
  });

  // ==========================================
  // GET /api/client/menu
  // Catálogo de productos (público, sin auth)
  // ==========================================
  router.get('/menu', (req, res) => {
    res.json({
      categories: [
        { id: 'all', label: 'Todo' },
        { id: 'combos', label: 'Atajos/Combos' },
        { id: 'burgers', label: 'Hamburguesas' },
        { id: 'sides', label: 'Guarniciones' },
      ],
      products: MENU_PRODUCTS,
      modifiers: MENU_MODIFIERS,
    });
  });

  // ==========================================
  // POST /api/client/orders
  // Crear pedido desde el portal del cliente (requiere JWT)
  // ==========================================
  router.post('/orders', authenticateCustomer, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { items, deliveryAddress, notes } = req.body;
      const customerId = req.customer.id;
      const customerName = req.customer.name;

      if (!items || !Array.isArray(items) || items.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El pedido debe contener al menos un producto.' });
      }

      // Calcular total
      const total = items.reduce((sum, item) => {
        const basePrice = item.price || 0;
        const modifiersTotal = (item.modifiers || []).reduce((s, m) => s + (m.price || 0), 0);
        return sum + (basePrice + modifiersTotal) * (item.quantity || 1);
      }, 0);

      // Generar ID único con prefijo CLIENT
      const orderId = `CLIENT-${Date.now()}-${customerId}`;

      const orderResult = await client.query(
        `INSERT INTO orders (id, customer_name, status, total, source, customer_client_id, delivery_link)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          orderId,
          customerName,
          'PENDING',
          total.toFixed(2),
          'CLIENT',
          customerId,
          deliveryAddress || null,
        ]
      );

      // Insertar ítems
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, name, quantity, price, modifiers) VALUES ($1, $2, $3, $4, $5, $6)',
          [orderId, item.id || item.productId, item.name, item.quantity, item.price, JSON.stringify(item.modifiers || [])]
        );
      }

      // Registrar evento CREADO
      await client.query(
        'INSERT INTO order_events (order_id, estado, usuario_id) VALUES ($1, $2, $3)',
        [orderId, 'CREADO', `CUSTOMER_${customerId}`]
      );

      await client.query('COMMIT');

      const newOrder = {
        id: orderId,
        customerName,
        status: 'PENDING',
        total: parseFloat(total.toFixed(2)),
        source: 'CLIENT',
        customerClientId: customerId,
        items,
        notes: notes || null,
        createdAt: orderResult.rows[0].created_at,
      };

      // Notificar al staff en tiempo real
      io.to('staff').emit('nuevo_pedido_cliente', newOrder);
      console.log(`[Socket] Emitido: nuevo_pedido_cliente #${orderId} (cliente: ${customerName})`);

      return res.status(201).json({
        orderId,
        status: 'PENDING',
        total: parseFloat(total.toFixed(2)),
        estimatedWait: null,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[Client Order] Error:', error);
      return res.status(500).json({ error: 'Error al crear el pedido.' });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // GET /api/client/orders/:orderId/status
  // Consultar el estado actual de un pedido (requiere JWT)
  // ==========================================
  router.get('/orders/:orderId/status', authenticateCustomer, async (req, res) => {
    try {
      const { orderId } = req.params;
      const customerId = req.customer.id;

      const result = await pool.query(
        'SELECT id, status, total, created_at, updated_at FROM orders WHERE id = $1 AND customer_client_id = $2',
        [orderId, customerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      const order = result.rows[0];
      return res.json({
        orderId: order.id,
        status: order.status,
        total: parseFloat(order.total),
        createdAt: order.created_at,
        updatedAt: order.updated_at || order.created_at,
        estimatedWait: order.status === 'ACCEPTED' ? 15 : null,
      });
    } catch (error) {
      console.error('[Client Order Status] Error:', error);
      return res.status(500).json({ error: 'Error al consultar el estado del pedido.' });
    }
  });

  return router;
};

export default createClientRoutes;
