/**
 * Notification API Routes
 *
 * Endpoints for notification management and preferences
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { notifications, notificationPreferences, pushTokens } from '../db/schema/notifications';
import { notificationHub, otpService } from '../services/notifications';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// IN-APP NOTIFICATIONS
// ============================================

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = '20', offset = '0', unreadOnly = 'false' } = req.query;

    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.channel, 'in_app'),
    ];

    if (unreadOnly === 'true') {
      conditions.push(eq(notifications.status, 'delivered'));
    }

    const items = await db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: desc(notifications.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    res.json({
      notifications: items,
      total: countResult[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await notificationHub.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const notificationId = parseInt(req.params.id);

    await notificationHub.markAsRead(notificationId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await notificationHub.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * POST /api/notifications/:id/archive
 * Archive a notification
 */
router.post('/:id/archive', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const notificationId = parseInt(req.params.id);

    await db.update(notifications)
      .set({ status: 'archived' })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(500).json({ error: 'Failed to archive notification' });
  }
});

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const prefs = await notificationHub.getUserPreferences(userId);
    res.json(prefs);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const updates = req.body;

    // Validate updates
    const allowedFields = [
      'emailEnabled', 'smsEnabled', 'pushEnabled', 'whatsappEnabled', 'inAppEnabled',
      'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd', 'quietHoursTimezone',
      'categories', 'digestEnabled', 'digestFrequency'
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    filteredUpdates.updatedAt = new Date();

    const [updated] = await db.update(notificationPreferences)
      .set(filteredUpdates)
      .where(eq(notificationPreferences.userId, userId))
      .returning();

    if (!updated) {
      // Create if doesn't exist
      const [created] = await db.insert(notificationPreferences)
        .values({ userId, ...filteredUpdates })
        .returning();
      return res.json(created);
    }

    res.json(updated);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ============================================
// PUSH TOKEN MANAGEMENT
// ============================================

/**
 * POST /api/notifications/push-token
 * Register a push notification token
 */
router.post('/push-token', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { token, platform, deviceId, deviceName } = req.body;

    if (!token || !platform) {
      return res.status(400).json({ error: 'Token and platform are required' });
    }

    // Import push service
    const { PushService } = await import('../services/notifications/channels/push.service');
    const pushService = new PushService();

    await pushService.registerToken(userId, token, platform, { deviceId, deviceName });

    res.json({ success: true });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * DELETE /api/notifications/push-token
 * Unregister a push notification token
 */
router.delete('/push-token', authenticate, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const { PushService } = await import('../services/notifications/channels/push.service');
    const pushService = new PushService();

    await pushService.unregisterToken(token);

    res.json({ success: true });
  } catch (error) {
    console.error('Unregister push token error:', error);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

// ============================================
// OTP ENDPOINTS
// ============================================

/**
 * POST /api/notifications/send-otp
 * Send OTP to email or phone
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { identifier, purpose = 'verification' } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    const validPurposes = ['registration', 'login', 'password_reset', 'verification', 'transaction'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ error: 'Invalid purpose' });
    }

    const result = await otpService.generateAndSend(identifier, purpose, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (!result.success) {
      return res.status(429).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Verification code sent',
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

/**
 * POST /api/notifications/verify-otp
 * Verify OTP
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { identifier, code, purpose = 'verification' } = req.body;

    if (!identifier || !code) {
      return res.status(400).json({ error: 'Identifier and code are required' });
    }

    const result = await otpService.verify(identifier, purpose, code);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.reason,
      });
    }

    res.json({
      success: true,
      message: 'Verification successful',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

export default router;
