import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import exchangeRoutes from './routes/exchange';
import signalRoutes from './routes/signals';
import indicatorRoutes from './routes/indicators';
import liquidationRoutes from './routes/liquidation';

// Import services
import { initializeSocketIO } from './services/socketService';
import { initializeExchangeConnections } from './services/exchangeService';
import { initializeIndicatorEngine } from './services/indicatorService';
import { initializeLiquidationDetector } from './services/liquidationService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/indicators', indicatorRoutes);
app.use('/api/liquidation', liquidationRoutes);

// Initialize services
async function initializeServices() {
  try {
    console.log('Initializing services...');
    
    // Initialize Socket.IO
    initializeSocketIO(io);
    
    // Initialize exchange connections
    await initializeExchangeConnections(io);
    
    // Initialize indicator engine
    await initializeIndicatorEngine(io);
    
    // Initialize liquidation detector
    await initializeLiquidationDetector(io);
    
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, io, prisma };
