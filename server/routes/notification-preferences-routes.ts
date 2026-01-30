/**
 * Notification Preferences Routes
 *
 * API endpoints for managing notification preferences:
 * - Get/set preferences per notification type
 * - Channel management (email, SMS, WhatsApp, push, in-app)
 * - Quiet hours configuration
 * - Notification history
 */

import { Router, Request, Response } from 'express';
import { sessionAuthMiddleware } from '../rbac-middleware';
import {
  notificationPreferencesService,
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationFrequency,
} from '../services/notification-preferences-service';
import { logger } from '../logger';

const router = Router();

// All routes require authentication
router.use(sessionAuthMiddleware);

// ============================================================================
// PREFERENCES MANAGEMENT
// ============================================================================

/**
 * GET /api/notification-preferences
 * Get all notification preferences for the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const preferences = await notificationPreferencesService.getAllPreferences(user.id);

    // Get all notification types and their preferences
    const allTypes = Object.entries(NOTIFICATION_TYPES).map(([key, value]) => {
      const pref = preferences.find(p => p.notificationType === value);
      return {
        key,
        type: value,
        category: value.split('.')[0],
        preferences: pref || {
          userId: user.id,
          notificationType: value,
          emailEnabled: true,
          smsEnabled: false,
          whatsappEnabled: false,
          pushEnabled: true,
          inAppEnabled: true,
          frequency: 'immediate',
          quietHoursTimezone: 'Asia/Kolkata',
        },
      };
    });

    // Group by category
    const categories = allTypes.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof allTypes>);

    res.json({
      preferences: allTypes.map(t => t.preferences),
      byCategory: categories,
      categories: Object.keys(categories),
    });
  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

/**
 * GET /api/notification-preferences/:type
 * Get preference for a specific notification type
 */
router.get('/:type', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type } = req.params;

    const preference = await notificationPreferencesService.getPreference(user.id, type);

    if (!preference) {
      // Return default preference
      return res.json({
        preference: {
          userId: user.id,
          notificationType: type,
          emailEnabled: true,
          smsEnabled: false,
          whatsappEnabled: false,
          pushEnabled: true,
          inAppEnabled: true,
          frequency: 'immediate',
          quietHoursTimezone: 'Asia/Kolkata',
        },
        isDefault: true,
      });
    }

    res.json({ preference, isDefault: false });
  } catch (error) {
    logger.error('Error fetching notification preference:', error);
    res.status(500).json({ error: 'Failed to fetch notification preference' });
  }
});

/**
 * PUT /api/notification-preferences/:type
 * Update preference for a specific notification type
 */
router.put('/:type', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type } = req.params;
    const {
      emailEnabled,
      smsEnabled,
      whatsappEnabled,
      pushEnabled,
      inAppEnabled,
      frequency,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone,
    } = req.body;

    // Validate notification type
    const validTypes = Object.values(NOTIFICATION_TYPES);
    if (!validTypes.includes(type as any)) {
      return res.status(400).json({
        error: 'Invalid notification type',
        validTypes,
      });
    }

    // Validate frequency
    const validFrequencies: NotificationFrequency[] = ['immediate', 'hourly', 'daily', 'weekly'];
    if (frequency && !validFrequencies.includes(frequency)) {
      return res.status(400).json({
        error: 'Invalid frequency',
        validFrequencies,
      });
    }

    // Get current preference or default
    const current = await notificationPreferencesService.getPreference(user.id, type);

    const preference = await notificationPreferencesService.setPreference({
      userId: user.id,
      notificationType: type,
      emailEnabled: emailEnabled ?? current?.emailEnabled ?? true,
      smsEnabled: smsEnabled ?? current?.smsEnabled ?? false,
      whatsappEnabled: whatsappEnabled ?? current?.whatsappEnabled ?? false,
      pushEnabled: pushEnabled ?? current?.pushEnabled ?? true,
      inAppEnabled: inAppEnabled ?? current?.inAppEnabled ?? true,
      frequency: frequency ?? current?.frequency ?? 'immediate',
      quietHoursStart: quietHoursStart ?? current?.quietHoursStart,
      quietHoursEnd: quietHoursEnd ?? current?.quietHoursEnd,
      quietHoursTimezone: quietHoursTimezone ?? current?.quietHoursTimezone ?? 'Asia/Kolkata',
    });

    res.json({
      message: 'Notification preference updated successfully',
      preference,
    });
  } catch (error) {
    logger.error('Error updating notification preference:', error);
    res.status(500).json({ error: 'Failed to update notification preference' });
  }
});

