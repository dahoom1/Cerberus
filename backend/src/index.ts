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
import sentimentRoutes from './routes/sentiment';
import performanceRoutes from './routes/performance';

// Import services
import { initializeSocketIO } from './services/socketService';
import { initializeExchangeConnections } from './services/exchangeService';
import { initializeIndicatorEngine } from './services/indicatorService';
import { initializeLiquidationDetector } from './services/liquidationService';
import { scrapeAllCoinsSentiment } from './services/twitterScraperService';
import { scrapeNews } from './services/newsScraperService';
import { updateTopCoins } from './services/marketCapService';
import { monitorAllSignals } from './services/signalTrackingService';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Allow multiple frontend origins (Vercel can have multiple URLs)
const allowedOrigins = [
  'http://localhost:3000',
  'https://cerberus-frontend-flax.vercel.app',
  'https://cerberus-frontend-domans-projects-9e1c5c3e.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/performance', performanceRoutes);

// Initialize background jobs for sentiment tracking
function initializeBackgroundJobs() {
  console.log('Initializing background jobs...');

  // 1. Update top 20 coins - Daily at startup, then every 24 hours
  updateTopCoins();
  setInterval(async () => {
    console.log('[CRON] Updating top 20 coins...');
    await updateTopCoins();
  }, 24 * 60 * 60 * 1000); // 24 hours

  // 2. Twitter sentiment scraping - Every 15 minutes
  setInterval(async () => {
    console.log('[CRON] Scraping Twitter sentiment...');
    await scrapeAllCoinsSentiment();
  }, 15 * 60 * 1000); // 15 minutes

  // 3. News scraping - Every 30 minutes
  setInterval(async () => {
    console.log('[CRON] Scraping news...');
    await scrapeNews();
  }, 30 * 60 * 1000); // 30 minutes

  // 4. Signal performance monitoring - Every 5 minutes
  setInterval(async () => {
    console.log('[CRON] Monitoring signal performance...');
    await monitorAllSignals();
  }, 5 * 60 * 1000); // 5 minutes

  // Run immediately on startup (except Twitter, wait 30s to avoid startup load)
  setTimeout(() => scrapeAllCoinsSentiment(), 30000);
  setTimeout(() => scrapeNews(), 45000);
  setTimeout(() => monitorAllSignals(), 60000);

  console.log('Background jobs initialized');
}

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

    // Initialize background jobs
    initializeBackgroundJobs();

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
