import { Server, Socket } from 'socket.io';
import { authenticate, AuthRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';

export const initializeSocketIO = (io: Server): void => {
  // Authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow connection without auth for public data
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch (error) {
      // Allow connection but mark as unauthenticated
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`Client connected: ${socket.id}${userId ? ` (User: ${userId})` : ' (Public)'}`);

    // Join user-specific room if authenticated
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Subscribe to market data
    socket.on('subscribe-market', (data: { exchange: string; symbol: string }) => {
      socket.join(`market:${data.exchange}:${data.symbol}`);
      console.log(`Client ${socket.id} subscribed to ${data.exchange} ${data.symbol}`);
    });

    // Unsubscribe from market data
    socket.on('unsubscribe-market', (data: { exchange: string; symbol: string }) => {
      socket.leave(`market:${data.exchange}:${data.symbol}`);
      console.log(`Client ${socket.id} unsubscribed from ${data.exchange} ${data.symbol}`);
    });

    // Subscribe to liquidation alerts
    socket.on('subscribe-liquidation', (data: { exchange: string; symbol: string }) => {
      socket.join(`liquidation:${data.exchange}:${data.symbol}`);
      console.log(`Client ${socket.id} subscribed to liquidation alerts for ${data.exchange} ${data.symbol}`);
    });

    // Unsubscribe from liquidation alerts
    socket.on('unsubscribe-liquidation', (data: { exchange: string; symbol: string }) => {
      socket.leave(`liquidation:${data.exchange}:${data.symbol}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
