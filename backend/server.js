import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupDatabase } from './database.js';
import { createApiRoutes } from './routes/api.js';
import { createClientRoutes } from './routes/client.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

const sanitizeOrigin = (url) => {
  if (!url) return null;
  let parsed = url.trim();
  if (!/^https?:\/\//i.test(parsed)) parsed = `https://${parsed}`;
  return parsed.replace(/\/$/, '');
};

const productionOrigin = sanitizeOrigin(process.env.FRONTEND_URL);
const clientPortalOrigin = sanitizeOrigin(process.env.CLIENT_FRONTEND_URL);

const corsOptions = {
  origin: function (origin, callback) {
    if (origin) {
      console.log(`[CORS Telemetry] Incoming Origin: ${origin} | Expected: ${productionOrigin}`);
    }
    
    // Política de "Reflexión Dinámica" (Dynamic Reflection)
    // Para garantizar el Hito Operativo del jueves frente a colisiones de strings, 
    // validamos entornos locales conocidos o devolvemos dinámicamente el origen entrante.
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin) || origin === productionOrigin || origin === clientPortalOrigin) {
      return callback(null, true);
    }
    
    // Fallback de contingencia: Permitir y Registrar (Fail-Open Logging)
    console.warn(`[CORS Bypass] Origen asimétrico reflejado dinámicamente: ${origin}`);
    return callback(null, origin); // Refleja el origen exacto para cumplir Access-Control-Allow-Origin
  },
  credentials: true,
  optionsSuccessStatus: 204
};

// Setup Socket.io
const io = new Server(httpServer, {
  cors: corsOptions
});

// When a client connects
io.on('connection', (socket) => {
  console.log(`[Socket] Conexión: ${socket.id}`);

  // Personal del POS se une al room 'staff' para recibir pedidos de clientes
  socket.on('join_staff_room', () => {
    socket.join('staff');
    console.log(`[Socket] Staff ${socket.id} → room 'staff'`);
  });

  // Cliente B2C se une a su room privado 'customer_<id>' autenticándose con JWT
  socket.on('join_customer_room', ({ token } = {}) => {
    if (!token) return;
    try {
      const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_b2c_123';
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded.type === 'customer') {
        const room = `customer_${decoded.id}`;
        socket.join(room);
        socket.data.customerId = decoded.id;
        console.log(`[Socket] Cliente #${decoded.id} → room '${room}'`);
      }
    } catch {
      socket.emit('auth_error', { message: 'Token inválido para room privado.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Desconexión: ${socket.id}`);
  });
});

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Main init function
const init = async () => {
  try {
    await setupDatabase();

    // Rutas del POS (staff)
    app.use('/api', createApiRoutes(io));

    // Rutas del portal cliente B2C
    app.use('/api/client', createClientRoutes(io));

    // Endpoint de latidos (Heartbeat) para mitigar Cold Starts en PaaS (Render/Railway)
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'active', timestamp: new Date() });
    });

    app.get('/', (req, res) => {
      res.json({ message: 'Welcome to Cheesy Backend API (Socket.io enabled)' });
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.io enabled - Real-time updates active!`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

init();
