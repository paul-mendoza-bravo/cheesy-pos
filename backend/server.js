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

// Setup Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// When a client connects
io.on('connection', (socket) => {
  console.log(`[Socket] Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Cliente desconectado: ${socket.id}`);
  });
});

// Middlewares
app.use(cors());
app.use(express.json());

// Main init function
const init = async () => {
  try {
    await setupDatabase();

    // Pass io into routes so they can emit events
    app.use('/api', createApiRoutes(io));

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