/**
 * PUT /api/notification-preferences/bulk
 * Bulk update multiple preferences
 */
router.put('/bulk/update', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: 'preferences must be an array' });
    }

    await notificationPreferencesService.bulkSetPreferences(user.id, preferences);

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    logger.error('Error bulk updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/notification-preferences/channel/:channel/toggle
 * Toggle a channel on/off for all notification types
 */
router.post('/channel/:channel/toggle', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { channel } = req.params;
    const { enabled } = req.body;

    const validChannels: NotificationChannel[] = ['email', 'sms', 'whatsapp', 'push', 'in_app'];
    if (!validChannels.includes(channel as NotificationChannel)) {
      return res.status(400).json({
        error: 'Invalid channel',
        validChannels,
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    // Get all preferences
    const preferences = await notificationPreferencesService.getAllPreferences(user.id);

    // Update each preference
    const updates = preferences.map(pref => ({
      notificationType: pref.notificationType,
      [`${channel}Enabled`]: enabled,
    }));

    // If no preferences exist, create defaults with this channel setting
    if (updates.length === 0) {
      const allTypes = Object.values(NOTIFICATION_TYPES);
      for (const type of allTypes) {
        await notificationPreferencesService.setPreference({
          userId: user.id,
          notificationType: type,
          emailEnabled: channel === 'email' ? enabled : true,
          smsEnabled: channel === 'sms' ? enabled : false,
          whatsappEnabled: channel === 'whatsapp' ? enabled : false,
          pushEnabled: channel === 'push' ? enabled : true,
          inAppEnabled: channel === 'in_app' ? enabled : true,
          frequency: 'immediate',
          quietHoursTimezone: 'Asia/Kolkata',
        });
      }
    } else {
      await notificationPreferencesService.bulkSetPreferences(user.id, updates);
    }

    res.json({
      message: `${channel} notifications ${enabled ? 'enabled' : 'disabled'} for all types`,
      channel,
      enabled,
    });
  } catch (error) {
    logger.error('Error toggling channel:', error);
    res.status(500).json({ error: 'Failed to toggle channel' });
  }
});

/**
 * PUT /api/notification-preferences/quiet-hours
 * Set quiet hours for all notifications
 */
router.put('/quiet-hours/update', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { quietHoursStart, quietHoursEnd, quietHoursTimezone } = req.body;

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (quietHoursStart && !timeRegex.test(quietHoursStart)) {
      return res.status(400).json({ error: 'Invalid quietHoursStart format. Use HH:MM.' });
    }

    if (quietHoursEnd && !timeRegex.test(quietHoursEnd)) {
      return res.status(400).json({ error: 'Invalid quietHoursEnd format. Use HH:MM.' });
    }

    // Get all preferences
    const preferences = await notificationPreferencesService.getAllPreferences(user.id);

    // Update each with quiet hours
    const updates = preferences.map(pref => ({
      ...pref,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone: quietHoursTimezone || pref.quietHoursTimezone,
    }));

    await notificationPreferencesService.bulkSetPreferences(user.id, updates);

    res.json({
      message: 'Quiet hours updated successfully',
      quietHours: {
        start: quietHoursStart,
        end: quietHoursEnd,
        timezone: quietHoursTimezone,
      },
    });
  } catch (error) {
    logger.error('Error updating quiet hours:', error);
    res.status(500).json({ error: 'Failed to update quiet hours' });
  }
});

/**
 * DELETE /api/notification-preferences/quiet-hours
 * Remove quiet hours
 */
router.delete('/quiet-hours/clear', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get all preferences
    const preferences = await notificationPreferencesService.getAllPreferences(user.id);

    // Clear quiet hours from all
    const updates = preferences.map(pref => ({
      ...pref,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
    }));

    await notificationPreferencesService.bulkSetPreferences(user.id, updates);

    res.json({ message: 'Quiet hours cleared' });
  } catch (error) {
    logger.error('Error clearing quiet hours:', error);
    res.status(500).json({ error: 'Failed to clear quiet hours' });
  }
});

// ============================================================================
// UNSUBSCRIBE
// ============================================================================

