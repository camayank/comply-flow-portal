/**
 * Push Notification Service
 *
 * Handles push notifications via Firebase Cloud Messaging (FCM)
 */

import { db } from '../../../db';
import { eq, and } from 'drizzle-orm';
import { pushTokens } from '../../../db/schema/notifications';
import type { NotificationResult } from '../notification-hub';

// ============================================
// TYPES
// ============================================
export interface PushPayload {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  clickAction?: string;
}

// ============================================
// PUSH SERVICE CLASS
// ============================================
export class PushService {
  private isMock: boolean;
  private firebaseAdmin: any = null;

  constructor() {
    this.isMock = process.env.MOCK_PUSH === 'true' || !process.env.FIREBASE_PROJECT_ID;

    if (!this.isMock) {
      this.initializeFirebase();
    }
  }

  private async initializeFirebase() {
    try {
      const admin = require('firebase-admin');

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }

      this.firebaseAdmin = admin;
      console.log('✅ Push notification service (FCM) initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.isMock = true;
    }
  }

  /**
   * Send push notification
   */
  async send(payload: PushPayload): Promise<NotificationResult> {
    // Get user's push tokens
    const tokens = await db.query.pushTokens.findMany({
      where: and(
        eq(pushTokens.userId, payload.userId),
        eq(pushTokens.isActive, true)
      ),
    });

    if (tokens.length === 0) {
      return {
        channel: 'push',
        success: false,
        error: 'No active push tokens for user',
      };
    }

    if (this.isMock) {
      console.log(`[MOCK PUSH] To user ${payload.userId}, Title: ${payload.title}`);
      return {
        channel: 'push',
        success: true,
        messageId: `mock_push_${Date.now()}`,
        deliveredAt: new Date(),
      };
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data || {},
        tokens: tokens.map(t => t.token),
        ...(payload.clickAction && {
          webpush: {
            fcmOptions: {
              link: payload.clickAction,
            },
          },
        }),
      };

      const response = await this.firebaseAdmin.messaging().sendEachForMulticast(message);

      // Update token status based on response
      await this.handleSendResponse(tokens, response);

      return {
        channel: 'push',
        success: response.successCount > 0,
        messageId: `fcm_${Date.now()}`,
        deliveredAt: new Date(),
        ...(response.failureCount > 0 && {
          error: `${response.failureCount} of ${tokens.length} tokens failed`,
        }),
      };
    } catch (error) {
      console.error('Push send error:', error);
      return {
        channel: 'push',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send push notification',
      };
    }
  }

  /**
   * Handle FCM send response - deactivate invalid tokens
   */
  private async handleSendResponse(tokens: any[], response: any) {
    const invalidTokens: number[] = [];

    response.responses.forEach((result: any, index: number) => {
      if (!result.success) {
        const errorCode = result.error?.code;

        // Token is invalid or unregistered
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[index].id);
        }
      }
    });

    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      for (const tokenId of invalidTokens) {
        await db.update(pushTokens)
          .set({ isActive: false })
          .where(eq(pushTokens.id, tokenId));
      }
    }
  }

  /**
   * Register a push token for a user
   */
  async registerToken(userId: number, token: string, platform: string, deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
  }): Promise<void> {
    // Check if token exists
    const existing = await db.query.pushTokens.findFirst({
      where: eq(pushTokens.token, token),
    });

    if (existing) {
      // Update existing token
      await db.update(pushTokens)
        .set({
          userId,
          platform,
          isActive: true,
          lastUsedAt: new Date(),
          ...(deviceInfo?.deviceId && { deviceId: deviceInfo.deviceId }),
          ...(deviceInfo?.deviceName && { deviceName: deviceInfo.deviceName }),
        })
        .where(eq(pushTokens.id, existing.id));
    } else {
      // Create new token
      await db.insert(pushTokens).values({
        userId,
        token,
        platform,
        deviceId: deviceInfo?.deviceId,
        deviceName: deviceInfo?.deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      });
    }
  }

  /**
   * Unregister a push token
   */
  async unregisterToken(token: string): Promise<void> {
    await db.update(pushTokens)
      .set({ isActive: false })
      .where(eq(pushTokens.token, token));
  }
}
