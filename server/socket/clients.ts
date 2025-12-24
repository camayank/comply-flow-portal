/**
 * CLIENT NOTIFICATIONS SOCKET.IO HANDLERS
 * File: server/socket/clients.ts
 *
 * Real-time notifications for Client Portal
 * Handles service updates, document notifications, compliance alerts
 */

import { Server, Namespace } from 'socket.io';
import { db } from '../config/database';
import {
  users,
  serviceRequests,
  businessEntities,
  complianceTracking,
  payments
} from '../../shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { logger } from '../config/logger';
import { verifyToken } from '../config/jwt';
import {
  AuthenticatedSocket,
  SocketUser,
  SocketNotification,
  NotificationType
} from './types';

// ============ CONNECTION TRACKING ============

const clientConnections = new Map<number, Set<string>>();

// ============ NAMESPACE SETUP ============

/**
 * Initialize Client Notifications Socket Namespace
 */
export function setupClientSocket(io: Server): Namespace {
  const clientNamespace = io.of('/client');

  // Authentication middleware
  clientNamespace.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token ||
        socket.handshake.query.token as string;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      // Only allow client role (or admin impersonating)
      const allowedRoles = ['client', 'admin', 'super_admin'];
      if (!allowedRoles.includes(decoded.role?.toLowerCase())) {
        return next(new Error('Invalid role for client portal'));
      }

      socket.user = {
        id: parseInt(decoded.userId),
        role: decoded.role,
        name: decoded.name || decoded.email || 'Client',
        email: decoded.email
      };

      next();
    } catch (error: any) {
      logger.warn('Client socket auth failed', { error: error.message });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  clientNamespace.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;

    logger.info('Client socket connected', {
      userId: user.id,
      name: user.name,
      socketId: socket.id
    });

    // Track connection
    if (!clientConnections.has(user.id)) {
      clientConnections.set(user.id, new Set());
    }
    clientConnections.get(user.id)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // Join rooms for all client's business entities
    joinBusinessEntityRooms(socket, user.id);

    // Send pending notifications
    sendPendingNotifications(socket, user.id);

    // ============ EVENT HANDLERS ============

    /**
     * Subscribe to service request updates
     */
    socket.on('service:subscribe', (serviceRequestId: number) => {
      if (typeof serviceRequestId !== 'number' || serviceRequestId <= 0) return;
      socket.join(`service:${serviceRequestId}`);
      logger.debug('Client subscribed to service', { userId: user.id, serviceRequestId });
    });

    /**
     * Unsubscribe from service request
     */
    socket.on('service:unsubscribe', (serviceRequestId: number) => {
      if (typeof serviceRequestId !== 'number') return;
      socket.leave(`service:${serviceRequestId}`);
    });

    /**
     * Mark notification as read
     */
    socket.on('notification:read', async (notificationId: string) => {
      // Mark notification as read in database
      logger.debug('Client notification read', { userId: user.id, notificationId });
    });

    /**
     * Mark all notifications as read
     */
    socket.on('notification:readAll', async () => {
      // Mark all notifications as read for this user
      logger.debug('All client notifications marked as read', { userId: user.id });
    });

    /**
     * Get compliance calendar events
     */
    socket.on('compliance:getCalendar', async (callback) => {
      try {
        const events = await getComplianceEvents(user.id);
        callback?.({ success: true, data: events });
      } catch (error: any) {
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Heartbeat
     */
    socket.on('ping', (callback) => {
      callback?.('pong');
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', (reason) => {
      logger.info('Client socket disconnected', {
        userId: user.id,
        socketId: socket.id,
        reason
      });

      clientConnections.get(user.id)?.delete(socket.id);
      if (clientConnections.get(user.id)?.size === 0) {
        clientConnections.delete(user.id);
      }
    });
  });

  // Start compliance reminder checker
  startComplianceReminders(clientNamespace);

  logger.info('Client socket namespace initialized');

  return clientNamespace;
}

// ============ HELPER FUNCTIONS ============

async function joinBusinessEntityRooms(socket: AuthenticatedSocket, userId: number): Promise<void> {
  try {
    const entities = await db.select({ id: businessEntities.id })
      .from(businessEntities)
      .where(eq(businessEntities.ownerId, userId));

    for (const entity of entities) {
      socket.join(`client:${entity.id}`);
    }
  } catch (error: any) {
    logger.error('Failed to join business entity rooms', { error: error.message, userId });
  }
}

async function sendPendingNotifications(socket: AuthenticatedSocket, userId: number): Promise<void> {
  try {
    // Get unread notifications for this user
    // This would query a notifications table
    // For now, we'll send an empty array
    socket.emit('notification:batch', []);
  } catch (error: any) {
    logger.error('Failed to send pending notifications', { error: error.message, userId });
  }
}

async function getComplianceEvents(userId: number): Promise<any[]> {
  try {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const events = await db.select({
      id: complianceTracking.id,
      serviceId: complianceTracking.serviceId,
      serviceType: complianceTracking.serviceType,
      dueDate: complianceTracking.dueDate,
      status: complianceTracking.status,
      priority: complianceTracking.priority,
      entityName: complianceTracking.entityName
    })
      .from(complianceTracking)
      .where(and(
        eq(complianceTracking.userId, userId),
        gte(complianceTracking.dueDate, now),
        lte(complianceTracking.dueDate, sixtyDaysFromNow)
      ))
      .orderBy(complianceTracking.dueDate);

    return events;
  } catch (error: any) {
    logger.error('Failed to get compliance events', { error: error.message, userId });
    return [];
  }
}

function startComplianceReminders(namespace: Namespace): void {
  // Check for upcoming deadlines every hour
  const intervalId = setInterval(async () => {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Find compliance items due within 7 days
      const upcomingItems = await db.select({
        tracking: complianceTracking,
        clientName: businessEntities.name
      })
        .from(complianceTracking)
        .leftJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
        .where(and(
          eq(complianceTracking.status, 'pending'),
          gte(complianceTracking.dueDate, now),
          lte(complianceTracking.dueDate, sevenDaysFromNow)
        ));

      for (const { tracking, clientName } of upcomingItems) {
        const daysRemaining = Math.ceil(
          (new Date(tracking.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Only send reminders at 7, 3, 1, 0 days
        if (![7, 3, 1, 0].includes(daysRemaining)) continue;

        const notification: SocketNotification = {
          id: `compliance_${tracking.id}_${daysRemaining}d`,
          type: 'COMPLIANCE_REMINDER',
          title: daysRemaining === 0 ? 'Due Today!' : `Due in ${daysRemaining} day(s)`,
          message: `${tracking.serviceType} for ${tracking.entityName || clientName || 'your business'} is due ${daysRemaining === 0 ? 'today' : `in ${daysRemaining} day(s)`}`,
          data: {
            complianceId: tracking.id,
            serviceType: tracking.serviceType,
            dueDate: tracking.dueDate,
            entityName: tracking.entityName || clientName
          },
          priority: daysRemaining <= 1 ? 'urgent' : daysRemaining <= 3 ? 'high' : 'medium',
          read: false,
          timestamp: new Date(),
          actionUrl: `/compliance/${tracking.id}`
        };

        // Send to user
        namespace.to(`user:${tracking.userId}`).emit('notification', notification);
      }

    } catch (error: any) {
      logger.error('Compliance reminder error', { error: error.message });
    }
  }, 60 * 60 * 1000); // Every hour

  // Cleanup on process exit
  process.on('SIGTERM', () => clearInterval(intervalId));
  process.on('SIGINT', () => clearInterval(intervalId));

  logger.info('Compliance reminder checker started (1 hour interval)');
}

// ============ EXPORTED NOTIFICATION FUNCTIONS ============

/**
 * Send notification to a specific client
 */
export function notifyClient(
  namespace: Namespace,
  userId: number,
  notification: Omit<SocketNotification, 'id' | 'read' | 'timestamp'>
): void {
  const fullNotification: SocketNotification = {
    ...notification,
    id: `${notification.type}_${Date.now()}`,
    read: false,
    timestamp: new Date()
  };

  namespace.to(`user:${userId}`).emit('notification', fullNotification);
}

/**
 * Send service update notification
 */
export function notifyServiceUpdate(
  namespace: Namespace,
  serviceRequestId: number,
  userId: number,
  status: string,
  message: string
): void {
  const notification: SocketNotification = {
    id: `service_${serviceRequestId}_${Date.now()}`,
    type: 'SERVICE_UPDATE',
    title: 'Service Update',
    message,
    data: { serviceRequestId, status },
    priority: 'medium',
    read: false,
    timestamp: new Date(),
    actionUrl: `/services/${serviceRequestId}`
  };

  namespace.to(`user:${userId}`).emit('notification', notification);
  namespace.to(`service:${serviceRequestId}`).emit('service:updated', {
    serviceRequestId,
    status,
    message,
    timestamp: new Date()
  });
}

/**
 * Send payment confirmation notification
 */
export function notifyPaymentReceived(
  namespace: Namespace,
  userId: number,
  paymentId: string,
  amount: number,
  serviceDescription: string
): void {
  const notification: SocketNotification = {
    id: `payment_${paymentId}`,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `Payment of Rs. ${amount.toLocaleString('en-IN')} for ${serviceDescription} has been received`,
    data: { paymentId, amount },
    priority: 'medium',
    read: false,
    timestamp: new Date(),
    actionUrl: `/payments/${paymentId}`
  };

  namespace.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Send document uploaded notification
 */
export function notifyDocumentUploaded(
  namespace: Namespace,
  userId: number,
  documentName: string,
  serviceRequestId?: number
): void {
  const notification: SocketNotification = {
    id: `document_${Date.now()}`,
    type: 'DOCUMENT_UPLOADED',
    title: 'Document Uploaded',
    message: `Your document "${documentName}" has been uploaded successfully`,
    data: { documentName, serviceRequestId },
    priority: 'low',
    read: false,
    timestamp: new Date()
  };

  namespace.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Check if client is online
 */
export function isClientOnline(userId: number): boolean {
  return clientConnections.has(userId);
}

/**
 * Get online client count
 */
export function getOnlineClientCount(): number {
  return clientConnections.size;
}
