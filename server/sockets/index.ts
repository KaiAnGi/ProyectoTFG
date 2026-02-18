import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Express } from 'express';
import { setupGameHandlers } from './gameHandler.ts';

export function initializeSocketIO(app: Express) {
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  setupGameHandlers(io);
  
  console.log('🔌 Socket.IO configurado');
  
  return httpServer;
}