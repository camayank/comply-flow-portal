/**
 * OTP Service
 *
 * Handles OTP generation, validation, and rate limiting
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../../db';
import { eq, and, gt, desc, gte } from 'drizzle-orm';
import { otpCodes, NewOTPCode } from '../../db/schema/notifications';
import { notificationHub } from './notification-hub';

// ============================================
// TYPES
// ============================================
export type OTPPurpose = 'registration' | 'login' | 'password_reset' | 'verification' | 'transaction';

export interface OTPGenerateResult {
  success: boolean;
  expiresAt: Date;
  attemptsRemaining?: number;
  error?: string;
}

export interface OTPVerifyResult {
  valid: boolean;
  reason?: string;
}

// ============================================
// OTP SERVICE CLASS
// ============================================
export class OTPService {
  // Configuration
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly COOLDOWN_MINUTES = 15;
  private readonly MAX_REQUESTS_PER_WINDOW = 5;
  private readonly REQUEST_WINDOW_MINUTES = 60;

  /**
   * Generate and send OTP
   */
  async generateAndSend(
    identifier: string,
    purpose: OTPPurpose,
    options: {
      ipAddress?: string;
      userAgent?: string;
      userName?: string;
    } = {}
  ): Promise<OTPGenerateResult> {
    try {
      // Normalize identifier
      const normalizedIdentifier = this.normalizeIdentifier(identifier);

      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(normalizedIdentifier, purpose);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          expiresAt: new Date(),
          error: rateLimitResult.reason,
        };
      }

      // Invalidate any existing OTPs for this identifier/purpose
      await this.invalidateExisting(normalizedIdentifier, purpose);

      // Generate secure OTP
      const otp = this.generateSecureOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Hash OTP before storing
      const codeHash = await bcrypt.hash(otp, 10);

      // Store OTP
      await db.insert(otpCodes).values({
        identifier: normalizedIdentifier,
        purpose,
        codeHash,
        expiresAt,
        maxAttempts: this.MAX_ATTEMPTS,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      });

      // Send OTP via appropriate channel
      const isEmail = normalizedIdentifier.includes('@');
      await notificationHub.send({
        to: normalizedIdentifier,
        type: 'otp',
        channels: [isEmail ? 'email' : 'sms'],
        templateId: 'otp',
        data: {
          otp,
          purpose,
          expiresInMinutes: this.OTP_EXPIRY_MINUTES,
          userName: options.userName,
        },
        content: `Your verification code is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
        immediate: true,
        respectPreferences: false, // OTPs must always be sent
      });

      return {
        success: true,
        expiresAt,
        attemptsRemaining: this.MAX_ATTEMPTS,
      };

    } catch (error) {
      console.error('OTP generation error:', error);
      return {
        success: false,
        expiresAt: new Date(),
        error: 'Failed to send verification code. Please try again.',
      };
    }
  }

  /**
   * Verify OTP
   */
  async verify(
    identifier: string,
    purpose: OTPPurpose,
    code: string
  ): Promise<OTPVerifyResult> {
    const normalizedIdentifier = this.normalizeIdentifier(identifier);

    // Get the latest valid OTP for this identifier/purpose
    const otpRecord = await db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.identifier, normalizedIdentifier),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.isUsed, false),
        gt(otpCodes.expiresAt, new Date())
      ),
      orderBy: desc(otpCodes.createdAt),
    });

    if (!otpRecord) {
      return {
        valid: false,
        reason: 'Verification code expired or not found. Please request a new one.',
      };
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return {
        valid: false,
        reason: 'Maximum verification attempts exceeded. Please request a new code.',
      };
    }

    // Verify the code
    const isValid = await bcrypt.compare(code, otpRecord.codeHash);

    if (!isValid) {
      // Increment attempts
      await db.update(otpCodes)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(otpCodes.id, otpRecord.id));

      const attemptsRemaining = otpRecord.maxAttempts - otpRecord.attempts - 1;

      return {
        valid: false,
        reason: attemptsRemaining > 0
          ? `Invalid code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
          : 'Invalid code. Maximum attempts exceeded. Please request a new code.',
      };
    }

    // Mark as used
    await db.update(otpCodes)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(otpCodes.id, otpRecord.id));

    return { valid: true };
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(
    identifier: string,
    purpose: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const windowStart = new Date(Date.now() - this.REQUEST_WINDOW_MINUTES * 60 * 1000);

    // Count recent requests
    const recentRequests = await db.query.otpCodes.findMany({
      where: and(
        eq(otpCodes.identifier, identifier),
        eq(otpCodes.purpose, purpose),
        gte(otpCodes.createdAt, windowStart)
      ),
    });

    if (recentRequests.length >= this.MAX_REQUESTS_PER_WINDOW) {
      const oldestRequest = recentRequests[0];
      const cooldownEnd = new Date(oldestRequest.createdAt.getTime() + this.REQUEST_WINDOW_MINUTES * 60 * 1000);
      const waitMinutes = Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000);

      return {
        allowed: false,
        reason: `Too many requests. Please wait ${waitMinutes} minute${waitMinutes === 1 ? '' : 's'} before trying again.`,
      };
    }

    // Check cooldown from last request
    if (recentRequests.length > 0) {
      const lastRequest = recentRequests[recentRequests.length - 1];
      const timeSinceLastRequest = Date.now() - lastRequest.createdAt.getTime();
      const minCooldown = 60 * 1000; // 1 minute minimum between requests

      if (timeSinceLastRequest < minCooldown) {
        const waitSeconds = Math.ceil((minCooldown - timeSinceLastRequest) / 1000);
        return {
          allowed: false,
          reason: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting another code.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Invalidate existing OTPs
   */
  private async invalidateExisting(identifier: string, purpose: string): Promise<void> {
    await db.update(otpCodes)
      .set({ isUsed: true })
      .where(and(
        eq(otpCodes.identifier, identifier),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.isUsed, false)
      ));
  }

  /**
   * Generate cryptographically secure OTP
   */
  private generateSecureOTP(): string {
    // Generate a random number between 100000 and 999999
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const randomNum = crypto.randomInt(min, max + 1);
    return randomNum.toString();
  }

  /**
   * Normalize identifier (email or phone)
   */
  private normalizeIdentifier(identifier: string): string {
    // Check if email
    if (identifier.includes('@')) {
      return identifier.toLowerCase().trim();
    }

    // Assume phone - remove all non-digits
    let cleaned = identifier.replace(/\D/g, '');

    // Add country code if missing (India)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    return cleaned;
  }

  /**
   * Cleanup expired OTPs (call periodically)
   */
  async cleanup(): Promise<number> {
    const result = await db.delete(otpCodes)
      .where(and(
        eq(otpCodes.isUsed, true),
        // Delete used OTPs older than 24 hours
        gt(otpCodes.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      ));

    return 0; // Drizzle doesn't return count easily
  }
}

// Export singleton instance
export const otpService = new OTPService();