/**
 * POST /api/notification-preferences/:type/unsubscribe
 * Unsubscribe from a specific notification type
 */
router.post('/:type/unsubscribe', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type } = req.params;

    await notificationPreferencesService.unsubscribeFromType(user.id, type);

    res.json({
      message: `Unsubscribed from ${type} notifications`,
      type,
    });
  } catch (error) {
    logger.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * POST /api/notification-preferences/unsubscribe-all
 * Unsubscribe from all notifications
 */
router.post('/unsubscribe-all', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    await notificationPreferencesService.unsubscribeFromAll(user.id);

    res.json({ message: 'Unsubscribed from all notifications' });
  } catch (error) {
    logger.error('Error unsubscribing from all:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// ============================================================================
// NOTIFICATION HISTORY
// ============================================================================

/**
 * GET /api/notification-preferences/history
 * Get notification history for the current user
 */
router.get('/history/list', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      channel,
      status,
      limit = '50',
      offset = '0',
    } = req.query;

    const history = await notificationPreferencesService.getNotificationHistory(
      user.id,
      {
        channel: channel as NotificationChannel | undefined,
        status: status as string | undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }
    );

    res.json({ notifications: history });
  } catch (error) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
});

// ============================================================================
// METADATA
// ============================================================================

/**
 * GET /api/notification-preferences/types
 * List all available notification types
 */
router.get('/meta/types', async (req: Request, res: Response) => {
  try {
    const types = Object.entries(NOTIFICATION_TYPES).map(([key, value]) => ({
      key,
      type: value,
      category: value.split('.')[0],
      action: value.split('.')[1],
    }));

    // Group by category
    const categories = types.reduce((acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = [];
      }
      acc[type.category].push(type);
      return acc;
    }, {} as Record<string, typeof types>);

    res.json({
      types,
      categories: Object.keys(categories),
      byCategory: categories,
    });
  } catch (error) {
    logger.error('Error fetching notification types:', error);
    res.status(500).json({ error: 'Failed to fetch notification types' });
  }
});

/**
 * GET /api/notification-preferences/channels
 * List available notification channels
 */
router.get('/meta/channels', async (req: Request, res: Response) => {
  try {
    const channels = [
      {
        id: 'email',
        name: 'Email',
        description: 'Notifications sent to your email address',
        requiresSetup: false,
      },
      {
        id: 'sms',
        name: 'SMS',
        description: 'Text messages sent to your phone',
        requiresSetup: true,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Messages sent via WhatsApp',
        requiresSetup: true,
      },
      {
        id: 'push',
        name: 'Push Notifications',
        description: 'Browser and mobile push notifications',
        requiresSetup: false,
      },
      {
        id: 'in_app',
        name: 'In-App',
        description: 'Notifications shown within the application',
        requiresSetup: false,
      },
    ];

    res.json({ channels });
  } catch (error) {
    logger.error('Error fetching notification channels:', error);
    res.status(500).json({ error: 'Failed to fetch notification channels' });
  }
});

/**
 * GET /api/notification-preferences/timezones
 * List available timezones for quiet hours
 */
router.get('/meta/timezones', async (req: Request, res: Response) => {
  try {
    const timezones = [
      { id: 'Asia/Kolkata', name: 'India Standard Time (IST)', offset: '+05:30' },
      { id: 'UTC', name: 'Coordinated Universal Time (UTC)', offset: '+00:00' },
      { id: 'America/New_York', name: 'Eastern Time (ET)', offset: '-05:00' },
      { id: 'America/Los_Angeles', name: 'Pacific Time (PT)', offset: '-08:00' },
      { id: 'Europe/London', name: 'British Time (GMT/BST)', offset: '+00:00' },
      { id: 'Europe/Paris', name: 'Central European Time (CET)', offset: '+01:00' },
      { id: 'Asia/Dubai', name: 'Gulf Standard Time (GST)', offset: '+04:00' },
      { id: 'Asia/Singapore', name: 'Singapore Time (SGT)', offset: '+08:00' },
      { id: 'Australia/Sydney', name: 'Australian Eastern Time (AET)', offset: '+11:00' },
    ];

    res.json({ timezones });
  } catch (error) {
    logger.error('Error fetching timezones:', error);
    res.status(500).json({ error: 'Failed to fetch timezones' });
  }
});

export default router;
