/**
 * SOCKET.IO MANAGER
 * File: server/socket/index.ts
 *
 * Central Socket.IO initialization and management
 * Handles all real-time communication namespaces
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { setupOperationsSocket, getActiveUsers, isUserOnline, stopSlaMonitor } from './operations';
import { setupClientSocket, isClientOnline, getOnlineClientCount, stopComplianceReminderMonitor } from './clients';

// ============ TYPES ============

export interface SocketManager {
  io: Server;
  operations: ReturnType<typeof setupOperationsSocket>;
  clients: ReturnType<typeof setupClientSocket>;
}

// ============ SOCKET SERVER INSTANCE ============

let socketManager: SocketManager | null = null;

// ============ INITIALIZATION ============

/**
 * Initialize Socket.IO server with all namespaces
 */
export function initializeSocketIO(httpServer: HttpServer): SocketManager {
  if (socketManager) {
    logger.warn('Socket.IO already initialized');
    return socketManager;
  }

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true, // Support older clients
    path: '/socket.io'
  });

  // Connection event logging
  io.on('connection', (socket: Socket) => {
    logger.debug('New socket connection', { id: socket.id });
  });

  // Initialize namespaces
  const operations = setupOperationsSocket(io);
  const clients = setupClientSocket(io);

  socketManager = {
    io,
    operations,
    clients
  };

  logger.info('Socket.IO initialized', {
    namespaces: ['/operations', '/client']
  });

  return socketManager;
}

/**
 * Get Socket.IO manager instance
 */
export function getSocketManager(): SocketManager | null {
  return socketManager;
}

/**
 * Shutdown Socket.IO server gracefully
 */
export async function shutdownSocketIO(): Promise<void> {
  if (!socketManager) return;

  logger.info('Shutting down Socket.IO...');

  // Stop background monitors first
  stopSlaMonitor();
  stopComplianceReminderMonitor();

  // Disconnect all clients gracefully
  const io = socketManager.io;

  // Emit shutdown notification
  io.emit('system:maintenance', {
    message: 'Server is shutting down for maintenance',
    scheduledAt: new Date()
  });

  // Wait a moment for clients to receive the message
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Close all connections
  await io.close();

  socketManager = null;

  logger.info('Socket.IO shutdown complete');
}

// ============ BROADCAST UTILITIES ============

/**
 * Broadcast to all connected sockets
 */
export function broadcastToAll(event: string, data: any): void {
  if (!socketManager) return;
  socketManager.io.emit(event, data);
}

/**
 * Broadcast to operations namespace
 */
export function broadcastToOperations(event: string, data: any): void {
  if (!socketManager) return;
  socketManager.operations.emit(event, data);
}

/**
 * Broadcast to client namespace
 */
export function broadcastToClients(event: string, data: any): void {
  if (!socketManager) return;
  socketManager.clients.emit(event, data);
}

/**
 * Send to specific user across all namespaces
 */
export function sendToUser(userId: number, event: string, data: any): void {
  if (!socketManager) return;

  socketManager.operations.to(`user:${userId}`).emit(event, data);
  socketManager.clients.to(`user:${userId}`).emit(event, data);
}

/**
 * Send system alert to all connected users
 */
export function sendSystemAlert(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
  if (!socketManager) return;

  const alert = {
    type,
    message,
    timestamp: new Date()
  };

  socketManager.io.emit('system:alert', alert);
}

// ============ STATUS UTILITIES ============

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  operationsConnections: number;
  clientConnections: number;
  activeOpsUsers: number;
  onlineClients: number;
} {
  if (!socketManager) {
    return {
      totalConnections: 0,
      operationsConnections: 0,
      clientConnections: 0,
      activeOpsUsers: 0,
      onlineClients: 0
    };
  }

  const opsConnections = socketManager.operations.sockets.size;
  const clientConns = socketManager.clients.sockets.size;

  return {
    totalConnections: opsConnections + clientConns,
    operationsConnections: opsConnections,
    clientConnections: clientConns,
    activeOpsUsers: getActiveUsers().length,
    onlineClients: getOnlineClientCount()
  };
}

/**
 * Check if a specific user is online
 */
export function checkUserOnline(userId: number): {
  operations: boolean;
  client: boolean;
  anywhere: boolean;
} {
  const opsOnline = isUserOnline(userId);
  const clientOnline = isClientOnline(userId);

  return {
    operations: opsOnline,
    client: clientOnline,
    anywhere: opsOnline || clientOnline
  };
}

// ============ EXPORTS ============

export * from './types';
export { getActiveUsers, isUserOnline } from './operations';
export { isClientOnline, getOnlineClientCount, notifyClient, notifyServiceUpdate, notifyPaymentReceived, notifyDocumentUploaded } from './clients';
