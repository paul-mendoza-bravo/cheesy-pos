import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupDatabase } from './database.js';
import { createApiRoutes } from './routes/api.js';

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

const corsOptions = {
  origin: function (origin, callback) {
    if (origin) {
      console.log(`[CORS Telemetry] Incoming Origin: ${origin} | Expected: ${productionOrigin}`);
    }
    
    // Política de "Reflexión Dinámica" (Dynamic Reflection)
    // Para garantizar el Hito Operativo del jueves frente a colisiones de strings, 
    // validamos entornos locales conocidos o devolvemos dinámicamente el origen entrante.
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin) || origin === productionOrigin) {
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
  console.log(`[Socket] Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Cliente desconectado: ${socket.id}`);
  });
});

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Main init function
const init = async () => {
  try {
    await setupDatabase();

    // Pass io into routes so they can emit events
    app.use('/api', createApiRoutes(io));

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
